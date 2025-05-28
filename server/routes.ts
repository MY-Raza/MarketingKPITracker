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

  const httpServer = createServer(app);
  return httpServer;
}
