import { 
  users, 
  cvjStages, 
  subCategories, 
  kpis, 
  weeks, 
  weeklyDataEntries, 
  monthlyKpiTargets, 
  refreshTokens,
  type User, 
  type InsertUser,
  type CvjStage,
  type InsertCvjStage,
  type SubCategory,
  type InsertSubCategory,
  type Kpi,
  type InsertKpi,
  type Week,
  type InsertWeek,
  type WeeklyDataEntry,
  type InsertWeeklyDataEntry,
  type MonthlyKpiTarget,
  type InsertMonthlyKpiTarget,
  type RefreshToken,
  type InsertRefreshToken
} from "@shared/schema";
import { db, withRetry } from "./db";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
  // Refresh token operations
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteUserRefreshTokens(userId: string): Promise<void>;
  
  // CVJ Stage operations
  getCvjStages(includeInactive?: boolean): Promise<CvjStage[]>;
  getCvjStageById(id: string): Promise<CvjStage | undefined>;
  createCvjStage(stage: InsertCvjStage): Promise<CvjStage>;
  updateCvjStage(id: string, stage: Partial<InsertCvjStage>): Promise<CvjStage>;
  deleteCvjStage(id: string): Promise<void>;
  
  // Sub Category operations
  getSubCategories(): Promise<SubCategory[]>;
  getSubCategoriesByStageId(stageId: string): Promise<SubCategory[]>;
  getSubCategoryById(id: string): Promise<SubCategory | undefined>;
  createSubCategory(subCategory: InsertSubCategory): Promise<SubCategory>;
  updateSubCategory(id: string, subCategory: Partial<InsertSubCategory>): Promise<SubCategory>;
  deleteSubCategory(id: string): Promise<void>;
  
  // KPI operations
  getKpis(filters?: { stageId?: string; subCategoryId?: string; active?: boolean }): Promise<Kpi[]>;
  getKpiById(id: string): Promise<Kpi | undefined>;
  createKpi(kpi: InsertKpi): Promise<Kpi>;
  updateKpi(id: string, kpi: Partial<InsertKpi>): Promise<Kpi>;
  deleteKpi(id: string): Promise<void>;
  
  // Week operations
  getWeeks(): Promise<Week[]>;
  getWeekById(id: string): Promise<Week | undefined>;
  createWeek(week: InsertWeek): Promise<Week>;
  updateWeek(id: string, week: Partial<InsertWeek>): Promise<Week>;
  deleteWeek(id: string): Promise<void>;
  
  // Weekly Data Entry operations
  getWeeklyDataEntries(filters?: { weekId?: string; kpiId?: string; monthId?: string }): Promise<WeeklyDataEntry[]>;
  getWeeklyDataEntryById(id: string): Promise<WeeklyDataEntry | undefined>;
  createWeeklyDataEntry(entry: InsertWeeklyDataEntry): Promise<WeeklyDataEntry>;
  updateWeeklyDataEntry(id: string, entry: Partial<InsertWeeklyDataEntry>): Promise<WeeklyDataEntry>;
  deleteWeeklyDataEntry(id: string): Promise<void>;
  bulkUpsertWeeklyDataEntries(entries: InsertWeeklyDataEntry[]): Promise<WeeklyDataEntry[]>;
  
  // Monthly Target operations
  getMonthlyKpiTargets(filters?: { kpiId?: string; monthId?: string }): Promise<MonthlyKpiTarget[]>;
  getMonthlyKpiTargetById(id: string): Promise<MonthlyKpiTarget | undefined>;
  createMonthlyKpiTarget(target: InsertMonthlyKpiTarget): Promise<MonthlyKpiTarget>;
  updateMonthlyKpiTarget(id: string, target: Partial<InsertMonthlyKpiTarget>): Promise<MonthlyKpiTarget>;
  deleteMonthlyKpiTarget(id: string): Promise<void>;
  
  // Complex queries for dashboard
  getCvjStagesWithHierarchy(): Promise<any[]>;
  getKpisWithRelations(filters?: { stageId?: string; subCategoryId?: string; active?: boolean }): Promise<any[]>;
  getWeeklyDataWithRelations(filters?: { weekId?: string; kpiId?: string; monthId?: string }): Promise<any[]>;
  getDashboardDataForMonth(monthId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Refresh token operations
  async createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const [newToken] = await db.insert(refreshTokens).values(token).returning();
    return newToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token));
    return refreshToken || undefined;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  // CVJ Stage operations
  async getCvjStages(includeInactive = false): Promise<CvjStage[]> {
    const conditions = includeInactive ? undefined : eq(cvjStages.isActive, true);
    return await db
      .select()
      .from(cvjStages)
      .where(conditions)
      .orderBy(asc(cvjStages.displayOrder));
  }

  async getCvjStageById(id: string): Promise<CvjStage | undefined> {
    const [stage] = await db.select().from(cvjStages).where(eq(cvjStages.id, id));
    return stage || undefined;
  }

  async createCvjStage(stage: InsertCvjStage): Promise<CvjStage> {
    const [newStage] = await db.insert(cvjStages).values(stage).returning();
    return newStage;
  }

  async updateCvjStage(id: string, stage: Partial<InsertCvjStage>): Promise<CvjStage> {
    const [updatedStage] = await db
      .update(cvjStages)
      .set({ ...stage, updatedAt: new Date() })
      .where(eq(cvjStages.id, id))
      .returning();
    return updatedStage;
  }

  async deleteCvjStage(id: string): Promise<void> {
    await db.delete(cvjStages).where(eq(cvjStages.id, id));
  }

  // Sub Category operations
  async getSubCategories(): Promise<SubCategory[]> {
    return await db
      .select()
      .from(subCategories)
      .orderBy(asc(subCategories.displayOrder));
  }

  async getSubCategoriesByStageId(stageId: string): Promise<SubCategory[]> {
    return await db
      .select()
      .from(subCategories)
      .where(eq(subCategories.cvjStageId, stageId))
      .orderBy(asc(subCategories.displayOrder));
  }

  async getSubCategoryById(id: string): Promise<SubCategory | undefined> {
    const [subCategory] = await db.select().from(subCategories).where(eq(subCategories.id, id));
    return subCategory || undefined;
  }

  async createSubCategory(subCategory: InsertSubCategory): Promise<SubCategory> {
    const [newSubCategory] = await db.insert(subCategories).values(subCategory).returning();
    return newSubCategory;
  }

  async updateSubCategory(id: string, subCategory: Partial<InsertSubCategory>): Promise<SubCategory> {
    const [updatedSubCategory] = await db
      .update(subCategories)
      .set({ ...subCategory, updatedAt: new Date() })
      .where(eq(subCategories.id, id))
      .returning();
    return updatedSubCategory;
  }

  async deleteSubCategory(id: string): Promise<void> {
    await db.delete(subCategories).where(eq(subCategories.id, id));
  }

  // KPI operations
  async getKpis(filters?: { stageId?: string; subCategoryId?: string; active?: boolean }): Promise<Kpi[]> {
    if (filters?.subCategoryId) {
      return await db.select().from(kpis).where(eq(kpis.subCategoryId, filters.subCategoryId));
    }
    
    if (filters?.active !== undefined) {
      return await db.select().from(kpis).where(eq(kpis.isActive, filters.active));
    }
    
    return await db.select().from(kpis);
  }

  async getKpiById(id: string): Promise<Kpi | undefined> {
    const [kpi] = await db.select().from(kpis).where(eq(kpis.id, id));
    return kpi || undefined;
  }

  async createKpi(kpi: InsertKpi): Promise<Kpi> {
    const [newKpi] = await db.insert(kpis).values(kpi).returning();
    return newKpi;
  }

  async updateKpi(id: string, kpi: Partial<InsertKpi>): Promise<Kpi> {
    const [updatedKpi] = await db
      .update(kpis)
      .set({ ...kpi, updatedAt: new Date() })
      .where(eq(kpis.id, id))
      .returning();
    return updatedKpi;
  }

  async deleteKpi(id: string): Promise<void> {
    await db.delete(kpis).where(eq(kpis.id, id));
  }

  // Week operations
  async getWeeks(): Promise<Week[]> {
    return await db
      .select()
      .from(weeks)
      .orderBy(desc(weeks.year), desc(weeks.weekNumber));
  }

  async getWeekById(id: string): Promise<Week | undefined> {
    const [week] = await db.select().from(weeks).where(eq(weeks.id, id));
    return week || undefined;
  }

  async createWeek(week: InsertWeek): Promise<Week> {
    const [newWeek] = await db.insert(weeks).values(week).returning();
    return newWeek;
  }

  async updateWeek(id: string, week: Partial<InsertWeek>): Promise<Week> {
    const [updatedWeek] = await db
      .update(weeks)
      .set({ ...week, updatedAt: new Date() })
      .where(eq(weeks.id, id))
      .returning();
    return updatedWeek;
  }

  async deleteWeek(id: string): Promise<void> {
    console.log(`Attempting to delete week with id: "${id}"`);
    const result = await db.delete(weeks).where(eq(weeks.id, id));
    console.log(`Delete operation result:`, result);
  }

  // Weekly Data Entry operations
  async getWeeklyDataEntries(filters?: { weekId?: string; kpiId?: string; monthId?: string }): Promise<WeeklyDataEntry[]> {
    return await withRetry(async () => {
      let query = db.select().from(weeklyDataEntries);
      
      if (filters?.weekId) {
        query = query.where(eq(weeklyDataEntries.weekId, filters.weekId));
      }
      
      if (filters?.kpiId) {
        query = query.where(eq(weeklyDataEntries.kpiId, filters.kpiId));
      }
      
      return await query.orderBy(desc(weeklyDataEntries.createdAt));
    });
  }

  async getWeeklyDataEntryById(id: string): Promise<WeeklyDataEntry | undefined> {
    const [entry] = await db.select().from(weeklyDataEntries).where(eq(weeklyDataEntries.id, id));
    return entry || undefined;
  }

  async createWeeklyDataEntry(entry: InsertWeeklyDataEntry): Promise<WeeklyDataEntry> {
    const [newEntry] = await db.insert(weeklyDataEntries).values(entry).returning();
    return newEntry;
  }

  async updateWeeklyDataEntry(id: string, entry: Partial<InsertWeeklyDataEntry>): Promise<WeeklyDataEntry> {
    const [updatedEntry] = await db
      .update(weeklyDataEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(weeklyDataEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteWeeklyDataEntry(id: string): Promise<void> {
    await db.delete(weeklyDataEntries).where(eq(weeklyDataEntries.id, id));
  }

  async bulkUpsertWeeklyDataEntries(entries: InsertWeeklyDataEntry[]): Promise<WeeklyDataEntry[]> {
    const results: WeeklyDataEntry[] = [];
    
    for (const entry of entries) {
      const existing = await db
        .select()
        .from(weeklyDataEntries)
        .where(and(
          eq(weeklyDataEntries.weekId, entry.weekId),
          eq(weeklyDataEntries.kpiId, entry.kpiId)
        ));
      
      if (existing.length > 0) {
        const [updated] = await db
          .update(weeklyDataEntries)
          .set({ ...entry, updatedAt: new Date() })
          .where(eq(weeklyDataEntries.id, existing[0].id))
          .returning();
        results.push(updated);
      } else {
        const [created] = await db.insert(weeklyDataEntries).values(entry).returning();
        results.push(created);
      }
    }
    
    return results;
  }

  // Monthly Target operations
  async getMonthlyKpiTargets(filters?: { kpiId?: string; monthId?: string }): Promise<MonthlyKpiTarget[]> {
    return await withRetry(async () => {
      let query = db.select().from(monthlyKpiTargets);
      
      if (filters?.kpiId) {
        query = query.where(eq(monthlyKpiTargets.kpiId, filters.kpiId));
      }
      
      if (filters?.monthId) {
        query = query.where(eq(monthlyKpiTargets.monthId, filters.monthId));
      }
      
      return await query.orderBy(desc(monthlyKpiTargets.monthId));
    });
  }

  async getMonthlyKpiTargetById(id: string): Promise<MonthlyKpiTarget | undefined> {
    const [target] = await db.select().from(monthlyKpiTargets).where(eq(monthlyKpiTargets.id, id));
    return target || undefined;
  }

  async createMonthlyKpiTarget(target: InsertMonthlyKpiTarget): Promise<MonthlyKpiTarget> {
    const [newTarget] = await db.insert(monthlyKpiTargets).values(target).returning();
    return newTarget;
  }

  async updateMonthlyKpiTarget(id: string, target: Partial<InsertMonthlyKpiTarget>): Promise<MonthlyKpiTarget> {
    const [updatedTarget] = await db
      .update(monthlyKpiTargets)
      .set({ ...target, updatedAt: new Date() })
      .where(eq(monthlyKpiTargets.id, id))
      .returning();
    return updatedTarget;
  }

  async deleteMonthlyKpiTarget(id: string): Promise<void> {
    await db.delete(monthlyKpiTargets).where(eq(monthlyKpiTargets.id, id));
  }

  // Complex queries for dashboard
  async getCvjStagesWithHierarchy(): Promise<any[]> {
    return await db
      .select({
        id: cvjStages.id,
        name: cvjStages.name,
        displayOrder: cvjStages.displayOrder,
        colorCode: cvjStages.colorCode,
        isActive: cvjStages.isActive,
        subCategories: {
          id: subCategories.id,
          name: subCategories.name,
          displayOrder: subCategories.displayOrder,
        },
        kpis: {
          id: kpis.id,
          name: kpis.name,
          description: kpis.description,
          unitType: kpis.unitType,
          defaultMonthlyTargetValue: kpis.defaultMonthlyTargetValue,
          isActive: kpis.isActive,
        }
      })
      .from(cvjStages)
      .leftJoin(subCategories, eq(cvjStages.id, subCategories.cvjStageId))
      .leftJoin(kpis, eq(subCategories.id, kpis.subCategoryId))
      .orderBy(asc(cvjStages.displayOrder), asc(subCategories.displayOrder));
  }

  async getKpisWithRelations(filters?: { stageId?: string; subCategoryId?: string; active?: boolean }): Promise<any[]> {
    let query = db
      .select({
        id: kpis.id,
        name: kpis.name,
        description: kpis.description,
        unitType: kpis.unitType,
        defaultMonthlyTargetValue: kpis.defaultMonthlyTargetValue,
        isActive: kpis.isActive,
        createdAt: kpis.createdAt,
        updatedAt: kpis.updatedAt,
        subCategory: {
          id: subCategories.id,
          name: subCategories.name,
          displayOrder: subCategories.displayOrder,
        },
        cvjStage: {
          id: cvjStages.id,
          name: cvjStages.name,
          colorCode: cvjStages.colorCode,
        }
      })
      .from(kpis)
      .innerJoin(subCategories, eq(kpis.subCategoryId, subCategories.id))
      .innerJoin(cvjStages, eq(subCategories.cvjStageId, cvjStages.id));

    if (filters?.subCategoryId) {
      query = query.where(eq(kpis.subCategoryId, filters.subCategoryId));
    }

    if (filters?.active !== undefined) {
      query = query.where(eq(kpis.isActive, filters.active));
    }

    return await query.orderBy(asc(cvjStages.displayOrder), asc(subCategories.displayOrder), asc(kpis.name));
  }

  async getWeeklyDataWithRelations(filters?: { weekId?: string; kpiId?: string; monthId?: string }): Promise<any[]> {
    let query = db
      .select({
        id: weeklyDataEntries.id,
        actualValue: weeklyDataEntries.actualValue,
        notes: weeklyDataEntries.notes,
        createdAt: weeklyDataEntries.createdAt,
        updatedAt: weeklyDataEntries.updatedAt,
        week: {
          id: weeks.id,
          year: weeks.year,
          weekNumber: weeks.weekNumber,
          month: weeks.month,
          startDateString: weeks.startDateString,
          endDateString: weeks.endDateString,
        },
        kpi: {
          id: kpis.id,
          name: kpis.name,
          unitType: kpis.unitType,
          defaultMonthlyTargetValue: kpis.defaultMonthlyTargetValue,
        }
      })
      .from(weeklyDataEntries)
      .innerJoin(weeks, eq(weeklyDataEntries.weekId, weeks.id))
      .innerJoin(kpis, eq(weeklyDataEntries.kpiId, kpis.id));

    if (filters?.weekId) {
      query = query.where(eq(weeklyDataEntries.weekId, filters.weekId));
    }

    if (filters?.kpiId) {
      query = query.where(eq(weeklyDataEntries.kpiId, filters.kpiId));
    }

    if (filters?.monthId) {
      // For monthId filtering, we need to extract the month from the week data
      const [year, month] = filters.monthId.split('-');
      query = query.where(and(
        eq(weeks.year, parseInt(year)),
        eq(weeks.month, parseInt(month))
      ));
    }

    return await query.orderBy(desc(weeks.year), desc(weeks.weekNumber));
  }

  async getDashboardDataForMonth(monthId: string): Promise<any> {
    const [year, month] = monthId.split('-');
    
    // Get all KPIs with their structure
    const kpisWithStructure = await this.getKpisWithRelations({ active: true });
    
    // Get weekly data for the month
    const weeklyData = await this.getWeeklyDataWithRelations({ monthId });
    
    // Get monthly targets for the month
    const monthlyTargets = await this.getMonthlyKpiTargets({ monthId });
    
    // Process the data to create dashboard metrics
    const processedData = kpisWithStructure.map(kpi => {
      const kpiWeeklyData = weeklyData.filter(wd => wd.kpi.id === kpi.id);
      const monthlyTarget = monthlyTargets.find(mt => mt.kpiId === kpi.id);
      
      const summedActualValue = kpiWeeklyData.reduce((sum, wd) => {
        return sum + (wd.actualValue || 0);
      }, 0);
      
      const targetValue = monthlyTarget?.targetValue || kpi.defaultMonthlyTargetValue || 0;
      const statusPercentage = targetValue > 0 ? (summedActualValue / targetValue) * 100 : 0;
      
      let statusColor = 'bg-red-100';
      let statusTextColor = 'text-red-700';
      
      if (statusPercentage >= 95) {
        statusColor = 'bg-green-100';
        statusTextColor = 'text-green-700';
      } else if (statusPercentage >= 70) {
        statusColor = 'bg-yellow-100';
        statusTextColor = 'text-yellow-700';
      }
      
      return {
        kpi,
        monthId,
        summedActualValue,
        monthlyTargetValue: targetValue,
        statusPercentage,
        statusColor,
        statusTextColor,
        weeklyEntries: kpiWeeklyData
      };
    });
    
    return {
      monthId,
      monthName: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      processedKpis: processedData
    };
  }
}

export const storage = new DatabaseStorage();
