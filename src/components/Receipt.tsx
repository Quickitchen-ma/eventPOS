import { forwardRef } from 'react';
import type { Order, OrderItem } from '../lib/database.types';

interface OrderWithItems extends Order {
    items: OrderItem[];
}

interface ReceiptProps {
    order: OrderWithItems | null;
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ order }: ReceiptProps, ref) => {
    if (!order) return null;

    const timestamp = order.created_at ? new Date(order.created_at as string).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : '';

    return (
        <div ref={ref} className="receipt-container">
            <div className="receipt-header">
                <img src="/icone.png" alt="Logo" className="receipt-logo" />
                <h1>QUICKITCHEN</h1>
                <p>Asian, Italian, American & Beyond</p>
                <div className="receipt-divider" />
                <div className="order-info">
                    <strong>COMMANDE #{order.order_number}</strong>
                    <p>{timestamp}</p>
                </div>
                <div className="receipt-divider" />
            </div>

            <div className="receipt-items">
                {order.items.map((item, index) => (
                    <div key={index} className="receipt-item">
                        <div className="receipt-item-row">
                            <span className="receipt-item-name">{item.product_name}</span>
                            <span className="receipt-item-qty">x{item.quantity}</span>
                        </div>
                        <div className="receipt-item-price">
                            {(item.price * item.quantity).toFixed(2)} dh
                        </div>
                    </div>
                ))}
            </div>

            <div className="receipt-footer">
                <div className="receipt-divider" />
                <div className="receipt-total-row">
                    <span>TOTAL</span>
                    <span>{order.total.toFixed(2)} dh</span>
                </div>
                <div className="receipt-divider" />
                <p className="receipt-thanks">Merci de votre visite !</p>
                <p className="receipt-url">www.quickitchen.ma</p>
            </div>
        </div>
    );
});

Receipt.displayName = 'Receipt';
