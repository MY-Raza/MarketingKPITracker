import type { 
  User, 
  CvjStage, 
  SubCategory, 
  Kpi, 
  Week, 
  WeeklyDataEntry, 
  MonthlyKpiTarget 
} from "@shared/schema";

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// CVJ Stage types
export interface CvjStageWithHierarchy extends CvjStage {
  subCategories: SubCategoryWithKpis[];
}

export interface SubCategoryWithKpis extends SubCategory {
  kpis: Kpi[];
}

export interface KpiWithRelations extends Kpi {
  subCategory: {
    id: string;
    name: string;
    displayOrder: number;
  };
  cvjStage: {
    id: string;
    name: string;
    colorCode: string;
  };
}

// Weekly data types
export interface WeeklyDataWithRelations extends WeeklyDataEntry {
  week: Week;
  kpi: {
    id: string;
    name: string;
    unitType: string;
    defaultMonthlyTargetValue: number | null;
  };
}

export interface BulkWeeklyDataRequest {
  entries: {
    weekId: string;
    kpiId: string;
    actualValue?: number;
    notes?: string;
  }[];
}

// Monthly targets types
export interface BulkMonthlyTargetsRequest {
  targets: {
    kpiId: string;
    monthId: string;
    targetValue: number;
  }[];
}

// Dashboard and analytics types
export interface ProcessedKpiMonthlyData {
  kpi: KpiWithRelations;
  monthId: string;
  summedActualValue: number | null;
  monthlyTargetValue: number | null;
  statusPercentage: number | null;
  statusColor: string;
  statusTextColor: string;
  percentageChangeVsPreviousMonth?: string | null;
  weeklyEntries: WeeklyDataWithRelations[];
}

export interface DashboardData {
  monthId: string;
  monthName: string;
  processedKpis: ProcessedKpiMonthlyData[];
}

export interface MonthlyOverview {
  month: string;
  monthName: string;
  summary: {
    totalKpis: number;
    kpisOnTrack: number;
    kpisAtRisk: number;
    kpisBelowTarget: number;
    overallHealthScore: number;
  };
  stagePerformance: {
    stage: {
      id: string;
      name: string;
      colorCode: string;
    };
    kpiCount: number;
    avgPerformance: number;
    topPerformer: {
      kpiName: string;
      performance: number;
    } | null;
  }[];
  kpiDetails: ProcessedKpiMonthlyData[];
}

export interface TrendDataPoint {
  periodId: string;
  actualValue: number;
  targetValue?: number;
  weekInfo?: Week;
}

export interface KpiPerformanceMetrics {
  monthId: string;
  totalKpis: number;
  kpiMetrics: {
    kpi: {
      id: string;
      name: string;
      unitType: string;
      subCategory: any;
      cvjStage: any;
    };
    actualValue: number;
    targetValue: number;
    performance: number;
    status: 'on_track' | 'at_risk' | 'below_target';
  }[];
}

export interface StagePerformanceSummary {
  monthId: string;
  monthName: string;
  stagePerformance: any[];
  overallSummary: any;
}

export interface ComparisonData {
  currentMonth: string;
  comparisonMonth: string;
  totalKpis: number;
  comparisons: {
    kpi: any;
    current: {
      month: string;
      value: number;
      performance: number;
    };
    comparison: {
      month: string;
      value: number;
      performance: number;
    };
    change: {
      absolute: number;
      percentage: number;
      trend: 'up' | 'down' | 'stable';
    };
  }[];
}

export interface HealthScoreMetrics {
  monthId: string;
  healthScore: number;
  components: {
    kpiHealth: {
      score: number;
      onTrack: number;
      total: number;
    };
    avgPerformance: {
      score: number;
      stages: {
        name: string;
        performance: number;
      }[];
    };
  };
  recommendations: {
    type: 'success' | 'warning' | 'alert';
    title: string;
    message: string;
  }[];
}

// Query parameter types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface KpiFilters {
  stageId?: string;
  subCategoryId?: string;
  active?: boolean;
}

export interface WeeklyDataFilters {
  weekId?: string;
  kpiId?: string;
  monthId?: string;
}

export interface MonthlyTargetFilters {
  kpiId?: string;
  monthId?: string;
}

export interface TrendFilters {
  kpiId?: string;
  stageId?: string;
  dateFrom: string;
  dateTo: string;
  period?: 'weekly' | 'monthly';
}

export interface ExportFilters {
  format?: 'json' | 'csv';
  dateFrom: string;
  dateTo: string;
  includeTargets?: boolean;
  stageIds?: string[];
  kpiIds?: string[];
}

// Error types
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  timestamp: string;
  requestId?: string;
}

// Response wrapper types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiErrorResponse;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

// File upload types
export interface FileUploadResponse {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
}

// Bulk operation types
export interface BulkOperationResult<T> {
  successful: T[];
  failed: {
    item: any;
    error: string;
  }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Chart data types
export interface ChartDataPoint {
  periodId: string;
  actualValue?: number | null;
  targetValue?: number | null;
  summedActualValue?: number | null;
  label?: string;
}

export interface ChartDataSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

// Status types
export type KpiStatus = 'on_track' | 'at_risk' | 'below_target';
export type TrendDirection = 'up' | 'down' | 'stable';

// Week management types
export interface WeekFormData {
  id: string;
  year: number;
  weekNumber: number;
  month: number;
  startDateString: string;
  endDateString: string;
}

// Export types for external analysis
export interface ExportedDataRow {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  kpiId: string;
  kpiName: string;
  actualValue: number | null;
  notes: string | null;
  monthlyTarget?: number | null;
  targetValue?: number | null;
}

export default {};
