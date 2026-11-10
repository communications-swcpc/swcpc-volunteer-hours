# Volunteer reimbursement history, editing, and a weekly reviewer digest

**Date:** 2026-11-08
**Status:** design, awaiting approval
**Repos touched:** `VolunteerHoursApp` (Expo, iOS + Android) and `ContactCRM` (Next.js on Vercel)

## Intent and why

A volunteer who submits a reimbursement request today gets a confirmation alert and
then hears nothing until a check arrives. The app has no way to look back at what
was submitted, and no way to see whether anyone has acted on it. Volunteers want to
answer two questions for themselves: **has it been approved, and has it been paid.**

Two further gaps surfaced while working through it. A volunteer who typos an amount
or attaches the wrong photo has no recourse but to email somebody, and a request
covering several receipts has to be split into several requests, because the submit
form holds exactly one attachment.

On the reviewer side, requests stall silently. Approval notifications go out once,
when a request is created, and nothing follows up. A weekly summary puts the
outstanding queue in front of the two people who can clear it.

## Goals

- A volunteer can see every reimbursement request they have ever submitted, with
  its current status and the dates behind that status.
- A volunteer can correct a request that has not yet been approved.
- A volunteer can attach more than one receipt to a single request.
- Every Sunday at 11:00 am Eastern, the vice president gets the list of requests
  awaiting approval and the treasurer gets the list approved but not yet paid, each
  copied to `communications@corridorpark.org`.

## Non-goals

- Changing anything about a request once it is approved. Approval freezes it.
- Deleting or withdrawing a request. Volunteers add and modify only; a request that
  should not have been submitted is corrected, or left for a reviewer to handle out
  of band. This was decided deliberately: any row deletion shifts every row beneath
  it, and `approveSheetReimbursement` writes to absolute row positions, so a delete
  landing inside an in-flight approval could stamp an approval onto a different
  volunteer's request. Removing Delete removes that failure mode rather than
  managing it.
- Push notifications or any status-change email to the volunteer.
- Any change to the approval or payment workflow itself, including the payment
  command and revision machinery in `lib/reimbursements/`.
- A history or editing surface on the ContactCRM web dashboard. This is the phone
  app plus the backend it needs.
- Denying or returning a request to the volunteer. There is no DENIED status today
  and this design does not add one.

## Anti-goals

Things that would make this a failure even if it shipped and worked:

- A volunteer able to change an approved or paid request.
- An edit that corrupts the annual budget arithmetic, letting a volunteer exceed
  their limit by editing rather than submitting.
- A multi-receipt change that breaks any existing reader of the `receipt_url`
  column: the admin review screen, the ContactCRM web dashboard, the two
  notification emails, or the older Apps Script app if it still points at this
  spreadsheet.
- A weekly email that arrives when there is nothing to report, or that arrives at
  the wrong hour half the year.

## Constraints and current state

The store is a Google Sheet, not a database. `ContactCRM/lib/google/sheets.ts`
wraps the Sheets v4 API with `getSheetData`, `getSheetDataWithIndices`, `appendRow`,
`updateRow`, and `deleteRow`. There are no transactions; concurrent writers are
possible and the design has to assume a reviewer may act between a read and a write.

**Statuses** are `PENDING` → `APPROVED` → `COMPLETE`, declared in
`ContactCRM/lib/reimbursements/payment-schema.ts`. The admin review screen labels
them "Pending approval", "Awaiting payment", and "Completed history"; the volunteer
screens reuse that wording rather than inventing new labels.

**Columns** on the Reimbursements tab are fixed in `REIMBURSEMENT_BASE_KEYS`:
`request_id`, `contact_id`, `email`, `amount`, `description`, `receipt_url`, `year`,
`status`, `submitted_at`, `approved_by`, `approved_at`, `completed_by`,
`completed_at`, followed by the payment columns (`check_number`, `check_date`,
`payment_note`, and payment revision bookkeeping).

**`projectReimbursement(item, includePayment)`** is an explicit allowlist: unknown
appended sheet columns never reach a client. Anything new that the app must see has
to be added to a projection deliberately.

**The existing endpoints** are in `ContactCRM/app/api/reimbursements/`.
`GET /api/reimbursements/contact/[contactId]` already returns one volunteer's rows,
projected without payment fields, and the app's `SessionContext` already carries
`contactId`. No new read route is needed for the list itself.

**Receipts** are uploaded as base64 in the create request and stored in Vercel Blob
with public access (`put(..., { access: 'public', addRandomSuffix: true })`), under
`receipts/<year>/`. The blob URL goes in `receipt_url`.

**The budget check** in `getBudgetForContact` sums `PENDING`, `APPROVED`, and
`COMPLETE` requests for the contact and year against a per-volunteer or default
limit.

**Authentication.** Sign-in is email-only with no proof of ownership; the comment at
the top of `VolunteerHoursApp/context/SessionContext.tsx` records this as a
deliberate simplicity tradeoff. The contact-scoped read endpoint has no
authentication at all.

## Decisions

### The volunteer screen

**A new "My Reimbursements" screen**, reached from a fourth card on the home screen
(`app/(home)/index.tsx`), alongside Log Volunteer Hours, Submit Reimbursement, and
the privileged-only Review Reimbursements card. The new card is visible to every
signed-in volunteer.

The screen is a list of the signed-in volunteer's own requests, newest first. Each
row shows the amount, the description, a status pill, and the date that matters for
that status — submitted, approved, or paid. Tapping a row opens a detail view.

**The detail view shows a three-step progress track**, chosen over a flat grouped
list because a volunteer's question is "where is mine", not "what is the queue":

1. **Submitted** — always complete, with `submitted_at`.
2. **Approved** — complete when status is `APPROVED` or `COMPLETE`, showing
   `approved_at` and the approver's name from `approved_by`.
3. **Check written** — complete when status is `COMPLETE`, showing `completed_at`,
   and the check number and check date when the sheet holds them. When it does not,
   the step shows the paid date alone. Incomplete steps read "Not yet".

`approved_by` holds an email address, lowercased, not a display name — for approvals
it will usually be a role address such as `vicepresident@corridorpark.org`. The
Approved step resolves it against the Contacts sheet and shows the matching person's
name; with no match it shows the address itself.

`check_number` and `check_date` are not reachable by the app today:
`projectReimbursement(item, false)` drops every payment field. This adds a third,
owner-facing projection carrying those two fields and nothing else — `payment_note`
and the payment revision bookkeeping stay reviewer-only. The two fields are added to
the existing contact route's response additively; its only other caller is the web
dashboard's contact activity panel (`components/contacts/contact-activity-sections.tsx`),
and `__tests__/lib/reimbursements/private-history-route.test.ts` pins that route's
current shape and will need updating.

The detail view also lists the request's receipts as thumbnails.

### Editing

While a request is `PENDING`, its detail view offers **Edit**. It reopens the
amount, description, and receipt fields prefilled, as the submit form presents them.
There is no Delete: see the non-goals.

Once a request is `APPROVED` or `COMPLETE`, the control is gone and the detail is
read-only.

The edit re-reads the row's current status server-side and refuses unless it is
still `PENDING`, so an approval that has already been written wins and the volunteer
is told the request can no longer be changed. The write itself is an in-place
`updateRow` on the request's own row, so no row position ever shifts and no
concurrent approval can be redirected to another row.

**One narrow window stays open, accepted.** An approval becomes visible only once it
is written, so an edit arriving between the approver's final read and that write
would be approved at its new amount without the approver having seen it. The row is
the correct row, the budget ceiling still applies, and closing the window properly
would mean putting a lock into the approval path, which is out of scope. The
exposure is a volunteer editing in the same moment an approver taps Approve.

**The budget check on an edit must exclude the request being edited.** The existing
check sums every `PENDING`, `APPROVED`, and `COMPLETE` row including the one under
edit, so reusing it unchanged would charge the old amount and the new amount
together and reject edits that are in fact within the limit.

**Edits do not re-notify** the vice president or the treasurer. The weekly digest is
what carries a stale queue forward, and a volunteer fixing a typo should not fire
two more emails.

An edit keeps the request's original `year` and is checked against that year's
budget, so a December request edited in January is still measured against the year it
belongs to. It leaves `submitted_at` untouched and adds no "edited at" column, so an
edit cannot launder a request's age out of the weekly digest.

The edit endpoint takes the session's email alongside the contact ID and requires
both to match the row's own owner, refusing with a 404 otherwise — the same pairing
the create route already enforces. It reuses the `x-mobile-email` header convention
the list route already uses rather than inventing a second one.

### Multiple receipts

The submit form keeps its Take Photo and Choose File buttons but **accumulates**
attachments rather than replacing the single one: each gets a thumbnail with its own
Remove, and at least one is still required. Each file is uploaded to Vercel Blob as
it is today.

**Up to five receipts per request, each uploaded in its own request.** Vercel caps a
function's request body at about 4.5 MB and receipts travel as base64, so several
photos in one call would exceed it.

**Storage, as a builder's call rather than something decided in conversation:** the
existing `receipt_url` column keeps holding the first receipt's URL, exactly as it
does now, and a new appended column holds the complete list. Every current reader of
`receipt_url` — the mobile review screen, the web dashboard, both notification
emails, and the older Apps Script app at
`Reimbursements/SWCPC-Reimbursements/Code.gs` if it still points at this spreadsheet
— keeps working untouched, and surfaces that should show all of them opt in by
reading the new column. The alternative, packing several URLs into `receipt_url`,
would break every one of those readers at once.

Whether the Apps Script app is still live against this spreadsheet is unresolved; it
has its own hardcoded `SHEET_ID` and ContactCRM reads its ID from the environment.
The backward-compatible column choice above makes the answer not matter.

The new column goes after the six payment columns, at `T`. That was checked against
`verifyReimbursementHeaders`, which compares only the positions it knows about and
rejects duplicate header names: a uniquely named column at `T` passes, and stays
inside the `A:Z` range every reader uses. The header cell itself is added to the live
sheet once, by hand; the code must read the column as absent-and-empty rather than
assume it exists, so a deployment that precedes the sheet edit degrades to today's
single-receipt behaviour instead of failing.

### Ownership and risk, accepted explicitly

Volunteer writes trust the caller's claimed email and contact ID, the same way
sign-in does. **This was raised and accepted as a deliberate tradeoff**, consistent
with the existing sign-in: anyone who knows a volunteer's email address can sign in
as that volunteer and could therefore read or edit that volunteer's pending
requests. No new authentication is part of this work. A reviewer should treat this as
settled rather than reopening it.

The one thing the design does narrow: the volunteer-facing projection exposes
`check_number` and `check_date` only. `payment_note` and the payment revision
bookkeeping stay internal to the reviewer projection, since the note is written for
the treasurer's own records.

### The weekly digest

A Vercel cron in ContactCRM, beside the existing `/api/cron/dcr-status-update`,
sends two emails every Sunday at 11:00 am Eastern:

- **To `vicepresident@corridorpark.org` (Scott)** — every request with status
  `PENDING`.
- **To `treasurer@corridorpark.org` (Rebecca)** — every request with status
  `APPROVED`, which is to say approved but not yet paid.

Both CC `communications@corridorpark.org`. Each row carries the volunteer's name,
the amount, the description, and how long it has been waiting, and each email links
to the review dashboard the existing notification emails already link to. The wait
is counted from `submitted_at` for Scott's pending list and from `approved_at` for
Rebecca's approved list, since what each of them is looking at is the time their own
step has been outstanding. The two emails are sent independently: one failing is
logged and does not hold back the other.

**When a list is empty, that email is not sent.** A clear queue produces silence,
not a "nothing to do" message. If both lists are empty, the job sends nothing at all.

**Daylight saving, as a builder's call:** Vercel crons run on UTC and cannot follow
US daylight saving, so the cron is scheduled at both 15:00 and 16:00 UTC on Sundays
and the route checks the Eastern wall clock, doing its work only on the pass where
it is 11:00 am in Boston and returning without sending on the other. This holds
11:00 am year-round instead of drifting by an hour each spring and autumn.

The ContactCRM project is on Vercel's **Hobby** plan, confirmed from the team's own
billing record. That matters twice. Hobby allows a cron to run at most once a day,
which a weekly schedule satisfies, and the per-project cap is 100, so two weekly
entries alongside the existing daily `dcr-status-update` are fine. But a Hobby cron
fires anywhere inside its scheduled hour, so the digest arrives between 11:00 and
11:59 on Sunday rather than at 11:00 exactly. The wall-clock check still works,
because a firing stays inside its own UTC hour and therefore inside one fixed Eastern
hour. Punctuality to the minute would need the Pro plan; that was raised and not
pursued.

## Left to the builder

- Exact names for the new sheet column, the new API routes, and the new app screens
  and components, following each repo's existing conventions.
- Whether editing reuses the submit screen with a mode flag or gets its own screen,
  and how far the receipt picker is factored into a shared component.
- The HTML of the two digest emails, following the structure of the existing
  reimbursement notification emails in
  `ContactCRM/app/api/reimbursements/route.ts` and `ContactCRM/lib/db/reimbursements.ts`.
- How a replaced or removed receipt's blob is handled: left in place or deleted.
  Leaving it is acceptable.
- Test strategy in both repos, following the existing
  `VolunteerHoursApp/tests/*.test.cjs` and `ContactCRM/__tests__/` suites. The
  refusal to edit a non-pending request and the budget-check exclusion are the two
  behaviors most worth pinning with tests.
- The one-time sheet edit that adds the new header cell, and who performs it.
