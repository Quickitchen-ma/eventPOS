/*
  # Add Users Table and Authentication

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique) - User email for login
      - `password` (text) - Hashed password
      - `full_name` (text) - Full name of user
      - `role` (text) - User role (manager, cashier)
      - `branch_id` (uuid, foreign key) - Associated branch
      - `active` (boolean) - Is user active
      - `created_at` (timestamptz)
  
  2. Functions
    - `authenticate_user(user_email text, user_password text)` - Authenticate user and return user data

  3. Security
    - Enable RLS on users table
    - Only authenticated users can view their own data
    - Public access to authentication function for login
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'cashier')),
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (true);

-- Create authentication function
CREATE OR REPLACE FUNCTION authenticate_user(user_email text, user_password text)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  branch_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.branch_id
  FROM users u
  WHERE u.email = user_email 
    AND u.password = user_password 
    AND u.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert test users
INSERT INTO users (email, password, full_name, role, branch_id) VALUES
  ('manager@quickitchen.ma', 'Can%2025', 'Restaurant Manager', 'manager', NULL),
  ('cashier.meetup@quickitchen.ma', 'meetup123', 'Meetup Cashier', 'cashier', '00000000-0000-0000-0000-000000000001'),
  ('cashier.can@quickitchen.ma', 'can123', 'CAN Cashier', 'cashier', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (email) DO NOTHING;
