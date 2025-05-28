import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { validateRequest, validateParams, validateQuery } from "../middleware/validation";
import { asyncHandler } from "../middleware/error";
import { successResponse, ApiError } from "../utils/response";
import { weeklyDataValidators } from "../validators";

const router = Router();

// Get weekly data entries with filtering
router.get(
  "/",
  authenticateToken,
  validateQuery(weeklyDataValidators.queryFilters),
  asyncHandler(async (req: Request, res: Response) => {
    const { week_id, kpi_id, month_id, include_relations } = req.query;
    
    const filters = {
      weekId: week_id as string,
      kpiId: kpi_id as string,
      monthId: month_id as string
    };

    if (include_relations === 'true') {
      const weeklyDataWithRelations = await storage.getWeeklyDataWithRelations(filters);
      res.json(successResponse(weeklyDataWithRelations, "Weekly data with relations retrieved successfully"));
    } else {
      const weeklyData = await storage.getWeeklyDataEntries(filters);
      res.json(successResponse(weeklyData, "Weekly data retrieved successfully"));
    }
  })
);

// Get single weekly data entry
router.get(
  "/:id",
  authenticateToken,
  validateParams(weeklyDataValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const weeklyData = await storage.getWeeklyDataEntryById(req.params.id);
    if (!weeklyData) {
      throw new ApiError("Weekly data entry not found", 404);
    }

    res.json(successResponse(weeklyData, "Weekly data entry retrieved successfully"));
  })
);

// Create new weekly data entry
router.post(
  "/",
  authenticateToken,
  validateRequest(weeklyDataValidators.create),
  asyncHandler(async (req: Request, res: Response) => {
    // Verify week and KPI exist
    const [week, kpi] = await Promise.all([
      storage.getWeekById(req.body.weekId),
      storage.getKpiById(req.body.kpiId)
    ]);

    if (!week) {
      throw new ApiError("Week not found", 404);
    }

    if (!kpi) {
      throw new ApiError("KPI not found", 404);
    }

    const weeklyData = await storage.createWeeklyDataEntry(req.body);
    res.status(201).json(successResponse(weeklyData, "Weekly data entry created successfully"));
  })
);

// Update weekly data entry
router.put(
  "/:id",
  authenticateToken,
  validateParams(weeklyDataValidators.params),
  validateRequest(weeklyDataValidators.update),
  asyncHandler(async (req: Request, res: Response) => {
    const existingWeeklyData = await storage.getWeeklyDataEntryById(req.params.id);
    if (!existingWeeklyData) {
      throw new ApiError("Weekly data entry not found", 404);
    }

    const updatedWeeklyData = await storage.updateWeeklyDataEntry(req.params.id, req.body);
    res.json(successResponse(updatedWeeklyData, "Weekly data entry updated successfully"));
  })
);

// Delete weekly data entry
router.delete(
  "/:id",
  authenticateToken,
  validateParams(weeklyDataValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const existingWeeklyData = await storage.getWeeklyDataEntryById(req.params.id);
    if (!existingWeeklyData) {
      throw new ApiError("Weekly data entry not found", 404);
    }

    await storage.deleteWeeklyDataEntry(req.params.id);
    res.json(successResponse(null, "Weekly data entry deleted successfully"));
  })
);

// Bulk create/update weekly data entries
router.post(
  "/bulk",
  authenticateToken,
  validateRequest(weeklyDataValidators.bulkUpsert),
  asyncHandler(async (req: Request, res: Response) => {
    const { entries } = req.body;

    // Verify all weeks and KPIs exist
    const weekIds = [...new Set(entries.map((e: any) => e.weekId))];
    const kpiIds = [...new Set(entries.map((e: any) => e.kpiId))];

    const [weeks, kpis] = await Promise.all([
      Promise.all(weekIds.map(id => storage.getWeekById(id))),
      Promise.all(kpiIds.map(id => storage.getKpiById(id)))
    ]);

    const missingWeeks = weekIds.filter((id, index) => !weeks[index]);
    const missingKpis = kpiIds.filter((id, index) => !kpis[index]);

    if (missingWeeks.length > 0) {
      throw new ApiError(`Weeks not found: ${missingWeeks.join(', ')}`, 404);
    }

    if (missingKpis.length > 0) {
      throw new ApiError(`KPIs not found: ${missingKpis.join(', ')}`, 404);
    }

    const results = await storage.bulkUpsertWeeklyDataEntries(entries);
    res.json(successResponse(results, "Weekly data entries processed successfully"));
  })
);

// Get weekly data for a specific week
router.get(
  "/week/:weekId",
  authenticateToken,
  validateParams(weeklyDataValidators.weekParams),
  asyncHandler(async (req: Request, res: Response) => {
    const week = await storage.getWeekById(req.params.weekId);
    if (!week) {
      throw new ApiError("Week not found", 404);
    }

    const weeklyData = await storage.getWeeklyDataWithRelations({
      weekId: req.params.weekId
    });

    res.json(successResponse({
      week,
      entries: weeklyData
    }, "Weekly data for week retrieved successfully"));
  })
);

// Get weekly data for a specific KPI
router.get(
  "/kpi/:kpiId",
  authenticateToken,
  validateParams(weeklyDataValidators.kpiParams),
  asyncHandler(async (req: Request, res: Response) => {
    const kpi = await storage.getKpiById(req.params.kpiId);
    if (!kpi) {
      throw new ApiError("KPI not found", 404);
    }

    const weeklyData = await storage.getWeeklyDataWithRelations({
      kpiId: req.params.kpiId
    });

    res.json(successResponse({
      kpi,
      entries: weeklyData
    }, "Weekly data for KPI retrieved successfully"));
  })
);

export default router;
