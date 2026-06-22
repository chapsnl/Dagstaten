import { computeWeekCore, runningBalanceUpTo } from "@/lib/repo/week";
import { DAG_NAMEN } from "@/lib/dateUtils";
import WeekClosingForm from "@/components/WeekClosingForm";
import Link from "next/link";
import { addDays, parseISO } from "date-fns";
import { Fragment } from "react";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ year: string; week: string }>;
}) {
  const { year, week } = await params;
  const isoYear = Number(year);
  const isoWeek = Number(week);

  // De financiele cijfers van een week kunnen we altijd berekenen. Het lopende
  // kassaldo is alleen bekend vanaf de ingestelde startdatum (instellingen >
  // "Vanaf datum"); voor weken daarvoor is er geen saldo om op te bouwen.
  const core = await computeWeekCore(isoYear, isoWeek);
  const chain = await runningBalanceUpTo(isoYear, isoWeek);
  const balanceEntry = chain.length > 0 ? chain[chain.length - 1] : null;

  const prevWeekNum = isoWeek - 1 < 1 ? 52 : isoWeek - 1;
  const prevYear = isoWeek - 1 < 1 ? isoYear - 1 : isoYear;
  const nextWeekNum = isoWeek + 1 > 53 ? 1 : isoWeek + 1;
  const nextYear = isoWeek + 1 > 53 ? isoYear + 1 : isoYear;

  const dates = Array.from({ length: 7 }, (_, i) => addDays(parseISO(core.weekStart), i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">
            Week {isoWeek} &middot; {isoYear}
          </h1>
          <p className="page-subtitle">
            {core.weekStart} t/m {core.weekEnd}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/week/${prevYear}/${prevWeekNum}`} className="btn">
            &larr; vorige week
          </Link>
          <Link href={`/week/${nextYear}/${nextWeekNum}`} className="btn">
            volgende week &rarr;
          </Link>
        </div>
      </div>

      {core.businesses.map((b) => (
        <div key={b.businessId} className="card">
          <div className="card-header flex justify-between">
            <span>{b.businessName}</span>
            <span className="text-sm font-normal text-slate-600">
              Omzet &euro;{b.totaalInclBtw.toFixed(2)} &middot; PIN &euro;{b.pinTotal.toFixed(2)} &middot; Cash &euro;
              {b.cashTotaal.toFixed(2)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="fin">
              <thead>
                <tr>
                  <th>Dag</th>
                  <th>Datum</th>
                  {b.perDag[0].kassas.map((k) => (
                    <th key={k.kassaId} colSpan={3}>
                      {k.kassaCode}
                    </th>
                  ))}
                  <th>Dag cash</th>
                </tr>
                <tr>
                  <th></th>
                  <th></th>
                  {b.perDag[0].kassas.map((k) => (
                    <Fragment key={k.kassaId}>
                      <th>PIN</th>
                      <th>Omzet21</th>
                      <th>Omzet9</th>
                    </Fragment>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {b.perDag.map((d, idx) => (
                  <tr key={d.date}>
                    <td>{DAG_NAMEN[idx]}</td>
                    <td>
                      <Link href={`/dag/${d.date}`} className="underline text-slate-700">
                        {d.date}
                      </Link>
                    </td>
                    {d.kassas.map((k) => (
                      <Fragment key={k.kassaId}>
                        <td className="text-right">
                          {k.pinAmount ? k.pinAmount.toFixed(2) : ""}
                        </td>
                        <td className="text-right">
                          {k.omzetIncl21 ? k.omzetIncl21.toFixed(2) : ""}
                        </td>
                        <td className="text-right">
                          {k.omzetIncl9 ? k.omzetIncl9.toFixed(2) : ""}
                        </td>
                      </Fragment>
                    ))}
                    <td className="text-right font-medium">
                      &euro;{d.kassas.reduce((s, k) => s + k.cashTotaal, 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <WeekClosingForm
        isoYear={isoYear}
        isoWeek={isoWeek}
        core={core}
        balanceStart={balanceEntry?.balanceStart ?? null}
        balanceEnd={balanceEntry?.balanceEnd ?? null}
      />

      <div className="text-xs text-slate-400">{dates.length} dagen in deze week.</div>
    </div>
  );
}
