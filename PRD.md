# Play 21 Games — PRD (v0 MVP)

**Status:** Draft · **Scope:** v0 MVP first launch · **Last updated:** 2026-04-19

> Everything in this document is scoped to **v0 first launch**. Platform-level vision, multi-sport expansion, licensing, and real-money play are explicitly out of scope here and will be written up separately if/when they become in scope.

## 1. Overview

Play 21 Games is a free-to-play sports blackjack platform. Players pick 3–6 MLB teams per bet; the combined runs scored by those teams form a "hand" scored like blackjack. Hitting **21** is a blackjack, **15–20** is a winning zone with diminishing payouts, **22+** busts, **<15** is short. A token economy with tier-gated stakes and a Poisson-calibrated 15% house hold preserves token velocity without giving sharps an edge on team selection.

## 2. Goals & Non-Goals

**Goals (v0 MVP)**
- Deliver the full loop end-to-end for one MLB slate: pick → place → settle → balance update.
- Integrate live MLB schedule + results via the public Stats API.
- Support multiple concurrent bets per slate with sensible cross-bet constraints.
- Tier-gated stake options and automatic refill at zero balance.
- Mobile-first single-page experience that works without auth.

**Non-Goals (v0 MVP)**
- No real-money play, cash-outs, or paid token top-ups.
- No accounts, auth, or persistent backend. State lives in `localStorage`, keyed by a 5-user dev switcher.
- No leaderboards, social features, or tournaments.
- No sports other than MLB.
- No dynamic-λ odds (pitcher/opponent-conditioned) in v0 — team selection is EV-neutral within the house hold.

## 3. Target Audience (v0)

Internal stakeholders + small beta pool. The product is not being marketed in v0. Goal is to prove the loop works, the math is right, and the UI is usable.

## 4. Game — MLB Baseball

### 4.1 Premise

Pick **3 to 6 MLB teams** playing today. Each team's final runs contribute to one shared total per bet. The total is scored like blackjack:

| Total | Outcome |
|---|---|
| 21 | **Blackjack** — 1.3× bonus multiplier on base payout |
| 15 – 20 | Win — base payout by landed total (75% floor at 15, monotonic climb to 20) |
| < 15 | Short — stake lost |
| ≥ 22 | Bust — stake lost |

The actual payout multiplier at each (N-teams, landed-total) cell is **solved to produce a 15% house hold** across the win zone; see §6. Source of truth for numeric values is `apps/web/src/lib/odds.ts`.

### 4.2 Slate

- A **slate** = all MLB regular-season games scheduled on a given ET calendar date.
- **Doubleheaders**: Game 1 counts; Game 2 is excluded from the pick pool. (BBJ house rule, preserved.)
- Slate is available once MLB publishes the schedule (roughly 24h ahead).

### 4.3 Bet rules

- Each bet holds **3–6 teams** from the current slate.
- **Multiple bets per slate** allowed per user (bounded only by balance and team availability).
- **Cross-bet team lock**: a team in one of your open bets cannot appear in another of your open bets for the same slate.
- **Both teams from the same matchup** are pickable within a single bet.
- Bets are locked at submission; **Cancel** before first pitch to fully refund the stake.
- **Pick lock per game**: once a game has started, both of its teams become unpickable for new bets. *(Not yet implemented.)*

### 4.4 Void rules (v0)

- **Postponed, suspended, or not officially final by ET midnight of the slate date**: that team contributes **0 runs** to the bet total.
- **All teams voided**: stake refunded in full.
- **Stat corrections after settlement do not retro-change outcomes.** Settlement is final at the moment the bet's last game completes.

## 5. Token Economy

- Starting balance: **100 tokens** on first session.
- **Auto-refill**: at ET midnight, if balance is exactly 0, balance is restored to **10 tokens**. Refill only fires at exactly zero. *(Not yet implemented.)*
- Tokens have **no cash value**. They cannot be bought, earned outside of play, or cashed out.

### 5.1 Tiers & stakes

| Tier | Balance | Stakes available |
|---|---|---|
| Rookie | < 10 | 1 |
| Starter | 10 – 99 | 1, 2 |
| All-Star | 100 – 1,999 | 1, 2, 5, 10 |
| MVP | ≥ 2,000 | 1, 2, 5, 10, 25 |

Tier is recomputed from balance on each pick interaction; stake options update immediately.

## 6. Odds & Payouts

### 6.1 Model

- Each team's runs-per-game modeled as **Poisson(λ = 4.6)**. Constant across teams in v0.
- Sum of N independent Poissons with equal λ → Poisson(4.6 · N).
- Distribution yields P(total ∈ [15, 21]), P(total = 21), P(total ≥ 22).

### 6.2 Payout calibration

Base payout per (N, landed-total) cell is solved offline/at compile time such that:
- **Target house hold: 15%** across the win zone.
- **1.3× bonus multiplier** at exactly 21 (blackjack).
- **0.75× floor** at 15.
- **Monotonic climb** from 15 → 20.
- **Hard cap** per winning cell: lesser of **20× stake** or **2,500 tokens**.

Payouts depend **only on N and the landed total**, not on which specific teams were picked. This is the deliberate design call that keeps pitcher/ERA info as flavor-only in v0.

### 6.3 Live odds display

During pick flow, the bet form shows:
- **Win %**, **BJ %**, **Bust %** computed from the Poisson distribution for current N.
- **Payout preview grid** for each total 15–21 at current stake.

## 7. Settlement

- **Trigger**: live. A bet becomes eligible to settle when every team in it has a completed game (status = Final / Game Over).
- Engine sums actual runs, applies void rules, classifies outcome, computes payout, credits balance.
- Settlement is **idempotent** per bet. Re-runs don't double-credit.
- Settled bets move from **Open bets** to **Closed bets** with an outcome chip (Win / BJ / Short / Bust). *(Not yet implemented.)*

## 8. UI — Screens (v0)

Two authenticated-esque pages under `/play` (plus public landing at `/`):

### 8.1 Shared header
Brand wordmark · **Bet / My Bets** nav tabs · current tier · balance · dev-user switcher. Persists across both pages.

### 8.2 `/play` — Bet submission
1. **Open bets pill** — compact banner `N open bets · View my bets →` when the user has any open bets; hidden otherwise.
2. **Today's slate** — game card grid. Each card shows team colors, name, and either pregame flavor (pitcher, ERA, venue, start time) or **live overlay** (status chip, current inning, per-team runs) once that game has started. Clicking a team row toggles it into the current pick set, subject to cross-bet team lock.
3. **Bet controls** — picks summary, tier-gated stake selector, payout preview grid (15–21), win/BJ/bust %, Place bet.

### 8.3 `/play/my-bets` — My dashboard
1. **Dashboard card** — identity, balance, tier, available stakes, dev controls (balance adjusters, clear bets). Dev controls must be removable before any public launch.
2. **Open bets** — live-updating list of unsettled bets. Each row shows per-team chips with runs + game-status indicators (`F`, live inning, `VOID`, pregame dash), running total vs. 21, win/BJ %, Cancel (pregame refund) or Settle (once all games are final/voided), plus a dev force-settle form for mock runs.
3. **Closed bets** — settled history with Win / Blackjack / Short / Bust chip, stake, payout, net. Collapsible past three rows.

No other pages in v0.

## 9. Data Sources

- **MLB Stats API** (`statsapi.mlb.com`) — free, no auth.
  - `/schedule?sportId=1&date=…&hydrate=linescore,probablePitcher` — cached 5 min.
  - `/teams?sportId=1` — cached 24 h.
  - `/people?personIds=…&hydrate=stats(group=pitching,type=[season,yearByYear])` — cached 1 h. Falls back to most recent `yearByYear` split during Opening Week when the current season has no games played.

## 10. Tech Stack (v0)

- **Frontend**: Next.js 16 (App Router, Server Components, Turbopack) + React + Tailwind.
- **State**: `useState` + `localStorage` keyed by `play21.user.{userId}` and `play21.bets.{userId}`.
- **Repo**: `jchouse112/21Games`, monorepo with `apps/web`.
- **Deploy**: Vercel.
- **No backend, no database, no auth server in v0.**

## 11. Milestone Punch List

| # | Feature | State |
|---|---|---|
| 1 | Landing page | ✓ done |
| 2 | Dev user switcher + tiers | ✓ done |
| 3 | MLB slate loader (schedule + teams) | ✓ done |
| 4 | Game cards w/ pitcher + ERA + team colors | ✓ done |
| 5 | Bet form + odds preview | ✓ done |
| 6 | Multi-bet + cross-bet team lock + same-matchup picks | ✓ done |
| 7 | **Settlement engine (mock scores first, then live)** | **next** |
| 8 | Closed bets section | after #7 |
| 9 | Void handling for postponed / suspended games | after #7 |
| 10 | Pick lock: disable teams whose game has started | pre-launch |
| 11 | Midnight refill job at zero balance | pre-launch |
| 12 | Remove dev controls, deploy to custom domain | pre-launch |

## 12. Open Questions (assumptions to confirm)

Each of these is a default I chose while drafting. Flip any that are wrong.

1. **Business model**: free-to-play, tokens only, no cash-out, no purchase. Monetization deferred post-v0.
2. **Platform naming**: "Play 21 Games" is platform-level; MLB is the first (and only v0) game.
3. **Settlement timing**: live per-bet (not batched overnight).
4. **Auth**: dev switcher only in v0; real auth is v1.
5. **Void behavior**: voided team = 0 runs (simpler than BBJ's "drop from hand and recompute multiplier"). Confirm.
6. **Stat-correction policy**: no retro-settlement after balance is credited.
7. **Max concurrent open bets per user per slate**: unbounded (capped only by balance + team-lock).
8. **Refresh cadence during game windows**: 5 min schedule cache sufficient, or need per-game polling for linescores?
9. **Pick window close**: per-game (once a specific game starts) rather than slate-wide (once the earliest game starts).
10. **Dev control removal**: dev user switcher and balance adjusters are removed entirely before any non-internal release.
