import { redirect } from "next/navigation";

// La logique d'auth est gérée par le middleware ; on redirige vers la liste patients.
export default function Home() {
  redirect("/patients");
}
