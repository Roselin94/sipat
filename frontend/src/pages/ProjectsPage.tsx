import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Eye,
  AlertCircle,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  // États pour les modales CRUD
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<any>(null);

  // Formulaire Projet
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    sector: 'Routes & Voiries',
    leadMinistryId: '',
    departmentId: '',
    localityName: '',
    latitude: 0,
    longitude: 0,
    totalBudgetPlanned: 0,
    contractorName: '',
    supervisingFirm: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await apiClient.get('/projects');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [depRes, orgRes] = await Promise.all([
        apiClient.get('/territory/departments'),
        apiClient.get('/organizations'),
      ]);
      setDepartments(depRes.data.data || []);
      setOrganizations(orgRes.data.data || []);
      if (depRes.data.data?.length > 0) {
        setFormData((prev) => ({
          ...prev,
          departmentId: user?.department?.id || depRes.data.data[0].id,
          leadMinistryId: orgRes.data.data?.[0]?.id || '',
        }));
      }
    } catch (err) {
      console.error('Erreur chargement métadonnées:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchMetadata();
  }, []);

  // 1. CREATE
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        totalBudgetPlanned: Number(formData.totalBudgetPlanned),
        latitude: Number(formData.latitude) || undefined,
        longitude: Number(formData.longitude) || undefined,
      };
      await apiClient.post('/projects', payload);
      setNotification({ type: 'success', message: 'Fiche projet créée et soumise au circuit de double validation.' });
      setIsCreateModalOpen(false);
      resetForm();
      fetchProjects();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Erreur lors de la création du projet.' });
    }
  };

  // 2. UPDATE
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        sector: formData.sector,
        localityName: formData.localityName,
        totalBudgetPlanned: Number(formData.totalBudgetPlanned),
        contractorName: formData.contractorName,
        supervisingFirm: formData.supervisingFirm,
        latitude: Number(formData.latitude) || undefined,
        longitude: Number(formData.longitude) || undefined,
      };
      await apiClient.put(`/projects/${activeProject.id}`, payload);
      setNotification({ type: 'success', message: 'Fiche projet actualisée avec succès.' });
      setIsEditModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Erreur lors de la modification.' });
    }
  };

  // 3. DELETE
  const handleDelete = async (projectId: string, projectTitle: string) => {
    if (!window.confirm(`Confirmez-vous la suppression régalienne du projet "${projectTitle}" ?`)) return;
    try {
      await apiClient.delete(`/projects/${projectId}`);
      setNotification({ type: 'success', message: 'Projet archivé/supprimé du répertoire national.' });
      fetchProjects();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Action non autorisée.' });
    }
  };

  const openEditModal = (prj: any) => {
    setActiveProject(prj);
    setFormData({
      code: prj.code,
      title: prj.title,
      description: prj.description,
      sector: prj.sector,
      leadMinistryId: prj.leadMinistryId,
      departmentId: prj.departmentId,
      localityName: prj.localityName || '',
      latitude: prj.latitude || 0,
      longitude: prj.longitude || 0,
      totalBudgetPlanned: Number(prj.totalBudgetPlanned),
      contractorName: prj.contractorName || '',
      supervisingFirm: prj.supervisingFirm || '',
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (prj: any) => {
    setActiveProject(prj);
    setIsDetailModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: `PRJ-${Date.now().toString().slice(-6)}`,
      title: '',
      description: '',
      sector: 'Routes & Voiries',
      leadMinistryId: organizations[0]?.id || '',
      departmentId: user?.department?.id || departments[0]?.id || '',
      localityName: '',
      latitude: -4.2634,
      longitude: 15.2429,
      totalBudgetPlanned: 100000000,
      contractorName: '',
      supervisingFirm: '',
    });
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector ? p.sector === selectedSector : true;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6">
      {/* NOTIFICATIONS RÉGALIENNES */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER AVEC BOUTON DE CRÉATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Répertoire & Pilotage des Projets Nationaux
          </h1>
          <p className="text-sm text-slate-500">
            Gestion des fiches projets, cartographie SIG et circuits d'approbation
          </p>
        </div>

        {(hasRole('PROJECT_MANAGER') || hasRole('SUPER_ADMIN')) && (
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau Projet d'Aménagement
          </button>
        )}
      </div>

      {/* FILTRES ET RECHERCHE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par code, nom du projet ou département..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none"
        >
          <option value="">Tous les Secteurs</option>
          <option value="Routes & Voiries">Routes & Voiries</option>
          <option value="Énergie & Électrification">Énergie & Électrification</option>
          <option value="Eau & Assainissement">Eau & Assainissement</option>
          <option value="Santé & Hôpitaux">Santé & Hôpitaux</option>
          <option value="Éducation & Universités">Éducation & Universités</option>
        </select>
      </div>

      {/* TABLEAU CRUD COMPLET */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase">
              <tr>
                <th className="px-6 py-3.5 text-left">Code & Projet</th>
                <th className="px-6 py-3.5 text-left">Secteur / Département</th>
                <th className="px-6 py-3.5 text-left">Budget Voté (FCFA)</th>
                <th className="px-6 py-3.5 text-left">Avancement Physique</th>
                <th className="px-6 py-3.5 text-left">Statut Régalien</th>
                <th className="px-6 py-3.5 text-right">Actions (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Aucun projet répertorié sous ce filtre.
                  </td>
                </tr>
              ) : (
                filtered.map((prj) => (
                  <tr key={prj.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{prj.title}</div>
                      <div className="text-xs text-emerald-700 font-mono mt-0.5">{prj.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{prj.sector}</div>
                      <div className="text-xs text-slate-500">{prj.department?.name || 'Congo'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      {new Intl.NumberFormat('fr-FR').format(prj.totalBudgetPlanned)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 w-10">
                          {prj.physicalProgressPct || 0}%
                        </span>
                        <div className="w-24 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{ width: `${prj.physicalProgressPct || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {prj.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailModal(prj)}
                          title="Consulter les détails"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(hasRole('PROJECT_MANAGER') || hasRole('SUPER_ADMIN')) && (
                          <button
                            onClick={() => openEditModal(prj)}
                            title="Modifier la fiche"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasRole('SUPER_ADMIN') && (
                          <button
                            onClick={() => handleDelete(prj.id, prj.title)}
                            title="Supprimer (Super Admin)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE 1 : CRÉATION DE PROJET (CREATE) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Enregistrer un Nouveau Projet</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Code Projet Régalien</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Secteur Stratégique</label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="Routes & Voiries">Routes & Voiries</option>
                    <option value="Énergie & Électrification">Énergie & Électrification</option>
                    <option value="Eau & Assainissement">Eau & Assainissement</option>
                    <option value="Santé & Hôpitaux">Santé & Hôpitaux</option>
                    <option value="Éducation & Universités">Éducation & Universités</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Intitulé Officiel du Projet</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Construction du Pont sur le fleuve Kouilou"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description Technique & Portée</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Département de Localisation</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Budget Voté (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={formData.totalBudgetPlanned}
                    onChange={(e) => setFormData({ ...formData, totalBudgetPlanned: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Entreprise Adjudicataire</label>
                  <input
                    type="text"
                    placeholder="Nom du constructeur / groupement"
                    value={formData.contractorName}
                    onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bureau de Contrôle (MDC)</label>
                  <input
                    type="text"
                    placeholder="ex: BNETD, Veritas..."
                    value={formData.supervisingFirm}
                    onChange={(e) => setFormData({ ...formData, supervisingFirm: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-sm"
                >
                  Créer et Soumettre au Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 2 : MODIFICATION (UPDATE) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Modifier le Projet {formData.code}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Titre du Projet</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Budget Révisé (FCFA)</label>
                  <input
                    type="number"
                    value={formData.totalBudgetPlanned}
                    onChange={(e) => setFormData({ ...formData, totalBudgetPlanned: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Entreprise</label>
                  <input
                    type="text"
                    value={formData.contractorName}
                    onChange={(e) => setFormData({ ...formData, contractorName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE 3 : DÉTAIL COMPLET (READ ONE) */}
      {isDetailModalOpen && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {activeProject.code}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{activeProject.title}</h2>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <p className="bg-slate-50 p-3 rounded-lg border border-slate-100">{activeProject.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Secteur :</span>
                  <p className="font-medium text-slate-800">{activeProject.sector}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Département :</span>
                  <p className="font-medium text-slate-800">{activeProject.department?.name || 'National'}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Budget Planifié :</span>
                  <p className="font-mono font-bold text-slate-900">
                    {new Intl.NumberFormat('fr-FR').format(activeProject.totalBudgetPlanned)} FCFA
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Avancement Physique :</span>
                  <p className="font-bold text-emerald-700">{activeProject.physicalProgressPct || 0}%</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Partenaires & Entreprises
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Adjudicataire :</span>{' '}
                    <b>{activeProject.contractorName || 'Non assigné'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">Mission de contrôle :</span>{' '}
                    <b>{activeProject.supervisingFirm || 'Non assigné'}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
