import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { validateParams, validateQuery, validateRequest } from "../middleware/validation";
import { asyncHandler } from "../middleware/error";
import { successResponse, ApiError } from "../utils/response";
import { analyticsValidators } from "../validators";
import { DataAggregationService } from "../services/data-aggregation";

const router = Router();
const dataAggregationService = new DataAggregationService();

// Get dashboard data for a specific month
router.get(
  "/dashboard/:monthId",
  authenticateToken,
  validateParams(analyticsValidators.monthParams),
  asyncHandler(async (req: Request, res: Response) => {
    const dashboardData = await storage.getDashboardDataForMonth(req.params.monthId);
    res.json(successResponse(dashboardData, "Dashboard data retrieved successfully"));
  })
);

// Get monthly overview with aggregated metrics
router.get(
  "/monthly-overview",
  authenticateToken,
  validateQuery(analyticsValidators.monthlyOverviewQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const monthId = req.query.month as string || new Date().toISOString().slice(0, 7); // YYYY-MM
    const stageId = req.query.stage_id as string;

    const overview = await dataAggregationService.getMonthlyOverview(monthId, stageId);
    res.json(successResponse(overview, "Monthly overview retrieved successfully"));
  })
);

// Get trend data for charts
router.get(
  "/trends",
  authenticateToken,
  validateQuery(analyticsValidators.trendsQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      kpi_id,
      stage_id,
      date_from,
      date_to,
      period = 'weekly'
    } = req.query;

    const trends = await dataAggregationService.getTrendData({
      kpiId: kpi_id as string,
      stageId: stage_id as string,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      period: period as 'weekly' | 'monthly'
    });

    res.json(successResponse(trends, "Trend data retrieved successfully"));
  })
);

// Get KPI performance metrics
router.get(
  "/kpi-performance",
  authenticateToken,
  validateQuery(analyticsValidators.kpiPerformanceQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      month_id,
      stage_id,
      kpi_ids
    } = req.query;

    const monthId = month_id as string || new Date().toISOString().slice(0, 7);
    const kpiIdsArray = kpi_ids ? (kpi_ids as string).split(',') : undefined;

    const performance = await dataAggregationService.getKpiPerformanceMetrics({
      monthId,
      stageId: stage_id as string,
      kpiIds: kpiIdsArray
    });

    res.json(successResponse(performance, "KPI performance metrics retrieved successfully"));
  })
);

// Get stage performance summary
router.get(
  "/stage-performance",
  authenticateToken,
  validateQuery(analyticsValidators.stagePerformanceQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const monthId = req.query.month_id as string || new Date().toISOString().slice(0, 7);

    const stagePerformance = await dataAggregationService.getStagePerformanceSummary(monthId);
    res.json(successResponse(stagePerformance, "Stage performance summary retrieved successfully"));
  })
);

// Get comparison data (month over month, year over year)
router.get(
  "/comparison",
  authenticateToken,
  validateQuery(analyticsValidators.comparisonQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      current_month,
      comparison_month,
      kpi_id,
      stage_id
    } = req.query;

    const comparison = await dataAggregationService.getComparisonData({
      currentMonth: current_month as string,
      comparisonMonth: comparison_month as string,
      kpiId: kpi_id as string,
      stageId: stage_id as string
    });

    res.json(successResponse(comparison, "Comparison data retrieved successfully"));
  })
);

// Get health score metrics
router.get(
  "/health-score",
  authenticateToken,
  validateQuery(analyticsValidators.healthScoreQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const monthId = req.query.month_id as string || new Date().toISOString().slice(0, 7);

    const healthScore = await dataAggregationService.getHealthScoreMetrics(monthId);
    res.json(successResponse(healthScore, "Health score metrics retrieved successfully"));
  })
);

// Export data for external analysis
router.get(
  "/export",
  authenticateToken,
  validateQuery(analyticsValidators.exportQuery),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      format = 'json',
      date_from,
      date_to,
      include_targets = 'true',
      stage_ids,
      kpi_ids
    } = req.query;

    const exportData = await dataAggregationService.exportData({
      format: format as 'json' | 'csv',
      dateFrom: date_from as string,
      dateTo: date_to as string,
      includeTargets: include_targets === 'true',
      stageIds: stage_ids ? (stage_ids as string).split(',') : undefined,
      kpiIds: kpi_ids ? (kpi_ids as string).split(',') : undefined
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="kpi-data.csv"');
      res.send(exportData);
    } else {
      res.json(successResponse(exportData, "Data exported successfully"));
    }
  })
);

// Get weeks data
router.get(
  "/weeks",
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const weeks = await storage.getWeeks();
    res.json(successResponse(weeks, "Weeks retrieved successfully"));
  })
);

// Simple GET-based deletion to bypass routing issues
router.get(
  "/weeks/:id/delete",
  authenticateToken,
  validateParams(analyticsValidators.weekParams),
  asyncHandler(async (req: Request, res: Response) => {
    console.log(`=== GET DELETE ENDPOINT HIT ===`);
    console.log(`GET DELETE request received for week ID: "${req.params.id}"`);
    
    // Direct database deletion
    const { db } = await import('../db');
    const { weeks } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    try {
      console.log(`Direct database deletion for week: "${req.params.id}"`);
      const result = await db.delete(weeks).where(eq(weeks.id, req.params.id));
      console.log(`Database deletion result:`, result);
      
      res.json(successResponse(null, "Week deleted successfully"));
    } catch (error) {
      console.error(`Database deletion error:`, error);
      throw new ApiError("Failed to delete week", 500);
    }
  })
);

// Create new week
router.post(
  "/weeks",
  authenticateToken,
  validateRequest(analyticsValidators.createWeek),
  asyncHandler(async (req: Request, res: Response) => {
    // Check for duplicate weeks before creating
    const existingWeeks = await storage.getWeeks();
    const newWeekId = req.body.id;
    
    // Check if a week with the same ID already exists
    const duplicateById = existingWeeks.find(week => week.id === newWeekId);
    if (duplicateById) {
      throw new ApiError(`A week with ID "${newWeekId}" already exists. Please choose different dates.`, 409);
    }
    
    // Check if a week with the same date range already exists
    const duplicateByDates = existingWeeks.find(week => 
      week.startDateString === req.body.startDateString && 
      week.endDateString === req.body.endDateString
    );
    if (duplicateByDates) {
      throw new ApiError(`A week with the date range ${req.body.startDateString} to ${req.body.endDateString} already exists.`, 409);
    }
    
    const week = await storage.createWeek(req.body);
    res.status(201).json(successResponse(week, "Week created successfully"));
  })
);

// Update week
router.put(
  "/weeks/:id",
  authenticateToken,
  validateParams(analyticsValidators.weekParams),
  validateRequest(analyticsValidators.updateWeek),
  asyncHandler(async (req: Request, res: Response) => {
    const existingWeek = await storage.getWeekById(req.params.id);
    if (!existingWeek) {
      throw new ApiError("Week not found", 404);
    }

    const updatedWeek = await storage.updateWeek(req.params.id, req.body);
    res.json(successResponse(updatedWeek, "Week updated successfully"));
  })
);

// Direct deletion endpoint using PATCH method
router.patch(
  "/weeks/:id/remove",
  authenticateToken,
  validateParams(analyticsValidators.weekParams),
  asyncHandler(async (req: Request, res: Response) => {
    console.log(`=== PATCH DELETE ENDPOINT HIT ===`);
    console.log(`PATCH DELETE request received for week ID: "${req.params.id}"`);
    
    // Direct database deletion to bypass any storage layer issues
    const { db } = await import('../db');
    const { weeks } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    try {
      console.log(`Direct database deletion for week: "${req.params.id}"`);
      const result = await db.delete(weeks).where(eq(weeks.id, req.params.id));
      console.log(`Database deletion result:`, result);
      
      res.json(successResponse(null, "Week deleted successfully"));
    } catch (error) {
      console.error(`Database deletion error:`, error);
      throw new ApiError("Failed to delete week", 500);
    }
  })
);

// Keep original DELETE method as backup
router.delete(
  "/weeks/:id",
  authenticateToken,
  validateParams(analyticsValidators.weekParams),
  asyncHandler(async (req: Request, res: Response) => {
    console.log(`DELETE request received for week ID: "${req.params.id}"`);
    const existingWeek = await storage.getWeekById(req.params.id);
    
    if (!existingWeek) {
      throw new ApiError("Week not found", 404);
    }

    await storage.deleteWeek(req.params.id);
    res.json(successResponse(null, "Week deleted successfully"));
  })
);

export default router;
