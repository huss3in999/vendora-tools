import { pricingCopy, offerCatalog, serviceEntity, priceHidden } from './trust-schema.mjs';
import profiles from '../config/route-profiles.mjs';

const lang = document.documentElement.lang === 'en' ? 'en' : 'ar';
const business = window.VENDORA_BUSINESS_CONFIG || {};
const copy = pricingCopy[lang];
function update(config) {
  const settings = config.settings || {};
  const contactPrices=document.querySelector('[data-contact-prices]');
  if(contactPrices){
    const cards=(config.routes||[]).filter(r=>['bahrain-to-khobar','bahrain-to-dammam-airport','bahrain-to-riyadh'].includes(r.route_slug)).map(r=>{
      const card=document.createElement('article');card.className='price-card';
      const heading=document.createElement('h3');heading.textContent=r[`route_name_${lang}`];
      const price=document.createElement('p');price.className='price';
      const hidden=priceHidden(settings,r);
      price.textContent=hidden?copy.seasonal:`${Number(r.price_bhd)} ${lang==='en'?'BHD':'د.ب'}`;
      const cta=document.createElement('a');cta.textContent=hidden?copy.cta:(lang==='en'?'Check availability':'تحقق من التوفر');
      const message=lang==='en'?`Please send a quote for ${heading.textContent}.`:`أرجو إرسال عرض سعر لمسار ${heading.textContent}.`;
      cta.href=`https://wa.me/${settings.booking_whatsapp||business.booking_whatsapp}?text=${encodeURIComponent(message)}`;
      card.append(heading,price);if(settings.booking_whatsapp_enabled!==false)card.append(cta);
      return card;
    });
    contactPrices.replaceChildren(...cards);
  }
  document.querySelectorAll('[data-pricing-mode]').forEach((el) => {
    el.textContent = settings.public_prices_enabled === true ? copy.fixed : copy.seasonal;
  });
  if (/\/contact\/$/.test(location.pathname)) {
    document.querySelectorAll('.route-fare-badge').forEach((el) => {
      el.textContent = settings.public_prices_enabled === true ? copy.fixed : copy.seasonal;
    });
  }
  const schema = document.getElementById('pricesSchema');
  if (schema) schema.textContent = JSON.stringify(offerCatalog(config.routes || [],settings,lang,location.href));
  if (schema) {
    const primary=document.querySelector('head script[data-vendora-schema]');
    if(primary){
      const graph=JSON.parse(primary.textContent)['@graph'];
      primary.textContent=JSON.stringify({'@context':'https://schema.org','@graph':graph.filter(n=>n['@type']!=='OfferCatalog')});
    }
  }
  const slug = document.querySelector('[data-route-profile]')?.dataset.routeProfile;
  const profile = profiles[slug];
  if (profile) {
    const routeSlug = slug.endsWith('-to-bahrain') ? `bahrain-to-${slug.slice(0,-11)}` : slug;
    const route = (config.routes || []).find(r=>r.route_slug===routeSlug) || {route_slug:slug,public_price_enabled:false};
    const node = document.querySelector('head script[data-vendora-schema]');
    if (node) {
      const graph = JSON.parse(node.textContent)['@graph'].filter(n=>!['TaxiService','OfferCatalog'].includes(n['@type']));
      graph.push(serviceEntity(route,settings,lang,location.href,profile),offerCatalog([route],settings,lang,location.href,{[route.route_slug]:profile}));
      node.textContent = JSON.stringify({'@context':'https://schema.org','@graph':graph});
    }
  }
  // Legacy display code can build footers after the module has loaded.
  document.querySelectorAll('[data-vendora-cr]').forEach((el) => {
    el.textContent = `${lang === 'en' ? business.legal_name : business.legal_name_ar} | ${lang === 'en' ? 'CR No:' : 'س.ت:'} ${business.cr_number} | ${lang === 'en' ? business.public_address : business.public_address_ar}`;
  });
}
document.addEventListener('vendora-pricing-update', (event) => update(event.detail));
async function load() {
  let embedded;
  try { embedded = JSON.parse(document.getElementById('transport-public-config')?.textContent || 'null'); } catch {}
  if (embedded?.settings) { update(embedded); return; }
  try {
    const response = await fetch('/bahrain-saudi-gcc-transport/api/transport/public-settings', { credentials:'omit', cache:'no-store' });
    if (!response.ok) throw new Error('Settings unavailable');
    update(await response.json());
  } catch {
    update({ settings: { ...business, public_prices_enabled:false }, routes:window.VENDORA_PUBLIC_CONFIG?.routes || [] });
  }
}
load();
