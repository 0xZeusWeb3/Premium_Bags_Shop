/*
# Add best-seller flag and expand product categories

1. Changes to `products` table
- Add `is_best_seller` boolean column (default false) to support the "Best Sellers" sidebar filter.
- Update existing seed products with subcategory names (Handbags, Backpacks, etc.) so the new sidebar tree has matching results.
- Mark a couple of products as best sellers for demonstration.

2. Security
- No RLS policy changes. The new column is covered by existing product policies (public SELECT, authenticated INSERT/UPDATE/DELETE).
*/

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false;

-- Recategorize seed products into the new subcategory taxonomy
UPDATE products SET category = 'Handbags' WHERE name = 'Clinge Bag';
UPDATE products SET category = 'Backpacks', is_best_seller = true WHERE name = 'Backpack';
UPDATE products SET category = 'Tote Bags' WHERE name = 'Multipurpose';
UPDATE products SET category = 'Clutch Bags' WHERE name = 'Pink Attack';
UPDATE products SET category = 'Shoulder Bags' WHERE name = 'The Stud';
UPDATE products SET category = 'Handbags', is_best_seller = true WHERE name = 'Surprise';
UPDATE products SET category = 'Messenger Bags' WHERE name = 'Supreme';
UPDATE products SET category = 'Wallets' WHERE name = 'The Daily';
