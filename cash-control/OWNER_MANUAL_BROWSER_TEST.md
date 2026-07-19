# Owner Manual Browser Test

## Start the application

```powershell
wrangler dev
```

Open the exact local URL printed by Wrangler, normally:

`http://127.0.0.1:8787`

## Test Owner login

1. Select Owner.
2. Enter the Owner PIN.
3. Confirm the Owner dashboard opens.
4. Confirm New Purchase is visible.
5. Confirm the existing Owner controls are still visible.

## Record Worker cash

1. Log out.
2. Log in as Worker.
3. Write down the Expected Cash amount.
4. Log out.

## Create a quick Owner purchase

1. Log in as Owner.
2. Open New Purchase.
3. Choose Quick Purchase.
4. Enter BD 1.250.
5. Select or enter a category.
6. Optionally select a supplier.
7. Save.
8. Confirm the success message.
9. Open Owner Purchases.
10. Confirm the record appears.

## Confirm Worker cash protection

1. Log out.
2. Log in as Worker.
3. Confirm Expected Cash is exactly the same as before.
4. Log out.

## Check Accountant access

1. Select Accountant.
2. Enter the Accountant PIN.
3. Confirm the Accountant dashboard opens.
4. Confirm the quick purchase appears.
5. Confirm the combined total includes BD 1.250.
6. Confirm Worker cash summary is visible.
7. Confirm no Add, Edit, Delete, Void, Settings or management buttons appear.

## Create a detailed purchase

1. Log out and log in as Owner.
2. Open New Purchase.
3. Choose Detailed Purchase.
4. Select a supplier.
5. Add at least two products.
6. Enter quantities and prices.
7. Confirm the running total.
8. Save.
9. Open the purchase details.
10. Confirm both items and the total are correct.

## Check detailed purchase as Accountant

1. Log out and log in as Accountant.
2. Open the detailed purchase.
3. Confirm product, supplier, quantity, unit and total are visible.
4. Confirm everything is read-only.

## Test filters

1. Filter by Owner.
2. Filter by today.
3. Search for one product.
4. Filter by one supplier.
5. Clear all filters.
6. Confirm the full list returns.

## Test CSV

1. Export Combined Expenses.
2. Confirm a CSV file downloads.
3. Open it.
4. Confirm Worker and Owner records are clearly identified.
5. Confirm amounts display with three decimals.

## Test mobile widths manually

Open Chrome Developer Tools and enable the device toolbar.

Test:

- 320 × 700
- 360 × 800
- 390 × 844
- 430 × 932

Confirm:

- No horizontal scrolling
- New Purchase is usable
- Product buttons are easy to tap
- Running total is visible
- Save button is reachable
- Bottom navigation does not cover controls
- Filters are usable
- Accountant summary cards are readable
- Purchase details are readable

## Receipt status

Confirm the application clearly shows that receipts are unavailable or optional while R2 is not configured.

Purchase saving must still work without receipts.
