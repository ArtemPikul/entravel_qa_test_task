export interface CreateCartResponse {
  cartId: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  discountCode: string | null;
  discount: number;
  total: number;
}

export interface AddItemRequest {
  name: unknown;
  price: unknown;
  quantity: unknown;
}

export interface AddItemResponse {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ApplyDiscountRequest {
  code: string;
}

export interface ApplyDiscountResponse {
  message: string;
  discount: string;
}

export interface ErrorResponse {
  error: string;
}

export interface HealthResponse {
  status: string;
}
