# Deployment Checklist

Use this checklist before running Cryptoken in a local or intranet environment.

## Runtime

- Install a supported Node.js runtime.
- Run `npm install` before the first start.
- Start both services with `npm run dev:all` during development or `npm run start:all` after a production build.
- Keep the frontend on port `4000` and the API on port `4010` unless the environment variables are changed together.

## Validation

- Confirm `GET /health` returns an OK response from the API service.
- Confirm `POST /api/auth/login` accepts the demo administrator and operator accounts.
- Confirm `GET /api/state` requires a valid session cookie.
- Confirm payment request endpoints return a controlled payment requirement instead of silently accepting an order.
- Confirm runtime files under `server/data`, generated builds, logs, and local environment files are not committed.

## Payment Review

- Use a test network for early validation.
- Review receiver address, network, asset, and amount in the wallet before confirming.
- Keep cart approval separate from wallet payment confirmation.
- Keep emergency stop and wallet authorization limited to administrator actions.
