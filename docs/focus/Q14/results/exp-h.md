# Experiment H: Commerce & Finance

**Unit**: marketing-and-sales (103), shopping-and-e-commerce (51), transportation (110)
**Total skills**: 264

---

## Governance Angle

### Risk Classification: Nearly All R4-R5

This is the **highest-transaction-risk unit**. Financial actions dominate.

| Sub-group | Default Risk | Count (est.) | Rationale |
|---|---|---|---|
| Marketing/content | **R3 TRANSFORM** | ~40 | Content generation, no financial action |
| Social media posting | **R4 EXECUTE** | ~25 | Post on platforms (OBO-SOCIAL) |
| CRM/lead management | **R3 TRANSFORM** | ~15 | Data manipulation |
| Email marketing | **R4 EXECUTE** | ~10 | Send campaigns (OBO-EMAIL) |
| Shopping/purchase | **R5 TRANSACT** | ~30 | Buy items, place orders |
| Crypto trading | **R5 TRANSACT** | ~25 | Execute trades, swaps |
| Payment processing | **R5 TRANSACT** | ~15 | Process payments, invoices |
| Flight/travel booking | **R5 TRANSACT** | ~15 | Book flights, hotels |
| Invoicing | **R4 EXECUTE** | ~10 | Generate/send invoices |
| Public transport | **R2 READ** | ~30 | Schedule queries (read-only) |
| Financial reporting | **R2 READ** | ~15 | Read financial data |
| Betting/gambling | **R5 TRANSACT** | ~10 | Place bets, predictions |

### Financial Elicitation Gates

```yaml
PURCHASE:
  trigger: "buy", "order", "add to cart", "checkout"
  elicit:
    - item: "What item?"
    - price: "Price: [amount]"
    - quantity: "How many?"
    - total: "Total: [amount]. Confirm purchase?"
  gate: double_confirm
  budget_check: true
  max_per_transaction: $500  # default, configurable

TRADE:
  trigger: "trade", "swap", "buy crypto", "sell"
  elicit:
    - asset: "Which asset?"
    - amount: "How much?"
    - price: "Current price: [X]"
    - slippage: "Max slippage: [Y]%"
    - confirmation: "Execute trade: [details]?"
  gate: double_confirm + budget_check
  cooling_period: 30s  # wait before executing

BOOK_TRAVEL:
  trigger: "book flight", "reserve hotel", "book ticket"
  elicit:
    - itinerary: "Route: [origin] -> [destination]"
    - dates: "Dates: [check-in] to [check-out]"
    - price: "Price: [amount]"
    - cancellation: "Cancellation policy: [details]"
  gate: user_confirm
  
PAYMENT:
  trigger: "pay invoice", "send payment", "transfer"
  elicit:
    - recipient: "To whom?"
    - amount: "How much?"
    - method: "Payment method?"
    - confirmation: "Send [amount] to [recipient]?"
  gate: double_confirm + budget_check
```

### Budget Enforcement Policy

```yaml
budget-policy:
  daily_limit: $100        # default daily spending limit
  weekly_limit: $500       # default weekly limit
  per_transaction: $200    # max per single transaction
  
  categories:
    shopping: { daily: 50, weekly: 200 }
    crypto: { daily: 100, weekly: 500 }
    travel: { per_transaction: 1000 }  # higher for flights
    gambling: { daily: 0, weekly: 0 }  # disabled by default
    
  alerts:
    at_80_percent: true
    at_100_percent: hard_block
    
  override: requires_user_approval
```

### OBO Actions

| OBO Type | Skills | Count |
|---|---|---|
| OBO-PURCHASE | `buy-anything`, `amazon-shopper`, `buy-amazon`, `checkers-sixty60`, `food-order`, `qfc-order` | 6 |
| OBO-TRADE | `mt5-httpapi`, `zerodha-kite`, `etrade-pelosi-bot`, `kalshi-agent` | 4 |
| OBO-PAYMENT | `stripe`, `creditcard`, `privacy-cards`, `rapay`, `paypilot-agms`, `signet-guardian` | 6 |
| OBO-BOOKING | `travel-agent`, `cabin`, `tixflow`, `bayclub-gateway-booking`, `usc-booking-api` | 5 |
| OBO-EMAIL-CAMPAIGN | `cold-email`, `cold-outreach`, `foxreach`, `brevo`, `kit-email-operator` | 5 |
| OBO-SOCIAL | `bird`, `bluesky`, `simplified-social-media`, `tiktok-viral-marketing` | 8 |
| OBO-GAMBLING | `gambling`, `fuku-sportsbook`, `sports-odds` | 3 |

**Total OBO skills: 37 (14%)**

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `agent-card-provisioning` | **ENABLE** | Virtual payment cards; uses @claws/budget for limits |
| `signet-guardian` | **COMPLEMENT** | Payment guard middleware; complements claws budget policy |
| `creditcard` | **ENABLE** | Guardrailed wallets; uses @claws/budget |
| `agentic-governance` | **ENABLE** | Constraint lifecycle management; uses @claws/* |
| `constraint-engine` | **COMPLEMENT** | Learn constraints from experience; complements claws policy |
| `workcrm` | **COMPLEMENT** | "Local-first CRM with explicit confirmation gate" |

---

## Maker Angle

### @claws/budget for Commerce Skills

```typescript
import { BudgetGuard } from '@claws/budget';

const guard = new BudgetGuard({
  policy: 'personal-shopping',
  daily_limit: 100,
  per_transaction: 50,
  category: 'shopping'
});

// Before any purchase:
const approved = await guard.check({
  amount: 29.99,
  merchant: 'Amazon',
  item: 'USB Cable'
});

if (approved.status === 'approved') {
  await executePurchase();
  await guard.record({ amount: 29.99, tx_id: 'abc123' });
} else {
  // approved.reason: 'exceeds_daily_limit'
  await requestUserOverride(approved);
}
```

### @claws/commerce for Transaction Skills

```typescript
import { TransactionBuilder } from '@claws/commerce';

const tx = new TransactionBuilder({
  type: 'purchase',
  risk: 'R5',
  elicitation: 'purchase-template',
  gate: 'double-confirm',
  budget: guard
});

tx.setItem({ name: 'Flight LAX->JFK', price: 450 });
tx.setRecipient('United Airlines');

// Automatically shows preview, waits for double confirm, checks budget
await tx.execute();
```

### Templates for Commerce Skills

| Template | Description |
|---|---|
| `skill-shopper` | Shopping skill with budget guard and purchase confirmation |
| `skill-trader` | Trading skill with cooling period and position limits |
| `skill-payment` | Payment processing with double confirm and audit trail |
| `skill-travel-booker` | Travel booking with itinerary preview and cancellation info |
| `skill-invoice-sender` | Invoice generation with email confirmation gate |
| `skill-email-campaign` | Email marketing with opt-out compliance and rate limits |

### Key Maker Recommendations

1. **Budget guard**: `@claws/budget` is mandatory for all R5 TRANSACT skills
2. **Cooling period**: 30-second wait between trade decision and execution
3. **Transaction audit**: Every financial action logged to @claws/audit
4. **Gambling block**: Disabled by default in budget policy; opt-in only
5. **Cancellation info**: Travel/booking skills must show cancellation policy before confirmation

---

## Summary Statistics

- Total skills analyzed: 264
- R2 READ skills: ~45 (17%)
- R3 TRANSFORM skills: ~55 (21%)
- R4 EXECUTE skills: ~53 (20%)
- R5 TRANSACT skills: ~111 (42%)
- OBO-crossing skills: 37 (14%)
- Budget enforcement needed: ~111 (42%)
- Gambling skills: 3 (blocked by default)
- claws REPLACE: 0 | COMPLEMENT: 3 | ENABLE: 3
