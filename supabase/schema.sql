-- Postgres/Supabase-schema voor de boekhouding-app.
-- Wordt automatisch uitgevoerd door scripts/init-db.ts (via npm run dev/build),
-- maar kan ook handmatig in de Supabase SQL editor geplakt worden.

create table if not exists businesses (
  id integer generated always as identity primary key,
  code text unique not null,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists kassas (
  id integer generated always as identity primary key,
  business_id integer not null references businesses(id),
  code text not null,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (business_id, code)
);

create table if not exists pin_devices (
  id integer generated always as identity primary key,
  business_id integer references businesses(id),
  kassa_id integer references kassas(id),
  code text unique not null,
  name text not null,
  is_reserve boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists daily_entries (
  id integer generated always as identity primary key,
  date date not null,
  kassa_id integer not null references kassas(id),
  pin_device_id integer references pin_devices(id),
  pin_amount numeric(12, 2) not null default 0,
  omzet_incl21 numeric(12, 2) not null default 0,
  omzet_incl9 numeric(12, 2) not null default 0,
  note text,
  updated_at timestamptz not null default now(),
  unique (date, kassa_id)
);

create table if not exists week_expenses (
  id integer generated always as identity primary key,
  iso_year integer not null,
  iso_week integer not null,
  description text not null,
  amount numeric(12, 2) not null default 0,
  sort_order integer not null default 0
);

create table if not exists week_deposits (
  id integer generated always as identity primary key,
  iso_year integer not null,
  iso_week integer not null,
  actual_amount numeric(12, 2),
  note text,
  unique (iso_year, iso_week)
);

create table if not exists settings (
  key text primary key,
  value text not null
);
