import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";

const router = Router();

// Get all admin data in one endpoint
router.get(
  "/data",
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get all required data for admin section
      const [cvjStages, subCategories, kpis, weeks, monthlyTargets] = await Promise.all([
        storage.getCvjStages(false),
        storage.getSubCategories(),
        storage.getKpis(),
        storage.getWeeks(),
        storage.getMonthlyKpiTargets()
      ]);

      // Build hierarchy manually
      const stagesWithHierarchy = cvjStages.map(stage => ({
        ...stage,
        subCategories: subCategories
          .filter(sub => sub.cvjStageId === stage.id)
          .map(sub => ({
            ...sub,
            kpis: kpis.filter(kpi => kpi.subCategoryId === sub.id)
          }))
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      })).sort((a, b) => a.displayOrder - b.displayOrder);

      res.json({
        cvjStages: stagesWithHierarchy,
        weeks,
        monthlyTargets,
        allKpis: kpis
      });
    } catch (error) {
      console.error('Admin data fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch admin data' });
    }
  })
);

export default router;