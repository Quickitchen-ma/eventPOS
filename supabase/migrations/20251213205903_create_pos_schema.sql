/*
  # POS System Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., "Burgers", "Drinks")
      - `image_url` (text) - Category image
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `name` (text) - Product name
      - `description` (text) - Product description
      - `price` (decimal) - Product price
      - `image_url` (text) - Product image
      - `available` (boolean) - Is product available
      - `sort_order` (integer) - Display order within category
      - `created_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (integer) - Sequential order number
      - `total` (decimal) - Order total
      - `status` (text) - Order status (pending, completed, cancelled)
      - `created_at` (timestamptz)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `product_name` (text) - Snapshot of product name
      - `price` (decimal) - Snapshot of product price
      - `quantity` (integer) - Item quantity
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for categories and products (kiosk mode)
    - Public insert/read access for orders and order_items (kiosk mode)
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  image_url text DEFAULT '',
  available boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL,
  total decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  price decimal(10,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create index for order numbers
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number DESC);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Categories policies (public read)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  USING (true);

-- Products policies (public read)
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

-- Orders policies (public insert and read)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view orders"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update orders"
  ON orders FOR UPDATE
  USING (true);

-- Order items policies (public insert and read)
CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  USING (true);

-- Insert sample categories
INSERT INTO categories (name, sort_order) VALUES
  ('Burgers', 1),
  ('Sides', 2),
  ('Drinks', 3),
  ('Desserts', 4)
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (category_id, name, description, price, sort_order) 
SELECT 
  c.id,
  p.name,
  p.description,
  p.price,
  p.sort_order
FROM categories c
CROSS JOIN (VALUES
  ('Burgers', 'Classic Burger', 'Beef patty, lettuce, tomato, onion', 9.99, 1),
  ('Burgers', 'Cheeseburger', 'Classic burger with cheddar cheese', 10.99, 2),
  ('Burgers', 'Bacon Burger', 'Burger with crispy bacon and cheese', 11.99, 3),
  ('Burgers', 'Veggie Burger', 'Plant-based patty with fresh veggies', 10.49, 4),
  ('Sides', 'French Fries', 'Crispy golden fries', 3.99, 1),
  ('Sides', 'Onion Rings', 'Breaded and fried onion rings', 4.49, 2),
  ('Sides', 'Side Salad', 'Fresh mixed greens', 4.99, 3),
  ('Drinks', 'Soda', 'Coca-Cola, Sprite, or Fanta', 2.49, 1),
  ('Drinks', 'Iced Tea', 'Fresh brewed iced tea', 2.99, 2),
  ('Drinks', 'Milkshake', 'Vanilla, chocolate, or strawberry', 4.99, 3),
  ('Desserts', 'Ice Cream', 'Two scoops of vanilla ice cream', 3.99, 1),
  ('Desserts', 'Apple Pie', 'Warm apple pie with cinnamon', 4.49, 2)
) AS p(category_name, name, description, price, sort_order)
WHERE c.name = p.category_name
ON CONFLICT DO NOTHING;