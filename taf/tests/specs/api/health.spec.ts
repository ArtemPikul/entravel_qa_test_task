import { test } from '../../../business/api/fixtures';
import { expect } from '@playwright/test';
import { StatusCodes } from 'http-status-codes';
import type { HealthResponse } from '../../../business/api/cart/models';

test.describe('Health Check', () => {
  test('GET /health returns 200 with status ok', async ({ cartClient }) => {
    const response = await cartClient.getHealth();

    expect(response.status()).toBe(StatusCodes.OK);

    const body: HealthResponse = await response.json();
    expect(body.status).toBe('ok');
  });
});
