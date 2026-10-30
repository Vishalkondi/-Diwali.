import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 60 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: createdAt(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 40 }).notNull().unique(),
  name: varchar('name', { length: 60 }).notNull(),
  // Matches an icon key drawn by the web canvas engine.
  icon: varchar('icon', { length: 20 }).notNull(),
  tint: varchar('tint', { length: 9 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull().unique(),
    name: varchar('name', { length: 80 }).notNull(),
    subtitle: varchar('subtitle', { length: 120 }).notNull(),
    description: text('description').notNull().default(''),
    pricePaise: integer('price_paise').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    stock: integer('stock').notNull().default(100),
    badge: varchar('badge', { length: 30 }),
    createdAt: createdAt(),
  },
  (t) => [index('products_category_idx').on(t.categoryId)],
);

export const orderStatus = pgEnum('order_status', ['placed', 'packing', 'on_the_way', 'delivered']);
export type OrderStatus = (typeof orderStatus.enumValues)[number];

export type Address = { flat: string; society: string; city: string; note?: string };

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: orderStatus('status').notNull().default('placed'),
    subtotalPaise: integer('subtotal_paise').notNull(),
    deliveryFeePaise: integer('delivery_fee_paise').notNull(),
    discountPaise: integer('discount_paise').notNull().default(0),
    totalPaise: integer('total_paise').notNull(),
    couponCode: varchar('coupon_code', { length: 32 }),
    giftMessage: varchar('gift_message', { length: 160 }),
    address: jsonb('address').$type<Address>().notNull(),
    createdAt: createdAt(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  },
  (t) => [index('orders_user_created_idx').on(t.userId, t.createdAt)],
);

export const orderItems = pgTable(
  'order_items',
  {
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    name: varchar('name', { length: 80 }).notNull(),
    pricePaise: integer('price_paise').notNull(),
    qty: integer('qty').notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.productId] })],
);

export const wishTheme = pgEnum('wish_theme', ['diya', 'rangoli', 'fireworks']);
export const wishLang = pgEnum('wish_lang', ['en', 'hi', 'mr']);

export const wishes = pgTable('wishes', {
  slug: varchar('slug', { length: 16 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  fromName: varchar('from_name', { length: 40 }).notNull(),
  toName: varchar('to_name', { length: 40 }).notNull(),
  message: varchar('message', { length: 240 }).notNull(),
  theme: wishTheme('theme').notNull().default('diya'),
  lang: wishLang('lang').notNull().default('en'),
  views: integer('views').notNull().default(0),
  createdAt: createdAt(),
});

export const discountKind = pgEnum('discount_kind', ['percent', 'flat', 'free_delivery']);
export type DiscountKind = (typeof discountKind.enumValues)[number];

export const coupons = pgTable('coupons', {
  code: varchar('code', { length: 32 }).primaryKey(),
  description: varchar('description', { length: 120 }).notNull(),
  kind: discountKind('kind').notNull(),
  // percent: whole percent. flat: paise. free_delivery: unused.
  value: integer('value').notNull().default(0),
  minSubtotalPaise: integer('min_subtotal_paise').notNull().default(0),
  maxDiscountPaise: integer('max_discount_paise'),
  active: boolean('active').notNull().default(true),
  isPublic: boolean('is_public').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const rewards = pgTable(
  'rewards',
  {
    code: varchar('code', { length: 32 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Unique: one spin, one reward, per order.
    sourceOrderId: uuid('source_order_id')
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    prizeIndex: integer('prize_index').notNull(),
    kind: discountKind('kind').notNull(),
    value: integer('value').notNull().default(0),
    minSubtotalPaise: integer('min_subtotal_paise').notNull().default(0),
    maxDiscountPaise: integer('max_discount_paise'),
    usedOrderId: uuid('used_order_id').references(() => orders.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('rewards_user_idx').on(t.userId)],
);

export const diyas = pgTable('diyas', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 30 }).notNull(),
  message: varchar('message', { length: 80 }).notNull(),
  createdAt: createdAt(),
});

export type RangoliStroke = { c: number; w: number; p: number[] };

export const rangolis = pgTable(
  'rangolis',
  {
    slug: varchar('slug', { length: 16 }).primaryKey(),
    name: varchar('name', { length: 40 }).notNull(),
    folds: integer('folds').notNull(),
    mirror: boolean('mirror').notNull().default(true),
    strokes: jsonb('strokes').$type<RangoliStroke[]>().notNull(),
    views: integer('views').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('rangolis_created_idx').on(t.createdAt)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    body: varchar('body', { length: 400 }).notNull().default(''),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // One review per person per product; posting again edits it.
  (t) => [
    unique('reviews_product_user_uq').on(t.productId, t.userId),
    index('reviews_product_idx').on(t.productId, t.createdAt),
    check('reviews_rating_range', sql`${t.rating} between 1 and 5`),
  ],
);
