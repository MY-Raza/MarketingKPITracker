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
    const { kpiId, monthId, targetValue } = req.body;
    
    // Validate required fields
    if (!kpiId || !monthId || targetValue === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: kpiId, monthId, targetValue' 
      });
    }

    // Validate targetValue is a number
    const numericTargetValue = parseFloat(targetValue);
    if (isNaN(numericTargetValue)) {
      return res.status(400).json({ 
        success: false, 
        message: 'targetValue must be a valid number' 
      });
    }

    // Check if target already exists for this KPI and month
    const existingTargets = await storage.getMonthlyTargets();
    const existingTarget = existingTargets.find(t => t.kpiId === kpiId && t.monthId === monthId);
    
    let result;
    if (existingTarget) {
      // Update existing target
      result = await storage.updateMonthlyTarget(existingTarget.id, {
        targetValue: numericTargetValue
      });
      res.json(result);
    } else {
      // Create new target
      result = await storage.createMonthlyTarget({
        kpiId,
        monthId,
        targetValue: numericTargetValue
      });
      res.status(201).json(result);
    }
  } catch (error) {
    console.error('Error creating/updating monthly target:', error);
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

app.post("/api/weekly-data", async (req, res) => {
  try {
    const { weekId, kpiId, actualValue, notes } = req.body;
    
    // Validate required fields
    if (!weekId || !kpiId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: weekId, kpiId' 
      });
    }

    // Convert actualValue to number if provided, or null
    let numericActualValue = null;
    if (actualValue !== undefined && actualValue !== null && actualValue !== '') {
      numericActualValue = parseFloat(actualValue);
      if (isNaN(numericActualValue)) {
        return res.status(400).json({ 
          success: false, 
          message: 'actualValue must be a valid number or empty' 
        });
      }
    }

    // Check if entry already exists for this week and KPI
    const existingEntries = await storage.getWeeklyDataEntries();
    const existingEntry = existingEntries.find(e => e.weekId === weekId && e.kpiId === kpiId);
    
    let result;
    if (existingEntry) {
      // Update existing entry
      result = await storage.updateWeeklyDataEntry(existingEntry.id, {
        actualValue: numericActualValue,
        notes: notes || null
      });
      res.json(result);
    } else {
      // Create new entry
      result = await storage.createWeeklyDataEntry({
        weekId,
        kpiId,
        actualValue: numericActualValue,
        notes: notes || null
      });
      res.status(201).json(result);
    }
  } catch (error) {
    console.error('Error creating/updating weekly data entry:', error);
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
      cvjStageId: stageId,
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
      cvjStageId: stageId,
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

// KPI endpoints
app.get("/api/kpis", async (req, res) => {
  try {
    const kpis = await storage.getKPIs();
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/kpis", async (req, res) => {
  try {
    const { name, description, unitType, defaultMonthlyTargetValue, subCategoryId } = req.body;
    
    if (!name || !unitType || !subCategoryId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, unitType, subCategoryId' 
      });
    }

    const kpiData = {
      name,
      description: description || '',
      unitType,
      defaultMonthlyTargetValue: defaultMonthlyTargetValue ? parseFloat(defaultMonthlyTargetValue) : null,
      subCategoryId,
      isActive: true
    };

    const newKPI = await storage.createKPI(kpiData);
    res.status(201).json(newKPI);
  } catch (error) {
    console.error('Error creating KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put("/api/kpis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unitType, defaultMonthlyTargetValue } = req.body;
    
    const updateData = {
      name,
      description,
      unitType,
      defaultMonthlyTargetValue: defaultMonthlyTargetValue ? parseFloat(defaultMonthlyTargetValue) : null
    };

    const updatedKPI = await storage.updateKPI(id, updateData);
    res.json(updatedKPI);
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/kpis/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteKPI(id);
    res.json({ success: true, message: 'KPI deleted successfully' });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Weekly data endpoints
app.post("/api/weekly-data", async (req, res) => {
  try {
    const { weekId, kpiId, actualValue, notes } = req.body;
    
    if (!weekId || !kpiId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: weekId, kpiId' 
      });
    }

    const weeklyData = {
      weekId,
      kpiId,
      actualValue: actualValue ? parseFloat(actualValue) : null,
      notes: notes || null
    };

    const newEntry = await storage.createWeeklyDataEntry(weeklyData);
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error creating weekly data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put("/api/weekly-data/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { actualValue, notes } = req.body;
    
    const updateData = {
      actualValue: actualValue ? parseFloat(actualValue) : null,
      notes: notes || null
    };

    const updatedEntry = await storage.updateWeeklyDataEntry(id, updateData);
    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating weekly data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Week management endpoints
app.post("/api/weeks", async (req, res) => {
  try {
    const { id, year, weekNumber, month, startDateString, endDateString } = req.body;
    
    if (!id || !year || !weekNumber || !month || !startDateString || !endDateString) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const weekData = {
      id,
      year: parseInt(year),
      weekNumber: parseInt(weekNumber), 
      month: parseInt(month),
      startDateString,
      endDateString
    };

    const newWeek = await storage.createWeek(weekData);
    res.status(201).json(newWeek);
  } catch (error) {
    console.error('Error creating week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put("/api/weeks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (updateData.year) updateData.year = parseInt(updateData.year);
    if (updateData.weekNumber) updateData.weekNumber = parseInt(updateData.weekNumber);
    if (updateData.month) updateData.month = parseInt(updateData.month);

    const updatedWeek = await storage.updateWeek(id, updateData);
    res.json(updatedWeek);
  } catch (error) {
    console.error('Error updating week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/weeks/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteWeek(id);
    res.json({ success: true, message: 'Week deleted successfully' });
  } catch (error) {
    console.error('Error deleting week:', error);
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