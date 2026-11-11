import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Map,
  Shield,
  CreditCard,
  LogOut,
  Radio,
  Menu,
  X,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout, isOfflineSession } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { name: 'Projets d’Aménagement', href: '/projects', icon: FolderKanban },
    { name: 'Double Validation', href: '/validations', icon: CheckSquare },
    { name: 'Exécution Financière', href: '/finance', icon: CreditCard },
    { name: 'Cartographie SIG', href: '/map', icon: Map },
    { name: 'Contrôles Terrain (PWA)', href: '/field-reports', icon: Radio },
    { name: 'Registre d’Audit', href: '/audit', icon: Shield },
  ].filter((item) => !isOfflineSession || item.href === '/field-reports');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER SUPÉRIEUR RÉPUBLICAIN */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo_sipat.png"
              alt="Logo SIPAT Congo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="font-bold text-base tracking-wide flex items-center gap-2">
                SIPAT <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded text-white font-medium">CONGO</span>
              </span>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Aménagement du Territoire & Infrastructures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[11px] text-emerald-400">
                {user?.roles[0]} • {user?.organization.shortName}
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Déconnexion sécurisée"
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* BOUTON MENU BURGER MOBILE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors focus:outline-none"
              aria-label="Ouvrir le menu de navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* TIROIR DE NAVIGATION MOBILE */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200">
            <div className="sm:hidden pb-3 border-b border-slate-800 mb-2">
              <div className="text-xs font-semibold text-white">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-[11px] text-emerald-400">
                {user?.roles[0]} • {user?.organization.shortName}
              </div>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Périmètre : {user?.territorialScope === 'NATIONAL' ? 'Compétence Nationale' : `Dép. ${user?.department?.name || 'Local'}`}
            </div>
          </div>
        )}

        {/* BARRE DE COULEURS DU DRAPEAU NATIONAL DU CONGO */}
        <div className="h-1 w-full flex">
          <div className="bg-[#007A3D] flex-1"></div>
          <div className="bg-[#FFD100] flex-1"></div>
          <div className="bg-[#DC241F] flex-1"></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 w-full flex gap-6">
        {/* MENU LATÉRAL */}
        <aside className="w-64 flex-shrink-0 hidden md:block">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm sticky top-24">
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation Régalienne
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-100 px-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Périmètre Assigné
              </div>
              <div className="mt-1 text-xs text-slate-700 font-medium">
                {user?.territorialScope === 'NATIONAL'
                  ? 'Compétence Nationale (12 Dép.)'
                  : `Département : ${user?.department?.name || 'Local'}`}
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          {isOfflineSession && (
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Session locale hors ligne. Seuls les rapports terrain enregistrés sur cet appareil
              sont accessibles ; les droits doivent être revalidés au retour du réseau.
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* BARRE DE NAVIGATION INFÉRIEURE MOBILE (BOTTOM NAV BAR) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {navigation.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="truncate max-w-[64px]">{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        République du Congo — Présidence de la République / Ministère de l’Aménagement du Territoire © 2026
      </footer>
    </div>
  );
};
