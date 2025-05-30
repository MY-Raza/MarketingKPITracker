import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Calendar, Database, Loader2 } from "lucide-react";
import { 
  CVJStageName,
  type Week, 
  type WeeklyDataEntry, 
  type CVJStage, 
  type KPI 
} from '../types/kpi';
import { apiClient } from '../services/api';

const getMonthName = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function DataEntry() {
  const queryClient = useQueryClient();
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Fetch CVJ stages with hierarchy
  const { data: cvjStages = [], isLoading: isLoadingStages } = useQuery({
    queryKey: ['/api/cvj-stages-hierarchy'],
    queryFn: () => apiClient.getCvjStages(true, false),
  });

  // Fetch weeks
  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['/api/weeks'],
    queryFn: () => apiClient.getWeeks(),
  });

  // Fetch weekly data entries
  const { data: weeklyData = [], isLoading: isLoadingWeeklyData } = useQuery({
    queryKey: ['/api/weekly-data'],
    queryFn: () => apiClient.getWeeklyData({}),
  });

  // Set default selected week when weeks are loaded
  React.useEffect(() => {
    if (selectedWeekId === '' && weeks.length > 0) {
      setSelectedWeekId(weeks[0].id);
    }
  }, [weeks, selectedWeekId]);

  // Load existing data when week changes
  React.useEffect(() => {
    if (selectedWeekId && weeklyData.length > 0) {
      const newFormData: { [key: string]: string } = {};
      weeklyData.forEach((entry: any) => {
        if (entry.weekId === selectedWeekId) {
          newFormData[entry.kpiId] = entry.actualValue?.toString() || '';
        }
      });
      setFormData(newFormData);
    }
  }, [selectedWeekId, weeklyData]);

  const selectedWeek = weeks.find(week => week.id === selectedWeekId);

  // Mutation for bulk saving weekly data
  const saveWeeklyDataMutation = useMutation({
    mutationFn: async (entries: { weekId: string; kpiId: string; actualValue: number | null }[]) => {
      const promises = entries.map(async (data) => {
        const existingEntry = weeklyData.find(
          (entry: any) => entry.weekId === data.weekId && entry.kpiId === data.kpiId
        );
        
        if (existingEntry) {
          return apiClient.updateWeeklyDataEntry(existingEntry.id, {
            weekId: data.weekId,
            kpiId: data.kpiId,
            actualValue: data.actualValue
          });
        } else {
          return apiClient.createWeeklyDataEntry({
            weekId: data.weekId,
            kpiId: data.kpiId,
            actualValue: data.actualValue
          });
        }
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-data'] });
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    },
    onError: (error: any) => {
      console.error('Failed to save weekly data:', error);
      console.error('Error details:', {
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status,
        message: error?.message
      });
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save data';
      alert(`Error: ${errorMessage}`);
    }
  });

  const handleInputChange = useCallback((kpiId: string, value: string) => {
    setFormData(prev => ({ ...prev, [kpiId]: value }));
  }, []);

  const handleSaveData = useCallback(() => {
    if (!selectedWeekId) {
      console.log('No week selected');
      return;
    }

    console.log('Form data to save:', formData);
    console.log('Selected week ID:', selectedWeekId);

    const entries = Object.entries(formData)
      .map(([kpiId, value]) => ({
        weekId: selectedWeekId,
        kpiId,
        actualValue: value === '' ? null : parseFloat(value)
      }))
      .filter(entry => !isNaN(entry.actualValue as number) || entry.actualValue === null);

    console.log('Processed entries:', entries);

    if (entries.length > 0) {
      saveWeeklyDataMutation.mutate(entries);
    } else {
      console.log('No valid entries to save');
    }
  }, [selectedWeekId, formData, saveWeeklyDataMutation]);

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

  const isLoading = isLoadingStages || isLoadingWeeks || isLoadingWeeklyData;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg text-slate-600">Loading data entry form...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Weekly Data Entry</h1>
            <p className="text-slate-600 mt-1">Enter actual performance data for KPIs across all customer journey stages</p>
          </div>
          <div className="flex items-center space-x-3">
            <Database className="h-5 w-5 text-slate-500" />
            <div className="w-72">
              <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select week for data entry" />
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
            <Button 
              onClick={handleSaveData}
              disabled={saveWeeklyDataMutation.isPending || !selectedWeekId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveWeeklyDataMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Data'
              )}
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Data saved successfully! All your entries have been recorded.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedWeek && (
          <>
            {/* Week Info Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-8 w-8 text-indigo-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      Entering data for: {selectedWeek.id}
                    </h2>
                    <p className="text-slate-600">
                      {selectedWeek.startDateString} to {selectedWeek.endDateString} • Month: {getMonthName(selectedWeek.year, selectedWeek.month)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Entry Forms by Stage */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-slate-900">Customer Value Journey Data Entry</h2>
              
              {cvjStages.map(stage => (
                <Card key={stage.id} className="overflow-hidden border-0 shadow-lg">
                  <CardHeader className={`bg-gradient-to-r ${stageColorMap[stage.name]} text-white`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold">{stage.name} Stage</CardTitle>
                        <p className="text-blue-100 mt-1">Enter weekly performance data for {stage.name} metrics</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm opacity-90">KPIs</div>
                        <div className="text-2xl font-bold">
                          {stage.subCategories.reduce((count, sub) => count + sub.kpis.length, 0)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {stage.subCategories.map(subCategory => (
                      <div key={subCategory.id} className="mb-8">
                        <div className="mb-4">
                          <h4 className="text-lg font-semibold text-slate-900 mb-2">{subCategory.name}</h4>
                          <p className="text-sm text-slate-600">Enter actual values for {subCategory.name} KPIs</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {subCategory.kpis.map(kpi => {
                            const existingEntry = weeklyData.find(
                              entry => entry.weekId === selectedWeekId && entry.kpiId === kpi.id
                            );

                            return (
                              <div key={kpi.id} className="group">
                                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200">
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-2">
                                        <Label className="text-sm font-semibold text-slate-900">
                                          {kpi.name}
                                        </Label>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p className="text-sm">{kpi.description}</p>
                                            <p className="text-xs text-slate-500 mt-1">Unit: {kpi.unitType.replace('_', ' ')}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                      
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={formData[kpi.id] || ''}
                                        onChange={(e) => handleInputChange(kpi.id, e.target.value)}
                                        placeholder={`Actual (${kpi.unitType.replace('_', ' ')})`}
                                        className="w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        style={{ MozAppearance: 'textfield' }}
                                      />
                                      
                                      {kpi.description && (
                                        <p className="text-xs text-slate-500 mt-2">{kpi.description}</p>
                                      )}
                                      
                                      {kpi.defaultMonthlyTargetValue && (
                                        <p className="text-xs text-slate-600 mt-1">
                                          Monthly Target: {kpi.defaultMonthlyTargetValue.toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bottom Save Button */}
            <div className="flex justify-center">
              <Button 
                onClick={handleSaveData}
                disabled={saveWeeklyDataMutation.isPending || !selectedWeekId}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
                size="lg"
              >
                {saveWeeklyDataMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving Data...
                  </>
                ) : (
                  'Save All Data'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}