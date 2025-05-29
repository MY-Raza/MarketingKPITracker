import { db } from './db';
import { cvjStages, subCategories, kpis, weeks } from '@shared/schema';
import { eq } from 'drizzle-orm';

// CVJ Stage data
const CVJ_STAGES_DATA = [
  { name: 'Aware', displayOrder: 1, colorCode: 'from-blue-500 to-blue-600' },
  { name: 'Engage', displayOrder: 2, colorCode: 'from-green-500 to-green-600' },
  { name: 'Subscribe', displayOrder: 3, colorCode: 'from-purple-500 to-purple-600' },
  { name: 'Convert', displayOrder: 4, colorCode: 'from-orange-500 to-orange-600' },
  { name: 'Excite', displayOrder: 5, colorCode: 'from-pink-500 to-pink-600' },
  { name: 'Ascend', displayOrder: 6, colorCode: 'from-indigo-500 to-indigo-600' },
  { name: 'Advocate', displayOrder: 7, colorCode: 'from-emerald-500 to-emerald-600' },
  { name: 'Promote', displayOrder: 8, colorCode: 'from-red-500 to-red-600' },
];

// Sub Categories data for each stage
const SUB_CATEGORIES_DATA = [
  // Aware stage
  { name: 'Brand Awareness', displayOrder: 1, stageName: 'Aware' },
  { name: 'Content Reach', displayOrder: 2, stageName: 'Aware' },
  
  // Engage stage
  { name: 'Social Engagement', displayOrder: 1, stageName: 'Engage' },
  { name: 'Content Engagement', displayOrder: 2, stageName: 'Engage' },
  
  // Subscribe stage
  { name: 'Email Marketing', displayOrder: 1, stageName: 'Subscribe' },
  { name: 'Newsletter Growth', displayOrder: 2, stageName: 'Subscribe' },
  
  // Convert stage
  { name: 'Sales Conversion', displayOrder: 1, stageName: 'Convert' },
  { name: 'Lead Generation', displayOrder: 2, stageName: 'Convert' },
  
  // Excite stage
  { name: 'Customer Satisfaction', displayOrder: 1, stageName: 'Excite' },
  { name: 'Product Experience', displayOrder: 2, stageName: 'Excite' },
  
  // Ascend stage
  { name: 'Upsell Performance', displayOrder: 1, stageName: 'Ascend' },
  { name: 'Account Growth', displayOrder: 2, stageName: 'Ascend' },
  
  // Advocate stage
  { name: 'Customer Loyalty', displayOrder: 1, stageName: 'Advocate' },
  { name: 'Retention Metrics', displayOrder: 2, stageName: 'Advocate' },
  
  // Promote stage
  { name: 'Referral Program', displayOrder: 1, stageName: 'Promote' },
  { name: 'Word of Mouth', displayOrder: 2, stageName: 'Promote' },
];

// Sample KPIs for each subcategory
const KPIS_DATA = [
  // Brand Awareness KPIs
  { name: 'Brand Mentions', description: 'Number of times brand is mentioned online', unitType: 'NUMBER', defaultMonthlyTargetValue: 500, subCategoryName: 'Brand Awareness' },
  { name: 'Search Impressions', description: 'Total search result impressions', unitType: 'NUMBER', defaultMonthlyTargetValue: 10000, subCategoryName: 'Brand Awareness' },
  
  // Content Reach KPIs
  { name: 'Content Views', description: 'Total views across all content', unitType: 'NUMBER', defaultMonthlyTargetValue: 5000, subCategoryName: 'Content Reach' },
  { name: 'Unique Visitors', description: 'Number of unique website visitors', unitType: 'NUMBER', defaultMonthlyTargetValue: 2000, subCategoryName: 'Content Reach' },
  
  // Social Engagement KPIs
  { name: 'Social Likes', description: 'Total likes across social platforms', unitType: 'NUMBER', defaultMonthlyTargetValue: 1000, subCategoryName: 'Social Engagement' },
  { name: 'Social Shares', description: 'Total shares across social platforms', unitType: 'NUMBER', defaultMonthlyTargetValue: 200, subCategoryName: 'Social Engagement' },
  
  // Content Engagement KPIs
  { name: 'Avg Session Duration', description: 'Average time spent on site', unitType: 'DURATION_SECONDS', defaultMonthlyTargetValue: 180, subCategoryName: 'Content Engagement' },
  { name: 'Bounce Rate', description: 'Percentage of single-page visits', unitType: 'PERCENTAGE', defaultMonthlyTargetValue: 40, subCategoryName: 'Content Engagement' },
];

// Sample weeks
const WEEKS_DATA = [
  { id: 'Week 18 [04/28-05/04]', year: 2025, weekNumber: 18, month: 5, startDateString: '2025-04-28', endDateString: '2025-05-04' },
  { id: 'Week 19 [05/05-05/11]', year: 2025, weekNumber: 19, month: 5, startDateString: '2025-05-05', endDateString: '2025-05-11' },
  { id: 'Week 20 [05/12-05/18]', year: 2025, weekNumber: 20, month: 5, startDateString: '2025-05-12', endDateString: '2025-05-18' },
  { id: 'Week 21 [05/19-05/25]', year: 2025, weekNumber: 21, month: 5, startDateString: '2025-05-19', endDateString: '2025-05-25' },
  { id: 'Week 22 [05/26-06/01]', year: 2025, weekNumber: 22, month: 6, startDateString: '2025-05-26', endDateString: '2025-06-01' },
];

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Insert CVJ Stages
    console.log('📊 Seeding CVJ stages...');
    for (const stageData of CVJ_STAGES_DATA) {
      const existing = await db.select().from(cvjStages).where(eq(cvjStages.name, stageData.name));
      if (existing.length === 0) {
        await db.insert(cvjStages).values(stageData);
        console.log(`  ✓ Created CVJ stage: ${stageData.name}`);
      }
    }

    // Get all stages to link subcategories
    const allStages = await db.select().from(cvjStages);
    const stageMap = new Map(allStages.map(stage => [stage.name, stage.id]));

    // Insert Sub Categories
    console.log('📁 Seeding sub categories...');
    for (const subCatData of SUB_CATEGORIES_DATA) {
      const cvjStageId = stageMap.get(subCatData.stageName);
      if (cvjStageId) {
        const existing = await db.select().from(subCategories)
          .where(eq(subCategories.name, subCatData.name));
        if (existing.length === 0) {
          await db.insert(subCategories).values({
            name: subCatData.name,
            displayOrder: subCatData.displayOrder,
            cvjStageId,
          });
          console.log(`  ✓ Created sub category: ${subCatData.name}`);
        }
      }
    }

    // Get all subcategories to link KPIs
    const allSubCategories = await db.select().from(subCategories);
    const subCategoryMap = new Map(allSubCategories.map(sub => [sub.name, sub.id]));

    // Insert sample KPIs
    console.log('📈 Seeding sample KPIs...');
    for (const kpiData of KPIS_DATA) {
      const subCategoryId = subCategoryMap.get(kpiData.subCategoryName);
      if (subCategoryId) {
        const existing = await db.select().from(kpis)
          .where(eq(kpis.name, kpiData.name));
        if (existing.length === 0) {
          await db.insert(kpis).values({
            name: kpiData.name,
            description: kpiData.description,
            unitType: kpiData.unitType as any,
            defaultMonthlyTargetValue: kpiData.defaultMonthlyTargetValue,
            subCategoryId,
          });
          console.log(`  ✓ Created KPI: ${kpiData.name}`);
        }
      }
    }

    // Insert sample weeks
    console.log('📅 Seeding sample weeks...');
    for (const weekData of WEEKS_DATA) {
      const existing = await db.select().from(weeks).where(eq(weeks.id, weekData.id));
      if (existing.length === 0) {
        await db.insert(weeks).values(weekData);
        console.log(`  ✓ Created week: ${weekData.id}`);
      }
    }

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}