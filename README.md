# Viber Predict — REBORN 🔥

> The judges dealt us the restart card mid-hackathon, so this is build #2: new repo, new on-chain program, new Neon database, new Vercel project.

Prediction market on Solana, built at the Superteam Kazakhstan × Solana × Viber hackathon (Astana, 30 Sep 2026, 2 hours of build).
Anyone creates a YES/NO market, anyone bets SOL on either side, winners split the pool.

**Network: Solana DEVNET only.** No mainnet in this build.

## Live

- Web: https://viber-predict-reborn.vercel.app (Vercel project `viber-predict-reborn`)
- Mobile: Android APK for Solana Seeker (`apps/mobile`, package `app.viberreborn.predict`), installed over USB

## How it works

Parimutuel pool, SOL collateral:

1. `create_market` — anyone opens a YES/NO question with a close time.
2. `place_bet(side, lamports)` — SOL goes into the market vault until close.
3. `resolve(outcome)` — the creator resolves after close (admin can override if the creator is silent).
4. `claim` — winners get `stake / winning_pool × total_pool`, minus 2% fee (1% creator, 1% treasury).
5. `void` — market cancelled, everyone refunded. Auto-void if nobody bet on the winning side.

Shown to users: chance of YES = YES pool / total pool; payout multiplier = 0.98 / chance.

Guardrails: bet 0.001–1 SOL, checked arithmetic, PDA + owner checks on every account, double-claim blocked.
Resolve: creator after close, admin (`BK4T…PRHc`) any time. Fees go to the creator and the treasury (= admin).

## Repository layout

```
programs/prediction   native Solana program (Rust, solana-program 2.3, no Anchor)
packages/sdk          TS client: PDAs, decoders, ix builders, payout math — shared by web and mobile
                      (`@reborn/sdk`, vendored into apps/web/vendor as a tarball: run `pnpm sdk` in apps/web after editing)
apps/web              Next.js (App Router) + Tailwind + Solana wallet-adapter → Vercel
apps/mobile           Expo 54 dev build + Mobile Wallet Adapter → APK for Seeker
scripts/              helper scripts (android-env.sh)
keys/                 program keypair — gitignored, never commit
```

Some folders appear as the hackathon progresses; check git log.

## Accounts (on-chain)

| Account | PDA seeds | Holds |
|---|---|---|
| `Market` (282 B) | `["market", creator, id u64 LE]` | creator, end_ts, yes/no pools, bettors, status, outcome, question (≤200 B); **also holds the pool SOL** |
| `Position` (84 B) | `["position", market, user]` | yes/no stake, claimed flag |

Instructions (first data byte): `0 create_market`, `1 place_bet`, `2 resolve`, `3 claim`, `4 void`. Fee 2%, max bet 1 SOL — constants in the program.
Devnet e2e check: `cd packages/sdk && HELIUS_API_KEY=… KEYPAIR=… pnpm smoke`.
Season 2 markets + crowd: `CROWD=30 FUND=0.09 APP_URL=… pnpm crowd` (same env) — voids old markets, opens fresh ones, funds devnet wallets from the admin (keys in `keys/crowd.json`, gitignored) and places real micro-bets, each indexed into Neon.

Program ID (devnet): `HqSA9nbfscPV8x3Md7wxW7o1wJp2Y8QDnP8ueGeEgJqa`
Deployer / admin wallet: `BK4Tt9kZfazEs3DRzyygpDKP4mN7PyuWduUEJStUPRHc`

## RPC and load

- Primary RPC: Helius devnet. The API key lives only in server env (`HELIUS_API_KEY`), never in client code or the APK.
- Clients read markets from `/api/markets` (CDN cache 3–5 s) instead of calling `getProgramAccounts` directly — one RPC call per few seconds regardless of user count.
- `/api/rpc` proxies RPC calls for the web app and the APK.
- Every transaction carries a priority fee.

## Backend (Next.js API on Vercel, Neon Postgres)

| Route | What |
|---|---|
| `GET /api/markets` | all markets from chain + tag/source from Neon, CDN 3 s |
| `GET /api/markets/:pubkey` | one market fresh from chain + last 50 events |
| `GET /api/positions?owner=` | user positions with claimable SOL |
| `POST /api/rpc` | allow-listed JSON-RPC proxy to Helius devnet |
| `POST /api/index {signature, tag?, source?}` | client calls after a confirmed tx; server re-reads the tx and stores program events in Neon |
| `GET /api/activity?market=&wallet=` | indexed event feed |
| `GET /api/leaderboard` | top wallets by SOL wagered |
| `GET /api/health` | RPC / program / DB status |

Neon: `DATABASE_URL` env var (Vercel Marketplace → Neon). Tables are created on first request. Without it, chain routes still work; feed/leaderboard are empty.

## Wallets

- Web: `@solana/wallet-adapter` (Phantom, Solflare, Backpack via Wallet Standard; MWA in Android Chrome).
- Seeker: Mobile Wallet Adapter (Seed Vault Wallet, Phantom, Solflare). Stack copied from a working Seeker app: Expo 54, RN 0.81.5, `@solana-mobile/mobile-wallet-adapter-protocol` 2.2.6 + postinstall patch. Authorize with chain `solana:devnet`.

## Design (Reborn)

Warm monochrome, dark-native: page `#0E0D0C`, cards `#161413`, hairlines `#262321`, text `#EDE9E4`, muted `#8A847D`.
One accent: ember `#FF8A3D` (primary CTA, active tab, charts). YES `#3FCF8E` / NO `#F2555A` only for odds.
Fonts: Manrope (everything, 3 weights), JetBrains Mono (numbers, SOL, addresses). Radius by role: cards 12px, controls 8px, chips 6px. No gradients, glows or decorative motion.
Logo: phoenix mark (`public/mark.svg`, source in `src/lib/brand.ts`); PNG lockup at `/logo`.

## Run locally

```bash
cd apps/web
pnpm install
cp .env.example .env.local   # fill HELIUS_API_KEY
pnpm dev
```

Program:

```bash
anchor build
anchor deploy --provider.cluster devnet
```

Mobile (needs JDK 17 + Android SDK, Seeker connected by USB) — release APK with bundled JS:

```bash
source scripts/android-env.sh
cd apps/mobile && npx expo prebuild -p android
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/release/app-release.apk
```

Wallets: Mobile Wallet Adapter (Seed Vault Wallet, Phantom, Solflare, Backpack). `authorize` sends both `chain: solana:devnet` and `cluster: devnet` — Phantom reads the latter. `/.well-known/assetlinks.json` (served by `apps/web`) verifies the APK signing cert so wallets don't flag the app.

## Deploy

Rule for this project: **every change is deployed to Vercel right away.**

```bash
cd apps/web
vercel deploy --prod --yes
```

Env vars on Vercel: `HELIUS_API_KEY`.

## Secrets

Never commit `.env*`, `keys/`, or any keypair JSON. They are in `.gitignore`.
