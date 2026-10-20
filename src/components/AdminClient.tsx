"use client";
import { useEffect, useState } from "react";
import { api, useToast } from "./ui";

type U = { id: string; email: string | null; plan: string; access_until: string | null; access_note: string | null; requested_at: string | null; hf_key_hint: string | null; stripe_customer_id: string | null; created_at: string; access: { ok: boolean; reason: string }; brands: string[] };

export function AdminClient({ ig, stripe }: { ig: boolean; stripe: boolean }) {
  const [users, setUsers] = useState<U[]>([]); const [busy, setBusy] = useState<string | null>(null); const toast = useToast();
  async function load() { try { const r = await api<{ users: U[] }>("/api/admin/users", "GET"); setUsers(r.users); } catch (err) { toast((err as Error).message); } }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  async function grant(u: U, days?: number, revoke?: boolean) {
    setBusy(u.id);
    try { await api("/api/admin/grant", "POST", { userId: u.id, days, revoke }); toast(revoke ? "Access revoked." : `Granted ${days} days.`); await load(); }
    catch (err) { toast((err as Error).message); } finally { setBusy(null); }
  }
  const pending = users.filter((u) => u.requested_at && !u.access.ok);
  const fmtD = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
  return (
    <div className="grid gap-8">
      <div><div className="sechead"><h2>Admin</h2><span className="lbl">{users.length} accounts · {pending.length} waiting</span></div>
        <p className="intro">Grant access by hand after a customer pays you (Whish, OMT, bank, cash) — or let Stripe do it when it&rsquo;s configured. Days add to any time left.</p></div>
      <div className="flex gap-2 flex-wrap"><span className="chip">Stripe {stripe ? "on" : "off"}</span><span className="chip">Instagram {ig ? "on" : "off"}</span></div>
      {pending.length > 0 && (
        <div className="grid gap-3"><span className="lbl">Waiting for access</span>
          <div className="grid gap-2">{pending.map((u) => <div key={u.id} className="panel md:flex md:items-center md:justify-between"><div><div className="font-semibold">{u.email}</div><div className="lbl">asked {fmtD(u.requested_at)} · signed up {fmtD(u.created_at)}</div></div><div className="flex gap-2 flex-wrap mt-2 md:mt-0">{[30, 90, 365].map((d) => <button key={d} className="btn sm accent" disabled={busy === u.id} onClick={() => grant(u, d)}>+{d} days</button>)}</div></div>)}</div>
        </div>
      )}
      <div className="card overflow-x-auto"><table className="t min-w-[860px]"><thead><tr><th>Account</th><th>Access</th><th>Until</th><th>Key</th><th>Brands</th><th>Joined</th><th></th></tr></thead><tbody>
        {users.map((u) => <tr key={u.id}>
          <td><div className="font-medium">{u.email}</div>{u.access_note && <div className="lbl">{u.access_note}</div>}</td>
          <td><span className="pill" style={{ color: u.access.ok ? "var(--good)" : "var(--muted)" }}>{u.plan === "active" ? "Stripe" : u.access.ok ? "Granted" : u.requested_at ? "Waiting" : "Locked"}</span></td>
          <td className="tabular-nums">{u.plan === "active" ? "subscription" : fmtD(u.access_until)}</td>
          <td>{u.hf_key_hint ? <span style={{ color: "var(--good)" }}>{u.hf_key_hint}</span> : <span className="text-muted">none</span>}</td>
          <td className="text-muted">{u.brands.join(", ") || "—"}</td>
          <td className="tabular-nums">{fmtD(u.created_at)}</td>
          <td><div className="flex gap-1 justify-end">{[30, 90].map((d) => <button key={d} className="btn sm ghost" disabled={busy === u.id} onClick={() => grant(u, d)}>+{d}</button>)}{u.access_until && <button className="linkbtn danger" disabled={busy === u.id} onClick={() => grant(u, undefined, true)}>Revoke</button>}</div></td>
        </tr>)}
      </tbody></table></div>
    </div>
  );
}
