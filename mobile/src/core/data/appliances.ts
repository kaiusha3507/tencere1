import type { ApplianceId } from '../types.ts';

export interface ApplianceInfo {
  id: ApplianceId;
  name: string;
  short: string;
}

export const APPLIANCES: ApplianceInfo[] = [
  { id: 'ocak', name: 'Ocak', short: 'Ocak' },
  { id: 'firin', name: 'Fırın', short: 'Fırın' },
  { id: 'mikrodalga', name: 'Mikrodalga', short: 'Mikrodalga' },
  { id: 'airfryer', name: 'Air fryer', short: 'Air fryer' },
  { id: 'duduklu', name: 'Düdüklü tencere', short: 'Düdüklü' },
  { id: 'pilav', name: 'Pilav pişirici', short: 'Pilav pişirici' },
  { id: 'tost', name: 'Tost makinesi', short: 'Tost mak.' },
  { id: 'blender', name: 'Blender', short: 'Blender' },
  { id: 'izgara', name: 'Izgara / elektrikli ızgara', short: 'Izgara' },
];

export const APPLIANCE_BY_ID: Record<ApplianceId, ApplianceInfo> = Object.fromEntries(
  APPLIANCES.map((a) => [a.id, a]),
) as Record<ApplianceId, ApplianceInfo>;

export const ALL_APPLIANCE_IDS: ApplianceId[] = APPLIANCES.map((a) => a.id);
