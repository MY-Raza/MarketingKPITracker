import { storage } from "../storage";
import { ApiError } from "../utils/response";
import { logger } from "../utils/logger";

interface TrendDataParams {
  kpiId?: string;
  stageId?: string;
  dateFrom: string;
  dateTo: string;
  period: 'weekly' | 'monthly';
}

interface KpiPerformanceParams {
  monthId: string;
  stageId?: string;
  kpiIds?: string[];
}

interface ComparisonParams {
  currentMonth: string;
  comparisonMonth: string;
  kpiId?: string;
  stageId?: string;
}

interface ExportParams {
  format: 'json' | 'csv';
  dateFrom: string;
  dateTo: string;
  includeTargets: boolean;
  stageIds?: string[];
  kpiIds?: string[];
}

export class DataAggregationService {
  async getMonthlyOverview(monthId: string, stageId?: string) {
    try {
      const dashboardData = await storage.getDashboardDataForMonth(monthId);
      
      // Filter by stage if provided
      let processedKpis = dashboardData.processedKpis;
      if (stageId) {
        processedKpis = processedKpis.filter((item: any) => 
          item.kpi.cvjStage?.id === stageId
        );
      }

      // Calculate summary metrics
      const totalKpis = processedKpis.length;
      const kpisOnTrack = processedKpis.filter((item: any) => item.statusPercentage >= 95).length;
      const kpisAtRisk = processedKpis.filter((item: any) => item.statusPercentage >= 70 && item.statusPercentage < 95).length;
      const kpisBelowTarget = processedKpis.filter((item: any) => item.statusPercentage < 70).length;
      
      const avgPerformance = totalKpis > 0 
        ? processedKpis.reduce((sum: number, item: any) => sum + item.statusPercentage, 0) / totalKpis 
        : 0;

      // Group by stage for stage performance
      const stagePerformanceMap = new Map();
      
      processedKpis.forEach((item: any) => {
        const stage = item.kpi.cvjStage;
        if (!stage) return;

        if (!stagePerformanceMap.has(stage.id)) {
          stagePerformanceMap.set(stage.id, {
            stage,
            kpiCount: 0,
            totalPerformance: 0,
            topPerformer: null
          });
        }

        const stageData = stagePerformanceMap.get(stage.id);
        stageData.kpiCount++;
        stageData.totalPerformance += item.statusPercentage;

        if (!stageData.topPerformer || item.statusPercentage > stageData.topPerformer.performance) {
          stageData.topPerformer = {
            kpiName: item.kpi.name,
            performance: item.statusPercentage
          };
        }
      });

      const stagePerformance = Array.from(stagePerformanceMap.values()).map((stageData: any) => ({
        stage: stageData.stage,
        kpiCount: stageData.kpiCount,
        avgPerformance: stageData.totalPerformance / stageData.kpiCount,
        topPerformer: stageData.topPerformer
      }));

      return {
        month: monthId,
        monthName: dashboardData.monthName,
        summary: {
          totalKpis,
          kpisOnTrack,
          kpisAtRisk,
          kpisBelowTarget,
          overallHealthScore: avgPerformance
        },
        stagePerformance,
        kpiDetails: processedKpis
      };
    } catch (error) {
      logger.error('Error getting monthly overview:', error);
      throw new ApiError('Failed to retrieve monthly overview', 500);
    }
  }

  async getTrendData(params: TrendDataParams) {
    try {
      const { kpiId, stageId, dateFrom, dateTo, period } = params;

      let weeklyData;
      if (kpiId) {
        weeklyData = await storage.getWeeklyDataWithRelations({ kpiId });
      } else {
        weeklyData = await storage.getWeeklyDataWithRelations();
      }

      // Filter by date range
      const filteredData = weeklyData.filter(entry => {
        const weekStart = new Date(entry.week.startDateString);
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        return weekStart >= from && weekStart <= to;
      });

      // Filter by stage if provided
      let finalData = filteredData;
      if (stageId) {
        const stageKpis = await storage.getKpisWithRelations({ stageId });
        const stageKpiIds = stageKpis.map(k => k.id);
        finalData = filteredData.filter(entry => stageKpiIds.includes(entry.kpi.id));
      }

      // Aggregate by period
      if (period === 'monthly') {
        const monthlyData = new Map();
        
        finalData.forEach(entry => {
          const monthKey = `${entry.week.year}-${entry.week.month.toString().padStart(2, '0')}`;
          
          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
              periodId: monthKey,
              actualValue: 0,
              entryCount: 0
            });
          }
          
          const monthData = monthlyData.get(monthKey);
          monthData.actualValue += entry.actualValue || 0;
          monthData.entryCount++;
        });

        return Array.from(monthlyData.values()).sort((a, b) => a.periodId.localeCompare(b.periodId));
      } else {
        // Weekly data
        const weeklyMap = new Map();
        
        finalData.forEach(entry => {
          const weekKey = entry.week.id;
          
          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, {
              periodId: weekKey,
              actualValue: 0,
              weekInfo: entry.week
            });
          }
          
          const weekData = weeklyMap.get(weekKey);
          weekData.actualValue += entry.actualValue || 0;
        });

        return Array.from(weeklyMap.values())
          .sort((a, b) => {
            const aDate = new Date(a.weekInfo.startDateString);
            const bDate = new Date(b.weekInfo.startDateString);
            return aDate.getTime() - bDate.getTime();
          });
      }
    } catch (error) {
      logger.error('Error getting trend data:', error);
      throw new ApiError('Failed to retrieve trend data', 500);
    }
  }

  async getKpiPerformanceMetrics(params: KpiPerformanceParams) {
    try {
      const { monthId, stageId, kpiIds } = params;

      const dashboardData = await storage.getDashboardDataForMonth(monthId);
      let processedKpis = dashboardData.processedKpis;

      // Filter by stage if provided
      if (stageId) {
        processedKpis = processedKpis.filter((item: any) => 
          item.kpi.cvjStage?.id === stageId
        );
      }

      // Filter by specific KPIs if provided
      if (kpiIds && kpiIds.length > 0) {
        processedKpis = processedKpis.filter((item: any) => 
          kpiIds.includes(item.kpi.id)
        );
      }

      // Sort by performance (descending)
      processedKpis.sort((a: any, b: any) => b.statusPercentage - a.statusPercentage);

      return {
        monthId,
        totalKpis: processedKpis.length,
        kpiMetrics: processedKpis.map((item: any) => ({
          kpi: {
            id: item.kpi.id,
            name: item.kpi.name,
            unitType: item.kpi.unitType,
            subCategory: item.kpi.subCategory,
            cvjStage: item.kpi.cvjStage
          },
          actualValue: item.summedActualValue,
          targetValue: item.monthlyTargetValue,
          performance: item.statusPercentage,
          status: item.statusPercentage >= 95 ? 'on_track' : item.statusPercentage >= 70 ? 'at_risk' : 'below_target'
        }))
      };
    } catch (error) {
      logger.error('Error getting KPI performance metrics:', error);
      throw new ApiError('Failed to retrieve KPI performance metrics', 500);
    }
  }

  async getStagePerformanceSummary(monthId: string) {
    try {
      const overview = await this.getMonthlyOverview(monthId);
      return {
        monthId,
        monthName: overview.monthName,
        stagePerformance: overview.stagePerformance,
        overallSummary: overview.summary
      };
    } catch (error) {
      logger.error('Error getting stage performance summary:', error);
      throw new ApiError('Failed to retrieve stage performance summary', 500);
    }
  }

  async getComparisonData(params: ComparisonParams) {
    try {
      const { currentMonth, comparisonMonth, kpiId, stageId } = params;

      const [currentData, comparisonData] = await Promise.all([
        storage.getDashboardDataForMonth(currentMonth),
        storage.getDashboardDataForMonth(comparisonMonth)
      ]);

      let currentKpis = currentData.processedKpis;
      let comparisonKpis = comparisonData.processedKpis;

      // Filter by KPI if provided
      if (kpiId) {
        currentKpis = currentKpis.filter((item: any) => item.kpi.id === kpiId);
        comparisonKpis = comparisonKpis.filter((item: any) => item.kpi.id === kpiId);
      }

      // Filter by stage if provided
      if (stageId) {
        currentKpis = currentKpis.filter((item: any) => item.kpi.cvjStage?.id === stageId);
        comparisonKpis = comparisonKpis.filter((item: any) => item.kpi.cvjStage?.id === stageId);
      }

      // Create comparison map
      const comparisonMap = new Map();
      comparisonKpis.forEach((item: any) => {
        comparisonMap.set(item.kpi.id, item);
      });

      const comparisons = currentKpis.map((currentItem: any) => {
        const comparisonItem = comparisonMap.get(currentItem.kpi.id);
        
        const currentValue = currentItem.summedActualValue || 0;
        const comparisonValue = comparisonItem?.summedActualValue || 0;
        
        const percentageChange = comparisonValue > 0 
          ? ((currentValue - comparisonValue) / comparisonValue) * 100 
          : currentValue > 0 ? 100 : 0;

        return {
          kpi: currentItem.kpi,
          current: {
            month: currentMonth,
            value: currentValue,
            performance: currentItem.statusPercentage
          },
          comparison: {
            month: comparisonMonth,
            value: comparisonValue,
            performance: comparisonItem?.statusPercentage || 0
          },
          change: {
            absolute: currentValue - comparisonValue,
            percentage: percentageChange,
            trend: percentageChange > 0 ? 'up' : percentageChange < 0 ? 'down' : 'stable'
          }
        };
      });

      return {
        currentMonth,
        comparisonMonth,
        totalKpis: comparisons.length,
        comparisons
      };
    } catch (error) {
      logger.error('Error getting comparison data:', error);
      throw new ApiError('Failed to retrieve comparison data', 500);
    }
  }

  async getHealthScoreMetrics(monthId: string) {
    try {
      const overview = await this.getMonthlyOverview(monthId);
      const { summary, stagePerformance } = overview;

      // Calculate health score components
      const kpiHealthScore = (summary.kpisOnTrack / summary.totalKpis) * 100;
      const avgStagePerformance = stagePerformance.reduce((sum: number, stage: any) => 
        sum + stage.avgPerformance, 0) / stagePerformance.length;

      // Weight the scores (70% KPI health, 30% avg performance)
      const overallHealthScore = (kpiHealthScore * 0.7) + (avgStagePerformance * 0.3);

      return {
        monthId,
        healthScore: overallHealthScore,
        components: {
          kpiHealth: {
            score: kpiHealthScore,
            onTrack: summary.kpisOnTrack,
            total: summary.totalKpis
          },
          avgPerformance: {
            score: avgStagePerformance,
            stages: stagePerformance.map((stage: any) => ({
              name: stage.stage.name,
              performance: stage.avgPerformance
            }))
          }
        },
        recommendations: this.generateHealthRecommendations(summary, stagePerformance)
      };
    } catch (error) {
      logger.error('Error getting health score metrics:', error);
      throw new ApiError('Failed to retrieve health score metrics', 500);
    }
  }

  private generateHealthRecommendations(summary: any, stagePerformance: any[]) {
    const recommendations = [];

    if (summary.kpisBelowTarget > 0) {
      recommendations.push({
        type: 'warning',
        title: 'KPIs Below Target',
        message: `${summary.kpisBelowTarget} KPIs are performing below 70% of target. Review and optimize these metrics.`
      });
    }

    const poorPerformingStages = stagePerformance.filter(stage => stage.avgPerformance < 70);
    if (poorPerformingStages.length > 0) {
      recommendations.push({
        type: 'alert',
        title: 'Underperforming Stages',
        message: `${poorPerformingStages.map(s => s.stage.name).join(', ')} stages need attention.`
      });
    }

    if (summary.overallHealthScore >= 90) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Performance',
        message: 'Overall performance is excellent. Continue current strategies.'
      });
    }

    return recommendations;
  }

  async exportData(params: ExportParams) {
    try {
      const { format, dateFrom, dateTo, includeTargets, stageIds, kpiIds } = params;

      // Get base data
      const weeklyData = await storage.getWeeklyDataWithRelations();
      
      // Filter by date range
      const filteredData = weeklyData.filter(entry => {
        const weekStart = new Date(entry.week.startDateString);
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        return weekStart >= from && weekStart <= to;
      });

      // Filter by stages/KPIs if provided
      let finalData = filteredData;
      if (stageIds || kpiIds) {
        finalData = filteredData.filter(entry => {
          if (kpiIds && !kpiIds.includes(entry.kpi.id)) return false;
          if (stageIds && !stageIds.includes(entry.kpi.subCategory?.cvjStage?.id || '')) return false;
          return true;
        });
      }

      // Get targets if requested
      let monthlyTargets = [];
      if (includeTargets) {
        monthlyTargets = await storage.getMonthlyKpiTargets();
      }

      const exportData = finalData.map(entry => {
        const monthId = `${entry.week.year}-${entry.week.month.toString().padStart(2, '0')}`;
        const target = monthlyTargets.find(t => 
          t.kpiId === entry.kpi.id && t.monthId === monthId
        );

        return {
          weekId: entry.week.id,
          weekStart: entry.week.startDateString,
          weekEnd: entry.week.endDateString,
          kpiId: entry.kpi.id,
          kpiName: entry.kpi.name,
          actualValue: entry.actualValue,
          notes: entry.notes,
          ...(includeTargets && {
            monthlyTarget: target?.targetValue || entry.kpi.defaultMonthlyTargetValue,
            targetValue: target?.targetValue
          })
        };
      });

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return exportData;
    } catch (error) {
      logger.error('Error exporting data:', error);
      throw new ApiError('Failed to export data', 500);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}
