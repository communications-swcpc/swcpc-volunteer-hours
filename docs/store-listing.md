# Store Listing Content — Volunteer Hours

Final, paste-ready copy and form answers for App Store Connect and Google Play.
The only field not filled in is the **App Review phone number** (⚠️ below).

---

## ⚠️ App Review demo account (READ FIRST — both stores)

Sign-in is email-only and only works for emails in the SWCPC volunteer database, so
reviewers cannot test the app without a working email.

**Demo email (verified valid in backend):** `store.account@gmail.com`

- App Store Connect: *App Review Information → check "Sign-In required"* → User Name =
  the demo email, Password = `n/a` (explained in notes).
- Google Play: *App content → App access* → add the demo email + instructions.

---

## 🍎 App Store Connect

### App Information
- **Name:** `Volunteer Hours`
- **Subtitle:** `Log hours & reimbursements`
- **Primary Category:** Productivity
- **Secondary Category:** Utilities (or blank)
- **Content Rights:** does not contain third-party content
- **Age Rating:** 4+ (answer "None" to all content questions)

### Pricing and Availability
- **Price:** Free
- **Availability:** All countries (or United States only)

### Version 1.0 — Prepare for Submission

**Promotional Text:**
```
The easy way for Southwest Corridor Park Conservancy volunteers to record their time and request reimbursement for approved expenses — right from your phone.
```

**Description:**
```
Volunteer Hours is the official app for Southwest Corridor Park Conservancy (SWCPC) volunteers — a simple way to track your time and expenses in the park, right from your phone.

Sign in with your volunteer email to:

• Log volunteer hours — record the date, the number of hours, and a short description of the work you did.
• Submit reimbursement requests — enter an amount and description, then attach a receipt by snapping a photo or choosing an existing image or PDF.
• Keep an eye on your annual reimbursement budget so you always know what's remaining.

Volunteer coordinators can review, approve, and complete reimbursement requests directly in the app, keeping the whole process organized in one place.

Built for the SWCPC community to make giving your time easier — so you can spend less time on paperwork and more time in the park.
```

**Keywords:**
```
volunteer,hours,reimbursement,nonprofit,timesheet,receipts,corridor park,SWCPC,conservancy
```

- **Support URL:** `https://www.corridorpark.org`
- **Marketing URL (optional):** `https://www.corridorpark.org`
- **Copyright:** `2026 Southwest Corridor Park Conservancy`
- **Version:** `1.0`

**What's New in This Version (if prompted):**
```
Initial release of the SWCPC Volunteer Hours app.
```

### App Review Information
- First Name: `John`
- Last Name: `Biske`
- Phone: ⚠️ **(your phone number — only field not filled)**
- Email: `communications@corridorpark.org`
- Sign-In Required: ✅ checked
- User Name: `store.account@gmail.com`
- Password: `n/a`
- Notes:
```
This app is for Southwest Corridor Park Conservancy volunteers. Sign-in is by email only — there is no password. On the sign-in screen, enter the demo email store.account@gmail.com and tap Sign In (leave/ignore the password field in this form; the app itself does not ask for one). After signing in you can log volunteer hours and submit a reimbursement request with a receipt photo.
```

### Privacy Policy URL
```
https://communications-swcpc.github.io/swcpc-volunteer-hours/privacy.html
```

### App Privacy "nutrition labels" (Data collected, linked to identity, NOT tracking)
- **Contact Info → Email Address** — App Functionality. Linked: Yes. Tracking: No.
- **Contact Info → Name** — App Functionality. Linked: Yes. Tracking: No.
- **Financial Info → Other Financial Info** (reimbursement amounts/descriptions) — App
  Functionality. Linked: Yes. Tracking: No.
- **User Content → Photos or Videos** (receipts) — App Functionality. Linked: Yes. Tracking: No.
- No analytics, no advertising, no tracking.

### Export compliance
Already declared in app.json (`usesNonExemptEncryption=false`) — no prompt expected.

---

## 🤖 Google Play Console

### Store listing — Main
- **App name:** `Volunteer Hours`
- **Category:** Productivity
- **Contact email:** `communications@corridorpark.org`
- **Website:** `https://www.corridorpark.org`
- **Privacy Policy:** `https://communications-swcpc.github.io/swcpc-volunteer-hours/privacy.html`

**Short description:**
```
Log volunteer hours and submit reimbursements for SWCPC volunteers.
```

**Full description:**
```
Volunteer Hours is the official app for Southwest Corridor Park Conservancy (SWCPC) volunteers — a simple way to track your time and expenses in the park, right from your phone.

Sign in with your volunteer email to:

• Log volunteer hours — record the date, the number of hours, and a short description of the work you did.
• Submit reimbursement requests — enter an amount and description, then attach a receipt by snapping a photo or choosing an existing image or PDF file.
• Keep an eye on your annual reimbursement budget so you always know what's remaining.

Volunteer coordinators can review, approve, and complete reimbursement requests directly in the app, keeping the whole process organized in one place.

Built for the SWCPC community to make giving your time easier — so you can spend less time on paperwork and more time in the park.
```

### App access (reviewer sign-in)
```
All functionality requires signing in with a volunteer email. Reviewer instructions: on the sign-in screen, enter store.account@gmail.com and tap Sign In (email-only, no password). You can then log hours and submit a reimbursement with a receipt.
```

### Data safety form
- **Collects user data?** Yes. **Shares with third parties?** No.
- **Email address** — Collected. Purpose: App functionality, Account management. Required.
- **Name** — Collected. Purpose: App functionality.
- **Financial info → Other** (reimbursement amount/description) — Collected. Purpose: App functionality.
- **Photos** (receipts) — Collected. Purpose: App functionality.
- **Encrypted in transit:** Yes. **Users can request deletion:** Yes (via contact email).

### Content rating questionnaire
- Category: Utility/Productivity; no objectionable content → "Everyone."

---

## Screenshots (capture after a build is installable)
- **iPhone:** 6.7"/6.9" display, 3–5 shots: sign-in, log hours, reimbursement form with
  receipt, coordinator review.
- **Android phone:** 2–8 shots, same screens, min 1080px long edge.
- Portrait-only, not tablet-enabled — no iPad/tablet screenshots required.

## Store identity reference
- App Store Connect Apple ID: `6775980297` · SKU: `EX1780429473410`
- Bundle ID / package: `org.swcpc.volunteerhours`
