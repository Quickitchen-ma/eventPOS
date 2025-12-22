/*
  # Add Order Audit and Cancellation Tracking

  This migration adds comprehensive audit tracking for orders to ensure
  360° management and proper waste tracking.

  1. New Tables
     - `order_audit_logs`
       - `id` (uuid, primary key)
       - `order_id` (uuid, foreign key to orders)
       - `action` (text) - 'created', 'updated', 'cancelled', 'completed'
       - `user_id` (uuid) - who performed the action
       - `user_role` (text) - role of the user
       - `previous_status` (text) - status before the action
       - `new_status` (text) - status after the action
       - `details` (jsonb) - additional details like reason, items changed, etc.
       - `created_at` (timestamptz)

  2. Updated Tables
     - `orders`
       - Add `cancelled_at` (timestamptz)
       - Add `cancelled_by` (uuid)
       - Add `was_ready_when_cancelled` (boolean)
       - Add `cancellation_reason` (text)
*/

-- Create order_audit_logs table
CREATE TABLE IF NOT EXISTS order_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'cancelled', 'completed')),
  user_id uuid,
  user_role text,
  previous_status text,
  new_status text,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS order_audit_logs_order_id_idx ON order_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS order_audit_logs_created_at_idx ON order_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS order_audit_logs_action_idx ON order_audit_logs(action);

-- Add new columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
ADD COLUMN IF NOT EXISTS cancelled_by uuid,
ADD COLUMN IF NOT EXISTS was_ready_when_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Enable RLS on audit logs
ALTER TABLE order_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_audit_logs (managers can see all, cashiers see their branch)
-- For now, allow all authenticated users to view audit logs
-- In a production system, you might want more restrictive policies
CREATE POLICY "Authenticated users can view audit logs"
  ON order_audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert audit logs for existing orders
INSERT INTO order_audit_logs (order_id, action, new_status, details)
SELECT
  id,
  'created' as action,
  status as new_status,
  jsonb_build_object('migrated', true, 'original_created_at', created_at)
FROM orders;

-- Insert audit logs for cancelled orders
INSERT INTO order_audit_logs (order_id, action, previous_status, new_status, details)
SELECT
  id,
  'cancelled' as action,
  'pending' as previous_status,
  'cancelled' as new_status,
  jsonb_build_object('migrated', true, 'cancelled_at', created_at)
FROM orders
WHERE status = 'cancelled';

-- Insert audit logs for completed orders
INSERT INTO order_audit_logs (order_id, action, previous_status, new_status, details)
SELECT
  id,
  'completed' as action,
  'pending' as previous_status,
  'completed' as new_status,
  jsonb_build_object('migrated', true, 'completed_at', created_at)
FROM orders
WHERE status = 'completed';