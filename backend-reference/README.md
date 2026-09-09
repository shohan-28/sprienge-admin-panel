# Backend changes needed for Steadfast automation

These files are reference code for your existing Node/Express + MongoDB
backend (deployed on Render) — not part of the React admin panel build.

## 1. Files to add/replace

| File here | Goes to | Action |
|---|---|---|
| `Order.model.additions.js` | `models/Order.js` | Merge new fields into your existing schema |
| `steadfastService.js` | `services/steadfastService.js` (new) | Add as-is |
| `orderRoutes.js` | `routes/orderRoutes.js` | Replace your current file |

## 2. `.env` additions on Render

```
STEADFAST_API_KEY=your_api_key_here
STEADFAST_SECRET_KEY=your_secret_key_here
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
```

Get these from Steadfast merchant panel → Settings → API, then redeploy.

## 3. Register the webhook

Steadfast merchant panel → Settings → Webhook:
```
https://sprienge-backend.onrender.com/api/orders/steadfast/webhook
```
This powers the live tracking timeline on Order Details — the admin panel
polls every 20s and shows whatever the webhook last saved.

## 4. What I couldn't verify

I don't have your Steadfast account, so I couldn't test the real
request/response shape end-to-end. Send one test order through and check
the response matches what `steadfastService.js` expects — if a field name
differs, only that file needs a tweak.

## 5. Silent auto-printing (KD-582 / QZ Tray)

The frontend now supports two print paths automatically:
- No printer selected in Settings → normal browser print dialog (works
  anywhere, no install).
- A printer selected in Settings (via "প্রিন্টার খুঁজুন", which calls QZ
  Tray) → fully silent, direct to that printer. Toggle "Auto Print" in
  Settings to have the label print itself the instant a Steadfast parcel
  is created, with zero clicks.

Requires QZ Tray (free, https://qz.io) installed and running on the PC
that has the KD-582 paired. First print each browser session shows a
one-time "Allow this site to print?" prompt from QZ Tray unless you set up
its certificate signing (optional, see qz.io docs) — after clicking Allow
once, everything after that in the session is silent.
