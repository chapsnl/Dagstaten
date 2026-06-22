import { getMeta } from "@/lib/repo/meta";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function InstellingenPage() {
  const meta = await getMeta();
  return (
    <div className="space-y-6">
      <h1 className="page-title">Instellingen</h1>
      <SettingsForm meta={meta} />
    </div>
  );
}
