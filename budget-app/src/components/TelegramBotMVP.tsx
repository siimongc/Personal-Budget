import React, { useState } from 'react';
import { Bot, Copy, Check } from 'lucide-react';
import type { Category } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface TelegramBotMVPProps {
  categories: Category[];
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const TelegramBotMVP: React.FC<TelegramBotMVPProps> = ({ categories }) => {
  void categories;
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateCode = async () => {
    if (!user) return;
    setGenerating(true);
    setError(null);
    setCopied(false);

    const newCode = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('telegram_link_codes')
      .insert({ code: newCode, owner_id: user.id, expires_at: expiresAt });

    if (insertError) {
      console.error(insertError);
      setError('No se pudo generar el código, intentá de nuevo.');
      setGenerating(false);
      return;
    }

    setCode(newCode);
    setGenerating(false);
  };

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(`/vincular ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Conexión Bot de Telegram</h2>
        <p className="text-slate-400">
          Vinculá tu cuenta para registrar gastos enviando mensajes al bot, ej: "15000 Uber".
        </p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center">
        <Bot size={32} className="text-emerald-400 mb-4" />

        {!code ? (
          <>
            <p className="text-slate-400 text-sm mb-4 max-w-sm">
              Generá un código de un solo uso y enviaselo al bot con{' '}
              <code className="text-emerald-400">/vincular CODIGO</code> para vincular tu cuenta.
            </p>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {generating ? 'Generando…' : 'Generar código de vinculación'}
            </button>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-3">
              Enviale este mensaje al bot (válido por 10 minutos):
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-lg font-mono text-emerald-400 hover:border-emerald-500/50 transition-colors"
            >
              /vincular {code}
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="text-slate-500 hover:text-slate-300 text-xs mt-4"
            >
              Generar otro código
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TelegramBotMVP;
