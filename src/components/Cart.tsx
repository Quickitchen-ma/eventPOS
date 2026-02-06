import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import type { CartItem } from '../lib/database.types';

interface CartProps {
  items: CartItem[];
  bipReference: string;
  onBipReferenceChange: (value: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export function Cart({
  items,
  bipReference,
  onBipReferenceChange,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}: CartProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="w-6 h-6 text-brand-600" />
        <h2 className="text-xl font-bold text-gray-900">Commande actuelle</h2>
        {itemCount > 0 && (
          <span className="ml-auto bg-brand-600 text-white text-sm font-medium px-3 py-1 rounded-full">
            {itemCount} {itemCount === 1 ? 'article' : 'articles'}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <ShoppingCart className="w-16 h-16 mb-2" />
            <p>Panier vide</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="flex gap-3 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-2xl">🍔</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{item.product.name}</h3>
                  <p className="text-sm text-gray-500">{item.product.price.toFixed(2)} dh l'unité</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="ml-auto w-7 h-7 bg-red-50 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{(item.product.price * item.quantity).toFixed(2)} dh</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-4">
        {items.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="bip-reference" className="block text-sm font-medium text-gray-700">
              Référence BIP
            </label>
            <input
              type="number"
              id="bip-reference"
              value={bipReference}
              onChange={(e) => onBipReferenceChange(e.target.value)}
              placeholder="Numéro du bipper"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-lg font-medium"
            />
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-700">Total</span>
          <span className="text-2xl font-bold text-gray-900">{total.toFixed(2)} dh</span>
        </div>
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-brand-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-brand-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Finaliser la commande
        </button>
      </div>
    </div>
  );
}
