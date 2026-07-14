import React from 'react';
import { Bot } from 'lucide-react';
import type { Category } from '../types';

interface TelegramBotMVPProps {
  categories: Category[];
}

const TelegramBotMVP: React.FC<TelegramBotMVPProps> = ({ categories }) => {
  void categories;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Conexión Bot de Telegram</h2>
      </header>

      <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
        <Bot size={32} className="text-slate-600 mb-4" />
        <p className="text-slate-500 text-sm">Integración pendiente de configurar.</p>
      </div>
    </div>
  );
};

export default TelegramBotMVP;
