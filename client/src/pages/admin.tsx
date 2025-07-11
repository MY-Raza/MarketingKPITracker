import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Settings, Target, Calendar } from "lucide-react";
import { useAuth } from '../hooks/use-auth';
import { apiClient } from '../services/api';
import { SubcategoryForm } from '@/components/SubcategoryForm';
import { 
  CVJStageName, 
  UnitType, 
  type CVJStage, 
  type KPI, 
  type Week, 
  type MonthlyKpiTarget, 
  type KpiFormData,
  type MonthlyTargetFormData,
  type WeekFormData
} from '../types/kpi';
import { createWeekObjectFromFormData } from '../constants/kpi';
import { useRealtimeSync } from '../hooks/use-realtime-sync';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

// Helper functions
const generateId = (): string => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getMonthName = (year: number, month: number): string => {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function Admin() {
  const queryClient = useQueryClient();
  const { syncWeeksData, syncKpisData, syncMonthlyTargets, syncSubcategoriesData } = useRealtimeSync();
  const [adminTab, setAdminTab] = useState<'kpis' | 'targets' | 'weeks' | 'subcategories'>('kpis');
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');

  // Fetch CVJ stages with full hierarchy (working endpoint)
  const { data: cvjStages = [], isLoading: isLoadingStages } = useQuery({
    queryKey: ['/api/cvj-stages-hierarchy'],
    queryFn: () => apiClient.get('/api/cvj-stages-hierarchy')
  }) as { data: CVJStage[], isLoading: boolean };

  const { data: weeks = [], isLoading: isLoadingWeeks } = useQuery({
    queryKey: ['/api/weeks'],
    queryFn: () => apiClient.getWeeks()
  }) as { data: Week[], isLoading: boolean };

  const { data: monthlyTargets = [], isLoading: isLoadingTargets } = useQuery({
    queryKey: ['/api/monthly-targets'],
    queryFn: () => apiClient.getMonthlyTargets()
  }) as { data: MonthlyKpiTarget[], isLoading: boolean };

  console.log('Admin - Data loaded:', { 
    cvjStages: cvjStages.length,
    weeks: weeks.length, 
    monthlyTargets: monthlyTargets.length 
  });
  
  // Modal states
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [isMonthlyTargetModalOpen, setIsMonthlyTargetModalOpen] = useState(false);
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | undefined>();
  const [editingMonthlyTarget, setEditingMonthlyTarget] = useState<MonthlyKpiTarget | undefined>();
  const [editingWeek, setEditingWeek] = useState<Week | undefined>();
  const [editingSubcategory, setEditingSubcategory] = useState<any>();
  const [defaultSubCategoryName, setDefaultSubCategoryName] = useState<string>('');
  const [defaultCvjStageName, setDefaultCvjStageName] = useState<CVJStageName>(CVJStageName.AWARE);
  const [selectedStageForSubcategory, setSelectedStageForSubcategory] = useState<string>('');

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details: string[];
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    details: [],
    onConfirm: () => {},
    isLoading: false
  });

  // Loading states for update operations
  const [updateLoadingStates, setUpdateLoadingStates] = useState<{
    kpi: boolean;
    monthlyTarget: boolean;
    week: boolean;
    subcategory: boolean;
  }>({
    kpi: false,
    monthlyTarget: false,
    week: false,
    subcategory: false
  });

  // Get all KPIs from the hierarchy
  const allKpis = cvjStages.flatMap((stage: any) => 
    stage.subCategories?.flatMap((sub: any) => sub.kpis || []) || []
  );

  // Helper functions for generating confirmation dialog details
  const getKpiDeletionDetails = (kpiId: string): string[] => {
    const details: string[] = [];
    
    // Check for monthly targets
    const relatedTargets = monthlyTargets.filter(target => target.kpiId === kpiId);
    if (relatedTargets.length > 0) {
      details.push(`Delete ${relatedTargets.length} monthly target${relatedTargets.length > 1 ? 's' : ''}`);
    }
    
    // Note: Weekly data entries are handled by cascade delete in the database
    details.push('Remove all associated weekly data entries');
    
    return details;
  };

  const getWeekDeletionDetails = (weekId: string): string[] => {
    const details: string[] = [];
    
    // Check for weekly data entries (this would need to be fetched from API in real implementation)
    details.push('Delete all data entries for this week period');
    details.push('Update month availability in monthly targets section');
    
    return details;
  };

  const getSubcategoryDeletionDetails = (subcategoryId: string): string[] => {
    const details: string[] = [];
    
    // Find subcategory and its KPIs
    const subcategory = cvjStages
      .flatMap(stage => stage.subCategories || [])
      .find(sub => sub.id === subcategoryId);
    
    if (subcategory) {
      const kpiCount = subcategory.kpis?.length || 0;
      if (kpiCount > 0) {
        details.push(`Delete ${kpiCount} KPI${kpiCount > 1 ? 's' : ''} in this subcategory`);
        details.push('Remove all associated monthly targets and weekly data');
      }
    }
    
    return details;
  };

  const getMonthlyTargetDeletionDetails = (target: MonthlyKpiTarget): string[] => {
    const kpi = allKpis.find(k => k.id === target.kpiId);
    const details: string[] = [];
    
    if (kpi) {
      details.push(`Remove custom target for "${kpi.name}"`);
      details.push('Data entry will fall back to default target value');
    }
    
    return details;
  };

  // Get unique months dynamically from weeks
  const uniqueMonths = React.useMemo(() => {
    if (!weeks || weeks.length === 0) return [];
    
    const monthSet = new Set<string>();
    const monthsData: { id: string; name: string; year: number; month: number }[] = [];
    
    weeks.forEach(week => {
      // Use actual start and end dates from week
      const startDate = new Date(week.startDateString);
      const endDate = new Date(week.endDateString);
      
      // Add months that the week touches
      const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      const endMonth = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
      
      [startMonth, endMonth].forEach(monthId => {
        if (!monthSet.has(monthId)) {
          monthSet.add(monthId);
          const [year, month] = monthId.split('-').map(Number);
          monthsData.push({
            id: monthId,
            name: getMonthName(year, month),
            year,
            month
          });
        }
      });
    });
    
    // Sort by year and month (most recent first)
    return monthsData.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [weeks]);

  // Auto-select the most recent month when uniqueMonths changes
  React.useEffect(() => {
    if (uniqueMonths.length > 0 && (!selectedMonthId || !uniqueMonths.find(m => m.id === selectedMonthId))) {
      setSelectedMonthId(uniqueMonths[0].id);
    }
  }, [uniqueMonths, selectedMonthId]);

  const openKpiModal = useCallback((kpiToEdit?: KPI, subCategoryName?: string, cvjStageName?: CVJStageName) => {
    setEditingKpi(kpiToEdit);
    setDefaultSubCategoryName(subCategoryName || '');
    setDefaultCvjStageName(cvjStageName || CVJStageName.AWARE);
    setIsKpiModalOpen(true);
  }, []);

  // KPI mutations using authenticated API client
  const createKpiMutation = useMutation({
    mutationFn: (kpiData: any) => {
      setUpdateLoadingStates(prev => ({ ...prev, kpi: true }));
      return apiClient.createKpi(kpiData);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, kpi: false }));
        setIsKpiModalOpen(false);
        setEditingKpi(undefined);
      }, 300);
    },
    onError: () => {
      setUpdateLoadingStates(prev => ({ ...prev, kpi: false }));
    }
  });

  const updateKpiMutation = useMutation({
    mutationFn: ({ id, ...kpiData }: any) => {
      setUpdateLoadingStates(prev => ({ ...prev, kpi: true }));
      return apiClient.updateKpi(id, kpiData);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, kpi: false }));
        setIsKpiModalOpen(false);
        setEditingKpi(undefined);
      }, 300);
    },
    onError: () => {
      setUpdateLoadingStates(prev => ({ ...prev, kpi: false }));
    }
  });

  const deleteKpiMutation = useMutation({
    mutationFn: (kpiId: string) => apiClient.deleteKpi(kpiId),
    onSuccess: async () => {
      // Wait for all related queries to refetch before closing dialog
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] })
      ]);
      
      // Add a small delay to ensure UI updates are complete
      setTimeout(() => {
        setConfirmDialog(prev => ({ ...prev, isLoading: false, isOpen: false }));
      }, 500);
    },
    onError: () => {
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  });

  const handleKpiFormSubmit = useCallback((formData: KpiFormData) => {
    // Find the subcategory ID based on the stage and subcategory names
    const stage = cvjStages.find(s => s.name === formData.cvjStageName);
    const subCategory = stage?.subCategories.find(sc => sc.name === formData.subCategoryName);
    
    if (!subCategory) {
      console.error('Subcategory not found');
      return;
    }

    const kpiData: any = {
      name: formData.name,
      description: formData.description,
      unitType: formData.unitType.toUpperCase(), // Ensure uppercase to match enum
      subCategoryId: subCategory.id,
      isActive: true
    };

    // Only include defaultMonthlyTargetValue if it's a positive number
    const targetValue = parseFloat(formData.defaultMonthlyTargetValue);
    if (targetValue > 0) {
      kpiData.defaultMonthlyTargetValue = targetValue;
    }

    if (formData.id) {
      updateKpiMutation.mutate({ id: formData.id, ...kpiData });
    } else {
      createKpiMutation.mutate(kpiData);
    }
  }, [cvjStages, createKpiMutation, updateKpiMutation]);

  const handleDeleteKpi = useCallback((kpiId: string) => {
    const kpi = allKpis.find(k => k.id === kpiId);
    const kpiName = kpi?.name || 'KPI';
    const details = getKpiDeletionDetails(kpiId);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete KPI',
      message: `Are you sure you want to delete "${kpiName}"? This action cannot be undone.`,
      details,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        deleteKpiMutation.mutate(kpiId);
      },
      isLoading: false
    });
  }, [deleteKpiMutation, allKpis, getKpiDeletionDetails]);

  const openMonthlyTargetModal = useCallback((targetToEdit?: MonthlyKpiTarget) => {
    setEditingMonthlyTarget(targetToEdit);
    setIsMonthlyTargetModalOpen(true);
  }, []);

  // Monthly targets mutations using authenticated API client
  const createMonthlyTargetMutation = useMutation({
    mutationFn: (targetData: any) => {
      setUpdateLoadingStates(prev => ({ ...prev, monthlyTarget: true }));
      return apiClient.createMonthlyTarget(targetData);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] }),
        queryClient.refetchQueries({ queryKey: ['/api/monthly-targets'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, monthlyTarget: false }));
        setIsMonthlyTargetModalOpen(false);
        setEditingMonthlyTarget(undefined);
      }, 300);
    },
    onError: () => {
      setUpdateLoadingStates(prev => ({ ...prev, monthlyTarget: false }));
    }
  });

  const updateMonthlyTargetMutation = useMutation({
    mutationFn: ({ id, ...targetData }: any) => {
      setUpdateLoadingStates(prev => ({ ...prev, monthlyTarget: true }));
      return apiClient.updateMonthlyTarget(id, targetData);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] }),
        queryClient.refetchQueries({ queryKey: ['/api/monthly-targets'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, monthlyTarget: false }));
        setIsMonthlyTargetModalOpen(false);
        setEditingMonthlyTarget(undefined);
      }, 300);
    },
    onError: () => {
      setUpdateLoadingStates(prev => ({ ...prev, monthlyTarget: false }));
    }
  });

  const deleteMonthlyTargetMutation = useMutation({
    mutationFn: (targetId: string) => apiClient.deleteMonthlyTarget(targetId),
    onSuccess: async () => {
      // Wait for all related queries to refetch before closing dialog
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] }),
        queryClient.refetchQueries({ queryKey: ['/api/monthly-targets'] })
      ]);
      
      // Add delay to ensure UI updates are complete
      setTimeout(() => {
        setConfirmDialog(prev => ({ ...prev, isLoading: false, isOpen: false }));
      }, 500);
    },
    onError: () => {
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  });

  const handleMonthlyTargetFormSubmit = useCallback((formData: MonthlyTargetFormData) => {
    const targetData = {
      kpiId: formData.kpiId,
      monthId: formData.monthId,
      targetValue: parseFloat(formData.targetValue),
    };

    if (formData.id) {
      updateMonthlyTargetMutation.mutate({ id: formData.id, ...targetData });
    } else {
      createMonthlyTargetMutation.mutate(targetData);
    }
  }, [createMonthlyTargetMutation, updateMonthlyTargetMutation]);

  const handleDeleteMonthlyTarget = useCallback((targetId: string) => {
    const target = monthlyTargets.find(t => t.id === targetId);
    if (!target) return;
    
    const details = getMonthlyTargetDeletionDetails(target);
    const monthName = uniqueMonths.find(m => m.id === target.monthId)?.name || target.monthId;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Monthly Target',
      message: `Are you sure you want to delete the monthly target for ${monthName}? This action cannot be undone.`,
      details,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        deleteMonthlyTargetMutation.mutate(targetId);
      },
      isLoading: false
    });
  }, [deleteMonthlyTargetMutation, monthlyTargets, getMonthlyTargetDeletionDetails, uniqueMonths]);

  const openWeekModal = useCallback((weekToEdit?: Week) => {
    setEditingWeek(weekToEdit);
    setIsWeekModalOpen(true);
  }, []);

  // Week mutations using authenticated API client
  const createWeekMutation = useMutation({
    mutationFn: (weekData: any) => {
      setUpdateLoadingStates(prev => ({ ...prev, week: true }));
      return apiClient.createWeek(weekData);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/weeks'] }),
        queryClient.refetchQueries({ queryKey: ['/api/weeks'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, week: false }));
        setIsWeekModalOpen(false);
        setEditingWeek(undefined);
      }, 300);
    },
    onError: (error: any) => {
      console.error('Week creation failed:', error);
      setUpdateLoadingStates(prev => ({ ...prev, week: false }));
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create week';
      alert(errorMessage);
    }
  });

  const updateWeekMutation = useMutation({
    mutationFn: ({ id, ...weekData }: any) => {
      console.log('Frontend: Updating week with ID:', id);
      console.log('Frontend: Week data:', weekData);
      setUpdateLoadingStates(prev => ({ ...prev, week: true }));
      return apiClient.updateWeek(id, weekData);
    },
    onSuccess: async () => {
      console.log('Frontend: Week update successful');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/weeks'] }),
        queryClient.refetchQueries({ queryKey: ['/api/weeks'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, week: false }));
        setIsWeekModalOpen(false);
        setEditingWeek(undefined);
      }, 300);
    },
    onError: (error: any) => {
      console.error('Frontend: Week update failed:', error);
      setUpdateLoadingStates(prev => ({ ...prev, week: false }));
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update week';
      alert(errorMessage);
    }
  });

  const deleteWeekMutation = useMutation({
    mutationFn: async (weekId: string) => {
      console.log(`Frontend: Attempting to delete week with ID: "${weekId}"`);
      const result = await apiClient.deleteWeek(weekId);
      console.log('Frontend: Delete request completed', result);
      return result;
    },
    onSuccess: async () => {
      console.log('Frontend: Delete mutation successful, invalidating queries');
      // Wait for all related queries to refetch before closing dialog
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/weeks'] }),
        queryClient.refetchQueries({ queryKey: ['/api/weeks'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/weekly-data'] }),
        queryClient.refetchQueries({ queryKey: ['/api/weekly-data'] })
      ]);
      
      // Add delay to ensure UI updates are complete
      setTimeout(() => {
        setConfirmDialog(prev => ({ ...prev, isLoading: false, isOpen: false }));
      }, 500);
    },
    onError: (error) => {
      console.error('Frontend: Delete mutation failed', error);
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  });

  const handleAddOrUpdateWeek = useCallback((formData: WeekFormData) => {
    // Send simplified data structure that matches the API expectations
    const weekData = {
      startDate: formData.startDate,
      endDate: formData.endDate,
      displayName: formData.displayName || undefined,
      originalId: formData.originalId
    };

    if (formData.originalId) {
      // Update existing week
      updateWeekMutation.mutate(weekData);
    } else {
      // Create new week
      createWeekMutation.mutate(weekData);
    }
  }, [createWeekMutation, updateWeekMutation]);

  const handleDeleteWeek = useCallback((weekId: string) => {
    const week = weeks.find(w => w.id === weekId);
    const weekName = week?.displayName || week?.id || 'Week';
    const details = getWeekDeletionDetails(weekId);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Week',
      message: `Are you sure you want to delete "${weekName}"? This action cannot be undone.`,
      details,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        deleteWeekMutation.mutate(weekId);
      },
      isLoading: false
    });
  }, [deleteWeekMutation, weeks, getWeekDeletionDetails]);

  // Subcategory handlers
  const openSubcategoryModal = useCallback((subcategory?: any, stageId?: string) => {
    setEditingSubcategory(subcategory);
    setSelectedStageForSubcategory(stageId || '');
    setIsSubcategoryModalOpen(true);
  }, []);

  // Subcategory mutations
  const createSubcategoryMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Frontend: Creating subcategory with data:', data);
      setUpdateLoadingStates(prev => ({ ...prev, subcategory: true }));
      return apiClient.createSubcategory(data);
    },
    onSuccess: async () => {
      console.log('Frontend: Subcategory creation successful');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, subcategory: false }));
        setIsSubcategoryModalOpen(false);
        setEditingSubcategory(undefined);
      }, 300);
    },
    onError: (error: any) => {
      console.error('Frontend: Subcategory creation failed:', error);
      setUpdateLoadingStates(prev => ({ ...prev, subcategory: false }));
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create subcategory';
      alert(errorMessage);
    }
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => {
      console.log('Frontend: Updating subcategory with ID:', id);
      console.log('Frontend: Subcategory data:', data);
      setUpdateLoadingStates(prev => ({ ...prev, subcategory: true }));
      return apiClient.updateSubcategory(id, data);
    },
    onSuccess: async () => {
      console.log('Frontend: Subcategory update successful');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] })
      ]);
      
      setTimeout(() => {
        setUpdateLoadingStates(prev => ({ ...prev, subcategory: false }));
        setIsSubcategoryModalOpen(false);
        setEditingSubcategory(undefined);
      }, 300);
    },
    onError: (error: any) => {
      console.error('Frontend: Subcategory update failed:', error);
      setUpdateLoadingStates(prev => ({ ...prev, subcategory: false }));
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update subcategory';
      alert(errorMessage);
    }
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: (id: string) => {
      console.log('Frontend: Deleting subcategory with ID:', id);
      return apiClient.deleteSubcategory(id);
    },
    onSuccess: async () => {
      console.log('Frontend: Subcategory deletion successful');
      // Wait for all related queries to refetch before closing dialog
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] }),
        queryClient.refetchQueries({ queryKey: ['/api/monthly-targets'] })
      ]);
      
      // Add delay to ensure UI updates are complete
      setTimeout(() => {
        setConfirmDialog(prev => ({ ...prev, isLoading: false, isOpen: false }));
      }, 500);
    },
    onError: (error: any) => {
      console.error('Frontend: Subcategory deletion failed:', error);
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  });

  const handleSubcategoryFormSubmit = useCallback((formData: any) => {
    if (editingSubcategory) {
      updateSubcategoryMutation.mutate({ id: editingSubcategory.id, ...formData });
    } else {
      createSubcategoryMutation.mutate(formData);
    }
  }, [editingSubcategory, createSubcategoryMutation, updateSubcategoryMutation]);

  const handleDeleteSubcategory = useCallback((subcategoryId: string) => {
    const subcategory = cvjStages
      .flatMap(stage => stage.subCategories || [])
      .find(sub => sub.id === subcategoryId);
    
    const subcategoryName = subcategory?.name || 'Subcategory';
    const details = getSubcategoryDeletionDetails(subcategoryId);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Subcategory',
      message: `Are you sure you want to delete "${subcategoryName}"? This action cannot be undone.`,
      details,
      onConfirm: () => {
        setConfirmDialog(prev => ({ ...prev, isLoading: true }));
        deleteSubcategoryMutation.mutate(subcategoryId);
      },
      isLoading: false
    });
  }, [deleteSubcategoryMutation, cvjStages, getSubcategoryDeletionDetails]);

  const filteredTargets = monthlyTargets.filter(target => target.monthId === selectedMonthId);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
            <p className="text-slate-600 mt-1">Manage KPIs, monthly targets, and time periods for your marketing analytics</p>
          </div>
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-slate-500" />
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              Admin Access
            </Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          <Button
            variant="ghost"
            onClick={() => setAdminTab('kpis')}
            className={`flex-1 ${
              adminTab === 'kpis' 
                ? 'bg-white shadow-sm text-slate-900 hover:bg-blue-500 hover:text-white' 
                : 'text-slate-600 hover:bg-blue-500 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage KPIs
          </Button>
          <Button
            variant="ghost"
            onClick={() => setAdminTab('targets')}
            className={`flex-1 ${
              adminTab === 'targets' 
                ? 'bg-white shadow-sm text-slate-900 hover:bg-blue-500 hover:text-white' 
                : 'text-slate-600 hover:bg-blue-500 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 mr-2" />
            Monthly Targets
          </Button>
          <Button
            variant="ghost"
            onClick={() => setAdminTab('weeks')}
            className={`flex-1 ${
              adminTab === 'weeks' 
                ? 'bg-white shadow-sm text-slate-900 hover:bg-blue-500 hover:text-white' 
                : 'text-slate-600 hover:bg-blue-500 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Manage Weeks
          </Button>
          <Button
            variant="ghost"
            onClick={() => setAdminTab('subcategories')}
            className={`flex-1 ${
              adminTab === 'subcategories' 
                ? 'bg-white shadow-sm text-slate-900 hover:bg-blue-500 hover:text-white' 
                : 'text-slate-600 hover:bg-blue-500 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Subcategories
          </Button>
        </div>

        {/* KPIs Management */}
        {adminTab === 'kpis' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900">KPI Management by CVJ Stage</h2>
              <p className="text-slate-600">Organize and manage key performance indicators across customer journey stages</p>
            </div>

            {(cvjStages || []).map(stage => (
              <Card key={stage.id} className="overflow-hidden border-0 shadow-lg">
                <CardHeader className={`bg-gradient-to-r ${stageColorMap[stage.name]} text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">{stage.name} Stage</CardTitle>
                      <p className="text-blue-100 mt-1">Manage KPIs for the {stage.name} phase</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openKpiModal(undefined, '', stage.name)}
                      className="bg-white text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add KPI
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {(stage.subCategories || []).map(subCategory => (
                    <div key={subCategory.id} className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">{subCategory.name}</h4>
                          <p className="text-sm text-slate-600">KPI subcategory for {subCategory.name} metrics</p>
                        </div>
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
                        {(subCategory.kpis || []).map(kpi => (
                          <div key={kpi.id} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                              <h5 className="font-semibold text-slate-900 text-sm">{kpi.name}</h5>
                              <div className="flex space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openKpiModal(kpi, subCategory.name, stage.name)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteKpi(kpi.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 line-clamp-2">{kpi.description}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Unit:</span>
                                <Badge variant="outline" className="text-xs">
                                  {kpi.unitType.replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Default Target:</span>
                                <span className="font-medium text-slate-700">
                                  {kpi.defaultMonthlyTargetValue || 'None'}
                                </span>
                              </div>
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

        {/* Monthly Targets Management */}
        {adminTab === 'targets' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-orange-50 to-red-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <Target className="h-8 w-8 text-orange-600" />
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Monthly Targets</h3>
                      <p className="text-slate-600">Set and manage monthly performance targets for KPIs</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
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
                    <Button onClick={() => openMonthlyTargetModal()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Target
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          KPI Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          CVJ Stage
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Target Value
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(filteredTargets || []).map(target => {
                        const kpi = allKpis?.find(k => k.id === target.kpiId);
                        const stage = cvjStages?.find(s => 
                          s.subCategories?.some(sub => sub.kpis?.some(k => k.id === target.kpiId))
                        );
                        return (
                          <tr key={target.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-slate-900">{kpi?.name || 'Unknown KPI'}</div>
                              <div className="text-sm text-slate-500">{kpi?.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {stage && (
                                <Badge className={`bg-gradient-to-r ${stageColorMap[stage.name]} text-white`}>
                                  {stage.name}
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-lg font-semibold text-slate-900">
                              {target.targetValue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
          </div>
        )}

        {/* Weeks Management */}
        {adminTab === 'weeks' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <Calendar className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">Manage Weeks</h3>
                      <p className="text-slate-600">Configure weekly time periods for data entry</p>
                    </div>
                  </div>
                  <Button onClick={() => openWeekModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Week
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Week ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Date Range
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Month/Year
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {(weeks || []).map(week => (
                        <tr key={week.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                            {week.displayName || week.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                            {week.startDateString} to {week.endDateString}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline">
                              {getMonthName(week.year, week.month)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
          </div>
        )}

        {/* Subcategory Management */}
        {adminTab === 'subcategories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900">Subcategory Management</h2>
              <p className="text-slate-600">Manage subcategories within each CVJ stage</p>
            </div>

            {(cvjStages || []).map(stage => (
              <Card key={stage.id} className="overflow-hidden border-0 shadow-lg">
                <CardHeader className={`bg-gradient-to-r ${stageColorMap[stage.name]} text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold">{stage.name} Stage</CardTitle>
                      <p className="text-blue-100 mt-1">Subcategories for {stage.name}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white text-slate-700 hover:bg-slate-50"
                      onClick={() => openSubcategoryModal(undefined, stage.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Subcategory
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    {(stage.subCategories || []).map(subCategory => (
                      <div key={subCategory.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{subCategory.name}</h4>
                          <p className="text-sm text-slate-600">Display Order: {subCategory.displayOrder}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {subCategory.kpis.length} KPI{subCategory.kpis.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openSubcategoryModal(subCategory, stage.id)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteSubcategory(subCategory.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {(stage.subCategories || []).length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        No subcategories yet. Add one to get started.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* KPI Modal */}
      <Dialog open={isKpiModalOpen} onOpenChange={setIsKpiModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'Edit KPI' : 'Add New KPI'}</DialogTitle>
          </DialogHeader>
          <KpiForm
            initialData={editingKpi ? {
              id: editingKpi.id,
              name: editingKpi.name,
              description: editingKpi.description,
              unitType: editingKpi.unitType,
              defaultMonthlyTargetValue: editingKpi.defaultMonthlyTargetValue?.toString() || '',
              subCategoryName: defaultSubCategoryName,
              cvjStageName: defaultCvjStageName
            } : {
              id: undefined,
              name: '',
              description: '',
              unitType: UnitType.NUMBER,
              defaultMonthlyTargetValue: '',
              subCategoryName: defaultSubCategoryName,
              cvjStageName: defaultCvjStageName
            }}
            onSubmit={handleKpiFormSubmit}
            onCancel={() => setIsKpiModalOpen(false)}
            cvjStages={cvjStages}
            isLoading={updateLoadingStates.kpi}
          />
        </DialogContent>
      </Dialog>

      {/* Monthly Target Modal */}
      <Dialog open={isMonthlyTargetModalOpen} onOpenChange={setIsMonthlyTargetModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMonthlyTarget ? 'Edit Monthly Target' : 'Add Monthly Target'}</DialogTitle>
          </DialogHeader>
          <MonthlyTargetForm
            initialData={editingMonthlyTarget ? {
              id: editingMonthlyTarget.id,
              kpiId: editingMonthlyTarget.kpiId,
              monthId: editingMonthlyTarget.monthId,
              targetValue: editingMonthlyTarget.targetValue.toString()
            } : {
              id: undefined,
              kpiId: '',
              monthId: selectedMonthId,
              targetValue: ''
            }}
            onSubmit={handleMonthlyTargetFormSubmit}
            onCancel={() => setIsMonthlyTargetModalOpen(false)}
            allKpis={allKpis}
            allMonths={uniqueMonths}
            isLoading={updateLoadingStates.monthlyTarget}
          />
        </DialogContent>
      </Dialog>

      {/* Week Modal */}
      <Dialog open={isWeekModalOpen} onOpenChange={setIsWeekModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWeek ? 'Edit Week' : 'Add New Week'}</DialogTitle>
          </DialogHeader>
          <WeekForm
            initialData={editingWeek ? {
              originalId: editingWeek.id,
              startDate: editingWeek.startDateString,
              endDate: editingWeek.endDateString,
              displayName: editingWeek.displayName
            } : {
              originalId: undefined,
              startDate: '',
              endDate: '',
              displayName: ''
            }}
            onSubmit={handleAddOrUpdateWeek}
            onCancel={() => setIsWeekModalOpen(false)}
            existingWeeks={weeks}
            isLoading={updateLoadingStates.week}
          />
        </DialogContent>
      </Dialog>

      {/* Subcategory Modal */}
      <Dialog open={isSubcategoryModalOpen} onOpenChange={setIsSubcategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}</DialogTitle>
          </DialogHeader>
          <SubcategoryForm
            initialData={editingSubcategory ? {
              id: editingSubcategory.id,
              name: editingSubcategory.name,
              stageId: editingSubcategory.cvjStageId,
              displayOrder: editingSubcategory.displayOrder?.toString() || '1'
            } : {
              id: undefined,
              name: '',
              stageId: selectedStageForSubcategory,
              displayOrder: '1'
            }}
            onSubmit={handleSubcategoryFormSubmit}
            onCancel={() => setIsSubcategoryModalOpen(false)}
            cvjStages={cvjStages}
            isLoading={updateLoadingStates.subcategory}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        details={confirmDialog.details}
        isLoading={confirmDialog.isLoading}
      />
    </div>
  );
}

// Form Components
interface KpiFormProps {
  initialData: KpiFormData;
  onSubmit: (data: KpiFormData) => void;
  onCancel: () => void;
  cvjStages: CVJStage[];
  isLoading?: boolean;
}

function KpiForm({ initialData, onSubmit, onCancel, cvjStages, isLoading = false }: KpiFormProps) {
  const [formData, setFormData] = useState<KpiFormData>(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectedStage = cvjStages.find(stage => stage.name === formData.cvjStageName);
  const subCategories = selectedStage?.subCategories || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">KPI Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="cvjStageName">CVJ Stage</Label>
        <Select
          value={formData.cvjStageName}
          onValueChange={(value) => setFormData({ ...formData, cvjStageName: value as CVJStageName })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(CVJStageName).map(stage => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subCategoryName">Sub Category</Label>
        <Select
          value={formData.subCategoryName}
          onValueChange={(value) => setFormData({ ...formData, subCategoryName: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(subCategories || []).map(subCategory => (
              <SelectItem key={subCategory.id} value={subCategory.name}>
                {subCategory.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="unitType">Unit Type</Label>
        <Select
          value={formData.unitType}
          onValueChange={(value) => setFormData({ ...formData, unitType: value as UnitType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(UnitType).map(unit => (
              <SelectItem key={unit} value={unit}>
                {unit.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="defaultMonthlyTargetValue">Default Monthly Target</Label>
        <Input
          id="defaultMonthlyTargetValue"
          type="number"
          step="0.01"
          value={formData.defaultMonthlyTargetValue}
          onChange={(e) => setFormData({ ...formData, defaultMonthlyTargetValue: e.target.value })}
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Processing...' : (initialData.id ? 'Update KPI' : 'Add KPI')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface MonthlyTargetFormProps {
  initialData: MonthlyTargetFormData;
  onSubmit: (data: MonthlyTargetFormData) => void;
  onCancel: () => void;
  allKpis: KPI[];
  allMonths: { id: string; name: string; year: number; month: number }[];
  isLoading?: boolean;
}

function MonthlyTargetForm({ initialData, onSubmit, onCancel, allKpis, allMonths, isLoading = false }: MonthlyTargetFormProps) {
  const [formData, setFormData] = useState<MonthlyTargetFormData>(initialData);

  // Update form data when initialData changes (when modal opens)
  React.useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Validate and update monthId when available months change
  React.useEffect(() => {
    if (allMonths.length > 0 && formData.monthId && !allMonths.find(m => m.id === formData.monthId)) {
      // Current selected month is no longer available, reset to first available month
      setFormData(prev => ({ ...prev, monthId: allMonths[0].id }));
    } else if (allMonths.length > 0 && !formData.monthId) {
      // No month selected, set to first available month
      setFormData(prev => ({ ...prev, monthId: allMonths[0].id }));
    }
  }, [allMonths, formData.monthId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="kpiId">KPI</Label>
        <Select
          value={formData.kpiId}
          onValueChange={(value) => setFormData({ ...formData, kpiId: value })}
        >
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
        <Label htmlFor="monthId">Month</Label>
        <Select
          value={formData.monthId}
          onValueChange={(value) => setFormData({ ...formData, monthId: value })}
        >
          <SelectTrigger>
            <SelectValue />
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
          onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
          required
        />
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Processing...' : (initialData.id ? 'Update Target' : 'Add Target')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface WeekFormProps {
  initialData: WeekFormData;
  onSubmit: (data: WeekFormData) => void;
  onCancel: () => void;
  existingWeeks: Week[];
  isLoading?: boolean;
}

function WeekForm({ initialData, onSubmit, onCancel, existingWeeks, isLoading = false }: WeekFormProps) {
  const [formData, setFormData] = useState<WeekFormData>({
    ...initialData
  });
  const [errors, setErrors] = useState<{ startDate?: string; endDate?: string; duplicate?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { startDate?: string; endDate?: string; duplicate?: string } = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }

      // Check for overlaps with existing weeks (excluding the current week if editing)
      const currentWeekId = formData.originalId;
      const hasOverlap = existingWeeks.some(week => {
        if (currentWeekId && week.id === currentWeekId) return false;
        
        const existingStart = new Date(week.startDateString);
        const existingEnd = new Date(week.endDateString);
        
        return (startDate <= existingEnd && endDate >= existingStart);
      });

      if (hasOverlap) {
        newErrors.duplicate = 'This period overlaps with an existing week';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.duplicate && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{errors.duplicate}</p>
        </div>
      )}
      
      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.startDate}
          onChange={(e) => {
            setFormData({ ...formData, startDate: e.target.value });
            if (errors.startDate || errors.duplicate) {
              setErrors({ ...errors, startDate: undefined, duplicate: undefined });
            }
          }}
          className={errors.startDate ? 'border-red-500' : ''}
          required
        />
        {errors.startDate && (
          <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>
        )}
      </div>

      <div>
        <Label htmlFor="endDate">End Date</Label>
        <Input
          id="endDate"
          type="date"
          value={formData.endDate}
          onChange={(e) => {
            setFormData({ ...formData, endDate: e.target.value });
            if (errors.endDate || errors.duplicate) {
              setErrors({ ...errors, endDate: undefined, duplicate: undefined });
            }
          }}
          className={errors.endDate ? 'border-red-500' : ''}
          required
        />
        {errors.endDate && (
          <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>
        )}
      </div>

      <div>
        <Label htmlFor="displayName">Custom Display Name (Optional)</Label>
        <Input
          id="displayName"
          type="text"
          value={formData.displayName || ''}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="e.g., Holiday Campaign Week, Q1 Launch Period"
        />
        <p className="text-xs text-slate-500 mt-1">
          Leave empty to auto-generate from dates. You can include week numbers in the name if needed.
        </p>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Processing...' : (initialData.originalId ? 'Update Week' : 'Add Week')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}