import { redirect } from "next/navigation";

export default function ProfilePage() {
  redirect("/protected/profile/basic");
}
