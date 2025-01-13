import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CreateCardForm from "./create-card-form";

async function getUserId() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/sign-in");
  }

  return user.id;
}

export default async function CreateCardPage() {
  const userId = await getUserId();
  const supabase = await createClient();

  // Fetch temp cards that haven't been "committed" yet
  const { data: tempCards, error: tempCardsError } = await supabase
    .from("temp_cards")
    .select("*")
    .eq("user_id", userId);

  if (tempCardsError) {
    console.error("Error fetching temp cards:", tempCardsError);
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <CreateCardForm userId={userId} initialTempCards={tempCards || []} />
    </div>
  );
}
