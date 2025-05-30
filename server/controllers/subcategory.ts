import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// GET /api/subcategories
router.get("/", async (req, res) => {
  try {
    const subcategories = await storage.getSubCategories();
    res.json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ error: "Failed to fetch subcategories" });
  }
});

// GET /api/subcategories/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await storage.getSubCategoryById(id);
    
    if (!subcategory) {
      return res.status(404).json({ error: "Subcategory not found" });
    }
    
    res.json(subcategory);
  } catch (error) {
    console.error("Error fetching subcategory:", error);
    res.status(500).json({ error: "Failed to fetch subcategory" });
  }
});

// POST /api/subcategories
router.post("/", async (req, res) => {
  try {
    const subcategory = await storage.createSubCategory(req.body);
    res.status(201).json(subcategory);
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({ error: "Failed to create subcategory" });
  }
});

// PUT /api/subcategories/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const subcategory = await storage.updateSubCategory(id, req.body);
    res.json(subcategory);
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ error: "Failed to update subcategory" });
  }
});

// DELETE /api/subcategories/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteSubCategory(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ error: "Failed to delete subcategory" });
  }
});

export default router;