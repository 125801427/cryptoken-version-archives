# Purchase Workflow

Cryptoken is designed around a controlled token purchase workflow for AI model usage. The first product boundary is simple: an operator can prepare a purchase request, while final settlement and approval stay explicit.

## Core Flow

1. Review available model options and expected token usage.
2. Prepare a purchase cart with model, quantity, budget, and trigger price.
3. Request payment details from the platform API.
4. Complete payment through the connected wallet.
5. Wait for transfer verification.
6. Approve the cart and write the token balance to the platform ledger.

## Safety Boundaries

- The platform does not store wallet seed phrases or private keys.
- Payment approval is separate from cart creation.
- Operators can prepare work, while administrator-only controls are reserved for risk settings.
- Runtime state, logs, local credentials, and private deployment files stay outside source control.

## Next Implementation Areas

- Add a local API service for sessions, role checks, cart state, and payment state.
- Add OpenAPI contracts for agent control and payment verification.
- Add persistent local JSON state for intranet demonstrations.
- Add a start script that keeps frontend and API ports predictable.
