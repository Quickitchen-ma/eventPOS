import { useState, useEffect } from 'react';
import { Layout, LogOut, ShoppingBag, History, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { POS } from './POS';
import { CurrentOrders } from './CurrentOrders';
import { OrderHistory } from './OrderHistory';
import { Dashboard } from './Dashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { Receipt } from './Receipt';
import { supabase } from '../lib/supabase';
import { APP_NAME, APP_VERSION } from '../lib/version';
import { RawBTService } from '../lib/rawbt';


type TabType = 'pos' | 'current' | 'history' | 'dashboard' | 'manager';

interface POSLayoutProps {
  onOrderCreated?: () => void;
}

export function POSLayout({ onOrderCreated }: POSLayoutProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(
    user?.role === 'manager' ? 'dashboard' : 'pos'
  );
  const [lastOrder, setLastOrder] = useState<any>(null);

  const handlePrint = async (order: any) => {
    // Try direct print first
    const success = await RawBTService.print(order);

    if (!success) {
      setLastOrder(order);
      // Delay to allow state to propagate to Receipt component
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  useEffect(() => {
    // Listen for new orders to update the Receipt component
    const channel = supabase
      .channel('orders_printing')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload: any) => {
          const { data } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            // Try direct print first
            const success = await RawBTService.print(data);

            if (!success) {
              setLastOrder(data);
              // Wait for DOM update, then print
              setTimeout(() => {
                window.print();
              }, 500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const allTabs: Array<{ id: TabType; label: string; icon: React.ReactNode; roles: string[] }> = [
    { id: 'pos', label: 'Commandes', icon: <ShoppingBag className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'current', label: 'En cours', icon: <Layout className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'history', label: 'Historique', icon: <History className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'manager', label: 'Gestion', icon: <Settings className="w-5 h-5" />, roles: ['manager'] },
  ];

  const tabs = allTabs.filter(tab => user && tab.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Desktop Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 md:py-0">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <img src="/icone.png" alt="Okinawa" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">POS</h1>
                <p className="text-xs text-gray-500">By Quickitchen</p>
              </div>
            </div>

            <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-lg mx-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-white text-brand-600 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right w-10">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={signOut}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 no-print">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === tab.id
                ? 'text-brand-600 bg-brand-50'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8 no-print">
        {activeTab === 'pos' && (
          <POS
            onOrderCreated={() => {
              setActiveTab('current');
              onOrderCreated?.();
            }}
          />
        )}
        {activeTab === 'current' && (
          <CurrentOrders
            onPrint={handlePrint}
          />
        )}
        {activeTab === 'history' && (
          <OrderHistory
            onPrint={handlePrint}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'manager' && <ManagerDashboard />}

        {/* Floating Action Button for New Order */}
        {activeTab === 'current' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="fixed bottom-20 md:bottom-8 right-6 bg-brand-600 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-brand-700 transition-all flex items-center gap-2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="font-bold text-lg">Nouvelle commande</span>
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500 border-t border-gray-200 pt-4 no-print">
        {APP_NAME} - Version {APP_VERSION}
      </footer>


      {/* Hidden container for printing */}
      <div id="print-root">
        <Receipt order={lastOrder} />
      </div>
    </div>
  );
}
