export interface Category {
  id: string;
  name: string;
  percentage: number;
  created_at?: string;
  color?: string; // Optional for UI coloring
}

export interface Expense {
  id: string;
  category_id: string;
  amount: number;
  description: string;
  created_at: string;
}

export interface SavingsProjection {
  principal: number;
  annualInterestRate: number; // Porcentaje Efectivo Anual (EA)
  months: number;
}

export interface CreditComparison {
  purchaseValue: number;
  creditCardRate: number; // Tasa Efectiva Mensual o Anual según convención
  installments: number; // Cuotas
}

export interface CryptoAsset {
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}
