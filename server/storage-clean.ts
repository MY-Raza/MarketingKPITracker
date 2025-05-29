// Clean storage implementation
import { db } from "./db";
import { 
  cvjStages, 
  subCategories, 
  kpis, 
  weeks, 
  weeklyDataEntries, 
  monthlyKpiTargets
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Dashboard Data
  getDashboardDataForMonth(monthId: string): Promise<any>;
  
  // CVJ Stages
  getCVJStages(): Promise<any[]>;
  getCVJStageById(id: string): Promise<any | undefined>;
  getSubCategoriesByStageId(stageId: string): Promise<any[]>;
  getCvjStages(): Promise<any[]>;
  
  // Sub Categories
  getSubCategories(): Promise<any[]>;
  getSubCategoryById(id: string): Promise<any | undefined>;
  createSubCategory(data: any): Promise<any>;
  updateSubCategory(id: string, data: any): Promise<any>;
  deleteSubCategory(id: string): Promise<void>;
  
  // KPIs
  getKPIs(): Promise<any[]>;
  getKPIById(id: string): Promise<any | undefined>;
  createKPI(data: any): Promise<any>;
  updateKPI(id: string, data: any): Promise<any>;
  deleteKPI(id: string): Promise<void>;
  
  // Weeks
  getWeeks(): Promise<any[]>;
  getWeekById(id: string): Promise<any | undefined>;
  createWeek(data: any): Promise<any>;
  updateWeek(id: string, data: any): Promise<any>;
  deleteWeek(id: string): Promise<void>;
  
  // Weekly Data
  getWeeklyDataEntries(filters?: any): Promise<any[]>;
  createWeeklyDataEntry(data: any): Promise<any>;
  updateWeeklyDataEntry(id: string, data: any): Promise<any>;
  deleteWeeklyDataEntry(id: string): Promise<void>;
  
  // Monthly Targets
  getMonthlyTargets(): Promise<any[]>;
  createMonthlyTarget(data: any): Promise<any>;
  updateMonthlyTarget(id: string, data: any): Promise<any>;
  deleteMonthlyTarget(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Dashboard Data
  async getDashboardDataForMonth(monthId: string): Promise<any> {
    return {
      monthId,
      cvjStages: await this.getCVJStages(),
      kpis: await this.getKPIs(),
      weeklyData: await this.getWeeklyDataEntries(),
      monthlyTargets: await this.getMonthlyTargets()
    };
  }

  // CVJ Stages
  async getCVJStages(): Promise<any[]> {
    try {
      const stages = await db.select().from(cvjStages).orderBy(cvjStages.displayOrder);
      
      const stagesWithSubcategories = await Promise.all(
        stages.map(async (stage) => {
          const subs = await db.select().from(subCategories)
            .where(eq(subCategories.cvjStageId, stage.id))
            .orderBy(subCategories.displayOrder);
          
          const subcategoriesWithKpis = await Promise.all(
            subs.map(async (sub) => {
              const kpiList = await db.select().from(kpis)
                .where(eq(kpis.subCategoryId, sub.id))
                .orderBy(kpis.name);
              
              return {
                ...sub,
                kpis: kpiList
              };
            })
          );
          
          return {
            ...stage,
            subCategories: subcategoriesWithKpis
          };
        })
      );
      
      return stagesWithSubcategories;
    } catch (error) {
      console.error('Error in getCVJStages:', error);
      throw error;
    }
  }

  async getCvjStages(): Promise<any[]> {
    return await this.getCVJStages();
  }

  async getCVJStageById(id: string): Promise<any | undefined> {
    const result = await db.select().from(cvjStages).where(eq(cvjStages.id, id));
    return result[0] || undefined;
  }

  async getSubCategoriesByStageId(stageId: string): Promise<any[]> {
    const result = await db.select().from(subCategories).where(eq(subCategories.cvjStageId, stageId));
    return result;
  }

  // Sub Categories
  async getSubCategories(): Promise<any[]> {
    const result = await db.select().from(subCategories);
    return result;
  }

  async getSubCategoryById(id: string): Promise<any | undefined> {
    const result = await db.select().from(subCategories).where(eq(subCategories.id, id));
    return result[0] || undefined;
  }

  async createSubCategory(data: any): Promise<any> {
    const [result] = await db.insert(subCategories).values(data).returning();
    return result;
  }

  async updateSubCategory(id: string, data: any): Promise<any> {
    const [result] = await db.update(subCategories).set(data).where(eq(subCategories.id, id)).returning();
    return result;
  }

  async deleteSubCategory(id: string): Promise<void> {
    await db.delete(subCategories).where(eq(subCategories.id, id));
  }

  // KPIs
  async getKPIs(): Promise<any[]> {
    const result = await db.select().from(kpis);
    return result;
  }

  async getKPIById(id: string): Promise<any | undefined> {
    const result = await db.select().from(kpis).where(eq(kpis.id, id));
    return result[0] || undefined;
  }

  async createKPI(data: any): Promise<any> {
    const [result] = await db.insert(kpis).values(data).returning();
    return result;
  }

  async updateKPI(id: string, data: any): Promise<any> {
    const [result] = await db.update(kpis).set(data).where(eq(kpis.id, id)).returning();
    return result;
  }

  async deleteKPI(id: string): Promise<void> {
    await db.delete(kpis).where(eq(kpis.id, id));
  }

  // Weeks
  async getWeeks(): Promise<any[]> {
    const result = await db.select().from(weeks);
    return result;
  }

  async getWeekById(id: string): Promise<any | undefined> {
    const result = await db.select().from(weeks).where(eq(weeks.id, id));
    return result[0] || undefined;
  }

  async createWeek(data: any): Promise<any> {
    const [result] = await db.insert(weeks).values(data).returning();
    return result;
  }

  async updateWeek(id: string, data: any): Promise<any> {
    const [result] = await db.update(weeks).set(data).where(eq(weeks.id, id)).returning();
    return result;
  }

  async deleteWeek(id: string): Promise<void> {
    await db.delete(weeks).where(eq(weeks.id, id));
  }

  // Weekly Data
  async getWeeklyDataEntries(filters?: any): Promise<any[]> {
    const result = await db.select().from(weeklyDataEntries);
    return result;
  }

  async createWeeklyDataEntry(data: any): Promise<any> {
    const [result] = await db.insert(weeklyDataEntries).values(data).returning();
    return result;
  }

  async updateWeeklyDataEntry(id: string, data: any): Promise<any> {
    const [result] = await db.update(weeklyDataEntries).set(data).where(eq(weeklyDataEntries.id, id)).returning();
    return result;
  }

  async deleteWeeklyDataEntry(id: string): Promise<void> {
    await db.delete(weeklyDataEntries).where(eq(weeklyDataEntries.id, id));
  }

  // Monthly Targets
  async getMonthlyTargets(): Promise<any[]> {
    const result = await db.select().from(monthlyKpiTargets);
    return result;
  }

  async createMonthlyTarget(data: any): Promise<any> {
    const [result] = await db.insert(monthlyKpiTargets).values(data).returning();
    return result;
  }

  async updateMonthlyTarget(id: string, data: any): Promise<any> {
    const [result] = await db.update(monthlyKpiTargets).set(data).where(eq(monthlyKpiTargets.id, id)).returning();
    return result;
  }

  async deleteMonthlyTarget(id: string): Promise<void> {
    await db.delete(monthlyKpiTargets).where(eq(monthlyKpiTargets.id, id));
  }
}

export const storage = new DatabaseStorage();