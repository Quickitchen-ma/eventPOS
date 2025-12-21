export interface User {
  id: string;
  email: string;
  role: 'manager' | 'cashier';
  branch_id: string | null;
  full_name: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}
