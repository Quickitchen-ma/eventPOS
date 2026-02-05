import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Category, Product, CartItem } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { CategoryList } from './CategoryList';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { Modal, useModal } from './Modal';

interface POSProps {
  onOrderCreated?: () => void;
}

export function POS({ onOrderCreated }: POSProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const { modalProps, showModal } = useModal();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts(selectedCategory);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    if (!user) {
      console.warn('No user available');
      return;
    }

    // Managers can see all categories
    if (user.role === 'manager') {
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
      return;
    }

    // Cashiers see only categories from their branch's menu
    if (!user.branch_id) {
      console.warn('No branch ID available for cashier');
      return;
    }

    // Get the menu for the user's branch
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('menu_id')
      .eq('id', user.branch_id)
      .single();

    if (branchError || !branch?.menu_id) {
      console.error('Error loading branch menu:', branchError);
      return;
    }

    // Get categories from the branch's menu
    const { data, error } = await supabase
      .from('menu_categories')
      .select(`
        sort_order,
        categories (
          id,
          name,
          image_url,
          sort_order,
          created_at
        )
      `)
      .eq('menu_id', branch.menu_id)
      .order('sort_order');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    const categoriesData = (data || []).map((item: any) => item.categories).filter(Boolean) as Category[];
    setCategories(categoriesData);
    if (categoriesData.length > 0 && !selectedCategory) {
      setSelectedCategory(categoriesData[0].id);
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
    setCart((prevCart: CartItem[]) => {
      const existingItem = prevCart.find((item: CartItem) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item: CartItem) =>
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
    setCart((prevCart: CartItem[]) =>
      prevCart.map((item: CartItem) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart: CartItem[]) => prevCart.filter((item: CartItem) => item.product.id !== productId));
  };

  const checkout = async () => {
    if (cart.length === 0) {
      console.warn('Cannot checkout with empty cart');
      return;
    }

    if (!user) {
      showModal('Connexion requise', 'Vous devez être connecté pour créer une commande.', { type: 'warning' });
      return;
    }

    try {
      const total = cart.reduce((sum: number, item: CartItem) => sum + item.product.price * item.quantity, 0);

      const { data: lastOrder, error: lastOrderError } = await supabase
        .from('orders')
        .select('order_number')
        .order('order_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastOrderError) {
        console.error('Error fetching last order:', lastOrderError);
        showModal('Erreur', 'Erreur lors de la récupération du dernier numéro de commande. Veuillez réessayer.', { type: 'error' });
        return;
      }

      const nextOrderNumber = (lastOrder?.order_number || 0) + 1;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: nextOrderNumber,
          total,
          status: 'pending',
          branch_id: user.branch_id,
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error('Error creating order:', orderError);
        showModal('Erreur', 'Erreur lors de la création de la commande. Veuillez réessayer.', { type: 'error' });
        return;
      }

      const orderItems = cart.map((item: CartItem) => ({
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
        showModal('Erreur', 'Erreur lors de la création des articles de la commande. Veuillez réessayer.', { type: 'error' });
        return;
      }

      // Create audit log for order creation
      const { error: auditError } = await supabase
        .from('order_audit_logs')
        .insert({
          order_id: order.id,
          action: 'created',
          new_status: 'pending',
          user_id: user.id,
          user_role: user.role,
          details: {
            created_at: order.created_at,
            total: total,
            item_count: cart.length
          }
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the order creation if audit log fails
      }

      setLastOrderNumber(nextOrderNumber);
      setCart([]);
      setShowSuccess(true);

      // Fetch the full order with items for printing
      const { data: orderWithItems, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(*)
        `)
        .eq('id', order.id)
        .single();

      if (!fetchError && orderWithItems) {
        // We use a small delay to ensure the DOM has updated
        // though with our state management it might be immediate
        setTimeout(() => {
          window.print();
        }, 500);
      }

      setTimeout(() => {
        setShowSuccess(false);
        setLastOrderNumber(null);
        onOrderCreated?.();
      }, 3000); // Increased timeout to allow for print dialog
    } catch (error) {
      console.error('Unexpected error during checkout:', error);
      showModal('Erreur inattendue', 'Une erreur inattendue s\'est produite. Veuillez réessayer.', { type: 'error' });
    }
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
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-brand-600 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <CheckCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold text-lg">Commande créée !</p>
            <p className="text-brand-100">Commande n°{lastOrderNumber}</p>
          </div>
        </div>
      )}

      <Modal {...modalProps} />
    </div>
  );
}
