# Agent notes — Viber Predict

Read README.md first: it has the architecture, accounts, program ID and layout.

Hard rules:
- Solana **devnet only**. Do not add mainnet endpoints, toggles or deploy scripts.
- After every change, deploy the web app: `cd apps/web && vercel deploy --prod --yes`. Report the URL.
- Secrets (`HELIUS_API_KEY`, `keys/*.json`, `.env*`) never go into code, commits or docs.
- Shared on-chain logic lives in `packages/sdk`; web and mobile import it, do not duplicate PDA/tx code.
- Mobile wallet: Mobile Wallet Adapter with chain `solana:devnet`; build with `npx expo run:android` (Expo dev build, not Expo Go).
- UI copy is English (judges read English). Design tokens are in README "Design".
- Commit messages: English, one full sentence saying what and why.
