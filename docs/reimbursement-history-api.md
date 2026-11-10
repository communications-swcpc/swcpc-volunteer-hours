# Reimbursement history: app status and the ContactCRM work it needs

**Date:** 2026-11-10
**Design:** `docs/superpowers/specs/2026-11-08-volunteer-reimbursement-history-design.md` (approved)
**App branch:** `feature/reimbursement-history-impl`
**ContactCRM:** not started. The build job that wrote the app side could not write to the
ContactCRM repository (outside its permitted folders), so every backend item below is
still to do.

## What the app branch has

- **My Reimbursements** card on the home screen, for every signed-in volunteer.
- List screen (`app/(home)/my-reimbursements.tsx`): own requests newest first, amount,
  description, status pill, and the date for that status (submitted, approved, paid).
  Pull to refresh; reloads on focus.
- Detail screen (`app/(home)/reimbursement-detail.tsx`): three-step track (Submitted,
  Approved with approver name, Check written with check number and date when present,
  "Not yet" otherwise), receipt thumbnails that open full size, and **Edit** only while
  `PENDING`.
- Edit screen (`app/(home)/edit-reimbursement.tsx`): amount, description and receipts,
  prefilled. No delete.
- Submit form accumulates up to five receipts (`components/ReceiptPicker.tsx`), each with
  its own Remove.
- Pure rules in `shared/reimbursement-history.ts`; network client in
  `services/reimbursement-history.ts`.

### What works against today's backend, unchanged

- The list and detail screens: today's contact route returns the base fields, which the
  app decodes with blank check details, the approver's address instead of a name, and a
  single receipt.
- Submitting with **one** receipt: sent inline exactly as before.

### What needs the backend below before it works

- Submitting with **two or more** receipts (needs the upload route).
- **Edit** (needs the edit route). Without it, Save shows an error and changes nothing.
- Check number and date, approver names, and multi-receipt thumbnails on the detail screen.

Do not ship a store build with this branch until the ContactCRM work is deployed.

## ContactCRM work required (contract the app is built against)

1. **Owner projection on `GET /api/reimbursements/contact/[contactId]`.** Add, additively,
   to each row: `approved_by_name` (resolve `approved_by` against Contacts by email; empty
   when no match, the app then shows the address), `check_number`, `check_date`, and
   `receipt_urls` (array of strings; from the new column, falling back to
   `[receipt_url]`). Never `payment_note` or payment revision bookkeeping. Update
   `__tests__/lib/reimbursements/private-history-route.test.ts`, which pins this shape.
2. **`POST /api/reimbursements/receipts`**: body `{ contact_id, email, receipt_base64,
   receipt_mime }`. Verify the contact and email pair as the create route does, `put` the
   file to Vercel Blob under `receipts/<year>/` exactly as create does, return
   `{ url }`. One receipt per request (Vercel's ~4.5 MB body cap).
3. **Create accepts `receipt_urls`** (1 to 5, each an `https://*.public.blob.vercel-storage.com`
   URL). The app also sends `receipt_url` = the first URL, so today's create route already
   stores the first receipt. Write the full list to column T when its header is present.
4. **`PATCH /api/reimbursements/[id]`**: header `x-mobile-email`, body
   `{ contact_id, amount, description, receipt_urls }`. Rules from the design:
   - Row's `contact_id` and lowercased `email` must both match, else **404**.
   - Re-read status server-side; not `PENDING` → **409** with
     `{ error, code: 'NOT_PENDING' }` (the app shows `error` and returns to the detail).
   - Budget check measured against the row's own `year`, **excluding the request being
     edited** (today's `getBudgetForContact` counts it, which would reject valid edits).
   - Write only `D:F` (amount, description, first receipt) and `T` (JSON list, only when
     the header is present), with RAW values, never the status, approval or payment
     cells. Same double-read and readback pattern as `approveSheetReimbursement`.
   - No re-notify, no change to `submitted_at` or `year`, no "edited at" column.
   - Pin with tests: refusal on a non-pending row, and the budget exclusion.
5. **Column T header `receipt_urls`** on the live `db_Reimbursements` tab, added once by
   hand. Code must treat it as absent-and-empty when missing.
6. **Weekly digest cron** `/api/cron/reimbursement-digest`, `CRON_SECRET` bearer like
   `dcr-status-update`. `vercel.json` entries `0 15 * * 0` and `0 16 * * 0`; the route
   acts only when it is Sunday 11:00 in `America/New_York` and returns without sending on
   the other pass. `PENDING` list to vicepresident@, `APPROVED` list to treasurer@, both
   CC communications@ (`sendEmail` has no CC field today; add one). Rows: volunteer name,
   amount, description, days waiting (from `submitted_at` for pending, `approved_at` for
   approved). Empty list → that email is not sent. Each email independent; one failure is
   logged and does not block the other. Link to the review dashboard as the existing
   notification emails do.

## Tests

```
npx tsc shared/reimbursement-history.ts services/reimbursement-history.ts \
  shared/reimbursement-payment.ts services/reimbursement-payments.ts \
  --outDir /tmp/rh-tests --module commonjs --target es2020 --skipLibCheck --lib es2020,dom
HISTORY_CONTRACT_PATH=/tmp/rh-tests/shared/reimbursement-history.js \
HISTORY_CLIENT_PATH=/tmp/rh-tests/services/reimbursement-history.js \
PAYMENT_CONTRACT_PATH=/tmp/rh-tests/shared/reimbursement-payment.js \
PAYMENT_CLIENT_PATH=/tmp/rh-tests/services/reimbursement-payments.js \
node --test tests/*.cjs
```

38 tests, all passing on 2026-11-10; `npx tsc --noEmit` clean. Not yet run on a device or
simulator.
