import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react";
import { useAuth } from '../hooks/use-auth';
import { 
  CVJStageName, 
  UnitType, 
  type CVJStage, 
  type KPI, 
  type Week, 
  type WeeklyDataEntry, 
  type MonthlyKpiTarget, 
  type ProcessedKpiMonthlyData 
} from '../types/kpi';
import { 
  STATUS_THRESHOLDS,
  INITIAL_CVJ_STAGES, 
  DEFAULT_WEEKS, 
  INITIAL_WEEKLY_DATA, 
  INITIAL_MONTHLY_TARGETS
} from '../constants/kpi';

// Helper functions
const getMonthId = (year: number, month: number): string => `${year}-${month.toString().padStart(2, '0')}`;

const getMonthName = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// KPI Status Gauge Component
function KpiStatusGauge({ value, target, title }: { value: number; target: number; title: string }) {
  const percentage = Math.min((value / target) * 100, 100);
  const strokeColor = percentage >= 95 ? '#10b981' : percentage >= 70 ? '#f59e0b' : '#ef4444';
  
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth="2"
            fill="transparent"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            stroke={strokeColor}
            strokeWidth="2"
            fill="transparent"
            strokeDasharray={`${percentage}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            className="drop-shadow-sm"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-900">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">Target: {target}%</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Use stored data from database instead of mock data
  const [cvjStages] = useState<CVJStage[]>(INITIAL_CVJ_STAGES);
  const [weeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [weeklyData] = useState<WeeklyDataEntry[]>(INITIAL_WEEKLY_DATA);
  const [monthlyTargets] = useState<MonthlyKpiTarget[]>(INITIAL_MONTHLY_TARGETS);

  const uniqueMonths = useMemo(() => {
    const monthSet = new Set<string>();
    weeks.forEach(week => monthSet.add(getMonthId(week.year, week.month)));
    monthlyTargets.forEach(target => monthSet.add(target.monthId));

    const sortedMonthIds = Array.from(monthSet).sort((a,b) => b.localeCompare(a));

    return sortedMonthIds.map(monthId => {
      const [year, monthNum] = monthId.split('-').map(Number);
      return {
        id: monthId,
        year: year,
        month: monthNum,
        name: getMonthName(year, monthNum),
      };
    });
  }, [weeks, monthlyTargets]);

  const [selectedMonthId, setSelectedMonthId] = useState<string>(uniqueMonths[0]?.id || '2025-05');

  const allKpis = useMemo(() => cvjStages.flatMap(stage => stage.subCategories.flatMap(sc => sc.kpis.filter(kpi => kpi.isActive))), [cvjStages]);

  const getKpiById = (kpiId: string): KPI | undefined => {
    return allKpis.find(kpi => kpi.id === kpiId);
  };

  const processedMonthlyData = useMemo((): ProcessedKpiMonthlyData[] => {
    if (!selectedMonthId || allKpis.length === 0) return [];

    const [currentYear, currentMonthNum] = selectedMonthId.split('-').map(Number);
    const previousMonthDate = new Date(currentYear, currentMonthNum - 2, 1);
    const previousMonthId = getMonthId(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1);

    return allKpis.map(kpi => {
      const weeklyEntries = weeklyData.filter(entry => 
        entry.kpiId === kpi.id && 
        weeks.find(week => 
          week.id === entry.weekId && 
          getMonthId(week.year, week.month) === selectedMonthId
        )
      );

      const summedActualValue = weeklyEntries.reduce((sum, entry) => 
        sum + (entry.actualValue || 0), 0
      );

      const monthlyTarget = monthlyTargets.find(target => 
        target.kpiId === kpi.id && target.monthId === selectedMonthId
      );
      const monthlyTargetValue = monthlyTarget?.targetValue || kpi.defaultMonthlyTargetValue;

      let statusPercentage: number | null = null;
      let statusColor = 'bg-slate-200';
      let statusTextColor = 'text-slate-600';

      if (monthlyTargetValue && monthlyTargetValue > 0) {
        statusPercentage = (summedActualValue / monthlyTargetValue) * 100;
        
        if (statusPercentage >= STATUS_THRESHOLDS.GREEN) {
          statusColor = 'bg-emerald-500';
          statusTextColor = 'text-emerald-700';
        } else if (statusPercentage >= STATUS_THRESHOLDS.YELLOW) {
          statusColor = 'bg-amber-500';
          statusTextColor = 'text-amber-700';
        } else {
          statusColor = 'bg-red-500';
          statusTextColor = 'text-red-700';
        }
      }

      // Calculate previous month change
      const previousWeeklyEntries = weeklyData.filter(entry => 
        entry.kpiId === kpi.id && 
        weeks.find(week => 
          week.id === entry.weekId && 
          getMonthId(week.year, week.month) === previousMonthId
        )
      );
      const previousSummedValue = previousWeeklyEntries.reduce((sum, entry) => sum + (entry.actualValue || 0), 0);
      
      let percentageChangeVsPreviousMonth: string | null = null;
      if (previousSummedValue > 0) {
        const change = ((summedActualValue - previousSummedValue) / previousSummedValue) * 100;
        percentageChangeVsPreviousMonth = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      } else if (summedActualValue > 0) {
        percentageChangeVsPreviousMonth = '+∞%';
      }

      return {
        kpi,
        monthId: selectedMonthId,
        summedActualValue: weeklyEntries.length > 0 ? summedActualValue : null,
        monthlyTargetValue,
        statusPercentage,
        statusColor,
        statusTextColor,
        percentageChangeVsPreviousMonth,
        weeklyEntries
      };
    });
  }, [allKpis, weeklyData, weeks, selectedMonthId, monthlyTargets]);

  // Calculate overall achievement
  const overallAchievement = useMemo(() => {
    const validKpis = processedMonthlyData.filter(data => 
      data.monthlyTargetValue && data.monthlyTargetValue > 0
    );
    
    if (validKpis.length === 0) return 0;
    
    const totalPercentage = validKpis.reduce((sum, data) => 
      sum + (data.statusPercentage || 0), 0
    );
    
    return totalPercentage / validKpis.length;
  }, [processedMonthlyData]);

  const formatValue = (value: number | null, unitType: UnitType): string => {
    if (value === null || value === undefined) return '—';
    
    switch (unitType) {
      case UnitType.PERCENTAGE:
        return `${value.toFixed(1)}%`;
      case UnitType.CURRENCY:
        return `$${value.toLocaleString()}`;
      case UnitType.DURATION_SECONDS:
        return `${Math.round(value)}s`;
      default:
        return value.toLocaleString();
    }
  };



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Marketing KPI Dashboard</h1>
            <p className="text-slate-600 mt-1">Comprehensive performance analytics across all customer journey stages</p>
          </div>
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-5 w-5 text-slate-500" />
            <Select value={selectedMonthId} onValueChange={setSelectedMonthId}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uniqueMonths.map(month => (
                  <SelectItem key={month.id} value={month.id}>
                    {month.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Overall Performance Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
          <CardContent className="p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Overall Monthly Performance</h2>
              <p className="text-slate-600 mb-6">Average achievement across all active KPIs with targets</p>
              
              <div className="flex justify-center mb-6">
                <KpiStatusGauge
                  value={overallAchievement}
                  target={100}
                  title="Average Achievement"
                />
              </div>
              
              <div className="text-sm text-slate-600 max-w-2xl mx-auto space-y-2">
                <p><strong className="text-slate-900">{overallAchievement.toFixed(1)}%</strong> overall achievement</p>
                <p className="text-xs">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mr-2">≥95% Excellent</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 mr-2">≥70% Good</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">&lt;70% Needs Attention</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Tables by Stage */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-900">Customer Value Journey Performance</h2>
          
          {cvjStages.map(stage => {
            const stageKpis = processedMonthlyData.filter(data => {
              const kpi = getKpiById(data.kpi.id);
              return stage.subCategories.some(subCategory => 
                subCategory.kpis.some(subKpi => subKpi.id === kpi?.id)
              );
            });

            if (stageKpis.length === 0) return null;

            // Get stage color mapping
            const stageColorMap: Record<CVJStageName, string> = {
              [CVJStageName.AWARE]: 'from-blue-500 to-blue-600',
              [CVJStageName.ENGAGE]: 'from-green-500 to-green-600',
              [CVJStageName.SUBSCRIBE]: 'from-purple-500 to-purple-600',
              [CVJStageName.CONVERT]: 'from-orange-500 to-orange-600',
              [CVJStageName.EXCITE]: 'from-pink-500 to-pink-600',
              [CVJStageName.ASCEND]: 'from-indigo-500 to-indigo-600',
              [CVJStageName.ADVOCATE]: 'from-emerald-500 to-emerald-600',
              [CVJStageName.PROMOTE]: 'from-red-500 to-red-600',
            };

            return (
              <Card key={stage.id} className="overflow-hidden border-0 shadow-lg">
                <CardHeader className={`bg-gradient-to-r ${stageColorMap[stage.name]} text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">{stage.name} Stage KPIs</CardTitle>
                      <p className="text-blue-100 mt-1">Customer Value Journey - {stage.name} Phase</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90">KPIs Tracked</div>
                      <div className="text-2xl font-bold">{stageKpis.length}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            KPI Metric
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Actual (Month)
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Target (Month)
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Change (MoM)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {stageKpis.map(data => (
                          <tr key={data.kpi.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-1">
                                  <div className="font-semibold text-slate-900">{data.kpi.name}</div>
                                  {data.kpi.description && (
                                    <div className="text-sm text-slate-600 mt-1">{data.kpi.description}</div>
                                  )}
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {data.kpi.unitType.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-4 h-4 text-slate-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Unit: {data.kpi.unitType}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-lg font-semibold text-slate-900">
                              {formatValue(data.summedActualValue, data.kpi.unitType)}
                            </td>
                            <td className="px-6 py-4 text-lg font-medium text-slate-700">
                              {formatValue(data.monthlyTargetValue, data.kpi.unitType)}
                            </td>
                            <td className="px-6 py-4">
                              {data.statusPercentage !== null ? (
                                <div className="flex items-center space-x-3">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                                    data.statusPercentage >= STATUS_THRESHOLDS.GREEN 
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : data.statusPercentage >= STATUS_THRESHOLDS.YELLOW
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {data.statusPercentage.toFixed(1)}%
                                  </span>
                                  <Target className={`w-4 h-4 ${
                                    data.statusPercentage >= STATUS_THRESHOLDS.GREEN 
                                      ? 'text-emerald-500'
                                      : data.statusPercentage >= STATUS_THRESHOLDS.YELLOW
                                      ? 'text-amber-500'
                                      : 'text-red-500'
                                  }`} />
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">No target set</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {data.percentageChangeVsPreviousMonth ? (
                                <div className={`flex items-center space-x-1 ${
                                  data.percentageChangeVsPreviousMonth.startsWith('+') && data.percentageChangeVsPreviousMonth !== '+∞%'
                                    ? 'text-emerald-600'
                                    : data.percentageChangeVsPreviousMonth.startsWith('-')
                                    ? 'text-red-600'
                                    : 'text-slate-600'
                                }`}>
                                  {data.percentageChangeVsPreviousMonth.startsWith('+') && data.percentageChangeVsPreviousMonth !== '+∞%' && (
                                    <TrendingUp className="w-4 h-4" />
                                  )}
                                  {data.percentageChangeVsPreviousMonth.startsWith('-') && (
                                    <TrendingDown className="w-4 h-4" />
                                  )}
                                  <span className="font-medium">{data.percentageChangeVsPreviousMonth}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}