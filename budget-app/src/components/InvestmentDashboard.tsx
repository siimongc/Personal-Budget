import React, { useEffect, useState } from 'react';
import { LineChart as ChartIcon, TrendingUp, TrendingDown, Activity, AlertTriangle, ExternalLink } from 'lucide-react';
import type { CryptoAsset } from '../types';

const InvestmentDashboard: React.FC = () => {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        setLoading(true);
        // Usamos una API gratuita de coingecko para BTC y ETH
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false'
        );
        if (!response.ok) throw new Error('Error al consultar datos');
        
        const data = await response.json();
        const mappedAssets: CryptoAsset[] = data.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          current_price: coin.current_price,
          price_change_percentage_24h: coin.price_change_percentage_24h,
        }));
        setAssets(mappedAssets);
        setError(false);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptoData();
    // Poll cada 5 min (300000 ms)
    const intId = setInterval(fetchCryptoData, 300000);
    return () => clearInterval(intId);
  }, []);

  const getRecommendation = (variation: number) => {
    if (variation <= -5) return { text: 'Buena Oportunidad de Compra (Caída Fuerte)', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (variation < 0 && variation > -5) return { text: 'Mercado Lateral/Bajista (Hold)', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    if (variation >= 0 && variation < 5) return { text: 'Estabilidad (Mantener)', color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
    return { text: 'Sobrecompra Riesgosa (Evaluar Ventas Parciales)', color: 'text-rose-400', bg: 'bg-rose-500/10' };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Visor de Inversiones</h2>
        <p className="text-slate-400">Resumen en vivo de criptoactivos principales y recomendaciones simples.</p>
      </header>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center text-rose-400">
          <AlertTriangle className="mr-3" /> Hubo un problema al cargar los datos desde la API pública.
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-48 animate-pulse flex flex-col justify-between">
               <div className="flex justify-between items-center"><div className="w-24 h-6 bg-slate-800 rounded"></div><div className="w-10 h-10 bg-slate-800 rounded-full"></div></div>
               <div className="w-32 h-10 bg-slate-800 rounded mt-4"></div>
            </div>
          ))
        ) : (
          assets.map(asset => {
            const isPositive = asset.price_change_percentage_24h >= 0;
            const rec = getRecommendation(asset.price_change_percentage_24h);

            return (
              <div key={asset.symbol} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-slate-700 transition-all">
                {isPositive ? (
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
                ) : (
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full"></div>
                )}
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center">
                        {asset.name}
                        <span className="ml-2 text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded-md">
                          {asset.symbol}
                        </span>
                      </h3>
                    </div>
                    {asset.symbol === 'BTC' ? (
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                        <ChartIcon className="text-orange-400" size={20} />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                         <Activity className="text-blue-400" size={20} />
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <p className="text-4xl font-bold text-white tracking-tight break-words">
                      {formatCurrency(asset.current_price)}
                    </p>
                    <div className="flex items-center mt-2">
                      <span className={`flex items-center text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                        {Math.abs(asset.price_change_percentage_24h).toFixed(2)}%
                      </span>
                      <span className="text-xs text-slate-500 ml-2">últimas 24h</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Análisis Básico (MVP)</p>
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${rec.bg} ${rec.color}`}>
                      {rec.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Info Card */}
        <div className="bg-slate-900 border border-slate-800 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <ChartIcon size={40} className="text-slate-600 mb-4" />
          <h4 className="text-white font-medium mb-2">Más integraciones pronto</h4>
          <p className="text-sm text-slate-400 mb-4">Se planea conexión para rastrear portfolios particulares como ETF del SNP500 e instrumentos locales.</p>
          <a href="https://finance.yahoo.com" target="_blank" rel="noreferrer" className="flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            Ver Noticias de Mercado <ExternalLink size={16} className="ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default InvestmentDashboard;
