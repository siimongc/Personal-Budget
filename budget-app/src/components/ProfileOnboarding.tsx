import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface OnboardingValues {
  display_name: string;
}

const ACCENTS = [
  { id: 'emerald', className: 'bg-gradient-to-tr from-emerald-400 to-cyan-500' },
  { id: 'pink', className: 'bg-gradient-to-tr from-pink-400 to-fuchsia-500' },
  { id: 'amber', className: 'bg-gradient-to-tr from-amber-400 to-orange-500' },
  { id: 'violet', className: 'bg-gradient-to-tr from-violet-400 to-indigo-500' },
];

const ProfileOnboarding = () => {
  const { user, refreshProfile } = useAuth();
  const [accent, setAccent] = useState(ACCENTS[0].id);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>();

  const onSubmit = async (values: OnboardingValues) => {
    if (!user) return;
    setServerError(null);

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      display_name: values.display_name.trim(),
      initial: values.display_name.trim().charAt(0).toUpperCase(),
      accent,
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    await refreshProfile();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-1">
          Casi listo
        </h1>
        <p className="text-slate-400 text-sm mb-6">Contanos cómo querés que te llamemos.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Nombre a mostrar</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              {...register('display_name', { required: 'El nombre es obligatorio' })}
            />
            {errors.display_name && (
              <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Color</label>
            <div className="flex gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  className={`w-8 h-8 rounded-full ${a.className} ${
                    accent === a.id ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-200' : ''
                  }`}
                  aria-label={a.id}
                />
              ))}
            </div>
          </div>

          {serverError && <p className="text-red-400 text-sm">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg py-2 text-sm transition-colors"
          >
            Continuar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileOnboarding;
