/*
  # Enforce Branch-Based Access Control

  1. Update RLS policies for orders table
     - Managers can view/update all orders
     - Cashiers can only view/update orders from their branch
     - Public access removed for security

  2. Update RLS policies for order_items table
     - Follow same branch-based access as orders

  3. Add helper functions for access control
     - get_user_branch() - returns user's branch_id
     - is_manager() - checks if user is manager
*/

-- Drop existing public policies for orders
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;

-- Drop existing public policies for order_items
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_branch()
RETURNS uuid AS $$
BEGIN
   -- Get branch_id from users table based on authenticated user email
   RETURN (
     SELECT branch_id
     FROM users
     WHERE email = auth.jwt() ->> 'email'
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean AS $$
BEGIN
   -- Check if authenticated user is a manager
   RETURN (
     SELECT role = 'manager'
     FROM users
     WHERE email = auth.jwt() ->> 'email'
   );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Orders policies - branch-based access
CREATE POLICY "Users can create orders in their branch"
  ON orders FOR INSERT
  WITH CHECK (
    CASE
      WHEN is_manager() THEN true
      WHEN get_user_branch() IS NOT NULL THEN branch_id = get_user_branch()
      ELSE false
    END
  );

CREATE POLICY "Users can view orders in their branch"
  ON orders FOR SELECT
  USING (
    CASE
      WHEN is_manager() THEN true
      WHEN get_user_branch() IS NOT NULL THEN branch_id = get_user_branch()
      ELSE false
    END
  );

CREATE POLICY "Users can update orders in their branch"
  ON orders FOR UPDATE
  USING (
    CASE
      WHEN is_manager() THEN true
      WHEN get_user_branch() IS NOT NULL THEN branch_id = get_user_branch()
      ELSE false
    END
  );

-- Order items policies - follow orders access
CREATE POLICY "Users can create order items for accessible orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        CASE
          WHEN is_manager() THEN true
          WHEN get_user_branch() IS NOT NULL THEN orders.branch_id = get_user_branch()
          ELSE false
        END
      )
    )
  );

CREATE POLICY "Users can view order items for accessible orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (
        CASE
          WHEN is_manager() THEN true
          WHEN get_user_branch() IS NOT NULL THEN orders.branch_id = get_user_branch()
          ELSE false
        END
      )
    )
  );