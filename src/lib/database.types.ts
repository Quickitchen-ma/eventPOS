export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          name: string;
          location: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          image_url: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          description: string;
          price: number;
          image_url: string;
          available: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          description?: string;
          price: number;
          image_url?: string;
          available?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          description?: string;
          price?: number;
          image_url?: string;
          available?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          total: number;
          status: string;
          branch_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_number: number;
          total: number;
          status?: string;
          branch_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_number?: number;
          total?: number;
          status?: string;
          branch_id?: string;
          created_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          price: number;
          quantity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          price: number;
          quantity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          price?: number;
          quantity?: number;
          created_at?: string;
        };
      };
    };
  };
}

export type Branch = Database['public']['Tables']['branches']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];

export interface CartItem {
  product: Product;
  quantity: number;
}
