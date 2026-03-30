import { faker } from '@faker-js/faker';

export interface CartItemData {
  name: string;
  price: number;
  quantity: number;
}

export default class CartItemFactory {
  /**
   * Random valid item — use for smoke/functional tests where exact values don't matter.
   */
  getValidItem(): CartItemData {
    return {
      name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price({ min: 1, max: 100, dec: 2 })),
      quantity: faker.number.int({ min: 1, max: 10 }),
    };
  }

  /**
   * Item with a specific price — use when testing price-related validation.
   */
  getItemWithPrice(price: number): CartItemData {
    return {
      name: faker.commerce.productName(),
      price,
      quantity: faker.number.int({ min: 1, max: 5 }),
    };
  }

  /**
   * Item with a specific quantity — use when testing quantity-related validation.
   */
  getItemWithQuantity(quantity: number): CartItemData {
    return {
      name: faker.commerce.productName(),
      price: parseFloat(faker.commerce.price({ min: 1, max: 50, dec: 2 })),
      quantity,
    };
  }

  /**
   * Fully deterministic item — use for calculation accuracy tests.
   */
  getFixedItem(name: string, price: number, quantity: number): CartItemData {
    return { name, price, quantity };
  }
}
