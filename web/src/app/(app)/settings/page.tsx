import { householdSize } from "@/lib/plan";
import { listAliases, listStaples } from "@/lib/shopping-data";
import { listSources } from "@/lib/feed/data";
import { Websites } from "./websites";
import { SettingsForm } from "./settings-form";

// Adding a website or "Check now" reads up to 25 recipe pages.
export const maxDuration = 120;

export default async function SettingsPage() {
  const [size, staples, aliases, sources] = await Promise.all([
    householdSize(),
    listStaples(),
    listAliases(),
    listSources(),
  ]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="pt-2 text-3xl leading-tight font-extrabold">Settings</h1>
      <SettingsForm size={size} staples={staples} aliases={aliases} />
      <div className="mt-4">
        <Websites sources={sources} />
      </div>
    </div>
  );
}
