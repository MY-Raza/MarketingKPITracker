// Copy the complete types from attached assets
export enum CVJStageName {
  AWARE = "Aware",
  ENGAGE = "Engage", 
  SUBSCRIBE = "Subscribe",
  CONVERT = "Convert",
  EXCITE = "Excite",
  ASCEND = "Ascend",
  ADVOCATE = "Advocate",
  PROMOTE = "Promote",
}

export interface CVJStage {
  id: string;
  name: CVJStageName;
  displayOrder: number;
  colorCode: string; // Tailwind color class, e.g., 'bg-cvj-aware'
  subCategories: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  displayOrder: number;
  kpis: KPI[];
}

export enum UnitType {
  NUMBER = 'number',
  PERCENTAGE = 'percentage',
  CURRENCY = 'currency',
  DURATION_SECONDS = 'duration_seconds',
  TEXT = 'text',
}

export enum WeekType {
  STANDARD = 'standard',
  PROMOTIONAL = 'promotional',
  HOLIDAY = 'holiday',
  QUARTERLY = 'quarterly',
  CUSTOM = 'custom',
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  unitType: UnitType;
  defaultMonthlyTargetValue: number | null; // Changed from defaultTargetValue
  isActive: boolean;
}

export interface Week {
  id: string; // e.g., "Week 20 [05/01-05/09]" or custom name
  displayName?: string; // Optional custom display name, falls back to auto-generated if null
  year: number;
  weekNumber: number; // Can be manually set or auto-calculated
  isCustomWeekNumber: boolean; // Track if week number was manually set
  month: number; // 1-indexed month, derived from start date
  startDateString: string; // "YYYY-MM-DD"
  endDateString: string; // "YYYY-MM-DD"
  weekType: WeekType;
  description?: string; // Optional description for the week/period
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WeeklyDataEntry {
  weekId: string;
  kpiId: string;
  actualValue: number | null;
  // targetValue removed
  notes?: string;
}

export interface Month {
  id: string; // "YYYY-MM", e.g., "2024-05"
  name: string; // "May 2024"
  year: number;
  month: number; // 1-indexed month
}

export interface MonthlyKpiTarget {
  id: string; // Unique ID for this target entry
  kpiId: string;
  monthId: string; // "YYYY-MM"
  targetValue: number;
}

export interface ProcessedKpiMonthlyData {
  kpi: KPI;
  monthId: string;
  summedActualValue: number | null;
  monthlyTargetValue: number | null;
  statusPercentage: number | null;
  statusColor: string;
  statusTextColor: string;
  percentageChangeVsPreviousMonth: string | null;
  weeklyEntries: WeeklyDataEntry[]; // For potential drill-down
}

export interface ChartDataPoint {
  // Retained for weekly trend chart if needed, or adapt for monthly chart
  periodId: string; // Could be weekId or monthId
  actualValue?: number | null;
  targetValue?: number | null; // This target would be monthly if periodId is monthId
  summedActualValue?: number | null;
}

export interface KpiFormData {
  id?: string; // Present if editing
  name: string;
  description: string;
  unitType: UnitType;
  defaultMonthlyTargetValue: string; // Input as string, then parse. Renamed.
  subCategoryName: string;
  cvjStageName: CVJStageName;
}

export interface MonthlyTargetFormData {
    id?: string;
    kpiId: string;
    monthId: string; // YYYY-MM
    targetValue: string; // Input as string
}

export interface WeekFormData {
    originalId?: string; // Present if editing, used to find the week to update
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    displayName?: string; // Optional custom display name
    weekNumber?: string; // Optional manual week number (input as string)
    isCustomWeekNumber?: boolean; // Whether to use manual week number
    weekType: WeekType; // Type of week/period
    description?: string; // Optional description
}