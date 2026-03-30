import { test } from '../../../business/api/fixtures';
import { expect } from '@playwright/test';
import { StatusCodes } from 'http-status-codes';
import CartItemFactory from '../../../business/datasources/cartItemFactory';
import type {
  AddItemResponse,
  ApplyDiscountResponse,
  CartSummary,
  CreateCartResponse,
  ErrorResponse,
} from '../../../business/api/cart/models.ts';

const factory = new CartItemFactory();

// ─── Cart Creation ────────────────────────────────────────────────────────────

test.describe('Cart Creation', () => {
  test('POST /cart creates a new cart and returns 201 with a cartId', async ({ cartClient }) => {
    const response = await cartClient.createCart();

    expect(response.status()).toBe(StatusCodes.CREATED);

    const body: CreateCartResponse = await response.json();
    expect(body.cartId).toBeDefined();
    expect(typeof body.cartId).toBe('string');
    expect(body.cartId.length).toBeGreaterThan(0);
  });

  test('POST /cart creates unique cart IDs on each call', async ({ cartClient }) => {
    const r1 = await cartClient.createCart();
    const r2 = await cartClient.createCart();

    const { cartId: id1 } = await r1.json() as CreateCartResponse;
    const { cartId: id2 } = await r2.json() as CreateCartResponse;

    expect(id1).not.toBe(id2);
  });
});

// ─── Cart Retrieval ───────────────────────────────────────────────────────────

test.describe('Cart Retrieval', () => {
  test('GET /cart/:cartId returns 200 with correct empty-cart shape', async ({ newCartId, cartClient }) => {
    const response = await cartClient.getCart(newCartId);

    expect(response.status()).toBe(StatusCodes.OK);

    const body: CartSummary = await response.json();
    expect(body.items).toEqual([]);
    expect(body.subtotal).toBe(0);
    expect(body.discount).toBe(0);
    expect(body.total).toBe(0);
    expect(body.discountCode).toBeNull();
  });

  test('GET /cart/:cartId returns 404 for a non-existent cart', async ({ cartClient }) => {
    const response = await cartClient.getCart('non-existent-cart-id');

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);

    const body: ErrorResponse = await response.json();
    expect(body.error).toBeDefined();
  });
});

// ─── Add Item ─────────────────────────────────────────────────────────────────

test.describe('Add Item', () => {
  test('POST /cart/:cartId/items with valid data returns 201 and the created item', async ({ newCartId, cartClient }) => {
    const item = factory.getValidItem();
    const response = await cartClient.addItem(newCartId, item);

    expect(response.status()).toBe(StatusCodes.CREATED);

    const body: AddItemResponse = await response.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe(item.name);
    expect(body.price).toBe(item.price);
    expect(body.quantity).toBe(item.quantity);
  });

  test('POST /cart/:cartId/items with negative price returns 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, factory.getItemWithPrice(-1));

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);

    const body: ErrorResponse = await response.json();
    expect(body.error).toBeDefined();
  });

  test('POST /cart/:cartId/items with zero quantity returns 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, factory.getItemWithQuantity(0));

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);

    const body: ErrorResponse = await response.json();
    expect(body.error).toBeDefined();
  });

  test('POST /cart/:cartId/items with missing name returns 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: '', price: 10, quantity: 1 });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test('POST /cart/:cartId/items with missing price returns 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: 'Widget', price: undefined, quantity: 1 });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test('POST /cart/:cartId/items with missing quantity returns 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: 'Widget', price: 10, quantity: undefined });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test('POST /cart/:cartId/items on a non-existent cart returns 404', async ({ cartClient }) => {
    const response = await cartClient.addItem('non-existent-cart-id', factory.getValidItem());

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });

  test('added item is visible when cart is retrieved', async ({ newCartId, cartClient }) => {
    const item = factory.getValidItem();
    await cartClient.addItem(newCartId, item);

    const cartResponse = await cartClient.getCart(newCartId);
    const cart: CartSummary = await cartResponse.json();

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].name).toBe(item.name);
  });
});

// ─── Remove Item ──────────────────────────────────────────────────────────────

test.describe('Remove Item', () => {
  test('DELETE /cart/:cartId/items/:itemId removes the item and returns 204', async ({ newCartId, cartClient }) => {
    const addResponse = await cartClient.addItem(newCartId, factory.getValidItem());
    const addedItem: AddItemResponse = await addResponse.json();

    const deleteResponse = await cartClient.removeItem(newCartId, addedItem.id);
    expect(deleteResponse.status()).toBe(StatusCodes.NO_CONTENT);

    // Verify the item is no longer in the cart
    const cartResponse = await cartClient.getCart(newCartId);
    const cart: CartSummary = await cartResponse.json();
    expect(cart.items).toHaveLength(0);
  });

  test('DELETE /cart/:cartId/items/:itemId returns 404 for a non-existent item', async ({ newCartId, cartClient }) => {
    const response = await cartClient.removeItem(newCartId, 'non-existent-item-id');

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });

  test('DELETE /cart/:cartId/items/:itemId returns 404 for a non-existent cart', async ({ cartClient }) => {
    const response = await cartClient.removeItem('non-existent-cart-id', 'some-item-id');

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });

  test('removing one item from a multi-item cart leaves the other items intact', async ({ newCartId, cartClient }) => {
    const item1 = factory.getValidItem();
    const item2 = factory.getValidItem();

    const r1: AddItemResponse = await (await cartClient.addItem(newCartId, item1)).json();
    await cartClient.addItem(newCartId, item2);

    await cartClient.removeItem(newCartId, r1.id);

    const cartResponse = await cartClient.getCart(newCartId);
    const cart: CartSummary = await cartResponse.json();
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].name).toBe(item2.name);
  });
});

// ─── Apply Discount ───────────────────────────────────────────────────────────

test.describe('Apply Discount', () => {
  test('POST /cart/:cartId/discount with SAVE10 returns 200 with 10% discount info', async ({ newCartId, cartClient }) => {
    const response = await cartClient.applyDiscount(newCartId, { code: 'SAVE10' });

    expect(response.status()).toBe(StatusCodes.OK);

    const body: ApplyDiscountResponse = await response.json();
    expect(body.message).toBeDefined();
    expect(body.discount).toBe('10%');
  });

  test('POST /cart/:cartId/discount with SAVE20 returns 200 with 20% discount info', async ({ newCartId, cartClient }) => {
    const response = await cartClient.applyDiscount(newCartId, { code: 'SAVE20' });

    expect(response.status()).toBe(StatusCodes.OK);

    const body: ApplyDiscountResponse = await response.json();
    expect(body.discount).toBe('20%');
  });

  test('POST /cart/:cartId/discount with HALF returns 200 with 50% discount info', async ({ newCartId, cartClient }) => {
    const response = await cartClient.applyDiscount(newCartId, { code: 'HALF' });

    expect(response.status()).toBe(StatusCodes.OK);

    const body: ApplyDiscountResponse = await response.json();
    expect(body.discount).toBe('50%');
  });

  test('POST /cart/:cartId/discount with an invalid code returns 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.applyDiscount(newCartId, { code: 'INVALID' });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);

    const body: ErrorResponse = await response.json();
    expect(body.error).toBeDefined();
  });

  test('POST /cart/:cartId/discount on a non-existent cart returns 404', async ({ cartClient }) => {
    const response = await cartClient.applyDiscount('non-existent-cart-id', { code: 'SAVE10' });

    expect(response.status()).toBe(StatusCodes.NOT_FOUND);
  });

  test('applied discount code is reflected in cart summary', async ({ newCartId, cartClient }) => {
    await cartClient.applyDiscount(newCartId, { code: 'SAVE20' });

    const cartResponse = await cartClient.getCart(newCartId);
    const cart: CartSummary = await cartResponse.json();
    expect(cart.discountCode).toBe('SAVE20');
  });
});

// ─── Cart Total Calculations ──────────────────────────────────────────────────

test.describe('Cart Total Calculations', () => {
  test('single item: subtotal = price × quantity, no discount', async ({ newCartId, cartClient }) => {
    // $10.00 × 3 = $30.00
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget', 10.00, 3));

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(30.00);
    expect(cart.discount).toBe(0);
    expect(cart.total).toBe(30.00);
  });

  test('multiple items: subtotal is the sum of all item subtotals', async ({ newCartId, cartClient }) => {
    // Item 1: $10.00 × 2 = $20.00
    // Item 2: $5.00  × 3 = $15.00
    // Subtotal = $35.00
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget A', 10.00, 2));
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget B', 5.00, 3));

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(35.00);
  });

  test('SAVE10 on single-item cart: discount = 10% of subtotal', async ({ newCartId, cartClient }) => {
    // $10.00 × 3 = $30.00 subtotal; 10% = $3.00 discount; total = $27.00
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget', 10.00, 3));
    await cartClient.applyDiscount(newCartId, { code: 'SAVE10' });

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(30.00);
    expect(cart.discount).toBe(3.00);
    expect(cart.total).toBe(27.00);
  });

  /**
   * BUG #1: This test exposes the discount calculation bug.
   * The app computes: discount = items[0].subtotal × rate  (only first item)
   * Expected:         discount = subtotal            × rate  (entire cart)
   *
   * With Item A ($10×2=$20) + Item B ($5×3=$15) → subtotal $35
   * SAVE10 should give $3.50 discount → total $31.50
   * Actual (bug):     $20 × 10% = $2.00 discount → total $33.00
   */
  test('[BUG #1] SAVE10 on multi-item cart: discount = 10% of full subtotal', async ({ newCartId, cartClient }) => {
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget A', 10.00, 2)); // $20
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget B', 5.00, 3));  // $15
    await cartClient.applyDiscount(newCartId, { code: 'SAVE10' });

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(35.00);
    expect(cart.discount).toBe(3.50);  // BUG: actual value is 2.00 (only Item A's subtotal)
    expect(cart.total).toBe(31.50);    // BUG: actual value is 33.00
  });

  /**
   * BUG #1 (continued): Same issue with SAVE20 on a multi-item cart.
   */
  test('[BUG #1] SAVE20 on multi-item cart: discount = 20% of full subtotal', async ({ newCartId, cartClient }) => {
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget A', 10.00, 2)); // $20
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget B', 5.00, 3));  // $15
    await cartClient.applyDiscount(newCartId, { code: 'SAVE20' });

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(35.00);
    expect(cart.discount).toBe(7.00);  // BUG: actual value is 4.00
    expect(cart.total).toBe(28.00);    // BUG: actual value is 31.00
  });

  /**
   * BUG #1 (continued): Same issue with HALF on a multi-item cart.
   */
  test('[BUG #1] HALF on multi-item cart: discount = 50% of full subtotal', async ({ newCartId, cartClient }) => {
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget A', 10.00, 2)); // $20
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget B', 5.00, 3));  // $15
    await cartClient.applyDiscount(newCartId, { code: 'HALF' });

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(35.00);
    expect(cart.discount).toBe(17.50); // BUG: actual value is 10.00
    expect(cart.total).toBe(17.50);    // BUG: actual value is 25.00
  });

  test('item subtotal field is price × quantity', async ({ newCartId, cartClient }) => {
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget', 7.50, 4));

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.items[0].subtotal).toBe(30.00);
  });

  test('decimal price arithmetic is rounded to 2 decimal places', async ({ newCartId, cartClient }) => {
    // $1.99 × 3 = $5.97
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget', 1.99, 3));

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.subtotal).toBe(5.97);
    expect(cart.total).toBe(5.97);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

test.describe('Edge Cases', () => {
  /**
   * BUG #2: Whitespace-only names pass validation.
   * The check `!name` is false for "   " (non-empty string), so it is accepted.
   * Expected: 400 Bad Request.
   */
  test('[BUG #2] whitespace-only item name should be rejected with 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: '   ', price: 10, quantity: 1 });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  /**
   * BUG #3 (informational): price = 0 is currently accepted.
   * The validation is `price < 0`, so zero passes.
   * This test documents the current behavior. Whether 0 should be valid
   * depends on product requirements (free items may be intentional).
   */
  test('[BUG #3] price of zero is currently accepted (documents current behavior)', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: 'Free Sample', price: 0, quantity: 1 });

    // Currently returns 201 — change to BAD_REQUEST if free items should be disallowed
    expect(response.status()).toBe(StatusCodes.CREATED);
  });

  test('discount on an empty cart results in zero discount', async ({ newCartId, cartClient }) => {
    await cartClient.applyDiscount(newCartId, { code: 'SAVE10' });

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.discount).toBe(0);
    expect(cart.total).toBe(0);
  });

  test('applying a second discount code overwrites the first', async ({ newCartId, cartClient }) => {
    await cartClient.addItem(newCartId, factory.getFixedItem('Widget', 10.00, 1));
    await cartClient.applyDiscount(newCartId, { code: 'SAVE10' });
    await cartClient.applyDiscount(newCartId, { code: 'SAVE20' });

    const response = await cartClient.getCart(newCartId);
    const cart: CartSummary = await response.json();

    expect(cart.discountCode).toBe('SAVE20');
    expect(cart.discount).toBe(2.00); // 20% of $10
  });

  test('price with string type is rejected with 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: 'Widget', price: '10' as unknown as number, quantity: 1 });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });

  test('quantity with string type is rejected with 400', async ({ newCartId, cartClient }) => {
    const response = await cartClient.addItem(newCartId, { name: 'Widget', price: 10, quantity: '2' as unknown as number });

    expect(response.status()).toBe(StatusCodes.BAD_REQUEST);
  });
});
