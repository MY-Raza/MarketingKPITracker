import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Settings, Target, Calendar, Shield } from "lucide-react";
import { apiClient } from "../services/api";
import type { CvjStageWithHierarchy, KpiWithRelations, MonthlyKpiTarget, Week } from "../../server/types/api";

interface KpiFormData {
  name: string;
  description: string;
  unitType: string;
  defaultMonthlyTargetValue: string;
  subCategoryId: string;
}

interface MonthlyTargetFormData {
  kpiId: string;
  monthId: string;
  targetValue: string;
}

interface WeekFormData {
  id: string;
  year: string;
  weekNumber: string;
  month: string;
  startDateString: string;
  endDateString: string;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isKpiDialogOpen, setIsKpiDialogOpen] = useState(false);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [isWeekDialogOpen, setIsWeekDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiWithRelations | null>(null);
  const [editingTarget, setEditingTarget] = useState<MonthlyKpiTarget | null>(null);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);

  // Get CVJ stages with hierarchy
  const { data: cvjStages } = useQuery<CvjStageWithHierarchy[]>({
    queryKey: ['/api/cvj-stages', 'hierarchy'],
    queryFn: () => apiClient.get('/api/cvj-stages?include_hierarchy=true'),
  });

  // Get KPIs with relations
  const { data: kpis } = useQuery<KpiWithRelations[]>({
    queryKey: ['/api/kpis', 'relations'],
    queryFn: () => apiClient.get('/api/kpis?include_relations=true'),
  });

  // Get monthly targets
  const { data: monthlyTargets } = useQuery<MonthlyKpiTarget[]>({
    queryKey: ['/api/monthly-targets'],
    queryFn: () => apiClient.get('/api/monthly-targets'),
  });

  // Get weeks
  const { data: weeks } = useQuery<Week[]>({
    queryKey: ['/api/analytics/weeks'],
    queryFn: () => apiClient.get('/api/analytics/weeks'),
  });

  // KPI mutations
  const createKpiMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/kpis', data),
    onSuccess: () => {
      toast({ title: "KPI created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      setIsKpiDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create KPI", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/api/kpis/${id}`, data),
    onSuccess: () => {
      toast({ title: "KPI updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
      setIsKpiDialogOpen(false);
      setEditingKpi(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update KPI", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteKpiMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/kpis/${id}`),
    onSuccess: () => {
      toast({ title: "KPI deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete KPI", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Monthly target mutations
  const createTargetMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/monthly-targets', data),
    onSuccess: () => {
      toast({ title: "Monthly target created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] });
      setIsTargetDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create target", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/api/monthly-targets/${id}`, data),
    onSuccess: () => {
      toast({ title: "Monthly target updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] });
      setIsTargetDialogOpen(false);
      setEditingTarget(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update target", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/monthly-targets/${id}`),
    onSuccess: () => {
      toast({ title: "Monthly target deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete target", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Week mutations
  const createWeekMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/analytics/weeks', data),
    onSuccess: () => {
      toast({ title: "Week created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/weeks'] });
      setIsWeekDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create week", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateWeekMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.put(`/api/analytics/weeks/${id}`, data),
    onSuccess: () => {
      toast({ title: "Week updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/weeks'] });
      setIsWeekDialogOpen(false);
      setEditingWeek(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update week", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteWeekMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/analytics/weeks/${id}`),
    onSuccess: () => {
      toast({ title: "Week deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/weeks'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete week", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle KPI form submission
  const handleKpiSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      unitType: formData.get('unitType') as string,
      defaultMonthlyTargetValue: parseFloat(formData.get('defaultMonthlyTargetValue') as string) || null,
      subCategoryId: formData.get('subCategoryId') as string,
    };

    if (editingKpi) {
      updateKpiMutation.mutate({ id: editingKpi.id, data });
    } else {
      createKpiMutation.mutate(data);
    }
  };

  // Handle monthly target form submission
  const handleTargetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      kpiId: formData.get('kpiId') as string,
      monthId: formData.get('monthId') as string,
      targetValue: parseFloat(formData.get('targetValue') as string),
    };

    if (editingTarget) {
      updateTargetMutation.mutate({ id: editingTarget.id, data });
    } else {
      createTargetMutation.mutate(data);
    }
  };

  // Handle week form submission
  const handleWeekSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      id: formData.get('id') as string,
      year: parseInt(formData.get('year') as string),
      weekNumber: parseInt(formData.get('weekNumber') as string),
      month: parseInt(formData.get('month') as string),
      startDateString: formData.get('startDateString') as string,
      endDateString: formData.get('endDateString') as string,
    };

    if (editingWeek) {
      updateWeekMutation.mutate({ id: editingWeek.id, data });
    } else {
      createWeekMutation.mutate(data);
    }
  };

  // Get all subcategories for dropdown
  const allSubCategories = cvjStages?.flatMap(stage => 
    stage.subCategories.map(sub => ({
      ...sub,
      stageName: stage.name
    }))
  ) || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
          <p className="text-slate-600 mt-1">Manage KPIs, targets, and system configuration</p>
        </div>
        
        <Badge variant="outline" className="flex items-center space-x-1">
          <Shield className="h-3 w-3" />
          <span>Admin Access</span>
        </Badge>
      </div>

      <Tabs defaultValue="kpis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kpis" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>KPI Management</span>
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Monthly Targets</span>
          </TabsTrigger>
          <TabsTrigger value="weeks" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Week Management</span>
          </TabsTrigger>
        </TabsList>

        {/* KPI Management Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>KPI Management</CardTitle>
                <Dialog open={isKpiDialogOpen} onOpenChange={setIsKpiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add KPI</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingKpi ? 'Edit KPI' : 'Create New KPI'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleKpiSubmit} className="space-y-4">
                      <Input
                        name="name"
                        placeholder="KPI Name"
                        defaultValue={editingKpi?.name || ""}
                        required
                      />
                      <Textarea
                        name="description"
                        placeholder="KPI Description"
                        defaultValue={editingKpi?.description || ""}
                        rows={3}
                      />
                      <Select name="unitType" defaultValue={editingKpi?.unitType || ""} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NUMBER">Number</SelectItem>
                          <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                          <SelectItem value="CURRENCY">Currency</SelectItem>
                          <SelectItem value="DURATION_SECONDS">Duration (Seconds)</SelectItem>
                          <SelectItem value="TEXT">Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        name="defaultMonthlyTargetValue"
                        type="number"
                        step="0.01"
                        placeholder="Default Monthly Target Value"
                        defaultValue={editingKpi?.defaultMonthlyTargetValue?.toString() || ""}
                      />
                      <Select name="subCategoryId" defaultValue={editingKpi?.subCategory.id || ""} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSubCategories.map((subCategory) => (
                            <SelectItem key={subCategory.id} value={subCategory.id}>
                              {subCategory.stageName} - {subCategory.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsKpiDialogOpen(false);
                            setEditingKpi(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingKpi ? 'Update' : 'Create'} KPI
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpis?.map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{kpi.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{kpi.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 mt-2">
                        <span>Stage: {kpi.cvjStage.name}</span>
                        <span>Category: {kpi.subCategory.name}</span>
                        <span>Unit: {kpi.unitType}</span>
                        {kpi.defaultMonthlyTargetValue && (
                          <span>Target: {kpi.defaultMonthlyTargetValue}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={kpi.isActive ? "default" : "secondary"}>
                        {kpi.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingKpi(kpi);
                          setIsKpiDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this KPI?')) {
                            deleteKpiMutation.mutate(kpi.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Targets Tab */}
        <TabsContent value="targets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Monthly Targets</CardTitle>
                <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Target</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTarget ? 'Edit Target' : 'Create Monthly Target'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTargetSubmit} className="space-y-4">
                      <Select name="kpiId" defaultValue={editingTarget?.kpiId || ""} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select KPI" />
                        </SelectTrigger>
                        <SelectContent>
                          {kpis?.map((kpi) => (
                            <SelectItem key={kpi.id} value={kpi.id}>
                              {kpi.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        name="monthId"
                        type="month"
                        placeholder="Month (YYYY-MM)"
                        defaultValue={editingTarget?.monthId || ""}
                        required
                      />
                      <Input
                        name="targetValue"
                        type="number"
                        step="0.01"
                        placeholder="Target Value"
                        defaultValue={editingTarget?.targetValue?.toString() || ""}
                        required
                      />
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsTargetDialogOpen(false);
                            setEditingTarget(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingTarget ? 'Update' : 'Create'} Target
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyTargets?.map((target) => {
                  const kpi = kpis?.find(k => k.id === target.kpiId);
                  return (
                    <div key={target.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">{kpi?.name || 'Unknown KPI'}</h3>
                        <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                          <span>Month: {target.monthId}</span>
                          <span>Target: {target.targetValue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTarget(target);
                            setIsTargetDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this target?')) {
                              deleteTargetMutation.mutate(target.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Week Management Tab */}
        <TabsContent value="weeks" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Week Management</CardTitle>
                <Dialog open={isWeekDialogOpen} onOpenChange={setIsWeekDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Week</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingWeek ? 'Edit Week' : 'Create New Week'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleWeekSubmit} className="space-y-4">
                      <Input
                        name="id"
                        placeholder="Week ID (e.g., Week 20 [05/01-05/09])"
                        defaultValue={editingWeek?.id || ""}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          name="year"
                          type="number"
                          placeholder="Year"
                          defaultValue={editingWeek?.year?.toString() || ""}
                          required
                        />
                        <Input
                          name="weekNumber"
                          type="number"
                          min="1"
                          max="53"
                          placeholder="Week Number"
                          defaultValue={editingWeek?.weekNumber?.toString() || ""}
                          required
                        />
                      </div>
                      <Input
                        name="month"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="Month"
                        defaultValue={editingWeek?.month?.toString() || ""}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          name="startDateString"
                          type="date"
                          placeholder="Start Date"
                          defaultValue={editingWeek?.startDateString || ""}
                          required
                        />
                        <Input
                          name="endDateString"
                          type="date"
                          placeholder="End Date"
                          defaultValue={editingWeek?.endDateString || ""}
                          required
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setIsWeekDialogOpen(false);
                            setEditingWeek(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingWeek ? 'Update' : 'Create'} Week
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeks?.map((week) => (
                  <div key={week.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{week.id}</h3>
                      <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                        <span>Year: {week.year}</span>
                        <span>Week: {week.weekNumber}</span>
                        <span>Month: {week.month}</span>
                        <span>
                          {new Date(week.startDateString).toLocaleDateString()} - {new Date(week.endDateString).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingWeek(week);
                          setIsWeekDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this week?')) {
                            deleteWeekMutation.mutate(week.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
