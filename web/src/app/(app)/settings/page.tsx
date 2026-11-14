import { householdSize } from "@/lib/plan";
import { listAliases, listStaples } from "@/lib/shopping-data";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const [size, staples, aliases] = await Promise.all([householdSize(), listStaples(), listAliases()]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="pt-2 text-3xl leading-tight font-extrabold">Settings</h1>
      <SettingsForm size={size} staples={staples} aliases={aliases} />
    </div>
  );
}
