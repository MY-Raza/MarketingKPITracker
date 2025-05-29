import { pgTable, text, serial, integer, boolean, real, timestamp, uuid, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN']);
export const unitTypeEnum = pgEnum('unit_type', ['NUMBER', 'PERCENTAGE', 'CURRENCY', 'DURATION_SECONDS', 'TEXT']);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").default('ADMIN').notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Refresh tokens
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CVJ Stages
export const cvjStages = pgTable("cvj_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").notNull(),
  colorCode: text("color_code").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sub Categories
export const subCategories = pgTable("sub_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  cvjStageId: uuid("cvj_stage_id").notNull().references(() => cvjStages.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueNamePerStage: unique().on(table.name, table.cvjStageId),
}));

// KPIs
export const kpis = pgTable("kpis", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  unitType: unitTypeEnum("unit_type").notNull(),
  defaultMonthlyTargetValue: real("default_monthly_target_value"),
  isActive: boolean("is_active").default(true).notNull(),
  subCategoryId: uuid("sub_category_id").notNull().references(() => subCategories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Weeks
export const weeks = pgTable("weeks", {
  id: text("id").primaryKey(), // e.g., "Week 20 [05/01-05/09]"
  year: integer("year").notNull(),
  weekNumber: integer("week_number").notNull(),
  month: integer("month").notNull(),
  startDateString: text("start_date_string").notNull(), // YYYY-MM-DD
  endDateString: text("end_date_string").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueYearWeek: unique().on(table.year, table.weekNumber),
}));

// Weekly Data Entries
export const weeklyDataEntries = pgTable("weekly_data_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekId: text("week_id").notNull().references(() => weeks.id, { onDelete: "cascade" }),
  kpiId: uuid("kpi_id").notNull().references(() => kpis.id, { onDelete: "cascade" }),
  actualValue: real("actual_value"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueWeekKpi: unique().on(table.weekId, table.kpiId),
}));

// Monthly KPI Targets
export const monthlyKpiTargets = pgTable("monthly_kpi_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  kpiId: uuid("kpi_id").notNull().references(() => kpis.id, { onDelete: "cascade" }),
  monthId: text("month_id").notNull(), // YYYY-MM format
  targetValue: real("target_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueKpiMonth: unique().on(table.kpiId, table.monthId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const cvjStagesRelations = relations(cvjStages, ({ many }) => ({
  subCategories: many(subCategories),
}));

export const subCategoriesRelations = relations(subCategories, ({ one, many }) => ({
  cvjStage: one(cvjStages, {
    fields: [subCategories.cvjStageId],
    references: [cvjStages.id],
  }),
  kpis: many(kpis),
}));

export const kpisRelations = relations(kpis, ({ one, many }) => ({
  subCategory: one(subCategories, {
    fields: [kpis.subCategoryId],
    references: [subCategories.id],
  }),
  weeklyDataEntries: many(weeklyDataEntries),
  monthlyTargets: many(monthlyKpiTargets),
}));

export const weeksRelations = relations(weeks, ({ many }) => ({
  weeklyDataEntries: many(weeklyDataEntries),
}));

export const weeklyDataEntriesRelations = relations(weeklyDataEntries, ({ one }) => ({
  week: one(weeks, {
    fields: [weeklyDataEntries.weekId],
    references: [weeks.id],
  }),
  kpi: one(kpis, {
    fields: [weeklyDataEntries.kpiId],
    references: [kpis.id],
  }),
}));

export const monthlyKpiTargetsRelations = relations(monthlyKpiTargets, ({ one }) => ({
  kpi: one(kpis, {
    fields: [monthlyKpiTargets.kpiId],
    references: [kpis.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCvjStageSchema = createInsertSchema(cvjStages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubCategorySchema = createInsertSchema(subCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKpiSchema = createInsertSchema(kpis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWeekSchema = createInsertSchema(weeks).omit({
  createdAt: true,
});

export const insertWeeklyDataEntrySchema = createInsertSchema(weeklyDataEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMonthlyKpiTargetSchema = createInsertSchema(monthlyKpiTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

// Select types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type CvjStage = typeof cvjStages.$inferSelect;
export type InsertCvjStage = z.infer<typeof insertCvjStageSchema>;
export type SubCategory = typeof subCategories.$inferSelect;
export type InsertSubCategory = z.infer<typeof insertSubCategorySchema>;
export type Kpi = typeof kpis.$inferSelect;
export type InsertKpi = z.infer<typeof insertKpiSchema>;
export type Week = typeof weeks.$inferSelect;
export type InsertWeek = z.infer<typeof insertWeekSchema>;
export type WeeklyDataEntry = typeof weeklyDataEntries.$inferSelect;
export type InsertWeeklyDataEntry = z.infer<typeof insertWeeklyDataEntrySchema>;
export type MonthlyKpiTarget = typeof monthlyKpiTargets.$inferSelect;
export type InsertMonthlyKpiTarget = z.infer<typeof insertMonthlyKpiTargetSchema>;
