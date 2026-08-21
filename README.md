# BDMart Admin Panel (v3 — Steadfast Courier Automation + Silent Printing)

React + Vite + Tailwind admin panel for managing BDMart orders, with
Steadfast courier automation, live tracking, role-based permissions, and
silent sequential label printing (QZ Tray) or browser-dialog printing.

## Setup

```bash
npm install
cp .env.example .env   # then edit values
npm run dev
```

## Admins (3 accounts)

| Username | Password    | Name          | Role            | Can create Steadfast parcels? |
|----------|-------------|---------------|-----------------|-------------------------------|
| admin    | admin123    | Rahim Uddin   | Super Admin     | No |
| karim    | karim123    | Karim Hossain | Admin           | No |
| courier  | courier123  | Sabbir Ahmed  | Courier Manager | **Yes** |

Only the Courier Manager account can create/retry/re-create Steadfast
parcels. Change this in `src/config/admins.js` (`canManageCourier` flag) or
add a 4th admin the same way.

## What's included

### Order confirmation
- **Confirm Order** button on Order Details — saves any pending edits and
  moves the order to `confirmed` in one action.

### Steadfast courier automation
- **Create Steadfast Parcel** (Courier Manager only) — duplicate-parcel
  protection, retry on failure, re-create with confirmation.
- **Live tracking timeline** — polls every 20s, fed by a Steadfast webhook
  on your backend (see `backend-reference/`). "লাইভ" toggle to pause.
- **Bulk actions** on Orders — select via checkboxes, then create parcels
  + print sequentially, or just print.

### Printing — silent (QZ Tray) or browser dialog
- **Settings page** (`/settings`) — label width/height, brand name/logo,
  "Find Printers" (via QZ Tray) to pick your KD-582 (or any installed
  printer), and an **Auto Print** toggle.
- No printer selected → normal browser print dialog, one label at a time,
  works anywhere with zero install.
- Printer selected (QZ Tray running) → fully silent, direct-to-printer.
  With Auto Print ON, the label prints itself the instant a Steadfast
  parcel is created — no click needed at all.
- Every label includes brand, product/qty/price, COD amount, customer
  info, Order ID, Consignment ID, Tracking Code, and a QR code.

### Dashboard analytics
- **Admin performance** — order count + total handled amount per admin.
- **Top products** — every product ranked by times ordered + total sales.

## ⚠️ What you need to do on the backend

Full instructions and copy-paste-ready code are in **`backend-reference/`**:
1. Merge courier fields into `models/Order.js`
2. Add `services/steadfastService.js`
3. Replace `routes/orderRoutes.js`
4. Add `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY` to Render env vars
5. Register the Steadfast webhook URL in their merchant panel

I could not test the real Steadfast API against your account — verify the
response shape with one real test order after deploying.

## QZ Tray (for silent KD-582 printing)

1. Install QZ Tray on the PC with the KD-582 paired: https://qz.io/download/
2. Keep it running (system tray icon)
3. In the admin panel, go to **Settings → প্রিন্টার খুঁজুন**, pick KD-582
   from the list, save
4. First print each session: QZ Tray shows a one-time "Allow this site?"
   prompt — click Allow, everything after is silent for that session
5. Toggle **Auto Print** if you want zero-click printing on parcel creation

## Project structure

```
src/
  api/             axios, orders (incl. Steadfast calls), assignments (localStorage)
  config/          admin roster (with courier permission), label/printer/auto-print settings
  context/         auth context (multi-admin)
  components/      Sidebar, Topbar, StatCard, StatusBadge, AssignedBadge, PrintLabel, ProtectedRoute
  layouts/         AdminLayout (responsive shell)
  pages/           Login, Dashboard, Orders, OrderDetails, Settings
  utils/           printQueue.js (QZ Tray / browser-print router), qzTray.js
backend-reference/ Code + instructions for your Node/Express backend (not part of this build)
```

## v3.1 — Order creation, product catalog, tenants, order source

### Create Order (from the admin panel)
- New **Create Order** page (`/orders/new`, also a quick button in the sidebar
  and on the Orders list) — build an order directly in the panel instead of
  only receiving them from the storefront.
- **Product picker** — search the product catalog, click to add to the
  order; each line's quantity and price are editable per-order (so you can
  give a one-off discount without changing the catalog price).
- **Repeat-customer check** — as soon as an 11-digit phone number is typed,
  it checks past orders for that number and flags "রিপিট কাস্টমার" with a
  count, or "নতুন কাস্টমার".
- Live pricing panel: subtotal, delivery charge, additional discount,
  advance amount, and the resulting COD due — all editable, recalculating
  as you go (mirrors the "Total Pricing Calculation" panel pattern).
- **Tenant** and **Order Source** (Phone Call / WhatsApp / Facebook /
  Website / Walk-in / Other) are set per order and shown everywhere the
  order appears afterward.

### Product catalog (`/products`)
- Add/edit/delete products: name, price, image URL, SKU, tenant, and an
  optional stock count with a low-stock warning.
- Lives in localStorage for now (same pattern as assignments/courier data)
  so it works without a backend change — see `backend-reference/` if you
  want it moved server-side and shared across devices later.

### Tenants (multi-store/brand support)
- Manage the list of stores/pages/brands from **Settings → Tenant / Store
  ব্যবস্থাপনা** — add or remove entries; they show up as the Tenant dropdown
  on Create Order and Products, and as a small label under the district on
  the Orders list and Order Details.

### Order source tracking
- Every order now carries where it came from — shown as a colored badge on
  the Orders list (table + mobile cards) and on Order Details, next to the
  tenant label.

### Office Order Note
- A second, admin-only note field (separate from the customer's own note)
  set at Create Order time and shown on Order Details in an amber callout
  — never printed on labels or shown to the customer.

### Backend note
`backend-reference/Order.model.additions.js` now also includes `tenantId`,
`source`, `officeOrderNote`, `advanceAmount`, `additionalDiscount`, and
`createdBy` — add these to your Mongoose schema too, otherwise MongoDB will
silently drop them on save (Mongoose strict mode ignores fields not in the
schema). Everything else (routes, Steadfast, printing) is unchanged from
before.

## v3.2 — Inventory, returns, comments, fraud checks, dashboard filters, notifications, dark mode, shortcuts

### Inventory / stock
- Stock now decrements when an order is **confirmed** (Order Details →
  Confirm Order), not at creation — a pending order that gets cancelled
  never touches stock. Only works for items added via the Create Order
  product picker (they carry a `productId`); items from elsewhere are
  skipped, not guessed at.
- Products page already had stock + low-stock warning; Create Order now
  also disables out-of-stock products (greyed out, "স্টক নেই") so they
  can't be added to a new order in the first place.

### Return / Refund management
- A **রিটার্ন / রিফান্ড** card appears on Order Details automatically once
  an order is cancelled or its courier status is `returned` /
  `partial_delivered` / `hold` — return reason, refund amount, refund
  status (pending/processing/refunded), saved via the normal order-update
  endpoint.

### Repeat customer + duplicate/fraud detection
- Create Order already flagged repeat customers by phone number; it now
  also flags **same-day duplicates** — if the same phone number already
  has an order placed today, a red warning shows so you can check before
  shipping two parcels for what might be one accidental double-submit.

### Internal comments thread
- Every order now has an **অভ্যন্তরীণ কমেন্ট** thread on Order Details —
  admin-to-admin notes ("কাস্টমার কল ধরছে না") that never reach the
  customer or a printed label, each with the author's name/avatar and
  timestamp.

### Audit log
- New **Audit Log** page (sidebar) — every status change, edit, delete,
  assign/unassign, parcel creation, and comment across every order,
  chronological, with the admin's name and a link back to the order.
  **CSV export** button for offline review.

### Dashboard date-range filter
- **আজ / এই সপ্তাহ / এই মাস / সব সময়** buttons at the top of Dashboard —
  every stat card, the chart, admin performance, and top products all
  respect the selected range.

### In-app notifications
- Bell icon in the top bar, polling every 30s: new orders, an order going
  `cancelled`, or courier status turning `cancelled`/`failed`/`hold` all
  push a notification with an unread badge. Clicking one jumps straight to
  that order.

### Dark mode
- Sun/moon toggle in the top bar, persisted across sessions. Applied as a
  CSS-level override (`.dark` class on `<html>`) covering the core
  surfaces (page background, cards, borders, text) rather than touching
  every component's classes individually — the common recurring patterns
  (`bg-white`, `border-mist-200`, `text-ink-900`, etc.) all get dark
  variants automatically.

### Keyboard shortcuts
- `n` — Create Order · `g` then `d` — Dashboard · `g` then `o` — Orders ·
  `g` then `p` — Products · `?` — toggle the shortcuts cheat-sheet.
  Disabled automatically while typing in any input/textarea/select.

### Multi-courier groundwork
- `src/config/couriers.js` lists Steadfast (active) plus Pathao/RedX as
  placeholders — shown on Order Details as badges so it's visible the
  system is built to add more couriers later without restructuring
  anything; only Steadfast is wired to a real API today.

### New products, inline, from Create Order
- The "Create Order" product picker now has a **নতুন প্রোডাক্ট** button
  that opens an inline mini-form (name, price, image, SKU, stock) —
  save it and it's added to the catalog *and* the current order in one
  step, no need to leave the page and go to `/products` first.

### Backend note
`backend-reference/Order.model.additions.js` now also includes
`returnReason`, `refundAmount`, and `refundStatus`. Same rule as before —
add these to your Mongoose schema or MongoDB will silently drop them.

## v3.3 — Steadfast fraud check (courier-wide phone reliability)

- The moment an 11-digit phone number is entered on **Create Order**, or
  already sits on an existing order's **Order Details** page, a small
  panel auto-fetches that number's delivery track record straight from
  Steadfast's fraud-check database — this covers parcels sent by **any**
  merchant using Steadfast, not just your own store.
- Shows: total parcels, delivered count, cancelled count, and a
  color-coded success percentage (green ≥80%, amber 50–79%, red <50%,
  grey "new number" if it has no history at all).
- New backend proxy route: `GET /api/orders/fraud-check/:phone` (added to
  `backend-reference/orderRoutes.js` and `steadfastService.js`) — keeps
  your Steadfast API key server-side; the frontend never talks to
  Steadfast directly.
- This is separate from, and complements, the same-day duplicate-order
  check already on Create Order: the duplicate check looks at *your own*
  order history, this looks at the customer's *entire delivery history*
  across the courier network.
