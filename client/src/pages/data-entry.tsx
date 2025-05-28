import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertTriangle, CheckCircle, Calendar } from "lucide-react";
import { apiClient } from "../services/api";
import type { Week, WeeklyDataWithRelations, KpiWithRelations } from "../../server/types/api";

interface WeeklyDataForm {
  [kpiId: string]: {
    actualValue: string;
    notes: string;
  };
}

export default function DataEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [formData, setFormData] = useState<WeeklyDataForm>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Get available weeks
  const { data: weeks, isLoading: weeksLoading } = useQuery<Week[]>({
    queryKey: ['/api/analytics/weeks'],
    queryFn: () => apiClient.get('/api/analytics/weeks'),
  });

  // Get KPIs with relations
  const { data: kpis, isLoading: kpisLoading } = useQuery<KpiWithRelations[]>({
    queryKey: ['/api/kpis', 'include_relations'],
    queryFn: () => apiClient.get('/api/kpis?include_relations=true&active=true'),
  });

  // Get existing weekly data for selected week
  const { data: existingData, isLoading: dataLoading } = useQuery<WeeklyDataWithRelations[]>({
    queryKey: ['/api/weekly-data', selectedWeek],
    queryFn: () => apiClient.get(`/api/weekly-data?week_id=${selectedWeek}&include_relations=true`),
    enabled: !!selectedWeek,
  });

  // Bulk upsert mutation
  const bulkUpsertMutation = useMutation({
    mutationFn: (entries: any[]) => apiClient.post('/api/weekly-data/bulk', { entries }),
    onSuccess: () => {
      toast({
        title: "Data saved successfully",
        description: "Weekly data has been updated.",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/monthly-overview'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save data",
        description: error.message || "An error occurred while saving the data.",
        variant: "destructive",
      });
    },
  });

  // Initialize form data when week or existing data changes
  useEffect(() => {
    if (!selectedWeek || !kpis) return;

    const newFormData: WeeklyDataForm = {};
    
    kpis.forEach(kpi => {
      const existingEntry = existingData?.find(entry => entry.kpi.id === kpi.id);
      newFormData[kpi.id] = {
        actualValue: existingEntry?.actualValue?.toString() || "",
        notes: existingEntry?.notes || "",
      };
    });
    
    setFormData(newFormData);
    setHasUnsavedChanges(false);
  }, [selectedWeek, kpis, existingData]);

  // Handle form field changes
  const handleFieldChange = (kpiId: string, field: 'actualValue' | 'notes', value: string) => {
    setFormData(prev => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedWeek) {
      toast({
        title: "Please select a week",
        description: "You must select a week before submitting data.",
        variant: "destructive",
      });
      return;
    }

    const entries = Object.entries(formData)
      .filter(([_, data]) => data.actualValue.trim() !== "")
      .map(([kpiId, data]) => ({
        weekId: selectedWeek,
        kpiId,
        actualValue: parseFloat(data.actualValue) || null,
        notes: data.notes.trim() || null,
      }));

    if (entries.length === 0) {
      toast({
        title: "No data to save",
        description: "Please enter at least one KPI value.",
        variant: "destructive",
      });
      return;
    }

    bulkUpsertMutation.mutate(entries);
  };

  // Group KPIs by CVJ stage
  const groupedKpis = kpis?.reduce((acc, kpi) => {
    const stageName = kpi.cvjStage.name;
    if (!acc[stageName]) {
      acc[stageName] = [];
    }
    acc[stageName].push(kpi);
    return acc;
  }, {} as Record<string, KpiWithRelations[]>) || {};

  // Format unit type for display
  const formatUnitType = (unitType: string): string => {
    switch (unitType) {
      case 'NUMBER': return 'Number';
      case 'PERCENTAGE': return '%';
      case 'CURRENCY': return '$';
      case 'DURATION_SECONDS': return 'Seconds';
      default: return unitType;
    }
  };

  // Get week display name
  const getWeekDisplayName = (week: Week): string => {
    return `${week.id} (${new Date(week.startDateString).toLocaleDateString()} - ${new Date(week.endDateString).toLocaleDateString()})`;
  };

  if (weeksLoading || kpisLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Weekly Data Entry</h1>
          <p className="text-slate-600 mt-1">Enter weekly KPI performance data</p>
        </div>
        
        {hasUnsavedChanges && (
          <Alert className="w-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>You have unsaved changes</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Select Week</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Choose a week to enter data..." />
            </SelectTrigger>
            <SelectContent>
              {weeks?.map((week) => (
                <SelectItem key={week.id} value={week.id}>
                  {getWeekDisplayName(week)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Data Entry Form */}
      {selectedWeek && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.entries(groupedKpis).map(([stageName, stageKpis]) => (
            <Card key={stageName}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${stageKpis[0]?.cvjStage.colorCode || 'bg-slate-400'}`}
                  />
                  <span>{stageName}</span>
                  <Badge variant="outline">{stageKpis.length} KPIs</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {stageKpis.map((kpi) => (
                    <div key={kpi.id} className="space-y-3 p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium text-slate-900 mb-1">{kpi.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{kpi.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span>Sub-category: {kpi.subCategory.name}</span>
                          <span>Unit: {formatUnitType(kpi.unitType)}</span>
                          {kpi.defaultMonthlyTargetValue && (
                            <span>Monthly Target: {kpi.defaultMonthlyTargetValue.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Actual Value
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={`Enter ${formatUnitType(kpi.unitType).toLowerCase()} value...`}
                            value={formData[kpi.id]?.actualValue || ""}
                            onChange={(e) => handleFieldChange(kpi.id, 'actualValue', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Notes (Optional)
                          </label>
                          <Textarea
                            placeholder="Add any notes about this week's performance..."
                            rows={2}
                            value={formData[kpi.id]?.notes || ""}
                            onChange={(e) => handleFieldChange(kpi.id, 'notes', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="submit"
              disabled={!hasUnsavedChanges || bulkUpsertMutation.isPending}
              className="flex items-center space-x-2"
            >
              {bulkUpsertMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Weekly Data</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {!selectedWeek && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Week Selected</h3>
            <p className="text-slate-600">
              Please select a week from the dropdown above to start entering KPI data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State for Data */}
      {selectedWeek && dataLoading && (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="space-y-3 p-4 border rounded-lg">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
