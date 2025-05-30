import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { validateRequest, validateParams } from "../middleware/validation";
import { asyncHandler } from "../middleware/error";
import { successResponse, ApiError } from "../utils/response";
import { cvjValidators } from "../validators";

const router = Router();

// Get all CVJ stages with hierarchy
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.include_inactive === 'true';
    const includeHierarchy = req.query.include_hierarchy === 'true';
    
    console.log('CVJ Controller: Query params:', req.query);
    console.log('CVJ Controller: includeInactive:', includeInactive);
    console.log('CVJ Controller: includeHierarchy:', includeHierarchy);
    console.log('CVJ Controller: Processing request...');

    if (includeHierarchy) {
      console.log('CVJ Controller: includeHierarchy is true, fetching hierarchy data...');
      const stagesWithHierarchy = await storage.getCvjStagesWithHierarchy();
      console.log('CVJ Controller: Raw hierarchy data rows:', stagesWithHierarchy.length);
      
      // Group the flat data into hierarchical structure
      const stagesMap = new Map();
      
      stagesWithHierarchy.forEach(row => {
        if (!stagesMap.has(row.id)) {
          stagesMap.set(row.id, {
            id: row.id,
            name: row.name,
            displayOrder: row.displayOrder,
            colorCode: row.colorCode,
            isActive: row.isActive,
            subCategories: new Map()
          });
        }
        
        const stage = stagesMap.get(row.id);
        
        if (row.subCategories?.id && !stage.subCategories.has(row.subCategories.id)) {
          stage.subCategories.set(row.subCategories.id, {
            id: row.subCategories.id,
            name: row.subCategories.name,
            displayOrder: row.subCategories.displayOrder,
            kpis: []
          });
        }
        
        if (row.kpis?.id && row.subCategories?.id) {
          const subCategory = stage.subCategories.get(row.subCategories.id);
          const existingKpi = subCategory.kpis.find((k: any) => k.id === row.kpis.id);
          
          if (!existingKpi) {
            subCategory.kpis.push({
              id: row.kpis.id,
              name: row.kpis.name,
              description: row.kpis.description,
              unitType: row.kpis.unitType,
              defaultMonthlyTargetValue: row.kpis.defaultMonthlyTargetValue,
              isActive: row.kpis.isActive
            });
          }
        }
      });
      
      const formattedStages = Array.from(stagesMap.values()).map(stage => ({
        ...stage,
        subCategories: Array.from(stage.subCategories.values())
          .sort((a, b) => a.displayOrder - b.displayOrder)
      }));

      console.log('CVJ Controller: Formatted stages sample:', formattedStages[0]);
      res.json(successResponse(formattedStages, "CVJ stages with hierarchy retrieved successfully"));
    } else {
      const stages = await storage.getCvjStages(includeInactive);
      res.json(successResponse(stages, "CVJ stages retrieved successfully"));
    }
  })
);

// Get single CVJ stage
router.get(
  "/:id",
  authenticateToken,
  validateParams(cvjValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const stage = await storage.getCvjStageById(req.params.id);
    if (!stage) {
      throw new ApiError("CVJ stage not found", 404);
    }

    res.json(successResponse(stage, "CVJ stage retrieved successfully"));
  })
);

// Create new CVJ stage
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  validateRequest(cvjValidators.create),
  asyncHandler(async (req: Request, res: Response) => {
    const stage = await storage.createCvjStage(req.body);
    res.status(201).json(successResponse(stage, "CVJ stage created successfully"));
  })
);

// Update CVJ stage
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateParams(cvjValidators.params),
  validateRequest(cvjValidators.update),
  asyncHandler(async (req: Request, res: Response) => {
    const existingStage = await storage.getCvjStageById(req.params.id);
    if (!existingStage) {
      throw new ApiError("CVJ stage not found", 404);
    }

    const updatedStage = await storage.updateCvjStage(req.params.id, req.body);
    res.json(successResponse(updatedStage, "CVJ stage updated successfully"));
  })
);

// Delete CVJ stage
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  validateParams(cvjValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const existingStage = await storage.getCvjStageById(req.params.id);
    if (!existingStage) {
      throw new ApiError("CVJ stage not found", 404);
    }

    await storage.deleteCvjStage(req.params.id);
    res.json(successResponse(null, "CVJ stage deleted successfully"));
  })
);

// Get subcategories for a CVJ stage
router.get(
  "/:id/subcategories",
  authenticateToken,
  validateParams(cvjValidators.params),
  asyncHandler(async (req: Request, res: Response) => {
    const stage = await storage.getCvjStageById(req.params.id);
    if (!stage) {
      throw new ApiError("CVJ stage not found", 404);
    }

    const subCategories = await storage.getSubCategoriesByStageId(req.params.id);
    res.json(successResponse(subCategories, "Subcategories retrieved successfully"));
  })
);

// Create subcategory for a CVJ stage
router.post(
  "/:id/subcategories",
  authenticateToken,
  requireAdmin,
  validateParams(cvjValidators.params),
  validateRequest(cvjValidators.createSubCategory),
  asyncHandler(async (req: Request, res: Response) => {
    const stage = await storage.getCvjStageById(req.params.id);
    if (!stage) {
      throw new ApiError("CVJ stage not found", 404);
    }

    const subCategory = await storage.createSubCategory({
      ...req.body,
      cvjStageId: req.params.id
    });

    res.status(201).json(successResponse(subCategory, "Subcategory created successfully"));
  })
);

// Update subcategory
router.put(
  "/subcategories/:subCategoryId",
  authenticateToken,
  requireAdmin,
  validateParams(cvjValidators.subCategoryParams),
  validateRequest(cvjValidators.updateSubCategory),
  asyncHandler(async (req: Request, res: Response) => {
    const existingSubCategory = await storage.getSubCategoryById(req.params.subCategoryId);
    if (!existingSubCategory) {
      throw new ApiError("Subcategory not found", 404);
    }

    const updatedSubCategory = await storage.updateSubCategory(req.params.subCategoryId, req.body);
    res.json(successResponse(updatedSubCategory, "Subcategory updated successfully"));
  })
);

// Delete subcategory
router.delete(
  "/subcategories/:subCategoryId",
  authenticateToken,
  requireAdmin,
  validateParams(cvjValidators.subCategoryParams),
  asyncHandler(async (req: Request, res: Response) => {
    const existingSubCategory = await storage.getSubCategoryById(req.params.subCategoryId);
    if (!existingSubCategory) {
      throw new ApiError("Subcategory not found", 404);
    }

    await storage.deleteSubCategory(req.params.subCategoryId);
    res.json(successResponse(null, "Subcategory deleted successfully"));
  })
);

export default router;
