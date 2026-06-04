# Store Listing Content — Volunteer Hours

Draft copy and form answers for App Store Connect and Google Play. Review/adjust the
**🔶 decisions** before pasting. Character limits noted in parentheses.

---

## ⚠️ App Review demo account (READ FIRST — both stores)

Sign-in is email-only and only works for emails already in the SWCPC volunteer database.
**Apple and Google reviewers cannot test the app without a working email.** You must:

- Provide a **valid demo email** (one that exists in your backend) in the review notes.
- App Store Connect: *App Review Information → Sign-In required → Username/Password*. Put
  the demo email in the username field (password can be a placeholder note since there's no
  password — explain in Notes).
- Google Play: add the demo email + instructions under *App content → App access*.

Without this, expect rejection for "couldn't sign in." Suggested demo email: **🔶 (pick a
real, low-risk volunteer email you control, e.g. communications@corridorpark.org)**.

Review notes text (paste into both):
> This app is for Southwest Corridor Park Conservancy volunteers. Sign in is by email only
> (no password) — the email must exist in our volunteer records. Use the demo email provided.
> After sign-in you can log volunteer hours and submit a reimbursement with a receipt photo.

---

## Shared

- **App name:** Volunteer Hours
- **Bundle ID / package:** org.swcpc.volunteerhours
- **Category:** 🔶 Productivity (primary). Alt: Business.
- **Support URL:** https://www.corridorpark.org  🔶 confirm
- **Support email:** communications@corridorpark.org
- **Privacy policy URL:** https://communications-swcpc.github.io/swcpc-volunteer-hours/privacy.html
  *(goes live once the branch is merged to `main` and pushed)*
- **Marketing URL (optional):** https://www.corridorpark.org

---

## Apple App Store

- **Subtitle (30):** Log hours & reimbursements
- **Promotional text (170):** The easy way for Southwest Corridor Park Conservancy volunteers to record their time and request reimbursement for approved expenses — right from your phone.
- **Keywords (100, comma-separated):** volunteer,hours,reimbursement,nonprofit,SWCPC,corridor park,timesheet,receipts
- **Description:**

```
Volunteer Hours is the official app for Southwest Corridor Park Conservancy (SWCPC) volunteers.

Sign in with your volunteer email to:

• Log your volunteer hours — enter the date, hours, and a short description of your work.
• Submit reimbursement requests — record an amount and description and attach a receipt by
  taking a photo or choosing an image or PDF.
• Track your annual reimbursement budget at a glance.

Coordinators can review and approve reimbursement requests from within the app.

Built for SWCPC volunteers to make tracking time and expenses simple.
```

- **Age rating:** 4+ (no objectionable content)
- **Export compliance:** No (uses only standard HTTPS encryption) → set
  `ITSAppUsesNonExemptEncryption = NO` (we can add to app.json to skip the prompt)

### App Privacy "nutrition labels" (Data collected, linked to identity, NOT used for tracking)
- **Contact Info → Email Address** — App Functionality. Linked: Yes. Tracking: No.
- **Contact Info → Name** — App Functionality. Linked: Yes. Tracking: No.
- **Financial Info → Other Financial Info** (reimbursement amounts/descriptions) — App
  Functionality. Linked: Yes. Tracking: No.
- **User Content → Photos or Videos** (receipt images/PDFs) — App Functionality. Linked: Yes.
  Tracking: No.
- No analytics, no advertising, no data used to track across apps/sites.

---

## Google Play

- **App name (30):** Volunteer Hours
- **Short description (80):** Log volunteer hours and submit reimbursements for SWCPC volunteers.
- **Full description (4000):**

```
Volunteer Hours is the official app for Southwest Corridor Park Conservancy (SWCPC) volunteers.

Sign in with your volunteer email to:

• Log your volunteer hours — enter the date, hours, and a short description of your work.
• Submit reimbursement requests — record an amount and description and attach a receipt by
  taking a photo or choosing an image or PDF file.
• Track your annual reimbursement budget at a glance.

Coordinators can review and approve reimbursement requests from within the app.

Built for SWCPC volunteers to make tracking time and expenses simple.
```

### Data safety form
- **Does your app collect or share user data?** Yes (collects; does not share with third parties).
- **Personal info → Email address** — Collected. Purpose: App functionality, Account management.
  Shared: No. Required: Yes.
- **Personal info → Name** — Collected. Purpose: App functionality. Shared: No.
- **Financial info → Other** (reimbursement amount/description) — Collected. Purpose: App
  functionality. Shared: No.
- **Photos and videos → Photos** (receipts) — Collected. Purpose: App functionality. Shared: No.
- **Data encrypted in transit:** Yes (HTTPS).
- **Users can request data deletion:** Yes — via contact email (provide the privacy policy /
  contact email as the deletion request channel).

### Content rating questionnaire
- Category: Utility/Productivity. No violence, sexual content, profanity, gambling, etc. →
  results in "Everyone."

### App access
- Provide the demo email + instructions (see top section) so review can sign in.

---

## Screenshots (capture after a build is installable)

- **iPhone:** 6.7"/6.9" display (e.g., iPhone 15/16 Pro Max simulator), 3–5 shots:
  sign-in, log hours, reimbursement form with receipt, (coordinator) review screen.
- **Android phone:** 2–8 shots, same screens. Min 1080px on the long edge.
- The app is portrait-only and not tablet-enabled, so no iPad/tablet screenshots required.
