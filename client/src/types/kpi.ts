// Types for the Marketing KPI Scorecard application
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
  colorCode: string;
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

export interface KPI {
  id: string;
  name: string;
  description: string;
  unitType: UnitType;
  defaultMonthlyTargetValue: number | null;
  isActive: boolean;
}

export interface Week {
  id: string;
  year: number;
  weekNumber: number;
  month: number;
  startDateString: string;
  endDateString: string;
}

export interface WeeklyDataEntry {
  weekId: string;
  kpiId: string;
  actualValue: number | null;
  notes?: string;
}

export interface Month {
  id: string;
  name: string;
  year: number;
  month: number;
}

export interface MonthlyKpiTarget {
  id: string;
  kpiId: string;
  monthId: string;
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
  weeklyEntries: WeeklyDataEntry[];
}

export interface ChartDataPoint {
  periodId: string;
  actualValue?: number | null;
  targetValue?: number | null;
  summedActualValue?: number | null;
}

export interface KpiFormData {
  id?: string;
  name: string;
  description: string;
  unitType: UnitType;
  defaultMonthlyTargetValue: string;
  subCategoryName: string;
  cvjStageName: CVJStageName;
}

export interface MonthlyTargetFormData {
  id?: string;
  kpiId: string;
  monthId: string;
  targetValue: string;
}

export interface WeekFormData {
  originalId?: string;
  startDate: string;
  endDate: string;
}