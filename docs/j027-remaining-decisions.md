# J027 exact remaining work and decisions — 5 October 2026

Google Sheets remains the database. No new service, architecture change or credential/access change is proposed or performed. Local web integration is now mounted in source and tested; deployment/activation remains disabled. Parent has not yet relayed the additional phone change.

## Verified phone identity: missing implementation and bounded permission

Current phone SessionContext is an AsyncStorage contact/email profile from `/api/validate-email`; it proves no email ownership. The backend's existing verified identity is the Google/Auth.js web session. It currently has no native exchange, device session, approved native secure credential storage or verified requester identity. Bearer-client/editor groundwork cannot become authenticated by replacing an email header with a guessed token. Web cookies/provider Gmail tokens must not be exported to the phone.

Completed locally: privileged reviewer list/approval/completion now require the existing verified active web session; forged email headers fail closed. The phone gives a clear secure web-dashboard link on401/403 using existing React Native Linking. This provides a verified browser path on the phone and is expressly an interim cutover; native structured fields/completed-history remain incomplete. Private contact reimbursement history and budget GETs now require verified reviewer identity, so ordinary unverified requester IDs do not confer ownership. Existing phone submission/cap enforcement is preserved; its existing claimed-email submission identity is not upgraded by these changes.

Technical work still required: select the supported existing-identity native sign-in flow, bind a native return/exchange to its originating device challenge, validate identity/active profile server-side, define short-lived credential expiry/revocation and secure native storage, provide verified contact ownership for requester history, integrate the existing native client/editor/COMPLETE list, and run expiry/signout/account-switch/forged-header/old-client/iOS/Android QA. No exchange endpoint or credential has been created.

Smallest owner scope decision: authorize the exact native credential exchange/security configuration and secure-storage dependency, or expressly defer native entry and accept the browser-only interim. Browser-only is not assumed to satisfy the approved native feature. No authorization to create OAuth clients, redirect registrations, credentials or dependencies exists. This is an identity-integration decision in the existing applications, not a database/infrastructure choice.

## Audit key recovery and Sheet privacy: genuine decisions

Read-only current sharing evidence: communications@ owner, board@corridorpark.org group writer, existing Conservancy service-account writer. No sharing changed. Local audit prototype encrypts event/command snapshots with a key domain-separated from the existing AUTH_SECRET; only server actions for Rebecca/Scott/John decrypt. Event/command/request IDs remain plaintext. Active N:S payment fields remain plaintext to direct Sheet readers.

The five-year policy is already settled. Remaining technical work is key-version/retained-key decoding and a restore/rotation test if existing AUTH_SECRET may rotate. No current backup/retention mechanism for old AUTH_SECRET values has been verified. Losing/rotating it without retained keys makes audit and command receipts unreadable. Encryption also cannot prevent board writers from deleting audit rows; application append-only behavior does not establish tamper-proof retention against direct editors.

Smallest owner decisions: identify/approve recoverable retention of the existing encryption secret for five years after each encrypted event (including rotation and restore), and explicitly confirm the direct Sheet access boundary. If current notes/audit deletion must be restricted against board writers, authorize the exact existing-Sheet access/protected-range changes. Those changes have not been made. Keeping current sharing while demanding exclusive current-note access or undeletable audit evidence is a precise conflict; no UI/backend filter can resolve it. A new database/service is neither requested nor permitted.

Payment factory defaults disabled unless REIMBURSEMENT_PAYMENT_ENABLED=true. No such configuration was set. Disabled operations fail before codec/transport construction or I/O. Do not enable until these decisions and schema validation are complete.

## Schema rollout: authorized code complete, production mutation withheld

Required changes in the existing Sheet: retain all A:M original headers/data; append N:S check_number, check_date, payment_note, payment_updated_by, payment_updated_at, payment_revision; ensure literal TEXT handling, including existing leading-zero checks; add db_ReimbursementPaymentAudit with A:D event_id,command_id,request_id,payload. Legacy blank revisions read as0. No bulk normalization/rewriting financial rows is necessary. Audit uses existing service-account access and targeted Sheets batch updates.

Technical work before execution: capture an authorized reversible backup with its exact restore reference; header/order/grid/audit-tab preflight; prepare a dry-run request against that exact Sheet ID; verify with synthetic staging rows; retain all original rows and approval evidence; test restore without erasing newly issued payment history. No migration or backup of financial rows has been performed here. Header-only inventory is reported in the checkpoint.

Actual permission required: specific authorization to modify the existing production Sheet schema, choose its maintenance/cutover window and backup/restore location, then separately enable/release the reviewed code. Current instructions expressly prohibit live schema/data mutation and deployment. This is not a missing architecture choice.

## Exposed repository token remediation

An embedded repository credential was accidentally exposed earlier. Parent was notified for containment and owner revocation. It has not been reread, repeated, used, transmitted to another tool or tested. No network Git/auth change was attempted. Revocation/rotation and removal from affected transcripts/local remote configuration are NOT confirmed complete; no completion claim is made. Owner confirmation is required; altering credentials/access is outside this task's current authorization. This remains separate from reimbursement identity work.

## Verification and review

169 backend mock tests, TypeScript, targeted lint and web build pass. Current mobile TypeScript and23 portable/client tests pass after rerun. Actual dashboard/controller browser fixture (mocked actions, external network blocked) passes save vscompletion, literal text, leading zeros, captured revisions, completed reissue, uncertain closure, browser reload original-command recovery/reconciliation and Scott audit-only UI. Native/browser-shim prior fixtures are not real-device QA.

Architect and senior final reviews accept the local integration after private-history guards and default-disabled activation. No remaining blocking code defect was found in their reviewed scope. Their acceptance does not authorize release or satisfy native/key/privacy decisions.
