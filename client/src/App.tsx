import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, withAuth } from "./hooks/use-auth";
import { queryClient } from "./lib/queryClient";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { 
  BarChart3, 
  Database, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Plus,
  Edit,
  Trash2,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { 
  CVJStageName, 
  UnitType, 
  type CVJStage, 
  type KPI, 
  type Week, 
  type WeeklyDataEntry, 
  type MonthlyKpiTarget, 
  type ProcessedKpiMonthlyData,
  type KpiFormData,
  type MonthlyTargetFormData,
  type WeekFormData,
  type ChartDataPoint
} from './types/kpi';
import { 
  INITIAL_CVJ_STAGES, 
  DEFAULT_WEEKS, 
  INITIAL_WEEKLY_DATA, 
  INITIAL_MONTHLY_TARGETS,
  STATUS_THRESHOLDS,
  createWeekObjectFromFormData
} from './constants/kpi';

// Helper functions
const generateId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getMonthId = (year: number, month: number): string => `${year}-${month.toString().padStart(2, '0')}`;

const getMonthName = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

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

// Main KPI Application Component
function MarketingKpiApp() {
  const [cvjStages, setCvjStages] = useState<CVJStage[]>(INITIAL_CVJ_STAGES);
  const [weeks, setWeeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataEntry[]>(INITIAL_WEEKLY_DATA);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyKpiTarget[]>(INITIAL_MONTHLY_TARGETS);
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'data-entry' | 'admin'>('dashboard');
  const [adminTab, setAdminTab] = useState<'kpis' | 'targets' | 'weeks'>('kpis');
  
  // Modal states
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isMonthlyTargetModalOpen, setIsMonthlyTargetModalOpen] = useState(false);
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | undefined>();
  const [editingMonthlyTarget, setEditingMonthlyTarget] = useState<MonthlyKpiTarget | undefined>();
  const [editingWeek, setEditingWeek] = useState<Week | undefined>();
  const [defaultSubCategoryName, setDefaultSubCategoryName] = useState<string>('');
  const [defaultCvjStageName, setDefaultCvjStageName] = useState<CVJStageName>(CVJStageName.AWARE);

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
  const [selectedWeekForEntryId, setSelectedWeekForEntryId] = useState<string>(weeks[0]?.id || '');

  const allKpis = useMemo(() => cvjStages.flatMap(stage => stage.subCategories.flatMap(sc => sc.kpis.filter(kpi => kpi.isActive))), [cvjStages]);

  const getKpiById = useCallback((kpiId: string): KPI | undefined => {
    return allKpis.find(kpi => kpi.id === kpiId);
  }, [allKpis]);

  const getWeeksInMonth = useCallback((monthId: string, allWeeks: Week[]): Week[] => {
    if (!monthId) return [];
    const [year, monthNum] = monthId.split('-').map(Number);
    return allWeeks.filter(week => week.year === year && week.month === monthNum);
  }, []);

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
      let statusColor = 'bg-gray-200';
      let statusTextColor = 'text-gray-600';

      if (monthlyTargetValue && monthlyTargetValue > 0) {
        statusPercentage = (summedActualValue / monthlyTargetValue) * 100;
        
        if (statusPercentage >= STATUS_THRESHOLDS.GREEN) {
          statusColor = 'bg-green-500';
          statusTextColor = 'text-green-700';
        } else if (statusPercentage >= STATUS_THRESHOLDS.YELLOW) {
          statusColor = 'bg-yellow-500';
          statusTextColor = 'text-yellow-700';
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

  // Event handlers
  const handleDataChange = useCallback((kpiId: string, actualValue: string) => {
    const numericValue = actualValue === '' ? null : parseFloat(actualValue);
    
    setWeeklyData(prevData => {
      const existingEntryIndex = prevData.findIndex(
        entry => entry.weekId === selectedWeekForEntryId && entry.kpiId === kpiId
      );

      if (existingEntryIndex >= 0) {
        const updatedData = [...prevData];
        updatedData[existingEntryIndex] = {
          ...updatedData[existingEntryIndex],
          actualValue: numericValue,
        };
        return updatedData;
      } else {
        const newEntry: WeeklyDataEntry = {
          weekId: selectedWeekForEntryId,
          kpiId,
          actualValue: numericValue,
        };
        return [...prevData, newEntry];
      }
    });
  }, [selectedWeekForEntryId]);

  const openKpiModal = useCallback((kpiToEdit?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => {
    setEditingKpi(kpiToEdit);
    setDefaultSubCategoryName(subCategoryName || '');
    setDefaultCvjStageName(cvjStageName || CVJStageName.AWARE);
    setIsKpiModalOpen(true);
  }, []);

  const handleKpiFormSubmit = useCallback((formData: KpiFormData) => {
    const newKpiData: KPI = {
      id: formData.id || generateId(),
      name: formData.name,
      description: formData.description,
      unitType: formData.unitType,
      defaultMonthlyTargetValue: parseFloat(formData.defaultMonthlyTargetValue) || null,
      isActive: true,
    };

    setCvjStages(prevStages => {
      return prevStages.map(stage => {
        if (stage.name === formData.cvjStageName) {
          const updatedSubCategories = stage.subCategories.map(subCategory => {
            if (subCategory.name === formData.subCategoryName) {
              if (formData.id) {
                return {
                  ...subCategory,
                  kpis: subCategory.kpis.map(kpi => 
                    kpi.id === formData.id ? newKpiData : kpi
                  )
                };
              } else {
                return {
                  ...subCategory,
                  kpis: [...subCategory.kpis, newKpiData]
                };
              }
            }
            return subCategory;
          });

          return { ...stage, subCategories: updatedSubCategories };
        }
        return stage;
      });
    });

    setIsKpiModalOpen(false);
    setEditingKpi(undefined);
  }, []);

  const openMonthlyTargetModal = useCallback((targetToEdit?: MonthlyKpiTarget) => {
    setEditingMonthlyTarget(targetToEdit);
    setIsMonthlyTargetModalOpen(true);
  }, []);

  const handleMonthlyTargetFormSubmit = useCallback((formData: MonthlyTargetFormData) => {
    const newMonthlyTarget: MonthlyKpiTarget = {
      id: formData.id || generateId(),
      kpiId: formData.kpiId,
      monthId: formData.monthId,
      targetValue: parseFloat(formData.targetValue),
    };

    setMonthlyTargets(prevTargets => {
      if (formData.id) {
        return prevTargets.map(target => 
          target.id === formData.id ? newMonthlyTarget : target
        );
      } else {
        return [...prevTargets, newMonthlyTarget];
      }
    });

    setIsMonthlyTargetModalOpen(false);
    setEditingMonthlyTarget(undefined);
  }, []);

  const openWeekModal = useCallback((weekToEdit?: Week) => {
    setEditingWeek(weekToEdit);
    setIsWeekModalOpen(true);
  }, []);

  const handleAddOrUpdateWeek = useCallback((formData: WeekFormData) => {
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const newWeek = createWeekObjectFromFormData(startDate, endDate);

    setWeeks(prevWeeks => {
      if (formData.originalId) {
        return prevWeeks.map(week => 
          week.id === formData.originalId ? newWeek : week
        );
      } else {
        return [...prevWeeks, newWeek];
      }
    });

    setIsWeekModalOpen(false);
    setEditingWeek(undefined);
  }, []);

  const handleDeleteKpi = useCallback((kpiId: string) => {
    setCvjStages(prevStages => {
      return prevStages.map(stage => ({
        ...stage,
        subCategories: stage.subCategories.map(subCategory => ({
          ...subCategory,
          kpis: subCategory.kpis.filter(kpi => kpi.id !== kpiId)
        }))
      }));
    });
  }, []);

  const handleDeleteMonthlyTarget = useCallback((targetId: string) => {
    setMonthlyTargets(prevTargets => prevTargets.filter(target => target.id !== targetId));
  }, []);

  const handleDeleteWeek = useCallback((weekId: string) => {
    setWeeks(prevWeeks => prevWeeks.filter(week => week.id !== weekId));
    setWeeklyData(prevData => prevData.filter(entry => entry.weekId !== weekId));
  }, []);

  // Calculate overall achievement for dashboard
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

  const selectedWeek = weeks.find(week => week.id === selectedWeekForEntryId);

  // Dashboard View Component
  const DashboardView = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketing KPI Dashboard</h2>
          <p className="text-gray-600">Monthly performance overview and analytics</p>
        </div>
        <Select value={selectedMonthId} onValueChange={setSelectedMonthId}>
          <SelectTrigger className="w-48">
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

      {/* Overall Performance Card */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Monthly Performance</h3>
            <div className="flex justify-center mb-4">
              <KpiStatusGauge
                value={overallAchievement}
                target={100}
                title="Average Achievement"
              />
            </div>
            <div className="text-sm text-gray-600 max-w-md mx-auto">
              <p className="mb-2"><strong>{overallAchievement.toFixed(1)}%</strong></p>
              <p className="mb-2">Target: <strong>100%</strong></p>
              <p className="text-xs">This gauge shows the average achievement percentage across all active KPIs with set targets for the selected month.</p>
              <p className="text-xs mt-2">
                <span className="text-green-600">Green: ≥95%</span>, 
                <span className="text-yellow-600 ml-2">Yellow: ≥70%</span>, 
                <span className="text-red-600 ml-2">Red: &lt;70%</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Tables by Stage */}
      {cvjStages.map(stage => {
        const stageKpis = processedMonthlyData.filter(data => {
          const kpi = getKpiById(data.kpi.id);
          return stage.subCategories.some(subCategory => 
            subCategory.kpis.some(subKpi => subKpi.id === kpi?.id)
          );
        });

        if (stageKpis.length === 0) return null;

        return (
          <Card key={stage.id}>
            <CardHeader className={`${stage.colorCode} text-white`}>
              <CardTitle>{stage.name} Stage KPIs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KPI</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual (Month)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target (Month)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% MoM Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stageKpis.map(data => (
                      <tr key={data.kpi.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{data.kpi.name}</div>
                            {data.kpi.description && (
                              <div className="text-sm text-gray-500">{data.kpi.description}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {data.summedActualValue !== null ? data.summedActualValue.toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {data.monthlyTargetValue !== null ? data.monthlyTargetValue.toLocaleString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {data.statusPercentage !== null ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              data.statusPercentage >= STATUS_THRESHOLDS.GREEN 
                                ? 'bg-green-100 text-green-800'
                                : data.statusPercentage >= STATUS_THRESHOLDS.YELLOW
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {data.statusPercentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {data.percentageChangeVsPreviousMonth ? (
                            <span className={`flex items-center ${
                              data.percentageChangeVsPreviousMonth.startsWith('+') && data.percentageChangeVsPreviousMonth !== '+∞%'
                                ? 'text-green-600'
                                : data.percentageChangeVsPreviousMonth.startsWith('-')
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>
                              {data.percentageChangeVsPreviousMonth.startsWith('+') && data.percentageChangeVsPreviousMonth !== '+∞%' && (
                                <TrendingUp className="w-4 h-4 mr-1" />
                              )}
                              {data.percentageChangeVsPreviousMonth.startsWith('-') && (
                                <TrendingDown className="w-4 h-4 mr-1" />
                              )}
                              {data.percentageChangeVsPreviousMonth}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
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
  );

  // Data Entry View Component
  const DataEntryView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Weekly Data Entry</h2>
        <div className="w-64">
          <Select value={selectedWeekForEntryId} onValueChange={setSelectedWeekForEntryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {weeks.map(week => (
                <SelectItem key={week.id} value={week.id}>
                  {week.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedWeek && (
        <Card>
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-blue-900">
              Entering data for: {selectedWeek.id}
            </CardTitle>
            <p className="text-sm text-blue-700">
              ({selectedWeek.startDateString} - {selectedWeek.endDateString}) - Month: {getMonthName(selectedWeek.year, selectedWeek.month)}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {cvjStages.map(stage => (
              <div key={stage.id} className="mb-8">
                <div className={`p-3 ${stage.colorCode} text-white rounded-lg mb-4`}>
                  <h4 className="font-semibold">{stage.name} Stage</h4>
                </div>

                {stage.subCategories.map(subCategory => (
                  <div key={subCategory.id} className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">{subCategory.name}</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subCategory.kpis.map(kpi => {
                        const existingEntry = weeklyData.find(
                          entry => entry.weekId === selectedWeekForEntryId && entry.kpiId === kpi.id
                        );

                        return (
                          <div key={kpi.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <Label className="block text-sm font-medium text-gray-700 mb-1">
                                {kpi.name}
                              </Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={existingEntry?.actualValue?.toString() || ''}
                                onChange={(e) => handleDataChange(kpi.id, e.target.value)}
                                placeholder={`Actual (${kpi.unitType})`}
                              />
                            </div>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-4 h-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{kpi.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Admin View Component  
  const AdminView = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Administration</h2>
        
        <div className="flex space-x-4 mb-6">
          <Button
            variant={adminTab === 'kpis' ? 'default' : 'outline'}
            onClick={() => setAdminTab('kpis')}
          >
            Manage KPIs
          </Button>
          <Button
            variant={adminTab === 'targets' ? 'default' : 'outline'}
            onClick={() => setAdminTab('targets')}
          >
            Monthly Targets
          </Button>
          <Button
            variant={adminTab === 'weeks' ? 'default' : 'outline'}
            onClick={() => setAdminTab('weeks')}
          >
            Manage Weeks
          </Button>
        </div>
      </div>

      {adminTab === 'kpis' && (
        <div className="space-y-6">
          {cvjStages.map(stage => (
            <Card key={stage.id}>
              <CardHeader className={`${stage.colorCode} text-white flex flex-row justify-between items-center`}>
                <CardTitle className="text-lg font-semibold">{stage.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openKpiModal(undefined, '', stage.name)}
                  className="bg-white text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add KPI
                </Button>
              </CardHeader>

              <CardContent className="p-6">
                {stage.subCategories.map(subCategory => (
                  <div key={subCategory.id} className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">{subCategory.name}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openKpiModal(undefined, subCategory.name, stage.name)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to {subCategory.name}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subCategory.kpis.map(kpi => (
                        <div key={kpi.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-900">{kpi.name}</h5>
                            <div className="flex space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openKpiModal(kpi, subCategory.name, stage.name)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteKpi(kpi.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{kpi.description}</p>
                          <div className="text-xs text-gray-500">
                            <div>Unit: {kpi.unitType}</div>
                            <div>Default Target: {kpi.defaultMonthlyTargetValue || 'None'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {adminTab === 'targets' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Targets</h3>
                <Select value={selectedMonthId} onValueChange={setSelectedMonthId}>
                  <SelectTrigger className="w-48">
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
              <Button onClick={() => openMonthlyTargetModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Target
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KPI
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyTargets
                    .filter(target => target.monthId === selectedMonthId)
                    .map(target => {
                      const kpi = allKpis.find(k => k.id === target.kpiId);
                      return (
                        <tr key={target.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {kpi?.name || 'Unknown KPI'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {target.targetValue}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMonthlyTargetModal(target)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteMonthlyTarget(target.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {adminTab === 'weeks' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Manage Weeks</h3>
              <Button onClick={() => openWeekModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Week
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeks.map(week => (
                    <tr key={week.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {week.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {week.startDateString} to {week.endDateString}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openWeekModal(week)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteWeek(week.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Marketing KPI Scorecard</span>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('dashboard')}
                  className="flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </Button>
                <Button
                  variant={currentView === 'data-entry' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('data-entry')}
                  className="flex items-center space-x-2"
                >
                  <Database className="w-4 h-4" />
                  <span>Data Entry</span>
                </Button>
                <Button
                  variant={currentView === 'admin' ? 'default' : 'ghost'}
                  onClick={() => setCurrentView('admin')}
                  className="flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Administration</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'data-entry' && <DataEntryView />}
          {currentView === 'admin' && <AdminView />}
        </div>
      </main>

      {/* Modals */}
      <KpiModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        onSubmit={handleKpiFormSubmit}
        kpiData={{
          id: editingKpi?.id,
          name: editingKpi?.name || '',
          description: editingKpi?.description || '',
          unitType: editingKpi?.unitType || UnitType.NUMBER,
          defaultMonthlyTargetValue: editingKpi?.defaultMonthlyTargetValue?.toString() || '',
          subCategoryName: defaultSubCategoryName,
          cvjStageName: defaultCvjStageName,
        }}
        allCvjStages={cvjStages}
      />

      <MonthlyTargetModal
        isOpen={isMonthlyTargetModalOpen}
        onClose={() => setIsMonthlyTargetModalOpen(false)}
        onSubmit={handleMonthlyTargetFormSubmit}
        targetData={{
          id: editingMonthlyTarget?.id,
          kpiId: editingMonthlyTarget?.kpiId || '',
          monthId: editingMonthlyTarget?.monthId || selectedMonthId,
          targetValue: editingMonthlyTarget?.targetValue?.toString() || '',
        }}
        allKpis={allKpis}
        allMonths={uniqueMonths}
      />

      <WeekModal
        isOpen={isWeekModalOpen}
        onClose={() => setIsWeekModalOpen(false)}
        onSubmit={handleAddOrUpdateWeek}
        weekData={{
          originalId: editingWeek?.id,
          startDate: editingWeek?.startDateString || '',
          endDate: editingWeek?.endDateString || '',
        }}
      />
    </div>
  );
}

// Modal Components
interface KpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KpiFormData) => void;
  kpiData: KpiFormData;
  allCvjStages: CVJStage[];
}

function KpiModal({ isOpen, onClose, onSubmit, kpiData, allCvjStages }: KpiModalProps) {
  const [formData, setFormData] = useState<KpiFormData>(kpiData);

  useEffect(() => {
    setFormData(kpiData);
  }, [kpiData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof KpiFormData, value: string | UnitType | CVJStageName) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedStage = allCvjStages.find(stage => stage.name === formData.cvjStageName);
  const subCategories = selectedStage?.subCategories || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{formData.id ? 'Edit KPI' : 'Add New KPI'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">KPI Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="cvjStage">CVJ Stage</Label>
            <Select value={formData.cvjStageName} onValueChange={(value: CVJStageName) => handleChange('cvjStageName', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CVJStageName).map(stageName => (
                  <SelectItem key={stageName} value={stageName}>
                    {stageName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subCategory">Sub Category</Label>
            <Select value={formData.subCategoryName} onValueChange={(value) => handleChange('subCategoryName', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Sub Category" />
              </SelectTrigger>
              <SelectContent>
                {subCategories.map(subCategory => (
                  <SelectItem key={subCategory.id} value={subCategory.name}>
                    {subCategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unitType">Unit Type</Label>
            <Select value={formData.unitType} onValueChange={(value: UnitType) => handleChange('unitType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(UnitType).map(unitType => (
                  <SelectItem key={unitType} value={unitType}>
                    {unitType.replace('_', ' ').toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="defaultTarget">Default Monthly Target</Label>
            <Input
              id="defaultTarget"
              type="number"
              step="0.01"
              value={formData.defaultMonthlyTargetValue}
              onChange={(e) => handleChange('defaultMonthlyTargetValue', e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {formData.id ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MonthlyTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MonthlyTargetFormData) => void;
  targetData: MonthlyTargetFormData;
  allKpis: KPI[];
  allMonths: { id: string; name: string; year: number; month: number }[];
}

function MonthlyTargetModal({ isOpen, onClose, onSubmit, targetData, allKpis, allMonths }: MonthlyTargetModalProps) {
  const [formData, setFormData] = useState<MonthlyTargetFormData>(targetData);

  useEffect(() => {
    setFormData(targetData);
  }, [targetData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof MonthlyTargetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{formData.id ? 'Edit Monthly Target' : 'Add Monthly Target'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="kpi">KPI</Label>
            <Select value={formData.kpiId} onValueChange={(value) => handleChange('kpiId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select KPI" />
              </SelectTrigger>
              <SelectContent>
                {allKpis.map(kpi => (
                  <SelectItem key={kpi.id} value={kpi.id}>
                    {kpi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="month">Month</Label>
            <Select value={formData.monthId} onValueChange={(value) => handleChange('monthId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {allMonths.map(month => (
                  <SelectItem key={month.id} value={month.id}>
                    {month.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetValue">Target Value</Label>
            <Input
              id="targetValue"
              type="number"
              step="0.01"
              value={formData.targetValue}
              onChange={(e) => handleChange('targetValue', e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {formData.id ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface WeekModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: WeekFormData) => void;
    weekData: WeekFormData;
}

function WeekModal({ isOpen, onClose, onSubmit, weekData }: WeekModalProps) {
  const [formData, setFormData] = useState<WeekFormData>(weekData);

  useEffect(() => {
    setFormData(weekData);
  }, [weekData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof WeekFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{formData.originalId ? 'Edit Week' : 'Add New Week'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {formData.originalId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Protected Routes
const ProtectedMarketingKpiApp = withAuth(MarketingKpiApp);

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Data Entry', href: '/data-entry', icon: Database },
    ...(user?.role === 'ADMIN' ? [{ name: 'Administration', href: '/admin', icon: Settings }] : []),
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location === href;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 rounded-lg p-2">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">KPI Scorecard</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);
              
              return (
                <Link key={item.name} href={item.href}>
                  <span className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }
                  `}>
                    <Icon className={`
                      mr-3 h-5 w-5 transition-colors
                      ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}
                    `} />
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            {user?.role === 'ADMIN' && (
              <Badge variant="outline" className="text-xs">Admin</Badge>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-slate-900">Marketing KPI Scorecard</h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-slate-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>

      {/* Protected routes */}
      <Route path="/">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedMarketingKpiApp />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/dashboard">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedMarketingKpiApp />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/data-entry">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedMarketingKpiApp />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      <Route path="/admin">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedMarketingKpiApp />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

      {/* 404 route */}
      <Route>
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <NotFound />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;