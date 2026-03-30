import { type APIRequestContext, type APIResponse } from '@playwright/test';

export class BaseApiClient {
  protected request: APIRequestContext;
  private readonly headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
  };

  public constructor(request: APIRequestContext) {
    this.request = request;
  }

  public async post(url: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(url, {
      data,
      headers: this.headers,
    });
  }

  public async get(
    url: string,
    params?: string | { [key: string]: string | number | boolean } | URLSearchParams,
  ): Promise<APIResponse> {
    const options: {
      params?: string | { [key: string]: string | number | boolean } | URLSearchParams;
      headers: { [key: string]: string };
    } = { headers: this.headers };

    if (params !== undefined) options.params = params;
    return this.request.get(url, options);
  }

  public async delete(url: string): Promise<APIResponse> {
    return this.request.delete(url, { headers: this.headers });
  }
}
