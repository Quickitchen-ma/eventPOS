import { Plus } from 'lucide-react';
import type { Product } from '../lib/database.types';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Aucun produit disponible dans cette catégorie</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          disabled={!product.available}
          className={`bg-white rounded-xl p-4 text-left transition-all hover:shadow-lg ${
            !product.available ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1'
          }`}
        >
          <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-4xl">🍔</div>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-emerald-600">{product.price.toFixed(2)} dh</span>
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
