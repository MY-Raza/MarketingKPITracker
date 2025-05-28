import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validateRequest, validateParams, validateQuery } from "../middleware/validation";
import { asyncHandler } from "../middleware/error";
import { successResponse, ApiError } from "../utils/response";
import { kpiValidators } from "../validators";

const router = Router();

// Get all KPIs with filtering
router.get(
  "/",
  authenticateToken,
  validateQuery(kpiValidators.queryFilters),
  asyncHandler(async (req: Request, res: Response) => {
    const { stage_id, sub_category_id, active, include_relations } = req.query;
    
    const filters = {
      stageId: stage_id as string,
      subCategoryId: sub_category_id as string,
      active: active === 'true' ? true : active === 'false' ? false : undefined
    };

    if (include_relations === 'true') {
      const kpisWithRelations = await storage.getKpisWithRelations(filters);
      res.json(successResponse(kpisWithRelations, "KPIs with relations retrieved successfully"));
    } else {
      const kpis = await storage.getKpis(filters);
      res.json(successResponse(kpis, "KPIs retrieved successfully"));
    }
  })
);

// Get single KPI
router.get(
  "/:id",
  authenticateToken,
  validateParams(kpiValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const kpi = await storage.getKpiById(req.params.id);
    if (!kpi) {
      throw new ApiError("KPI not found", 404);
    }

    res.json(successResponse(kpi, "KPI retrieved successfully"));
  })
);

// Create new KPI
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateRequest(kpiValidators.create),
  asyncHandler(async (req: Request, res: Response) => {
    // Verify subcategory exists
    const subCategory = await storage.getSubCategoryById(req.body.subCategoryId);
    if (!subCategory) {
      throw new ApiError("Subcategory not found", 404);
    }

    const kpi = await storage.createKpi(req.body);
    res.status(201).json(successResponse(kpi, "KPI created successfully"));
  })
);

// Update KPI
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateParams(kpiValidators.params),
  validateRequest(kpiValidators.update),
  asyncHandler(async (req: Request, res: Response) => {
    const existingKpi = await storage.getKpiById(req.params.id);
    if (!existingKpi) {
      throw new ApiError("KPI not found", 404);
    }

    // If subCategoryId is being updated, verify it exists
    if (req.body.subCategoryId) {
      const subCategory = await storage.getSubCategoryById(req.body.subCategoryId);
      if (!subCategory) {
        throw new ApiError("Subcategory not found", 404);
      }
    }

    const updatedKpi = await storage.updateKpi(req.params.id, req.body);
    res.json(successResponse(updatedKpi, "KPI updated successfully"));
  })
);

// Delete KPI
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateParams(kpiValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const existingKpi = await storage.getKpiById(req.params.id);
    if (!existingKpi) {
      throw new ApiError("KPI not found", 404);
    }

    await storage.deleteKpi(req.params.id);
    res.json(successResponse(null, "KPI deleted successfully"));
  })
);

// Toggle KPI active status
router.patch(
  "/:id/toggle-active",
  authenticateToken,
  requireAdmin,
  validateParams(kpiValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const existingKpi = await storage.getKpiById(req.params.id);
    if (!existingKpi) {
      throw new ApiError("KPI not found", 404);
    }

    const updatedKpi = await storage.updateKpi(req.params.id, {
      isActive: !existingKpi.isActive
    });

    res.json(successResponse(updatedKpi, "KPI status updated successfully"));
  })
);

// Bulk update KPIs
router.patch(
  "/bulk-update",
  authenticateToken,
  requireAdmin,
  validateRequest(kpiValidators.bulkUpdate),
  asyncHandler(async (req: Request, res: Response) => {
    const { kpiIds, updates } = req.body;
    const results = [];

    for (const kpiId of kpiIds) {
      const existingKpi = await storage.getKpiById(kpiId);
      if (existingKpi) {
        const updatedKpi = await storage.updateKpi(kpiId, updates);
        results.push(updatedKpi);
      }
    }

    res.json(successResponse(results, "KPIs updated successfully"));
  })
);

export default router;
