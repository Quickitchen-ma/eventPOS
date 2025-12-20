import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Branch } from '../lib/database.types';

interface BranchStats {
  branch: Branch;
  todayRevenue: number;
  weekRevenue: number;
  totalRevenue: number;
  todayOrders: number;
  weekOrders: number;
  totalOrders: number;
}

export function ManagerDashboard() {
  const [branches, setBranches] = useState<BranchStats[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadStats = async () => {
    const { data: branchesData, error: branchesError } = await supabase
      .from('branches')
      .select('*')
      .order('created_at');

    if (branchesError) {
      console.error('Error loading branches:', branchesError);
      setLoading(false);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const stats = await Promise.all(
      (branchesData || []).map(async (branch) => {
        const { data: allOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id);

        const { data: todayOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', today.toISOString());

        const { data: weekOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'completed')
          .eq('branch_id', branch.id)
          .gte('created_at', weekAgo.toISOString());

        const todayRevenue = (todayOrders || []).reduce((sum, o) => sum + o.total, 0);
        const weekRevenue = (weekOrders || []).reduce((sum, o) => sum + o.total, 0);
        const totalRevenue = (allOrders || []).reduce((sum, o) => sum + o.total, 0);

        return {
          branch,
          todayRevenue,
          weekRevenue,
          totalRevenue,
          todayOrders: (todayOrders || []).length,
          weekOrders: (weekOrders || []).length,
          totalOrders: (allOrders || []).length,
        };
      })
    );

    setBranches(stats);
    if (stats.length > 0 && !selectedBranch) {
      setSelectedBranch(stats[0].branch.id);
    }
    setLoading(false);
  };

  const getCurrentRevenue = (stat: BranchStats) => {
    switch (timeRange) {
      case 'today':
        return stat.todayRevenue;
      case 'week':
        return stat.weekRevenue;
      case 'month':
        return stat.totalRevenue;
      default:
        return stat.todayRevenue;
    }
  };

  const getCurrentOrders = (stat: BranchStats) => {
    switch (timeRange) {
      case 'today':
        return stat.todayOrders;
      case 'week':
        return stat.weekOrders;
      case 'month':
        return stat.totalOrders;
      default:
        return stat.todayOrders;
    }
  };

  const selectedStats = branches.find((s) => s.branch.id === selectedBranch);
  const totalCompanyRevenue = branches.reduce((sum, s) => sum + getCurrentRevenue(s), 0);
  const totalCompanyOrders = branches.reduce((sum, s) => sum + getCurrentOrders(s), 0);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Chargement des statistiques...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord de gestion</h1>
        <p className="text-gray-600">Analytique multi-succursales et suivi des performances</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        {(['today', 'week', 'month'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              timeRange === range
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {range === 'today' ? "Aujourd'hui" : range === 'week' ? 'Cette semaine' : 'Ce mois'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Revenu total de l'entreprise</h3>
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-4xl font-bold text-emerald-600 mb-2">
            {totalCompanyRevenue.toFixed(2)} dh
          </p>
          <p className="text-sm text-gray-500">{totalCompanyOrders} commandes dans toutes les succursales</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Revenu moyen par commande</h3>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-4xl font-bold text-blue-600 mb-2">
            {totalCompanyOrders > 0
              ? (totalCompanyRevenue / totalCompanyOrders).toFixed(2)
              : '0.00'}{' '}
            dh
          </p>
          <p className="text-sm text-gray-500">Par transaction</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            Performance des succursales
          </h2>
          <div className="space-y-3">
            {branches.map((stat) => (
              <button
                key={stat.branch.id}
                onClick={() => setSelectedBranch(stat.branch.id)}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  selectedBranch === stat.branch.id
                    ? 'bg-emerald-50 border border-emerald-500'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{stat.branch.name}</h3>
                  <span className="text-xs text-gray-500">{stat.branch.location}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenu</p>
                    <p className="font-bold text-emerald-600">
                      {getCurrentRevenue(stat).toFixed(2)} dh
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Commandes</p>
                    <p className="font-bold text-gray-900">{getCurrentOrders(stat)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedStats && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              {selectedStats.branch.name} - Statistiques détaillées
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg">
                <p className="text-sm text-emerald-700 font-medium">Revenu de la période actuelle</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {getCurrentRevenue(selectedStats).toFixed(2)} dh
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Commandes de la période actuelle</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{getCurrentOrders(selectedStats)}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg">
                <p className="text-sm text-slate-700 font-medium">Valeur moyenne par commande</p>
                <p className="text-3xl font-bold text-slate-600 mt-1">
                  {getCurrentOrders(selectedStats) > 0
                    ? (getCurrentRevenue(selectedStats) / getCurrentOrders(selectedStats)).toFixed(2)
                    : '0.00'}{' '}
                  dh
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                <p className="text-sm text-orange-700 font-medium">Revenu total historique</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {selectedStats.totalRevenue.toFixed(2)} dh
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
