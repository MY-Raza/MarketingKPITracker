import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./controllers/auth";
import cvjRoutes from "./controllers/cvj";
import kpiRoutes from "./controllers/kpi";
import weeklyDataRoutes from "./controllers/weekly-data";
import monthlyTargetsRoutes from "./controllers/monthly-targets";
import analyticsRoutes from "./controllers/analytics";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/cvj-stages", cvjRoutes);
  app.use("/api/kpis", kpiRoutes);
  app.use("/api/weekly-data", weeklyDataRoutes);
  app.use("/api/monthly-targets", monthlyTargetsRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Direct deletion endpoint bypassing all middleware conflicts
  app.delete("/api/delete-week/:id", async (req, res) => {
    try {
      console.log(`=== DIRECT DELETE ENDPOINT HIT ===`);
      console.log(`Direct delete request for week ID: "${req.params.id}"`);
      
      // Import database directly
      const { db } = await import('./db');
      const { weeks } = await import('../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      console.log(`Executing direct database deletion...`);
      const result = await db.delete(weeks).where(eq(weeks.id, req.params.id));
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
