import { db } from './db';
import { cvjStages, subCategories, kpis, weeks, weeklyDataEntries, monthlyKpiTargets } from '@shared/schema';
import { eq } from 'drizzle-orm';

// CVJ Stage data - matching the constants file
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

// Complete subcategories and KPIs data from constants file
const COMPLETE_DATA = [
  {
    stageName: 'Aware',
    subCategories: [
      {
        name: 'Visitors',
        displayOrder: 1,
        kpis: [
          { name: 'Total New website Visitors (GA4)', description: 'The number of users who interacted with our site for the first time.', unitType: 'NUMBER', defaultMonthlyTargetValue: 6806.4 },
          { name: 'Total active website Visitors (GA4)', description: 'The total number of active users.', unitType: 'NUMBER', defaultMonthlyTargetValue: 7660.8 },
          { name: 'Supply Chain Partners Views', description: 'Total number of views on all the Cesco pages including blogs, service pages and storefront.', unitType: 'NUMBER', defaultMonthlyTargetValue: 5822.4 },
          { name: 'Total page visits (LI+FB+IG)', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 915.2 },
          { name: 'Total Content Views (FB+IG)', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'Rankings',
        displayOrder: 2,
        kpis: [
          { name: 'Average Keyword Rankings (TrueRanker)', description: 'Average position of all the keywords we are tracking in TrueRanker.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'Posting',
        displayOrder: 3,
        kpis: [
          { name: 'Total Number of Posts across SM channels (LI+FB+IG) incl stories', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 295.176 },
        ]
      }
    ]
  },
  {
    stageName: 'Engage',
    subCategories: [
      {
        name: 'Content Interaction',
        displayOrder: 1,
        kpis: [
          { name: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 387.2 },
          { name: 'Brand Mentions (LI+FB+IG)', description: '- includes mentions by Cesco-ians also', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
          { name: 'LinkedIn Newsletters Subscribers', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 39.6 },
        ]
      },
      {
        name: 'Total Followers',
        displayOrder: 2,
        kpis: [
          { name: 'Total followers (LI+FB+IG [Follows-Unfollows])', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 215.6 },
        ]
      },
      {
        name: 'Website Engagement',
        displayOrder: 3,
        kpis: [
          { name: 'Average Engagment Time in seconds (GA4)', description: 'Average engagement time per active user for the time period selected.', unitType: 'DURATION_SECONDS', defaultMonthlyTargetValue: 61.82 },
          { name: 'Average Time on site in seconds (Adline)', description: 'The average length of time visitors stays on the website.', unitType: 'DURATION_SECONDS', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'SCP Phone Clicks',
        displayOrder: 4,
        kpis: [
          { name: 'Supply Chain Partners phone number clicks', description: 'Total number of clicks we received on the phone number.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'Blogpost Reads',
        displayOrder: 5,
        kpis: [
          { name: 'Total Users on Blogpost (GA4)', description: 'Total views of people visited our blog pages.', unitType: 'NUMBER', defaultMonthlyTargetValue: 79.2 },
        ]
      }
    ]
  },
  {
    stageName: 'Subscribe',
    subCategories: [
      {
        name: 'Forms Submitted',
        displayOrder: 1,
        kpis: [
          { name: 'Interpreting forms Submitted', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 123.2 },
          { name: 'Interpreting forms Clicks', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 228.8 },
          { name: 'Translation forms Submitted', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 17.6 },
          { name: 'Translation forms Clicks', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 96.8 },
        ]
      },
      {
        name: 'Quote Requests',
        displayOrder: 2,
        kpis: [
          { name: 'Quote Requests forms Submitted', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 57.2 },
          { name: 'Quote Requests forms Clicks', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 220 },
        ]
      },
      {
        name: 'Live Chat',
        displayOrder: 3,
        kpis: [
          { name: 'Live Chat Quote Requests', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      }
    ]
  },
  {
    stageName: 'Convert',
    subCategories: [
      {
        name: 'Consultations Scheduled',
        displayOrder: 1,
        kpis: [
          { name: 'Total leads moved to conversion', description: '', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      }
    ]
  },
  {
    stageName: 'Excite',
    subCategories: [
      {
        name: 'Customer Satisfaction',
        displayOrder: 1,
        kpis: [
          { name: 'Net Promoter Score (NPS)', description: 'A measure of customer loyalty.', unitType: 'NUMBER', defaultMonthlyTargetValue: 50 },
        ]
      }
    ]
  },
  {
    stageName: 'Ascend',
    subCategories: [
      {
        name: 'Upsells & Cross-sells',
        displayOrder: 1,
        kpis: [
          { name: 'Average Order Value (AOV)', description: 'Average amount spent per order.', unitType: 'CURRENCY', defaultMonthlyTargetValue: 100 },
        ]
      }
    ]
  },
  {
    stageName: 'Advocate',
    subCategories: [
      {
        name: 'Reviews',
        displayOrder: 1,
        kpis: [
          { name: 'Reviews', description: 'Number of new positive reviews.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'External Links',
        displayOrder: 2,
        kpis: [
          { name: 'External Links', description: 'Number of new backlinks from advocates.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'Social Mentions',
        displayOrder: 3,
        kpis: [
          { name: 'Social Mentions', description: 'Number of positive social media mentions by advocates.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      }
    ]
  },
  {
    stageName: 'Promote',
    subCategories: [
      {
        name: 'Referral Discounts',
        displayOrder: 1,
        kpis: [
          { name: 'Refferal Discounts Used', description: 'Number of referral discounts claimed.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      },
      {
        name: 'Affiliate Programs',
        displayOrder: 2,
        kpis: [
          { name: 'Affeliate Program Signups', description: 'Number of new affiliates.', unitType: 'NUMBER', defaultMonthlyTargetValue: 0 },
        ]
      }
    ]
  }
];

// Sample weeks from constants file
const WEEKS_DATA = [
  { id: 'Week 18 [05/01-05/07]', year: 2025, weekNumber: 18, month: 5, startDateString: '2025-05-01', endDateString: '2025-05-07' },
  { id: 'Week 17 [04/24-04/30]', year: 2025, weekNumber: 17, month: 4, startDateString: '2025-04-24', endDateString: '2025-04-30' },
  { id: 'Week 16 [04/17-04/23]', year: 2025, weekNumber: 16, month: 4, startDateString: '2025-04-17', endDateString: '2025-04-23' },
  { id: 'Week 15 [04/10-04/16]', year: 2025, weekNumber: 15, month: 4, startDateString: '2025-04-10', endDateString: '2025-04-16' },
  { id: 'Week 14 [04/03-04/09]', year: 2025, weekNumber: 14, month: 4, startDateString: '2025-04-03', endDateString: '2025-04-09' },
  { id: 'Week 5 [01/30-02/05]', year: 2025, weekNumber: 5, month: 2, startDateString: '2025-01-30', endDateString: '2025-02-05' },
  { id: 'Week 4 [01/23-01/29]', year: 2025, weekNumber: 4, month: 1, startDateString: '2025-01-23', endDateString: '2025-01-29' },
];

// Sample weekly data and monthly targets from constants file
const SAMPLE_WEEKLY_DATA = [
  { weekId: 'Week 17 [04/24-04/30]', kpiName: 'Total New website Visitors (GA4)', actualValue: 1600 },
  { weekId: 'Week 17 [04/24-04/30]', kpiName: 'Total active website Visitors (GA4)', actualValue: 1800 },
  { weekId: 'Week 17 [04/24-04/30]', kpiName: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', actualValue: 90 },
  { weekId: 'Week 17 [04/24-04/30]', kpiName: 'Interpreting forms Submitted', actualValue: 25 },
  
  { weekId: 'Week 18 [05/01-05/07]', kpiName: 'Total New website Visitors (GA4)', actualValue: 1750 },
  { weekId: 'Week 18 [05/01-05/07]', kpiName: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', actualValue: 100 },
  
  { weekId: 'Week 16 [04/17-04/23]', kpiName: 'Total New website Visitors (GA4)', actualValue: 1500 },
  { weekId: 'Week 16 [04/17-04/23]', kpiName: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', actualValue: 80 },
  
  { weekId: 'Week 4 [01/23-01/29]', kpiName: 'Total New website Visitors (GA4)', actualValue: 1000 },
  { weekId: 'Week 5 [01/30-02/05]', kpiName: 'Total New website Visitors (GA4)', actualValue: 1100 },
];

const SAMPLE_MONTHLY_TARGETS = [
  { kpiName: 'Total New website Visitors (GA4)', monthId: '2025-04', targetValue: 6500 },
  { kpiName: 'Total New website Visitors (GA4)', monthId: '2025-05', targetValue: 7000 },
  { kpiName: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', monthId: '2025-04', targetValue: 380 },
  { kpiName: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', monthId: '2025-05', targetValue: 400 },
  { kpiName: 'Total New website Visitors (GA4)', monthId: '2025-01', targetValue: 4000 },
  { kpiName: 'Total New website Visitors (GA4)', monthId: '2025-02', targetValue: 4200 },
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

    // Insert comprehensive subcategories and KPIs
    console.log('📁 Seeding comprehensive data structure...');
    for (const stageData of COMPLETE_DATA) {
      const cvjStageId = stageMap.get(stageData.stageName);
      if (!cvjStageId) continue;

      for (const subCatData of stageData.subCategories) {
        // Insert subcategory
        let subCategoryId;
        const existing = await db.select().from(subCategories)
          .where(eq(subCategories.name, subCatData.name));
        
        if (existing.length === 0) {
          const [newSubCategory] = await db.insert(subCategories).values({
            name: subCatData.name,
            displayOrder: subCatData.displayOrder,
            cvjStageId,
          }).returning();
          subCategoryId = newSubCategory.id;
          console.log(`  ✓ Created sub category: ${subCatData.name}`);
        } else {
          subCategoryId = existing[0].id;
        }

        // Insert KPIs for this subcategory
        for (const kpiData of subCatData.kpis) {
          const existingKpi = await db.select().from(kpis)
            .where(eq(kpis.name, kpiData.name));
          
          if (existingKpi.length === 0) {
            await db.insert(kpis).values({
              name: kpiData.name,
              description: kpiData.description,
              unitType: kpiData.unitType as any,
              defaultMonthlyTargetValue: kpiData.defaultMonthlyTargetValue,
              subCategoryId,
            });
            console.log(`    ✓ Created KPI: ${kpiData.name}`);
          }
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

    // Get all KPIs to link sample data
    const allKpis = await db.select().from(kpis);
    const kpiMap = new Map(allKpis.map(kpi => [kpi.name, kpi.id]));

    // Insert sample weekly data
    console.log('📊 Seeding sample weekly data...');
    for (const dataEntry of SAMPLE_WEEKLY_DATA) {
      const kpiId = kpiMap.get(dataEntry.kpiName);
      if (kpiId) {
        const existing = await db.select().from(weeklyDataEntries)
          .where(eq(weeklyDataEntries.weekId, dataEntry.weekId))
          .where(eq(weeklyDataEntries.kpiId, kpiId));
        
        if (existing.length === 0) {
          await db.insert(weeklyDataEntries).values({
            weekId: dataEntry.weekId,
            kpiId,
            actualValue: dataEntry.actualValue,
          });
          console.log(`  ✓ Created weekly data: ${dataEntry.kpiName} for ${dataEntry.weekId}`);
        }
      }
    }

    // Insert sample monthly targets
    console.log('🎯 Seeding sample monthly targets...');
    for (const targetEntry of SAMPLE_MONTHLY_TARGETS) {
      const kpiId = kpiMap.get(targetEntry.kpiName);
      if (kpiId) {
        const existing = await db.select().from(monthlyKpiTargets)
          .where(eq(monthlyKpiTargets.kpiId, kpiId))
          .where(eq(monthlyKpiTargets.monthId, targetEntry.monthId));
        
        if (existing.length === 0) {
          await db.insert(monthlyKpiTargets).values({
            kpiId,
            monthId: targetEntry.monthId,
            targetValue: targetEntry.targetValue,
          });
          console.log(`  ✓ Created monthly target: ${targetEntry.kpiName} for ${targetEntry.monthId}`);
        }
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