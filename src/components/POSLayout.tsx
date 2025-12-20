import { useState, useRef } from 'react';
import { ShoppingCart, Clock, BarChart3, UtensilsCrossed, TrendingUp } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<TabType>('pos');
  const [orderToPrint, setOrderToPrint] = useState<OrderWithItems | null>(null);
  const printRef = useRef<any>(null);

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'pos', label: 'Commandes', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'current', label: 'En cours', icon: <Clock className="w-5 h-5" /> },
    { id: 'history', label: 'Historique', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'manager', label: 'Gestion', icon: <TrendingUp className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-0">
          <div className="flex items-center h-16 gap-1">
            <div className="flex items-center gap-3 mr-auto">
              <img src="/icone.png" alt="Okinawa" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">OKINAWA</h1>
                <p className="text-xs text-gray-500">By QuickKitchen</p>
              </div>
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-emerald-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
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
        <PrintTicket order={orderToPrint} />
      )}
    </div>
  );
}
