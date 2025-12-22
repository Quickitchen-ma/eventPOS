import { useState, useRef } from 'react';
import { ShoppingCart, Clock, BarChart3, UtensilsCrossed, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { POS } from './POS';
import { CurrentOrders } from './CurrentOrders';
import { OrderHistory } from './OrderHistory';
import { Dashboard } from './Dashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { PrintTicket } from './PrintTicket';
import type { Order, OrderItem } from '../lib/database.types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

type TabType = 'pos' | 'current' | 'history' | 'dashboard' | 'manager';

interface POSLayoutProps {
  onOrderCreated?: () => void;
}

export function POSLayout({ onOrderCreated }: POSLayoutProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [orderToPrint, setOrderToPrint] = useState<OrderWithItems | null>(null);
  const printRef = useRef<any>(null);

  const allTabs: Array<{ id: TabType; label: string; icon: React.ReactNode; roles: string[] }> = [
    { id: 'pos', label: 'Commandes', icon: <ShoppingCart className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'current', label: 'En cours', icon: <Clock className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'history', label: 'Historique', icon: <UtensilsCrossed className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 className="w-5 h-5" />, roles: ['manager', 'cashier'] },
    { id: 'manager', label: 'Gestion', icon: <TrendingUp className="w-5 h-5" />, roles: ['manager'] },
  ];

  const tabs = allTabs.filter(tab => user && tab.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-0">
          <div className="flex items-center h-16 gap-4">
            <div className="flex items-center gap-3">
              <img src="/icone.png" alt="Okinawa" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">POS</h1>
                <p className="text-xs text-gray-500">By QuicKitchen</p>
              </div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mx-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-brand-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
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

      <main className="max-w-7xl mx-auto px-6 py-8">
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
            onPrint={(order) => {
              setOrderToPrint(order);
            }}
          />
        )}
        {activeTab === 'history' && (
          <OrderHistory
            onPrint={(order) => {
              setOrderToPrint(order);
            }}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'manager' && <ManagerDashboard />}
      </main>

      {orderToPrint && (
        <PrintTicket
          order={orderToPrint}
          onComplete={() => setOrderToPrint(null)}
        />
      )}
    </div>
  );
}
