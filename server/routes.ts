import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./controllers/auth";
import cvjRoutes from "./controllers/cvj";
import kpiRoutes from "./controllers/kpi";
import subcategoryRoutes from "./controllers/subcategory";
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
  app.use("/api/subcategories", subcategoryRoutes);
  app.use("/api/kpis", kpiRoutes);
  app.use("/api/weekly-data", weeklyDataRoutes);
  app.use("/api/monthly-targets", monthlyTargetsRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // Note: CVJ stages hierarchy endpoint is handled in index.ts

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

  // Weekly Data Admin Endpoints
  app.post("/api/admin/weekly-data-create", async (req, res) => {
    try {
      console.log('Creating weekly data entry:', req.body);
      const result = await storage.createWeeklyDataEntry(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error creating weekly data:', error);
      res.status(500).json({ success: false, message: "Failed to create weekly data entry" });
    }
  });

  app.post("/api/admin/weekly-data-update", async (req, res) => {
    try {
      console.log('Updating weekly data entry:', req.body);
      const { id, ...updateData } = req.body;
      const result = await storage.updateWeeklyDataEntry(id, updateData);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error updating weekly data:', error);
      res.status(500).json({ success: false, message: "Failed to update weekly data entry" });
    }
  });

  app.post("/api/admin/weekly-data-delete", async (req, res) => {
    try {
      console.log('Deleting weekly data entry:', req.body);
      const { id } = req.body;
      await storage.deleteWeeklyDataEntry(id);
      res.json({ success: true, message: "Weekly data entry deleted successfully" });
    } catch (error) {
      console.error('Error deleting weekly data:', error);
      res.status(500).json({ success: false, message: "Failed to delete weekly data entry" });
    }
  });

  app.post("/api/admin/weekly-data-bulk", async (req, res) => {
    try {
      console.log('Bulk processing weekly data:', req.body);
      const { entries } = req.body;
      
      const results = [];
      for (const entry of entries) {
        try {
          // Check if entry already exists
          const existing = await storage.getWeeklyDataEntries({
            weekId: entry.weekId,
            kpiId: entry.kpiId
          });
          
          if (existing.length > 0) {
            // Update existing entry
            const updated = await storage.updateWeeklyDataEntry(existing[0].id, entry);
            results.push(updated);
          } else {
            // Create new entry
            const created = await storage.createWeeklyDataEntry(entry);
            results.push(created);
          }
        } catch (entryError) {
          console.error('Error processing entry:', entry, entryError);
          throw entryError;
        }
      }
      
      res.json({ success: true, data: results });
    } catch (error) {
      console.error('Error bulk processing weekly data:', error);
      res.status(500).json({ success: false, message: "Failed to process weekly data entries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
