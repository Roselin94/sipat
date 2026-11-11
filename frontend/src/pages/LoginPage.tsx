import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, ArrowRight, Building2, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedId = identifier.trim();
      const trimmedPwd = password.trim();
      await login(trimmedId, trimmedPwd);
      window.location.href = '/';
    } catch (err: any) {
      console.error('Erreur login:', err);
      setError(
        err.response?.data?.message || err.message || 'Échec de connexion : vérifiez vos identifiants républicains'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <header className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <img
            src="/logo_sipat.png"
            alt="Logo SIPAT République du Congo"
            className="h-20 w-auto object-contain drop-shadow-md"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
          RÉPUBLIQUE DU CONGO
        </h1>
        <p className="mt-1 text-sm font-medium text-emerald-400">Unité - Travail - Progrès</p>
        <p className="mt-2 text-xs text-slate-400">
          Système Intégré de Pilotage de l’Aménagement du Territoire (SIPAT)
        </p>
      </header>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form
          className="space-y-5 rounded-xl border border-slate-700 bg-slate-800 px-6 py-8 shadow-xl sm:px-10"
          onSubmit={handleSubmit}
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-700 bg-red-900/50 p-3 text-sm text-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="login"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Login
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Building2 className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="login"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Matricule ou adresse professionnelle"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
            >
              Mot de passe
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Authentification…' : 'Se connecter'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </main>
  );
};
