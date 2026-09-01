import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { signIn, signUp, resetPassword } from '../lib/auth';

type Mode = 'login' | 'signup';

interface AuthFormValues {
  email: string;
  password: string;
}

const AuthScreen = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>();

  const onSubmit = async (values: AuthFormValues) => {
    setServerError(null);
    setInfoMessage(null);

    const { error } =
      mode === 'login'
        ? await signIn(values.email, values.password)
        : await signUp(values.email, values.password);

    if (error) {
      setServerError(error.message);
      return;
    }

    if (mode === 'signup') {
      setInfoMessage('Cuenta creada. Revisá tu correo para confirmar tu cuenta antes de iniciar sesión.');
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email) {
      setServerError('Escribí tu correo primero para poder enviarte el link de recuperación.');
      return;
    }
    setServerError(null);
    const { error } = await resetPassword(email);
    if (error) {
      setServerError(error.message);
      return;
    }
    setInfoMessage('Te enviamos un link para restablecer tu contraseña.');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-1">
          Finanzas
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          {mode === 'login' ? 'Iniciá sesión en tu cuenta' : 'Creá tu cuenta'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Correo</label>
            <input
              type="email"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              {...register('email', { required: 'El correo es obligatorio' })}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              {...register('password', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
              })}
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          {serverError && <p className="text-red-400 text-sm">{serverError}</p>}
          {infoMessage && <p className="text-emerald-400 text-sm">{infoMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg py-2 text-sm transition-colors"
          >
            {mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            onClick={handleForgotPassword}
            className="text-slate-500 hover:text-slate-300 text-xs mt-4 block"
          >
            Olvidé mi contraseña
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-sm text-slate-400">
          {mode === 'login' ? (
            <>
              ¿No tenés cuenta?{' '}
              <button
                onClick={() => {
                  setMode('signup');
                  setServerError(null);
                  setInfoMessage(null);
                }}
                className="text-emerald-400 font-medium"
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{' '}
              <button
                onClick={() => {
                  setMode('login');
                  setServerError(null);
                  setInfoMessage(null);
                }}
                className="text-emerald-400 font-medium"
              >
                Iniciá sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
