# Cryptoken

Cryptoken is a dashboard prototype for AI-agent token treasury operations. The first source layout focuses on the frontend experience and the purchase workflow that later connects to local API, payment, and approval services.

## Current Scope

- Dashboard views for model usage, wallet status, risk state, and transaction activity.
- Static model market data for evaluating the operating flow.
- Early purchase workflow notes in `docs/purchase-workflow.md`.
- Frontend implementation based on Next.js, React, and Recharts.

## Local Development

```powershell
npm install
npm run dev
```

Open the local frontend:

```text
http://127.0.0.1:3000/
```

## Planned Backend Work

- Local session and role service.
- Persistent purchase cart state.
- x402-style payment request and transfer verification endpoints.
- Operator and administrator approval boundaries.

## Security Notes

This repository is intended for controlled local or intranet demonstrations. Runtime state, local credentials, wallet secrets, and generated build outputs should not be committed.
