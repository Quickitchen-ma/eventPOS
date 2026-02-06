import type { Order as DBOrder, OrderItem as DBOrderItem } from './database.types';

export interface Order extends DBOrder {
    items: DBOrderItem[];
}

/**
 * RawBT Printer Service Utility
 * Used to communicate with the RawBT Driver app on Android
 * Default port for RawBT HTTP Server is 40213
 */
export class RawBTService {
    private static readonly RAWBT_URL = 'http://localhost:40213/print';

    /**
     * Formats an order into ESC/POS commands
     */
    private static formatOrder(order: Order): string {
        const esc = '\x1b';
        const init = esc + '@';
        const center = esc + 'a\x01';
        const left = esc + 'a\x00';
        const boldOn = esc + 'E\x01';
        const boldOff = esc + 'E\x00';
        const doubleHeightOn = esc + '!\x10';
        const doubleHeightOff = esc + '!\x00';

        let commands = init + center;

        // Header
        commands += boldOn + doubleHeightOn + "QUICKITCHEN\n" + doubleHeightOff + boldOff;
        commands += "Asian, Italian, American & Beyond\n";
        commands += "--------------------------------\n";

        // Order Info
        commands += boldOn + `COMMANDE #${order.order_number}\n` + boldOff;
        if (order.bip_reference) {
            commands += boldOn + `BIP: ${order.bip_reference}\n` + boldOff;
        }
        if (order.created_at) {
            const date = new Date(order.created_at).toLocaleString('fr-FR');
            commands += `${date}\n`;
        }
        commands += "--------------------------------\n";

        // Items
        commands += left;
        order.items.forEach(item => {
            const line = `${item.product_name.substring(0, 24)} x${item.quantity}`;
            const price = `${(item.price * item.quantity).toFixed(2)} dh`;
            // Simple padding for 32 character width (58mm)
            const spaces = 32 - line.length - price.length;
            commands += line + " ".repeat(Math.max(1, spaces)) + price + "\n";
        });

        // Total
        commands += "--------------------------------\n";
        commands += center + boldOn + doubleHeightOn;
        commands += `TOTAL: ${order.total.toFixed(2)} dh\n`;
        commands += doubleHeightOff + boldOff;
        commands += "--------------------------------\n";

        // Footer
        commands += "Merci de votre visite !\n";
        commands += "www.quickitchen.ma\n\n\n\n";

        // Cut paper (optional, some printers do it automatically)
        commands += esc + "V\x41\x03";

        return commands;
    }

    /**
     * Attempts to print via RawBT Server
     * Returns true if successful, false otherwise
     */
    public static async print(order: Order): Promise<boolean> {
        try {
            const data = this.formatOrder(order);

            const response = await fetch(this.RAWBT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: data
            });

            return response.ok;
        } catch (error) {
            console.warn('RawBT print failed. Is the app running?', error);
            return false;
        }
    }
}
