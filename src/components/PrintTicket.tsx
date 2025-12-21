import { useEffect } from 'react';
import type { Order, OrderItem } from '../lib/database.types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface PrintTicketProps {
  order: OrderWithItems;
}

export function PrintTicket({ order }: PrintTicketProps) {
  useEffect(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const timestamp = new Date(order.created_at).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const itemsHtml = order.items.map(item => `
      <div style="margin: 4px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>${item.product_name}</span>
          <span>${item.quantity}x ${item.price.toFixed(2)} dh</span>
        </div>
        <div style="text-align: right; font-size: 10px; color: #666;">
          = ${(item.price * item.quantity).toFixed(2)} dh
        </div>
      </div>
    `).join('');

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

              @page {
                size: 80mm auto;
                margin: 0;
              }

              body {
                font-family: 'Courier New', 'Courier', monospace;
                background: white;
                padding: 8px;
                margin: 0;
                width: 80mm;
              }

              .header {
                text-align: center;
                margin-bottom: 8px;
                border-bottom: 1px dashed #000;
                padding-bottom: 8px;
              }

              .restaurant-name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 2px;
                letter-spacing: 0.5px;
              }

              .restaurant-tagline {
                font-size: 11px;
                color: #333;
                margin-bottom: 6px;
              }

              .order-number {
                font-size: 26px;
                font-weight: bold;
                margin: 8px 0;
              }

              .timestamp {
                font-size: 11px;
                color: #666;
              }

              .items-section {
                margin: 12px 0;
              }

              .items-divider {
                border-top: 1px dashed #000;
                margin: 8px 0;
              }

              .total-section {
                border-top: 2px dashed #000;
                border-bottom: 2px dashed #000;
                padding: 8px 0;
                margin: 8px 0;
              }

              .total-line {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: bold;
                margin: 4px 0;
              }

              .total-line.grand {
                font-size: 16px;
                margin-top: 6px;
              }

              .footer {
                text-align: center;
                margin-top: 12px;
                font-size: 11px;
                color: #666;
                padding-top: 8px;
              }

              .footer-text {
                margin: 3px 0;
              }

              @media print {
                body {
                  padding: 4px;
                }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="restaurant-name">OKINAWA</div>
              <div class="restaurant-tagline">BY QUICKKITCHEN</div>
              <div class="order-number">ORDER #${order.order_number}</div>
              <div class="timestamp">${timestamp}</div>
            </div>

            <div class="items-section">
              ${itemsHtml}
            </div>

            <div class="items-divider"></div>

            <div class="total-section">
              <div class="total-line">
                <span>SUBTOTAL</span>
                <span>${order.total.toFixed(2)} dh</span>
              </div>
              <div class="total-line grand">
                <span>TOTAL</span>
                <span>${order.total.toFixed(2)} dh</span>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">Thank you for your order!</div>
              <div class="footer-text">Merci d'avoir commandé!</div>
              <div style="border-top: 1px dashed #999; margin: 6px 0;"></div>
              <div class="footer-text">${currentDate}</div>
            </div>
          </body>
        </html>
      `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 500);
    }, 500);
  }, [order]);

  return null;
}
