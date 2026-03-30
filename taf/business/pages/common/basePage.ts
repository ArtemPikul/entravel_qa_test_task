import { type Page } from '@playwright/test';

export default class BasePage {
  public readonly page: Page;
  public readonly url: string;

  public constructor(page: Page, url: string) {
    this.page = page;
    this.url = url;
  }

  public async open(): Promise<void> {
    await this.page.goto(this.url);
  }
}
