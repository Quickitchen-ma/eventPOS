import { useEffect, useState } from 'react';
import { Modal, useModal } from './Modal';
import type { Order, OrderItem } from '../lib/database.types';

interface OrderWithItems extends Order {
  items: OrderItem[];
}

interface PrintTicketProps {
  order: OrderWithItems;
  onComplete?: () => void;
}

export function PrintTicket({ order, onComplete }: PrintTicketProps) {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;
  const { modalProps, showModal } = useModal();

  useEffect(() => {
    if (retryCount > maxRetries) {
      console.log('PrintTicket: Max retries exceeded, giving up');
      onComplete?.();
      return;
    }
    console.log('PrintTicket: Starting print process for order', order?.order_number);

    // Validate order data
    if (!order || !order.items || order.items.length === 0) {
      console.error('PrintTicket: Invalid order data for printing', { order, hasItems: order?.items?.length });
      showModal('Erreur d\'impression', 'Données de commande invalides pour l\'impression.', { type: 'error' });
      onComplete?.();
      return;
    }

    // Validate order fields
    if (!order.order_number || !order.created_at || typeof order.total !== 'number') {
      console.error('PrintTicket: Missing required order fields', {
        orderNumber: order.order_number,
        createdAt: order.created_at,
        total: order.total
      });
      showModal('Erreur d\'impression', 'Champs requis manquants dans la commande.', { type: 'error' });
      onComplete?.();
      return;
    }

    // Validate items data
    const invalidItems = order.items.filter(item =>
      !item.product_name ||
      typeof item.price !== 'number' ||
      typeof item.quantity !== 'number' ||
      item.quantity <= 0 ||
      item.price < 0
    );

    if (invalidItems.length > 0) {
      console.error('PrintTicket: Invalid item data found', invalidItems);
      showModal('Erreur d\'impression', 'Données d\'articles invalides détectées.', { type: 'error' });
      onComplete?.();
      return;
    }

    console.log('PrintTicket: Opening print window');
    let printWindow: Window | null = null;

    try {
      printWindow = window.open('', '_blank', 'width=302,height=500,scrollbars=no,resizable=no,status=no,toolbar=no,menubar=no');
    } catch (error) {
      console.error('PrintTicket: Exception opening print window:', error);
    }

    if (!printWindow) {
      console.error('PrintTicket: Failed to open print window. Popup blocker likely active.');
      showModal(
        'Popups bloquées',
        'Les popups sont bloquées. Veuillez autoriser les popups pour ce site et réessayer.\n\nPour Chrome: Cliquez sur l\'icône de cadenas dans la barre d\'adresse et autorisez les popups.\nPour Firefox: Cliquez sur l\'icône de bouclier et autorisez les popups.',
        { type: 'warning' }
      );
      onComplete?.();
      return;
    }

    console.log('PrintTicket: Print window opened successfully');

    // Add error handler for window
    printWindow.onerror = (message, source, lineno, colno, error) => {
      console.error('PrintTicket: Error in print window:', { message, source, lineno, colno, error });
    };

    try {
      console.log('PrintTicket: Generating HTML content for order', order.order_number);

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

      console.log('PrintTicket: Processing', order.items.length, 'items');
      const itemsHtml = order.items.map(item => {
        const itemTotal = Number(item.price) * item.quantity;
        console.log('PrintTicket: Item', item.product_name, 'total:', itemTotal);
        return `
        <div style="margin: 4px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>${item.product_name || 'Unknown Item'}</span>
            <span>${item.quantity}x ${Number(item.price).toFixed(2)} dh</span>
          </div>
          <div style="text-align: right; font-size: 10px; color: #666;">
            = ${itemTotal.toFixed(2)} dh
          </div>
        </div>
      `;
      }).join('');

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
              <div class="restaurant-name">Quickitchen</div>
              <div class="restaurant-tagline">Asian, Italian, American & Beyond</div>
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
                <span>${Number(order.total).toFixed(2)} dh</span>
              </div>
              <div class="total-line grand">
                <span>TOTAL</span>
                <span>${Number(order.total).toFixed(2)} dh</span>
              </div>
            </div>

            <div class="footer">
              <div class="footer-text">Thank you for your order!</div>
              <div class="footer-text">Merci d'avoir commandé!</div>
              <div class="footer-text">www.quickitchen.ma</div>
              <div style="border-top: 1px dashed #999; margin: 6px 0;"></div>
              <div class="footer-text">${currentDate}</div>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      console.log('PrintTicket: Document written and closed');

      let printInitiated = false;
      let printCompleted = false;

      const attemptPrint = () => {
        if (printInitiated) return;
        printInitiated = true;

        console.log('PrintTicket: Attempting to print');

        try {
          printWindow!.focus();
          printWindow!.print();
          console.log('PrintTicket: Print dialog opened successfully');
        } catch (error) {
          console.error('PrintTicket: Error calling print():', error);
          showModal('Erreur d\'impression', 'Erreur lors de l\'ouverture de la boîte de dialogue d\'impression.', { type: 'error' });
          printWindow!.close();
          onComplete?.();
          return;
        }

        // Set a timeout in case onafterprint doesn't fire
        setTimeout(() => {
          if (!printCompleted) {
            console.log('PrintTicket: Print timeout reached, assuming print completed');
            printWindow!.close();
            onComplete?.();
          }
        }, 30000); // 30 second timeout
      };

      // Use multiple readiness checks
      const checkReadyState = () => {
        if (printWindow!.document.readyState === 'complete') {
          console.log('PrintTicket: Document ready, initiating print');
          attemptPrint();
        } else {
          setTimeout(checkReadyState, 50);
        }
      };

      printWindow.onload = () => {
        console.log('PrintTicket: Window onload triggered');
        checkReadyState();
      };

      printWindow.onafterprint = () => {
        console.log('PrintTicket: onafterprint event fired - print completed successfully');
        printCompleted = true;
        printWindow!.close();
        onComplete?.();
      };

      // Fallback: check ready state immediately
      if (printWindow.document.readyState === 'complete') {
        console.log('PrintTicket: Document already ready');
        attemptPrint();
      }

    } catch (error) {
      console.error('PrintTicket: Error during printing process:', error);
      console.error('PrintTicket: Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        orderNumber: order?.order_number
      });

      // Try to close window if it exists
      try {
        printWindow?.close();
      } catch (closeError) {
        console.error('PrintTicket: Error closing print window:', closeError);
      }

      // Show user-friendly error message
      showModal(
        'Erreur d\'impression',
        `Erreur lors de l'impression du ticket pour la commande ${order.order_number}.\n\nVérifiez que:\n• Votre imprimante est connectée et configurée\n• Les popups ne sont pas bloqués\n• Vous avez sélectionné la bonne imprimante (80mm thermique)\n\nRéessayez l'impression.`,
        { type: 'error' }
      );

      onComplete?.();
    }
  }, [order, onComplete, retryCount]);

  return <Modal {...modalProps} />;
}
