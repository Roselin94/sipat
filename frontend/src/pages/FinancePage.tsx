import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  CheckCircle,
  CreditCard,
} from 'lucide-react';

export const FinancePage: React.FC = () => {
  const { hasRole } = useAuth();
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulaire Demande de Paiement / Décompte
  const [formData, setFormData] = useState({
    projectId: '',
    disbursementNumber: '',
    invoiceReference: '',
    amountRequested: 50000000,
    linkedPhysicalPct: 25,
    justificationMemo: '',
  });

  const fetchData = async () => {
    try {
      const [prjRes, payRes] = await Promise.all([
        apiClient.get('/projects'),
        apiClient.get('/finance/disbursements'),
      ]);
      setProjects(prjRes.data.data || []);
      setDisbursements(payRes.data.data || []);
      if (prjRes.data.data?.length > 0 && !formData.projectId) {
        setFormData((prev) => ({
          ...prev,
          projectId: prjRes.data.data[0].id,
          disbursementNumber: `DEC-2026-${Date.now().toString().slice(-4)}`,
        }));
      }
    } catch (err) {
      console.error('Erreur chargement données financières:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/finance/disbursements', {
        ...formData,
        amountRequested: Number(formData.amountRequested),
        linkedPhysicalPct: Number(formData.linkedPhysicalPct),
      });

      setNotification({
        type: 'success',
        message: 'Demande de décompte enregistrée et transmise au circuit financier régalien.',
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erreur lors de la soumission du décompte.',
      });
    }
  };

  const totalDisbursed = disbursements
    .filter((d) => d.status === 'PAID' || d.status === 'VALIDATED_FOR_PAYMENT')
    .reduce((sum, d) => sum + Number(d.amountValidated || d.amountRequested), 0);

  const totalRequested = disbursements.reduce((sum, d) => sum + Number(d.amountRequested), 0);

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE GESTION FINANCIÈRE */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Trésor Public • Contrôle Financier • Décaissements
          </div>
          <h1 className="text-2xl font-bold mt-1 text-white">
            Suivi des Décomptes & Exécution Budgétaire
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Découplage strict entre l'avancement physique constaté et les paiements ordonnancés
          </p>
        </div>

        {(hasRole('PROJECT_MANAGER') || hasRole('SUPER_ADMIN')) && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau Décompte Financier
          </button>
        )}
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* KPI FINANCIERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-500">Total Demandes Émises</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
            {new Intl.NumberFormat('fr-FR').format(totalRequested)} <span className="text-sm font-sans text-slate-500">FCFA</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">{disbursements.length} mandat(s) déposé(s)</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-500">Validé pour Paiement</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-2">
            {new Intl.NumberFormat('fr-FR').format(totalDisbursed)} <span className="text-sm font-sans text-slate-500">FCFA</span>
          </div>
          <span className="text-xs text-emerald-600 mt-1 block">Visé par le Trésor Public</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-500">En Instance de Contrôle</span>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {disbursements.filter((d) => d.status === 'DRAFT' || d.status === 'PENDING_TECH_AUDIT').length}
          </div>
          <span className="text-xs text-amber-600 mt-1 block">Vérification des pièces comptables</span>
        </div>
      </div>

      {/* TABLEAU DES DÉCOMPTES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-xs uppercase text-slate-600">
          Registre des Mandats et Décomptes de Travaux
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3.5 text-left">N° Décompte & Réf. Facture</th>
                <th className="px-6 py-3.5 text-left">Projet d'Aménagement</th>
                <th className="px-6 py-3.5 text-left">Montant Demandé</th>
                <th className="px-6 py-3.5 text-left">Avancement Physique Lié</th>
                <th className="px-6 py-3.5 text-left">Statut Financier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {disbursements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Aucun décompte financier enregistré.
                  </td>
                </tr>
              ) : (
                disbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold font-mono text-slate-900">{d.disbursementNumber}</div>
                      <div className="text-xs text-slate-500">Facture : {d.invoiceReference}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{d.project?.title || 'Projet'}</div>
                      <div className="text-xs font-mono text-emerald-700">{d.project?.code}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {new Intl.NumberFormat('fr-FR').format(d.amountRequested)} FCFA
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-700">{d.linkedPhysicalPct}%</span>
                      <span className="text-xs text-slate-400 ml-1.5">(chantier : {d.project?.physicalProgressPct || 0}%)</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          d.status === 'PAID' || d.status === 'VALIDATED_FOR_PAYMENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE NOUVEAU DÉCOMPTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Nouvelle Demande de Décompte</h2>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chantier Concerné</label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">N° du Décompte</label>
                  <input
                    type="text"
                    required
                    value={formData.disbursementNumber}
                    onChange={(e) => setFormData({ ...formData, disbursementNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Référence Facture Entreprise</label>
                  <input
                    type="text"
                    required
                    placeholder="FAC-2026-..."
                    value={formData.invoiceReference}
                    onChange={(e) => setFormData({ ...formData, invoiceReference: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Montant Demandé (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={formData.amountRequested}
                    onChange={(e) => setFormData({ ...formData, amountRequested: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Avancement Physique Justifié (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.linkedPhysicalPct}
                    onChange={(e) => setFormData({ ...formData, linkedPhysicalPct: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-emerald-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mémoire Justificatif des Travaux</label>
                <textarea
                  rows={2}
                  placeholder="Justification des prestations exécutées pour ce décompte..."
                  value={formData.justificationMemo}
                  onChange={(e) => setFormData({ ...formData, justificationMemo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs text-slate-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
                >
                  Soumettre pour Visa Financier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
