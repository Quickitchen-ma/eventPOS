import { useRef, useEffect } from 'react';
import type { Order, OrderItem } from '../lib/database.types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface PrintTicketProps {
  order: OrderWithItems;
}

export function PrintTicket({ order }: PrintTicketProps) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      const printContent = printRef.current.innerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order #${order.order_number}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              html, body {
                width: 80mm;
                height: auto;
              }

              body {
                font-family: 'Courier New', 'Courier', monospace;
                background: white;
                padding: 0;
                margin: 0;
              }

              .ticket {
                width: 80mm;
                padding: 8px;
                background: white;
                color: black;
              }

              .header {
                text-align: center;
                margin-bottom: 8px;
                border-bottom: 1px dashed #000;
                padding-bottom: 8px;
              }

              .restaurant-name {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 2px;
                letter-spacing: 0.5px;
              }

              .restaurant-tagline {
                font-size: 10px;
                color: #333;
                margin-bottom: 4px;
              }

              .order-number {
                font-size: 24px;
                font-weight: bold;
                margin: 6px 0;
              }

              .timestamp {
                font-size: 10px;
                color: #666;
              }

              .items-section {
                margin: 8px 0;
              }

              .items-divider {
                border-top: 1px dashed #000;
                margin: 6px 0;
              }

              .item-line {
                display: flex;
                justify-content: space-between;
                margin: 4px 0;
                font-size: 11px;
              }

              .item-detail {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
                font-size: 10px;
                color: #666;
              }

              .total-section {
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
                padding: 6px 0;
                margin: 6px 0;
              }

              .total-line {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                font-weight: bold;
                margin: 4px 0;
              }

              .footer {
                text-align: center;
                margin-top: 8px;
                font-size: 10px;
                color: #666;
                padding-top: 8px;
              }

              .footer-text {
                margin: 2px 0;
              }

              @media print {
                body { margin: 0; padding: 0; }
                .ticket { width: 80mm; }
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
      }, 300);
    }
  }, [order]);

  return (
    <div ref={printRef} className="hidden">
      <div className="ticket">
        <div className="header">
          <div className="restaurant-name">OKINAWA</div>
          <div className="restaurant-tagline">BY QUICKITCHEN</div>
          <div className="order-number">ORDER #${order.order_number}</div>
          <div className="timestamp">
            {new Date(order.created_at).toLocaleString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>

        <div className="items-section">
          {order.items.map((item) => (
            <div key={item.id}>
              <div className="item-line">
                <span>{item.product_name}</span>
                <span>{item.quantity}x</span>
                <span>{item.price.toFixed(2)} dh</span>
              </div>
              <div className="item-detail">
                <span></span>
                <span>= {(item.price * item.quantity).toFixed(2)} dh</span>
              </div>
            </div>
          ))}
        </div>

        <div className="items-divider"></div>

        <div className="total-section">
          <div className="total-line">
            <span>SUBTOTAL</span>
            <span>{order.total.toFixed(2)} dh</span>
          </div>
          <div className="total-line" style={{ fontSize: '14px' }}>
            <span>TOTAL</span>
            <span>{order.total.toFixed(2)} dh</span>
          </div>
        </div>

        <div className="footer">
          <div className="footer-text">Thank you for your order!</div>
          <div className="footer-text">Merci d'avoir commandé!</div>
          <div className="items-divider" style={{ marginTop: '4px' }}></div>
          <div className="footer-text" style={{ marginTop: '4px' }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
