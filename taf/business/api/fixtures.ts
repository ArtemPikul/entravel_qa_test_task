import { test as base } from '@playwright/test';
import { CartApiClient } from './cart/client';
import type { CreateCartResponse } from './cart/models';

type ApiFixtures = {
  cartClient: CartApiClient;
  newCartId: string;
};

export const test = base.extend<ApiFixtures>({
  cartClient: async ({ request }, use) => {
    await use(new CartApiClient(request));
  },

  newCartId: async ({ cartClient }, use) => {
    const response = await cartClient.createCart();
    const data: CreateCartResponse = await response.json();
    await use(data.cartId);
  },
});
