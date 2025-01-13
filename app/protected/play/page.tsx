import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PlayClient from "./play-client";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  return <PlayClient />;
}
