export interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
  description?: string;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface OrderItem {
  id: number;
  quantity: number;
  variant?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  variant?: string;
}

export interface Order {
  id: number;
  name: string;
  location: string;
  table: string;
  items: OrderItem[];
  status: string;
  elapsedMinutes: string;
  timestamp: string;
}

export interface ReviewData {
  name: string;
  role: string;
  image: string;
  text: string;
  stars: number;
}

export interface MenuItemDisplay {
  name: string;
  image: string;
  description: string;
  price: string;
}

// Admin types
export interface Coupon {
  id: number;
  code: string;
  client_name: string;
  discount_percent: number;
  fixed_price: number | null;
  item_prices: Record<string, number>;
  used: boolean;
  created_at: string;
  expires_at: string;
}

export interface ReportData {
  period: string;
  total_orders: number;
  total_revenue: number;
  orders: { name: string; count: number; revenue: number }[];
}
