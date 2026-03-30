# Bug Report — Shopping Cart API

---

## Summary


| ID     | Title                                                         | Severity | Status |
| ------ | ------------------------------------------------------------- | -------- | ------ |
| BUG-01 | Discount applied only to first item's subtotal, not full cart | High     | Open   |
| BUG-02 | Whitespace-only item names pass validation                    | Low      | Open   |
| BUG-03 | Price of zero is accepted                                     | Low      | Open   |


---

## BUG-01 — Discount applied only to first item's subtotal, not full cart

**Severity:** High
**Affected endpoint:** `GET /cart/:cartId` (calculation happens inside `calculateCartSummary`)
**Source location:** `src/index.js`, line 106

### Description

When a discount code is applied to a cart containing more than one item, the discount amount is computed using **only the first item's subtotal** rather than the total cart subtotal. This causes the discount and final total to be incorrect whenever a cart has two or more items.

### Root Cause

```javascript
// src/index.js — line 104-107
if (cart.discountCode && items.length > 0) {
  const discountPercent = discountCodes[cart.discountCode];
  discount = (items[0].subtotal * discountPercent) / 100;  // ← BUG
}
```

`items[0].subtotal` references the subtotal of the first item only. It should reference `subtotal` (the accumulated cart total computed on line 101).

### Steps to Reproduce

```bash
# 1. Create a cart
curl -s -X POST http://localhost:3000/cart
# → { "cartId": "<ID>" }

# 2. Add first item ($10 × 2 = $20 subtotal)
curl -s -X POST http://localhost:3000/cart/<ID>/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget A","price":10,"quantity":2}'

# 3. Add second item ($5 × 3 = $15 subtotal)
curl -s -X POST http://localhost:3000/cart/<ID>/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget B","price":5,"quantity":3}'

# 4. Apply SAVE10 discount code
curl -s -X POST http://localhost:3000/cart/<ID>/discount \
  -H "Content-Type: application/json" \
  -d '{"code":"SAVE10"}'

# 5. Retrieve cart summary
curl -s http://localhost:3000/cart/<ID>
```

### Expected vs Actual


| Field      | Expected           | Actual                               |
| ---------- | ------------------ | ------------------------------------ |
| `subtotal` | $35.00             | $35.00 ✓                             |
| `discount` | $3.50 (10% of $35) | $2.00 (10% of $20 — first item only) |
| `total`    | $31.50             | $33.00                               |


The same incorrect behaviour occurs with SAVE20 and HALF codes on any cart with 2+ items.

### Suggested Fix

```javascript
// src/index.js — line 106
// Before (bug):
discount = (items[0].subtotal * discountPercent) / 100;

// After (fix):
discount = (subtotal * discountPercent) / 100;
```

### Tests That Expose This Bug

- `[BUG #1] SAVE10 on multi-item cart: discount = 10% of full subtotal`
- `[BUG #1] SAVE20 on multi-item cart: discount = 20% of full subtotal`
- `[BUG #1] HALF on multi-item cart: discount = 50% of full subtotal`

---

## BUG-02 — Whitespace-only item names pass validation

**Severity:** Low
**Affected endpoint:** `POST /cart/:cartId/items`
**Source location:** `src/index.js`, line 41

### Description

The name validation uses `!name` to detect an empty/missing name. In JavaScript, a string consisting entirely of whitespace (e.g. `"   "`) is **truthy**, so `!name` evaluates to `false` and the validation check is skipped. Items with meaningless whitespace-only names are created successfully.

### Root Cause

```javascript
// src/index.js — line 41
if (!name || typeof name !== 'string') {
  return res.status(400).json({ error: 'Invalid item name' });
}
// "   " passes because !"   " === false
```

### Steps to Reproduce

```bash
# Create a cart first, then:
curl -s -X POST http://localhost:3000/cart/<ID>/items \
  -H "Content-Type: application/json" \
  -d '{"name":"   ","price":10,"quantity":1}'
```

### Expected vs Actual


|             | Expected                           | Actual                       |
| ----------- | ---------------------------------- | ---------------------------- |
| HTTP status | `400 Bad Request`                  | `201 Created`                |
| Response    | `{ "error": "Invalid item name" }` | Item object with `name: " "` |


### Suggested Fix

```javascript
// src/index.js — line 41
if (!name || typeof name !== 'string' || name.trim() === '') {
  return res.status(400).json({ error: 'Invalid item name' });
}
```

### Test That Exposes This Bug

- `[BUG #2] whitespace-only item name should be rejected with 400`

---

## BUG-03 — Price of zero is accepted

**Severity:** Low 
**Affected endpoint:** `POST /cart/:cartId/items`
**Source location:** `src/index.js`, line 45

### Description

The price validation rejects values where `price < 0`, but this means `price = 0` is a valid input. An item priced at $0.00 can be added to the cart. Whether this is a bug depends on business requirements (some systems allow free items).

### Root Cause

```javascript
// src/index.js — line 45
if (typeof price !== 'number' || price < 0) {  // ← 0 passes this check
  return res.status(400).json({ error: 'Invalid price' });
}
```

### Steps to Reproduce

```bash
curl -s -X POST http://localhost:3000/cart/<ID>/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Free Sample","price":0,"quantity":1}'
```

### Expected vs Actual


|             | If free items NOT allowed | Actual        |
| ----------- | ------------------------- | ------------- |
| HTTP status | `400 Bad Request`         | `201 Created` |


### Suggested Fix (if free items should be disallowed)

```javascript
// src/index.js — line 45
if (typeof price !== 'number' || price <= 0) {
  return res.status(400).json({ error: 'Invalid price' });
}
```

### Test That Documents This Behavior

- `[BUG #3] price of zero is currently accepted (documents current behavior)`
*(asserts 201 to document the current state; change to 400 if the fix is applied)*

---

## Test Coverage Summary

### API Tests (`tests/specs/api/`)


| Test File        | Scenarios Covered                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `health.spec.ts` | Health endpoint status and response body                                                                                                                                                                                                                                                         |
| `cart.spec.ts`   | Cart creation (uniqueness), retrieval (empty cart shape, 404), add item (valid, 6× invalid inputs, 404, visibility), remove item (204, 404 variants, multi-item integrity), apply discount (3 valid codes, invalid code, 404, reflects in summary), 6× calculation accuracy tests, 5× edge cases |


**Total API tests: 37**  
**Tests expected to FAIL (bugs):** 4 (BUG-01 × 3, BUG-02 × 1; BUG-03 documents current state and )

### UI Tests (`tests/specs/ui/`)


| Describe Block | Scenarios Covered                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Page Load      | Title, empty cart message, $0.00 summary                                                                            |
| Add Item       | Item visibility, name/price/qty/subtotal display, summary update, multi-item accumulation, empty message disappears |
| Remove Item    | Item removal, empty message returns, subtotal resets, multi-item integrity                                          |
| Apply Discount | SAVE10/SAVE20/HALF display, input shows applied code, error alert for invalid code, lowercase input handling        |


**Total UI tests: 18**
**Tests expected to FAIL (bugs):** 0 (UI discount tests use single-item carts, so BUG-01 does not manifest)

### Assumptions

#### Data Persistence & Cart Lifecycle

- **In-memory storage only.** All carts are stored in a JavaScript `Map()` on the server. There is no database. All data is lost when the server restarts — there is no recovery mechanism.
- **No cart deletion or expiration.** There is no endpoint to delete a cart, no TTL, and no garbage collection. Carts persist in memory indefinitely until the server process stops.
- **No cart-clearing endpoint.** To empty a cart a client must delete items one by one; there is no "clear all" action.
- **Page refresh orphans the cart.** The UI calls `initCart()` (POST /cart) on every page load, creating a brand-new cart. The previous cart is abandoned in server memory and inaccessible to the user.

#### Discount Behaviour

- **Only one discount at a time.** Applying a new code silently overwrites the previous one (`cart.discountCode = code`). There is no warning or confirmation.
- **Discount code persists across item changes.** Adding or removing items after applying a discount does not remove or recalculate the discount until the cart is fetched.
- **Discount on an empty cart is accepted.** The API returns 200 OK. The calculation guard (`items.length > 0`) means the resulting discount is $0, but the code remains stored and will take effect as soon as items are added.
- **Discount codes are case-sensitive at the API level.** The server checks `discountCodes[code]` — only exact uppercase matches (SAVE10, SAVE20, HALF) work. The UI front-end uppercases user input before sending it, masking this from the end user.

#### Validation Rules

- **No item name length limit or sanitization.** Any non-empty string passes, including very long strings and HTML/script tags. Item names are rendered via template literals (`${item.name}`) without escaping — this is a potential XSS vector.
- **Duplicate items are not merged.** Adding the same product (same name, price) twice creates two separate cart entries with different UUIDs.
- **No upper bounds on price, quantity, or cart size.** Arbitrarily large numbers and unlimited items per cart are accepted.
- **Price of 0 is accepted** (BUG-03 above). Whether this is correct depends on business rules for free items.

#### Calculations & Rounding

- **Rounding to 2 decimal places** is applied to `subtotal`, `discount`, and `total` via `Math.round(value * 100) / 100`. Per-item subtotals (`price × quantity`) are not explicitly rounded.

#### Authentication, Authorization & Security

- **No authentication or sessions.** Anyone who knows (or guesses) a cart UUID can read and modify that cart.
- **No rate limiting.** The server imposes no limits on cart creation, item addition, or request frequency.
- **HTTP only.** The application does not enforce HTTPS; cart IDs are transmitted in the clear.

#### API Behaviour

- **DELETE returns 204 No Content** with an empty body — not the deleted item.
- **DELETE is not idempotent.** The first call returns 204; a second call for the same itemId returns 404.

