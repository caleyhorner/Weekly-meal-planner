import Link from "next/link";
import { notFound } from "next/navigation";
import { getParty } from "@/lib/parties";
import { dayName, shortDate } from "@/lib/week";
import { PartyDishes } from "./party-dishes";
import { PartyHeader } from "./party-header";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PartyPage({ params }: PageProps<"/parties/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const party = await getParty(id);
  if (!party) notFound();
  const when = party.date ? `${dayName(party.date)} ${shortDate(party.date)}` : "No date yet";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/parties" className="inline-flex min-h-11 items-center gap-1.5 font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Dinner parties
      </Link>
      <PartyHeader key={`${party.name}|${party.date}|${party.guests}`} party={party} when={when} />

      <section aria-labelledby="menu-heading" className="mt-6">
        <h2 id="menu-heading" className="mb-2 px-1 text-2xl font-extrabold">
          Menu
        </h2>
        <PartyDishes partyId={party.id} guests={party.guests} dishes={party.dishes} />
        <Link href={`/parties/${party.id}/pick`} className="btn-primary mt-3 w-full">
          Add a dish
        </Link>
      </section>

      {party.dishes.length > 0 && (
        <Link href={`/parties/${party.id}/list`} className="btn mt-6 w-full bg-ink text-bg">
          Shopping list for this party
        </Link>
      )}
    </div>
  );
}
