import { type APIResponse } from '@playwright/test';
import { BaseApiClient } from '../common/baseClient';
import type { AddItemRequest, ApplyDiscountRequest } from './models';

export class CartApiClient extends BaseApiClient {
  async createCart(): Promise<APIResponse> {
    return this.post('/cart');
  }

  async getCart(cartId: string): Promise<APIResponse> {
    return this.get(`/cart/${cartId}`);
  }

  async addItem(cartId: string, item: AddItemRequest): Promise<APIResponse> {
    return this.post(`/cart/${cartId}/items`, item);
  }

  async removeItem(cartId: string, itemId: string): Promise<APIResponse> {
    return this.delete(`/cart/${cartId}/items/${itemId}`);
  }

  async applyDiscount(cartId: string, request: ApplyDiscountRequest): Promise<APIResponse> {
    return this.post(`/cart/${cartId}/discount`, request);
  }

  async getHealth(): Promise<APIResponse> {
    return this.get('/health');
  }
}
