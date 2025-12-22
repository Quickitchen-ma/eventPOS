import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Printer, ChevronRight, AlertTriangle, User, Timer, Edit3, Save, X, Plus, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Order, OrderItem, Product } from '../lib/database.types';
import { Modal, useModal } from './Modal';

interface OrderWithItems extends Order {
  items: OrderItem[];
  branch_name?: string;
}

interface CurrentOrdersProps {
  onPrint: (order: OrderWithItems) => void;
}

export function CurrentOrders({ onPrint }: CurrentOrdersProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { modalProps, showModal } = useModal();

  const getElapsedTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    }
    return `${diffMins}m`;
  };

  const getPriorityColor = (createdAt: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60));
    if (diffMins > 30) return 'border-red-500 bg-red-50';
    if (diffMins > 15) return 'border-orange-500 bg-orange-50';
    return 'border-amber-500 bg-amber-50';
  };

  const getPriorityIcon = (createdAt: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60));
    if (diffMins > 30) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (diffMins > 15) return <Clock className="w-4 h-4 text-orange-600" />;
    return <Clock className="w-4 h-4 text-amber-600" />;
  };

  useEffect(() => {
    loadOrders();
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadOrders = async () => {
    if (!user) {
      console.warn('CurrentOrders: No authenticated user - access denied');
      setLoading(false);
      return;
    }

    console.log('CurrentOrders: Loading orders for user:', {
      userId: user.id,
      userRole: user.role,
      userBranchId: user.branch_id,
      fullName: user.full_name
    });

    let query = supabase
      .from('orders')
      .select(`
        *,
        branches (
          name
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    // Apply branch filtering based on role
    if (user.role === 'cashier' && user.branch_id) {
      query = query.eq('branch_id', user.branch_id);
      console.log('CurrentOrders: Access control - Cashier filtering by branch_id:', user.branch_id);
    } else if (user.role === 'manager') {
      console.log('CurrentOrders: Access control - Manager viewing all branches');
    } else {
      console.warn('CurrentOrders: Access control - Invalid user role:', user.role);
      setLoading(false);
      return;
    }

    const { data: ordersData, error: ordersError } = await query;

    if (ordersError) {
      console.error('CurrentOrders: Error loading orders:', ordersError);
      setLoading(false);
      return;
    }

    console.log(`CurrentOrders: Loaded ${ordersData?.length || 0} pending orders`);

    const ordersWithItems = await Promise.all(
      (ordersData || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        return {
          ...order,
          items: items || [],
          branch_name: (order as any).branches?.name
        };
      })
    );

    setOrders(ordersWithItems);
    setLoading(false);
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
    }
    setLoadingProducts(false);
  };

  const startEditing = (order: OrderWithItems) => {
    setEditingOrderId(order.id);
    setEditedItems([...order.items]);
    if (products.length === 0) {
      loadProducts();
    }
  };

  const cancelEditing = () => {
    setEditingOrderId(null);
    setEditedItems([]);
  };

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setEditedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ).filter(item => item.quantity > 0)
    );
  };

  const addProduct = (product: Product) => {
    const existingItem = editedItems.find(item => item.product_id === product.id);
    if (existingItem) {
      updateItemQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: OrderItem = {
        id: `temp-${Date.now()}-${product.id}`,
        order_id: editingOrderId!,
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        quantity: 1,
        created_at: new Date().toISOString(),
      };
      setEditedItems(prev => [...prev, newItem]);
    }
  };

  const saveChanges = async () => {
    if (!editingOrderId) return;

    if (editedItems.length === 0) {
      showModal('Commande vide', 'La commande ne peut pas être vide.', { type: 'warning' });
      return;
    }

    const total = calculateTotal(editedItems);

    // Start transaction-like operations
    try {
      // Delete existing items
      await supabase.from('order_items').delete().eq('order_id', editingOrderId);

      // Insert new items
      const itemsToInsert = editedItems.map(item => ({
        order_id: editingOrderId,
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
      }));
      await supabase.from('order_items').insert(itemsToInsert);

      // Update order total
      await supabase.from('orders').update({ total }).eq('id', editingOrderId);

      // Create audit log for order update
      const { error: auditError } = await supabase
        .from('order_audit_logs')
        .insert({
          order_id: editingOrderId,
          action: 'updated',
          user_id: user?.id,
          user_role: user?.role,
          details: {
            updated_at: new Date().toISOString(),
            new_total: total,
            item_count: editedItems.length,
            items_changed: true
          }
        });

      if (auditError) {
        console.error('Error creating audit log:', auditError);
        // Don't fail the update if audit log fails
      }

      // Reload orders
      loadOrders();
      cancelEditing();
    } catch (error) {
      console.error('Error saving order changes:', error);
      showModal('Erreur de sauvegarde', 'Erreur lors de la sauvegarde des modifications.', { type: 'error' });
    }
  };

  const completeOrder = async (orderId: string) => {
    // Get current order status for audit log
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (!currentOrder) {
      showModal('Erreur', 'Commande introuvable.', { type: 'error' });
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    if (error) {
      console.error('Error completing order:', error);
      return;
    }

    // Create audit log entry
    const { error: auditError } = await supabase
      .from('order_audit_logs')
      .insert({
        order_id: orderId,
        action: 'completed',
        previous_status: currentOrder.status,
        new_status: 'completed',
        user_id: user?.id,
        user_role: user?.role,
        details: {
          completed_at: new Date().toISOString()
        }
      });

    if (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the completion if audit log fails
    }

    loadOrders();
  };

  const cancelOrder = async (orderId: string) => {
    showModal(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ? Cette action est irréversible.',
      {
        type: 'warning',
        confirmText: 'Annuler',
        cancelText: 'Garder',
        showCancel: true,
        onConfirm: async () => {
          const now = new Date().toISOString();

          // Get current order status for audit log
          const { data: currentOrder } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single();

          if (!currentOrder) {
            showModal('Erreur', 'Commande introuvable.', { type: 'error' });
            return;
          }

          // Update order with cancellation details
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: 'cancelled',
              cancelled_at: now,
              cancelled_by: user?.id,
              was_ready_when_cancelled: currentOrder.status === 'completed' // If it was completed, it was ready
            })
            .eq('id', orderId);

          if (updateError) {
            console.error('Error cancelling order:', updateError);
            showModal('Erreur', 'Erreur lors de l\'annulation de la commande.', { type: 'error' });
            return;
          }

          // Create audit log entry
          const { error: auditError } = await supabase
            .from('order_audit_logs')
            .insert({
              order_id: orderId,
              action: 'cancelled',
              previous_status: currentOrder.status,
              new_status: 'cancelled',
              user_id: user?.id,
              user_role: user?.role,
              details: {
                cancelled_at: now,
                was_ready_when_cancelled: currentOrder.status === 'completed'
              }
            });

          if (auditError) {
            console.error('Error creating audit log:', auditError);
            // Don't fail the cancellation if audit log fails
          }

          loadOrders();
        }
      }
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Chargement des commandes...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500 text-lg">Aucune commande en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 ${getPriorityColor(order.created_at!)}`}
        >
          <button
            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
            className="w-full p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 md:gap-4 flex-1">
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-amber-100 rounded-lg">
                {getPriorityIcon(order.created_at!)}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-lg md:text-xl md:text-2xl font-bold text-gray-900">Commande n°{order.order_number}</p>
                  {user?.role === 'manager' && order.branch_name && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {order.branch_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                      <Timer className="w-3 h-3 md:w-4 md:h-4" />
                      <span>{getElapsedTime(order.created_at!)}</span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500">
                      {new Date(order.created_at!).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                    <User className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Client sur place</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    En préparation
                  </span>
                  <span className="text-xs md:text-sm text-gray-600 truncate">
                    {order.items.length} article{order.items.length > 1 ? 's' : ''}: {order.items.map(item => item.product_name).join(', ')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-base md:text-lg md:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                  {editingOrderId === order.id ? calculateTotal(editedItems).toFixed(2) : order.total.toFixed(2)} dh
                </p>
                <p className="text-xs md:text-sm text-gray-500 leading-tight">
                  {editingOrderId === order.id ? editedItems.length : order.items.length} article{(editingOrderId === order.id ? editedItems.length : order.items.length) > 1 ? 's' : ''}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 md:w-5 md:h-5 md:w-6 md:h-6 text-gray-400 transition-transform flex-shrink-0 ml-auto ${
                  expandedOrder === order.id ? 'rotate-90' : ''
                }`}
              />
            </div>
          </button>

          {expandedOrder === order.id && (
            <div className="border-t border-gray-100 px-6 py-4 space-y-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {editingOrderId === order.id ? 'Modifier la commande' : 'Détails de la commande'}
                  </h4>
                  {editingOrderId === order.id ? (
                    <div className="space-y-3">
                      {editedItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 bg-white rounded-lg px-3 border">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-sm text-gray-500">
                              {item.price.toFixed(2)} dh chacun
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                              className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 text-center border rounded px-2 py-1"
                            />
                            <button
                              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                              className="p-1 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-3">
                        <h5 className="font-medium text-gray-900 mb-2">Ajouter un produit</h5>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {products.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => addProduct(product)}
                              className="text-left p-2 bg-gray-50 hover:bg-gray-100 rounded border text-sm"
                            >
                              <p className="font-medium">{product.name}</p>
                              <p className="text-gray-600">{product.price.toFixed(2)} dh</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 bg-white rounded-lg px-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.product_name}</p>
                            <p className="text-sm text-gray-500">
                              {item.quantity} × {item.price.toFixed(2)} dh
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {(item.quantity * item.price).toFixed(2)} dh
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-gray-900">
                        {editingOrderId === order.id ? calculateTotal(editedItems).toFixed(2) : order.total.toFixed(2)} dh
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informations</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">Client</span>
                      </div>
                      <p className="text-sm text-gray-600">Client sur place</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">Temps écoulé</span>
                      </div>
                      <p className="text-sm text-gray-600">{getElapsedTime(order.created_at!)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">Statut</span>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        En préparation
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex flex-col md:flex-row gap-2 md:gap-3">
                {editingOrderId === order.id ? (
                  <>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center justify-center gap-2 bg-gray-600 text-white py-2 md:py-3 px-3 md:px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm md:text-base font-medium"
                    >
                      <X className="w-4 h-4 md:w-5 md:h-5" />
                      Annuler
                    </button>
                    <button
                      onClick={saveChanges}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white py-2 md:py-3 rounded-lg hover:bg-brand-700 transition-colors text-sm md:text-base font-medium"
                    >
                      <Save className="w-4 h-4 md:w-5 md:h-5" />
                      Sauvegarder
                    </button>
                  </>
                ) : (
                  <>
                    {user?.role === 'manager' && (
                      <>
                        <button
                          onClick={() => startEditing(order)}
                          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 md:py-3 px-3 md:px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base font-medium"
                        >
                          <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                          Modifier
                        </button>
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="flex items-center justify-center gap-2 bg-red-600 text-white py-2 md:py-3 px-3 md:px-4 rounded-lg hover:bg-red-700 transition-colors text-sm md:text-base font-medium"
                        >
                          <X className="w-4 h-4 md:w-5 md:h-5" />
                          Annuler commande
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onPrint({ ...order, items: order.items })}
                      className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 md:py-3 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base font-medium"
                    >
                      <Printer className="w-4 h-4 md:w-5 md:h-5" />
                      Imprimer ticket
                    </button>
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white py-2 md:py-3 rounded-lg hover:bg-brand-700 transition-colors text-sm md:text-base font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                      Marquer prêt
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      <Modal {...modalProps} />
    </div>
  );
}
