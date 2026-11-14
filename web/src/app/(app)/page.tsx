import { redirect } from "next/navigation";

// The week planner will live here; until then, start in the recipe library.
export default function Home() {
  redirect("/recipes");
}
