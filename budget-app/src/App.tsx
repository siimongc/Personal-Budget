import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import CategoriesManager from './components/CategoriesManager';
import IncomeDistributor from './components/IncomeDistributor';
import FinancialCalculators from './components/FinancialCalculators';
import TelegramBotMVP from './components/TelegramBotMVP';
import InvestmentDashboard from './components/InvestmentDashboard';
import type { Category } from './types';
import { Menu, X } from 'lucide-react';
import { supabase } from './lib/supabase';

function App() {
  const [currentTab, setCurrentTab] = useState('categories');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estado global de categorías proveniente de Supabase
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setCategories(data as Category[]);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      // Fallback a array vacío o un log visual
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      );
    }

    switch (currentTab) {
      case 'categories':
        return <CategoriesManager categories={categories} setCategories={setCategories} />;
      case 'income':
        return <IncomeDistributor categories={categories} />;
      case 'calculators':
        return <FinancialCalculators />;
      case 'telegram':
        return <TelegramBotMVP categories={categories} />;
      case 'dashboard':
        return <InvestmentDashboard />;
      default:
        return <CategoriesManager categories={categories} setCategories={setCategories} />;
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen font-sans selection:bg-emerald-500/30">
      
      {/* Sidebar Desktop */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Mobile Header Menu Button */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center z-50">
        <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Finanzas
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white p-2"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/95 backdrop-blur-sm pt-20 px-4">
          <nav className="flex flex-col space-y-2">
            {[
              { id: 'categories', label: 'Categorías' },
              { id: 'income', label: 'Distribuidor' },
              { id: 'calculators', label: 'Calculadoras' },
              { id: 'telegram', label: 'Telegram (MVP)' },
              { id: 'dashboard', label: 'Inversiones' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-200 text-left ${
                  currentTab === item.id 
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2)]' 
                    : 'text-slate-400'
                }`}
              >
                <span className="font-medium text-lg">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:p-10 md:p-8 p-6 pt-24 md:pt-10 overflow-y-auto w-full">
        <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderContent()}
        </div>
      </main>

    </div>
  );
}

export default App;