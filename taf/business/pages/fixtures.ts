import { test as base } from '@playwright/test';
import CartPage from './cart/cartPage';

type PageFixtures = {
  pageFactory: {
    cart: CartPage;
  };
};

export const test = base.extend<PageFixtures>({
  pageFactory: async ({ page }, use) => {
    await use({
      cart: new CartPage(page),
    });
  },
});
