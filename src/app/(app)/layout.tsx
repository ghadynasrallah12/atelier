import { requireProfile } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui";
import { Sidebar } from "@/components/Sidebar";
import { Locked } from "@/components/Locked";
import { daysLeft, PRICE, billingEnabled, CONTACT } from "@/lib/billing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { sb, profile, access, admin } = await requireProfile();
  const { data: brands } = await sb.from("brands").select("id,name").order("created_at");
  const d = daysLeft(profile);
  const accessLabel = admin ? "Admin" : profile.plan === "active" ? "Member" : d != null && access.ok ? `Access · ${d} day${d === 1 ? "" : "s"} left` : null;
  return (
    <ToastProvider>
      <Sidebar brands={brands || []} email={profile.email || ""} admin={admin} locked={!access.ok} keyMissing={!profile.hf_key_hint} accessLabel={accessLabel} />
      <main className="md:pl-[232px] min-h-screen">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8 py-6 md:py-8">
          {access.ok ? children : <Locked reason={access.reason} requested={!!profile.requested_at} email={profile.email || ""} price={PRICE()} billing={billingEnabled()} contact={CONTACT()} />}
        </div>
      </main>
    </ToastProvider>
  );
}
