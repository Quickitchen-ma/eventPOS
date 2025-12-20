/*
  # Add Multi-Branch Support

  1. New Tables
    - `branches`
      - `id` (uuid, primary key)
      - `name` (text) - Branch name
      - `location` (text) - Branch location
      - `created_at` (timestamptz)

  2. Changes
    - Add `branch_id` column to orders table for multi-branch tracking
    - Add RLS policies for branch data

  3. Security
    - Enable RLS on branches table
    - Create policies for public read access
*/

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  location text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Insert branches first
INSERT INTO branches (id, name, location) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Downtown', 'Center City'),
  ('00000000-0000-0000-0000-000000000002', 'Airport', 'Airport Zone')
ON CONFLICT (name) DO NOTHING;

-- Add branch_id to orders if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE orders
      ADD COLUMN branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Anyone can view branches" ON branches;

CREATE POLICY "Anyone can view branches"
  ON branches FOR SELECT
  USING (true);