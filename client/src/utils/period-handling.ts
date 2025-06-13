/**
 * Multi-month period handling utilities for KPI scorecard application
 * 
 * Marketing KPI Best Practices:
 * 1. For periods spanning multiple months, break down data by individual months
 * 2. Aggregate weekly data within each month for monthly summaries
 * 3. Show month-over-month comparisons for trend analysis
 * 4. Calculate weighted averages for cross-month periods
 */

import type { Week, WeeklyDataEntry, MonthlyKpiTarget } from '../types/kpi';

export interface MonthlyBreakdown {
  monthId: string;
  monthName: string;
  year: number;
  month: number;
  weeksInMonth: Week[];
  totalDays: number;
  periodDays: number; // Days of the period that fall within this month
  weightPercentage: number; // Percentage of total period this month represents
}

export interface PeriodAnalysis {
  startDate: string;
  endDate: string;
  totalDays: number;
  monthlyBreakdowns: MonthlyBreakdown[];
  isPeriodCrossMonth: boolean;
  primaryMonthId: string; // Month with highest weight
}

/**
 * Analyzes a date period and returns breakdown by months
 * Essential for accurate KPI calculation across extended periods
 */
export function analyzePeriod(startDate: string, endDate: string): PeriodAnalysis {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  const monthlyBreakdowns: MonthlyBreakdown[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const monthId = `${year}-${month.toString().padStart(2, '0')}`;
    const monthName = current.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Calculate first and last day of period within this month
    const monthStart = new Date(year, current.getMonth(), 1);
    const monthEnd = new Date(year, current.getMonth() + 1, 0);
    
    const periodStartInMonth = current < monthStart ? monthStart : current;
    const periodEndInMonth = end > monthEnd ? monthEnd : end;
    
    const periodDays = Math.ceil((periodEndInMonth.getTime() - periodStartInMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalDaysInMonth = monthEnd.getDate();
    const weightPercentage = (periodDays / totalDays) * 100;
    
    monthlyBreakdowns.push({
      monthId,
      monthName,
      year,
      month,
      weeksInMonth: [], // To be populated by caller
      totalDays: totalDaysInMonth,
      periodDays,
      weightPercentage
    });
    
    // Move to next month
    current = new Date(year, current.getMonth() + 1, 1);
  }
  
  const isPeriodCrossMonth = monthlyBreakdowns.length > 1;
  const primaryMonthId = monthlyBreakdowns.reduce((prev, curr) => 
    curr.weightPercentage > prev.weightPercentage ? curr : prev
  ).monthId;
  
  return {
    startDate,
    endDate,
    totalDays,
    monthlyBreakdowns,
    isPeriodCrossMonth,
    primaryMonthId
  };
}

/**
 * Calculates KPI values for multi-month periods using marketing best practices
 */
export function calculateCrossMonthKpiValue(
  periodAnalysis: PeriodAnalysis,
  weeklyEntries: WeeklyDataEntry[],
  kpiId: string
): {
  totalValue: number | null;
  monthlyValues: { monthId: string; value: number | null; weight: number }[];
  calculationMethod: 'sum' | 'weighted_average';
} {
  const monthlyValues = periodAnalysis.monthlyBreakdowns.map(breakdown => {
    // Find weekly entries that fall within this month's portion of the period
    const monthEntries = weeklyEntries.filter(entry => {
      // This would need week-to-month mapping logic
      return entry.kpiId === kpiId;
    });
    
    const monthValue = monthEntries.reduce((sum, entry) => 
      sum + (entry.actualValue || 0), 0
    );
    
    return {
      monthId: breakdown.monthId,
      value: monthEntries.length > 0 ? monthValue : null,
      weight: breakdown.weightPercentage / 100
    };
  });
  
  // For KPIs like conversions, revenue - use sum
  // For KPIs like rates, percentages - use weighted average
  const calculationMethod = 'sum'; // This should be determined by KPI type
  
  const totalValue = monthlyValues.reduce((total, monthData) => {
    if (monthData.value === null) return total;
    return total + monthData.value;
  }, 0);
  
  return {
    totalValue: monthlyValues.some(m => m.value !== null) ? totalValue : null,
    monthlyValues,
    calculationMethod
  };
}

/**
 * Generates appropriate monthly targets for cross-month periods
 */
export function generateCrossMonthTargets(
  periodAnalysis: PeriodAnalysis,
  kpiId: string,
  existingTargets: MonthlyKpiTarget[]
): MonthlyKpiTarget[] {
  const suggestedTargets: MonthlyKpiTarget[] = [];
  
  periodAnalysis.monthlyBreakdowns.forEach(breakdown => {
    const existingTarget = existingTargets.find(t => 
      t.kpiId === kpiId && t.monthId === breakdown.monthId
    );
    
    if (!existingTarget) {
      // Suggest creating proportional targets based on period weight
      suggestedTargets.push({
        id: `suggested-${breakdown.monthId}-${kpiId}`,
        kpiId,
        monthId: breakdown.monthId,
        targetValue: 0, // To be set by user based on business goals
      });
    }
  });
  
  return suggestedTargets;
}