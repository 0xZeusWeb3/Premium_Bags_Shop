/*
# Premium Bags Shop Schema

## Summary
Creates the core tables for the bags e-commerce shop: products, cart_items, and orders.

## New Tables

### products
Stores the bag catalog managed by the admin.
- id: uuid primary key
- name: product display name
- price: full price in paise/rupees (numeric)
- discount_price: optional discounted price
- image_url: Pexels or hosted image URL
- bg_color: card background color (hex)
- panel_color: bottom panel color (hex)
- text_color: text color (hex)
- category: e.g. 'new', 'all', 'discounted'
- is_available: stock availability flag
- created_at: timestamp

### cart_items
Per-user shopping cart, tied to authenticated user.
- id: uuid primary key
- user_id: references auth.users, defaults to auth.uid()
- product_id: references products
- quantity: number of items
- created_at: timestamp

### orders
Placed orders per authenticated user.
- id: uuid primary key
- user_id: references auth.users, defaults to auth.uid()
- items: jsonb snapshot of cart at order time
- subtotal: numeric
- platform_fee: numeric (fixed 20)
- total: numeric
- status: text (pending/confirmed/shipped/delivered)
- created_at: timestamp

## Security

### products
- SELECT: anon + authenticated (public catalog)
- INSERT/UPDATE/DELETE: authenticated only (admin management)

### cart_items
- Full CRUD: authenticated users, own rows only (user_id = auth.uid())

### orders
- Full CRUD: authenticated users, own rows only (user_id = auth.uid())
*/

-- Products table (public catalog)
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  discount_price numeric CHECK (discount_price >= 0),
  image_url text,
  bg_color text NOT NULL DEFAULT '#f5f5f5',
  panel_color text NOT NULL DEFAULT '#e8e8e8',
  text_color text NOT NULL DEFAULT '#000000',
  category text NOT NULL DEFAULT 'all',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_products" ON products;
CREATE POLICY "public_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_products" ON products;
CREATE POLICY "auth_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_products" ON products;
CREATE POLICY "auth_update_products" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_products" ON products;
CREATE POLICY "auth_delete_products" ON products FOR DELETE
  TO authenticated USING (true);

-- Cart items table (per-user)
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_cart" ON cart_items;
CREATE POLICY "select_own_cart" ON cart_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_cart" ON cart_items;
CREATE POLICY "insert_own_cart" ON cart_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_cart" ON cart_items;
CREATE POLICY "update_own_cart" ON cart_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_cart" ON cart_items;
CREATE POLICY "delete_own_cart" ON cart_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Orders table (per-user)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 20,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_orders" ON orders;
CREATE POLICY "select_own_orders" ON orders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_orders" ON orders;
CREATE POLICY "insert_own_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_orders" ON orders;
CREATE POLICY "update_own_orders" ON orders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_orders" ON orders;
CREATE POLICY "delete_own_orders" ON orders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Seed sample products
INSERT INTO products (name, price, discount_price, image_url, bg_color, panel_color, text_color, category) VALUES
  ('Clinge Bag', 1200, NULL, 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=600', '#f5d5c0', '#e8c4a8', '#1a1a1a', 'all'),
  ('Backpack', 1100, NULL, 'https://images.pexels.com/photos/1294731/pexels-photo-1294731.jpeg?auto=compress&cs=tinysrgb&w=600', '#c8d8e8', '#b0c4d8', '#1a1a1a', 'new'),
  ('Multipurpose', 100, NULL, 'https://images.pexels.com/photos/3731256/pexels-photo-3731256.jpeg?auto=compress&cs=tinysrgb&w=600', '#d5c9b0', '#c4b898', '#1a1a1a', 'all'),
  ('Pink Attack', 1400, 1050, 'https://images.pexels.com/photos/2081199/pexels-photo-2081199.jpeg?auto=compress&cs=tinysrgb&w=600', '#f0c8c8', '#dba8a8', '#1a1a1a', 'discounted'),
  ('The Stud', 1100, NULL, 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=600', '#d0d0d0', '#b8b8b8', '#1a1a1a', 'all'),
  ('Surprise', 1100, NULL, 'https://images.pexels.com/photos/4210866/pexels-photo-4210866.jpeg?auto=compress&cs=tinysrgb&w=600', '#e8e0c0', '#d0c8a0', '#1a1a1a', 'new'),
  ('Supreme', 1800, NULL, 'https://images.pexels.com/photos/3731256/pexels-photo-3731256.jpeg?auto=compress&cs=tinysrgb&w=600', '#c8c8c8', '#b0b0b0', '#1a1a1a', 'all'),
  ('The Daily', 100, NULL, 'https://images.pexels.com/photos/3731256/pexels-photo-3731256.jpeg?auto=compress&cs=tinysrgb&w=600', '#e0e0e0', '#c8c8c8', '#1a1a1a', 'all')
ON CONFLICT DO NOTHING;
