import { formatISO } from "@/lib/dateUtils";
import DateJumpForm from "@/components/DateJumpForm";
import { addDays } from "date-fns";

export default function HomePage() {
  const today = new Date();
  const todayStr = formatISO(today);
  const yesterdayStr = formatISO(addDays(today, -1));
  const tomorrowStr = formatISO(addDays(today, 1));

  return (
    <div className="max-w-md mx-auto mt-8 space-y-6">
      <div>
        <h1 className="page-title">Welkom</h1>
        <p className="page-subtitle">
          Kies een dag om de kassa&apos;s en PIN-apparaten van DD en Eagle in te vullen.
        </p>
      </div>

      <div className="card">
        <div className="card-header">Dag kiezen</div>
        <div className="card-body space-y-4">
          <DateJumpForm defaultDate={todayStr} />
          <div className="flex gap-3 text-sm">
            <a href={`/dag/${yesterdayStr}`} className="btn">
              Gisteren
            </a>
            <a href={`/dag/${todayStr}`} className="btn-dark">
              Vandaag
            </a>
            <a href={`/dag/${tomorrowStr}`} className="btn">
              Morgen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
