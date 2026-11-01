# Private Markets Portfolio Reporting & Implementation Dashboard

A simulated Private Equity and Private Credit reporting platform for a fictional alternative asset manager (AKS Capital). It consolidates fund-administrator, loan-agent and ledger data into one management dashboard.

**All data is synthetic.** The firm, funds, companies and borrowers are fictional, and the figures are not real performance.

## What it shows
- **Overview:** NAV, paid-in, distributions, net TVPI, DPI, net IRR, cash flows, IRR and TVPI by fund, auto-written commentary
- **Funds:** sortable performance table and per-fund J-curve
- **Private equity:** holdings, MOIC, EV/EBITDA, leverage, sector exposure
- **Private credit:** yield, spread, LTV, leverage, risk ratings, watchlist, maturity ladder
- **Data & controls:** source feeds against SLA, administrator vs platform reconciliations, exceptions, data quality score
- **Implementation:** data flow, metric definitions, rollout plan

## Calculations
- Net IRR: XIRR on dated quarterly contributions and distributions, with closing NAV as the terminal value
- TVPI = (Distributions + NAV) / Paid-in; DPI = Distributions / Paid-in; RVPI = NAV / Paid-in
- Portfolio metrics pool cash flows by date before calculating
- Credit yield = cash coupon + PIK + discount to par over 4 years, fair-value weighted, excluding non-accrual loans

## Structure
- `src/engine.js`: seeded simulation and performance maths (no DOM; runs in Node)
- `src/app.js`: UI, charts and tables (plain JS and SVG, no dependencies)
- `src/head.html`, `src/body.html`: styles and page shell
- `build.py`: bundles everything into `dist/index.html`

## Run
```
python3 build.py
open dist/index.html
```
Test the engine: `node -e "const E=require('./src/engine.js');console.log(E.pooled(E.generate().funds))"`
