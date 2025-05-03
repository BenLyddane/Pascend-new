import { redirect } from "next/navigation";

export default function PlayPage() {
  // Redirect to practice mode by default
  redirect("/protected/play/practice");
}
