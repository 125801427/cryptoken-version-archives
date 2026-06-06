# Cryptoken

Cryptoken is a local demo platform for AI-agent token treasury operations. It combines a Next.js dashboard with a lightweight Node.js API for account login, role-based approvals, multi-model purchase carts, wallet/payment flow orchestration, and x402-style payment verification.

## Features

- Local login with administrator and operator roles.
- Multi-model token purchase cart with per-model trigger rules.
- x402-style payment request, transfer tracking, and manual approval.
- Configurable settlement network and payment asset selection.
- Wallet authorization, emergency stop, and agent-control API boundaries.
- Persistent local JSON state for demo and intranet deployments.
- Static frontend export served by the bundled Node static server.

## Demo Accounts

These accounts are for local or intranet demonstrations only.

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Cryptoken@2026` |
| Operator | `operator` | `Operator@2026` |

## Local Development

```powershell
npm install
npm run dev:all
```

Frontend:

```text
http://127.0.0.1:4000/
```

API:

```text
http://127.0.0.1:4010/
```

## Production Build

```powershell
npm run lint
npm run build
npm run start:all
```

## Windows Intranet Start Script

The repository includes a Windows helper script for local or intranet deployment:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-cryptoken-windows.ps1
```

For a fixed LAN host:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-cryptoken-windows.ps1 -LanHost 127.0.0.1
```

## Environment Variables

| Name | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_AGENT_API_BASE` | `http://127.0.0.1:4010` | Frontend API base URL at build time. |
| `CRYPTOKEN_WEB_HOST` | `127.0.0.1` | Static frontend bind host. |
| `CRYPTOKEN_WEB_PORT` | `4000` | Static frontend port. |
| `CRYPTOKEN_API_HOST` | `127.0.0.1` | API bind host. |
| `CRYPTOKEN_API_PORT` | `4010` | API port. |
| `CRYPTOKEN_ALLOWED_ORIGINS` | empty | Comma-separated extra CORS origins. |

## API Documents

- `public/agent-control.openapi.json`
- `public/x402-protocol.openapi.json`

## Workflow Notes

- `docs/purchase-workflow.md`

## Security Notes

This project is built for demonstration and controlled intranet use. It does not implement production-grade identity, custody, treasury, supplier settlement, or compliance controls. Do not use mainnet funds unless the payment and approval flows have been independently reviewed and hardened.
