import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

/**
 * Custom hook for real-time data synchronization across the entire application
 * Ensures that when data is updated in one section, all other sections reflect the changes immediately
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();

  // Invalidate all related queries when weeks are modified
  const syncWeeksData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/weeks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/weekly-data'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    // Refetch to ensure immediate updates
    queryClient.refetchQueries({ queryKey: ['/api/weeks'] });
  }, [queryClient]);

  // Invalidate all related queries when KPIs are modified
  const syncKpisData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    queryClient.invalidateQueries({ queryKey: ['/api/weekly-data'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    // Refetch critical data immediately
    queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] });
    queryClient.refetchQueries({ queryKey: ['/api/weekly-data'] });
  }, [queryClient]);

  // Invalidate all related queries when weekly data entries are modified
  const syncWeeklyData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/weekly-data'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    // Refetch for immediate dashboard updates
    queryClient.refetchQueries({ queryKey: ['/api/weekly-data'] });
  }, [queryClient]);

  // Invalidate all related queries when monthly targets are modified
  const syncMonthlyTargets = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/monthly-targets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
    // Refetch for immediate calculation updates
    queryClient.refetchQueries({ queryKey: ['/api/monthly-targets'] });
  }, [queryClient]);

  // Invalidate all related queries when subcategories are modified
  const syncSubcategoriesData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/cvj-stages-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['/api/subcategories'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kpis'] });
    // Refetch hierarchy for immediate structural updates
    queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] });
  }, [queryClient]);

  // Complete data refresh for critical operations
  const syncAllData = useCallback(() => {
    queryClient.invalidateQueries();
    // Refetch core data immediately
    queryClient.refetchQueries({ queryKey: ['/api/cvj-stages-hierarchy'] });
    queryClient.refetchQueries({ queryKey: ['/api/weeks'] });
    queryClient.refetchQueries({ queryKey: ['/api/weekly-data'] });
    queryClient.refetchQueries({ queryKey: ['/api/monthly-targets'] });
  }, [queryClient]);

  return {
    syncWeeksData,
    syncKpisData,
    syncWeeklyData,
    syncMonthlyTargets,
    syncSubcategoriesData,
    syncAllData,
  };
}