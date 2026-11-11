import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { offlineDb, LocalOfflineReport } from '../db/offlineDb';
import { useAuth } from '../contexts/AuthContext';
import {
  Radio,
  Wifi,
  WifiOff,
  CheckCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';

// Générateur universel RFC4122 v4 natif sans dépendance externe
const generateUuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const FieldReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [projects, setProjects] = useState<any[]>([]);
  const [offlineReports, setOfflineReports] = useState<LocalOfflineReport[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Formulaire Relevé Terrain
  const [formData, setFormData] = useState({
    projectId: '',
    reportedProgressPct: 10,
    findings: '',
    anomaliesObserved: '',
    gpsLatitude: -4.2634,
    gpsLongitude: 15.2429,
  });

  const loadOfflineData = async () => {
    if (!user) {
      setOfflineReports([]);
      return;
    }
    const list = await offlineDb.fieldReports.where('ownerUserId').equals(user.id).toArray();
    setOfflineReports(list);
  };

  const loadCachedProjects = async () => {
    if (!user) return;
    const cachedProjects = await offlineDb.cachedProjects
      .where('ownerUserId')
      .equals(user.id)
      .toArray();
    setProjects(cachedProjects.map((project) => ({ ...project, id: project.projectId })));
    setFormData((prev) => ({
      ...prev,
      projectId: prev.projectId || cachedProjects[0]?.projectId || '',
    }));
  };

  const loadServerData = async () => {
    let serverProjects: any[];
    try {
      const prjRes = await apiClient.get('/projects');
      serverProjects = prjRes.data.data || [];
    } catch (error) {
      if (navigator.onLine) {
        console.warn('API inaccessible ; chargement des projets mis en cache.', error);
      }
      await loadCachedProjects();
      return;
    }

    setProjects(serverProjects);
    setFormData((prev) => ({
      ...prev,
      projectId: serverProjects.some((project) => project.id === prev.projectId)
        ? prev.projectId
        : serverProjects[0]?.id || '',
    }));
    if (!user) return;

    const cachedProjects = serverProjects.map((project) => ({
      id: `${user.id}:${project.id}`,
      projectId: project.id,
      ownerUserId: user.id,
      code: project.code,
      title: project.title,
      sector: project.sector,
      status: project.status,
      departmentName: project.department?.name || '',
      physicalProgressPct: project.physicalProgressPct || 0,
      totalBudgetPlanned: Number(project.totalBudgetPlanned || 0),
      latitude: project.latitude,
      longitude: project.longitude,
      lastCachedAt: new Date().toISOString(),
    }));
    try {
      await offlineDb.transaction('rw', offlineDb.cachedProjects, async () => {
        await offlineDb.cachedProjects.where('ownerUserId').equals(user.id).delete();
        await offlineDb.cachedProjects.bulkPut(cachedProjects);
      });
    } catch (error) {
      console.error('Erreur de mise en cache des projets pour le mode hors ligne:', error);
      setNotification({
        type: 'error',
        message: 'Projets chargés, mais la copie hors ligne n’a pas pu être enregistrée.',
      });
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadOfflineData().catch((error) => {
      console.error('Erreur de lecture des rapports terrain locaux:', error);
      setNotification({ type: 'error', message: 'Impossible de lire les rapports enregistrés sur cet appareil.' });
    });
    loadServerData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Détection GPS Terrain automatique
  const captureGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            gpsLatitude: Number(pos.coords.latitude.toFixed(6)),
            gpsLongitude: Number(pos.coords.longitude.toFixed(6)),
          }));
        },
        () => {
          console.warn('GPS non disponible ou refusé');
        }
      );
    }
  };

  // Enregistrement Local dans IndexedDB (PWA Hors-ligne)
  const handleSaveOfflineReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setNotification({ type: 'error', message: 'Session utilisateur indisponible sur cet appareil.' });
      return;
    }
    const selectedPrj = projects.find((p) => p.id === formData.projectId);
    if (!selectedPrj) {
      setNotification({
        type: 'error',
        message: 'Aucun projet disponible hors ligne. Connectez-vous pour charger les projets avant la collecte.',
      });
      return;
    }

    const report: LocalOfflineReport = {
      localOfflineId: generateUuid(),
      ownerUserId: user.id,
      projectId: formData.projectId,
      projectCode: selectedPrj?.code || 'PRJ-TERRAIN',
      projectTitle: selectedPrj?.title || 'Chantier Local',
      reportedProgressPct: Number(formData.reportedProgressPct),
      findings: formData.findings,
      anomaliesObserved: formData.anomaliesObserved || undefined,
      gpsLatitude: formData.gpsLatitude,
      gpsLongitude: formData.gpsLongitude,
      collectedAtLocal: new Date().toISOString(),
      syncStatus: 'PENDING',
    };

    await offlineDb.fieldReports.add(report);
    setNotification({
      type: 'success',
      message: 'Rapport consigné localement sur cet appareil (IndexedDB).',
    });
    setIsModalOpen(false);
    setFormData({
      projectId: projects[0]?.id || '',
      reportedProgressPct: 10,
      findings: '',
      anomaliesObserved: '',
      gpsLatitude: -4.2634,
      gpsLongitude: 15.2429,
    });
    loadOfflineData();
  };

  // Synchronisation différée vers le Datacenter Gouvernemental
  const triggerSync = async () => {
    if (!user || !isOnline) return;
    const pendingList = await offlineDb.fieldReports
      .where('[ownerUserId+syncStatus]')
      .equals([user.id, 'PENDING'])
      .toArray();
    if (pendingList.length === 0) {
      setNotification({ type: 'success', message: 'Aucun rapport en attente de synchronisation.' });
      return;
    }

    setIsSyncing(true);
    try {
      const payload = {
        clientSyncId: generateUuid(),
        reports: pendingList.map((r) => ({
          localOfflineId: r.localOfflineId,
          projectId: r.projectId,
          reportedProgressPct: r.reportedProgressPct,
          findings: r.findings,
          anomaliesObserved: r.anomaliesObserved,
          gpsLatitude: r.gpsLatitude,
          gpsLongitude: r.gpsLongitude,
          collectedAtLocal: r.collectedAtLocal,
        })),
      };

      const res = await apiClient.post('/sync/field-reports', payload);

      // Marquer comme synchronisé dans Dexie
      for (const p of pendingList) {
        if (p.id) {
          await offlineDb.fieldReports.update(p.id, { syncStatus: 'SYNCED' });
        }
      }

      setNotification({
        type: 'success',
        message: `${res.data.data.syncedCount} relevé(s) terrain synchronisé(s) avec le serveur central.`,
      });
      loadOfflineData();
      loadServerData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Échec de transmission vers le serveur.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = offlineReports.filter((r) => r.syncStatus === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* BANNIÈRE DE CONNECTIVITÉ ET D'ÉTAT DU DISPOSITIF */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
          >
            {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Mode Terrain PWA & Synchronisation Résiliente
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
              >
                {isOnline ? 'En Ligne (Datacenter)' : 'Hors-Ligne (Mode Local Déconnecté)'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Collecte géolocalisée hors réseau avec file d'attente locale sur cet appareil
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => {
              captureGps();
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau Relevé Terrain
          </button>

          <button
            onClick={triggerSync}
            disabled={isSyncing || pendingCount === 0 || !isOnline}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-sm disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Synchroniser ({pendingCount})
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${notification.type === 'success'
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

      {/* TABLEAU DES RELEVÉS LOCAUX HORS-LIGNE (INDEXEDDB) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-xs uppercase text-slate-600 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            Relevés dans la File d'Attente Locale (IndexedDB)
          </div>
          <span className="text-xs text-slate-500 font-medium">{offlineReports.length} élément(s) en cache</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Chantier</th>
                <th className="px-6 py-3 text-left">Avancement Constaté</th>
                <th className="px-6 py-3 text-left">Constats & Anomalies</th>
                <th className="px-6 py-3 text-left">Position GPS</th>
                <th className="px-6 py-3 text-left">Statut Synchronisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {offlineReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    Aucun rapport en mémoire locale IndexedDB.
                  </td>
                </tr>
              ) : (
                offlineReports.map((rep) => (
                  <tr key={rep.localOfflineId} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{rep.projectTitle}</div>
                      <div className="text-[11px] font-mono text-emerald-700">{rep.projectCode}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-700">{rep.reportedProgressPct}%</td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-800 line-clamp-1">{rep.findings}</p>
                      {rep.anomaliesObserved && (
                        <span className="text-[10px] text-amber-700 font-medium">⚠️ {rep.anomaliesObserved}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {rep.gpsLatitude}, {rep.gpsLongitude}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rep.syncStatus === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                          }`}
                      >
                        {rep.syncStatus === 'SYNCED' ? 'Transmis au Serveur' : 'En Attente de Réseau'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE RELEVÉ TERRAIN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Saisie de Contrôle Terrain</h2>
              <button onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveOfflineReport} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chantier / Projet</label>
                <select
                  required
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {projects.length === 0 && <option value="">Aucun projet mis en cache</option>}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Avancement Physique Observé sur le Terrain (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={formData.reportedProgressPct}
                  onChange={(e) => setFormData({ ...formData, reportedProgressPct: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Constats de l'Inspecteur</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Métrés constatés, présence des engins, approvisionnement matériaux..."
                  value={formData.findings}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Anomalies ou Réserves (Optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: Fissurations sur les buses, retard de coulage..."
                  value={formData.anomaliesObserved}
                  onChange={(e) => setFormData({ ...formData, anomaliesObserved: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Latitude GPS :</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.gpsLatitude}
                    onChange={(e) => setFormData({ ...formData, gpsLatitude: Number(e.target.value) })}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
                <div>
                  <span className="text-slate-400">Longitude GPS :</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.gpsLongitude}
                    onChange={(e) => setFormData({ ...formData, gpsLongitude: Number(e.target.value) })}
                    className="w-full px-2 py-1 border rounded mt-1"
                  />
                </div>
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
                  Consigner en Cache Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
