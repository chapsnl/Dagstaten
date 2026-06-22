# Boekhouding - dagelijkse kassa- en BTW-administratie

Webapp voor het dagelijks invoeren van kassa- en PIN-omzet van DD en Eagle, met
automatische BTW-berekening (21%/9%), kasverschillen, bankafstortingen en een
kwartaal-/jaaroverzicht voor de BTW-aangifte.

De data staat in een Postgres-database op Supabase.

## Eenmalig instellen

1. **Vereisten**: Node.js 18 of hoger.
2. **Verbindingsgegevens**: er staat al een `.env.local` met je `DATABASE_URL`
   (Supabase-project "Dagstaten"). Kom je dit bestand niet tegen (bijv. na een
   git-clone), maak het dan zelf aan in de hoofdmap van dit project:

   ```
   DATABASE_URL=postgresql://postgres:JOUW-WACHTWOORD@db.eewzccwzsoaokqsriczt.supabase.co:5432/postgres
   ```

   Komt er een netwerkfout (timeout / kan host niet bereiken) bij stap 4? Veel
   netwerken ondersteunen alleen IPv4, en de directe verbinding hierboven loopt
   over IPv6. Gebruik dan in plaats daarvan de **Session pooler**-string:
   ga in het Supabase-dashboard naar **Project Settings > Database > Connection
   string**, kies het tabblad **Session pooler**, kopieer de URI en vul je
   wachtwoord in op de plek van `[YOUR-PASSWORD]`. Plak die als `DATABASE_URL`
   in `.env.local` in plaats van de directe verbinding.

3. **Installeren**:

   ```bash
   npm install
   ```

4. **Database klaarzetten** (eenmalig, of opnieuw als je de database leegmaakt):

   ```bash
   npm run db:init
   ```

   Dit zet de tabellen klaar (zie `supabase/schema.sql`) en vult de
   standaardgegevens (DD/Eagle, kassa's D1/D2/E1/E2, 4 PIN-apparaten + 1
   reserve, BTW-tarieven). Er worden geen bedragen voorgeladen.

## Starten

```bash
npm run dev
```

Open daarna http://localhost:3000.

Voor "productie"-gebruik op je eigen computer:

```bash
npm run build
npm run start
```

## Schermen

- **Vandaag** (`/`) - kies een dag, je komt direct in het invoerscherm.
- **Dag-invoer** (`/dag/2026-06-22`) - per zaak (DD/Eagle) en per kassa: PIN-bedrag,
  omzet incl. 21% en omzet incl. 9%. BTW, totaal en cash worden live berekend.
- **Week afsluiten** (`/week/2026/26`) - overzicht van de 7 dagen, plus invoer van
  contante uitgaven (inkopen, salarissen, ...) en het werkelijk afgestorte bedrag.
  De app laat het *berekende* te storten bedrag zien (cash - kasuitgaven) en het
  *verschil* met wat je daadwerkelijk hebt afgestort.
- **Kwartaal** (`/kwartaal/2026/2`) - BTW-overzicht per maand/week voor de
  BTW-aangifte, met een printknop voor een uitdraai.
- **Jaar** (`/jaar/2026`) - jaaroverzicht van omzet, af te dragen BTW, uitgaven en
  kassaldo, per kwartaal.
- **Instellingen** - bedrijfsnaam, BTW-tarieven, startkas (vlottende kas) en
  beheer van kassa's en het reserve PIN-apparaat.

## Hoe de berekening werkt

- BTW 21% / 9% wordt uit het ingevoerde *inclusief*-bedrag gehaald:
  `btw = bedrag - bedrag / (1 + tarief/100)`.
- Cash per kassa = (omzet incl. 21% + omzet incl. 9%) - PIN-bedrag.
- Berekend te storten bedrag (per week) = totaal cash (DD + Eagle) - contante
  uitgaven die week.
- Verschil = werkelijk afgestort bedrag - berekend bedrag. Dit maakt
  kasverschillen direct zichtbaar (in de oude Excel werd dit niet los bijgehouden).
- Lopend kassaldo = vorige saldo + omzet incl. BTW - werkelijke afstorting -
  kasuitgaven - PIN. Dit saldo wordt pas meegerekend vanaf de datum die je bij
  Instellingen > "Vanaf datum" hebt ingesteld; weken daarvoor tonen "-".
- Reserve PIN-apparaat: als een vast PIN-apparaat uitvalt, kun je per kassa per
  dag het reserve-apparaat selecteren in plaats van het eigen apparaat.

## Database / Supabase

Alle gegevens staan in de Postgres-database van je Supabase-project
("Dagstaten"). Het schema staat in `supabase/schema.sql` (kun je ook handmatig
in de Supabase SQL editor draaien). Een back-up maken kan via het
Supabase-dashboard (**Database > Backups**), of met `pg_dump` op de
connectiestring uit `.env.local`.

De gegevens van je oude Excel-sheet zijn niet overgenomen: de app start leeg
qua bedragen, zoals gevraagd. Alleen de structuur (DD/Eagle, kassa's, BTW-tarieven)
is voorgeladen.

De "Publishable key" die je bij het aanmaken van het Supabase-project hebt
gekregen, wordt door deze app niet gebruikt: die is bedoeld voor de Supabase
client-bibliotheek (Auth, Storage, REST vanaf de browser). Deze app praat
rechtstreeks met Postgres via de `DATABASE_URL`, wat het eenvoudigst is omdat
er geen apart Supabase Auth-systeem voor nodig is.

## Online zetten (GitHub + Netlify)

De app staat al lokaal als git-repository klaar. Pushen doe je vanuit je eigen
Terminal (niet via Claude), omdat dat altijd via jouw eigen, al-werkende
GitHub-login gaat:

```bash
cd ~/claude/Projects/Boekhouding/boekhouding-app
git branch -M main
git remote add origin https://github.com/chapsnl/Dagstaten.git
git push -u origin main
```

Kom je hierbij een foutmelding tegen over een kapotte/oude `.git`-map, voer dan
eerst `rm -rf .git` uit in deze map en herhaal `git init`, `git add -A`,
`git commit -m "Eerste versie"` voordat je de bovenstaande stappen doet.

**Netlify koppelen**: maak op netlify.com een nieuwe site vanuit deze
GitHub-repository ("Import from Git"). Netlify herkent Next.js automatisch; de
instellingen in `netlify.toml` (Node 22, build-commando) worden gebruikt.

**Omgevingsvariabelen op Netlify** (Site settings > Environment variables -
nooit in `.env.local` laten staan en NOOIT naar GitHub pushen):

- `DATABASE_URL` - gebruik hier de **Transaction pooler**-variant (poort
  `6543`) in plaats van de Session pooler die je lokaal gebruikt: neem je
  huidige `DATABASE_URL` uit `.env.local` en vervang `:5432` door `:6543`.
  Netlify draait de app namelijk als kortlevende serverless functies; de
  transactie-pooler is daarvoor gemaakt, de sessie-pooler niet.
- `PGPOOL_MAX` - mag je weglaten (staat standaard al laag, op 3).
- `SITE_PASSWORD` - kies een wachtwoord om de site af te schermen (zie
  hieronder). Zonder deze variabele is de site voor iedereen met de URL
  bereikbaar.

Na het instellen van de omgevingsvariabelen: **Deploys > Trigger deploy**
(of gewoon opnieuw pushen) om ze actief te maken.

## Wachtwoordbeveiliging

Deze app heeft geen gebruikersbeheer - het is bedoeld voor jezelf. Zodra hij
online staat, kan in principe iedereen met de URL je kasgegevens zien en
wijzigen. Zet daarom op Netlify de omgevingsvariabele `SITE_PASSWORD` op een
wachtwoord van je keuze: de site vraagt dan om dat wachtwoord (pagina
`/login`) voordat iemand iets te zien krijgt, met een "Uitloggen"-link rechts
in de menubalk. Lokaal (`npm run dev`) blijft de site open zolang je
`SITE_PASSWORD` niet ook in `.env.local` zet.

## Belangrijk

Dit is een hulpmiddel om de administratie inzichtelijk te maken. Controleer de
cijfers altijd zelf (of laat dit door je boekhouder doen) voordat je de
BTW-aangifte indient bij de Belastingdienst. Bewaar `.env.local` (met je
databasewachtwoord) niet op een plek die anderen kunnen inzien, en deel hem
niet via e-mail/chat.
