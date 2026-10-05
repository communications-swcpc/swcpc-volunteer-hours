# J027 — Apple App Store and Google Play preparation

Status: preparation only, 5 October 2026. Payment-field implementation is incomplete.
Do not run production builds, change credentials/signing/security permissions, purchase
build capacity, submit to either store, publish OTA, or deploy web production from this checklist.

## Existing infrastructure verified

| Item | Identity |
| --- | --- |
| Repository | communications-swcpc/swcpc-volunteer-hours |
| Feature branch | feature/j027-reimbursement-payment-fields |
| EAS account / team | bostonjo / bostonjos-organization (Owner; read-only CLI verification) |
| EAS project | @bostonjos-organization/swcpc-volunteer-hours |
| EAS ID | 080139ed-e339-4675-a999-79f5fafada86 |
| iOS bundle / Android package | org.swcpc.volunteerhours |
| Configured App Store Connect app ID | 6775980297 |
| Local app version | 1.0.5; package.json version is separately 1.0.0 |
| Runtime / production channel | appVersion / production |
| Native workflow | Expo SDK 54 managed/CNG; no ios/android folders |
| Build numbering | EAS remote appVersionSource, production autoIncrement |
| Existing submit config | Apple API-key path and Play service-account path already configured; key contents not read |

This verifies EAS identity and local config, not active store ownership, installed binary
version/runtime, latest published version/build number, or current store eligibility.
Preserve existing signing and credentials. Do not follow old runbook instructions to
create new keys, change permissions or register identities without specific approval.

## Gates before builds

- Obtain exact approved plan text; confirm written/issued date and audit/reset/concurrency decisions.
- Finish shared backend+web/native functionality and verified native sign-in. Forged x-mobile-email must no longer grant privileged list, internal-note, approval, completion, correction or history access after cutover. Existing email lookup must never mint privileged credentials.
- Confirm old-client update/sign-in behavior and coordinated backend/app rollout; preserve volunteer submission/caps. No interval in rollout may leave a header-only privileged mutation path enabled.
- Authorize staging schema migration separately after backup/header verification; test rollback without erasing issued-check audit evidence.
- Run web unit/integration/build/type/lint checks and mobile typecheck/contract/interaction checks. Resolve or explicitly track existing unrelated lint failures.
- On authorized staging/fixtures, verify iOS+Android+web save APPROVED without completing, optional complete, COMPLETE correction/history, reset archive/clear, shared reloads and role boundaries. Check 00123, leap/impossible dates/timezones, multiline/formula/HTML notes, blank legacy data, address safeguards, cancellation/draft switching, sign-out, token expiry, stale updates, duplicate commands, network timeout reconciliation and audit failures. No live test emails or production financial edits.
- Obtain final architect and senior developer review; verify diff contains no unrelated files or website changes.

## Versions and build selection (proposed, not applied)

- Inspect live store versions and EAS remote build numbers read-only under the verified account before choosing the next version. Local 1.0.5 alone is insufficient.
- Tentative marketing version 1.0.6 only if that is greater than current published versions and the final scope permits it. Do not mutate app.json or remote build numbers until the release candidate is approved.
- Keep both existing bundle/package IDs and EAS project ID. Let the existing production autoIncrement manage iOS build number/Android versionCode only when an approved build is actually started.
- With appVersion runtime policy, changed marketing version yields a different update runtime. Any new native identity dependency/configuration requires new binaries; do not assume JS-only OTA eligibility from the local version.
- John requested store distribution. Build capacity/cost must be specifically approved before cloud build requests; no paid build has been requested here.
- The existing `build:ios:store` and `build:android:store` scripts target the production EAS profile. Inspect resolved config and signing identities first; build only after authorization. Record exact commit, EAS build ID, platform, app version, build number/versionCode, team and artifact checksum.
- Verify/install each candidate artifact on approved test devices. TestFlight/internal Play uploads are external distribution and need their own approval; do not treat them as local QA.

## Store and web publishing gates

- Confirm active Apple developer/team and App Store Connect app 6775980297 ownership, agreements, current published build and access using existing infrastructure. Do not change signing or credentials.
- Confirm active Google Play developer/app ownership for org.swcpc.volunteerhours, existing signing lineage, track and current versionCode; determine whether first-upload restrictions still apply from actual console state.
- Prepare release notes after final UI/auth behavior is known, reviewer test instructions with synthetic accounts/data, support/privacy links and required iOS/Android screenshots. Review privacy/data-safety answers for verified sign-in and internal notes; do not change answers blindly.
- Use a verified explicit build ID/artifact when later submitting. Do not blindly use `--latest`, because it may select a different artifact or commit. Existing Android submit profile targets production.
- Obtain John’s separate approval for each store submission/publication, OTA publication if selected, and web production deployment. No store/web production claim until the resulting release is verified live.
- Document rollout order, old-app sign-in/update message, monitoring and rollback. Rollback must keep auth protection and audit history; never restore the forged-email privilege path or erase payment evidence for compatibility.

Local documentation `docs/app-store-release.md` remains the general infrastructure runbook.
For this change, verified reimbursement identity/privacy is a release prerequisite, including
both newly added fields and existing privileged operations. Its older “track separately”
wording must not be used to waive this gate.

Current evidence: mobile typecheck and 12 synthetic contract tests pass; portable contract
matches backend byte-for-byte. Real-device QA/build/store checks are pending; no version,
build number, signing, credentials, store state, OTA or production backend was changed.

Local contract test command: `npx tsc shared/reimbursement-payment.ts --outDir /tmp/j027-mobile-tests --module commonjs --target es2020 --skipLibCheck`, then `PAYMENT_CONTRACT_PATH=/tmp/j027-mobile-tests/reimbursement-payment.js node --test tests/reimbursement-payment.test.cjs`. Backend/mobile copies must remain identical; compare with backend `lib/reimbursements/payment-schema.ts` before either changes.
