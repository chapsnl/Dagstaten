import { NextRequest, NextResponse } from "next/server";

// Eenvoudige wachtwoordbeveiliging voor de hele app, bedoeld voor zodra dit
// online (Netlify) staat. Zolang SITE_PASSWORD niet gezet is (bv. lokaal
// ontwikkelen) doet deze middleware niets - geen extra instellingen nodig om
// `npm run dev` te gebruiken. Zet SITE_PASSWORD pas in de hostingomgeving om
// de site achter een wachtwoord te zetten.
const PUBLIC_PATHS = ["/login", "/api/login"];

export function proxy(req: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("site_auth")?.value;
  if (cookie === sitePassword) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
