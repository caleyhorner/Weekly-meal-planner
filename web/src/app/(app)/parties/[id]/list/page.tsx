import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingList } from "@/components/shopping-list";
import { getParty, getPartyShoppingList } from "@/lib/parties";
import { openClawConfigured } from "@/lib/openclaw";
import { sendPartyListAction, setPartyHaveItAction } from "../../actions";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function PartyListPage({ params }: PageProps<"/parties/[id]/list">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const party = await getParty(id);
  if (!party) notFound();
  const items = await getPartyShoppingList(party);
  const dishes = party.dishes.length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/parties/${id}`} className="inline-flex min-h-11 items-center gap-1.5 font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back to {party.name}
      </Link>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold">Shopping for {party.name}</h1>

      {dishes === 0 ? (
        <div className="card mt-5 p-6 text-center">
          <p className="text-xl font-bold">No dishes on the menu yet.</p>
          <Link href={`/parties/${id}/pick`} className="btn-primary mt-5">
            Add dishes
          </Link>
        </div>
      ) : (
        <ShoppingList
          summary={`From ${dishes} ${dishes === 1 ? "dish" : "dishes"} for ${party.guests} ${party.guests === 1 ? "person" : "people"}`}
          items={items}
          setHaveIt={setPartyHaveItAction.bind(null, id)}
          send={sendPartyListAction.bind(null, id)}
          canSendToOpenClaw={openClawConfigured()}
        />
      )}

      <p className="mt-8 text-center">
        <Link href="/settings" className="inline-flex min-h-11 items-center font-bold underline">
          Edit staples
        </Link>
      </p>
    </div>
  );
}
