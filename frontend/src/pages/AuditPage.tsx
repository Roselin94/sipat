import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import {
  Shield,
  Search,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchAuditLogs = async () => {
    try {
      const res = await apiClient.get('/audit/logs');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error('Erreur chargement logs audit:', err);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.action && log.action.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.entityName && log.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user?.matricule && log.user.matricule.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user?.lastName && log.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = actionFilter ? log.action.includes(actionFilter) : true;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE TRAÇABILITÉ RÉGALIENNE */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-4 h-4 text-emerald-400" />
            Cour des Comptes • Inspection Générale d'État • Présidence
          </div>
          <h1 className="text-2xl font-bold mt-1 text-white">
            Journal d'Audit Régalien Immuable
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enregistrement horodaté et inaltérable de chaque transaction, visa et modification de données
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-xs text-slate-300">
          <p className="font-semibold text-emerald-400">Total Enregistrements : {logs.length}</p>
          <p className="text-slate-400">Intégrité cryptographique active</p>
        </div>
      </div>

      {/* RECHERCHE ET FILTRES */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par action, entité, matricule agent ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
        >
          <option value="">Toutes les Actions</option>
          <option value="PROJECT">Actions Projets</option>
          <option value="WORKFLOW">Visas & Validations</option>
          <option value="AUTH">Authentifications & Connexions</option>
          <option value="OFFLINE">Synchronisations Terrain</option>
        </select>
      </div>

      {/* TABLEAU DES LOGS D'AUDIT */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase">
              <tr>
                <th className="px-6 py-3.5 text-left">Date & Heure (UTC+1)</th>
                <th className="px-6 py-3.5 text-left">Action Républicaine</th>
                <th className="px-6 py-3.5 text-left">Entité / Cible</th>
                <th className="px-6 py-3.5 text-left">Agent Public (Matricule)</th>
                <th className="px-6 py-3.5 text-left">Adresse IP & Traçabilité</th>
                <th className="px-6 py-3.5 text-left">Détails / Empreinte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Aucun événement d'audit répertorié.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                          log.action.includes('APPROVED')
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action.includes('REJECTED') || log.action.includes('FAILED')
                            ? 'bg-red-100 text-red-800'
                            : log.action.includes('CREATED')
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>{log.entityName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{log.entityId.slice(0, 16)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {log.user.firstName} {log.user.lastName}
                          </div>
                          <div className="text-xs text-emerald-700 font-mono">
                            {log.user.matricule} • {log.user.functionTitle}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Système Automatisé</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate font-mono">
                      {log.detailsJson || '—'}
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
