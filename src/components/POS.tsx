import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category, Product, CartItem } from '../lib/database.types';
import { CategoryList } from './CategoryList';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';

interface POSProps {
  onOrderCreated?: () => void;
}

export function POS({ onOrderCreated }: POSProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    setCategories(data || []);
    if (data && data.length > 0 && !selectedCategory) {
      setSelectedCategory(data[0].id);
    }
  };

  const loadProducts = async (categoryId: string) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('available', true)
      .order('sort_order');

    if (error) {
      console.error('Error loading products:', error);
      return;
    }

    setProducts(data || []);
  };


  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const checkout = async () => {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .order('order_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrderNumber = (lastOrder?.order_number || 0) + 1;
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: nextOrderNumber,
        total,
        status: 'pending',
        branch_id: defaultBranchId,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Error creating order:', orderError);
      return;
    }

    const orderItems = cart.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      return;
    }

    setLastOrderNumber(nextOrderNumber);
    setCart([]);
    setShowSuccess(true);

    setTimeout(() => {
      setShowSuccess(false);
      setLastOrderNumber(null);
      onOrderCreated?.();
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Gestion des commandes</h2>
        <p className="text-gray-600 text-sm">Parcourez le menu et créez des commandes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
          <ProductGrid products={products} onAddToCart={addToCart} />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Cart
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onCheckout={checkout}
            />
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold text-lg">Commande créée !</p>
            <p className="text-emerald-100">Commande n°{lastOrderNumber}</p>
          </div>
        </div>
      )}
    </div>
  );
}
