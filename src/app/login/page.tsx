"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const next = params.get("next") || "/brands";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const sb = supabaseBrowser();
    try {
      if (mode === "signup") {
        const { error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        setMsg("Check your inbox to confirm your email, then sign in.");
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.href = next;
      }
    } catch (err) { setMsg((err as Error).message); } finally { setBusy(false); }
  }
  async function magic() {
    setBusy(true); setMsg("");
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
    setMsg(error ? error.message : "Magic link sent. Open it on this device.");
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="panel w-full max-w-sm">
      <div className="font-bold tracking-[.32em]">ATELIER</div>
      <p className="text-sm text-muted">{mode === "signup" ? "Create your account, then request access. Generations run on your own Higgsfield key." : "Welcome back."}</p>
      <div className="flex gap-2">{(["signin", "signup"] as const).map((m) => <button key={m} type="button" className={"btn sm " + (mode === m ? "" : "ghost")} onClick={() => setMode(m)}>{m === "signin" ? "Sign in" : "Create account"}</button>)}</div>
      <label className="field"><span className="lbl">Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label className="field"><span className="lbl">Password</span><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
      <button className="btn" disabled={busy}>{mode === "signin" ? "Sign in" : "Create account"}</button>
      <button type="button" className="linkbtn" disabled={busy || !email} onClick={magic}>Email me a magic link instead</button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </form>
  );
}

export default function Login() {
  return <main className="min-h-screen grid place-items-center px-4 glow"><Suspense><LoginForm /></Suspense></main>;
}
