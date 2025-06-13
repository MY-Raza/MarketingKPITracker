import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, TrendingUp, Info } from "lucide-react";
import { analyzePeriod, type PeriodAnalysis } from '../utils/period-handling';

interface MultiMonthPeriodAlertProps {
  startDate: string;
  endDate: string;
  weekName: string;
}

export function MultiMonthPeriodAlert({ startDate, endDate, weekName }: MultiMonthPeriodAlertProps) {
  const periodAnalysis = analyzePeriod(startDate, endDate);
  
  if (!periodAnalysis.isPeriodCrossMonth) {
    return null;
  }

  return (
    <Alert className="bg-blue-50 border-blue-200 mb-4">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              Multi-Month Period Detected: {weekName}
            </span>
          </div>
          
          <div className="text-sm text-blue-800">
            This period spans {periodAnalysis.totalDays} days across {periodAnalysis.monthlyBreakdowns.length} months.
            Data will be broken down by individual months for accurate KPI tracking.
          </div>
          
          <div className="space-y-2">
            <div className="text-xs font-medium text-blue-700">Monthly Breakdown:</div>
            <div className="flex flex-wrap gap-2">
              {periodAnalysis.monthlyBreakdowns.map((breakdown) => (
                <Badge 
                  key={breakdown.monthId} 
                  variant={breakdown.monthId === periodAnalysis.primaryMonthId ? "default" : "secondary"}
                  className="text-xs"
                >
                  {breakdown.monthName}: {breakdown.periodDays} days ({breakdown.weightPercentage.toFixed(0)}%)
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-blue-700">
            <TrendingUp className="h-3 w-3" />
            Primary month: {periodAnalysis.monthlyBreakdowns.find(m => m.monthId === periodAnalysis.primaryMonthId)?.monthName}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}