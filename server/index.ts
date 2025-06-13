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

// Utility function for ISO week calculation
const getISOWeek = (date: Date): number => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};

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

// CVJ Stages with hierarchy
app.get("/api/cvj-stages-hierarchy", async (req, res) => {
  try {
    const stages = await storage.getCvjStages();
    const subCategories = await storage.getSubCategories();
    const kpis = await storage.getKpis();
    
    // Build hierarchy structure
    const stagesWithHierarchy = stages.map(stage => ({
      ...stage,
      subCategories: subCategories
        .filter(sub => sub.cvjStageId === stage.id)
        .map(sub => ({
          ...sub,
          kpis: kpis.filter(kpi => kpi.subCategoryId === sub.id)
        }))
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    })).sort((a, b) => a.displayOrder - b.displayOrder);
    
    res.json(stagesWithHierarchy);
  } catch (error) {
    console.error('Error fetching CVJ stages hierarchy:', error);
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

// POST endpoint for updating KPIs (to avoid Vite routing conflicts)
app.post("/api/kpis/update", async (req, res) => {
  try {
    const { id, name, description, unitType, defaultMonthlyTargetValue, subCategoryId } = req.body;
    console.log('Updating KPI with ID:', id);
    console.log('Request body:', req.body);
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'KPI ID is required' 
      });
    }
    
    const updateData = {
      name,
      description,
      unitType,
      defaultMonthlyTargetValue: defaultMonthlyTargetValue ? parseFloat(defaultMonthlyTargetValue) : null,
      subCategoryId
    };

    console.log('Update data:', updateData);
    const updatedKPI = await storage.updateKpi(id, updateData);
    console.log('Updated KPI result:', updatedKPI);
    res.json(updatedKPI);
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.put("/api/kpis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unitType, defaultMonthlyTargetValue, subCategoryId } = req.body;
    
    const updateData = {
      name,
      description,
      unitType,
      defaultMonthlyTargetValue: defaultMonthlyTargetValue ? parseFloat(defaultMonthlyTargetValue) : null,
      subCategoryId
    };

    const updatedKPI = await storage.updateKpi(id, updateData);
    res.json(updatedKPI);
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE endpoint that the API client expects
app.delete("/api/kpis/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteKpi(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting KPI:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Keep the POST endpoint for compatibility
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

// PUT endpoint for updating monthly targets
app.put("/api/monthly-targets/:id", async (req, res) => {
  try {
    const { id } = req.params;
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

    const updateData = {
      kpiId,
      monthId,
      targetValue: numericTargetValue
    };

    const result = await storage.updateMonthlyKpiTarget(id, updateData);
    res.json(result);
  } catch (error) {
    console.error('Error updating monthly target:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE endpoint for monthly targets
app.delete("/api/monthly-targets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteMonthlyKpiTarget(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting monthly target:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Keep the POST endpoint for compatibility
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

// Bulk weekly data endpoint for data entry form - using direct path to bypass Vite
app.post("/data-save", async (req, res) => {
  try {
    console.log('Bulk weekly data request:', req.body);
    const { entries } = req.body;
    
    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ 
        success: false, 
        message: 'entries array is required' 
      });
    }

    const results = [];
    
    for (const entry of entries) {
      const { weekId, kpiId, actualValue, notes } = entry;
      
      if (!weekId || !kpiId) {
        console.error('Missing required fields in entry:', entry);
        continue;
      }

      let numericActualValue = null;
      if (actualValue !== undefined && actualValue !== null && actualValue !== '') {
        numericActualValue = parseFloat(actualValue);
        if (isNaN(numericActualValue)) {
          console.error('Invalid actualValue in entry:', entry);
          continue;
        }
      }

      try {
        // Check if entry already exists
        const existingEntries = await storage.getWeeklyDataEntries();
        const existingEntry = existingEntries.find(e => e.weekId === weekId && e.kpiId === kpiId);
        
        let result;
        if (existingEntry) {
          result = await storage.updateWeeklyDataEntry(existingEntry.id, {
            actualValue: numericActualValue,
            notes: notes || null
          });
        } else {
          result = await storage.createWeeklyDataEntry({
            weekId,
            kpiId,
            actualValue: numericActualValue,
            notes: notes || null
          });
        }
        results.push(result);
      } catch (entryError) {
        console.error('Error processing entry:', entry, entryError);
        // Continue with other entries
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error in bulk weekly data operation:', error);
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
    console.log('Week creation request body:', req.body);
    const { startDate, endDate, displayName, originalId } = req.body;
    console.log('Extracted fields:', { startDate, endDate, displayName, originalId });
    
    if (!startDate || !endDate) {
      console.log('Missing required fields - startDate:', startDate, 'endDate:', endDate);
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    // Parse dates and calculate derived fields
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (endDateObj <= startDateObj) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }

    const year = startDateObj.getFullYear();
    const month = startDateObj.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Use the global getISOWeek function
    
    const weekNumber = getISOWeek(startDateObj);
    
    // Generate ID if not editing
    const id = originalId || (displayName || `Week ${weekNumber} [${startDate.slice(5).replace('-', '/')}-${endDate.slice(5).replace('-', '/')}]`);

    const weekData = {
      id,
      displayName: displayName || null,
      year,
      weekNumber,
      month,
      startDateString: startDate,
      endDateString: endDate
    };

    let newWeek;
    if (originalId) {
      // Update existing week
      newWeek = await storage.updateWeek(originalId, weekData);
    } else {
      // Create new week
      newWeek = await storage.createWeek(weekData);
    }
    
    res.status(201).json(newWeek);
  } catch (error) {
    console.error('Error creating/updating week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST endpoint for updating weeks (to avoid Vite routing conflicts)
app.post("/api/weeks/update", async (req, res) => {
  try {
    const { id, originalId, startDate, endDate, displayName } = req.body;
    const weekId = id || originalId;
    console.log('Updating week with ID:', weekId);
    console.log('Request body:', req.body);
    
    if (!weekId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: id (or originalId), startDate, endDate' 
      });
    }
    
    // Convert to the format expected by storage layer
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    const updateData = {
      year: startDateObj.getFullYear(),
      weekNumber: getISOWeek(startDateObj),
      month: startDateObj.getMonth() + 1,
      startDateString: startDate,
      endDateString: endDate,
      displayName: displayName || null
    };

    console.log('Update data:', updateData);
    const updatedWeek = await storage.updateWeek(weekId, updateData);
    console.log('Updated week result:', updatedWeek);
    res.json(updatedWeek);
  } catch (error) {
    console.error('Error updating week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Keep the PUT endpoint for compatibility
app.put("/api/weeks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating week with ID:', id);
    console.log('Request body:', req.body);
    
    const { year, weekNumber, month, startDateString, endDateString } = req.body;
    
    if (!year || !weekNumber || !month || !startDateString || !endDateString) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: year, weekNumber, month, startDateString, endDateString' 
      });
    }
    
    const updateData = {
      year: parseInt(year),
      weekNumber: parseInt(weekNumber),
      month: parseInt(month),
      startDateString,
      endDateString
    };

    console.log('Update data:', updateData);
    const updatedWeek = await storage.updateWeek(id, updateData);
    console.log('Updated week result:', updatedWeek);
    res.json(updatedWeek);
  } catch (error) {
    console.error('Error updating week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE endpoint that the API client expects
app.delete("/api/weeks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Attempting to delete week with id: "${id}"`);
    
    // Direct database deletion to handle special characters properly
    const { db } = await import('./db');
    const { weeks } = await import('../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const result = await db.delete(weeks).where(eq(weeks.id, id));
    console.log(`Delete operation result:`, result);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting week:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Keep the POST endpoint for compatibility
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

// Subcategories endpoints (both with and without dash for compatibility)
app.get("/api/subcategories", async (req, res) => {
  try {
    const subCategories = await storage.getSubCategories();
    res.json(subCategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

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

// POST endpoint for updating subcategories (to avoid Vite routing conflicts)
app.post("/api/sub-categories/update", async (req, res) => {
  try {
    const { id, name, stageId, displayOrder } = req.body;
    console.log('Updating subcategory with ID:', id);
    console.log('Request body:', req.body);
    
    if (!id || !name || !stageId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: id, name, stageId' 
      });
    }
    
    const updateData = {
      name,
      cvjStageId: stageId,
      displayOrder: displayOrder || 1
    };

    console.log('Update data:', updateData);
    const updatedSubCategory = await storage.updateSubCategory(id, updateData);
    console.log('Updated subcategory result:', updatedSubCategory);
    res.json(updatedSubCategory);
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Keep the PUT endpoint for compatibility
app.put("/api/sub-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Updating subcategory with ID:', id);
    console.log('Request body:', req.body);
    
    const { name, stageId, displayOrder } = req.body;
    const updateData = {
      name,
      cvjStageId: stageId,
      displayOrder
    };
    console.log('Update data:', updateData);
    
    const updatedSubCategory = await storage.updateSubCategory(id, updateData);
    console.log('Updated subcategory result:', updatedSubCategory);
    res.json(updatedSubCategory);
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE endpoint that the API client expects
app.delete("/api/sub-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteSubCategory(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Keep the POST endpoint for compatibility
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
      refreshToken: 'test-refresh-token',
      expiresIn: 3600
    };

    res.json({ 
      tokens, 
      user: { 
        id: 'test-user-id', 
        email, 
        firstName: 'Test',
        lastName: 'User',
        role: 'admin' 
      } 
    });
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