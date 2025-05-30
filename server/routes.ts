import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./controllers/auth";
import cvjRoutes from "./controllers/cvj";
import kpiRoutes from "./controllers/kpi";
import weeklyDataRoutes from "./controllers/weekly-data";
import monthlyTargetsRoutes from "./controllers/monthly-targets";
import analyticsRoutes from "./controllers/analytics";
import adminRoutes from "./controllers/admin";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/cvj-stages", cvjRoutes);
  app.use("/api/kpis", kpiRoutes);
  app.use("/api/weekly-data", weeklyDataRoutes);
  app.use("/api/monthly-targets", monthlyTargetsRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // Temporary direct hierarchy endpoint for admin
  app.get("/api/cvj-stages-hierarchy", async (req, res) => {
    try {
      const stagesWithHierarchy = await storage.getCvjStagesWithHierarchy();
      
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

      res.json(formattedStages);
    } catch (error) {
      console.error('Hierarchy endpoint error:', error);
      res.status(500).json({ error: 'Failed to fetch hierarchy data' });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Try a POST-based deletion with a different path structure
  app.post("/api/admin/delete-week", async (req, res) => {
    try {
      console.log(`=== ADMIN DELETE ENDPOINT HIT ===`);
      const weekId = req.body.weekId;
      console.log(`Admin delete request for week ID: "${weekId}"`);
      
      if (!weekId) {
        return res.status(400).json({ success: false, message: "Week ID is required" });
      }
      
      // Import database directly
      const { db } = await import('./db');
      const { weeks } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      console.log(`Executing direct database deletion...`);
      const result = await db.delete(weeks).where(eq(weeks.id, weekId));
      console.log(`Direct deletion result:`, result);
      
      res.json({ success: true, message: "Week deleted successfully" });
    } catch (error) {
      console.error(`Direct deletion error:`, error);
      res.status(500).json({ success: false, message: "Failed to delete week" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
