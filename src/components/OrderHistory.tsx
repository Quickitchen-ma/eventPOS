import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Printer, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Order, OrderItem } from '../lib/database.types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface OrderHistoryProps {
  onPrint: (order: OrderWithItems) => void;
}

export function OrderHistory({ onPrint }: OrderHistoryProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [filter]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte('created_at', today.toISOString());
    } else if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      query = query.gte('created_at', weekAgo.toISOString());
    }

    const { data: ordersData, error } = await query.limit(100);

    if (error) {
      console.error('Error loading orders:', error);
      setLoading(false);
      return;
    }

    const ordersWithItems = await Promise.all(
      (ordersData || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        return { ...order, items: items || [] };
      })
    );

    setOrders(ordersWithItems);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Chargement des commandes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-gray-600" />
            Historique des commandes
          </h2>
          <p className="text-sm text-gray-500 mt-1">Consulter les commandes terminées</p>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f === 'today' ? "Aujourd'hui" : f === 'week' ? 'Cette semaine' : 'Tout'}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg">Aucune commande terminée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border-l-4 border-emerald-500"
            >
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">Commande n°{order.order_number}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{order.total.toFixed(2)} dh</p>
                    <p className="text-sm text-gray-500">{order.items.length} articles</p>
                  </div>
                  <ChevronRight
                    className={`w-6 h-6 text-gray-400 transition-transform ${
                      expandedOrder === order.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {expandedOrder === order.id && (
                <div className="border-t border-gray-100 px-6 py-4 space-y-4 bg-gray-50">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2">
                        <div>
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

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => onPrint({ ...order, items: order.items })}
                      className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <Printer className="w-5 h-5" />
                      Réimprimer ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
