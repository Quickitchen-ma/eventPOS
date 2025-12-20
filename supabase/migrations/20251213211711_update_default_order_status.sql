/*
  # Update order default status

  Changed default order status from 'completed' to 'pending' to support order workflow
  where orders are created as pending and marked as ready when complete.
*/

ALTER TABLE orders
  ALTER COLUMN status SET DEFAULT 'pending';