import { requireAdmin } from "@/lib/supabase/server";
import { AdminClient } from "@/components/AdminClient";
import { igEnabled } from "@/lib/instagram";
import { billingEnabled } from "@/lib/billing";

export default async function Admin() {
  await requireAdmin();
  return <AdminClient ig={igEnabled()} stripe={billingEnabled()} />;
}
