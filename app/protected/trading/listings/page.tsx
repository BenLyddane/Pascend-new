import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ListingsClient } from "./listings-client";

export default async function ListingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  return <ListingsClient userId={user.id} />;
}
