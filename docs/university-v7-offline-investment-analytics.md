# University v7 — offline workspace and investment analytics

This university-only upgrade focuses on the two requested areas: keeping the local financial workspace usable when the network is unavailable, and making investment performance explainable down to each purchase.

## Included

- Account-scoped offline workspace cache for the primary financial pages.
- Local income/fund/investment/report data remains usable from IndexedDB while offline.
- Market fetches are skipped while the browser is offline; cached snapshots may still be shown as stale data.
- Missing market prices no longer create a fake current value or open profit/loss.
- Each buy is analyzed as a separate investment lot.
- Partial and full sells consume lots using FIFO (oldest open purchase first).
- Realized and unrealized profit/loss are shown separately.
- Optional transaction fee and other cost fields affect true buy cost and net sale proceeds.
- Reports distinguish invested/open cost from current priced portfolio composition.
- Asset-level and purchase-level profit/loss views are available.
- `/income?plan=...` keeps income-plan detail usable from the cached `/income` document offline.

## Data compatibility

No new Supabase migration is required.

No new Dexie store/index is required, so the local schema remains version 8. `feeToman` and `otherCostToman` are optional additive properties on existing investment transaction objects. Older records are interpreted as having zero extra costs.

## Deliberately not included yet

- Manual selection of which purchase lot a sale consumes (FIFO is the current rule).
- Dividend/interest income attribution to investment performance.
- Historical net-worth snapshots and decomposition of growth into deposits vs. market return.
- Server-side offline account changes such as login, password change or session revocation.

These can be added later without changing the core local-first boundary.
