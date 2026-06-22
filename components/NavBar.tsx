import Link from "next/link";
import { isoWeekInfoForDate, quarterInfoForIsoWeek } from "@/lib/dateUtils";

export default function NavBar() {
  const now = new Date();
  const { isoYear, isoWeek } = isoWeekInfoForDate(now);
  const { year: qYear, quarter } = quarterInfoForIsoWeek(isoYear, isoWeek);
  const jaar = now.getFullYear();
  const gatekept = Boolean(process.env.SITE_PASSWORD);

  const links = [
    { href: "/", label: "Vandaag" },
    { href: `/week/${isoYear}/${isoWeek}`, label: "Deze week" },
    { href: `/kwartaal/${qYear}/${quarter}`, label: "Kwartaal" },
    { href: `/jaar/${jaar}`, label: "Jaar" },
    { href: "/instellingen", label: "Instellingen" },
  ];

  return (
    <header className="bg-slate-900 text-white">
      <nav className="w-full max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
        <span className="font-semibold mr-4">Boekhouding</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm text-slate-200 hover:text-white hover:underline">
            {l.label}
          </Link>
        ))}
        {gatekept && (
          <a href="/api/logout" className="text-sm text-slate-400 hover:text-white hover:underline ml-auto">
            Uitloggen
          </a>
        )}
      </nav>
    </header>
  );
}
