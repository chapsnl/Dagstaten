import { getDayView } from "@/lib/repo/dailyEntry";
import { getSettings } from "@/lib/repo/meta";
import { isoWeekInfoForDateStr, DAG_NAMEN, formatISO } from "@/lib/dateUtils";
import { addDays, parseISO } from "date-fns";
import DayEntryForm from "@/components/DayEntryForm";
import Link from "next/link";

export default async function DagPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const [view, settings] = await Promise.all([getDayView(date), getSettings()]);
  const { isoYear, isoWeek } = isoWeekInfoForDateStr(date);
  const parsed = parseISO(date);
  const dagNaam = DAG_NAMEN[(parsed.getDay() + 6) % 7];
  const prev = formatISO(addDays(parsed, -1));
  const next = formatISO(addDays(parsed, 1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">
            {dagNaam} {date}
          </h1>
          <p className="page-subtitle">
            Week {isoWeek} ({isoYear}) &middot;{" "}
            <Link href={`/week/${isoYear}/${isoWeek}`} className="underline">
              naar weekoverzicht
            </Link>
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/dag/${prev}`} className="btn">
            &larr; vorige dag
          </Link>
          <Link href={`/dag/${next}`} className="btn">
            volgende dag &rarr;
          </Link>
        </div>
      </div>

      <DayEntryForm date={date} view={view} settings={settings} />
    </div>
  );
}
