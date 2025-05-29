import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";
import { storage } from "./storage";

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

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CVJ Stages endpoints
app.get("/api/cvj-stages", async (req, res) => {
  try {
    const stages = await storage.getCvjStages();
    res.json(stages);
  } catch (error) {
    console.error('Error fetching CVJ stages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// KPIs endpoints  
app.get("/api/kpis", async (req, res) => {
  try {
    const kpis = await storage.getKpis();
    res.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/kpis", async (req, res) => {
  try {
    const { name, description, unitType, defaultMonthlyTargetValue, subCategoryId } = req.body;
    
    const kpiData = {
      name,
      description,
      unitType,
      defaultMonthlyTargetValue: defaultMonthlyTargetValue ? parseFloat(defaultMonthlyTargetValue) : null,
      subCategoryId,
      isActive: true
    };

    const newKPI = await storage.createKpi(kpiData);
    res.status(201).json(newKPI);
  } catch (error) {
    console.error('Error creating KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.patch("/api/kpis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unitType, defaultMonthlyTargetValue } = req.body;
    
    const updateData = {
      name,
      description,
      unitType,
      defaultMonthlyTargetValue: defaultMonthlyTargetValue ? parseFloat(defaultMonthlyTargetValue) : null
    };

    const updatedKPI = await storage.updateKpi(id, updateData);
    res.json(updatedKPI);
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/kpis/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteKpi(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Monthly targets endpoints
app.get("/api/monthly-targets", async (req, res) => {
  try {
    const targets = await storage.getMonthlyKpiTargets();
    res.json(targets);
  } catch (error) {
    console.error('Error fetching monthly targets:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/monthly-targets", async (req, res) => {
  try {
    const { kpiId, monthId, targetValue } = req.body;
    
    if (!kpiId || !monthId || targetValue === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: kpiId, monthId, targetValue' 
      });
    }

    const numericTargetValue = parseFloat(targetValue);
    if (isNaN(numericTargetValue)) {
      return res.status(400).json({ 
        success: false, 
        message: 'targetValue must be a valid number' 
      });
    }

    // Check if target already exists
    const existingTargets = await storage.getMonthlyKpiTargets();
    const existingTarget = existingTargets.find(t => t.kpiId === kpiId && t.monthId === monthId);
    
    let result;
    if (existingTarget) {
      result = await storage.updateMonthlyKpiTarget(existingTarget.id, {
        targetValue: numericTargetValue
      });
      res.json(result);
    } else {
      result = await storage.createMonthlyKpiTarget({
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

app.post("/api/monthly-targets/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteMonthlyKpiTarget(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting monthly target:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Weekly data endpoints
app.get("/api/weekly-data", async (req, res) => {
  try {
    const weeklyData = await storage.getWeeklyDataEntries();
    res.json(weeklyData);
  } catch (error) {
    console.error('Error fetching weekly data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post("/api/weekly-data", async (req, res) => {
  try {
    const { weekId, kpiId, actualValue, notes } = req.body;
    
    if (!weekId || !kpiId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: weekId, kpiId' 
      });
    }

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

    // Check if entry already exists
    const existingEntries = await storage.getWeeklyDataEntries();
    const existingEntry = existingEntries.find(e => e.weekId === weekId && e.kpiId === kpiId);
    
    let result;
    if (existingEntry) {
      result = await storage.updateWeeklyDataEntry(existingEntry.id, {
        actualValue: numericActualValue,
        notes: notes || null
      });
      res.json(result);
    } else {
      result = await storage.createWeeklyDataEntry({
        weekId,
        kpiId,
        actualValue: numericActualValue,
        notes: notes || null
      });
      res.status(201).json(result);
    }
  } catch (error) {
    console.error('Error creating/updating weekly data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.patch("/api/weekly-data/:id", async (req, res) => {
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

// Weeks endpoints
app.get("/api/weeks", async (req, res) => {
  try {
    const weeks = await storage.getWeeks();
    res.json(weeks);
  } catch (error) {
    console.error('Error fetching weeks:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

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

app.patch("/api/weeks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { year, weekNumber, month, startDateString, endDateString } = req.body;
    
    const updateData = {
      year: parseInt(year),
      weekNumber: parseInt(weekNumber),
      month: parseInt(month),
      startDateString,
      endDateString
    };

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
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Subcategories endpoints
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

app.patch("/api/sub-categories/:id", async (req, res) => {
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
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Login endpoint (basic for testing)
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // For now, accept any login for testing
    const tokens = {
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token'
    };

    res.json({ tokens, user: { id: 'test-user-id', email, role: 'admin' } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

const server = createServer(app);

async function initializeApp() {
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`serving on port ${PORT}`);
  });
}

initializeApp().catch(console.error);