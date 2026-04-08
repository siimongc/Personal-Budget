import React, { useState } from 'react';
import { PiggyBank, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

const FinancialCalculators: React.FC = () => {
  // Proyección de Ahorro State
  const [savingsCapital, setSavingsCapital] = useState<number | ''>('');
  const [savingsRateEA, setSavingsRateEA] = useState<number | ''>('');
  const [savingsMonths, setSavingsMonths] = useState<number | ''>('');

  // Comparador de Crédito State
  const [creditPurchase, setCreditPurchase] = useState<number | ''>('');
  const [creditRate, setCreditRate] = useState<number | ''>(''); // Tasa mes vencido
  const [creditInstallments, setCreditInstallments] = useState<number | ''>('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Cálculo de Ahorro: Interés compuesto con EA convertida a Tasa Efectiva Mensual
  let finalSavings = 0;
  let savingsProfit = 0;
  let monthlyProfit = 0;
  if (savingsCapital !== '' && savingsRateEA !== '' && savingsMonths !== '') {
    // Fórmula EA a Efectiva Mensual (TEM) = (1 + EA)^(1/12) - 1
    const tem = Math.pow(1 + savingsRateEA / 100, 1 / 12) - 1;
    finalSavings = savingsCapital * Math.pow(1 + tem, savingsMonths);
    savingsProfit = finalSavings - savingsCapital;
    monthlyProfit = savingsProfit / savingsMonths || 0;
  }

  // Cálculo de Crédito: Cuota fija mensual
  let monthlyPayment = 0;
  let totalCreditPayment = 0;
  let totalInterest = 0;
  if (creditPurchase !== '' && creditRate !== '' && creditInstallments !== '' && creditInstallments > 0) {
    const rateDecimal = creditRate / 100;
    // Fórmula cuota fija = P * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
    if (rateDecimal === 0) {
      monthlyPayment = creditPurchase / creditInstallments;
    } else {
      monthlyPayment =
        (creditPurchase * rateDecimal * Math.pow(1 + rateDecimal, creditInstallments)) /
        (Math.pow(1 + rateDecimal, creditInstallments) - 1);
    }
    totalCreditPayment = monthlyPayment * creditInstallments;
    totalInterest = totalCreditPayment - creditPurchase;
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Calculadoras Financieras</h2>
        <p className="text-slate-400">Herramientas matemáticas para proyectar el crecimiento de tu dinero y analizar costos de deudas.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Calculadora de Ahorro / Inversión */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center mr-4">
                <PiggyBank className="text-cyan-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Proyección de Ahorro</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Capital Inicial (Monto)</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Ej. 1000000"
                  value={savingsCapital}
                  onChange={(e) => setSavingsCapital(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Tasa % E.A.</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="Ej. 12.5"
                    value={savingsRateEA}
                    onChange={(e) => setSavingsRateEA(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Plazo (Meses)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="Ej. 12"
                    value={savingsMonths}
                    onChange={(e) => setSavingsMonths(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-slate-950 p-6 rounded-2xl border border-cyan-500/20">
            <p className="text-sm text-slate-400 mb-1">Capital Final Proyectado</p>
            <h4 className="text-3xl border-b border-slate-800 pb-4 mb-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              {formatCurrency(finalSavings)}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Ganancia Total</p>
                <p className="font-semibold text-emerald-400 flex items-center">
                  <TrendingUp size={14} className="mr-1" /> +{formatCurrency(savingsProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Ganancia Mensual Promedio</p>
                <p className="font-semibold text-white">{formatCurrency(monthlyProfit)}</p>
              </div>
            </div>
          </div>
        </div>


        {/* Calculadora de Deuda / Tarjeta de crédito */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <div>
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center mr-4">
                <CreditCard className="text-rose-400" size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Comparador de Crédito</h3>
            </div>

            <div className="space-y-4 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Valor de la Compra</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  placeholder="Ej. 1500000"
                  value={creditPurchase}
                  onChange={(e) => setCreditPurchase(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Tasa % Mensual (TC)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                    placeholder="Ej. 2.5"
                    value={creditRate}
                    onChange={(e) => setCreditRate(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Cuotas</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                    placeholder="Ej. 12"
                    value={creditInstallments}
                    onChange={(e) => setCreditInstallments(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-slate-950 p-6 rounded-2xl border border-rose-500/20 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Cuota Mensual (Aprox)</p>
                <h4 className="text-2xl font-bold text-white">{formatCurrency(monthlyPayment)}</h4>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400 mb-1">Pago Total Final</p>
                <h4 className="text-xl font-bold text-rose-400">{formatCurrency(totalCreditPayment)}</h4>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-start text-sm text-slate-300">
                <AlertCircle className="text-amber-400 mr-2 mt-0.5 flex-shrink-0" size={18} />
                <p>
                  Si compras a crédito frente a pagarlo de contado, terminarás pagando 
                  <strong className="text-rose-400 ml-1 block mt-1 text-lg">{formatCurrency(totalInterest)} EXTRA</strong> 
                  solo en intereses a la entidad financiera.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinancialCalculators;
