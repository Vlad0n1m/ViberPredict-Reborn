// Mobile Wallet Adapter: one protocol for every Seeker wallet — Seed Vault Wallet, Phantom, Solflare, Backpack.
// Android shows the wallet chooser; we sign in the wallet and send through our devnet RPC.
import { transact, type Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { LAMPORTS_PER_SOL, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { buildTx, confirm, connection, index } from "./api";

const IDENTITY = { name: "Viber Reborn", uri: "https://viber-predict-reborn.vercel.app", icon: "icon.svg" };
const CHAIN = "solana:devnet";
// Phantom reads the legacy `cluster` field even on MWA v2, so send both.
const NETWORK = { chain: CHAIN, cluster: "devnet" } as const;

type Ctx = {
  pubkey: PublicKey | null;
  walletName: string | null;
  balance: number | null;
  busy: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (ixs: TransactionInstruction[], meta?: { tag?: string; source?: string }) => Promise<string>;
  refreshBalance: () => void;
};
const WalletCtx = createContext<Ctx>(null as unknown as Ctx);
export const useWallet = () => useContext(WalletCtx);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [pubkey, setPubkey] = useState<PublicKey | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshBalance = useCallback(() => {
    if (!pubkey) return setBalance(null);
    connection.getBalance(pubkey).then((l) => setBalance(l / LAMPORTS_PER_SOL)).catch(() => {});
  }, [pubkey]);
  useEffect(() => {
    refreshBalance();
    const id = setInterval(refreshBalance, 15000);
    return () => clearInterval(id);
  }, [refreshBalance]);

  const authorize = useCallback(
    async (w: Web3MobileWallet) => {
      const auth = authToken
        ? await w.reauthorize({ auth_token: authToken, identity: IDENTITY }).catch(() => w.authorize({ ...NETWORK, identity: IDENTITY } as Parameters<Web3MobileWallet["authorize"]>[0]))
        : await w.authorize({ ...NETWORK, identity: IDENTITY } as Parameters<Web3MobileWallet["authorize"]>[0]);
      const key = new PublicKey(Buffer.from(auth.accounts[0].address, "base64"));
      setAuthToken(auth.auth_token);
      setPubkey(key);
      setWalletName(auth.accounts[0].label ?? (auth as { wallet_uri_base?: string }).wallet_uri_base ?? "Wallet");
      return key;
    },
    [authToken],
  );

  const connect = useCallback(async () => {
    setBusy(true);
    try {
      await transact(authorize);
    } finally {
      setBusy(false);
    }
  }, [authorize]);

  const disconnect = useCallback(() => {
    const token = authToken;
    setPubkey(null);
    setAuthToken(null);
    setWalletName(null);
    if (token) transact((w) => w.deauthorize({ auth_token: token })).catch(() => {});
  }, [authToken]);

  const send = useCallback(
    async (ixs: TransactionInstruction[], meta?: { tag?: string; source?: string }) => {
      setBusy(true);
      try {
        let last = 0;
        const signature = await transact(async (w) => {
          const me = await authorize(w);
          const { tx, lastValidBlockHeight } = await buildTx(me, ixs);
          last = lastValidBlockHeight;
          try {
            const [signed] = await w.signTransactions({ transactions: [tx] });
            return await connection.sendRawTransaction(signed.serialize(), { preflightCommitment: "confirmed" });
          } catch (e) {
            // Wallets without sign-only support: let the wallet submit it on devnet.
            if (/not supported|unsupported|-32601/i.test(String(e))) {
              const [sig] = await w.signAndSendTransactions({ transactions: [tx] });
              return sig;
            }
            throw e;
          }
        });
        await confirm(signature, last);
        await index(signature, meta);
        setTimeout(refreshBalance, 800);
        return signature;
      } catch (e) {
        throw new Error(friendly(e));
      } finally {
        setBusy(false);
      }
    },
    [authorize, refreshBalance],
  );

  return <WalletCtx.Provider value={{ pubkey, walletName, balance, busy, connect, disconnect, send, refreshBalance }}>{children}</WalletCtx.Provider>;
}

function friendly(e: unknown) {
  const msg = String((e as Error)?.message ?? e);
  if (/declin|reject|cancel|CancellationException/i.test(msg)) return "Cancelled in the wallet.";
  if (/ERROR_WALLET_NOT_FOUND|no installed wallet/i.test(msg)) return "No Solana wallet found on this phone.";
  if (/insufficient|0x1\b|debit an account/i.test(msg)) return "Not enough devnet SOL.";
  const code = msg.match(/custom program error: 0x([0-9a-f]+)/i);
  if (code) return `Program error ${parseInt(code[1], 16)}`;
  return msg.length > 140 ? `${msg.slice(0, 140)}…` : msg;
}
