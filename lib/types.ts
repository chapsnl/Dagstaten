export interface Business {
  id: number;
  code: string;
  name: string;
  sort_order: number;
}

export interface Kassa {
  id: number;
  business_id: number;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
}

export interface PinDevice {
  id: number;
  business_id: number | null;
  kassa_id: number | null;
  code: string;
  name: string;
  is_reserve: boolean;
  sort_order: number;
  active: boolean;
}

export interface DailyEntryRow {
  id: number;
  date: string;
  kassa_id: number;
  pin_device_id: number | null;
  pin_amount: number;
  omzet_incl21: number;
  omzet_incl9: number;
  note: string | null;
  updated_at: string;
}

export interface WeekExpenseRow {
  id: number;
  iso_year: number;
  iso_week: number;
  description: string;
  amount: number;
  sort_order: number;
}

export interface WeekDepositRow {
  id: number;
  iso_year: number;
  iso_week: number;
  actual_amount: number | null;
  note: string | null;
}

export interface Settings {
  company_name: string;
  starting_cash_float: number;
  starting_cash_float_date: string;
  vat_rate_high: number;
  vat_rate_low: number;
}
