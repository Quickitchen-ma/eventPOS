import type { Order as DBOrder, OrderItem as DBOrderItem } from './database.types';

export interface Order extends DBOrder {
    items: DBOrderItem[];
}

/**
 * RawBT Printer Service Utility
 * Used to communicate with the RawBT Driver app on Android.
 * Uses custom URI scheme (rawbt:) to bypass HTTPS Mixed Content security blocks.
 */
export class RawBTService {
    /**
     * Maps French characters to CP850 (typical for thermal printers)
     */
    private static encodeCP850(str: string): Uint8Array {
        const charMap: Record<string, number> = {
            'é': 0x82, 'à': 0x85, 'è': 0x8A, 'ç': 0x87, 'ù': 0x97,
            'â': 0x83, 'ê': 0x88, 'î': 0x8C, 'ô': 0x93, 'û': 0x96,
            'ë': 0x89, 'ï': 0x8B, 'ü': 0x81, '°': 0xF8, '€': 0xD5
        };

        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            bytes[i] = charMap[char] || char.charCodeAt(0);
        }
        return bytes;
    }

    /**
     * Formats an order into ESC/POS binary data
     */
    private static formatOrderBinary(order: Order): Uint8Array {
        const esc = [0x1B];
        const init = [...esc, 0x40];
        const center = [...esc, 0x61, 0x01];
        const left = [...esc, 0x61, 0x00];
        const boldOn = [...esc, 0x45, 0x01];
        const boldOff = [...esc, 0x45, 0x00];
        const doubleSizeOn = [...esc, 0x21, 0x30]; // Double height + Double width
        const doubleSizeOff = [...esc, 0x21, 0x00];

        const chunks: Uint8Array[] = [];

        const addText = (text: string) => chunks.push(this.encodeCP850(text));
        const addRaw = (bytes: number[]) => chunks.push(new Uint8Array(bytes));

        addRaw(init);
        addRaw(center);

        // Header
        addRaw(boldOn);
        addRaw(doubleSizeOn);
        addText("QUICKITCHEN\n");
        addRaw(doubleSizeOff);
        addRaw(boldOff);
        addText("Asian, Italian, American & Beyond\n");
        addText("--------------------------------\n");

        // Order Info
        addRaw(boldOn);
        addText(`COMMANDE #${order.order_number}\n`);
        if (order.bip_reference) {
            addText(`BIP: ${order.bip_reference}\n`);
        }
        addRaw(boldOff);
        if (order.created_at) {
            const date = new Date(order.created_at).toLocaleString('fr-FR');
            addText(`${date}\n`);
        }
        addText("--------------------------------\n");

        // Items
        addRaw(left);
        order.items.forEach(item => {
            const name = item.product_name.substring(0, 22);
            const qty = `x${item.quantity}`;
            const price = `${(item.price * item.quantity).toFixed(2)} dh`;

            // Format: Name (22) Qty (4) Price (6) = 32 chars
            const line = name.padEnd(22) + qty.padStart(4) + price.padStart(6) + "\n";
            addText(line);
        });

        // Total
        addText("--------------------------------\n");
        addRaw(center);
        addRaw(boldOn);
        addRaw(doubleSizeOn);
        addText(`TOTAL: ${order.total.toFixed(2)} dh\n`);
        addRaw(doubleSizeOff);
        addRaw(boldOff);
        addText("--------------------------------\n");

        // Footer
        addText("Merci de votre visite !\n");
        addText("www.quickitchen.ma\n\n\n\n");

        // Cut
        addRaw([...esc, 0x56, 0x41, 0x03]);

        // Merge all chunks
        const totalLength = chunks.reduce((acc, curr) => acc + curr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return result;
    }

    /**
     * Formats binary data to base64 for the URI scheme
     */
    private static bytesToBase64(bytes: Uint8Array): string {
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Prints via RawBT custom URI scheme
     */
    public static async print(order: Order): Promise<boolean> {
        // Detect if we are on mobile (simplistic check)
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (!isMobile) {
            console.log("Desktop detected, falling back to window.print()");
            return false;
        }

        try {
            const binaryData = this.formatOrderBinary(order);
            const base64 = this.bytesToBase64(binaryData);

            // Custom RawBT URL scheme
            const url = `rawbt:base64:${base64}`;

            console.log("Triggering RawBT silent print...");
            window.location.href = url;

            return true;
        } catch (error) {
            console.error('RawBT print scheme failed:', error);
            return false;
        }
    }
}
