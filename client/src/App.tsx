import React, { useState, useCallback, useMemo } from 'react';
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, withAuth } from "./hooks/use-auth";
import { queryClient } from "./lib/queryClient";
import Login from "./pages/login";
import NotFound from "./pages/not-found";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Info
} from "lucide-react";

// Import KPI types and constants
import {
  CVJStageName,
  UnitType,
  type CVJStage,
  type SubCategory,
  type KPI,
  type Week,
  type WeeklyDataEntry,
  type Month,
  type MonthlyKpiTarget,
  type ProcessedKpiMonthlyData,
  type KpiFormData,
  type MonthlyTargetFormData,
  type WeekFormData
} from './types/kpi';

import {
  INITIAL_CVJ_STAGES,
  DEFAULT_WEEKS,
  INITIAL_WEEKLY_DATA,
  INITIAL_MONTHLY_TARGETS,
  createWeekObjectFromFormData
} from './constants/kpi';

// === STATE MANAGEMENT ===
function useAppState() {
  const [cvjStages, setCvjStages] = useState<CVJStage[]>(INITIAL_CVJ_STAGES);
  const [weeks, setWeeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataEntry[]>(INITIAL_WEEKLY_DATA);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyKpiTarget[]>(INITIAL_MONTHLY_TARGETS);
  const [activeView, setActiveView] = useState<'dashboard' | 'data-entry' | 'admin'>('dashboard');
  const [selectedWeekId, setSelectedWeekId] = useState<string>(weeks[0]?.id || '');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('2024-05');
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isMonthlyTargetModalOpen, setIsMonthlyTargetModalOpen] = useState(false);
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | undefined>();
  const [editingMonthlyTarget, setEditingMonthlyTarget] = useState<MonthlyKpiTarget | undefined>();
  const [editingWeek, setEditingWeek] = useState<Week | undefined>();
  const [defaultSubCategoryName, setDefaultSubCategoryName] = useState<string>('');
  const [defaultCvjStageName, setDefaultCvjStageName] = useState<CVJStageName>(CVJStageName.AWARE);

  return {
    cvjStages, setCvjStages,
    weeks, setWeeks,
    weeklyData, setWeeklyData,
    monthlyTargets, setMonthlyTargets,
    activeView, setActiveView,
    selectedWeekId, setSelectedWeekId,
    selectedMonthId, setSelectedMonthId,
    isKpiModalOpen, setIsKpiModalOpen,
    isMonthlyTargetModalOpen, setIsMonthlyTargetModalOpen,
    isWeekModalOpen, setIsWeekModalOpen,
    editingKpi, setEditingKpi,
    editingMonthlyTarget, setEditingMonthlyTarget,
    editingWeek, setEditingWeek,
    defaultSubCategoryName, setDefaultSubCategoryName,
    defaultCvjStageName, setDefaultCvjStageName,
  };
}

// === KPI STATUS GAUGE COMPONENT ===
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

// === MAIN APPLICATION COMPONENT ===
function MarketingKpiApp() {
  const {
    cvjStages, setCvjStages,
    weeks, setWeeks,
    weeklyData, setWeeklyData,
    monthlyTargets, setMonthlyTargets,
    activeView, setActiveView,
    selectedWeekId, setSelectedWeekId,
    selectedMonthId, setSelectedMonthId,
    isKpiModalOpen, setIsKpiModalOpen,
    isMonthlyTargetModalOpen, setIsMonthlyTargetModalOpen,
    isWeekModalOpen, setIsWeekModalOpen,
    editingKpi, setEditingKpi,
    editingMonthlyTarget, setEditingMonthlyTarget,
    editingWeek, setEditingWeek,
    defaultSubCategoryName, setDefaultSubCategoryName,
    defaultCvjStageName, setDefaultCvjStageName,
  } = useAppState();

  // Derived data
  const allKpis = useMemo(() => {
    return cvjStages.flatMap(stage => 
      stage.subCategories.flatMap(subCategory => subCategory.kpis)
    );
  }, [cvjStages]);

  const uniqueMonths = useMemo(() => {
    const monthSet = new Set<string>();
    weeks.forEach(week => {
      const monthId = `${week.year}-${String(week.month).padStart(2, '0')}`;
      monthSet.add(monthId);
    });
    
    return Array.from(monthSet).map(monthId => {
      const [year, month] = monthId.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return {
        id: monthId,
        name: `${monthNames[parseInt(month) - 1]} ${year}`,
        year: parseInt(year),
        month: parseInt(month)
      };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }, [weeks]);

  const getKpiById = useCallback((kpiId: string): KPI | undefined => {
    return allKpis.find(kpi => kpi.id === kpiId);
  }, [allKpis]);

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

  // Modal handlers
  const openKpiModal = useCallback((kpiToEdit?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => {
    setEditingKpi(kpiToEdit);
    setDefaultSubCategoryName(subCategoryName || '');
    setDefaultCvjStageName(cvjStageName || CVJStageName.AWARE);
    setIsKpiModalOpen(true);
  }, []);

  const openMonthlyTargetModal = useCallback((targetToEdit?: MonthlyKpiTarget) => {
    setEditingMonthlyTarget(targetToEdit);
    setIsMonthlyTargetModalOpen(true);
  }, []);

  const openWeekModal = useCallback((weekToEdit?: Week) => {
    setEditingWeek(weekToEdit);
    setIsWeekModalOpen(true);
  }, []);

  // CRUD handlers
  const handleKpiFormSubmit = useCallback((formData: KpiFormData) => {
    const newKpiData: KPI = {
      id: formData.id || `kpi-${Date.now()}`,
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

  const handleDataChange = useCallback((kpiId: string, actualValue: string) => {
    const numericValue = actualValue === '' ? null : parseFloat(actualValue);
    
    setWeeklyData(prevData => {
      const existingEntryIndex = prevData.findIndex(
        entry => entry.weekId === selectedWeekId && entry.kpiId === kpiId
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
          weekId: selectedWeekId,
          kpiId,
          actualValue: numericValue,
        };
        return [...prevData, newEntry];
      }
    });
  }, [selectedWeekId]);

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

    setWeeklyData(prevData => prevData.filter(entry => entry.kpiId !== kpiId));
    setMonthlyTargets(prevTargets => prevTargets.filter(target => target.kpiId !== kpiId));
  }, []);

  // Navigation
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            processedMonthlyData={processedMonthlyData}
            cvjStages={cvjStages}
            getKpiById={getKpiById}
            selectedMonthId={selectedMonthId}
            allWeeks={weeks}
            allWeeklyData={weeklyData}
            monthlyTargets={monthlyTargets}
          />
        );
      case 'data-entry':
        return (
          <DataEntryView
            weeks={weeks}
            selectedWeekId={selectedWeekId}
            onSelectedWeekChange={setSelectedWeekId}
            cvjStages={cvjStages}
            weeklyData={weeklyData}
            onDataChange={handleDataChange}
            getKpiById={getKpiById}
          />
        );
      case 'admin':
        return (
          <AdminView
            cvjStages={cvjStages}
            monthlyTargets={monthlyTargets}
            allKpis={allKpis}
            uniqueMonths={uniqueMonths}
            weeks={weeks}
            selectedMonthId={selectedMonthId}
            setSelectedMonthId={setSelectedMonthId}
            onOpenKpiModal={openKpiModal}
            onOpenMonthlyTargetModal={openMonthlyTargetModal}
            onOpenWeekModal={openWeekModal}
            onDeleteKpi={handleDeleteKpi}
            onDeleteTarget={(id) => setMonthlyTargets(prev => prev.filter(t => t.id !== id))}
            onDeleteWeek={(id) => setWeeks(prev => prev.filter(w => w.id !== id))}
          />
        );
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="p-6">
      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-4">
          <Button
            variant={activeView === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveView('dashboard')}
          >
            Dashboard
          </Button>
          <Button
            variant={activeView === 'data-entry' ? 'default' : 'outline'}
            onClick={() => setActiveView('data-entry')}
          >
            Data Entry
          </Button>
          <Button
            variant={activeView === 'admin' ? 'default' : 'outline'}
            onClick={() => setActiveView('admin')}
          >
            Administration
          </Button>
        </nav>
      </div>

      {/* Main Content */}
      <div>
        {renderActiveView()}
      </div>

      {/* KPI Modal */}
      <KpiModal
        isOpen={isKpiModalOpen}
        onClose={() => {
          setIsKpiModalOpen(false);
          setEditingKpi(undefined);
        }}
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
    </div>
  );
}

// === VIEW COMPONENTS ===

interface DashboardViewProps {
  processedMonthlyData: ProcessedKpiMonthlyData[];
  cvjStages: CVJStage[];
  getKpiById: (kpiId: string) => KPI | undefined;
  selectedMonthId: string;
  allWeeks: Week[];
  allWeeklyData: WeeklyDataEntry[];
  monthlyTargets: MonthlyKpiTarget[];
}

function DashboardView({ 
  processedMonthlyData, 
  cvjStages, 
  getKpiById, 
  selectedMonthId, 
  allWeeks, 
  allWeeklyData, 
  monthlyTargets 
}: DashboardViewProps) {
  return (
    <div className="space-y-8">
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

interface DataEntryViewProps {
  weeks: Week[];
  selectedWeekId: string;
  onSelectedWeekChange: (weekId: string) => void;
  cvjStages: CVJStage[];
  weeklyData: WeeklyDataEntry[];
  onDataChange: (kpiId: string, actualValue: string) => void;
  getKpiById: (kpiId: string) => KPI | undefined;
}

function DataEntryView({
  weeks,
  selectedWeekId,
  onSelectedWeekChange,
  cvjStages,
  weeklyData,
  onDataChange,
  getKpiById
}: DataEntryViewProps) {
  const selectedWeek = weeks.find(week => week.id === selectedWeekId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Weekly Data Entry</h2>
        <div className="w-64">
          <Select value={selectedWeekId} onValueChange={onSelectedWeekChange}>
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
              {selectedWeek.id}
            </CardTitle>
            <p className="text-sm text-blue-700">
              {selectedWeek.startDateString} to {selectedWeek.endDateString}
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {cvjStages.map(stage => (
              <div key={stage.id} className="mb-8">
                <div className={`p-3 ${stage.colorCode} text-white rounded-lg mb-4`}>
                  <h4 className="font-semibold">{stage.name}</h4>
                </div>

                {stage.subCategories.map(subCategory => (
                  <div key={subCategory.id} className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">{subCategory.name}</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subCategory.kpis.map(kpi => {
                        const existingEntry = weeklyData.find(
                          entry => entry.weekId === selectedWeekId && entry.kpiId === kpi.id
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
                                onChange={(e) => onDataChange(kpi.id, e.target.value)}
                                placeholder="Enter value"
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
}

interface AdminViewProps {
  cvjStages: CVJStage[];
  monthlyTargets: MonthlyKpiTarget[];
  allKpis: KPI[];
  uniqueMonths: Month[];
  weeks: Week[];
  selectedMonthId: string;
  setSelectedMonthId: (monthId: string) => void;
  onOpenKpiModal: (kpi?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => void;
  onOpenMonthlyTargetModal: (target?: MonthlyKpiTarget) => void;
  onOpenWeekModal: (week?: Week) => void;
  onDeleteKpi: (kpiId: string) => void;
  onDeleteTarget: (targetId: string) => void;
  onDeleteWeek: (weekId: string) => void;
}

function AdminView({
  cvjStages,
  monthlyTargets,
  allKpis,
  uniqueMonths,
  weeks,
  selectedMonthId,
  setSelectedMonthId,
  onOpenKpiModal,
  onOpenMonthlyTargetModal,
  onOpenWeekModal,
  onDeleteKpi,
  onDeleteTarget,
  onDeleteWeek
}: AdminViewProps) {
  const [adminTab, setAdminTab] = useState<'kpis' | 'targets' | 'weeks'>('kpis');

  return (
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
        <AdminKpiView
          cvjStages={cvjStages}
          onOpenModal={onOpenKpiModal}
          onDeleteKpi={onDeleteKpi}
        />
      )}

      {adminTab === 'targets' && (
        <AdminMonthlyTargetsView
          monthlyTargets={monthlyTargets}
          allKpis={allKpis}
          uniqueMonths={uniqueMonths}
          onOpenModal={onOpenMonthlyTargetModal}
          onDeleteTarget={onDeleteTarget}
          selectedMonthId={selectedMonthId}
          setSelectedMonthId={setSelectedMonthId}
        />
      )}

      {adminTab === 'weeks' && (
        <AdminWeeksView
          weeks={weeks}
          onOpenWeekModal={onOpenWeekModal}
          onDeleteWeek={onDeleteWeek}
        />
      )}
    </div>
  );
}

interface AdminKpiViewProps {
  cvjStages: CVJStage[];
  onOpenModal: (kpi?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => void;
  onDeleteKpi: (kpiId: string) => void;
}

function AdminKpiView({ cvjStages, onOpenModal, onDeleteKpi }: AdminKpiViewProps) {
  return (
    <div className="space-y-6">
      {cvjStages.map(stage => (
        <Card key={stage.id}>
          <CardHeader className={`${stage.colorCode} text-white flex flex-row justify-between items-center`}>
            <CardTitle className="text-lg font-semibold">{stage.name}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenModal(undefined, '', stage.name)}
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
                    onClick={() => onOpenModal(undefined, subCategory.name, stage.name)}
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
                            onClick={() => onOpenModal(kpi, subCategory.name, stage.name)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteKpi(kpi.id)}
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
  );
}

interface AdminMonthlyTargetsViewProps {
  monthlyTargets: MonthlyKpiTarget[];
  allKpis: KPI[];
  uniqueMonths: Month[];
  onOpenModal: (target?: MonthlyKpiTarget) => void;
  onDeleteTarget: (targetId: string) => void;
  selectedMonthId: string;
  setSelectedMonthId: (monthId: string) => void;
}

function AdminMonthlyTargetsView({
  monthlyTargets,
  allKpis,
  uniqueMonths,
  onOpenModal,
  onDeleteTarget,
  selectedMonthId,
  setSelectedMonthId
}: AdminMonthlyTargetsViewProps) {
  const filteredTargets = monthlyTargets.filter(target => target.monthId === selectedMonthId);

  return (
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
          <Button onClick={() => onOpenModal()}>
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
              {filteredTargets.map(target => {
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
                          onClick={() => onOpenModal(target)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteTarget(target.id)}
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
  );
}

interface AdminWeeksViewProps {
  weeks: Week[];
  onOpenWeekModal: (week?: Week) => void;
  onDeleteWeek: (weekId: string) => void;
}

function AdminWeeksView({ weeks, onOpenWeekModal, onDeleteWeek }: AdminWeeksViewProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Manage Weeks</h3>
          <Button onClick={() => onOpenWeekModal()}>
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
                        onClick={() => onOpenWeekModal(week)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDeleteWeek(week.id)}
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
  );
}

// === MODAL COMPONENTS ===

interface KpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KpiFormData) => void;
  kpiData: KpiFormData;
  allCvjStages: CVJStage[];
}

function KpiModal({ isOpen, onClose, onSubmit, kpiData, allCvjStages }: KpiModalProps) {
  const [formData, setFormData] = useState<KpiFormData>(kpiData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
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

// === MAIN APP WRAPPER ===

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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

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
                  <a className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
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
                  </a>
                </Link>
              );
            })}
          </div>
        </nav>

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

const ProtectedKpiApp = withAuth(MarketingKpiApp);

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
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/" /> : <Login />}
      </Route>

      <Route path="/">
        {isAuthenticated ? (
          <AuthenticatedLayout>
            <ProtectedKpiApp />
          </AuthenticatedLayout>
        ) : (
          <Redirect to="/login" />
        )}
      </Route>

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