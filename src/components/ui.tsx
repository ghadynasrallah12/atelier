"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Kind = "" | "ok" | "bad";
const ToastCtx = createContext<(m: string, kind?: Kind) => void>(() => {});
const looksBad = (m: string) => /fail|error|reject|refused|not |can't|cannot|empty|missing|invalid|forbidden|first\./i.test(m);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ m: string; k: Kind } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((m: string, kind?: Kind) => { setMsg({ m, k: kind ?? (looksBad(m) ? "bad" : /saved|queued|done|sent|set|added|synced|verified|removed|connected|→/i.test(m) ? "ok" : "") }); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 3200); }, []);
  return <ToastCtx.Provider value={toast}>{children}{msg && <div className={"toast " + msg.k} role="status">{msg.m}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

/** POST/PATCH/DELETE JSON to our API and surface errors as toasts. */
export async function api<T = unknown>(path: string, method: string, body?: unknown, form?: FormData): Promise<T> {
  const res = await fetch(path, { method, headers: form || method === "GET" ? undefined : { "content-type": "application/json" }, body: form ?? (body === undefined || method === "GET" ? undefined : JSON.stringify(body)) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export function Lbl({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <span className={"lbl " + className}>{children}</span>; }

export function SecHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return <div className="sechead"><h2>{title}</h2>{right}</div>;
}

/** Two-tap delete: first tap arms, second confirms (the viewer shows no confirm dialogs). */
export function DangerButton({ onConfirm, children = "Delete", className = "linkbtn danger" }: { onConfirm: () => void; children?: React.ReactNode; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  return <button type="button" className={className} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>{armed ? "Confirm" : children}</button>;
}

export const fmt = (n: number | null | undefined) => (n == null || isNaN(n) ? "—" : Math.abs(n) >= 10000 ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n) : new Intl.NumberFormat("en-US").format(Math.round(n)));
export const pct = (x: number | null | undefined) => (x == null || !isFinite(x) ? "—" : (x * 100).toFixed(x < 0.1 ? 1 : 0) + "%");
