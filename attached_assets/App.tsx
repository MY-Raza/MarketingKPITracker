

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CVJStage, KPI, Week, WeeklyDataEntry, ProcessedKpiMonthlyData, CVJStageName, UnitType, KpiFormData, ChartDataPoint, SubCategory, Month, MonthlyKpiTarget, MonthlyTargetFormData, WeekFormData } from './types';
import { INITIAL_CVJ_STAGES, DEFAULT_WEEKS, STATUS_THRESHOLDS, CVJ_STAGE_COLORS, INITIAL_WEEKLY_DATA, INITIAL_MONTHLY_TARGETS, createWeekObjectFromFormData, getISOWeek, formatDateToYYYYMMDD, formatDateToMMDD } from './constants';
import { Button, Input, Select, Card, Modal, Textarea, Tooltip, InfoIcon, LoadingSpinner, PlusIcon, EditIcon, TrashIcon } from './components/ui';
import { KpiTrendChart, KpiStatusGauge, KpiComparisonBarChart } from './components/charts';

// Helper function to generate unique IDs
const generateId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to get month ID string (YYYY-MM)
const getMonthId = (year: number, month: number): string => `${year}-${month.toString().padStart(2, '0')}`;

// Helper to get month name
const getMonthName = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const App: React.FC = () => {
  const [cvjStages, setCvjStages] = useState<CVJStage[]>(INITIAL_CVJ_STAGES);
  const [weeks, setWeeks] = useState<Week[]>(DEFAULT_WEEKS);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataEntry[]>(INITIAL_WEEKLY_DATA);
  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyKpiTarget[]>(INITIAL_MONTHLY_TARGETS);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Simulate initial data load if needed, or just a brief moment for UI to settle
    setTimeout(() => {
      setIsLoading(false);
    }, 500); 
  }, []);

  const uniqueMonths = useMemo(() => {
    const monthSet = new Set<string>();
    weeks.forEach(week => monthSet.add(getMonthId(week.year, week.month)));
    monthlyTargets.forEach(target => monthSet.add(target.monthId));

    const sortedMonthIds = Array.from(monthSet).sort((a,b) => b.localeCompare(a)); // Newest first "YYYY-MM"

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

  const [selectedMonthId, setSelectedMonthId] = useState<string>(uniqueMonths[0]?.id || '');
  const [selectedWeekForEntryId, setSelectedWeekForEntryId] = useState<string>(weeks[0]?.id || '');

  useEffect(() => {
    if (uniqueMonths.length > 0 && (!selectedMonthId || !uniqueMonths.find(m => m.id === selectedMonthId))) {
      setSelectedMonthId(uniqueMonths[0]?.id || '');
    } else if (uniqueMonths.length === 0 && selectedMonthId) { // If no months left, clear selection
        setSelectedMonthId('');
    }
  }, [uniqueMonths, selectedMonthId]);

  useEffect(() => {
     if (weeks.length > 0 && (!selectedWeekForEntryId || !weeks.find(w => w.id === selectedWeekForEntryId))) {
      setSelectedWeekForEntryId(weeks[0]?.id || '');
    } else if (weeks.length === 0 && selectedWeekForEntryId) { // If no weeks left, clear selection
        setSelectedWeekForEntryId('');
    }
  }, [weeks, selectedWeekForEntryId]);


  const allKpis = useMemo(() => cvjStages.flatMap(stage => stage.subCategories.flatMap(sc => sc.kpis.filter(kpi => kpi.isActive))), [cvjStages]);

  const getKpiById = useCallback((kpiId: string): KPI | undefined => {
    return allKpis.find(kpi => kpi.id === kpiId);
  }, [allKpis]);

  const getWeeksInMonth = useCallback((monthId: string, allWeeks: Week[]): Week[] => {
    if (!monthId) return [];
    const [year, monthNum] = monthId.split('-').map(Number);
    return allWeeks.filter(week => week.year === year && week.month === monthNum);
  }, []);
  
  const processKpiDataForMonthDisplay = useCallback((
    targetMonthId: string,
    kpisToProcess: KPI[],
    allWeeklyData: WeeklyDataEntry[],
    allMonthlyTargets: MonthlyKpiTarget[],
    allWeeks: Week[]
  ): ProcessedKpiMonthlyData[] => {
    if (!targetMonthId || kpisToProcess.length === 0) return [];

    const [currentYear, currentMonthNum] = targetMonthId.split('-').map(Number);
    const previousMonthDate = new Date(currentYear, currentMonthNum - 2, 1); // Month is 0-indexed for Date constructor
    const previousMonthId = getMonthId(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1);
    
    const weeksInCurrentMonth = getWeeksInMonth(targetMonthId, allWeeks);
    const weeksInPreviousMonth = getWeeksInMonth(previousMonthId, allWeeks);

    return kpisToProcess.map(kpi => {
      if (!kpi.isActive) return null;

      const weeklyEntriesForKpiCurrentMonth = allWeeklyData.filter(entry =>
        entry.kpiId === kpi.id && weeksInCurrentMonth.some(w => w.id === entry.weekId)
      );
      const summedActualValueCurrentMonth = weeklyEntriesForKpiCurrentMonth.reduce((sum, entry) => sum + (entry.actualValue ?? 0), 0);

      const weeklyEntriesForKpiPreviousMonth = allWeeklyData.filter(entry =>
        entry.kpiId === kpi.id && weeksInPreviousMonth.some(w => w.id === entry.weekId)
      );
      const summedActualValuePreviousMonth = weeklyEntriesForKpiPreviousMonth.reduce((sum, entry) => sum + (entry.actualValue ?? 0), 0);
      
      const monthlyTargetEntry = allMonthlyTargets.find(mt => mt.kpiId === kpi.id && mt.monthId === targetMonthId);
      const monthlyTargetValue = monthlyTargetEntry?.targetValue ?? kpi.defaultMonthlyTargetValue;

      let statusPercentage: number | null = null;
      if (summedActualValueCurrentMonth !== null && monthlyTargetValue !== null && monthlyTargetValue !== 0) {
        statusPercentage = (summedActualValueCurrentMonth / monthlyTargetValue) * 100;
      } else if (summedActualValueCurrentMonth !== null && monthlyTargetValue === 0 && summedActualValueCurrentMonth > 0) {
        statusPercentage = 100; 
      } else if (summedActualValueCurrentMonth === 0 && monthlyTargetValue === 0) {
        statusPercentage = 100;
      } else if (monthlyTargetValue === null || monthlyTargetValue === 0) { 
         statusPercentage = summedActualValueCurrentMonth > 0 ? 100 : 0;
      }

      let statusColor = 'bg-slate-100';
      let statusTextColor = 'text-slate-600';
      if (statusPercentage !== null) {
        if (statusPercentage >= STATUS_THRESHOLDS.GREEN) {
          statusColor = 'bg-status-green'; statusTextColor = 'text-status-green-text';
        } else if (statusPercentage >= STATUS_THRESHOLDS.YELLOW) {
          statusColor = 'bg-status-yellow'; statusTextColor = 'text-status-yellow-text';
        } else {
          statusColor = 'bg-status-red'; statusTextColor = 'text-status-red-text';
        }
      }

      let percentageChangeVsPreviousMonth: string | null = 'N/A';
        if (summedActualValueCurrentMonth !== null && summedActualValuePreviousMonth !== null) {
            if (summedActualValuePreviousMonth === 0) {
                percentageChangeVsPreviousMonth = summedActualValueCurrentMonth > 0 ? '+∞%' : (summedActualValueCurrentMonth === 0 ? '0%' : '-∞%');
            } else {
                const change = ((summedActualValueCurrentMonth - summedActualValuePreviousMonth) / summedActualValuePreviousMonth) * 100;
                percentageChangeVsPreviousMonth = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
            }
        }

      return {
        kpi,
        monthId: targetMonthId,
        summedActualValue: summedActualValueCurrentMonth,
        monthlyTargetValue,
        statusPercentage,
        statusColor,
        statusTextColor,
        percentageChangeVsPreviousMonth,
        weeklyEntries: weeklyEntriesForKpiCurrentMonth,
      };
    }).filter(item => item !== null) as ProcessedKpiMonthlyData[];
  }, [getWeeksInMonth]);

  const processedMonthlyData = useMemo(() => {
    return processKpiDataForMonthDisplay(selectedMonthId, allKpis, weeklyData, monthlyTargets, weeks);
  }, [selectedMonthId, allKpis, weeklyData, monthlyTargets, weeks, processKpiDataForMonthDisplay]);


  const handleDataEntryChange = (kpiId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setWeeklyData(prevData => {
      const existingEntryIndex = prevData.findIndex(e => e.weekId === selectedWeekForEntryId && e.kpiId === kpiId);
      if (existingEntryIndex > -1) {
        const updatedEntry = { ...prevData[existingEntryIndex], actualValue: numValue };
        return [...prevData.slice(0, existingEntryIndex), updatedEntry, ...prevData.slice(existingEntryIndex + 1)];
      } else {
        const newEntry: WeeklyDataEntry = {
          weekId: selectedWeekForEntryId,
          kpiId,
          actualValue: numValue,
          notes: '',
        };
        return [...prevData, newEntry];
      }
    });
  };
  
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiFormData | null>(null);

  const openKpiModal = (kpiToEdit?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => {
    if (kpiToEdit && subCategoryName && cvjStageName) {
      setEditingKpi({
        id: kpiToEdit.id,
        name: kpiToEdit.name,
        description: kpiToEdit.description,
        unitType: kpiToEdit.unitType,
        defaultMonthlyTargetValue: kpiToEdit.defaultMonthlyTargetValue?.toString() || '',
        subCategoryName: subCategoryName,
        cvjStageName: cvjStageName,
      });
    } else {
      setEditingKpi({
        name: '', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: '', 
        subCategoryName: cvjStages[0]?.subCategories[0]?.name || '', 
        cvjStageName: cvjStages[0]?.name || CVJStageName.AWARE 
      });
    }
    setIsKpiModalOpen(true);
  };

  const handleKpiFormSubmit = (formData: KpiFormData) => {
    const targetValue = parseFloat(formData.defaultMonthlyTargetValue);
    const newKpiData: KPI = {
      id: formData.id || generateId(),
      name: formData.name,
      description: formData.description,
      unitType: formData.unitType,
      defaultMonthlyTargetValue: isNaN(targetValue) ? null : targetValue,
      isActive: true,
    };

    setCvjStages(prevStages => {
      const stagesCopy = JSON.parse(JSON.stringify(prevStages)) as CVJStage[]; 
      let targetStage = stagesCopy.find(s => s.name === formData.cvjStageName);
       if (!targetStage) return prevStages;
      
      let targetSubCategory = targetStage.subCategories.find(sc => sc.name === formData.subCategoryName);
      
      if (formData.id) { // If editing an existing KPI
        let oldKpiRemoved = false;
        // Remove the KPI from its old position if stage/subcategory changed
        for (const stage of stagesCopy) {
          for (const subCat of stage.subCategories) {
            const kpiIndex = subCat.kpis.findIndex(k => k.id === formData.id);
            if (kpiIndex > -1) {
              // Only remove if it's moving to a different subcategory or stage
              if (stage.name !== formData.cvjStageName || subCat.name !== formData.subCategoryName) {
                subCat.kpis.splice(kpiIndex, 1);
              }
              oldKpiRemoved = true;
              break;
            }
          }
          if (oldKpiRemoved && stage.name !== formData.cvjStageName) break; // Optimization: if found and stage is different, no need to check other stages
        }
      }
      
      // Find or create the target subcategory in the target stage
      if (!targetSubCategory) { 
          // This logic might be too simple if we want to allow creating new subcategories on the fly via this form.
          // For now, assume subCategoryName refers to an existing one or one we create if default.
          // A more robust solution would involve a separate subcategory management or ensuring subCategoryName is always valid.
          targetSubCategory = { id: generateId(), name: formData.subCategoryName, displayOrder: targetStage.subCategories.length + 1, kpis: [] };
          targetStage.subCategories.push(targetSubCategory);
          targetStage.subCategories.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
      }

      const kpiIndexInTarget = targetSubCategory.kpis.findIndex(k => k.id === newKpiData.id);
      if (kpiIndexInTarget > -1) { // Update existing KPI in the target location
        targetSubCategory.kpis[kpiIndexInTarget] = newKpiData;
      } else { // Add new KPI to the target location
        targetSubCategory.kpis.push(newKpiData);
      }

      targetSubCategory.kpis.sort((a, b) => a.name.localeCompare(b.name)); // Sort KPIs within subcategory
      return stagesCopy;
    });
    setIsKpiModalOpen(false);
    setEditingKpi(null);
  };
  
  const deleteKpi = (kpiIdToDelete: string) => {
    if (!window.confirm("Are you sure you want to delete this KPI, its monthly targets, and all its weekly data? This action cannot be undone.")) return;
    
     setCvjStages(prevStages => 
      prevStages.map(stage => ({
        ...stage,
        subCategories: stage.subCategories.map(sc => ({
          ...sc,
          kpis: sc.kpis.filter(kpi => kpi.id !== kpiIdToDelete)
        })).filter(sc => sc.kpis.length > 0 || stage.subCategories.length > 1) // Keep subcategory if it's not empty or if it's the last one (UX choice)
      }))
      // Potentially filter out stages if they become empty, depending on desired behavior
    );
    setWeeklyData(prevData => prevData.filter(entry => entry.kpiId !== kpiIdToDelete));
    setMonthlyTargets(prevTargets => prevTargets.filter(target => target.kpiId !== kpiIdToDelete));
  };
  
  const [isMonthlyTargetModalOpen, setIsMonthlyTargetModalOpen] = useState(false);
  const [editingMonthlyTarget, setEditingMonthlyTarget] = useState<MonthlyTargetFormData | null>(null);

  const openMonthlyTargetModal = (targetToEdit?: MonthlyKpiTarget) => {
    if (targetToEdit) {
      setEditingMonthlyTarget({
        id: targetToEdit.id,
        kpiId: targetToEdit.kpiId,
        monthId: targetToEdit.monthId,
        targetValue: targetToEdit.targetValue.toString(),
      });
    } else {
      setEditingMonthlyTarget({
        kpiId: allKpis[0]?.id || '',
        monthId: selectedMonthId || uniqueMonths[0]?.id || getMonthId(new Date().getFullYear(), new Date().getMonth() + 1),
        targetValue: '',
      });
    }
    setIsMonthlyTargetModalOpen(true);
  };

  const handleMonthlyTargetFormSubmit = (formData: MonthlyTargetFormData) => {
    const targetValue = parseFloat(formData.targetValue);
    if (isNaN(targetValue)) {
      alert("Target value must be a number.");
      return;
    }

    const newMonthlyTarget: MonthlyKpiTarget = {
      id: formData.id || generateId(),
      kpiId: formData.kpiId,
      monthId: formData.monthId,
      targetValue: targetValue,
    };

    setMonthlyTargets(prevTargets => {
      // If editing (id exists) or if adding and a target for same kpi/month already exists, replace it.
      const existingIndex = prevTargets.findIndex(t => t.id === newMonthlyTarget.id || (t.kpiId === newMonthlyTarget.kpiId && t.monthId === newMonthlyTarget.monthId && !formData.id));
      if (existingIndex > -1) {
        const updatedTargets = [...prevTargets];
        updatedTargets[existingIndex] = newMonthlyTarget; // Replace/update existing
        return updatedTargets;
      } else {
        return [...prevTargets, newMonthlyTarget]; // Add new
      }
    });
    setIsMonthlyTargetModalOpen(false);
    setEditingMonthlyTarget(null);
  };

  const deleteMonthlyTarget = (targetIdToDelete: string) => {
    if (!window.confirm("Are you sure you want to delete this monthly target?")) return;
    setMonthlyTargets(prevTargets => prevTargets.filter(target => target.id !== targetIdToDelete));
  };

  // Admin Week Management
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [editingWeekData, setEditingWeekData] = useState<WeekFormData | null>(null);

  const openWeekModal = (weekToEdit?: Week) => {
    if (weekToEdit) {
        setEditingWeekData({
            originalId: weekToEdit.id,
            startDate: weekToEdit.startDateString, // Expects YYYY-MM-DD
            endDate: weekToEdit.endDateString,     // Expects YYYY-MM-DD
        });
    } else { // For adding a new week (potentially next sequential)
        const lastWeek = weeks[0]; // Assumes weeks are sorted newest first
        let nextStartDate = new Date();
        if (lastWeek) {
            // Correctly parse YYYY-MM-DD from lastWeek.endDateString
            const [year, month, day] = lastWeek.endDateString.split('-').map(Number);
            nextStartDate = new Date(year, month - 1, day); // month is 0-indexed for Date constructor
            nextStartDate.setDate(nextStartDate.getDate() + 1); // Day after last week's end
        } else {
            // If no weeks, default to today or a sensible start
            nextStartDate = new Date(); // Defaults to today
        }
        const nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + 6); // Default to 7 day week (0-6 is 7 days)

        setEditingWeekData({
            startDate: formatDateToYYYYMMDD(nextStartDate),
            endDate: formatDateToYYYYMMDD(nextEndDate),
        });
    }
    setIsWeekModalOpen(true);
  };

  const handleAddOrUpdateWeek = (formData: WeekFormData) => {
    const startDate = new Date(formData.startDate + "T00:00:00"); // Ensure parsing as local date by appending time
    const endDate = new Date(formData.endDate + "T00:00:00");

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert("Invalid date format provided. Please use YYYY-MM-DD.");
        return;
    }
    if (endDate < startDate) {
        alert("End date cannot be before start date.");
        return;
    }

    const newWeekObject = createWeekObjectFromFormData(startDate, endDate);

    setWeeks(prevWeeks => {
        let updatedWeeks;
        if (formData.originalId) { // Editing existing week
            // Check if the new ID (generated from dates) conflicts with an existing *different* week
            const existingWeekWithNewId = prevWeeks.find(w => w.id === newWeekObject.id && w.id !== formData.originalId);
            if (existingWeekWithNewId) {
                alert(`A week with ID "${newWeekObject.id}" (derived from the new dates) already exists. Please choose different dates or ensure the ID is unique.`);
                return prevWeeks; // Abort update
            }
            updatedWeeks = prevWeeks.map(w => w.id === formData.originalId ? newWeekObject : w);
        } else { // Adding new week
             // Check if the new ID conflicts with any existing week
            const existingWeekWithNewId = prevWeeks.find(w => w.id === newWeekObject.id);
            if (existingWeekWithNewId) {
                alert(`A week with ID "${newWeekObject.id}" (derived from the chosen dates) already exists. Please choose different dates or edit the existing one.`);
                return prevWeeks; // Abort add
            }
            updatedWeeks = [...prevWeeks, newWeekObject];
        }
        // Sort by start date, newest first
        return updatedWeeks.sort((a, b) => new Date(b.startDateString).getTime() - new Date(a.startDateString).getTime());
    });

    // If editing, and the edited week was selected for data entry, update its ID if it changed.
    if (formData.originalId && formData.originalId === selectedWeekForEntryId && formData.originalId !== newWeekObject.id) {
        setSelectedWeekForEntryId(newWeekObject.id);
    } else if (!formData.originalId) { // If adding a new week, select it for data entry
        setSelectedWeekForEntryId(newWeekObject.id);
    }
    
    setIsWeekModalOpen(false);
    setEditingWeekData(null);
  };

  const handleDeleteWeek = (weekIdToDelete: string) => {
    if (!window.confirm(`Are you sure you want to delete week "${weekIdToDelete}" and all its associated weekly data? This action cannot be undone.`)) {
      return;
    }
  
    setWeeks(prevWeeks => {
      const updatedWeeks = prevWeeks.filter(w => w.id !== weekIdToDelete);
      
      // Check if the currently selected week for data entry is the one being deleted.
      // This uses `selectedWeekForEntryId` from the App component's scope, which reflects its value
      // at the time `handleDeleteWeek` was invoked.
      if (selectedWeekForEntryId === weekIdToDelete) {
        setSelectedWeekForEntryId(updatedWeeks.length > 0 ? updatedWeeks[0].id : '');
      }
      
      return updatedWeeks;
    });
  
    setWeeklyData(prevData => prevData.filter(entry => entry.weekId !== weekIdToDelete));
  
    // Note: The useEffect hooks for `selectedMonthId` (which depends on `uniqueMonths`, derived from `weeks`)
    // and `selectedWeekForEntryId` (which depends on `weeks`) will automatically adjust
    // these selections if the deletion makes the current selections invalid or empty.
  };


  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;
  }

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-100">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 text-slate-100 p-4 space-y-4 overflow-y-auto">
          <h1 className="text-2xl font-semibold text-white text-center">KPI Scorecard</h1>
          <nav className="space-y-2">
            <NavLink to="/" className={({isActive}) => `block px-3 py-2 rounded-md hover:bg-slate-700 ${isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300'}`}>Dashboard</NavLink>
            <NavLink to="/data-entry" className={({isActive}) => `block px-3 py-2 rounded-md hover:bg-slate-700 ${isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300'}`}>Data Entry</NavLink>
            <NavLink to="/admin-kpi" className={({isActive}) => `block px-3 py-2 rounded-md hover:bg-slate-700 ${isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300'}`}>Admin KPIs</NavLink>
            <NavLink to="/admin-monthly-targets" className={({isActive}) => `block px-3 py-2 rounded-md hover:bg-slate-700 ${isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300'}`}>Admin Monthly Targets</NavLink>
            <NavLink to="/admin-weeks" className={({isActive}) => `block px-3 py-2 rounded-md hover:bg-slate-700 ${isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300'}`}>Admin Weeks</NavLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-md p-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
                <Select
                    id="month-selector"
                    value={selectedMonthId}
                    onChange={(e) => setSelectedMonthId(e.target.value)}
                    label="Selected Month:"
                    className="w-48"
                    disabled={uniqueMonths.length === 0}
                >
                    {uniqueMonths.length > 0 ? uniqueMonths.map(month => (
                        <option key={month.id} value={month.id}>{month.name}</option>
                    )) : <option value="">No Months Available</option>}
                </Select>
            </div>
            <Button onClick={() => openWeekModal()} variant="secondary" size="sm">
                <PlusIcon className="inline mr-1"/> Add New Week
            </Button>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route path="/" element={
                <DashboardView 
                  processedMonthlyData={processedMonthlyData} 
                  cvjStages={cvjStages}
                  getKpiById={getKpiById}
                  selectedMonthId={selectedMonthId}
                  allWeeks={weeks}
                  allWeeklyData={weeklyData}
                  monthlyTargets={monthlyTargets}
                />
              } />
              <Route path="/data-entry" element={
                <DataEntryView 
                  weeks={weeks} 
                  selectedWeekId={selectedWeekForEntryId} 
                  onSelectedWeekChange={setSelectedWeekForEntryId}
                  cvjStages={cvjStages}
                  weeklyData={weeklyData}
                  onDataChange={handleDataEntryChange}
                  getKpiById={getKpiById}
                />
              } />
              <Route path="/admin-kpi" element={
                <AdminKpiView 
                  cvjStages={cvjStages}
                  onOpenModal={openKpiModal}
                  onDeleteKpi={deleteKpi}
                />
              } />
              <Route path="/admin-monthly-targets" element={
                <AdminMonthlyTargetsView
                  monthlyTargets={monthlyTargets}
                  allKpis={allKpis}
                  uniqueMonths={uniqueMonths}
                  onOpenModal={openMonthlyTargetModal}
                  onDeleteTarget={deleteMonthlyTarget}
                  selectedMonthId={selectedMonthId}
                  setSelectedMonthId={setSelectedMonthId}
                />
              } />
              <Route path="/admin-weeks" element={
                <AdminWeeksView
                  weeks={weeks}
                  onOpenWeekModal={openWeekModal}
                  onDeleteWeek={handleDeleteWeek}
                />
              } />
            </Routes>
          </div>
        </main>
      </div>

      {isKpiModalOpen && editingKpi && (
        <KpiModal
          isOpen={isKpiModalOpen}
          onClose={() => setIsKpiModalOpen(false)}
          onSubmit={handleKpiFormSubmit}
          kpiData={editingKpi}
          allCvjStages={cvjStages}
        />
      )}

      {isMonthlyTargetModalOpen && editingMonthlyTarget && (
        <MonthlyTargetModal
          isOpen={isMonthlyTargetModalOpen}
          onClose={() => setIsMonthlyTargetModalOpen(false)}
          onSubmit={handleMonthlyTargetFormSubmit}
          targetData={editingMonthlyTarget}
          allKpis={allKpis}
          allMonths={uniqueMonths}
        />
      )}

      {isWeekModalOpen && editingWeekData && (
        <WeekModal
            isOpen={isWeekModalOpen}
            onClose={() => setIsWeekModalOpen(false)}
            onSubmit={handleAddOrUpdateWeek}
            weekData={editingWeekData}
        />
      )}
    </HashRouter>
  );
};

// KpiModal Component
interface KpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: KpiFormData) => void;
  kpiData: KpiFormData;
  allCvjStages: CVJStage[];
}
const KpiModal: React.FC<KpiModalProps> = ({ isOpen, onClose, onSubmit, kpiData, allCvjStages }) => {
  const [formData, setFormData] = useState<KpiFormData>(kpiData);
  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategory[]>([]);

  useEffect(() => {
    setFormData(kpiData); 
  }, [kpiData]);

  useEffect(() => {
    const stage = allCvjStages.find(s => s.name === formData.cvjStageName);
    setAvailableSubCategories(stage?.subCategories || []);
    // If the current subCategoryName is not in the new list, reset it
    if (stage && !stage.subCategories.find(sc => sc.name === formData.subCategoryName)) {
        setFormData(prev => ({ ...prev, subCategoryName: stage.subCategories[0]?.name || '' }));
    }
  }, [formData.cvjStageName, allCvjStages, formData.subCategoryName]); // Added formData.subCategoryName to dependencies

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
     if (name === "cvjStageName") { 
        const stage = allCvjStages.find(s => s.name === value);
        // Automatically select the first subcategory of the new stage
        setFormData(prev => ({ ...prev, subCategoryName: stage?.subCategories[0]?.name || '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.cvjStageName || !formData.subCategoryName) {
        alert("KPI Name, CVJ Stage, and Sub-Category are required.");
        return;
    }
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? "Edit KPI" : "Add New KPI"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="kpi-form">Save KPI</Button>
        </>
      }>
      <form id="kpi-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="KPI Name" name="name" value={formData.name} onChange={handleChange} required />
        <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} rows={3} />
        <Select label="Unit Type" name="unitType" value={formData.unitType} onChange={handleChange}>
          {Object.values(UnitType).map(type => <option key={type} value={type}>{type}</option>)}
        </Select>
        <Input label="Default Monthly Target Value" name="defaultMonthlyTargetValue" type="number" value={formData.defaultMonthlyTargetValue} onChange={handleChange} placeholder="e.g., 1000"/>
        <Select label="CVJ Stage" name="cvjStageName" value={formData.cvjStageName} onChange={handleChange} required>
          {allCvjStages.map(stage => <option key={stage.id} value={stage.name}>{stage.name}</option>)}
        </Select>
        <Select label="Sub-Category" name="subCategoryName" value={formData.subCategoryName} onChange={handleChange} required disabled={availableSubCategories.length === 0}>
            {availableSubCategories.length > 0 ? 
                availableSubCategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>) :
                <option value="">Select a CVJ Stage first</option>
            }
        </Select>
      </form>
    </Modal>
  );
};

// MonthlyTargetModal Component
interface MonthlyTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MonthlyTargetFormData) => void;
  targetData: MonthlyTargetFormData;
  allKpis: KPI[];
  allMonths: Month[];
}
const MonthlyTargetModal: React.FC<MonthlyTargetModalProps> = ({ isOpen, onClose, onSubmit, targetData, allKpis, allMonths }) => {
  const [formData, setFormData] = useState<MonthlyTargetFormData>(targetData);

  useEffect(() => {
    setFormData(targetData);
  }, [targetData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.kpiId || !formData.monthId || formData.targetValue === "") {
        alert("KPI, Month, and Target Value are required.");
        return;
    }
    if(isNaN(parseFloat(formData.targetValue))) {
        alert("Target Value must be a number.");
        return;
    }
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={formData.id ? "Edit Monthly Target" : "Set Monthly Target"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="monthly-target-form">Save Target</Button>
        </>
      }>
      <form id="monthly-target-form" onSubmit={handleSubmit} className="space-y-4">
        <Select label="KPI" name="kpiId" value={formData.kpiId} onChange={handleChange} required disabled={allKpis.length === 0}>
          {allKpis.length > 0 ? allKpis.map(kpi => <option key={kpi.id} value={kpi.id}>{kpi.name}</option>) : <option value="">No KPIs available</option>}
        </Select>
        <Select label="Month" name="monthId" value={formData.monthId} onChange={handleChange} required disabled={allMonths.length === 0}>
          {allMonths.length > 0 ? allMonths.map(month => <option key={month.id} value={month.id}>{month.name}</option>) : <option value="">No Months available</option>}
        </Select>
        <Input label="Target Value" name="targetValue" type="number" value={formData.targetValue} onChange={handleChange} required placeholder="e.g., 5000"/>
      </form>
    </Modal>
  );
};

// WeekModal Component
interface WeekModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: WeekFormData) => void;
    weekData: WeekFormData;
}
const WeekModal: React.FC<WeekModalProps> = ({ isOpen, onClose, onSubmit, weekData }) => {
    const [formData, setFormData] = useState<WeekFormData>(weekData);

    useEffect(() => {
        setFormData(weekData);
    }, [weekData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.startDate || !formData.endDate) {
            alert("Start Date and End Date are required.");
            return;
        }
        const startDate = new Date(formData.startDate + "T00:00:00"); // Ensure local date parsing
        const endDate = new Date(formData.endDate + "T00:00:00");
        if (endDate < startDate) {
            alert("End Date cannot be before Start Date.");
            return;
        }
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={weekData.originalId ? "Edit Week" : "Add New Week"}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" type="submit" form="week-form">Save Week</Button>
                </>
            }>
            <form id="week-form" onSubmit={handleSubmit} className="space-y-4">
                <Input label="Start Date" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                <Input label="End Date" name="endDate" type="date" value={formData.endDate} onChange={handleChange} required />
            </form>
        </Modal>
    );
};


// DashboardView Component
interface DashboardViewProps {
    processedMonthlyData: ProcessedKpiMonthlyData[];
    cvjStages: CVJStage[];
    getKpiById: (kpiId: string) => KPI | undefined;
    selectedMonthId: string;
    allWeeks: Week[];
    allWeeklyData: WeeklyDataEntry[];
    monthlyTargets: MonthlyKpiTarget[]; 
}
const DashboardView: React.FC<DashboardViewProps> = ({ processedMonthlyData, cvjStages, getKpiById, selectedMonthId, allWeeks, allWeeklyData, monthlyTargets }) => {
    const overallPerformance = useMemo(() => {
        const validEntries = processedMonthlyData.filter(d => d.statusPercentage !== null && d.monthlyTargetValue !== null && d.monthlyTargetValue > 0);
        if (validEntries.length === 0) return 0;
        const sum = validEntries.reduce((acc, curr) => acc + curr.statusPercentage!, 0);
        return sum / validEntries.length;
    }, [processedMonthlyData]);

    const [selectedKpiForTrend, setSelectedKpiForTrend] = useState<string>(processedMonthlyData[0]?.kpi?.id || '');

    const trendChartData = useMemo(() => {
        if (!selectedKpiForTrend || !selectedMonthId) return [];
        const kpi = getKpiById(selectedKpiForTrend);
        if (!kpi) return [];

        const [currentYear, currentMonthNum] = selectedMonthId.split('-').map(Number);
        const dataPoints: ChartDataPoint[] = [];

        // Generate for last 6 months including current selected month
        for (let i = 5; i >= 0; i--) { 
            const date = new Date(currentYear, currentMonthNum - 1 - i, 1); // Iterate backwards to get previous months
            const monthId = getMonthId(date.getFullYear(), date.getMonth() + 1);
            const weeksInMonth = allWeeks.filter(w => w.year === date.getFullYear() && w.month === date.getMonth() + 1);
            
            const kpiEntriesForMonth = allWeeklyData.filter(wd => wd.kpiId === selectedKpiForTrend && weeksInMonth.some(w => w.id === wd.weekId));
            const summedActual = kpiEntriesForMonth.reduce((sum, entry) => sum + (entry.actualValue || 0), 0);
            
            const targetEntry = monthlyTargets.find(mt => mt.kpiId === selectedKpiForTrend && mt.monthId === monthId);
            const target = targetEntry?.targetValue ?? kpi.defaultMonthlyTargetValue;

            dataPoints.push({
                periodId: getMonthName(date.getFullYear(), date.getMonth() + 1).substring(0,3), // e.g., "Jan", "Feb"
                actualValue: summedActual,
                targetValue: target,
            });
        }
        return dataPoints;

    }, [selectedKpiForTrend, selectedMonthId, getKpiById, allWeeks, allWeeklyData, monthlyTargets]);

    useEffect(() => { 
        const firstKpiId = processedMonthlyData[0]?.kpi?.id || '';
        // If selectedKpiForTrend is not in current processed data, or if it's empty and there is data, reset it
        if (processedMonthlyData.length > 0 && (!selectedKpiForTrend || !processedMonthlyData.find(p => p.kpi.id === selectedKpiForTrend))) {
            setSelectedKpiForTrend(firstKpiId);
        } else if (processedMonthlyData.length === 0 && selectedKpiForTrend) { // Clear selection if no data
            setSelectedKpiForTrend('');
        }
    }, [processedMonthlyData, selectedKpiForTrend]);


    return (
        <div className="space-y-6">
            <Card title="Overall Monthly Performance" className="bg-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-1 flex justify-center">
                         <KpiStatusGauge value={overallPerformance} target={100} title="Average Achievement"/>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-slate-600 mb-2">
                            This gauge shows the average achievement percentage across all active KPIs with set targets for the selected month.
                        </p>
                        <p className="text-sm text-slate-500">
                            Green: &ge;{STATUS_THRESHOLDS.GREEN}%, Yellow: &ge;{STATUS_THRESHOLDS.YELLOW}%, Red: &lt;{STATUS_THRESHOLDS.YELLOW}%
                        </p>
                    </div>
                </div>
            </Card>

             <Card title="KPI Trend Analysis (Last 6 Months)" className="bg-white">
                 <div className="mb-4">
                    <Select label="Select KPI for Trend:" value={selectedKpiForTrend} onChange={(e) => setSelectedKpiForTrend(e.target.value)} disabled={processedMonthlyData.length === 0}>
                        {processedMonthlyData.length > 0 ?
                          processedMonthlyData.map(data => (
                            <option key={data.kpi.id} value={data.kpi.id}>{data.kpi.name}</option>
                          )) :
                          <option value="">No KPIs with data for selected month</option>
                        }
                    </Select>
                 </div>
                {selectedKpiForTrend && getKpiById(selectedKpiForTrend) && trendChartData.length > 0 ? (
                    <KpiTrendChart data={trendChartData} kpiName={getKpiById(selectedKpiForTrend)?.name || ''} />
                ) : <p className="text-slate-500 p-4 text-center">Select a KPI to see its trend, or no trend data available for the selected KPI and period.</p>}
            </Card>

            {cvjStages.map(stage => {
                const stageKpis = processedMonthlyData.filter(data => 
                    stage.subCategories.some(sc => sc.kpis.some(kpi => kpi.id === data.kpi.id))
                );
                if (stageKpis.length === 0) return null;

                return (
                    <Card key={stage.id} title={`${stage.name} Stage KPIs`} className={`border-l-4 ${stage.colorCode.replace('bg-','border-')}`}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">KPI</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actual (Month)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Target (Month)</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">% MoM Change</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {stageKpis.map(({ kpi, summedActualValue, monthlyTargetValue, statusPercentage, statusColor, statusTextColor, percentageChangeVsPreviousMonth }) => (
                                        <tr key={kpi.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                                                <Tooltip text={kpi.description || 'No description'}>
                                                    <span className="font-medium">{kpi.name}</span>
                                                </Tooltip>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{summedActualValue?.toLocaleString() ?? 'N/A'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{monthlyTargetValue?.toLocaleString() ?? 'N/A'}</td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${statusTextColor}`}>
                                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor}`}>
                                                    {statusPercentage?.toFixed(1) ?? 'N/A'}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{percentageChangeVsPreviousMonth ?? 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};


// DataEntryView Component
interface DataEntryViewProps {
  weeks: Week[];
  selectedWeekId: string;
  onSelectedWeekChange: (weekId: string) => void;
  cvjStages: CVJStage[];
  weeklyData: WeeklyDataEntry[];
  onDataChange: (kpiId: string, actualValue: string) => void;
  getKpiById: (kpiId: string) => KPI | undefined;
}
const DataEntryView: React.FC<DataEntryViewProps> = ({ weeks, selectedWeekId, onSelectedWeekChange, cvjStages, weeklyData, onDataChange, getKpiById }) => {
  const selectedWeekDetails = weeks.find(w => w.id === selectedWeekId);
  const displayDateRange = (week: Week | undefined) => {
    if (!week) return '';
    const startDate = new Date(week.startDateString + "T00:00:00"); // Ensure local interpretation
    const endDate = new Date(week.endDateString + "T00:00:00");
    return `(${formatDateToMMDD(startDate)} - ${formatDateToMMDD(endDate)})`;
  }
  return (
    <div className="space-y-6">
      <Card title="Weekly Data Entry" className="bg-white">
        <div className="mb-4">
          <Select label="Select Week for Data Entry:" value={selectedWeekId} onChange={(e) => onSelectedWeekChange(e.target.value)} disabled={weeks.length === 0}>
            {weeks.length > 0 ? weeks.map(week => <option key={week.id} value={week.id}>{week.id} {displayDateRange(week)}</option>) : <option value="">No Weeks Available</option>}
          </Select>
        </div>
        {selectedWeekDetails && <p className="text-sm text-slate-500 mb-4">Entering data for: {selectedWeekDetails.id} (Month: {getMonthName(selectedWeekDetails.year, selectedWeekDetails.month)})</p>}
        {!selectedWeekId && weeks.length > 0 && <p className="text-sm text-slate-500 mb-4">Please select a week to begin data entry.</p>}
        {weeks.length === 0 && <p className="text-sm text-red-500 mb-4">No weeks available. Please add a week in 'Admin Weeks' to enable data entry.</p>}
      </Card>

      {selectedWeekId && cvjStages.map(stage => (
        <Card key={stage.id} title={`${stage.name} Stage`} className={`border-l-4 ${stage.colorCode.replace('bg-','border-')}`}>
          {stage.subCategories.map(sc => (
            <div key={sc.id} className="mb-6 last:mb-0">
              <h4 className="text-md font-semibold text-slate-700 mb-3">{sc.name}</h4>
              <div className="space-y-3">
                {sc.kpis.filter(kpi => kpi.isActive).map(kpi => {
                  const currentEntry = weeklyData.find(e => e.weekId === selectedWeekId && e.kpiId === kpi.id);
                  return (
                    <div key={kpi.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                      <label htmlFor={`actual-${kpi.id}`} className="text-sm text-slate-600 md:col-span-2">
                        {kpi.name}
                        <Tooltip text={kpi.description || 'No description available.'}>
                           <InfoIcon className="inline w-3 h-3 ml-1 text-slate-400" />
                        </Tooltip>
                      </label>
                      <Input
                        id={`actual-${kpi.id}`}
                        type="number"
                        step="any"
                        value={currentEntry?.actualValue?.toString() ?? ''}
                        onChange={(e) => onDataChange(kpi.id, e.target.value)}
                        placeholder={`Actual (${kpi.unitType})`}
                        className="md:col-span-1"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
};

// AdminKpiView Component
interface AdminKpiViewProps {
  cvjStages: CVJStage[];
  onOpenModal: (kpi?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => void;
  onDeleteKpi: (kpiId: string) => void;
}
const AdminKpiView: React.FC<AdminKpiViewProps> = ({ cvjStages, onOpenModal, onDeleteKpi }) => {
  return (
    <div className="space-y-6">
      <Card title="Manage KPIs" className="bg-white">
        <div className="flex justify-end mb-4">
          <Button onClick={() => onOpenModal()} variant="primary" size="sm"><PlusIcon className="inline mr-1" /> Add New KPI</Button>
        </div>
        {cvjStages.map(stage => (
          <div key={stage.id} className="mb-8">
            <h3 className={`text-xl font-semibold mb-3 p-2 rounded ${stage.colorCode} text-white`}>{stage.name}</h3>
            {stage.subCategories.map(sc => (
              <div key={sc.id} className="mb-4 pl-4 border-l-2 border-slate-200">
                <h4 className="text-lg font-medium text-slate-700 mb-2">{sc.name}</h4>
                {sc.kpis.length > 0 ? (
                  <ul className="space-y-2">
                    {sc.kpis.map(kpi => (
                      <li key={kpi.id} className="p-3 bg-slate-50 rounded-md shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-800">{kpi.name} <span className="text-xs text-slate-500">({kpi.unitType})</span></p>
                          <p className="text-xs text-slate-600">{kpi.description || "No description."}</p>
                          <p className="text-xs text-slate-500">Default Monthly Target: {kpi.defaultMonthlyTargetValue?.toLocaleString() ?? 'Not set'}</p>
                        </div>
                        <div className="space-x-2 flex-shrink-0">
                          <Tooltip text="Edit KPI"><Button size="sm" variant="secondary" onClick={() => onOpenModal(kpi, sc.name, stage.name)} aria-label={`Edit ${kpi.name}`}><EditIcon /></Button></Tooltip>
                          <Tooltip text="Delete KPI"><Button size="sm" variant="danger" onClick={() => onDeleteKpi(kpi.id)} aria-label={`Delete ${kpi.name}`}><TrashIcon /></Button></Tooltip>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-500 italic">No KPIs in this sub-category.</p>}
              </div>
            ))}
             {stage.subCategories.length === 0 && <p className="text-sm text-slate-500 italic pl-4">No sub-categories in this stage.</p>}
          </div>
        ))}
         {cvjStages.length === 0 && <p className="text-lg text-slate-600 text-center py-8">No CVJ Stages defined. This is not expected, please check configuration.</p>}
      </Card>
    </div>
  );
};

// AdminMonthlyTargetsView Component
interface AdminMonthlyTargetsViewProps {
  monthlyTargets: MonthlyKpiTarget[];
  allKpis: KPI[];
  uniqueMonths: Month[];
  onOpenModal: (target?: MonthlyKpiTarget) => void;
  onDeleteTarget: (targetId: string) => void;
  selectedMonthId: string;
  setSelectedMonthId: (monthId: string) => void;
}
const AdminMonthlyTargetsView: React.FC<AdminMonthlyTargetsViewProps> = ({ monthlyTargets, allKpis, uniqueMonths, onOpenModal, onDeleteTarget, selectedMonthId, setSelectedMonthId }) => {
  const getKpiName = (kpiId: string) => allKpis.find(k => k.id === kpiId)?.name || 'Unknown KPI';
  const getMonthNameFromId = (monthId: string) => uniqueMonths.find(m => m.id === monthId)?.name || 'Unknown Month';

  const filteredTargets = monthlyTargets.filter(t => t.monthId === selectedMonthId);

  return (
    <Card title="Manage Monthly KPI Targets" className="bg-white">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        <Select
            label="Filter by Month:"
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
            className="w-full sm:w-auto"
            disabled={uniqueMonths.length === 0}
        >
            {uniqueMonths.length > 0 ? uniqueMonths.map(month => (
                <option key={month.id} value={month.id}>{month.name}</option>
            )): <option value="">No Months Available</option>}
        </Select>
        <Button onClick={() => onOpenModal()} variant="primary" size="sm" disabled={allKpis.length === 0 || uniqueMonths.length === 0}><PlusIcon className="inline mr-1" /> Set New Monthly Target</Button>
      </div>
      
      {filteredTargets.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">KPI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Target Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTargets.map(target => (
                <tr key={target.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{getKpiName(target.kpiId)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{getMonthNameFromId(target.monthId)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{target.targetValue.toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                    <Tooltip text="Edit Target"><Button size="sm" variant="secondary" onClick={() => onOpenModal(target)} aria-label={`Edit target for ${getKpiName(target.kpiId)}`}><EditIcon /></Button></Tooltip>
                    <Tooltip text="Delete Target"><Button size="sm" variant="danger" onClick={() => onDeleteTarget(target.id)} aria-label={`Delete target for ${getKpiName(target.kpiId)}`}><TrashIcon /></Button></Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500 text-center py-4">No specific monthly targets set for {getMonthNameFromId(selectedMonthId) || 'the selected month'}. KPIs will use their default monthly targets. {(allKpis.length === 0 || uniqueMonths.length === 0) && " (Add KPIs/Weeks first to enable setting targets)"}</p>
      )}
    </Card>
  );
};

// AdminWeeksView Component
interface AdminWeeksViewProps {
    weeks: Week[];
    onOpenWeekModal: (week?: Week) => void;
    onDeleteWeek: (weekId: string) => void;
}
const AdminWeeksView: React.FC<AdminWeeksViewProps> = ({ weeks, onOpenWeekModal, onDeleteWeek }) => {
    const displayDate = (dateString: string) => {
        // Ensure dateString is treated as local by appending T00:00:00 if it's just YYYY-MM-DD
        return new Date(dateString + "T00:00:00").toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <Card title="Manage Weeks" className="bg-white">
            <div className="flex justify-end mb-4">
                <Button onClick={() => onOpenWeekModal()} variant="primary" size="sm">
                    <PlusIcon className="inline mr-1" /> Add Custom Week
                </Button>
            </div>
            {weeks.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Week ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Start Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">End Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Month #</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Year</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {weeks.map(week => (
                                <tr key={week.id}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{week.id}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{displayDate(week.startDateString)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{displayDate(week.endDateString)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{week.month}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{week.year}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                                        <Tooltip text="Edit Week"><Button size="sm" variant="secondary" onClick={() => onOpenWeekModal(week)} aria-label={`Edit ${week.id}`}><EditIcon /></Button></Tooltip>
                                        <Tooltip text="Delete Week"><Button size="sm" variant="danger" onClick={() => onDeleteWeek(week.id)} aria-label={`Delete ${week.id}`}><TrashIcon /></Button></Tooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-slate-500 text-center py-4">No weeks defined. Add a week to get started.</p>
            )}
        </Card>
    );
};

export default App;
