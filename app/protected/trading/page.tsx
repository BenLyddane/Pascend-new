import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import TradingClient from "./trading-client";

export default async function TradingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2">
      <TradingClient userId={user.id} />
    </div>
  );
}
