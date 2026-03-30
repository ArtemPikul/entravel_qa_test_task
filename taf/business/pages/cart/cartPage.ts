import { type Locator, type Page } from '@playwright/test';
import BasePage from '../common/basePage';

export default class CartPage extends BasePage {
  // Add item form
  public readonly itemNameInput: Locator;
  public readonly itemPriceInput: Locator;
  public readonly itemQuantityInput: Locator;
  public readonly addItemButton: Locator;

  // Cart items section
  public readonly cartItemsList: Locator;
  public readonly emptyCartMessage: Locator;

  // Discount section
  public readonly discountCodeInput: Locator;
  public readonly applyDiscountButton: Locator;

  // Order summary
  public readonly subtotalText: Locator;
  public readonly discountText: Locator;
  public readonly totalText: Locator;

  public constructor(page: Page) {
    super(page, '/');
    this.itemNameInput = page.locator('#itemName');
    this.itemPriceInput = page.locator('#itemPrice');
    this.itemQuantityInput = page.locator('#itemQuantity');
    this.addItemButton = page.locator('#addItemForm button[type="submit"]');

    this.cartItemsList = page.locator('#cartItems');
    this.emptyCartMessage = page.locator('.empty-cart');

    this.discountCodeInput = page.locator('#discountCode');
    this.applyDiscountButton = page.locator('#applyDiscount');

    this.subtotalText = page.locator('#subtotal');
    this.discountText = page.locator('#discount');
    this.totalText = page.locator('#total');
  }

  public async addItem(name: string, price: number, quantity: number): Promise<void> {
    await this.itemNameInput.fill(name);
    await this.itemPriceInput.fill(String(price));
    await this.itemQuantityInput.fill(String(quantity));
    await this.addItemButton.click();
  }

  public async applyDiscountCode(code: string): Promise<void> {
    await this.discountCodeInput.fill(code);
    await this.applyDiscountButton.click();
  }

  public getCartItem(name: string): Locator {
    return this.cartItemsList.locator('.cart-item', { hasText: name });
  }

  public getRemoveButton(name: string): Locator {
    return this.getCartItem(name).locator('button', { hasText: 'Remove' });
  }
}
