# Lead capture + auto-reply (Google Sheets + Apps Script)

This turns the website's **contact form** and **booking modal** into a real backend — with **no server to host**:

- Every submission is appended to a **Google Sheet** (`Leads` and `Bookings` tabs, created automatically).
- The customer gets an **automatic branded email** — a booking confirmation (with their reference number) or a "we got your message" acknowledgement.
- You get an **internal notification email** for every new lead/booking.

Everything runs on your own Google account for free.

---

## 1. Create the Google Sheet

1. Go to <https://sheets.new> and create a blank spreadsheet (e.g. **"Apex Pest — Leads"**).
2. Keep it open — the tabs are created for you on the first submission.

## 2. Add the script

1. In the sheet: **Extensions → Apps Script**.
2. Delete the placeholder `function myFunction() {}`.
3. Open [`Code.gs`](./Code.gs) from this folder, copy **all** of it, and paste it in.
4. In the `CONFIG` block at the top, set at least:
   - `NOTIFY_EMAIL` — where new-lead alerts go (your inbox).
   - `BUSINESS_EMAIL`, `BUSINESS_PHONE`, `BUSINESS_PHONE_TEL`, `WEBSITE_URL` — used in the emails.
   - Leave `SPREADSHEET_ID: ""` (the script is bound to this sheet, so it uses the active one).
5. Click **Save** (💾).

## 3. Authorize + smoke-test

1. In the editor's function dropdown pick **`runSelfTest`** and click **Run**.
2. Approve the permission prompt (Google will warn it's an unverified app — choose **Advanced → Go to … (unsafe)**; it's your own script). It needs access to your Sheets and to send email as you.
3. Check: the sheet now has **`Bookings`** and **`Leads`** tabs with a test row, and `NOTIFY_EMAIL` received the test emails.

## 4. Deploy as a Web App

1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. Set:
   - **Description:** `Apex lead endpoint`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**  ← required so the website (an anonymous visitor) can submit.
4. **Deploy**, then **copy the Web app URL** — it ends in `/exec`, e.g.
   `https://script.google.com/macros/s/AKfycb…/exec`
5. (Optional) open that URL in a browser — it should return `{"result":"ok",...}`.

## 5. Connect the website

In [`../script.js`](../script.js), set the endpoint in the `CONFIG.forms` block:

```js
forms: {
  endpoint: "https://script.google.com/macros/s/AKfycb…/exec", // paste your /exec URL
  transport: "apps-script",
  accessKey: null
}
```

Commit and push — GitHub Pages redeploys automatically. Submit the contact form and complete a booking on the live site: rows appear in the sheet and the confirmation emails arrive. ✅

---

## How the pieces fit

| Site action | `formType` | Sheet tab | Customer email |
| --- | --- | --- | --- |
| Booking modal → confirm | `booking` | `Bookings` | "Your inspection is booked" + reference |
| Contact form → send | `contact` | `Leads` | "Thanks for reaching out" |

The site POSTs JSON as `text/plain` on purpose: it's a CORS "simple" request, so the browser skips the preflight that Apps Script can't answer. `Code.gs` reads it via `e.postData.contents`.

## Optional: shared secret

To stop others from POSTing to your endpoint:

1. In `Code.gs` set `SHARED_SECRET: "some-long-random-string"`.
2. In `script.js` set `forms.accessKey` to the **same** string.
3. Redeploy the web app (**Deploy → Manage deployments → edit → Version: New version**) and push the site.

## Updating the script later

After editing `Code.gs`, redeploy the **same** URL: **Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy**. Creating a *new* deployment gives a new URL (which you'd then have to update in `script.js`).

## Notes & limits

- Email quota: ~100 recipients/day on consumer Gmail, ~1,500 on Google Workspace — plenty for a local service site.
- Emails send from your Google account address with `Reply-To: BUSINESS_EMAIL`. For custom-domain "from" addresses, add the address as a Gmail *Send mail as* alias and set it as `replyTo`/`from`.
- Prefer not to use email? Point `CONFIG.forms.endpoint` at any JSON API instead and set `transport: "json"` — the site payloads (`formType`, `name`, `phone`, `email`, `service`, `date`, `time`, `address`, `message`, `reference`) stay the same.
