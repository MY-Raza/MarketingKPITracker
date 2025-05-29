import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
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
  INITIAL_CVJ_STAGES, 
  DEFAULT_WEEKS, 
  INITIAL_WEEKLY_DATA, 
  INITIAL_MONTHLY_TARGETS 
} from '../constants/kpi';

// KPI Status Gauge Component
function KpiStatusGauge({ value, target, title }: { value: number; target: number; title: string }) {
  const percentage = Math.min((value / target) * 100, 100);
  const color = percentage >= 100 ? 'text-green-600' : percentage >= 80 ? 'text-yellow-600' : 'text-red-600';
  
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-gray-200"
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={color}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={`${percentage}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-semibold ${color}`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-gray-600 text-center">{title}</span>
    </div>
  );
}

export default function Dashboard() {
  const [selectedMonthId] = useState<string>('2024-05');
  
  // Using the same data structure as the integrated KPI app
  const cvjStages = INITIAL_CVJ_STAGES;
  const weeks = DEFAULT_WEEKS;
  const weeklyData = INITIAL_WEEKLY_DATA;
  const monthlyTargets = INITIAL_MONTHLY_TARGETS;

  const allKpis = useMemo(() => {
    return cvjStages.flatMap(stage => 
      stage.subCategories.flatMap(subCategory => subCategory.kpis)
    );
  }, [cvjStages]);

  const getKpiById = (kpiId: string): KPI | undefined => {
    return allKpis.find(kpi => kpi.id === kpiId);
  };

  const processedMonthlyData = useMemo((): ProcessedKpiMonthlyData[] => {
    return allKpis.map(kpi => {
      const weeklyEntries = weeklyData.filter(entry => 
        entry.kpiId === kpi.id && 
        weeks.find(week => 
          week.id === entry.weekId && 
          `${week.year}-${String(week.month).padStart(2, '0')}` === selectedMonthId
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
      let statusColor = 'bg-gray-200';
      let statusTextColor = 'text-gray-600';

      if (monthlyTargetValue && monthlyTargetValue > 0) {
        statusPercentage = (summedActualValue / monthlyTargetValue) * 100;
        
        if (statusPercentage >= 100) {
          statusColor = 'bg-green-500';
          statusTextColor = 'text-green-700';
        } else if (statusPercentage >= 80) {
          statusColor = 'bg-yellow-500';
          statusTextColor = 'text-yellow-700';
        } else {
          statusColor = 'bg-red-500';
          statusTextColor = 'text-red-700';
        }
      }

      return {
        kpi,
        monthId: selectedMonthId,
        summedActualValue: weeklyEntries.length > 0 ? summedActualValue : null,
        monthlyTargetValue,
        statusPercentage,
        statusColor,
        statusTextColor,
        percentageChangeVsPreviousMonth: null,
        weeklyEntries
      };
    });
  }, [allKpis, weeklyData, weeks, selectedMonthId, monthlyTargets]);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Overview - {selectedMonthId}</h2>
        
        {cvjStages.map(stage => {
          const stageKpis = processedMonthlyData.filter(data => {
            const kpi = getKpiById(data.kpi.id);
            return stage.subCategories.some(subCategory => 
              subCategory.kpis.some(subKpi => subKpi.id === kpi?.id)
            );
          });

          if (stageKpis.length === 0) return null;

          return (
            <Card key={stage.id} className="mb-6">
              <CardHeader className={`${stage.colorCode} text-white`}>
                <CardTitle className="text-lg font-semibold">{stage.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stageKpis.map(data => (
                    <div key={data.kpi.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{data.kpi.name}</h4>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{data.kpi.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Actual:</span>
                          <span className="font-medium">
                            {data.summedActualValue !== null ? data.summedActualValue : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Target:</span>
                          <span className="font-medium">
                            {data.monthlyTargetValue !== null ? data.monthlyTargetValue : '-'}
                          </span>
                        </div>
                        
                        {data.statusPercentage !== null && data.monthlyTargetValue && (
                          <div className="mt-3">
                            <KpiStatusGauge
                              value={data.summedActualValue || 0}
                              target={data.monthlyTargetValue}
                              title={`${Math.round(data.statusPercentage)}% of target`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}