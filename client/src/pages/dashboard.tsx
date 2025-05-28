import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { apiClient } from "../services/api";
import type { MonthlyOverview, ProcessedKpiMonthlyData } from "../../server/types/api";

interface StatusColors {
  bg: string;
  text: string;
  border: string;
}

const getStatusColors = (percentage: number): StatusColors => {
  if (percentage >= 95) {
    return {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200"
    };
  } else if (percentage >= 70) {
    return {
      bg: "bg-yellow-50", 
      text: "text-yellow-700",
      border: "border-yellow-200"
    };
  } else {
    return {
      bg: "bg-red-50",
      text: "text-red-700", 
      border: "border-red-200"
    };
  }
};

const formatValue = (value: number | null, unitType: string): string => {
  if (value === null || value === undefined) return "N/A";
  
  switch (unitType) {
    case 'PERCENTAGE':
      return `${value.toFixed(1)}%`;
    case 'CURRENCY':
      return `$${value.toLocaleString()}`;
    case 'DURATION_SECONDS':
      return `${Math.round(value)}s`;
    default:
      return value.toLocaleString();
  }
};

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  const { data: overview, isLoading, error } = useQuery<MonthlyOverview>({
    queryKey: ['/api/analytics/monthly-overview', selectedMonth],
    queryFn: () => apiClient.get(`/api/analytics/monthly-overview?month=${selectedMonth}`),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Generate month options (last 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthId = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: monthId, label: monthName });
    }
    
    return options;
  };

  const monthOptions = generateMonthOptions();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            No data available for the selected month.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { summary, stagePerformance, kpiDetails } = overview;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Marketing KPI Dashboard</h1>
          <p className="text-slate-600 mt-1">{overview.monthName} Performance Overview</p>
        </div>
        
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.totalKpis}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">On Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-green-600">{summary.kpisOnTrack}</div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <Progress 
              value={(summary.kpisOnTrack / summary.totalKpis) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-yellow-600">{summary.kpisAtRisk}</div>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <Progress 
              value={(summary.kpisAtRisk / summary.totalKpis) * 100} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold text-slate-900">
                {summary.overallHealthScore.toFixed(1)}%
              </div>
              {summary.overallHealthScore >= 80 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <Progress 
              value={summary.overallHealthScore} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Stage Performance */}
      <Card>
        <CardHeader>
          <CardTitle>CVJ Stage Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stagePerformance.map((stage) => (
              <div key={stage.stage.id} className="p-4 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${stage.stage.colorCode.replace('bg-', 'bg-')}`}
                  />
                  <h3 className="font-medium text-slate-900">{stage.stage.name}</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">KPIs:</span>
                    <span className="font-medium">{stage.kpiCount}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Avg Performance:</span>
                    <span className="font-medium">{stage.avgPerformance.toFixed(1)}%</span>
                  </div>
                  
                  <Progress value={stage.avgPerformance} className="h-2" />
                  
                  {stage.topPerformer && (
                    <div className="text-xs text-slate-500 mt-2">
                      Top: {stage.topPerformer.kpiName} ({stage.topPerformer.performance.toFixed(1)}%)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Details */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpiDetails.map((kpiData: ProcessedKpiMonthlyData) => {
              const statusColors = getStatusColors(kpiData.statusPercentage || 0);
              
              return (
                <div 
                  key={kpiData.kpi.id} 
                  className={`p-4 border rounded-lg ${statusColors.bg} ${statusColors.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-slate-900">{kpiData.kpi.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {kpiData.kpi.cvjStage?.name}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-2">
                        {kpiData.kpi.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-slate-600">Actual: </span>
                          <span className="font-medium">
                            {formatValue(kpiData.summedActualValue, kpiData.kpi.unitType)}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-slate-600">Target: </span>
                          <span className="font-medium">
                            {formatValue(kpiData.monthlyTargetValue, kpiData.kpi.unitType)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${statusColors.text}`}>
                        {kpiData.statusPercentage?.toFixed(1) || '0'}%
                      </div>
                      
                      <Progress 
                        value={kpiData.statusPercentage || 0} 
                        className="w-24 h-2 mt-1"
                      />
                      
                      {kpiData.percentageChangeVsPreviousMonth && (
                        <div className="text-xs text-slate-500 mt-1">
                          vs last month: {kpiData.percentageChangeVsPreviousMonth}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
