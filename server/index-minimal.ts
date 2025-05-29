import express from "express";
import { createServer } from "http";
import { storage } from "./storage-simple";
import { setupVite, serveStatic } from "./vite";

const app = express();

// Basic middleware only
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logging without complex middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Direct API routes without authentication for testing
app.get("/api/cvj-stages", async (req, res) => {
  try {
    const stages = await storage.getCVJStages();
    res.json({ success: true, data: stages });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/subcategories", async (req, res) => {
  try {
    const subcategories = await storage.getSubCategories();
    res.json({ success: true, data: subcategories });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/subcategories", async (req, res) => {
  try {
    const subcategory = await storage.createSubCategory(req.body);
    res.json({ success: true, data: subcategory });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put("/api/subcategories/:id", async (req, res) => {
  try {
    const subcategory = await storage.updateSubCategory(req.params.id, req.body);
    res.json({ success: true, data: subcategory });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.delete("/api/subcategories/:id", async (req, res) => {
  try {
    await storage.deleteSubCategory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/kpis", async (req, res) => {
  try {
    const kpis = await storage.getKPIs();
    res.json({ success: true, data: kpis });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/analytics/weeks", async (req, res) => {
  try {
    const weeks = await storage.getWeeks();
    res.json({ success: true, data: weeks });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/monthly-targets", async (req, res) => {
  try {
    const targets = await storage.getMonthlyTargets();
    res.json({ success: true, data: targets });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Bypass auth completely for testing
app.get("/api/auth/me", (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      id: "test-user", 
      username: "testuser",
      email: "test@example.com" 
    } 
  });
});

(async () => {
  const server = createServer(app);
  
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`serving on port ${port}`);
  });
})();