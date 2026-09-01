export interface Profile {
  id: string;
  display_name: string;
  initial?: string;
  accent?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  percentage: number;
  owner_id: string;
  created_at?: string;
  color?: string;
}

export interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  owner_id: string;
  created_at: string;
}

export interface MonthlyIncome {
  id: string;
  owner_id: string;
  period: string;
  amount: number;
  created_at: string;
}

export interface PeriodDistributionEntry {
  category_id: string;
  name: string;
  percentage: number;
  amount: number;
  color?: string;
}

export interface PeriodSnapshot {
  id: string;
  owner_id: string;
  period: string;
  income: number;
  distributions: PeriodDistributionEntry[];
  created_at: string;
  updated_at: string;
}

export interface SavingsProjection {
  principal: number;
  annualInterestRate: number;
  months: number;
}

export interface CreditComparison {
  purchaseValue: number;
  creditCardRate: number;
  installments: number;
}

export interface CryptoAsset {
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}
