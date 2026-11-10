# Reimbursement history: what is built and what you still have to do

**Date:** 2026-11-10
**Design:** `docs/superpowers/specs/2026-11-08-volunteer-reimbursement-history-design.md` (approved)
**App branch:** `feature/reimbursement-history` (VolunteerHoursApp)
**Backend branch:** `feature/reimbursement-history-api` (ContactCRM, 21 commits)

Both halves are coded and their test suites pass. Neither has been run on a phone, against
a real spreadsheet, or deployed. The steps below are what stands between "built" and "working".

## What is built

### Phone app

My Reimbursements card on the home screen; list, detail and edit screens; a submit form
holding up to five receipts. It was written against the backend contract, so **the phone
app needs no further change**. Do not ship a store build until the backend is deployed and
steps 1 to 4 below are done.

### ContactCRM backend

- **Owner projection** on `GET /api/reimbursements/contact/[contactId]`: adds
  `approved_by_name`, `check_number`, `check_date` and `receipt_urls`; never payment notes
  or revision bookkeeping.
- **`POST /api/reimbursements/receipts`**: uploads one receipt to Vercel Blob, returns `{ url }`.
- **Create accepts `receipt_urls`** (1 to 5 Blob URLs).
- **`PATCH /api/reimbursements/<id>`**: edits amount, description and receipts while the
  request is `PENDING`; anything else is refused with 409 `NOT_PENDING`.
- **`receipt_urls` column helpers**: read and write the list in column T, with a
  single-receipt fallback when the header is missing.
- **Weekly digest cron** `/api/cron/reimbursement-digest`: Sunday 11:00 Eastern, pending list
  to vicepresident@, approved list to treasurer@, both copied to communications@; an empty
  list sends nothing.

## What you must do, in order

1. **Add the header cell `receipt_urls` at `T1`** of the `db_Reimbursements` tab (right after
   `payment_revision` at `S1`). Nothing in the code creates it. Until it exists the code
   runs in single-receipt fallback: reads return one receipt, and a submission or edit
   carrying more than one is **refused with a clear message**, not silently truncated.
2. **Set `CRON_SECRET` in Vercel.** It is not set in any environment on the project today.
   Without it the digest route returns 401 and logs a distinct "not configured" error. This
   also means the existing daily `/api/cron/dcr-status-update` has been returning 401 and
   doing nothing. That is a pre-existing problem this work uncovered, not one it caused.
3. **Exercise it from a phone against a preview deployment.** Submit with two receipts, edit
   a pending request, confirm an approved request refuses editing, and read a completed
   request's check number. A green test suite is not evidence the feature works; nothing
   here has been run end to end.
4. **Check whether the preview deployment writes to the production spreadsheet.**
   `GOOGLE_SHEET_ID` has separate preview and production entries, but their values are
   encrypted in the API, so it is unknown whether they differ. If preview shares the
   production sheet, a live test writes real rows and emails real reviewers. Use an
   obviously labelled row, following the existing "QA TEST – J027 – do not pay" convention.
5. **Trigger the digest by hand** with the cron secret once it is set. Confirm both emails
   arrive, communications@ is copied, and an empty list produces no email at all.

## Known limits (decisions, not oversights)

- **Trust model.** Volunteer reads and writes trust the claimed email and contact ID; the
  project owner accepted that tradeoff deliberately. The history route is unauthenticated
  and now also carries check numbers and an approver's name.
- **Stale approval.** An approver can approve an amount a volunteer changed after the
  approver last looked. Two possible fixes are open decisions for you: re-notify reviewers
  on edit, or make approval carry the revision the reviewer saw (this one needs a phone app
  release).
- **Digest timing.** On Vercel's Hobby plan a cron fires anywhere inside its scheduled hour,
  so the digest arrives between 11:00 and 11:59 Eastern. A firing delayed across the hour
  boundary skips that week; in winter that is logged, in summer it cannot be told apart
  from the ordinary off-pass and is silent.
- **No delete, by design.** Deleting a row shifts the rows beneath it, and the approval path
  writes to absolute row positions.

## Tests

Phone app (from the VolunteerHoursApp root):

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

38 tests, all passing on 2026-11-10.

ContactCRM (from the worktree or checkout): `npx vitest run`. 25 files, 319 tests, all
passing on 2026-11-10.
