import profiles from '../config/route-profiles.mjs';
import { businessEntity, serviceEntity, offerCatalog, faqEntity, pricingCopy } from '../assets/trust-schema.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const json = (s) => JSON.stringify(s).replace(/</g, '\\u003c');
const plain = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g,'&').replace(/&#0?39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();

export function publishTrust(html, { slug, lang, url, business, config, assetPrefix }) {
  const en = lang === 'en';
  const p = profiles[slug];
  const legal = `${en ? business.legal_name : business.legal_name_ar} | ${en ? 'CR No:' : 'س.ت:'} ${business.cr_number} | ${en ? business.public_address : business.public_address_ar}`;
  html = html.replace(/(<small\b[^>]*data-vendora-cr[^>]*>)[\s\S]*?(<\/small>)/g, `$1${esc(legal)}$2`);
  html = html.replace(/\s*<script\b[^>]*data-vendora-trust-ui[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/\s*<script\b[^>]*data-vendora-faq[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/(<script\b[^>]*id=["']pricesSchema["'][^>]*)\sdata-vendora-schema/g, '$1');
  html = html.replace(/<section\b[^>]*data-route-profile[^>]*>[\s\S]*?<\/section>/gi, '');
  if (p) {
    const title = en ? `Plan your ${p.name_en} journey` : `خطط لرحلة ${p.name_ar}`;
    const distance = `${p.distance_km[0]}–${p.distance_km[1]} ${en ? 'km' : 'كم'}`;
    const drive = `${p.driving_hours[0]}–${p.driving_hours[1]} ${en ? 'driving hours' : 'ساعة قيادة'}`;
    const explanation = en ? 'Representative road estimates; exact distance depends on pickup and drop-off pins. Border queues, rest stops and city traffic add time.' : 'تقديرات لمسار بري نموذجي؛ تعتمد المسافة الدقيقة على مواقع الاستلام والوصول. يضاف وقت لانتظار الحدود والاستراحات وازدحام المدن.';
    const documents = en ? 'GCC citizens: carry an original passport or a national ID accepted for this crossing. Residents: carry your original passport, valid residence permit and the destination or transit visas required for your nationality. Check exit/re-entry requirements with your residence country. Declare restricted goods to customs; the driver cannot guarantee entry.' : 'مواطنو دول مجلس التعاون: احمل جواز السفر الأصلي أو الهوية الوطنية المقبولة لهذا المعبر. المقيمون: احمل جواز السفر الأصلي والإقامة السارية وتأشيرات الوجهة أو العبور المطلوبة لجنسيتك. تحقق من متطلبات الخروج والعودة لدى بلد الإقامة. صرّح عن السلع المقيدة للجمارك؛ لا يستطيع السائق ضمان الدخول.';
    const toll = en ? (p.uses_causeway ? 'King Fahd Causeway: confirm the current vehicle toll in the JESR app or with the authority. The former BHD 2.500 / SAR 25 tariff was superseded in February 2026. Ask whether the confirmed fare includes tolls, insurance and waiting.' : 'This route does not use King Fahd Causeway. Confirm the land borders, road tolls, insurance and waiting charges in your written quote.') : (p.uses_causeway ? 'جسر الملك فهد: أكد رسم عبور المركبة الحالي عبر تطبيق جسر أو المؤسسة. تم استبدال تعرفة ٢٫٥٠٠ دينار بحريني أو ٢٥ ريالاً سعودياً في فبراير ٢٠٢٦. اسأل إن كان السعر المؤكد يشمل الرسوم والتأمين والانتظار.' : 'لا يمر هذا المسار بجسر الملك فهد. أكد المعابر البرية ورسوم الطرق والتأمين والانتظار في عرض السعر المكتوب.');
    const faqs = p[`faq_${lang}`];
    const routeSummary = `<p><strong>${esc(p[`name_${lang}`])}:</strong> ${distance} · ${drive}. ${explanation} <span data-live-route-fare>${pricingCopy[lang].cta}</span></p>`;
    html = html.replace(/(<div\b[^>]*class=["'][^"']*\bphase10-answer-first\b[^"']*["'][^>]*>)[\s\S]*?(<\/div>)/gi, `$1${routeSummary}$2`);
    const faqMarkup = faqs.map(([q,a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
    const section = `<section class="section" data-route-profile="${slug}"><div class="container section-shell"><div class="section-head"><h2>${esc(title)}</h2><p>${distance} · ${drive}</p><p>${explanation}</p></div><div class="route-grid"><article class="route-card"><h3>${en ? 'Pickup planning' : 'ترتيب الاستلام'}</h3><p>${esc(p[`pickup_${lang}`])}</p></article><article class="route-card"><h3>${en ? 'Destination drop-off hubs' : 'نقاط الوصول في الوجهة'}</h3><p>${esc(p[`hubs_${lang}`])}</p><p>${esc(p[`arrival_${lang}`])}</p></article><article class="route-card"><h3>${en ? 'Tolls and border documents' : 'الرسوم ووثائق الحدود'}</h3><p>${toll}</p><p>${documents}</p><p><a href="https://kfca.sa/">${en ? 'Causeway authority' : 'مؤسسة جسر الملك فهد'}</a> · <a href="https://visa.visitsaudi.com/">${en ? 'Saudi visa portal' : 'بوابة التأشيرة السعودية'}</a> · <a href="https://www.evisa.gov.bh/">${en ? 'Bahrain visa eligibility' : 'أهلية تأشيرة البحرين'}</a></p></article></div><h2>${en ? 'Questions for this route' : 'أسئلة هذا المسار'}</h2><div class="faq-wrap" data-route-faq>${faqMarkup}</div></div></section>`;
    // Replace the old shared route FAQ and details, so distinct content takes its place.
    html = html.replace(/<section\b[^>]*(?:id=["']faq["']|class=["'][^"']*\b(?:seo-route-details|route-insights|route-concept-note)\b[^"']*["'])[^>]*>[\s\S]*?<\/section>/gi, '');
    html = html.replace(/(<\/section>)/i, `$1${section}`);
  }
  const route = config.routes.find((r) => r.route_slug === slug);
  const pageTitle = plain(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || business.brand_display_name);
  const graph = [businessEntity(business, lang), { '@type':'WebPage', '@id':`${url}#webpage`, name:pageTitle, url, inLanguage:lang },
    { '@type':'BreadcrumbList', itemListElement:[{ '@type':'ListItem', position:1, name:en?'Home':'الرئيسية', item:`https://getvendora.net/bahrain-saudi-gcc-transport/${en?'en/':''}` },
      ...(slug === 'home' ? [] : [{ '@type':'ListItem',position:2,name:pageTitle,item:url }])] }];
  if (slug === 'gcc-transport-planner') graph.push({ '@type':'Service', name:pageTitle, provider:{'@id':'https://getvendora.net/#organization'}, areaServed:['BH','SA','KW','QA','AE','OM'] });
  if (p) {
    graph.push(serviceEntity(route || { route_slug: slug, public_price_enabled: false }, config.settings, lang, url, p));
    graph.push(offerCatalog([route || { route_slug: slug, public_price_enabled:false }], config.settings, lang, url, profiles));
  }
  if (slug === 'prices') graph.push(offerCatalog(config.routes, config.settings, lang, url, profiles));
  const schema = `<script type="application/ld+json" data-vendora-schema>${json({ '@context':'https://schema.org', '@graph':graph })}</script>`;
  html = html.replace(/<script\b(?=[^>]*data-vendora-schema)(?![^>]*id=["']pricesSchema["'])[^>]*>[\s\S]*?<\/script>/gi, '');
  let faqs = p?.[`faq_${lang}`];
  if (!faqs) faqs = [...html.matchAll(/<details\b[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)].map((m) => [plain(m[1]), plain(m[2])]).filter(([q,a])=>q&&a);
  const faqScript = faqs.length ? `<script type="application/ld+json" data-vendora-faq>${json(faqEntity(faqs,url))}</script>` : '';
  html = html.replace('</head>', `${schema}${faqScript}<script type="module" src="${assetPrefix}trust-ui.js" data-vendora-trust-ui></script></head>`);
  if (!html.includes('data-vendora-global-config')) {
    html = html.replace('<script type="module"', `<script defer src="${assetPrefix}vendora-config.js" data-vendora-global-config></script><script type="module"`);
  }
  if (['prices','contact'].includes(slug)) {
    html = html.replace(/<p\b[^>]*data-pricing-mode[^>]*>[\s\S]*?<\/p>/gi,'');
    html = html.replace(/(<main\b[^>]*>)\s*(?:<p class="route-fare-badge">[^<]*<\/p>\s*)+/i, '$1');
    html = html.replace(/(<main\b[^>]*>)/i, `$1<p class="container route-fare-badge" data-pricing-mode>${pricingCopy[lang].seasonal}</p>`);
  }
  if (slug === 'contact') {
    html = html.replace(/<section\b[^>]*data-contact-rates-section[^>]*>[\s\S]*?<\/section>/gi,'');
    const routes = config.routes.filter(r=>['bahrain-to-khobar','bahrain-to-dammam-airport','bahrain-to-riyadh'].includes(r.route_slug));
    const cards = routes.map(r=>{
      const name = r[`route_name_${lang}`];
      const message = en ? `Please send a live seasonal quote for ${name}.` : `أرجو إرسال عرض سعر موسمي فوري لمسار ${name}.`;
      return `<article class="price-card"><h3>${esc(name)}</h3><a href="https://wa.me/${business.booking_whatsapp}?text=${encodeURIComponent(message)}">${pricingCopy[lang].cta}</a></article>`;
    }).join('');
    html=html.replace('</main>',`<section class="section" data-contact-rates-section><div class="container section-shell"><h2>${en?'Popular route quotes':'عروض أسعار المسارات الشائعة'}</h2><div class="route-grid" data-contact-prices>${cards}</div></div></section></main>`);
  }
  return html;
}
