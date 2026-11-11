import React, { useEffect, useState } from 'react';
import { AlertCircle, MapPin } from 'lucide-react';
import { apiClient } from '../api/client';
import { ProjectMap } from '../components/map/ProjectMap';

export const MapPage: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      apiClient.get('/projects'),
      apiClient.get('/territory/departments'),
    ])
      .then(([projectsResponse, departmentsResponse]) => {
        if (!isActive) return;
        setProjects(projectsResponse.data.data || []);
        setDepartments(departmentsResponse.data.data || []);
      })
      .catch(() => {
        if (isActive) setError('Impossible de charger les projets et les référentiels territoriaux.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const locatedProjects = projects.filter(
    (project) => project.latitude != null && project.longitude != null
  ).length;
  const boundaryCount = departments.reduce(
    (count, department) =>
      count +
      Number(Boolean(department.geoJson)) +
      (department.districts || []).filter((district: any) => district.geoJson).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cartographie SIG nationale</h1>
          <p className="text-sm text-slate-500">
            Répartition géographique des projets d’aménagement enregistrés.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-emerald-600" />
          {isLoading
            ? 'Chargement…'
            : `${locatedProjects} projet(s) géolocalisé(s) · ${boundaryCount} contour(s)`}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <ProjectMap projects={projects} departments={departments} />

      {!isLoading && !error && locatedProjects === 0 && (
        <p className="text-sm text-slate-500">
          Aucun projet n’a de coordonnées GPS. Ajoutez latitude et longitude dans sa fiche pour
          l’afficher sur la carte.
        </p>
      )}
      {!isLoading && !error && boundaryCount === 0 && (
        <p className="text-sm text-amber-700">
          Les contours administratifs ne sont pas encore renseignés. Importez les GeoJSON officiels
          dans le référentiel territorial pour les afficher.
        </p>
      )}
    </div>
  );
};
