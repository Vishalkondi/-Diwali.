import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { MotionConfig } from 'motion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { ApiError } from './lib/api';
import Home from './pages/Home';

const Auth = lazy(() => import('./pages/Auth'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Order = lazy(() => import('./pages/Order'));
const Orders = lazy(() => import('./pages/Orders'));
const WishBuilder = lazy(() => import('./pages/WishBuilder'));
const WishView = lazy(() => import('./pages/WishView'));
const Festival = lazy(() => import('./pages/Festival'));
const DiyaWall = lazy(() => import('./pages/DiyaWall'));
const RangoliStudio = lazy(() => import('./pages/RangoliStudio'));
const RangoliView = lazy(() => import('./pages/RangoliView'));
const Product = lazy(() => import('./pages/Product'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const NotFound = lazy(() => import('./pages/NotFound'));
const DevFrame = lazy(() => import('./pages/DevFrame'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

const Loading = () => <div className="shell py-24 text-center text-muted">Lighting the lamps…</div>;

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user": Motion turns transforms off when the OS asks for less motion. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              {import.meta.env.DEV && <Route path="/dev/frame" element={<DevFrame />} />}
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="p/:slug" element={<Product />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="login" element={<Auth mode="login" />} />
                <Route path="register" element={<Auth mode="register" />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<Order />} />
                <Route path="wish" element={<WishBuilder />} />
                <Route path="w/:slug" element={<WishView />} />
                <Route path="diwali" element={<Festival />} />
                <Route path="wall" element={<DiyaWall />} />
                <Route path="rangoli" element={<RangoliStudio />} />
                <Route path="rangoli/:slug" element={<RangoliView />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  );
}
