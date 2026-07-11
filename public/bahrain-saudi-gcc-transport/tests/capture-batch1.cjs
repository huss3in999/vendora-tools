const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const out = path.resolve(__dirname, '../test-results/batch1-screenshots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const base = 'http://127.0.0.1:8799/bahrain-saudi-gcc-transport';
  await page.goto(`${base}/prices/`); await page.screenshot({ path: path.join(out, 'arabic-pricing.png'), fullPage: true });
  await page.goto(`${base}/en/prices/`); await page.screenshot({ path: path.join(out, 'english-pricing.png'), fullPage: true });
  await page.goto(`${base}/en/bahrain-to-riyadh/`); await page.locator('[data-public-price="bahrain-to-riyadh"]').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'route-price-card.png'), fullPage: true });

  await page.route('**/api/transport/admin**', async (route) => {
    const url = new URL(route.request().url());
    const resource = url.searchParams.get('resource') || 'leads';
    const settings = { brand_display_name:'GetVendora Transport',service_description_en:'A professional Bahrain-based private transport booking and coordination service.',service_description_ar:'خدمة بحرينية احترافية لحجز وتنسيق النقل الخاص.',booking_whatsapp:'97333225954',booking_whatsapp_enabled:true,support_phone:'',support_phone_enabled:false,public_email:'',public_email_enabled:false,instagram_url:'',tiktok_url:'',other_social_url:'',operating_hours_en:'Booking coordination is available 24/7.',operating_hours_ar:'تنسيق الحجوزات متاح على مدار الساعة.',cash_enabled:true,benefitpay_enabled:true,passenger_capacity_en:'Up to 7 passengers subject to vehicle and luggage.',passenger_capacity_ar:'حتى 7 ركاب حسب المركبة والأمتعة.',vehicle_wording_en:'GMC and XL vehicles are commonly arranged.',vehicle_wording_ar:'يتم ترتيب مركبات GMC وXL عادةً.',insurance_wording_en:'Insured vehicles arranged through the driver network.',insurance_wording_ar:'مركبات مؤمّنة عبر شبكة السائقين.',legal_name:'',cr_number:'',legal_information_enabled:false,public_address:'',address_display_enabled:false,sar_per_bhd:10,customer_name_enabled:false,customer_name_required:false,customer_phone_enabled:false,customer_phone_required:false,follow_up_consent_enabled:false };
    const routeRows = [{ route_slug:'bahrain-to-riyadh',route_name_en:'Bahrain to Riyadh',route_name_ar:'البحرين إلى الرياض',price_bd:120,price_kind:'standard',unit_kind:'one_way_vehicle',is_visible:1,included_en:'Includes standard route charges and applicable Causeway tolls.',included_ar:'يشمل رسوم المسار العادية ورسوم الجسر عند انطباقها.',booking_notice_en:'Earlier booking is strongly recommended.',booking_notice_ar:'ينصح بالحجز المبكر.',whatsapp_override:'' }];
    const lead = { id:1,lead_uuid:'30f1599a-1111-4111-8111-123456789abc',booking_ref:'GCC-30F1599A',clicked_at:new Date().toISOString(),route_slug:'bahrain-to-riyadh',route_label:'Bahrain to Riyadh',page_path:'/bahrain-saudi-gcc-transport/en/bahrain-to-riyadh/',language:'en',device_type:'mobile',status:'new',revenue:0,booking_phone_used:'97333225954',public_price_shown:120,customer_name:null,customer_phone:null,follow_up_consent:0,raw_payload:'{}' };
    let body = { ok:true };
    if (resource === 'public-settings') body.public_config = { settings, routes:routeRows };
    else if (resource === 'routes') body.routes = routeRows;
    else if (resource === 'summary') body.summary = { total:1,total_pageviews:5,new_count:1,by_route:[],by_day:[],by_device:[],by_country:[],by_source:[],by_campaign:[],business_report:{} };
    else if (resource === 'notification-settings') body.notification_settings = {};
    else if (resource === 'errors') body.errors = [];
    else if (resource === 'passenger-care') body.feedback = [];
    else if (resource === 'pageviews') body.leads = [];
    else body.leads = [lead];
    await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(body) });
  });
  await page.goto(`${base}/admin/`);
  await page.locator('#tokenInput').fill('local-screenshot-token');
  await page.locator('#loginForm button[type="submit"]').click();
  await page.locator('#dashboardView').waitFor({ state:'visible' });
  await page.screenshot({ path:path.join(out,'improved-lead-dashboard.png'), fullPage:true });
  await page.locator('[data-tab="settings"]').click();
  await page.screenshot({ path:path.join(out,'admin-public-settings.png'), fullPage:true });
  await page.locator('[data-tab="pricing"]').click();
  await page.screenshot({ path:path.join(out,'admin-pricing-editor.png'), fullPage:true });

  await page.unroute('**/api/transport/admin**');
  await page.goto(`${base}/en/bahrain-to-riyadh/`);
  const cta = page.locator('a[data-track-wa],a[data-wa-message],a[data-booking-submit]').first();
  await cta.click();
  await page.locator('#vendora-booking-ready').waitFor({ state:'visible' });
  await page.screenshot({ path:path.join(out,'customer-pre-whatsapp-confirmation.png'), fullPage:true });
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
