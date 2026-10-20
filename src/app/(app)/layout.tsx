import Link from "next/link";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui";
import { entitled, trialDaysLeft, billingEnabled } from "@/lib/billing";
import { SignOut } from "@/components/SignOut";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const { data: prof } = await supabaseAdmin().from("profiles").select("plan,trial_ends_at,hf_key_hint").eq("id", user.id).single();
  const ent = prof ? entitled(prof) : { ok: true, reason: "" };
  const days = prof ? trialDaysLeft(prof) : 0;
  return (
    <ToastProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 bg-bg border-b border-line">
          <div className="mx-auto max-w-7xl px-4 flex items-center justify-between gap-4 py-3 flex-wrap">
            <Link href="/brands" className="font-bold tracking-[.32em]">ATELIER</Link>
            <div className="flex items-center gap-4 flex-wrap">
              {prof && !prof.hf_key_hint && <Link href="/settings" className="lbl" style={{ color: "var(--warn)" }}>● Add your Higgsfield key</Link>}
              {prof && billingEnabled() && prof.plan === "trial" && <Link href="/settings" className="lbl">{ent.ok ? `Trial · ${days} day${days === 1 ? "" : "s"} left` : "Trial ended"}</Link>}
              <Link href="/settings" className="lbl">Settings</Link>
              <SignOut />
            </div>
          </div>
        </header>
        {!ent.ok && <div className="mx-auto max-w-7xl px-4 pt-4"><div className="rule" style={{ borderColor: "var(--bad)" }}>{ent.reason} <Link href="/settings" className="underline">Go to billing.</Link></div></div>}
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
