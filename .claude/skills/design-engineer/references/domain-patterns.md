# Domain UI Patterns: AI, Trading & Crypto

Covers Parts XV–XVII. Read when building AI interfaces, trading UIs, or crypto/wallet flows. These are the highest-leverage patterns for AI, fintech, and web3 products.

## Contents
- [AI UI patterns](#ai-ui-patterns)
- [Trading UI patterns](#trading-ui-patterns)
- [Crypto UI patterns](#crypto-ui-patterns)

---

## AI UI patterns

- **Streaming responses:** render tokens as they arrive; never block on the full response. Show a cursor/typing affordance. Keep the input responsive during streaming and allow **stop/cancel** mid-stream.
- **Tool calls:** surface what the agent is doing — show the tool name, inputs (when safe), and result state (running → done → error). Don't hide tool use behind a spinner; users trust what they can see.
- **Agent progress:** for multi-step agents, show a step list with per-step status. Make long-running work legible, not a black box.
- **Chain-of-thought presentation:** show reasoning only when it aids the user, and make it collapsible/secondary — never the main event. Default collapsed for polished products.
- **Chat interfaces:** virtualize long threads; preserve scroll position on new messages; auto-scroll only when the user is at the bottom. Distinguish user/assistant/system clearly. Handle markdown, code blocks (with copy), and streaming together.
- **Workflow builders / multi-agent orchestration:** node-graph or step UIs need clear data flow, valid/invalid states, and undo.
- **Interruptible tasks:** any long AI task must be cancelable, and the UI must reflect cancellation immediately (optimistic), reconciling with the server.
- **Optimistic AI:** reflect the user's action instantly (message appears, action queued) before the model responds; reconcile on completion.
- **Human-in-the-loop approval:** for consequential actions (sending funds, writing data, external calls), require explicit user approval with a clear diff/preview of what will happen. Never auto-execute irreversible actions.

---

## Trading UI patterns

- **Tables** are the workhorse: virtualized, sortable, with sticky headers and column alignment (numbers right-aligned, tabular-nums). Density matters — traders want more rows, less chrome.
- **Order books:** real-time bid/ask with depth visualization; color-code sides consistently; animate updates subtly (flash on change) without causing motion sickness. Throttle render to a sane frame budget.
- **Candlesticks / charts:** performant canvas/WebGL rendering for large datasets; crosshair, tooltips, zoom/pan. Don't re-render the whole chart on each tick — patch.
- **Heatmaps:** consistent color scale with a legend; ensure the scale works for color-blind users (don't rely on red/green alone).
- **Portfolio dashboards:** clear P&L (positive/negative with sign + color + never color-only), allocation breakdowns, and time-range controls. Loading states per widget, not one global spinner.
- **Options chains:** dense grid, clear strike/expiry axes, highlight ATM/ITM/OTM, keyboard navigable.
- **Watchlists:** fast add/remove (optimistic), real-time price updates with directional flash, sparklines.
- **Real-time updates:** throttle/batch high-frequency updates to protect the main thread; use a single subscription multiplexed across components; flash-on-change to signal movement without jitter.
- **Optimistic execution:** reflect order placement immediately with a pending state; reconcile with fills; make rejection states loud and clear.
- **Risk indicators:** never color-only. Pair with icon + label + value. A liquidation warning must be unmissable and unambiguous.

---

## Crypto UI patterns

- **Wallet connection:** support multiple wallets; show connection state clearly; handle wrong-network gracefully with a one-click switch. Differentiate connected wallet types in the UI.
- **Transaction lifecycle:** model the full states — idle → prompting (wallet) → pending (mempool) → confirming → success/failed. Show each explicitly with the right affordance (explorer link on submit, confirmations as they arrive).
- **Signature flows:** explain what the user is signing in plain language before the wallet prompt. Never surprise-sign. Distinguish message signing from transaction signing.
- **Gas estimation:** show estimated cost up front, update it live, and surface when gas is unusually high. Let users understand cost before committing.
- **Token selection:** searchable, with balances, verified-token indicators, and warnings on unverified/low-liquidity tokens. (Token selector = Dialog + Input + virtualized List.)
- **Cross-chain UX:** make the source/destination chains unmistakable; show bridge/route steps and estimated time; warn on slow routes. Represent multi-step routes as a legible sequence.
- **Explorer patterns:** deep-link every tx/address to the correct explorer; copy-to-clipboard with confirmation.
- **Address presentation:** truncate consistently (`0x1234…abcd`), always copyable, show ENS/identity when available, with a copy affordance and confirmation.
- **Security warnings:** loud, unmissable, and specific for risky actions (unlimited approvals, unverified contracts, high slippage, phishing-prone flows). These are human-in-the-loop gates — require explicit acknowledgment, never bury them.
