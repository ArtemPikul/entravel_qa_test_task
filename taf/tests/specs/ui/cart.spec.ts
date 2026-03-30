import { test } from '../../../business/pages/fixtures';
import { expect } from '@playwright/test';

test.describe('Shopping Cart UI', () => {
  test.beforeEach(async ({ pageFactory }) => {
    await pageFactory.cart.open();
  });

  // ─── Page Load ──────────────────────────────────────────────────────────────

  test.describe('Page Load', () => {
    test('page has the correct title', async ({ pageFactory }) => {
      await expect(pageFactory.cart.page).toHaveTitle('Shopping Cart');
    });

    test('empty cart message is visible on load', async ({ pageFactory }) => {
      await expect(pageFactory.cart.emptyCartMessage).toBeVisible();
      await expect(pageFactory.cart.emptyCartMessage).toHaveText('Your cart is empty');
    });

    test('order summary shows $0.00 for all values on load', async ({ pageFactory }) => {
      await expect(pageFactory.cart.subtotalText).toHaveText('$0.00');
      await expect(pageFactory.cart.discountText).toHaveText('-$0.00');
      await expect(pageFactory.cart.totalText).toHaveText('$0.00');
    });
  });

  // ─── Add Item ────────────────────────────────────────────────────────────────

  test.describe('Add Item', () => {
    test('added item appears in the cart list', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Test Widget', 10.00, 2);

      await expect(pageFactory.cart.getCartItem('Test Widget')).toBeVisible();
    });

    test('added item shows the correct name', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Blue Mug', 5.99, 1);

      await expect(pageFactory.cart.getCartItem('Blue Mug').locator('.cart-item-name')).toHaveText('Blue Mug');
    });

    test('added item shows the correct price and quantity details', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Red Pen', 2.50, 4);

      const itemDetails = pageFactory.cart.getCartItem('Red Pen').locator('.cart-item-details');
      await expect(itemDetails).toHaveText('$2.50 x 4');
    });

    test('added item shows the correct subtotal', async ({ pageFactory }) => {
      // $2.50 × 4 = $10.00
      await pageFactory.cart.addItem('Red Pen', 2.50, 4);

      const itemSubtotal = pageFactory.cart.getCartItem('Red Pen').locator('.cart-item-subtotal');
      await expect(itemSubtotal).toHaveText('$10.00');
    });

    test('order summary subtotal updates after adding an item', async ({ pageFactory }) => {
      // $20.00 × 1 = $20.00
      await pageFactory.cart.addItem('Keyboard', 20.00, 1);

      await expect(pageFactory.cart.subtotalText).toHaveText('$20.00');
      await expect(pageFactory.cart.totalText).toHaveText('$20.00');
    });

    test('subtotal accumulates correctly after adding multiple items', async ({ pageFactory }) => {
      // $10 × 2 = $20, $5 × 3 = $15 → subtotal $35
      await pageFactory.cart.addItem('Widget A', 10.00, 2);
      await pageFactory.cart.addItem('Widget B', 5.00, 3);

      await expect(pageFactory.cart.subtotalText).toHaveText('$35.00');
      await expect(pageFactory.cart.totalText).toHaveText('$35.00');
    });

    test('empty cart message disappears after adding an item', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Widget', 10.00, 1);

      await expect(pageFactory.cart.emptyCartMessage).not.toBeVisible();
    });
  });

  // ─── Remove Item ─────────────────────────────────────────────────────────────

  test.describe('Remove Item', () => {
    test('clicking Remove removes the item from the list', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Removable Item', 5.00, 1);

      await expect(pageFactory.cart.getCartItem('Removable Item')).toBeVisible();

      await pageFactory.cart.getRemoveButton('Removable Item').click();

      await expect(pageFactory.cart.getCartItem('Removable Item')).not.toBeVisible();
    });

    test('empty cart message reappears after last item is removed', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Solo Item', 5.00, 1);
      await pageFactory.cart.getRemoveButton('Solo Item').click();

      await expect(pageFactory.cart.emptyCartMessage).toBeVisible();
    });

    test('subtotal resets to $0.00 after last item is removed', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Item', 15.00, 2);
      await pageFactory.cart.getRemoveButton('Item').click();

      await expect(pageFactory.cart.subtotalText).toHaveText('$0.00');
      await expect(pageFactory.cart.totalText).toHaveText('$0.00');
    });

    test('removing one item leaves the other items visible', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Item To Remove', 5.00, 1);
      await pageFactory.cart.addItem('Item To Keep', 8.00, 1);

      await pageFactory.cart.getRemoveButton('Item To Remove').click();

      await expect(pageFactory.cart.getCartItem('Item To Remove')).not.toBeVisible();
      await expect(pageFactory.cart.getCartItem('Item To Keep')).toBeVisible();
    });
  });

  // ─── Apply Discount ──────────────────────────────────────────────────────────

  test.describe('Apply Discount', () => {
    test('SAVE10 discount is reflected in the order summary', async ({ pageFactory }) => {
      // $20.00 × 1; SAVE10 = $2.00 off; total $18.00
      await pageFactory.cart.addItem('Widget', 20.00, 1);

      pageFactory.cart.page.once('dialog', dialog => dialog.accept());
      await pageFactory.cart.applyDiscountCode('SAVE10');

      await expect(pageFactory.cart.discountText).toHaveText('-$2.00');
      await expect(pageFactory.cart.totalText).toHaveText('$18.00');
    });

    test('SAVE20 discount is reflected in the order summary', async ({ pageFactory }) => {
      // $50.00 × 1; SAVE20 = $10.00 off; total $40.00
      await pageFactory.cart.addItem('Widget', 50.00, 1);

      pageFactory.cart.page.once('dialog', dialog => dialog.accept());
      await pageFactory.cart.applyDiscountCode('SAVE20');

      await expect(pageFactory.cart.discountText).toHaveText('-$10.00');
      await expect(pageFactory.cart.totalText).toHaveText('$40.00');
    });

    test('HALF discount is reflected in the order summary', async ({ pageFactory }) => {
      // $40.00 × 1; HALF = $20.00 off; total $20.00
      await pageFactory.cart.addItem('Widget', 40.00, 1);

      pageFactory.cart.page.once('dialog', dialog => dialog.accept());
      await pageFactory.cart.applyDiscountCode('HALF');

      await expect(pageFactory.cart.discountText).toHaveText('-$20.00');
      await expect(pageFactory.cart.totalText).toHaveText('$20.00');
    });

    test('discount code input shows the applied code after success', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Widget', 10.00, 1);

      pageFactory.cart.page.once('dialog', dialog => dialog.accept());
      await pageFactory.cart.applyDiscountCode('SAVE10');

      await expect(pageFactory.cart.discountCodeInput).toHaveValue('SAVE10');
    });

    test('invalid discount code triggers an error alert', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Widget', 10.00, 1);

      let alertMessage = '';
      pageFactory.cart.page.once('dialog', dialog => {
        alertMessage = dialog.message();
        return dialog.accept();
      });
      await pageFactory.cart.applyDiscountCode('BADCODE');

      await pageFactory.cart.page.waitForTimeout(500);
      expect(alertMessage).toContain('Invalid discount code');
    });

    test('discount code input accepts lowercase and converts to uppercase via UI', async ({ pageFactory }) => {
      await pageFactory.cart.addItem('Widget', 10.00, 1);

      pageFactory.cart.page.once('dialog', dialog => dialog.accept());
      // The app.js trims + toUpperCase()s the input before sending
      await pageFactory.cart.applyDiscountCode('save10');

      await expect(pageFactory.cart.discountText).not.toHaveText('-$0.00');
    });
  });
});
