import express from "express";
import { createServer } from "http";
import { setupVite, serveStatic } from "./vite";

// In-memory storage for immediate functionality
class SimpleStorage {
  data = {
    cvjStages: [
      {
        id: "1", name: "Aware", displayOrder: 1, colorCode: "bg-blue-500",
        subCategories: [
          { id: "1", name: "SEO & Content Marketing", displayOrder: 1, stageId: "1" },
          { id: "2", name: "Social Media Marketing", displayOrder: 2, stageId: "1" }
        ]
      },
      {
        id: "2", name: "Engage", displayOrder: 2, colorCode: "bg-green-500",
        subCategories: [
          { id: "3", name: "Email Marketing", displayOrder: 1, stageId: "2" },
          { id: "4", name: "Content Engagement", displayOrder: 2, stageId: "2" }
        ]
      },
      {
        id: "3", name: "Subscribe", displayOrder: 3, colorCode: "bg-yellow-500",
        subCategories: [{ id: "5", name: "Lead Generation", displayOrder: 1, stageId: "3" }]
      },
      {
        id: "4", name: "Convert", displayOrder: 4, colorCode: "bg-orange-500",
        subCategories: [{ id: "6", name: "Sales Conversion", displayOrder: 1, stageId: "4" }]
      },
      {
        id: "5", name: "Excite", displayOrder: 5, colorCode: "bg-red-500",
        subCategories: [{ id: "7", name: "Customer Onboarding", displayOrder: 1, stageId: "5" }]
      },
      {
        id: "6", name: "Ascend", displayOrder: 6, colorCode: "bg-purple-500",
        subCategories: [{ id: "8", name: "Upsell & Cross-sell", displayOrder: 1, stageId: "6" }]
      },
      {
        id: "7", name: "Advocate", displayOrder: 7, colorCode: "bg-indigo-500",
        subCategories: [{ id: "9", name: "Customer Success", displayOrder: 1, stageId: "7" }]
      },
      {
        id: "8", name: "Promote", displayOrder: 8, colorCode: "bg-pink-500",
        subCategories: [{ id: "10", name: "Referral Programs", displayOrder: 1, stageId: "8" }]
      }
    ],
    kpis: [
      { id: "kpi1", name: "Website Traffic", description: "Monthly website visitors", unitType: "number", defaultMonthlyTargetValue: 10000, isActive: true },
      { id: "kpi2", name: "Email Open Rate", description: "Email campaign open rate", unitType: "percentage", defaultMonthlyTargetValue: 25, isActive: true },
      { id: "kpi3", name: "Lead Conversion Rate", description: "Percentage of leads that convert", unitType: "percentage", defaultMonthlyTargetValue: 15, isActive: true }
    ],
    weeks: [
      { id: "week1", year: 2024, weekNumber: 20, month: 5, startDateString: "2024-05-13", endDateString: "2024-05-19" },
      { id: "week2", year: 2024, weekNumber: 21, month: 5, startDateString: "2024-05-20", endDateString: "2024-05-26" },
      { id: "week3", year: 2024, weekNumber: 22, month: 5, startDateString: "2024-05-27", endDateString: "2024-06-02" }
    ],
    monthlyTargets: [
      { id: "target1", kpiId: "kpi1", monthId: "2024-05", targetValue: 10000 },
      { id: "target2", kpiId: "kpi2", monthId: "2024-05", targetValue: 25 },
      { id: "target3", kpiId: "kpi3", monthId: "2024-05", targetValue: 15 }
    ]
  };

  async getCVJStages() { return this.data.cvjStages; }
  async getKPIs() { return this.data.kpis; }
  async getWeeks() { return this.data.weeks; }
  async getMonthlyTargets() { return this.data.monthlyTargets; }
  async getWeeklyDataEntries() { return []; }
  async getSubCategories() {
    return this.data.cvjStages.flatMap(stage => stage.subCategories);
  }

  async createSubCategory(data) {
    const newId = String(Date.now());
    const newSubCategory = { ...data, id: newId };
    const stage = this.data.cvjStages.find(s => s.id === data.stageId);
    if (stage) {
      stage.subCategories.push(newSubCategory);
    }
    return newSubCategory;
  }

  async updateSubCategory(id, data) {
    for (const stage of this.data.cvjStages) {
      const subCat = stage.subCategories.find(sc => sc.id === id);
      if (subCat) {
        Object.assign(subCat, data);
        return subCat;
      }
    }
    throw new Error('Subcategory not found');
  }

  async deleteSubCategory(id) {
    for (const stage of this.data.cvjStages) {
      const index = stage.subCategories.findIndex(sc => sc.id === id);
      if (index !== -1) {
        stage.subCategories.splice(index, 1);
        return;
      }
    }
    throw new Error('Subcategory not found');
  }
}

const storage = new SimpleStorage();

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