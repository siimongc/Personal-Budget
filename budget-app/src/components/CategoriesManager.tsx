import React, { useState } from 'react';
import { Plus, Settings2, Trash2, Info, AlertTriangle } from 'lucide-react';
import type { Category } from '../types';
import { supabase } from '../lib/supabase';

interface CategoriesManagerProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const CategoriesManager: React.FC<CategoriesManagerProps> = ({ categories, setCategories }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatPercentage, setNewCatPercentage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, setIsProcess] = useState(false);

  const totalPercentage = categories.reduce((acc, cat) => acc + Number(cat.percentage), 0);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const amount = Number(newCatPercentage);

    if (!newCatName || !amount) {
      setErrorMsg('Por favor llena todos los campos.');
      return;
    }

    if (totalPercentage + amount > 100) {
      setErrorMsg('Debe reorganizar los porcentajes, el total no puede exceder el 100%.');
      return;
    }

    setIsProcess(true);
    const newCatColor = `hsl(${Math.random() * 360}, 70%, 60%)`;

    const { data, error } = await supabase
      .from('categories')
      .insert([
        { name: newCatName, percentage: amount, color: newCatColor }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      setErrorMsg('Error guardando en base de datos.');
      setIsProcess(false);
      return;
    }

    if (data) {
      setCategories([...categories, data as Category]);
      setNewCatName('');
      setNewCatPercentage('');
    }
    setIsProcess(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro quieres eliminar esta categoría?')) return;
    
    setIsProcess(true);
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error(error);
      alert('Error eliminando');
    } else {
      setCategories(categories.filter((c) => c.id !== id));
    }
    setIsProcess(false);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-white mb-2">Gestión de Categorías</h2>
        <p className="text-slate-400">Administra tus sobres de dinero y sus porcentajes designados.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Formulario de creación */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Plus className="mr-2 text-emerald-400" size={20} />
            Nueva Categoría
          </h3>
          <form onSubmit={handleCreateCategory} className="space-y-4 relative z-10">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Nombre</label>
              <input
                type="text"
                placeholder="Ej. Alimentos, Viajes..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Porcentaje (%)</label>
              <input
                type="number"
                placeholder="10"
                min="1"
                max="100"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
                value={newCatPercentage}
                onChange={(e) => setNewCatPercentage(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="flex items-start text-sm text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-lg transition-colors shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)]"
            >
              Añadir Categoría
            </button>
          </form>
        </div>

        {/* Lista de categorías */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total asignado</p>
              <h4 className="text-2xl font-bold text-white mt-1">
                {totalPercentage}% <span className="text-slate-500 text-lg font-normal">/ 100%</span>
              </h4>
            </div>
            <div className="w-1/2 bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${totalPercentage === 100 ? 'bg-emerald-500' : totalPercentage > 100 ? 'bg-rose-500' : 'bg-cyan-400'}`} 
                style={{ width: `${Math.min(totalPercentage, 100)}%` }} 
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#34d399' }} />
                    <h4 className="text-lg font-semibold text-white">{cat.name}</h4>
                  </div>
                  <button onClick={() => handleDelete(cat.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="mb-4">
                  <span className="text-3xl font-bold text-white">{cat.percentage}%</span>
                </div>

                <div className="flex space-x-2 pt-4 border-t border-slate-800">
                  <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium flex justify-center items-center transition-colors">
                    <Plus size={16} className="mr-1.5" /> Gasto
                  </button>
                  <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm font-medium flex justify-center items-center transition-colors">
                    <Settings2 size={16} className="mr-1.5" /> Detalles
                  </button>
                </div>
              </div>
            ))}
            
            {categories.length === 0 && (
              <div className="sm:col-span-2 py-10 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 border border-dashed border-slate-700 rounded-xl">
                <Info size={32} className="mb-3 opacity-50" />
                <p>No tienes categorías configuradas aún.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoriesManager;
