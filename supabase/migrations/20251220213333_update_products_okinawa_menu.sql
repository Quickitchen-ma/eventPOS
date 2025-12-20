/*
  # Update Products with Okinawa Menu

  Replaces sample data with real menu items from Okinawa restaurant.
  
  1. Updated Categories
    - Starters
    - Sushi Mixte
    - Sushi Spécial

  2. Updated Products
    - All items from Okinawa menu with correct prices in DHs
*/

-- Delete existing products and categories to start fresh
DELETE FROM order_items;
DELETE FROM products;
DELETE FROM categories;

-- Insert new categories
INSERT INTO categories (name, sort_order) VALUES
  ('Starters', 1),
  ('Sushi Mixte', 2),
  ('Sushi Spécial', 3)
ON CONFLICT DO NOTHING;

-- Insert new products with Okinawa menu
INSERT INTO products (category_id, name, description, price, sort_order, available) 
SELECT 
  c.id,
  p.name,
  p.description,
  p.price,
  p.sort_order,
  true
FROM categories c
CROSS JOIN (
  VALUES
    ('Starters', 'Tacos asiatique (3p)', 'Asian-style tacos (3 pieces)', 49.00, 1),
    ('Starters', 'Tacos asiatique (6p)', 'Asian-style tacos (6 pieces)', 75.00, 2),
    ('Starters', 'Nems poulet (2p)', 'Chicken spring rolls (2 pieces)', 45.00, 3),
    ('Starters', 'Nems crevettes (2p)', 'Shrimp spring rolls (2 pieces)', 55.00, 4),
    ('Starters', 'Croquettes poulet (5p)', 'Chicken croquettes (5 pieces)', 50.00, 5),
    ('Starters', 'Tempura crevettes (5p)', 'Shrimp tempura (5 pieces)', 55.00, 6),
    ('Sushi Mixte', 'Le mixte 10 p', '6 fry roll + 4 california roll', 54.00, 1),
    ('Sushi Mixte', 'Le mixte 14 p', '6 fry roll + 8 california roll', 99.00, 2),
    ('Sushi Mixte', 'Le mixte 24 p', '12 fry roll + 8 california roll + 4 creations', 149.00, 3),
    ('Sushi Spécial', 'L Okinawa', '16 creations - Chef special', 115.00, 1),
    ('Sushi Spécial', 'Le Fresh', '16 fresh rolls', 105.00, 2),
    ('Sushi Spécial', 'Le Crunch', '16 fry rolls', 95.00, 3),
    ('Sushi Spécial', 'Le Tapas', 'nem 5p, croquettes poulet 2p, crevettes tempura 2p, boeuf fromage pané', 105.00, 4)
) AS p(category_name, name, description, price, sort_order)
WHERE c.name = p.category_name
ON CONFLICT DO NOTHING;