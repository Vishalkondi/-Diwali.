import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Category, Coupon, Diya, Order, Prize, Product, ProductDetail, ProductSort, Rangoli, Review, ReviewSummary, Reward, User, Wish } from './types';

export const keys = {
  me: ['me'] as const,
  categories: ['categories'] as const,
  products: (category: string, q: string, filters: ProductFilters = {}) => ['products', category, q, filters] as const,
  product: (slug: string) => ['product', slug] as const,
  reviews: (slug: string) => ['reviews', slug] as const,
  orders: ['orders'] as const,
  order: (id: string) => ['order', id] as const,
  rewards: ['rewards'] as const,
  diyas: ['diyas'] as const,
  rangolis: ['rangolis'] as const,
};

export const useMe = () =>
  useQuery({
    queryKey: keys.me,
    queryFn: () => api<{ user: User | null }>('/auth/me').then((r) => r.user),
    staleTime: 60_000,
  });

export const useCategories = () =>
  useQuery({
    queryKey: keys.categories,
    queryFn: () => api<{ categories: Category[] }>('/categories').then((r) => r.categories),
    staleTime: Infinity,
  });

/** Price bounds are in rupees. */
export type ProductFilters = { sort?: ProductSort; minPrice?: number; maxPrice?: number };

export const useProducts = (category = '', q = '', filters: ProductFilters = {}) =>
  useQuery({
    queryKey: keys.products(category, q, filters),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (q) params.set('q', q);
      if (filters.sort && filters.sort !== 'featured') params.set('sort', filters.sort);
      if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
      const qs = params.toString();
      return api<{ products: Product[] }>(`/products${qs ? `?${qs}` : ''}`, { signal }).then((r) => r.products);
    },
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

export const useProduct = (slug: string) =>
  useQuery({
    queryKey: keys.product(slug),
    queryFn: () => api<{ product: ProductDetail; related: Product[] }>(`/products/${encodeURIComponent(slug)}`),
    staleTime: 30_000,
  });

export const useReviews = (slug: string) =>
  useQuery({
    queryKey: keys.reviews(slug),
    queryFn: () => api<{ summary: ReviewSummary; reviews: Review[] }>(`/products/${encodeURIComponent(slug)}/reviews`),
  });

export const useOrders = (enabled = true) =>
  useQuery({
    queryKey: keys.orders,
    queryFn: () => api<{ orders: Order[] }>('/orders').then((r) => r.orders),
    enabled,
  });

export const useRewards = (enabled = true) =>
  useQuery({
    queryKey: keys.rewards,
    queryFn: () => api<{ rewards: Reward[]; unused: number }>('/rewards'),
    enabled,
  });

export const usePrizes = () =>
  useQuery({
    queryKey: ['prizes'],
    queryFn: () => api<{ prizes: Prize[] }>('/prizes').then((r) => r.prizes),
    staleTime: Infinity,
  });

export const useCoupons = () =>
  useQuery({
    queryKey: ['coupons'],
    queryFn: () => api<{ coupons: Coupon[] }>('/coupons').then((r) => r.coupons),
    staleTime: 5 * 60_000,
  });

export const useDiyas = () =>
  useQuery({
    queryKey: keys.diyas,
    queryFn: () => api<{ count: number; diyas: Diya[] }>('/diyas'),
    refetchInterval: 6000,
  });

export const useRangolis = () =>
  useQuery({
    queryKey: keys.rangolis,
    queryFn: () => api<{ rangolis: Rangoli[] }>('/rangolis').then((r) => r.rangolis),
  });

export const useWish = (slug: string) =>
  useQuery({
    queryKey: ['wish', slug],
    queryFn: () => api<{ wish: Wish }>(`/wishes/${slug}`).then((r) => r.wish),
    retry: false,
    staleTime: Infinity,
  });
