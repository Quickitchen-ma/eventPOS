import { TrendingUp, DollarSign, ShoppingCart, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../lib/database.types';

interface StatsData {
  todayTotal: number;
  todayOrders: number;
  totalOrders: number;
  averageOrderValue: number;
  cancelledOrders: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData>({
    todayTotal: 0,
    todayOrders: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    cancelledOrders: 0,
  });
  const [topItems, setTopItems] = useState<Array<{ name: string; quantity: number; revenue: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadStats = async () => {
    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const startISOString = startDate.toISOString();

    const { data: filteredOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'completed')
      .gte('created_at', startISOString);

    if (ordersError) {
      console.error('Error loading orders:', ordersError);
      setLoading(false);
      return;
    }

    const filteredOrderIds = (filteredOrders || []).map(order => order.id);

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', filteredOrderIds);

    if (itemsError) {
      console.error('Error loading order items:', itemsError);
      setLoading(false);
      return;
    }

    // Get cancelled orders count
    const { count: cancelledOrdersCount, error: cancelledError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('created_at', startISOString);

    if (cancelledError) {
      console.error('Error loading cancelled orders:', cancelledError);
      setLoading(false);
      return;
    }

    const filteredTotal = (filteredOrders || []).reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = (filteredOrders || []).length > 0
      ? filteredTotal / (filteredOrders || []).length
      : 0;

    setStats({
      todayTotal: filteredTotal,
      todayOrders: (filteredOrders || []).length,
      totalOrders: (filteredOrders || []).length,
      averageOrderValue,
      cancelledOrders: cancelledOrdersCount || 0,
    });

    // Calculate top items
    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    (orderItems || []).forEach((item) => {
      const key = item.product_name;
      const existing = itemMap.get(key) || { quantity: 0, revenue: 0 };
      itemMap.set(key, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.price * item.quantity,
      });
    });

    const topItemsArray = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setTopItems(topItemsArray);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: DollarSign,
      label: "Revenu du jour",
      value: `${stats.todayTotal.toFixed(2)} dh`,
      color: 'from-brand-500 to-brand-600',
      textColor: 'text-brand-600',
    },
    {
      icon: ShoppingCart,
      label: "Commandes du jour",
      value: stats.todayOrders.toString(),
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
    },
    {
      icon: TrendingUp,
      label: 'Panier moyen',
      value: `${stats.averageOrderValue.toFixed(2)} dh`,
      color: 'from-orange-500 to-orange-600',
      textColor: 'text-orange-600',
    },
    {
      icon: Clock,
      label: 'Total commandes',
      value: stats.totalOrders.toString(),
      color: 'from-slate-500 to-slate-600',
      textColor: 'text-slate-600',
    },
    {
      icon: () => <span className="text-white font-bold text-lg">✗</span>,
      label: 'Commandes annulées',
      value: stats.cancelledOrders.toString(),
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          {([
            { key: 'today', label: "Aujourd'hui" },
            { key: 'yesterday', label: 'Hier' },
            { key: 'week', label: '7 derniers jours' },
            { key: 'month', label: '30 derniers jours' },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 md:p-6 border-l-4"
              style={{ borderColor: card.textColor.replace('text-', 'var(--color-)') }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">{card.label}</h3>
                <div className={`p-3 bg-gradient-to-br ${card.color} rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className={`text-2xl md:text-3xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      {topItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Top 5 des articles</h2>
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 bg-brand-600 text-white rounded-full font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.quantity} vendus</p>
                  </div>
                </div>
                <p className="font-bold text-brand-600 text-lg">{item.revenue.toFixed(2)} dh</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
