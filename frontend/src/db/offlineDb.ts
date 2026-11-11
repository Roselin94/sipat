import Dexie, { Table } from 'dexie';

export interface LocalOfflineReport {
  id?: number;
  ownerUserId: string;
  localOfflineId: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  milestoneId?: string;
  reportedProgressPct: number;
  findings: string;
  anomaliesObserved?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracyMeters?: number;
  collectedAtLocal: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';
  errorMessage?: string;
}

export interface CachedProject {
  id: string;
  projectId: string;
  ownerUserId: string;
  code: string;
  title: string;
  sector: string;
  status: string;
  departmentName: string;
  physicalProgressPct: number;
  totalBudgetPlanned: number;
  latitude?: number;
  longitude?: number;
  lastCachedAt: string;
}

export class SipatOfflineDatabase extends Dexie {
  fieldReports!: Table<LocalOfflineReport, number>;
  cachedProjects!: Table<CachedProject, string>;

  constructor() {
    super('SipatOfflineDatabase');
    this.version(1).stores({
      fieldReports: '++id, localOfflineId, projectId, syncStatus, collectedAtLocal',
      cachedProjects: 'id, code, sector, status, departmentName',
    });
    this.version(2).stores({
      fieldReports: '++id, localOfflineId, projectId, syncStatus, collectedAtLocal',
      cachedProjects: 'id, ownerUserId, code, sector, status, departmentName',
    });
    this.version(3).stores({
      fieldReports: '++id, localOfflineId, ownerUserId, projectId, syncStatus, collectedAtLocal, [ownerUserId+syncStatus]',
      cachedProjects: 'id, ownerUserId, code, sector, status, departmentName',
    });
  }
}

export const offlineDb = new SipatOfflineDatabase();
