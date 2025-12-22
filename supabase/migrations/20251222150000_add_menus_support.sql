/*
  # Add Menus Support

  1. New Tables
     - `menus`
       - `id` (uuid, primary key)
       - `name` (text) - Menu name
       - `description` (text) - Menu description
       - `created_at` (timestamptz)

     - `menu_categories`
       - `id` (uuid, primary key)
       - `menu_id` (uuid, foreign key)
       - `category_id` (uuid, foreign key)
       - `sort_order` (integer) - Display order in menu
       - `created_at` (timestamptz)

  2. Changes
     - Add `menu_id` column to branches table
     - Create default menu with existing categories

  3. Security
     - Enable RLS on new tables
     - Create policies for menu access
*/

-- Create menus table
CREATE TABLE IF NOT EXISTS menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create menu_categories table (junction table)
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid REFERENCES menus(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_id, category_id)
);

-- Add menu_id to branches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branches' AND column_name = 'menu_id'
  ) THEN
    ALTER TABLE branches
      ADD COLUMN menu_id uuid REFERENCES menus(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for menus (managers can manage, others can view)
CREATE POLICY "Managers can manage menus"
  ON menus FOR ALL
  USING (is_manager());

CREATE POLICY "Anyone can view menus"
  ON menus FOR SELECT
  USING (true);

-- Create policies for menu_categories
CREATE POLICY "Managers can manage menu categories"
  ON menu_categories FOR ALL
  USING (is_manager());

CREATE POLICY "Anyone can view menu categories"
  ON menu_categories FOR SELECT
  USING (true);

-- Create default menu with existing categories
INSERT INTO menus (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Menu', 'Standard menu with all categories')
ON CONFLICT (id) DO NOTHING;

-- Add existing categories to default menu
INSERT INTO menu_categories (menu_id, category_id, sort_order)
SELECT
  '00000000-0000-0000-0000-000000000001',
  c.id,
  c.sort_order
FROM categories c
ON CONFLICT (menu_id, category_id) DO NOTHING;

-- Assign default menu to existing branches
UPDATE branches
SET menu_id = '00000000-0000-0000-0000-000000000001'
WHERE menu_id IS NULL;