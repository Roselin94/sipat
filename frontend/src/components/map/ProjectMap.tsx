import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ProjectMapProps {
  projects: any[];
  departments: Array<{
    id: string;
    name: string;
    geoJson?: string | null;
    districts?: Array<{ id: string; name: string; geoJson?: string | null }>;
  }>;
}

export const ProjectMap: React.FC<ProjectMapProps> = ({ projects, departments }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const projectLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView([-0.8037, 15.3444], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
    projectLayerRef.current = L.layerGroup().addTo(map);
    boundaryLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      projectLayerRef.current = null;
      boundaryLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const projectLayer = projectLayerRef.current;
    const boundaryLayer = boundaryLayerRef.current;
    if (!map || !projectLayer || !boundaryLayer) return;

    projectLayer.clearLayers();
    boundaryLayer.clearLayers();
    const bounds = L.latLngBounds([]);

    departments.forEach((department) => {
      const addBoundary = (
        geoJson: string | null | undefined,
        name: string,
        color: string
      ) => {
        if (!geoJson) return;
        try {
          const parsed = JSON.parse(geoJson);
          const layer = L.geoJSON(parsed, {
            style: { color, weight: 2, fillOpacity: 0.08 },
            onEachFeature: (_feature, featureLayer) => {
              const label = L.DomUtil.create('div');
              label.textContent = name;
              featureLayer.bindPopup(label);
            },
          }).addTo(boundaryLayer);
          const layerBounds = layer.getBounds();
          if (layerBounds.isValid()) bounds.extend(layerBounds);
        } catch (error) {
          console.error(`Géométrie GeoJSON invalide pour ${name}:`, error);
        }
      };

      addBoundary(department.geoJson, department.name, '#007A3D');
      (department.districts || []).forEach((district) => {
        addBoundary(district.geoJson, district.name, '#D97706');
      });
    });

    projects.forEach((project) => {
      if (
        typeof project.latitude !== 'number' ||
        typeof project.longitude !== 'number' ||
        !Number.isFinite(project.latitude) ||
        !Number.isFinite(project.longitude) ||
        project.latitude < -90 ||
        project.latitude > 90 ||
        project.longitude < -180 ||
        project.longitude > 180
      ) {
        return;
      }

      const marker = L.marker([project.latitude, project.longitude]).addTo(projectLayer);
      const popup = L.DomUtil.create('div');
      const code = L.DomUtil.create('strong', '', popup);
      code.style.color = '#007A3D';
      code.textContent = project.code;
      popup.appendChild(document.createElement('br'));
      const title = L.DomUtil.create('strong', '', popup);
      title.textContent = project.title;
      popup.appendChild(document.createElement('br'));
      popup.append(`Secteur : ${project.sector}`);
      popup.appendChild(document.createElement('br'));
      popup.append(`Statut : ${project.status}`);
      popup.appendChild(document.createElement('br'));
      popup.append(`Avancement : ${project.physicalProgressPct || 0}%`);
      marker.bindPopup(popup);
      bounds.extend(marker.getLatLng());
    });

    if (bounds.isValid()) map.fitBounds(bounds.pad(0.08), { maxZoom: 8 });
  }, [projects, departments]);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Cartographie Nationale des Projets d'Aménagement
          </h3>
          <p className="text-xs text-slate-500">
            Projets, limites départementales et districts (si les GeoJSON sont disponibles)
          </p>
        </div>
      </div>
      <div
        ref={mapContainerRef}
        className="w-full h-[500px] rounded-lg border border-slate-200 overflow-hidden"
      />
    </div>
  );
};
