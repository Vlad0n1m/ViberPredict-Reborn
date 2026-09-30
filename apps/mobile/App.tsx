import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { claimIx, placeBetIx } from "@reborn/sdk";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  chance, closesIn, getMarket, getMarkets, getPositions, multiplier, payoutFor, short, solscanTx, total,
  type Market, type MarketEvent, type Position, type Side,
} from "./src/api";
import { c, mono } from "./src/theme";
import { WalletProvider, useWallet } from "./src/wallet";

type Route = { tab: "markets" | "positions"; market?: string };

export default function App() {
  return (
    <SafeAreaProvider>
      <WalletProvider>
        <StatusBar style="light" />
        <Shell />
      </WalletProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const [route, setRoute] = useState<Route>({ tab: "markets" });
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (route.market) {
        setRoute({ tab: route.tab });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route]);

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <Header />
      <View style={{ flex: 1 }}>
        {route.market ? (
          <MarketScreen id={route.market} onBack={() => setRoute({ tab: route.tab })} />
        ) : route.tab === "markets" ? (
          <MarketsScreen open={(id) => setRoute({ tab: "markets", market: id })} />
        ) : (
          <PositionsScreen open={(id) => setRoute({ tab: "positions", market: id })} />
        )}
      </View>
      <View style={s.tabs}>
        {(["markets", "positions"] as const).map((t) => (
          <Pressable key={t} onPress={() => setRoute({ tab: t })} style={s.tab}>
            <Text style={[s.tabText, route.tab === t && !route.market && { color: c.flame }]}>{t === "markets" ? "Markets" : "Positions"}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Header() {
  const { pubkey, balance, busy, connect, disconnect } = useWallet();
  const [err, setErr] = useState("");
  return (
    <View>
      <View style={s.header}>
        <View style={s.row}>
          <Image source={require("./assets/icon.png")} style={{ width: 26, height: 26, borderRadius: 6 }} />
          <Text style={s.logo}>
            viber <Text style={{ color: c.muted }}>reborn</Text>
          </Text>
        </View>
        {pubkey ? (
          <Pressable onLongPress={disconnect} style={s.walletBtn}>
            <View style={[s.dot, { backgroundColor: c.yes }]} />
            <Text style={s.walletText}>
              {short(pubkey.toBase58())} · {balance === null ? "…" : balance.toFixed(3)}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={busy}
            onPress={() => {
              setErr("");
              connect().catch((e) => setErr(String(e?.message ?? e)));
            }}
            style={s.walletBtn}
          >
            {busy ? <ActivityIndicator color={c.fg} size="small" /> : <Text style={s.walletText}>Connect</Text>}
          </Pressable>
        )}
      </View>
      {!!err && <Text style={[s.err, { marginHorizontal: 16 }]}>{err}</Text>}
    </View>
  );
}

function usePoll<T>(load: () => Promise<T>, ms: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const run = useCallback(async () => {
    try {
      setData(await load());
      setError("");
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [load]);
  useEffect(() => {
    run();
    const id = setInterval(run, ms);
    return () => clearInterval(id);
  }, [run, ms]);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);
  return { data, error, refreshing, refresh };
}

function MarketsScreen({ open }: { open: (id: string) => void }) {
  const { data, error, refreshing, refresh } = usePoll(getMarkets, 6000);
  const live = (data ?? []).filter((m) => m.status === "active").sort((a, b) => total(b) - total(a));
  return (
    <ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.flame} />}>
      <View style={s.hero}>
        <Text style={s.kicker}>● Build #2 · devnet</Text>
        <Text style={s.h1}>Reborn.</Text>
        <Text style={s.lead}>
          <Text style={{ color: c.fg }}>We are back to business.</Text> The judges dealt us the restart card — new program, new database, rebuilt from zero.
        </Text>
      </View>
      <View style={[s.row, { justifyContent: "space-between", marginBottom: 10 }]}>
        <Text style={s.h2}>Markets</Text>
        <Text style={s.meta}>{data ? `${live.length} live` : ""}</Text>
      </View>
      {!data && !error && <ActivityIndicator color={c.flame} style={{ marginTop: 24 }} />}
      {!!error && !data && <Text style={s.err}>{error}</Text>}
      {live.map((m) => (
        <MarketCard key={m.id} m={m} onPress={() => open(m.id)} />
      ))}
    </ScrollView>
  );
}

function MarketCard({ m, onPress }: { m: Market; onPress: () => void }) {
  const p = chance(m);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { backgroundColor: c.raised }]}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.meta}>{m.tag}</Text>
        <Text style={s.meta}>{closesIn(m.endTs)}</Text>
      </View>
      <Text style={s.q}>{m.question}</Text>
      <View style={[s.row, { justifyContent: "space-between", alignItems: "baseline" }]}>
        <Text style={s.pct}>
          {p}
          <Text style={{ fontSize: 14, color: c.muted }}>%</Text>
        </Text>
        <Text style={s.meta}>{total(m).toFixed(3)} SOL</Text>
      </View>
      <Bar p={p} />
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={[s.metaMono, { color: c.yes }]}>Yes {multiplier(m, "yes").toFixed(2)}×</Text>
        <Text style={[s.metaMono, { color: c.no }]}>No {multiplier(m, "no").toFixed(2)}×</Text>
      </View>
    </Pressable>
  );
}

function Bar({ p }: { p: number }) {
  return (
    <View style={s.bar}>
      <View style={{ width: `${p}%`, backgroundColor: c.yes }} />
      <View style={{ flex: 1, backgroundColor: c.no, opacity: 0.7 }} />
    </View>
  );
}

function MarketScreen({ id, onBack }: { id: string; onBack: () => void }) {
  const load = useCallback(() => getMarket(id), [id]);
  const { data, refreshing, refresh } = usePoll(load, 4000);
  if (!data) return <ActivityIndicator color={c.flame} style={{ marginTop: 40 }} />;
  const m = data.market;
  const p = chance(m);
  return (
    <ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.flame} />}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={[s.meta, { marginBottom: 12 }]}>← All markets</Text>
      </Pressable>
      <Text style={s.meta}>
        {m.tag} · {m.status === "active" ? `closes in ${closesIn(m.endTs)}` : m.status === "awaiting" ? "awaiting result" : `resolved ${m.outcome?.toUpperCase()}`}
      </Text>
      <Text style={s.title}>{m.question}</Text>
      <View style={s.card}>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
          <Text style={[s.pct, { fontSize: 48 }]}>
            {p}
            <Text style={{ fontSize: 20, color: c.muted }}>%</Text>
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.metaMono}>{total(m).toFixed(3)} SOL</Text>
            <Text style={s.meta}>{m.bettors} bettors · 2% fee</Text>
          </View>
        </View>
        <Bar p={p} />
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={[s.metaMono, { color: c.yes }]}>Yes · {m.yesPool.toFixed(3)}</Text>
          <Text style={[s.metaMono, { color: c.no }]}>No · {m.noPool.toFixed(3)}</Text>
        </View>
      </View>
      <BetPanel m={m} onDone={refresh} />
      {!!m.source && <Text style={[s.meta, { marginTop: 4 }]}>Resolves by: {m.source}</Text>}
      <Activity events={data.events} />
    </ScrollView>
  );
}

function BetPanel({ m, onDone }: { m: Market; onDone: () => void }) {
  const { pubkey, balance, busy, connect, send } = useWallet();
  const [side, setSide] = useState<Side>("yes");
  const [amount, setAmount] = useState(0.05);
  const [result, setResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const open = m.status === "active";

  async function bet() {
    setResult(null);
    try {
      if (!pubkey) return await connect();
      const sig = await send([placeBetIx(pubkey, new PublicKey(m.id), side, Math.round(amount * LAMPORTS_PER_SOL))]);
      setResult({ ok: true, text: `${amount} SOL on ${side === "yes" ? "Yes" : "No"} confirmed on devnet.`, sig });
      onDone();
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <View style={s.card}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.h3}>Place a bet</Text>
        {pubkey && <Text style={s.metaMono}>{balance === null ? "…" : balance.toFixed(3)} SOL</Text>}
      </View>
      <View style={s.seg}>
        {(["yes", "no"] as const).map((x) => {
          const on = side === x;
          const col = x === "yes" ? c.yes : c.no;
          return (
            <Pressable key={x} onPress={() => setSide(x)} style={[s.segBtn, on && { backgroundColor: x === "yes" ? c.yesSoft : c.noSoft, borderColor: col }]}>
              <Text style={{ color: on ? col : c.muted, fontWeight: "700" }}>
                {x === "yes" ? "Yes" : "No"} · {multiplier(m, x) ? `${multiplier(m, x).toFixed(2)}×` : "—"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[s.row, { gap: 8 }]}>
        {[0.01, 0.05, 0.1, 0.5].map((v) => (
          <Pressable key={v} onPress={() => setAmount(v)} style={[s.chip, amount === v && { backgroundColor: c.line }]}>
            <Text style={[s.metaMono, { color: amount === v ? c.fg : c.muted }]}>{v}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.meta}>You get if {side === "yes" ? "Yes" : "No"}</Text>
        <Text style={s.metaMono}>{payoutFor(m, side, amount).toFixed(3)} SOL</Text>
      </View>
      <Pressable disabled={!open || busy} onPress={bet} style={({ pressed }) => [s.cta, (!open || busy) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
        {busy ? (
          <ActivityIndicator color={c.paper} />
        ) : (
          <Text style={s.ctaText}>{!open ? "Betting closed" : !pubkey ? "Connect wallet" : `Bet ${amount} SOL on ${side === "yes" ? "Yes" : "No"}`}</Text>
        )}
      </Pressable>
      {result && (
        <View style={[s.note, { backgroundColor: result.ok ? c.yesSoft : c.noSoft }]}>
          <Text style={{ color: result.ok ? c.yes : c.no, fontSize: 13 }}>{result.text}</Text>
          {result.sig && (
            <Pressable onPress={() => Linking.openURL(solscanTx(result.sig!))}>
              <Text style={[s.metaMono, { color: c.flame, marginTop: 4 }]}>View on Solscan → {result.sig.slice(0, 10)}…</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function Activity({ events }: { events: MarketEvent[] }) {
  return (
    <View style={[s.card, { marginTop: 12 }]}>
      <Text style={s.h3}>Live activity</Text>
      {events.length === 0 && <Text style={s.meta}>No bets yet.</Text>}
      {events.slice(0, 15).map((e) => (
        <Pressable key={e.signature + e.kind} onPress={() => Linking.openURL(solscanTx(e.signature))} style={[s.row, s.eventRow]}>
          <Text style={[s.metaMono, { width: 44, color: e.side === "yes" ? c.yes : e.side === "no" ? c.no : c.muted }]}>{(e.kind === "bet" ? e.side : e.kind)?.toUpperCase()}</Text>
          <Text style={[s.metaMono, { flex: 1 }]}>{short(e.wallet)}</Text>
          <Text style={s.metaMono}>{e.kind === "bet" ? `${e.sol.toFixed(3)} SOL` : ""}</Text>
          <Text style={[s.metaMono, { color: c.flame, marginLeft: 10 }]}>tx ↗</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PositionsScreen({ open }: { open: (id: string) => void }) {
  const { pubkey, connect, busy } = useWallet();
  const owner = pubkey?.toBase58();
  const load = useCallback(() => (owner ? getPositions(owner) : Promise.resolve([] as Position[])), [owner]);
  const { data, refreshing, refresh } = usePoll(load, 8000);

  if (!pubkey) {
    return (
      <View style={s.page}>
        <Text style={s.title}>Your bets</Text>
        <View style={s.card}>
          <Text style={s.lead}>Connect Seed Vault, Phantom or any Solana wallet on this Seeker.</Text>
          <Pressable disabled={busy} onPress={() => connect().catch(() => {})} style={s.cta}>
            <Text style={s.ctaText}>Connect wallet</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  const list = data ?? [];
  return (
    <ScrollView contentContainerStyle={s.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.flame} />}>
      <Text style={s.title}>Your bets</Text>
      {!data && <ActivityIndicator color={c.flame} />}
      {data && list.length === 0 && <Text style={s.meta}>No bets yet — pick a market.</Text>}
      {list.map((p) => (
        <PositionRow key={p.position} p={p} open={() => open(p.marketId)} onDone={refresh} />
      ))}
    </ScrollView>
  );
}

function PositionRow({ p, open, onDone }: { p: Position; open: () => void; onDone: () => void }) {
  const { pubkey, send, busy } = useWallet();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const m = p.market;
  const side: Side = p.yes >= p.no ? "yes" : "no";
  const stake = p.yes + p.no;
  const state = m.status === "resolved" ? (p.claimed ? "claimed" : p.claimable > 0 ? (m.outcome === "void" ? "refund" : "won") : "lost") : closesIn(m.endTs);

  async function claim() {
    try {
      const sig = await send([claimIx(pubkey!, new PublicKey(p.marketId), new PublicKey(m.creator))]);
      setMsg({ ok: true, text: `Claimed ${p.claimable.toFixed(3)} SOL.`, sig });
      onDone();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  return (
    <Pressable onPress={open} style={s.card}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={[s.metaMono, { color: side === "yes" ? c.yes : c.no }]}>{side.toUpperCase()}</Text>
        <Text style={s.meta}>{state}</Text>
      </View>
      <Text style={s.q}>{m.question}</Text>
      <Text style={s.metaMono}>
        {stake.toFixed(3)} SOL · now {side === "yes" ? chance(m) : 100 - chance(m)}%
      </Text>
      {p.claimable > 0 && !p.claimed && (
        <Pressable disabled={busy} onPress={claim} style={[s.cta, busy && { opacity: 0.5 }]}>
          <Text style={s.ctaText}>Claim {p.claimable.toFixed(3)} SOL</Text>
        </Pressable>
      )}
      {msg && (
        <Pressable disabled={!msg.sig} onPress={() => msg.sig && Linking.openURL(solscanTx(msg.sig))}>
          <Text style={{ color: msg.ok ? c.yes : c.no, fontSize: 13 }}>
            {msg.text} {msg.sig ? "Solscan ↗" : ""}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.paper },
  row: { flexDirection: "row", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 56, borderBottomWidth: 1, borderColor: c.line },
  logo: { color: c.fg, fontSize: 15, fontWeight: "700", marginLeft: 8 },
  walletBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: c.line, borderRadius: 8, paddingHorizontal: 12, height: 34, minWidth: 80, justifyContent: "center" },
  walletText: { color: c.fg, fontSize: 12, fontFamily: mono },
  dot: { width: 6, height: 6, borderRadius: 3 },
  page: { padding: 16, paddingBottom: 40, gap: 12 },
  hero: { paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line, marginBottom: 8, gap: 8 },
  kicker: { color: c.muted, fontFamily: mono, fontSize: 12 },
  h1: { color: c.fg, fontSize: 56, fontWeight: "800", letterSpacing: -2 },
  lead: { color: c.muted, fontSize: 15, lineHeight: 22 },
  h2: { color: c.fg, fontSize: 18, fontWeight: "700" },
  h3: { color: c.fg, fontSize: 15, fontWeight: "700" },
  title: { color: c.fg, fontSize: 28, fontWeight: "700", letterSpacing: -0.5, lineHeight: 32, marginVertical: 8 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 16, gap: 12 },
  q: { color: c.fg, fontSize: 16, fontWeight: "600", lineHeight: 22 },
  pct: { color: c.fg, fontSize: 28, fontFamily: mono },
  meta: { color: c.muted, fontSize: 12 },
  metaMono: { color: c.muted, fontSize: 12, fontFamily: mono },
  bar: { flexDirection: "row", height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: c.line },
  seg: { flexDirection: "row", gap: 6, backgroundColor: c.paper, borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent" },
  chip: { flex: 1, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.line },
  cta: { height: 50, borderRadius: 10, backgroundColor: c.flame, alignItems: "center", justifyContent: "center" },
  ctaText: { color: c.paper, fontSize: 15, fontWeight: "700" },
  note: { borderRadius: 8, padding: 12 },
  err: { color: c.no, fontSize: 13 },
  eventRow: { paddingVertical: 8, borderTopWidth: 1, borderColor: c.line },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: c.line, backgroundColor: c.card },
  tab: { flex: 1, height: 52, alignItems: "center", justifyContent: "center" },
  tabText: { color: c.muted, fontSize: 13, fontWeight: "600" },
});
