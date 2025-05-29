// Temporary storage implementation to bypass complex query issues
import { db } from "./db";
import { 
  cvjStages, 
  subCategories, 
  kpis, 
  weeks, 
  weeklyDataEntries, 
  monthlyKpiTargets,
  type CVJStage,
  type SubCategory,
  type KPI,
  type Week,
  type WeeklyDataEntry,
  type MonthlyKpiTarget
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // CVJ Stages
  getCVJStages(): Promise<CVJStage[]>;
  getCVJStageById(id: string): Promise<CVJStage | undefined>;
  
  // Sub Categories
  getSubCategories(): Promise<SubCategory[]>;
  getSubCategoryById(id: string): Promise<SubCategory | undefined>;
  createSubCategory(data: any): Promise<SubCategory>;
  updateSubCategory(id: string, data: any): Promise<SubCategory>;
  deleteSubCategory(id: string): Promise<void>;
  
  // KPIs
  getKPIs(): Promise<KPI[]>;
  getKPIById(id: string): Promise<KPI | undefined>;
  createKPI(data: any): Promise<KPI>;
  updateKPI(id: string, data: any): Promise<KPI>;
  deleteKPI(id: string): Promise<void>;
  
  // Weeks
  getWeeks(): Promise<Week[]>;
  getWeekById(id: string): Promise<Week | undefined>;
  createWeek(data: any): Promise<Week>;
  updateWeek(id: string, data: any): Promise<Week>;
  deleteWeek(id: string): Promise<void>;
  
  // Weekly Data
  getWeeklyDataEntries(filters?: any): Promise<WeeklyDataEntry[]>;
  createWeeklyDataEntry(data: any): Promise<WeeklyDataEntry>;
  updateWeeklyDataEntry(id: string, data: any): Promise<WeeklyDataEntry>;
  deleteWeeklyDataEntry(id: string): Promise<void>;
  
  // Monthly Targets
  getMonthlyTargets(): Promise<MonthlyKpiTarget[]>;
  createMonthlyTarget(data: any): Promise<MonthlyKpiTarget>;
  updateMonthlyTarget(id: string, data: any): Promise<MonthlyKpiTarget>;
  deleteMonthlyTarget(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // CVJ Stages
  async getCVJStages(): Promise<CVJStage[]> {
    return await db.select().from(cvjStages);
  }

  async getCVJStageById(id: string): Promise<CVJStage | undefined> {
    const result = await db.select().from(cvjStages).where(eq(cvjStages.id, id));
    return result[0];
  }

  // Sub Categories
  async getSubCategories(): Promise<SubCategory[]> {
    return await db.select().from(subCategories);
  }

  async getSubCategoryById(id: string): Promise<SubCategory | undefined> {
    const result = await db.select().from(subCategories).where(eq(subCategories.id, id));
    return result[0];
  }

  async createSubCategory(data: any): Promise<SubCategory> {
    const result = await db.insert(subCategories).values({
      name: data.name,
      displayOrder: data.displayOrder,
      cvjStageId: data.cvjStageId
    }).returning();
    return result[0];
  }

  async updateSubCategory(id: string, data: any): Promise<SubCategory> {
    const result = await db.update(subCategories)
      .set({
        name: data.name,
        displayOrder: data.displayOrder,
        cvjStageId: data.cvjStageId,
        updatedAt: new Date()
      })
      .where(eq(subCategories.id, id))
      .returning();
    return result[0];
  }

  async deleteSubCategory(id: string): Promise<void> {
    await db.delete(subCategories).where(eq(subCategories.id, id));
  }

  // KPIs
  async getKPIs(): Promise<KPI[]> {
    return await db.select().from(kpis);
  }

  async getKPIById(id: string): Promise<KPI | undefined> {
    const result = await db.select().from(kpis).where(eq(kpis.id, id));
    return result[0];
  }

  async createKPI(data: any): Promise<KPI> {
    const result = await db.insert(kpis).values({
      name: data.name,
      description: data.description,
      unitType: data.unitType,
      defaultMonthlyTargetValue: data.defaultMonthlyTargetValue,
      subCategoryId: data.subCategoryId
    }).returning();
    return result[0];
  }

  async updateKPI(id: string, data: any): Promise<KPI> {
    const result = await db.update(kpis)
      .set({
        name: data.name,
        description: data.description,
        unitType: data.unitType,
        defaultMonthlyTargetValue: data.defaultMonthlyTargetValue,
        subCategoryId: data.subCategoryId,
        updatedAt: new Date()
      })
      .where(eq(kpis.id, id))
      .returning();
    return result[0];
  }

  async deleteKPI(id: string): Promise<void> {
    await db.delete(kpis).where(eq(kpis.id, id));
  }

  // Weeks
  async getWeeks(): Promise<Week[]> {
    return await db.select().from(weeks);
  }

  async getWeekById(id: string): Promise<Week | undefined> {
    const result = await db.select().from(weeks).where(eq(weeks.id, id));
    return result[0];
  }

  async createWeek(data: any): Promise<Week> {
    const result = await db.insert(weeks).values({
      year: data.year,
      weekNumber: data.weekNumber,
      month: data.month,
      startDateString: data.startDateString,
      endDateString: data.endDateString
    }).returning();
    return result[0];
  }

  async updateWeek(id: string, data: any): Promise<Week> {
    const result = await db.update(weeks)
      .set({
        year: data.year,
        weekNumber: data.weekNumber,
        month: data.month,
        startDateString: data.startDateString,
        endDateString: data.endDateString,
        updatedAt: new Date()
      })
      .where(eq(weeks.id, id))
      .returning();
    return result[0];
  }

  async deleteWeek(id: string): Promise<void> {
    await db.delete(weeks).where(eq(weeks.id, id));
  }

  // Weekly Data
  async getWeeklyDataEntries(filters?: any): Promise<WeeklyDataEntry[]> {
    return await db.select().from(weeklyDataEntries);
  }

  async createWeeklyDataEntry(data: any): Promise<WeeklyDataEntry> {
    const result = await db.insert(weeklyDataEntries).values({
      weekId: data.weekId,
      kpiId: data.kpiId,
      actualValue: data.actualValue,
      notes: data.notes
    }).returning();
    return result[0];
  }

  async updateWeeklyDataEntry(id: string, data: any): Promise<WeeklyDataEntry> {
    const result = await db.update(weeklyDataEntries)
      .set({
        weekId: data.weekId,
        kpiId: data.kpiId,
        actualValue: data.actualValue,
        notes: data.notes,
        updatedAt: new Date()
      })
      .where(eq(weeklyDataEntries.id, id))
      .returning();
    return result[0];
  }

  async deleteWeeklyDataEntry(id: string): Promise<void> {
    await db.delete(weeklyDataEntries).where(eq(weeklyDataEntries.id, id));
  }

  // Monthly Targets
  async getMonthlyTargets(): Promise<MonthlyKpiTarget[]> {
    return await db.select().from(monthlyKpiTargets);
  }

  async createMonthlyTarget(data: any): Promise<MonthlyKpiTarget> {
    const result = await db.insert(monthlyKpiTargets).values({
      kpiId: data.kpiId,
      monthId: data.monthId,
      targetValue: data.targetValue
    }).returning();
    return result[0];
  }

  async updateMonthlyTarget(id: string, data: any): Promise<MonthlyKpiTarget> {
    const result = await db.update(monthlyKpiTargets)
      .set({
        kpiId: data.kpiId,
        monthId: data.monthId,
        targetValue: data.targetValue,
        updatedAt: new Date()
      })
      .where(eq(monthlyKpiTargets.id, id))
      .returning();
    return result[0];
  }

  async deleteMonthlyTarget(id: string): Promise<void> {
    await db.delete(monthlyKpiTargets).where(eq(monthlyKpiTargets.id, id));
  }
}

export const storage = new DatabaseStorage();