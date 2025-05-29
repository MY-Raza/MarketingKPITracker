// Simplified storage implementation to bypass complex query issues
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
  // CVJ Stages
  getCVJStages(): Promise<any[]>;
  getCVJStageById(id: string): Promise<any | undefined>;
  
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
  // CVJ Stages
  async getCVJStages(): Promise<any[]> {
    const result = await db.select().from(cvjStages);
    return result;
  }

  async getCVJStageById(id: string): Promise<any | undefined> {
    const result = await db.select().from(cvjStages).where(eq(cvjStages.id, id));
    return result[0] || undefined;
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
    const result = await db.insert(subCategories).values(data).returning();
    return result[0];
  }

  async updateSubCategory(id: string, data: any): Promise<any> {
    const result = await db.update(subCategories)
      .set(data)
      .where(eq(subCategories.id, id))
      .returning();
    return result[0];
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
    const result = await db.insert(kpis).values(data).returning();
    return result[0];
  }

  async updateKPI(id: string, data: any): Promise<any> {
    const result = await db.update(kpis)
      .set(data)
      .where(eq(kpis.id, id))
      .returning();
    return result[0];
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
    const result = await db.insert(weeks).values(data).returning();
    return result[0];
  }

  async updateWeek(id: string, data: any): Promise<any> {
    const result = await db.update(weeks)
      .set(data)
      .where(eq(weeks.id, id))
      .returning();
    return result[0];
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
    const result = await db.insert(weeklyDataEntries).values(data).returning();
    return result[0];
  }

  async updateWeeklyDataEntry(id: string, data: any): Promise<any> {
    const result = await db.update(weeklyDataEntries)
      .set(data)
      .where(eq(weeklyDataEntries.id, id))
      .returning();
    return result[0];
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
    const result = await db.insert(monthlyKpiTargets).values(data).returning();
    return result[0];
  }

  async updateMonthlyTarget(id: string, data: any): Promise<any> {
    const result = await db.update(monthlyKpiTargets)
      .set(data)
      .where(eq(monthlyKpiTargets.id, id))
      .returning();
    return result[0];
  }

  async deleteMonthlyTarget(id: string): Promise<void> {
    await db.delete(monthlyKpiTargets).where(eq(monthlyKpiTargets.id, id));
  }
}

export const storage = new DatabaseStorage();