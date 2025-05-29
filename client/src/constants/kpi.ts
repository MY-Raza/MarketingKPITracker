import { CVJStage, CVJStageName, UnitType, Week, WeeklyDataEntry, Month, MonthlyKpiTarget, KPI } from '../types/kpi';

export const CVJ_STAGE_COLORS: Record<CVJStageName, string> = {
  [CVJStageName.AWARE]: 'bg-cvj-aware',
  [CVJStageName.ENGAGE]: 'bg-cvj-engage',
  [CVJStageName.SUBSCRIBE]: 'bg-cvj-subscribe',
  [CVJStageName.CONVERT]: 'bg-cvj-convert',
  [CVJStageName.EXCITE]: 'bg-cvj-excite',
  [CVJStageName.ASCEND]: 'bg-cvj-ascend',
  [CVJStageName.ADVOCATE]: 'bg-cvj-advocate',
  [CVJStageName.PROMOTE]: 'bg-cvj-promote',
};

export const STATUS_THRESHOLDS = {
  GREEN: 95, // >= 95%
  YELLOW: 70, // >= 70% and < 95%
};

// Helper to get ISO week number
const getISOWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper to format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to format date to MM/DD for display in Week ID
const formatDateToMMDD = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}`;
};

export const INITIAL_CVJ_STAGES: CVJStage[] = [
  {
    id: 'aware',
    name: CVJStageName.AWARE,
    displayOrder: 1,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.AWARE],
    subCategories: [
      {
        id: 'aware_visitors',
        name: 'Visitors',
        displayOrder: 1,
        kpis: [
          { id: 'kpi_aware_new_visitors_ga4', name: 'Total New website Visitors (GA4)', description: 'The number of users who interacted with our site for the first time.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 6806.4, isActive: true },
          { id: 'kpi_aware_active_visitors_ga4', name: 'Total active website Visitors (GA4)', description: 'The total number of active users.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 7660.8, isActive: true },
          { id: 'kpi_aware_scp_views', name: 'Supply Chain Partners Views', description: 'Total number of views on all the Cesco pages including blogs, service pages and storefront.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 5822.4, isActive: true },
          { id: 'kpi_aware_total_page_visits_sm', name: 'Total page visits (LI+FB+IG)', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 915.2, isActive: true },
          { id: 'kpi_aware_total_content_views_sm', name: 'Total Content Views (FB+IG)', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true },
        ],
      },
      {
        id: 'aware_rankings',
        name: 'Rankings',
        displayOrder: 2,
        kpis: [
          { id: 'kpi_aware_avg_keyword_rankings', name: 'Average Keyword Rankings (TrueRanker)', description: 'Average position of all the keywords we are tracking in TrueRanker.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true },
        ],
      },
      {
        id: 'aware_posting',
        name: 'Posting',
        displayOrder: 3,
        kpis: [
          { id: 'kpi_aware_total_posts_sm', name: 'Total Number of Posts across SM channels (LI+FB+IG) incl stories', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 295.176, isActive: true },
        ],
      },
    ],
  },
  {
    id: 'engage',
    name: CVJStageName.ENGAGE,
    displayOrder: 2,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.ENGAGE],
    subCategories: [
      {
        id: 'engage_content_interaction',
        name: 'Content Interaction',
        displayOrder: 1,
        kpis: [
          { id: 'kpi_engage_total_content_interaction', name: 'Total Content Interaction (likes, shares, comments,saves, reposts, clicks and shares) (LI+FB+IG)', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 387.2, isActive: true },
          { id: 'kpi_engage_brand_mentions', name: 'Brand Mentions (LI+FB+IG)', description: '- includes mentions by Cesco-ians also', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true },
          { id: 'kpi_engage_linkedin_newsletter_subs', name: 'LinkedIn Newsletters Subscribers', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 39.6, isActive: true },
        ],
      },
      {
        id: 'engage_total_followers',
        name: 'Total Followers',
        displayOrder: 2,
        kpis: [
          { id: 'kpi_engage_total_followers_sm', name: 'Total followers (LI+FB+IG [Follows-Unfollows])', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 215.6, isActive: true },
        ],
      },
      {
        id: 'engage_website_engagement',
        name: 'Website Engagement',
        displayOrder: 3,
        kpis: [
          { id: 'kpi_engage_avg_engagement_time_ga4', name: 'Average Engagment Time in seconds (GA4)', description: 'Average engagement time per active user for the time period selected.', unitType: UnitType.DURATION_SECONDS, defaultMonthlyTargetValue: 61.82, isActive: true },
          { id: 'kpi_engage_avg_time_on_site_adline', name: 'Average Time on site in seconds (Adline)', description: 'The average length of time visitors stays on the website.', unitType: UnitType.DURATION_SECONDS, defaultMonthlyTargetValue: 0, isActive: true },
        ],
      },
      {
        id: 'engage_scp_phone_clicks',
        name: 'SCP Phone Clicks',
        displayOrder: 4,
        kpis: [
          { id: 'kpi_engage_scp_phone_clicks', name: 'Supply Chain Partners phone number clicks', description: 'Total number of clicks we received on the phone number.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true },
        ],
      },
      {
        id: 'engage_blogpost_reads',
        name: 'Blogpost Reads',
        displayOrder: 5,
        kpis: [
          { id: 'kpi_engage_total_users_blogpost_ga4', name: 'Total Users on Blogpost (GA4)', description: 'Total views of people visited our blog pages.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 79.2, isActive: true },
        ],
      },
    ],
  },
   {
    id: 'subscribe',
    name: CVJStageName.SUBSCRIBE,
    displayOrder: 3,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.SUBSCRIBE],
    subCategories: [
      {
        id: 'subscribe_forms_submitted',
        name: 'Forms Submitted',
        displayOrder: 1,
        kpis: [
          { id: 'kpi_subscribe_interpreting_forms_submitted', name: 'Interpreting forms Submitted', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 123.2, isActive: true },
          { id: 'kpi_subscribe_interpreting_forms_clicks', name: 'Interpreting forms Clicks', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 228.8, isActive: true },
          { id: 'kpi_subscribe_translation_forms_submitted', name: 'Translation forms Submitted', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 17.6, isActive: true },
          { id: 'kpi_subscribe_translation_forms_clicks', name: 'Translation forms Clicks', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 96.8, isActive: true },
        ],
      },
      {
        id: 'subscribe_quote_requests',
        name: 'Quote Requests',
        displayOrder: 2,
        kpis: [
          { id: 'kpi_subscribe_quote_requests_submitted', name: 'Quote Requests forms Submitted', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 57.2, isActive: true },
          { id: 'kpi_subscribe_quote_requests_clicks', name: 'Quote Requests forms Clicks', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 220, isActive: true },
        ],
      },
      {
        id: 'subscribe_live_chat',
        name: 'Live Chat',
        displayOrder: 3,
        kpis: [
          { id: 'kpi_subscribe_live_chat_quote_requests', name: 'Live Chat Quote Requests', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true },
        ],
      },
    ],
  },
  {
    id: 'convert',
    name: CVJStageName.CONVERT,
    displayOrder: 4,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.CONVERT],
    subCategories: [
      {
        id: 'convert_consultations_scheduled',
        name: 'Consultations Scheduled',
        displayOrder: 1,
        kpis: [
          { id: 'kpi_convert_total_leads_moved_conversion', name: 'Total leads moved to conversion', description: '', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true },
        ],
      },
    ],
  },
  {
    id: 'excite',
    name: CVJStageName.EXCITE,
    displayOrder: 5,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.EXCITE],
    subCategories: [
       { id: 'excite_empty', name: 'Customer Satisfaction', displayOrder: 1, kpis: [{id: 'kpi_excite_nps', name: 'Net Promoter Score (NPS)', description: 'A measure of customer loyalty.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 50, isActive: true}]},
    ],
  },
  {
    id: 'ascend',
    name: CVJStageName.ASCEND,
    displayOrder: 6,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.ASCEND],
    subCategories: [
       { id: 'ascend_empty', name: 'Upsells & Cross-sells', displayOrder: 1, kpis: [{id: 'kpi_ascend_avg_order_value', name: 'Average Order Value (AOV)', description: 'Average amount spent per order.', unitType: UnitType.CURRENCY, defaultMonthlyTargetValue: 100, isActive: true}]},
    ],
  },
  {
    id: 'advocate',
    name: CVJStageName.ADVOCATE,
    displayOrder: 7,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.ADVOCATE],
    subCategories: [
      { id: 'advocate_reviews', name: 'Reviews', displayOrder: 1, kpis: [ { id: 'kpi_advocate_reviews', name: 'Reviews', description: 'Number of new positive reviews.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true }, ] },
      { id: 'advocate_external_links', name: 'External Links', displayOrder: 2, kpis: [ { id: 'kpi_advocate_external_links', name: 'External Links', description: 'Number of new backlinks from advocates.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true }, ] },
      { id: 'advocate_social_mentions', name: 'Social Mentions', displayOrder: 3, kpis: [ { id: 'kpi_advocate_social_mentions', name: 'Social Mentions', description: 'Number of positive social media mentions by advocates.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true }, ] },
    ],
  },
  {
    id: 'promote',
    name: CVJStageName.PROMOTE,
    displayOrder: 8,
    colorCode: CVJ_STAGE_COLORS[CVJStageName.PROMOTE],
    subCategories: [
      { id: 'promote_referral_discounts', name: 'Referral Discounts', displayOrder: 1, kpis: [ { id: 'kpi_promote_referral_discounts_used', name: 'Refferal Discounts Used', description: 'Number of referral discounts claimed.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true }, ] },
      { id: 'promote_affiliate_programs', name: 'Affiliate Programs', displayOrder: 2, kpis: [ { id: 'kpi_promote_affiliate_signups', name: 'Affeliate Program Signups', description: 'Number of new affiliates.', unitType: UnitType.NUMBER, defaultMonthlyTargetValue: 0, isActive: true }, ] },
    ],
  },
];

const currentYear = new Date().getFullYear();

const createWeekFromDates = (startDate: Date, endDate: Date): Week => {
    const year = startDate.getFullYear();
    const month = startDate.getMonth() + 1;
    const weekNumber = getISOWeek(startDate);
    const startDateString = formatDateToYYYYMMDD(startDate);
    const endDateString = formatDateToYYYYMMDD(endDate);
    const startMMDD = formatDateToMMDD(startDate);
    const endMMDD = formatDateToMMDD(endDate);

    return {
        id: `Week ${weekNumber} [${startMMDD}-${endMMDD}]`,
        year,
        weekNumber,
        month,
        startDateString,
        endDateString,
    };
};

const generateDefaultWeek = (year: number, month: number, day: number, durationDays: number = 6): Week => {
    const startDate = new Date(year, month -1, day);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);
    return createWeekFromDates(startDate, endDate);
}

export const DEFAULT_WEEKS: Week[] = [
  generateDefaultWeek(currentYear, 5, 1),  // Week 18 (May 1-7)
  generateDefaultWeek(currentYear, 4, 24), // Week 17 (Apr 24-30)
  generateDefaultWeek(currentYear, 4, 17), // Week 16 (Apr 17-23)
  generateDefaultWeek(currentYear, 4, 10), // Week 15 (Apr 10-16)
  generateDefaultWeek(currentYear, 4, 3),  // Week 14 (Apr 3-9)
  generateDefaultWeek(currentYear, 1, 30), // Week 5 (Jan 30 - Feb 5)
  generateDefaultWeek(currentYear, 1, 23), // Week 4 (Jan 23 - Jan 29)
].sort((a, b) => { // Sort newest first by start date
  return new Date(b.startDateString).getTime() - new Date(a.startDateString).getTime();
});

export const INITIAL_WEEKLY_DATA: WeeklyDataEntry[] = [
    // Data for Week 17 
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===17)!.id, kpiId: 'kpi_aware_new_visitors_ga4', actualValue: 1600 },
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===17)!.id, kpiId: 'kpi_aware_active_visitors_ga4', actualValue: 1800 },
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===17)!.id, kpiId: 'kpi_engage_total_content_interaction', actualValue: 90 },
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===17)!.id, kpiId: 'kpi_subscribe_interpreting_forms_submitted', actualValue: 25 },

    // Data for Week 18 
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===18)!.id, kpiId: 'kpi_aware_new_visitors_ga4', actualValue: 1750 },
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===18)!.id, kpiId: 'kpi_engage_total_content_interaction', actualValue: 100 },
    
    // Data for Week 16 
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===16)!.id, kpiId: 'kpi_aware_new_visitors_ga4', actualValue: 1500 },
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===16)!.id, kpiId: 'kpi_engage_total_content_interaction', actualValue: 80 },
    
    // Data for Week 4 (Jan) & 5 (Feb) for multi-month demo
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===4)!.id, kpiId: 'kpi_aware_new_visitors_ga4', actualValue: 1000 },
    { weekId: DEFAULT_WEEKS.find(w=>w.weekNumber===5)!.id, kpiId: 'kpi_aware_new_visitors_ga4', actualValue: 1100 },
];

export const INITIAL_MONTHLY_TARGETS: MonthlyKpiTarget[] = [
    { id: 'mt1', kpiId: 'kpi_aware_new_visitors_ga4', monthId: `${currentYear}-04`, targetValue: 6500 },
    { id: 'mt2', kpiId: 'kpi_aware_new_visitors_ga4', monthId: `${currentYear}-05`, targetValue: 7000 },
    { id: 'mt3', kpiId: 'kpi_engage_total_content_interaction', monthId: `${currentYear}-04`, targetValue: 380 },
    { id: 'mt4', kpiId: 'kpi_engage_total_content_interaction', monthId: `${currentYear}-05`, targetValue: 400 },
    { id: 'mt5', kpiId: 'kpi_aware_new_visitors_ga4', monthId: `${currentYear}-01`, targetValue: 4000 },
    { id: 'mt6', kpiId: 'kpi_aware_new_visitors_ga4', monthId: `${currentYear}-02`, targetValue: 4200 },
];

export const createWeekObjectFromFormData = (startDate: Date, endDate: Date): Week => {
    return createWeekFromDates(startDate, endDate);
};