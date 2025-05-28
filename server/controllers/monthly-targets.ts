import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validateRequest, validateParams, validateQuery } from "../middleware/validation";
import { asyncHandler } from "../middleware/error";
import { successResponse, ApiError } from "../utils/response";
import { monthlyTargetsValidators } from "../validators";

const router = Router();

// Get monthly targets with filtering
router.get(
  "/",
  authenticateToken,
  validateQuery(monthlyTargetsValidators.queryFilters),
  asyncHandler(async (req: Request, res: Response) => {
    const { kpi_id, month_id } = req.query;
    
    const filters = {
      kpiId: kpi_id as string,
      monthId: month_id as string
    };

    const monthlyTargets = await storage.getMonthlyKpiTargets(filters);
    res.json(successResponse(monthlyTargets, "Monthly targets retrieved successfully"));
  })
);

// Get single monthly target
router.get(
  "/:id",
  authenticateToken,
  validateParams(monthlyTargetsValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const monthlyTarget = await storage.getMonthlyKpiTargetById(req.params.id);
    if (!monthlyTarget) {
      throw new ApiError("Monthly target not found", 404);
    }

    res.json(successResponse(monthlyTarget, "Monthly target retrieved successfully"));
  })
);

// Create new monthly target
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateRequest(monthlyTargetsValidators.create),
  asyncHandler(async (req: Request, res: Response) => {
    // Verify KPI exists
    const kpi = await storage.getKpiById(req.body.kpiId);
    if (!kpi) {
      throw new ApiError("KPI not found", 404);
    }

    const monthlyTarget = await storage.createMonthlyKpiTarget(req.body);
    res.status(201).json(successResponse(monthlyTarget, "Monthly target created successfully"));
  })
);

// Update monthly target
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateParams(monthlyTargetsValidators.params),
  validateRequest(monthlyTargetsValidators.update),
  asyncHandler(async (req: Request, res: Response) => {
    const existingTarget = await storage.getMonthlyKpiTargetById(req.params.id);
    if (!existingTarget) {
      throw new ApiError("Monthly target not found", 404);
    }

    const updatedTarget = await storage.updateMonthlyKpiTarget(req.params.id, req.body);
    res.json(successResponse(updatedTarget, "Monthly target updated successfully"));
  })
);

// Delete monthly target
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateParams(monthlyTargetsValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const existingTarget = await storage.getMonthlyKpiTargetById(req.params.id);
    if (!existingTarget) {
      throw new ApiError("Monthly target not found", 404);
    }

    await storage.deleteMonthlyKpiTarget(req.params.id);
    res.json(successResponse(null, "Monthly target deleted successfully"));
  })
);

// Get targets for a specific month
router.get(
  "/month/:monthId",
  authenticateToken,
  validateParams(monthlyTargetsValidators.monthParams),
  asyncHandler(async (req: Request, res: Response) => {
    const monthlyTargets = await storage.getMonthlyKpiTargets({
      monthId: req.params.monthId
    });

    res.json(successResponse(monthlyTargets, "Monthly targets for month retrieved successfully"));
  })
);

// Get targets for a specific KPI
router.get(
  "/kpi/:kpiId",
  authenticateToken,
  validateParams(monthlyTargetsValidators.kpiParams),
  asyncHandler(async (req: Request, res: Response) => {
    const kpi = await storage.getKpiById(req.params.kpiId);
    if (!kpi) {
      throw new ApiError("KPI not found", 404);
    }

    const monthlyTargets = await storage.getMonthlyKpiTargets({
      kpiId: req.params.kpiId
    });

    res.json(successResponse({
      kpi,
      targets: monthlyTargets
    }, "Monthly targets for KPI retrieved successfully"));
  })
);

// Bulk create/update monthly targets
router.post(
  "/bulk",
  authenticateToken,
  requireAdmin,
  validateRequest(monthlyTargetsValidators.bulkUpsert),
  asyncHandler(async (req: Request, res: Response) => {
    const { targets } = req.body;

    // Verify all KPIs exist
    const kpiIds = [...new Set(targets.map((t: any) => t.kpiId))];
    const kpis = await Promise.all(kpiIds.map(id => storage.getKpiById(id)));
    const missingKpis = kpiIds.filter((id, index) => !kpis[index]);

    if (missingKpis.length > 0) {
      throw new ApiError(`KPIs not found: ${missingKpis.join(', ')}`, 404);
    }

    const results = [];
    for (const target of targets) {
      // Check if target already exists
      const existingTargets = await storage.getMonthlyKpiTargets({
        kpiId: target.kpiId,
        monthId: target.monthId
      });

      if (existingTargets.length > 0) {
        // Update existing
        const updated = await storage.updateMonthlyKpiTarget(existingTargets[0].id, {
          targetValue: target.targetValue
        });
        results.push(updated);
      } else {
        // Create new
        const created = await storage.createMonthlyKpiTarget(target);
        results.push(created);
      }
    }

    res.json(successResponse(results, "Monthly targets processed successfully"));
  })
);

export default router;
