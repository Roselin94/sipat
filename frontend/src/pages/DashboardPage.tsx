import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [prjRes, wfRes] = await Promise.all([
          apiClient.get('/projects'),
          apiClient.get('/workflow/instances'),
        ]);
        setProjects(prjRes.data.data || []);
        setWorkflows(wfRes.data.data || []);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
      }
    };

    loadDashboardData();
  }, []);

  const totalBudget = projects.reduce(
    (sum, p) => sum + parseFloat(p.totalBudgetPlanned || '0'),
    0
  );

  return (
    <div className="space-y-6">
      {/* BANNIÈRE RÉPUBLICAINE */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white border border-slate-700/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Plateforme Nationale de Pilotage • République du Congo
            </div>
            <h1 className="text-2xl font-bold mt-1 text-white">
              Tableau de Bord Stratégique de l'Aménagement
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Connecté en tant que :{' '}
              <span className="text-white font-medium">
                {user?.firstName} {user?.lastName}
              </span>{' '}
              ({user?.functionTitle}) —{' '}
              <span className="text-emerald-300 font-semibold">{user?.organization.shortName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="font-semibold text-white">Double Validation Active</p>
              <p className="text-slate-400">Visa 1 Technique & Visa 2 Institutionnel</p>
            </div>
          </div>
        </div>
      </div>

      {/* CARTES KPI RÉGALIENNES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Projets Sous Périmètre</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{projects.length}</span>
            <span className="text-xs text-slate-500 ml-2">fiches enregistrées</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">En Double Validation</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-600">
              {workflows.filter((w) => !w.isCompleted && !w.isRejected).length}
            </span>
            <span className="text-xs text-slate-500 ml-2">circuits actifs</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Budget Global Planifié</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              {(totalBudget / 1_000_000_000).toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 ml-2">Milliards FCFA</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Projets Validés (Actifs)</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">
              {projects.filter((p) => p.status === 'APPROVED' || p.status === 'IN_PROGRESS').length}
            </span>
            <span className="text-xs text-slate-500 ml-2">autorisés d'exécution</span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES DERNIERS CIRCUITS DE VALIDATION RÉGALIENNE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Circuits de Double Validation en Instance
            </h2>
            <p className="text-xs text-slate-500">
              Suivi des Visas Techniques (Niveau 1) et Institutionnels (Niveau 2)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Désignation Objet
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Type Cible
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Étape Actuelle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  État Global
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  Historique Visas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {workflows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                    Aucun circuit de validation actif pour le moment.
                  </td>
                </tr>
              ) : (
                workflows.map((wf) => (
                  <tr key={wf.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{wf.title}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {wf.targetType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {wf.currentStep === 'TECHNICAL_REVIEW' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Visa 1 : Revue Technique
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Visa 2 : Visa Ministériel
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {wf.isCompleted ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Validé Souverain
                        </span>
                      ) : wf.isRejected ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Rejeté
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          En Instruction
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {wf.reviews && wf.reviews.length > 0 ? (
                        <div className="space-y-1">
                          {wf.reviews.map((r: any) => (
                            <div key={r.id} className="text-slate-700">
                              ✓ <b>{r.stepType === 'TECHNICAL_REVIEW' ? 'Tech' : 'Inst'}</b> par{' '}
                              {r.reviewer?.lastName} ({r.decision})
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Aucun visa émis</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
