import { CVJStageName, UnitType, type CVJStage, type Week, type WeeklyDataEntry, type MonthlyKpiTarget } from '../types/kpi';

export const CVJ_STAGE_COLORS: Record<CVJStageName, string> = {
  [CVJStageName.AWARE]: 'bg-cvj-aware',
  [CVJStageName.ENGAGE]: 'bg-cvj-engage', 
  [CVJStageName.SUBSCRIBE]: 'bg-cvj-subscribe',
  [CVJStageName.CONVERT]: 'bg-cvj-convert',
  [CVJStageName.EXCITE]: 'bg-cvj-excite',
  [CVJStageName.ASCEND]: 'bg-cvj-ascend',
  [CVJStageName.ADVOCATE]: 'bg-cvj-advocate',
  [CVJStageName.PROMOTE]: 'bg-cvj-promote',
};

export const STATUS_THRESHOLDS = {
  EXCELLENT: 100,
  GOOD: 80,
  WARNING: 60,
  POOR: 0,
};

const getISOWeek = (date: Date): number => {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const formatDateToYYYYMMDD = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDateToMMDD = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

export const INITIAL_CVJ_STAGES: CVJStage[] = [
  {
    id: "stage-aware",
    name: CVJStageName.AWARE,
    displayOrder: 1,
    colorCode: "bg-purple-500",
    subCategories: [
      {
        id: "sub-brand-awareness",
        name: "Brand Awareness",
        displayOrder: 1,
        kpis: [
          {
            id: "kpi-brand-impressions",
            name: "Brand Impressions",
            description: "Total number of times brand content was viewed",
            unitType: UnitType.NUMBER,
            defaultMonthlyTargetValue: 100000,
            isActive: true,
          },
          {
            id: "kpi-reach",
            name: "Reach",
            description: "Number of unique users who saw brand content",
            unitType: UnitType.NUMBER,
            defaultMonthlyTargetValue: 50000,
            isActive: true,
          }
        ]
      }
    ]
  },
  {
    id: "stage-engage",
    name: CVJStageName.ENGAGE,
    displayOrder: 2,
    colorCode: "bg-blue-500",
    subCategories: [
      {
        id: "sub-content-engagement",
        name: "Content Engagement",
        displayOrder: 1,
        kpis: [
          {
            id: "kpi-engagement-rate",
            name: "Engagement Rate",
            description: "Percentage of users who engaged with content",
            unitType: UnitType.PERCENTAGE,
            defaultMonthlyTargetValue: 5.0,
            isActive: true,
          },
          {
            id: "kpi-time-on-site",
            name: "Average Time on Site",
            description: "Average duration users spend on website",
            unitType: UnitType.DURATION_SECONDS,
            defaultMonthlyTargetValue: 180,
            isActive: true,
          }
        ]
      }
    ]
  },
  {
    id: "stage-subscribe",
    name: CVJStageName.SUBSCRIBE,
    displayOrder: 3,
    colorCode: "bg-green-500",
    subCategories: [
      {
        id: "sub-lead-generation",
        name: "Lead Generation",
        displayOrder: 1,
        kpis: [
          {
            id: "kpi-email-signups",
            name: "Email Signups",
            description: "Number of new email subscribers",
            unitType: UnitType.NUMBER,
            defaultMonthlyTargetValue: 500,
            isActive: true,
          },
          {
            id: "kpi-conversion-rate",
            name: "Lead Conversion Rate",
            description: "Percentage of visitors who become leads",
            unitType: UnitType.PERCENTAGE,
            defaultMonthlyTargetValue: 3.0,
            isActive: true,
          }
        ]
      }
    ]
  },
  {
    id: "stage-convert",
    name: CVJStageName.CONVERT,
    displayOrder: 4,
    colorCode: "bg-yellow-500",
    subCategories: [
      {
        id: "sub-sales",
        name: "Sales",
        displayOrder: 1,
        kpis: [
          {
            id: "kpi-sales-revenue",
            name: "Sales Revenue",
            description: "Total revenue generated from sales",
            unitType: UnitType.CURRENCY,
            defaultMonthlyTargetValue: 50000,
            isActive: true,
          },
          {
            id: "kpi-customer-acquisition",
            name: "New Customers",
            description: "Number of new customers acquired",
            unitType: UnitType.NUMBER,
            defaultMonthlyTargetValue: 100,
            isActive: true,
          }
        ]
      }
    ]
  }
];

const createWeekFromDates = (startDate: Date, endDate: Date): Week => {
  const weekNumber = getISOWeek(startDate);
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  
  const startStr = formatDateToMMDD(startDate);
  const endStr = formatDateToMMDD(endDate);
  
  return {
    id: `Week ${weekNumber} [${startStr}-${endStr}]`,
    year,
    weekNumber,
    month,
    startDateString: formatDateToYYYYMMDD(startDate),
    endDateString: formatDateToYYYYMMDD(endDate),
  };
};

const generateDefaultWeek = (year: number, month: number, day: number, durationDays: number = 6): Week => {
  const startDate = new Date(year, month - 1, day);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + durationDays);
  
  return createWeekFromDates(startDate, endDate);
};

export const DEFAULT_WEEKS: Week[] = [
  generateDefaultWeek(2024, 5, 1),
  generateDefaultWeek(2024, 5, 8),
  generateDefaultWeek(2024, 5, 15),
  generateDefaultWeek(2024, 5, 22),
  generateDefaultWeek(2024, 5, 29),
];

export const INITIAL_WEEKLY_DATA: WeeklyDataEntry[] = [
  {
    weekId: DEFAULT_WEEKS[0]?.id || '',
    kpiId: 'kpi-brand-impressions',
    actualValue: 25000,
  },
  {
    weekId: DEFAULT_WEEKS[0]?.id || '',
    kpiId: 'kpi-reach',
    actualValue: 12000,
  },
  {
    weekId: DEFAULT_WEEKS[1]?.id || '',
    kpiId: 'kpi-brand-impressions',
    actualValue: 28000,
  },
  {
    weekId: DEFAULT_WEEKS[1]?.id || '',
    kpiId: 'kpi-reach',
    actualValue: 14000,
  },
];

export const INITIAL_MONTHLY_TARGETS: MonthlyKpiTarget[] = [
  {
    id: 'target-1',
    kpiId: 'kpi-brand-impressions',
    monthId: '2024-05',
    targetValue: 100000,
  },
  {
    id: 'target-2',
    kpiId: 'kpi-reach',
    monthId: '2024-05',
    targetValue: 50000,
  },
  {
    id: 'target-3',
    kpiId: 'kpi-engagement-rate',
    monthId: '2024-05',
    targetValue: 5.0,
  },
];

export const createWeekObjectFromFormData = (startDate: Date, endDate: Date): Week => {
  return createWeekFromDates(startDate, endDate);
};