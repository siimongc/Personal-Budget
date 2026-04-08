import React, { useState } from 'react';
import { Send, Bot, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Category } from '../types';

import { supabase } from '../lib/supabase';

interface TelegramBotMVPProps {
  categories: Category[];
}

const TelegramBotMVP: React.FC<TelegramBotMVPProps> = ({ categories }) => {
  const [token, setToken] = useState('123456789:ABCDEfghiJKLM_nopqRSTUvwxyZ');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<{ id: string; type: 'success' | 'error'; text: string; details?: any }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsProcessing(true);
    
    // Simulación de retraso de red
    await new Promise(resolve => setTimeout(resolve, 800));

    // Regex muy básica para extraer "Monto Concepto" (ej: 50000 Almuerzo)
    const regex = /^(\d+)\s+(.+)$/i;
    const match = message.trim().match(regex);

    if (!match) {
      addLog('error', `Formato inválido: "${message}". Se esperaba: [Monto] [Descripción]`);
      setIsProcessing(false);
      return;
    }

    const amount = Number(match[1]);
    const description = match[2].trim();

    // Intentar emparejar descripción con alguna categoría (MVP basic matching)
    const pairedCategory = categories.find(c => 
      description.toLowerCase().includes(c.name.toLowerCase()) || 
      c.name.toLowerCase().includes(description.toLowerCase())
    ) || categories[0]; // Cae en la primera si no encuentra

    if (!pairedCategory) {
      addLog('error', `No tienes categorías configuradas para guardar gastos.`);
      setIsProcessing(false);
      return;
    }

    // Insert real a base de datos
    const { error } = await supabase.from('expenses').insert([
      { category_id: pairedCategory.id, amount, description }
    ]);

    if (error) {
       console.error(error);
       addLog('error', `Error de base de datos al guardar: ${description}`);
    } else {
       addLog('success', `Gasto registrado en DB: ${new Intl.NumberFormat('es-CO', {style: 'currency', currency:'COP'}).format(amount)} asignado a "${pairedCategory.name}"`);
    }

    setMessage('');
    setIsProcessing(false);
  };

  const addLog = (type: 'success' | 'error', text: string) => {
    setLogs(prev => [{ id: crypto.randomUUID(), type, text }, ...prev].slice(0, 5));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Conexión Bot (MVP)</h2>
        <p className="text-slate-400">Simulador de recepción de gastos vía texto simple para procesar transacciones.</p>
      </header>

      <div className="grid md:grid-cols-5 gap-8">
        
        {/* Configuración del Bot */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full"></div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Bot className="mr-2 text-blue-400" size={20} />
              Configuración API
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Telegram Bot Token</label>
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Este token sirve para que el webhook lea tus mensajes. Actualmente actúa de forma simulada.
              </p>
              <button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors border border-slate-700">
                Verificar Conexión
              </button>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Últimos Logs (Supabase)</h3>
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Esperando eventos de webhook...</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex items-start bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                    {log.type === 'error' 
                      ? <AlertCircle size={16} className="text-rose-400 mt-0.5 mr-2 flex-shrink-0" />
                      : <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 mr-2 flex-shrink-0" />
                    }
                    <p className="text-xs text-slate-300 leading-relaxed">{log.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Simulador de Chat */}
        <div className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[500px] overflow-hidden shadow-2xl">
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
              <Bot className="text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold">Bot Finanzas</h3>
              <p className="text-xs text-blue-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span> Online
              </p>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-[#0f172a] bg-opacity-50 space-y-4">
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm">
                ¡Hola! Envíame tus gastos en el formato <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-400 border border-slate-700">Monto Concepto</code> (ej: <code>15000 Uber</code>) y yo lo categorizaré en Supabase por ti.
              </div>
            </div>
            {/* Historial Fake UI */}
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                25000 Gasolina
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] text-sm">
                ✅ Guardado exitoso: $25,000 en Transporte.
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <form onSubmit={processMessage} className="flex space-x-2">
              <div className="relative flex-1">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input
                  type="text"
                  placeholder="Ej. 18000 Almuerzo"
                  disabled={isProcessing}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={isProcessing || !message.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white p-3 rounded-xl transition-colors flex items-center justify-center shrink-0"
              >
                <Send size={20} className={isProcessing ? "translate-x-1 opacity-50 transition-all" : ""} />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TelegramBotMVP;
