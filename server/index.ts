import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { storage } from "./storage-clean";

const app = express();

// Basic middleware only
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for API requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Direct API routes without authentication for testing
app.get("/api/cvj-stages", async (req, res) => {
  try {
    const stages = await storage.getCVJStages();
    res.json(stages);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/kpis", async (req, res) => {
  try {
    const kpis = await storage.getKPIs();
    res.json(kpis);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/analytics/weeks", async (req, res) => {
  try {
    const weeks = await storage.getWeeks();
    res.json(weeks);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/monthly-targets", async (req, res) => {
  try {
    const targets = await storage.getMonthlyTargets();
    res.json(targets);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/monthly-targets", async (req, res) => {
  try {
    const newTarget = await storage.createMonthlyTarget(req.body);
    res.status(201).json(newTarget);
  } catch (error) {
    console.error('Error creating monthly target:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get("/api/weekly-data", async (req, res) => {
  try {
    const weeklyData = await storage.getWeeklyDataEntries();
    res.json(weeklyData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Subcategory management endpoints
app.get("/api/sub-categories", async (req, res) => {
  try {
    const subCategories = await storage.getSubCategories();
    res.json(subCategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/sub-categories", async (req, res) => {
  try {
    const { name, stageId, displayOrder } = req.body;
    const newSubCategory = await storage.createSubCategory({
      name,
      stageId,
      displayOrder: displayOrder || 1
    });
    res.status(201).json(newSubCategory);
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put("/api/sub-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, stageId, displayOrder } = req.body;
    const updatedSubCategory = await storage.updateSubCategory(id, {
      name,
      stageId,
      displayOrder
    });
    res.json(updatedSubCategory);
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/sub-categories/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteSubCategory(id);
    res.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Simple auth endpoints for testing
app.post("/api/auth/login", (req, res) => {
  // Accept any login for testing purposes
  const { email, password } = req.body;
  
  if (email && password) {
    const username = email.split('@')[0]; // Extract username from email
    res.json({ 
      user: {
        id: "test-user", 
        username: username,
        email: email 
      },
      tokens: {
        accessToken: "mock-jwt-token-for-testing",
        refreshToken: "mock-refresh-token-for-testing"
      }
    });
  } else {
    res.status(400).json({ 
      success: false, 
      message: "Email and password required" 
    });
  }
});

app.get("/api/auth/me", (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      id: "test-user", 
      username: "test",
      email: "test@example.com" 
    } 
  });
});

// Setup Vite in development
if (process.env.NODE_ENV !== "production") {
  setupVite(app);
} else {
  serveStatic(app);
}

const server = createServer(app);

server.listen(5000, "0.0.0.0", () => {
  console.log("serving on port 5000");
});