import { z } from "zod";

// Common validators
const uuidSchema = z.string().uuid();
const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(128);

// Auth validators
export const authValidators = {
  register: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50)
  }),

  login: z.object({
    email: emailSchema,
    password: z.string().min(1)
  }),

  refresh: z.object({
    refreshToken: z.string().min(1)
  }),

  logout: z.object({
    refreshToken: z.string().min(1)
  }),

  updateProfile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional()
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema
  })
};

// CVJ Stage validators
export const cvjValidators = {
  params: z.object({
    id: uuidSchema
  }),

  subCategoryParams: z.object({
    subCategoryId: uuidSchema
  }),

  create: z.object({
    name: z.string().min(1).max(100),
    displayOrder: z.number().int().min(1),
    colorCode: z.string().min(1).max(50),
    isActive: z.boolean().optional()
  }),

  update: z.object({
    name: z.string().min(1).max(100).optional(),
    displayOrder: z.number().int().min(1).optional(),
    colorCode: z.string().min(1).max(50).optional(),
    isActive: z.boolean().optional()
  }),

  createSubCategory: z.object({
    name: z.string().min(1).max(100),
    displayOrder: z.number().int().min(1)
  }),

  updateSubCategory: z.object({
    name: z.string().min(1).max(100).optional(),
    displayOrder: z.number().int().min(1).optional()
  })
};

// KPI validators
export const kpiValidators = {
  params: z.object({
    id: uuidSchema
  }),

  queryFilters: z.object({
    stage_id: uuidSchema.optional(),
    sub_category_id: uuidSchema.optional(),
    active: z.enum(["true", "false"]).optional(),
    include_relations: z.enum(["true", "false"]).optional()
  }),

  create: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    unitType: z.enum(["NUMBER", "PERCENTAGE", "CURRENCY", "DURATION_SECONDS", "TEXT"]),
    defaultMonthlyTargetValue: z.number().positive().optional(),
    isActive: z.boolean().optional(),
    subCategoryId: uuidSchema
  }),

  update: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    unitType: z.enum(["NUMBER", "PERCENTAGE", "CURRENCY", "DURATION_SECONDS", "TEXT"]).optional(),
    defaultMonthlyTargetValue: z.number().positive().optional(),
    isActive: z.boolean().optional(),
    subCategoryId: uuidSchema.optional()
  }),

  bulkUpdate: z.object({
    kpiIds: z.array(uuidSchema).min(1),
    updates: z.object({
      isActive: z.boolean().optional(),
      defaultMonthlyTargetValue: z.number().positive().optional()
    })
  })
};

// Weekly Data validators
export const weeklyDataValidators = {
  params: z.object({
    id: uuidSchema
  }),

  weekParams: z.object({
    weekId: z.string().min(1)
  }),

  kpiParams: z.object({
    kpiId: uuidSchema
  }),

  queryFilters: z.object({
    week_id: z.string().optional(),
    kpi_id: uuidSchema.optional(),
    month_id: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    include_relations: z.enum(["true", "false"]).optional()
  }),

  create: z.object({
    weekId: z.string().min(1),
    kpiId: uuidSchema,
    actualValue: z.number().optional(),
    notes: z.string().max(1000).optional()
  }),

  update: z.object({
    actualValue: z.number().optional(),
    notes: z.string().max(1000).optional()
  }),

  bulkUpsert: z.object({
    entries: z.array(z.object({
      weekId: z.string().min(1),
      kpiId: uuidSchema,
      actualValue: z.number().optional(),
      notes: z.string().max(1000).optional()
    })).min(1)
  })
};

// Monthly Targets validators
export const monthlyTargetsValidators = {
  params: z.object({
    id: uuidSchema
  }),

  monthParams: z.object({
    monthId: z.string().regex(/^\d{4}-\d{2}$/)
  }),

  kpiParams: z.object({
    kpiId: uuidSchema
  }),

  queryFilters: z.object({
    kpi_id: uuidSchema.optional(),
    month_id: z.string().regex(/^\d{4}-\d{2}$/).optional()
  }),

  create: z.object({
    kpiId: uuidSchema,
    monthId: z.string().regex(/^\d{4}-\d{2}$/),
    targetValue: z.number().positive()
  }),

  update: z.object({
    targetValue: z.number().positive()
  }),

  bulkUpsert: z.object({
    targets: z.array(z.object({
      kpiId: uuidSchema,
      monthId: z.string().regex(/^\d{4}-\d{2}$/),
      targetValue: z.number().positive()
    })).min(1)
  })
};

// Analytics validators
export const analyticsValidators = {
  monthParams: z.object({
    monthId: z.string().regex(/^\d{4}-\d{2}$/)
  }),

  weekParams: z.object({
    id: z.string().min(1)
  }),

  monthlyOverviewQuery: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    stage_id: uuidSchema.optional()
  }),

  trendsQuery: z.object({
    kpi_id: uuidSchema.optional(),
    stage_id: uuidSchema.optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    period: z.enum(["weekly", "monthly"]).optional()
  }),

  kpiPerformanceQuery: z.object({
    month_id: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    stage_id: uuidSchema.optional(),
    kpi_ids: z.string().optional() // comma-separated UUIDs
  }),

  stagePerformanceQuery: z.object({
    month_id: z.string().regex(/^\d{4}-\d{2}$/).optional()
  }),

  comparisonQuery: z.object({
    current_month: z.string().regex(/^\d{4}-\d{2}$/),
    comparison_month: z.string().regex(/^\d{4}-\d{2}$/),
    kpi_id: uuidSchema.optional(),
    stage_id: uuidSchema.optional()
  }),

  healthScoreQuery: z.object({
    month_id: z.string().regex(/^\d{4}-\d{2}$/).optional()
  }),

  exportQuery: z.object({
    format: z.enum(["json", "csv"]).optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    include_targets: z.enum(["true", "false"]).optional(),
    stage_ids: z.string().optional(), // comma-separated UUIDs
    kpi_ids: z.string().optional() // comma-separated UUIDs
  }),

  createWeek: z.object({
    id: z.string().min(1),
    year: z.number().int().min(2020).max(2050),
    weekNumber: z.number().int().min(1).max(53),
    month: z.number().int().min(1).max(12),
    startDateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }),

  updateWeek: z.object({
    year: z.number().int().min(2020).max(2050).optional(),
    weekNumber: z.number().int().min(1).max(53).optional(),
    month: z.number().int().min(1).max(12).optional(),
    startDateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }),

  subcategoryParams: z.object({
    id: uuidSchema
  }),

  createSubcategory: z.object({
    name: z.string().min(1).max(200),
    displayOrder: z.number().int().min(1),
    cvjStageId: uuidSchema
  }),

  updateSubcategory: z.object({
    name: z.string().min(1).max(200).optional(),
    displayOrder: z.number().int().min(1).optional(),
    cvjStageId: uuidSchema.optional()
  })
};
