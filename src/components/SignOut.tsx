"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOut() {
  return <button className="linkbtn" onClick={async () => { await supabaseBrowser().auth.signOut(); location.href = "/"; }}>Sign out</button>;
}
