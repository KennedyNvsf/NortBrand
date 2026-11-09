# NORTBRAND PAYMENTS IMPLEMENTATION REFERENCE

Read this before writing payment code. SKILL.md section 2.2 holds the rules that never change. This file explains how to apply them.

Provider facts in this file were checked against Stripe's documentation in November 2026. Payment methods, limits and APIs change. Check the current Stripe docs before relying on a limit or capability.

## CONTENTS

1. Prerequisites
2. Module layout
3. Flow overview
4. Data model
5. Order payment states
6. Creating a checkout
7. The webhook endpoint
8. Processing events
9. Portuguese payment methods
10. Food ordering
11. E-commerce and stock
12. Booking deposits
13. Subscriptions
14. Marketplaces (Stripe Connect)
15. Refunds and disputes
16. Certified invoicing (Portugal)
17. Mobile (Expo)
18. Security, keys and versions
19. Testing
20. Completion checklist
21. Do not

---

## 1. PREREQUISITES

Before writing code, confirm the Technical Architecture Brief records:

* the payment platform (ADR)
* the merchant model: single merchant or marketplace
* the payment flows, for example `food_order`, `shop_order`, `booking_deposit`
* the allowed payment methods per flow
* the payment timing per flow
* refund rules, and which roles may refund
* the certified invoicing software and integration route (Portuguese merchants)

If any of these is missing, ask. Do not infer payment behaviour from the UI design.

---

## 2. MODULE LAYOUT

Keep all provider code in one module. UI and other features call payment domain functions. They never import the Stripe SDK.

```text
features/payments/              packages/payments in a monorepo
├── stripe.ts                   server-only Stripe client
├── pricing.ts                  pure functions: totals, VAT breakdown
├── checkout.ts                 create order + checkout session
├── actions.ts                  Server Actions: startCheckout, refundOrder
├── events/
│   ├── handle-event.ts         records the event, dispatches by type
│   └── *.ts                    one handler per event family
├── invoicing/                  certified invoicing client and jobs
├── schemas.ts                  runtime validation
├── types.ts
└── tests/

app/api/webhooks/stripe/route.ts   thin Route Handler that calls events/handle-event.ts
```

Start every server module with `import "server-only"` so an accidental client import fails the build.

Do not build a multi-provider abstraction. One provider, one module. If a second provider becomes real, extract the interface then, from two concrete implementations.

---

## 3. FLOW OVERVIEW

```text
Client
  │  cart: product IDs and quantities only
  ▼
Server Action startCheckout
  │  authenticate or validate guest token
  │  validate input
  │  load prices, availability, opening hours from the DB
  │  compute totals (integer cents)
  │  create order + items in one DB transaction  → payment_status = awaiting_payment
  ▼
Stripe Checkout Session
  │  server-computed line items, order ID in metadata
  ▼
Customer pays on Stripe-hosted or embedded checkout
  ▼
Stripe ──signed webhook──► Route Handler
                             ├─ record event (idempotent)
                             ├─ DB function: apply payment transition
                             └─ only if applied: queue invoice, emails, notifications
  ▼
Return page
     reads order state from our DB
     may run the same idempotent sync with a server-side session lookup,
     so the customer is not left waiting on webhook delivery
```

---

## 4. DATA MODEL

This is a starting point. Adapt columns to the domain, keep the invariants.

Store money as `bigint` minor units. Store currency as a three-letter uppercase code. Use `text` with `check` constraints for statuses, because they are easier to evolve than Postgres enums.

Tenant-owned rows carry `business_id` and use composite foreign keys, so an order cannot point at another business's customer or products (SKILL.md section 44). Composite foreign keys need `unique (business_id, id)` on the referenced table.

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id),
  customer_id uuid,
  flow text not null
    check (flow in ('food_order', 'shop_order', 'booking_deposit')),
  payment_status text not null default 'awaiting_payment' check (
    payment_status in (
      'awaiting_payment',       -- checkout created, customer has not finished
      'awaiting_confirmation',  -- checkout finished, async method pending (Multibanco)
      'paid',
      'failed',
      'expired',
      'partially_refunded',
      'refunded'
    )
  ),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  delivery_amount bigint not null default 0 check (delivery_amount >= 0),
  total_amount bigint not null check (total_amount >= 0),
  refunded_amount bigint not null default 0
    check (refunded_amount >= 0 and refunded_amount <= total_amount),
  customer_tax_id text,                 -- NIF, only when the customer provides one
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, customer_id)
    references public.customers (business_id, id),
  check (total_amount = subtotal_amount - discount_amount + delivery_amount)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  product_id uuid,                      -- null once the product is deleted
  name_snapshot text not null,          -- what the customer saw and paid for
  unit_amount bigint not null check (unit_amount >= 0),
  quantity integer not null check (quantity > 0),
  vat_rate numeric(5, 2) not null check (vat_rate >= 0),
  line_amount bigint not null,
  foreign key (business_id, order_id)
    references public.orders (business_id, id),
  foreign key (business_id, product_id)
    references public.products (business_id, id)
    on delete set null (product_id),
  check (line_amount = unit_amount * quantity)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null,
  event_type text not null,
  order_id uuid,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  unique (provider, provider_event_id)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  amount bigint not null check (amount > 0),
  reason text not null check (
    reason in ('rejected_by_merchant', 'acceptance_timeout', 'unavailable',
               'customer_request', 'other')
  ),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  stripe_refund_id text unique,
  requested_by uuid references auth.users (id),   -- null for automatic refunds
  created_at timestamptz not null default now(),
  foreign key (business_id, order_id)
    references public.orders (business_id, id)
);
```

Prices are snapshotted on the order item. A later price change must never alter what a past order cost.

Do not store full event payloads in `payment_events`. They contain customer personal data. Store IDs and types, and fetch the event from Stripe by ID when debugging.

### RLS

* Enable RLS on every payment table.
* Customers can select their own orders and order items. Nothing else.
* Staff can select orders of businesses they belong to.
* No client role can insert or update payment fields. Payment state changes only through database functions called by server code.
* `payment_events` has no policies for `anon` or `authenticated`.
* Database functions that only the server may call get `security definer`, `set search_path = ''`, and `revoke execute ... from public, anon, authenticated`.

---

## 5. ORDER PAYMENT STATES

```text
awaiting_payment ──► paid
awaiting_payment ──► awaiting_confirmation ──► paid
                                           └─► failed
awaiting_payment ──► failed
awaiting_payment ──► expired

paid ──► partially_refunded ──► refunded
paid ──► refunded
```

Apply payment transitions through one database function. Stripe delivers events more than once and out of order. The function makes both harmless.

```sql
create or replace function public.apply_order_payment(
  p_order_id uuid,
  p_next_status text,
  p_amount bigint,
  p_currency text,
  p_payment_intent_id text
)
returns text  -- 'applied' | 'already_applied' | 'rejected'
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
    from public.orders
   where id = p_order_id
     for update;

  if not found then
    return 'rejected';
  end if;

  if v_order.payment_status = p_next_status then
    return 'already_applied';
  end if;

  if not (
       (v_order.payment_status = 'awaiting_payment'
          and p_next_status in ('paid', 'awaiting_confirmation', 'failed', 'expired'))
    or (v_order.payment_status = 'awaiting_confirmation'
          and p_next_status in ('paid', 'failed'))
  ) then
    return 'rejected';
  end if;

  if p_next_status = 'paid' and (
       p_amount is distinct from v_order.total_amount
    or upper(p_currency) is distinct from v_order.currency
  ) then
    return 'rejected';
  end if;

  update public.orders
     set payment_status = p_next_status,
         stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
         paid_at = case when p_next_status = 'paid' then now() else paid_at end
   where id = p_order_id;

  return 'applied';
end;
$$;

revoke execute on function public.apply_order_payment(uuid, text, bigint, text, text)
  from public, anon, authenticated;
```

The caller logs every `rejected` result with the event ID. A rejected `paid` with a mismatched amount needs a human, so alert on it.

Refund transitions go through a separate function (`apply_order_refund`) that locks the order row, checks the remaining refundable amount, and moves `paid` to `partially_refunded` or `refunded`.

Keep fulfilment state in its own column. A restaurant order has `payment_status` and `fulfilment_status` (`placed`, `accepted`, `preparing`, `ready`, `out_for_delivery`, `delivered`, `rejected`). Folding both into one column produces states like "paid but rejected" that nobody can name or query.

---

## 6. CREATING A CHECKOUT

```ts
"use server"

export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  const parsed = startCheckoutSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "invalid_input" }

  // 1. Authenticate, or validate the guest checkout token.
  // 2. Load products, prices, availability, opening hours from the DB.
  //    Unknown or unavailable products fail here.
  // 3. Compute totals with pricing.ts. Integer cents only.
  // 4. Create the order and its items in one transaction (database function via RPC).
  // 5. Create the Checkout Session (below).
  // 6. Store the session ID on the order.
  // 7. Return the session URL (hosted) or client secret (embedded).
}
```

Use the project's established schema validation library for `startCheckoutSchema`. The input contains product IDs and quantities. It never contains prices.

```ts
import type Stripe from "stripe"

type PaymentMethodType = Stripe.Checkout.SessionCreateParams.PaymentMethodType

export const PAYMENT_METHODS_BY_FLOW = {
  food_order: ["card", "mb_way"],
  shop_order: ["card", "mb_way", "multibanco"],
  booking_deposit: ["card", "mb_way"],
} as const satisfies Record<OrderFlow, readonly PaymentMethodType[]>

export const CHECKOUT_TTL_SECONDS = {
  food_order: 30 * 60,
  shop_order: 24 * 60 * 60,
  booking_deposit: 30 * 60,
} as const satisfies Record<OrderFlow, number>
```

```ts
const session = await stripe.checkout.sessions.create(
  {
    mode: "payment",
    client_reference_id: order.id,
    metadata: { order_id: order.id, business_id: order.businessId },
    payment_intent_data: {
      metadata: { order_id: order.id, business_id: order.businessId },
    },
    line_items: order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: "eur",
        unit_amount: item.unitAmount,
        product_data: { name: item.name },
      },
    })),
    payment_method_types: [...PAYMENT_METHODS_BY_FLOW[order.flow]],
    locale: locale === "pt" ? "pt" : "en",
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_SECONDS[order.flow],
    success_url: `${env.APP_URL}/${locale}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/${locale}/cart`,
  },
  { idempotencyKey: `checkout-session:${order.id}` },
)
```

Notes:

* The session total must equal `orders.total_amount`. Add delivery as its own line item.
* Checkout line items cannot be negative. Apply discounts through the server-computed amounts or a coupon created server-side. Either way the totals must match.
* `expires_at` must be between 30 minutes and 24 hours from creation.
* An explicit `payment_method_types` list keeps the allowed methods per flow in reviewed code. Stripe's Payment Method Configurations are the alternative when the client wants to manage methods from the Dashboard. Pick one per project and record it. Check in test mode that Apple Pay and Google Pay appear as expected with the chosen setup.
* Prefer Stripe-hosted Checkout. Use embedded Checkout when the design needs the customer to stay on our domain. Use the Payment Element only when neither fits, and record why.

---

## 7. THE WEBHOOK ENDPOINT

```ts
// app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/features/payments/stripe"
import { handleStripeEvent } from "@/features/payments/events/handle-event"
import { env } from "@/lib/env"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 })
  }

  await handleStripeEvent(event)
  return NextResponse.json({ received: true })
}
```

* Read the raw body with `request.text()`. Parsing JSON first breaks signature verification.
* Return 2xx only after the event is recorded and processed. An error response makes Stripe retry, and Stripe keeps retrying live-mode deliveries for up to three days, so a temporary failure is not lost.
* Subscribe the endpoint only to the event types the code handles.
* Keep the request fast. Invoices and emails run from jobs, not inside the webhook request.
* Exclude `/api/webhooks/*` from auth and locale middleware.
* Connect projects receive connected-account events on a separate endpoint with its own signing secret.

---

## 8. PROCESSING EVENTS

```ts
const HANDLED_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "refund.updated",
  "refund.failed",
  "charge.dispute.created",
] as const satisfies readonly Stripe.Event.Type[]
```

`handleStripeEvent` does this, in order:

1. Insert the event into `payment_events` (`on conflict do nothing`) and read back `processed_at`. If it is set, return. A delivery that failed halfway has `processed_at` empty, so its retry runs again. The state function makes that safe.
2. Switch on `event.type`. TypeScript narrows `event.data.object` per case.
3. Apply the transition through `apply_order_payment`.
4. Run side effects only when the result is `applied`: queue the invoice job, queue the confirmation email, set the fulfilment status that notifies the merchant. A duplicate event never sends a second email or issues a second invoice.
5. Set `processed_at`. On failure, store `last_error` and throw, so the route returns 500 and Stripe retries.

Checkout session events map like this:

```text
checkout.session.completed
  payment_status = "paid"                  → paid
  payment_status = "unpaid"                → awaiting_confirmation  (Multibanco voucher issued)
  payment_status = "no_payment_required"   → domain decision (free orders)

checkout.session.async_payment_succeeded   → paid
checkout.session.async_payment_failed      → failed
checkout.session.expired                   → expired, release stock or slot holds
```

Put this mapping in one function, `syncCheckoutSession(session)`. Before applying anything it checks that `session.client_reference_id` is a real order and that `session.id` matches the order's stored session ID. The webhook calls it. The return page can call it too, with a session retrieved server-side from Stripe, so a slow webhook does not leave the customer staring at "confirming payment".

---

## 9. PORTUGUESE PAYMENT METHODS

Checked November 2026. Re-check before promising a client anything.

MB WAY:

* The customer enters a phone number and approves in the MB WAY app. They have about 4 minutes, and the checkout page waits for the result. Hosted Checkout handles the waiting state. A custom Payment Element UI must design it.
* Confirmation is immediate.
* No manual capture. Authorize-now-capture-later is impossible.
* No automatic recurring payments.
* 5,000 EUR maximum per payment. Customers have a default daily limit of 1,000 EUR.
* Stripe lists it for B2C businesses only.
* The customer's bank statement shows Stripe's name, not the merchant's. Say so in the confirmation email so customers recognise the charge.
* Refunds, full or partial, for up to a year. A failed refund returns the money to the Stripe balance, and the customer must then be refunded another way.
* Disputes give the merchant 7 days to submit evidence.

Multibanco:

* The customer receives an entity and reference and pays at an ATM or in home banking.
* Confirmation can take several days. Only webhooks can drive fulfilment.
* No automatic recurring payments.
* No disputes, because the customer pushes the funds.
* Never offer it on time-critical flows: food, same-day bookings, limited drops.

Cards, Apple Pay, Google Pay:

* Support authorize-then-capture and recurring payments.
* Strong Customer Authentication (3-D Secure) applies.

---

## 10. FOOD ORDERING

```text
cart
  → startCheckout validates opening hours, delivery zone, minimum order
  → order: payment awaiting_payment
  → Checkout: card, wallets, MB WAY, 30-minute session
  → webhook: paid → fulfilment placed → restaurant notified (Realtime)
  → restaurant accepts within the agreed window?
       yes        → accepted → preparing → ready → out_for_delivery → delivered
       no/timeout → rejected → automatic full refund → credit note → customer email
```

The acceptance timeout needs a scheduler. Use pg_cron calling a database function, or a scheduled Edge Function, as the brief decides. The scheduler finds `placed` orders past the window and starts refunds through the same refund function staff use.

Card-only authorize-then-capture avoids the refund round trip but drops MB WAY. Use it only when the client accepts that trade-off, and record it in the ADR.

---

## 11. E-COMMERCE AND STOCK

Reserve stock when the order is created, with a conditional update that cannot go negative. Run it inside the order-creation transaction:

```sql
update public.products
   set stock = stock - p_quantity
 where business_id = p_business_id
   and id = p_product_id
   and stock >= p_quantity;
-- zero rows updated means out of stock: abort the transaction
```

* Release reservations on `expired` and `failed`.
* Multibanco holds a reservation open for days. Agree with the client: reserve until the voucher resolves, or exclude Multibanco for low-stock products.
* Shipping costs and free-shipping thresholds are computed server-side like every other amount.

---

## 12. BOOKING DEPOSITS

* Hold the slot when checkout starts. Confirm the booking when payment succeeds.
* The hold takes part in the booking engine's conflict protection (SKILL.md section 53). A held slot blocks other bookings exactly like a confirmed one.
* The hold expires with the checkout session. `checkout.session.expired` releases it.
* Cancellation and no-show rules decide whether the deposit is refunded, kept or credited. Write them as domain functions, not UI conditions.

---

## 13. SUBSCRIPTIONS

* Use Stripe Billing. Mirror subscription state from webhooks: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
* Derive access from the mirrored state in our database, checked server-side.
* Automatic renewal needs cards or SEPA Direct Debit. MB WAY and Multibanco only work as manually paid invoices.
* Use Stripe's customer portal for payment-method changes and cancellation unless the design needs a custom flow.

---

## 14. MARKETPLACES (STRIPE CONNECT)

* Choose the charge type deliberately and record it in the ADR. Orders paid out to several parties, such as a restaurant and a courier, usually need separate charges and transfers. One seller per order can often use destination charges.
* Sellers onboard through Stripe-hosted onboarding. We never collect sellers' identity documents ourselves.
* Store the connected account ID on the tenant (`businesses.stripe_account_id`, unique). A business cannot receive orders until Stripe reports, through `account.updated`, that its account can take payments and receive payouts.
* MB WAY and Multibanco need their capabilities active on each connected account. Check before offering those methods for that seller.
* Connected-account events arrive on a separate endpoint with its own secret.
* Stripe's Connect account configuration options change over time. Build from the current Connect docs and record the configuration in the ADR.

---

## 15. REFUNDS AND DISPUTES

```text
staff action or automatic trigger
  → Server Action or job: authenticate, authorize (role and same tenant)
  → apply_order_refund locks the order row and checks:
      amount > 0
      amount <= total_amount - refunded_amount - pending refunds
  → insert refund row (pending)
  → stripe.refunds.create(
        { payment_intent, amount, metadata: { refund_id } },
        { idempotencyKey: `refund:${refund.id}` })
  → webhook refund.updated / refund.failed updates the refund row and the order
  → succeeded: queue the credit note, email the customer
```

* Alert a human on `refund.failed`.
* On `charge.dispute.created`, notify the person named in the brief. Evidence windows are short.

---

## 16. CERTIFIED INVOICING (PORTUGAL)

A Stripe receipt is not a valid Portuguese invoice. Portuguese merchants issue invoices and credit notes through software certified by the Autoridade Tributária.

* Issue the certified invoice after the order is `paid`. Never before.
* Issue it from a job, not inside the webhook request. An invoicing outage must not block payment processing.
* One document per order and per refund. The unique constraint below makes retries safe.
* Every successful refund gets a credit note referencing the original invoice.
* Validate the NIF format server-side when collected: 9 digits with a valid check digit. Leave tax logic to the invoicing software, configured by the client's accountant.
* If the client uses an existing connector between Stripe and their invoicing software instead, record that in the ADR and issue nothing from our code. Two systems issuing invoices for the same sale is the worst outcome.

```sql
create table public.invoice_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  refund_id uuid,
  kind text not null check (kind in ('invoice', 'credit_note')),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  attempts integer not null default 0,
  external_document_id text,
  external_document_number text,
  last_error text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (order_id, kind, refund_id),
  foreign key (business_id, order_id)
    references public.orders (business_id, id)
);
```

A scheduled job processes `pending` rows, retries with backoff, and alerts after repeated failures.

---

## 17. MOBILE (EXPO)

* The app calls the same server functions that create orders and sessions. It holds the publishable key only.
* Choose per project between Stripe's React Native SDK (in-app payment sheet) and hosted Checkout opened in the browser with a deep link back. Record the choice in the brief.
* Confirm every promised method, MB WAY in particular, against the SDK version in use.
* The app reads payment state from our backend. An SDK success callback alone never marks anything paid.
* Digital goods or content used inside the app usually fall under Apple's and Google's in-app purchase rules. Follow the brief.

---

## 18. SECURITY, KEYS AND VERSIONS

```text
STRIPE_SECRET_KEY                   server-only   secret or restricted key
STRIPE_WEBHOOK_SECRET               server-only   whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET       server-only   Connect projects only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  public        embedded Checkout, Elements, mobile only
```

* Validate environment variables at startup. Refuse to start when a non-production environment holds a live key (`sk_live_`, `rk_live_`), or production holds a test key.
* Prefer restricted keys limited to the permissions the app uses.
* Pin the exact `stripe` package version. Each SDK release targets one API version, so an SDK upgrade is an API upgrade. Read the changelog, upgrade deliberately, and move the webhook endpoints' API version in the same change.
* Log event IDs and order IDs. Never log full payloads, card data or customer personal data.
* Rate-limit checkout creation per user or IP. Open checkout endpoints attract card-testing attacks.
* Check order ownership server-side on every order page. Guest orders use an unguessable token, not the bare order ID (SKILL.md section 46).
* Store Stripe IDs only. Never anything from the card form.

---

## 19. TESTING

Local webhooks:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

Use Stripe's test cards (success, decline, 3-D Secure) and the MB WAY test phone numbers from Stripe's docs.

Minimum automated tests:

* pricing: totals, discounts, delivery, VAT breakdown, integer rounding
* state function: each valid transition applies, each invalid one is rejected, a late `expired` after `paid` changes nothing
* idempotency: the same event processed twice gives one transition, one email, one invoice job
* amount mismatch: a `paid` event with the wrong amount is rejected and alerted
* refunds: over-refund rejected, two concurrent refunds cannot exceed the total
* RLS: a customer cannot read another customer's order, no client role can update payment fields, staff cannot read another business's orders
* webhook: a missing or invalid signature returns 400

Mock Stripe at the payments module boundary in unit tests. Run end-to-end flows in test mode.

---

## 20. COMPLETION CHECKLIST

```text
[ ] Brief records platform, flows, methods, timing, refunds, invoicing
[ ] Every amount computed server-side from DB prices
[ ] Money stored as integer minor units with currency
[ ] Order and items created in one transaction, prices snapshotted
[ ] Checkout session created with an idempotency key
[ ] Payment methods restricted per flow
[ ] Webhook verifies the signature on the raw body
[ ] Events recorded behind a unique provider event ID
[ ] Transitions only through the state function, invalid ones rejected
[ ] Amount and currency checked before marking paid
[ ] Side effects run only on applied transitions
[ ] Return page reads state from our DB
[ ] Refunds authorized, bounded, idempotent and concurrency-safe
[ ] Invoice and credit-note jobs implemented (Portuguese merchants)
[ ] RLS blocks client writes to payment fields
[ ] Secrets server-only, live keys production-only
[ ] Webhook route excluded from auth and locale middleware
[ ] Section 19 tests written and run
```

---

## 21. DO NOT

```text
Trust a price, total, discount or currency sent by the client
Mark an order paid from the success URL or a client callback
Parse a webhook body before verifying its signature
Store money as floats
Call Stripe from Client Components
Let any client role write payment status
Offer Multibanco on time-critical flows
Plan authorize-then-capture with MB WAY
Issue invoices before payment, or from two systems
Share one Stripe account across clients
Build a multi-provider abstraction for providers nobody uses yet
```
