import Link from "next/link";
import { householdToday } from "@/lib/plan";
import { listParties, type PartySummary } from "@/lib/parties";
import { dayName, shortDate } from "@/lib/week";
import { NewParty } from "./new-party";

/** " (tomorrow)", " (in 5 days)" for a party in the next fortnight. */
function soon(date: string, today: string): string {
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  if (days < 0 || days >= 14) return "";
  return days === 0 ? " (today)" : days === 1 ? " (tomorrow)" : ` (in ${days} days)`;
}

function PartyCard({ party, today }: { party: PartySummary; today: string }) {
  const when = party.date ? `${dayName(party.date)} ${shortDate(party.date)}${soon(party.date, today)}` : "No date yet";
  return (
    <li>
      <Link href={`/parties/${party.id}`} className="card block p-4 transition-colors hover:bg-surface-2">
        <span className="block text-[21px] leading-snug font-bold">{party.name}</span>
        <span className="mt-1 block text-[15px] text-muted">
          {when}. {party.guests} {party.guests === 1 ? "person" : "people"},{" "}
          {party.dishes === 0 ? "no dishes yet" : `${party.dishes} ${party.dishes === 1 ? "dish" : "dishes"}`}.
        </span>
      </Link>
    </li>
  );
}

export default async function PartiesPage() {
  const [parties, today] = await Promise.all([listParties(), householdToday()]);
  const upcoming = parties.filter((p) => !p.date || p.date >= today);
  const past = parties.filter((p) => p.date && p.date < today).reverse();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl leading-tight font-extrabold">Dinner parties</h1>
      <p className="mt-1 text-[17px] text-muted">
        Pick the dishes for a party and get one shopping list for all of them. Each dish is made to feed everyone.
        This is separate from the week&apos;s dinners.
      </p>

      <div className="mt-5">
        <NewParty startOpen={parties.length === 0} />
      </div>

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading" className="mt-8">
          <h2 id="upcoming-heading" className="mb-2 px-1 text-2xl font-extrabold">
            Coming up
          </h2>
          <ul className="flex flex-col gap-3">
            {upcoming.map((p) => (
              <PartyCard key={p.id} party={p} today={today} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-heading" className="mt-8">
          <h2 id="past-heading" className="mb-2 px-1 text-2xl font-extrabold">
            Past parties
          </h2>
          <ul className="flex flex-col gap-3">
            {past.map((p) => (
              <PartyCard key={p.id} party={p} today={today} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
