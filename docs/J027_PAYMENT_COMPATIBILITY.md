# J027 phone payment fields — released in 1.0.6

Phone sign-in remains email-in-ContactCRM, unchanged. Original x-mobile-email transport and exact reviewer role allowlists remain. This is a claimed identity: knowing a privileged email can impersonate its financial permissions. Audit actor is recorded claimed email, not proven ownership. No new auth extension, browser payment fallback, dependency, callback, credential or infrastructure.

Native review now includes PENDING/APPROVED/COMPLETE, separate SAVE and confirmed COMPLETE, correction, reason-required payment reissue preserving approval, and readonly history. Scott cannot edit payment; Rebecca/John can. Mobile/API completion preserves confirmation-only address behavior; web found-contact blocker is separate. Optional fields are not approval prerequisites.

Unknown mutations retain only request/command IDs in account-scoped AsyncStorage; never check values/date/note/reason or financial drafts. On restart, pending commands block new writes until original receipt reconciliation. Absence alone does not prove no in-flight write; UNKNOWN stays blocked. No automatic mutation retries. Account switch clears financial UI and keeps old account recovery separately. Uncertain saved details can be recovered from server; unsaved drafts are memoPackage org.swcpc.volunteerhours, SDK 54 and EAS project 080139ed-e339-4675-a999-79f5fafada86 are unchanged. Payment history is ordinary JSON in the existing Sheet, visible to existing Sheet readers (approved by John). In the app, only Rebecca, Scott and John can view it. It is kept five years, with no automatic purge.

ccurred.

Old bodyless completion clients receive UPDATE_REQUIRED and an explicit app-update message, without starting a writer. Existing approval and email sign-in stay compatible. New completion requires command ID/revision even if check/date/notes are all blank. Coordinate staff payment use during the backend/new-phone rollout; no automatic fallback to an unaudited legacy completion.

## Release record — October 2026

- **1.0.6 store builds:** iOS build 16 was submitted 2026-10-08 and released on the App Store 2026-10-09. Android version code 18 went to the Play internal track, was promoted to production 2026-10-08 and approved. Both used existing EAS credentials (free plan, no signing changes).
- **Over-the-air update `89dccc12` (2026-10-11, runtime 1.0.6, `production` branch):** "Payment details" became a real button (it was unstyled text that read as a label), and the payment fields got the app's standard input style. Verified on John's iPhone. Over-the-air updates never appear in the App Store; phones apply them on the next relaunch after download.
- **Over-the-air updates:** John wants them used for JavaScript-only fixes: `npx eas-cli update --branch production --environment production --message "…"`. The `production` channel serves the `production` branch, and the runtime follows the app version. The GitHub "EAS Update" workflow publishes to an unused `main` branch and fails on Node 20; don't rely on it.
- **Pushing:** `origin` embeds a GitHub token that must be revoked. Push to `git@github.com:communications-swcpc/swcpc-volunteer-hours.git` with `GIT_SSH_COMMAND="ssh -i ~/.ssh/github_charity_ed25519 -o IdentitiesOnly=yes"`.
- **Tests:** compile `shared/reimbursement-payment.ts` and `services/reimbursement-payments.ts` to CommonJS. Then run `node --test tests/*.cjs` with `PAYMENT_CONTRACT_PATH` and `PAYMENT_CLIENT_PATH` pointing at the compiled files (23 tests).
- **Not yet done:** no live payment has been saved or completed. The full cycle on a $1.00 "QA TEST – J027 – do not pay" request is still outstanding.
