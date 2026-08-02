# Manual Test Checklist

**Task:** P0-02  
**Created:** 2026-08-02  
**Effort:** ~15 minutes per run  
**Purpose:** Human-runnable regression check. Run before any PR merge. Any deviation from described behaviour is a regression unless the task explicitly says it changes that behaviour.

## Screenshots (baseline reference)

All screenshots captured on 2026-08-02, CoinGecko unreachable (mock fallback), no wallet connected.

| Page | File | State |
|------|------|-------|
| Home | `docs/screenshots/home_no_wallet.png` | Mock coin list + wallet connect prompt |
| Watchlist | `docs/screenshots/watchlist_no_wallet.png` | Empty state: "No coins tracked yet" |
| Transfer | `docs/screenshots/transfer_no_wallet.png` | Full form visible, wallet not gated |
| Allowance | `docs/screenshots/allowance_no_wallet.png` | Form visible |
| Admin | `docs/screenshots/admin_no_wallet.png` | "Access Denied" (no wallet) |
| Coin Detail | `docs/screenshots/coin_detail_bitcoin.png` | Bitcoin detail |
| 404 | `docs/screenshots/page_not_found.png` | Plain "Page not found" text |

---


---

## Prerequisites

1. Node.js installed, `npm run install:all` completed at least once.
2. Two terminal windows open, both at repo root.
3. A browser with MetaMask installed (Chrome or Brave recommended).
4. No prior knowledge of the codebase is required.

---

## Setup

### Terminal A — Start the backend

```bash
npm run dev:server
# or: npm start --prefix server
```

Expected: `Server running on port 3000` (or the PORT from server/.env).  
Note: The server will log Mongo connection errors if MONGO_URI is unset — this is expected. The server runs on JSON fallback data.

### Terminal B — Start the frontend

```bash
npm run dev:client
# or: npm run dev --prefix vite-project
```

Expected: Vite starts and prints a `localhost:5173` URL.

Open the printed URL in the browser.

---

## Section 1 — App Loading

### 1.1 Initial load (no wallet)
- [ ] Page shows a loading spinner (`Loading component...`) briefly before content appears
- [ ] No console errors from missing `VITE_CONTRACT_ADDRESS` (only a warning is acceptable)
- [ ] Navbar is visible at the top after load

---

## Section 2 — Home Page (`/`)

Navigate to `http://localhost:5173/`.

### 2.1 Market data present (CoinGecko reachable)
- [ ] A list of coins is displayed with names, prices, and percentage changes
- [ ] Clicking a coin navigates to `/coin/<id>`
- [ ] Loading skeleton visible briefly on first load

### 2.2 Market data absent (CoinGecko unreachable / no API key)
- [ ] App falls back to mock coin data — coins still displayed
- [ ] No blank page or unhandled crash
- [ ] Console shows a warning, not an unhandled exception

### 2.3 Search / filter (if present on Home)
- [ ] Typing in the search box filters the coin list
- [ ] Clearing the box restores the full list

---

## Section 3 — Coin Detail Page (`/coin/:id`)

Click any coin from the Home page.

### 3.1 Valid coin
- [ ] Page loads with coin name, icon, price stats (Current Price, Market Cap, 24H Change)
- [ ] Historical price chart renders (30-day default)
- [ ] "Add to Watchlist" button is visible
- [ ] Back navigation works (browser back button)

### 3.2 Unknown coin (navigate manually)
Navigate to `http://localhost:5173/coin/definitely-not-a-coin`.
- [ ] Page shows an error or empty state — no unhandled crash
- [ ] Navbar remains visible

---

## Section 4 — Watchlist (`/watchlist`)

Navigate to `http://localhost:5173/watchlist`.

### 4.1 No wallet connected
- [ ] Page renders with empty watchlist state: "No coins tracked yet — Search above to add your first asset"
- [ ] Search box ("Type token name or symbol") is visible and functional
- [ ] **Note:** Watchlist is accessible without wallet connect — search/add may work locally via localStorage

### 4.2 Wallet connected
*(Skip if MetaMask is unavailable — mark as N/A)*
- [ ] Click connect wallet in Navbar
- [ ] MetaMask pops up requesting connection — approve
- [ ] After approval, wallet address is shown in Navbar (abbreviated)
- [ ] Watchlist page loads the saved coins for this address
- [ ] Adding a coin: select from dropdown/search and save — coin appears in list
- [ ] Removing a coin: click remove — coin disappears from list
- [ ] Refreshing page preserves the watchlist

---

## Section 5 — Token Transfer (`/transfer`)

Navigate to `http://localhost:5173/transfer`.

### 5.1 No wallet connected
- [ ] Page renders with full transfer form visible (Recipient Address, Amount, Memo fields)
- [ ] "Single Address" and "Batch List" tabs are shown
- [ ] Estimated Network Fee shows ~45,000 Gwei (approx. $0.12)
- [ ] **Note:** Form is accessible without wallet (no wallet-gating on the form itself — submitting will fail with a MetaMask prompt or error)

### 5.2 No contract address configured
- [ ] Console shows a warning about `VITE_CONTRACT_ADDRESS`
- [ ] Transfer form may be disabled or show an error — no crash

### 5.3 Wallet connected + contract configured
*(Requires VITE_CONTRACT_ADDRESS and Sepolia testnet)*
- [ ] Form fields for recipient address and amount are present
- [ ] Submitting with blank fields shows validation errors
- [ ] Submitting a valid transfer opens MetaMask for signature

---

## Section 6 — Allowance Manager (`/allowance`)

Navigate to `http://localhost:5173/allowance`.

### 6.1 No wallet connected
- [ ] Page shows "Token Allowance — Check or approve spend permissions..."
- [ ] "Check Allowance" and "Approve Spender" tabs are visible
- [ ] "Spender Wallet Address" field (0x...) and "Check Allowance" button are shown
- [ ] **Note:** Form is accessible without wallet (no wallet-gating on the UI)

### 6.2 Wallet connected
*(Skip if MetaMask unavailable)*
- [ ] Check allowance: enter a spender address — returns a number or "0"
- [ ] Approve: enters MetaMask flow — no crash

---

## Section 7 — Admin Panel (`/admin`)

Navigate to `http://localhost:5173/admin`.

### 7.1 No wallet connected
- [ ] Page shows "Access Denied — Only the contract owner can access this administration panel"
- [ ] No form or admin controls are visible
- [ ] Navbar visible (Connect Wallet button shown)

### 7.2 Wallet connected but not contract owner
- [ ] "Access Denied" message remains

### 7.3 Wallet connected and is owner
*(Requires deployer wallet)*
- [ ] Fee percentage is displayed
- [ ] Setting a new fee opens MetaMask — no crash

---

## Section 8 — Navbar

### 8.1 Navigation links
- [ ] All nav links (`Home`, `Watchlist`, `Transfer`, `Allowance`, `Admin`) navigate without full page reload
- [ ] Active link is visually highlighted

### 8.2 Wallet connect / disconnect cycle
- [ ] Connect: MetaMask pops up, approval shows address in Navbar
- [ ] Disconnect: address removed from Navbar, wallet-gated features revert to "not connected" state
- [ ] Page does not crash during either transition

---

## Section 9 — Error States

### 9.1 Backend not running
1. Stop Terminal A.
2. Reload the page.
- [ ] Frontend still loads (market data from CoinGecko directly)
- [ ] Watchlist shows local/empty state — no unhandled error UI
- [ ] No browser error overlay

### 9.2 404 route
Navigate to `http://localhost:5173/this-does-not-exist`.
- [ ] "Page not found" text is shown (currently plain text — baseline state, see screenshot `page_not_found.png`)
- [ ] Navbar is visible (Connect Wallet button remains)
- [ ] No crash
- **Note (P4 candidate):** The 404 route renders unstyled plain text. This is the current baseline — not a regression to fix in this phase.

---

## Section 10 — API Smoke (backend health)

With the server running, open a new terminal tab:

```bash
# Windows PowerShell
Invoke-WebRequest http://localhost:3000/health | Select-Object StatusCode, Content
```

- [ ] Status 200 (db connected) or 503 (fallback mode — expected without Mongo) — never crashes
- [ ] Response body is JSON with `success`, `status`, `db` fields

---

## Pass / Fail Record

| Section | Result | Notes |
|---------|--------|-------|
| 1. App Loading | | |
| 2. Home | | |
| 3. Coin Detail | | |
| 4. Watchlist | | |
| 5. Token Transfer | | |
| 6. Allowance | | |
| 7. Admin | | |
| 8. Navbar | | |
| 9. Error States | | |
| 10. API Smoke | | |

**Tester:** _______________  
**Date:** _______________  
**Pass / Fail:** _______________

---

## Notes for Testers

- Items marked *(Skip if …)* are optional — note them as N/A.
- Any deviation from the described behaviour that is **not** explained by the skipped prerequisites is a regression. Open an issue.
- Do not test with a wallet holding real ETH. Use Sepolia testnet only.
