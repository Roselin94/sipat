import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  CheckCircle2,
  AlertTriangle,
  Shield,
  Send,
} from 'lucide-react';

export const ValidationsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWf, setSelectedWf] = useState<any>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED_WITH_RESERVATIONS' | 'REJECTED_DEFINITIVELY'>('APPROVED');
  const [comments, setComments] = useState('');
  const [reservations, setReservations] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchWorkflows = async () => {
    try {
      const res = await apiClient.get('/workflow/instances');
      setWorkflows(res.data.data || []);
      if (res.data.data?.length > 0 && !selectedWf) {
        setSelectedWf(res.data.data[0]);
      }
    } catch (err) {
      console.error('Erreur chargement workflows:', err);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWf) return;

    try {
      await apiClient.post(`/workflow/instances/${selectedWf.id}/review`, {
        decision,
        comments,
        reservations: reservations || undefined,
        snapshotData: {
          timestamp: new Date().toISOString(),
          reviewerTitle: user?.functionTitle,
        },
      });

      setNotification({
        type: 'success',
        message: 'Visa formel enregistré dans le journal régalien avec succès.',
      });
      setComments('');
      setReservations('');
      fetchWorkflows();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Erreur lors de l’émission du visa.',
      });
    }
  };

  const isEligibleReviewer = () => {
    if (!selectedWf) return false;
    if (selectedWf.isCompleted || selectedWf.isRejected) return false;
    if (selectedWf.currentStep === 'TECHNICAL_REVIEW') {
      return hasRole('TECHNICAL_VALIDATOR') || hasRole('SUPER_ADMIN');
    }
    if (selectedWf.currentStep === 'INSTITUTIONAL_APPROVAL') {
      return hasRole('MINISTER_DIRECTOR') || hasRole('SUPER_ADMIN');
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Chambre de Double Validation Régalienne
        </h1>
        <p className="text-sm text-slate-500">
          Instruction technique (Visa 1) et approbation institutionnelle indépendante (Visa 2)
        </p>
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
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LISTE DES INSTANCES DE VALIDATION */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs uppercase text-slate-600">
            Dossiers en Attente de Visa ({workflows.length})
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[600px]">
            {workflows.map((wf) => {
              const isSelected = selectedWf?.id === wf.id;
              return (
                <button
                  key={wf.id}
                  onClick={() => setSelectedWf(wf)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {wf.targetType}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        wf.isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : wf.isRejected
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {wf.isCompleted ? 'Validé Final' : wf.isRejected ? 'Rejeté' : 'En Cours'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{wf.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Étape :{' '}
                      <b>{wf.currentStep === 'TECHNICAL_REVIEW' ? '1 (Technique)' : '2 (Ministériel)'}</b>
                    </span>
                    <span>{wf.reviews?.length || 0} visa(s)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* DÉTAIL ET VISA DU DOSSIER SÉLECTIONNÉ */}
        <div className="lg:col-span-2 space-y-6">
          {selectedWf ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    ID : {selectedWf.id.slice(0, 13)}...
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedWf.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Cible : <b>{selectedWf.targetType}</b> • Référence cible : {selectedWf.targetId}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-500 uppercase">Étape Active</div>
                  <div className="text-sm font-extrabold text-blue-700">
                    {selectedWf.currentStep === 'TECHNICAL_REVIEW'
                      ? 'Étape 1 : Visa Technique'
                      : 'Étape 2 : Visa Ministériel'}
                  </div>
                </div>
              </div>

              {/* HISTORIQUE IMMUABLE DES VISAS ENREGISTRÉS */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                  Historique Régalien des Visas
                </h3>
                {selectedWf.reviews?.length === 0 ? (
                  <p className="text-xs italic text-slate-400">Aucun visa émis sur ce circuit pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedWf.reviews.map((rev: any) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-900">
                            ✓ {rev.stepType === 'TECHNICAL_REVIEW' ? 'Visa 1 (Technique)' : 'Visa 2 (Institutionnel)'} —{' '}
                            {rev.reviewer?.firstName} {rev.reviewer?.lastName} ({rev.reviewer?.functionTitle})
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rev.decision === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {rev.decision}
                          </span>
                        </div>
                        <p className="text-slate-600 italic">« {rev.comments} »</p>
                        {rev.reservations && (
                          <p className="text-amber-800 bg-amber-50 p-1.5 rounded">
                            Réserves : {rev.reservations}
                          </p>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">
                          Empreinte SHA-256 : {rev.snapshotDataHash.slice(0, 24)}... • IP : {rev.ipAddress || 'Interne'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FORMULAIRE DE SIGNATURE / VISA FORMEL */}
              {isEligibleReviewer() ? (
                <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      Vous disposez de l'habilitation légale pour émettre le{' '}
                      <b>{selectedWf.currentStep === 'TECHNICAL_REVIEW' ? 'Visa Technique (Étape 1)' : 'Visa Institutionnel (Étape 2)'}</b>.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Décision Formelle
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="APPROVED"
                          checked={decision === 'APPROVED'}
                          onChange={() => setDecision('APPROVED')}
                        />
                        <span className="font-semibold text-emerald-700">Approuver (Favorable)</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="REJECTED_WITH_RESERVATIONS"
                          checked={decision === 'REJECTED_WITH_RESERVATIONS'}
                          onChange={() => setDecision('REJECTED_WITH_RESERVATIONS')}
                        />
                        <span className="font-semibold text-amber-700">Rejet avec Réserves</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="decision"
                          value="REJECTED_DEFINITIVELY"
                          checked={decision === 'REJECTED_DEFINITIVELY'}
                          onChange={() => setDecision('REJECTED_DEFINITIVELY')}
                        />
                        <span className="font-semibold text-red-700">Rejet Définitif</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Commentaire et Motivation du Visa
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Indiquez vos motifs d'approbation ou de rejet réglementaire..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>

                  {decision === 'REJECTED_WITH_RESERVATIONS' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Détail des Réserves Techniques à Lever
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Rectifier les études géotechniques de portance au PK 15..."
                        value={reservations}
                        onChange={(e) => setReservations(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-amber-50/50"
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      Consigner le Visa Régalien
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                  {selectedWf.isCompleted
                    ? 'Ce circuit de validation est entièrement achevé et validé.'
                    : selectedWf.isRejected
                    ? 'Ce circuit a été rejeté par l’autorité.'
                    : 'Votre profil utilisateur actuel n’est pas habilité pour instruire cette étape spécifique.'}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              Sélectionnez un circuit de validation pour examiner le dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

