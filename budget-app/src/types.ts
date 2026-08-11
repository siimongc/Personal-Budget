export type MemberId = 'simon' | 'maria';

export interface Member {
  id: MemberId;
  label: string;
  initial: string;
  accent: 'emerald' | 'pink';
  gradient: string;
  ringClass: string;
  bgClass: string;
  textClass: string;
  glowClass: string;
}

export interface Category {
  id: string;
  name: string;
  percentage: number;
  owner: MemberId;
  created_at?: string;
  color?: string;
}

export interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  owner: MemberId;
  created_at: string;
}

export interface MonthlyIncome {
  id: string;
  owner: MemberId;
  period: string;
  amount: number;
  created_at: string;
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
