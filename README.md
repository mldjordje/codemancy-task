# Raffle Winner Automation Simulator

Proof-of-concept demo that visualizes the Shopify Flow + Recharge automation described in the provided PDFs. It models a multi-stage raffle winner workflow with idempotency, retries, audit logs, and configuration-driven discount logic.

## Purpose

- Demonstrate the end-to-end flow triggered by the `rafflewinner` customer tag
- Make idempotency, retries, and failure handling visible and explainable
- Show how merchant-configurable policies drive Recharge discount behavior
- Provide a realistic simulation without production infrastructure overhead

## Mapping to Shopify Flow + Recharge

- **Shopify Flow trigger**: `/api/flow/rafflewinner` represents “Customer tag added”
- **Idempotency check**: customer metafield in Flow is modeled as a stored processed marker
- **Recharge API**: `/api/recharge/apply-discount` simulates internal discount application
- **Staff notification**: email step is generated and previewable in the UI
- **Multi-stage raffle**: `/api/stages/simulate` simulates staggered waves

## Assumptions

- Winners are tagged progressively across Stage 1/2/3.
- Recharge subscriptions can be active, paused, or cancelled (mocked).
- Existing discount behavior (skip or override) is explicitly configurable.
- Duration can be permanent (null) or time-bound in days.
- If retries fail, the run is flagged for manual review rather than auto-marked.

## Edge Cases Handled

- Idempotency: re-tagged customers are marked `already_processed` and halted.
- Existing discounts: honored or overridden based on settings.
- Status-based eligibility: apply-to logic respects active vs paused.
- Retry exhaustion: failures move to `needs_review` and are retryable.
- Manual retry: rechecks idempotency before applying discount again.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deployment to Vercel

1. Push the repo to GitHub.
2. Import into Vercel.
3. (Optional) Add Vercel KV environment variables for persistence:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
4. Deploy.

If KV env vars are not present, the app uses an in-memory singleton store.

## API Endpoints

- `POST /api/flow/rafflewinner`
- `POST /api/recharge/apply-discount`
- `POST /api/stages/simulate`
- `POST /api/runs/{runId}/retry`
- `GET /api/runs`
- `GET /api/logs`
- `GET /api/settings`
- `POST /api/settings`

## Notes

- This is a PoC demo and intentionally avoids production hardening.
- The UI highlights the flow timeline, retry history, and auditability.
