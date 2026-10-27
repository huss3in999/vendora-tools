import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import profiles from '../config/route-profiles.mjs';
import { gccBrandCopy } from '../assets/gcc-brand-copy.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mediaPath = resolve(root,'config/responsive-media.json');
const media = existsSync(mediaPath) ? JSON.parse(readFileSync(mediaPath,'utf8')) : {};
const publicRoot = resolve(root,'..');
const hashCache = new Map();
const attr = (s, name) => s.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
function set(s, name, value) {
  const re = new RegExp(`\\s${name}=["'][^"']*["']`, 'i');
  return re.test(s) ? s.replace(re, ` ${name}="${value}"`) : s.replace(/\s*\/?>$/, ` ${name}="${value}">`);
}
function classes(s, names) {
  return set(s, 'class', [...new Set([...(attr(s,'class') || '').split(/\s+/), ...names.split(' ')])].filter(Boolean).join(' '));
}
export function finalizePublicHtml(html, { slug, lang, url }) {
  const en = lang === 'en';
  if (['home', 'english-home'].includes(slug)) {
    const copy = gccBrandCopy[en ? 'en' : 'ar'];
    const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(copy.title)}</title>`)
      .replace(/(<meta\b[^>]*(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]*content=["'])[^"']*(["'][^>]*>)/gi, `$1${esc(copy.description)}$2`)
      .replace(/(<meta\b[^>]*(?:name|property)=["'](?:og:title|twitter:title)["'][^>]*content=["'])[^"']*(["'][^>]*>)/gi, `$1${esc(copy.title)}$2`)
      .replace(/(<meta\b[^>]*name="keywords"[^>]*content=")[^"]*("[^>]*>)/gi, `$1${esc(copy.keywords)}$2`)
      .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, `<h1>${copy.heading}</h1>`)
      .replace(/<p class="lead">[\s\S]*?<\/p>/i, `<p class="lead">${copy.lead}</p>`)
      .replace(/<p class="home-hero-mobile-summary">[\s\S]*?<\/p>/i, `<p class="home-hero-mobile-summary">${copy.countries}</p>`)
      .replace(/<span class="eyebrow"><strong>[\s\S]*?<\/strong><\/span>/i, `<span class="eyebrow"><strong>${copy.eyebrow}</strong></span>`)
      .replace(/<ul class="hero-points">[\s\S]*?<\/ul>/i, `<ul class="hero-points"><li>${copy.countries}</li><li>${copy.transferHeading}</li><li>${copy.localHeading}</li><li>${copy.note}</li></ul>`);
    html = html.replace('المسار الرئيسي: البحرين ⇄ الرياض ونقل خاص للسعودية والخليج', copy.eyebrow);
    html = html.replace(/(<div class="hero-actions"[^>]*>)([\s\S]*?)(<\/div>)/i, (_, open, body, close) => {
      let index = 0;
      body = body.replace(/<a\b[^>]*>/g, tag => {
        if (!/wa\.me|data-wa-message/.test(tag)) return tag;
        const phone = tag.match(/wa\.me\/(\d+)/)?.[1] || '97333225954';
        return set(set(tag, 'href', `https://wa.me/${phone}?text=${encodeURIComponent(copy.bookingMessage)}`), 'data-wa-message', copy.bookingMessage);
      });
      return open + body.replace(/<a class="ghost-btn"[^>]*>[\s\S]*?<\/a>/g, () => index++ === 0
        ? `<a class="ghost-btn" href="/bahrain-saudi-gcc-transport/${en ? 'en/' : ''}gcc-destinations/">${copy.transferCta}</a>`
        : `<a class="ghost-btn" href="${url === 'https://getvendora.net/' ? '#booking-section' : '#booking'}">${copy.localCta}</a>`) + close;
    });
    html = html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (match, open, content, close) => {
      try {
        const data = JSON.parse(content);
        for (const node of data['@graph'] || []) if (node['@type'] === 'WebPage') node.name = copy.title;
        return open + JSON.stringify(data).replace(/</g, '\\u003c') + close;
      } catch { return match; }
    });
    html = html.replace(/<section\b[^>]*data-gcc-service-overview[^>]*>[\s\S]*?<\/section>/g, '');
    const base = `/bahrain-saudi-gcc-transport/${en ? 'en/' : ''}`;
    const booking = url === 'https://getvendora.net/' ? '#booking-section' : '#booking';
    const section = `<section class="section" data-gcc-service-overview><div class="container section-shell"><div class="section-head"><span class="section-kicker">${copy.countries}</span><h2>${copy.serviceHeading}</h2></div><div class="route-grid"><article class="price-card"><h3>${copy.transferHeading}</h3><p>${copy.transferBody}</p><a class="primary-btn" href="${base}gcc-destinations/">${copy.transferCta}</a></article><article class="price-card"><h3>${copy.localHeading}</h3><p>${copy.localBody}</p><a class="primary-btn" href="${booking}">${copy.localCta}</a></article></div></div></section>`;
    html = html.replace(/<\/section>/i, `</section>${section}`);
  }
  // Keep third-party profile links crawlable and separate from our own testimonials.
  html = html.replace(/<div data-tripadvisor-links>[\s\S]*?<\/div>/g, '');
  html = html.replace(/<p data-linkedin-link>[\s\S]*?<\/p>/g, '');
  if (/<footer\b/.test(html) && (url === 'https://getvendora.net/' || url.includes('/bahrain-saudi-gcc-transport/'))) {
    const label = en ? 'Find Vendora Transport on Tripadvisor' : 'ڤيندورا ترانسبورت على تريب أدفايزر';
    const cta = en ? 'Review your journey on Tripadvisor' : 'قيّم رحلتك على تريب أدفايزر';
    const copy = en ? 'Travelled with Vendora? Share your honest feedback to help other travelers.' : 'سافرت مع ڤيندورا؟ شارك رأيك الصادق لمساعدة المسافرين الآخرين.';
    html = html.replace(/<\/footer>/i, `<div data-tripadvisor-links><p><a href="https://www.tripadvisor.com/34715134" target="_blank" rel="noopener noreferrer"><img src="/assets/tripadvisor-badge.svg" alt="" width="160" height="40" loading="lazy" decoding="async"> ${label}</a></p><p>${copy}</p><p><a href="https://www.tripadvisor.com/UserReviewEdit-d34715134" target="_blank" rel="noopener noreferrer">${cta}</a></p></div></footer>`);
    const linkedinLabel = en ? 'Follow Vendora Transport on LinkedIn' : 'تابع فندورا ترانسبورت على لينكدإن';
    html = html.replace(/<\/footer>/i, `<p data-linkedin-link><a href="https://www.linkedin.com/company/vendora-transport/" target="_blank" rel="noopener noreferrer">${linkedinLabel}</a></p></footer>`);
  }
  if(en) html=html.replace(/<a\b([^>]*)>\s*العربية\s*<\/a>/gi,(_,attrs)=>classes(`<a${attrs}>`,'lang-toggle')+'Arabic</a>');
  // Curated testimonials are distinct from the separately moderated Passenger Care feed.
  const labels = en ? [
    [/verified passenger reviews/g,'published customer testimonials'],
    [/Verified Passenger Feedback/g,'Customer experiences'],
    [/Verified Passenger Experiences/g,'Customer experiences'],
    [/Verified Passenger/g,'Customer testimonial'],
    [/Corporate testimonial Invoicing/g,'Verified Corporate Invoicing'],
    [/Verified Corporate(?! Invoicing)/g,'Corporate testimonial'],
    [/Verified Family/g,'Family testimonial']
  ] : [
    [/تقييمات موثقة/g,'تجارب عملاء منشورة'],
    [/تقييمات المسافرين الموثقة/g,'تجارب العملاء'],
    [/مسافر موثق/g,'تجربة عميل']
  ];
  for (const [pattern,value] of labels) html=html.replace(pattern,value);
  html=html.replace(/<div\b[^>]*class=["'][^"']*\broute-rating-badge\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,block=>block.replace(/color:[^;"']+/gi,'color:#714912!important'));
  if (slug === 'home' || slug === 'english-home') {
    const p=profiles['bahrain-to-riyadh'];
    html=html.replace(/~?450\s*(?:km|كم)/g,`${p.distance_km.join('–')} ${en?'km':'كم'}`)
      .replace(/~?4\.5[–-]5\.5/g,p.driving_hours.join('–'));
    if(en) html=html.replace(/(<a\b[^>]*class=["'][^"']*lang-toggle[^"']*["'][^>]*>)[\s\S]*?(<\/a>)/gi,'$1Arabic$2');
  }
  // Dedicated English pages keep service navigation in English. Language controls are explicit.
  if (en) html = html.replace(/<a\b[^>]*>/gi, tag => {
    const href = attr(tag,'href');
    if (!href || /lang-toggle|data-vip-language|hreflang=/.test(tag)) return tag;
    if (/\/(?:en\/)?index\.html$/.test(href)) return tag;
    return tag.replace(/(href=["'])(\/bahrain-saudi-gcc-transport\/)(?!en\/|assets\/|api\/|care\/|admin\/)([^"']*)(["'])/i, '$1$2en/$3$4');
  });
  html = html.replace(/<script\b[^>]*src=["'][^"']*\/business-config\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
  // Remove stale fare suffixes from all metadata, without modifying unrelated facts.
  html = html.replace(/(?:\s*\|)?\s*(?:From\s+)?(?:Price on request|Get Live Seasonal Quote)\s*(?=\||<\/title>|["'])/gi,' ');
  html = html.replace(/&amp;amp;/g, '&amp;');
  html = html.replace(/<title>([\s\S]*?)<\/title>/i,(_,title)=>`<title>${title.replace(/\s+\|/g,' |').replace(/\|\s*\|/g,'|').trim()}</title>`);
  if (slug !== 'home' && slug !== 'english-home') {
    html = html.replace(/<body\b[^>]*>/i, tag=>classes(tag,'vip-content-app'));
    html=html.replace(/(<aside\b[^>]*class=["'][^"']*\bhero-side\b[^"']*["'][^>]*>)([\s\S]*?)(<\/aside>)/i,(_,open,content,close)=>{
      if(/<img\b/i.test(content))return open+content+close;
      const image=/airport|pickup/.test(slug)?'bahrain-airport-private-transfer':/causeway|dammam|khobar|saudi|riyadh/.test(slug)?'king-fahd-causeway-private-transfer':'gmc-xl-interior-comfort';
      return open+`<img src="/bahrain-saudi-gcc-transport/assets/images/${image}.webp" alt="${en?'Comfortable private vehicle for GCC transport':'مركبة خاصة مريحة للنقل بين دول الخليج'}" width="1672" height="941" loading="eager" fetchpriority="high">`+content+close;
    });
    let first = true;
    html = html.replace(/<(?:section|div|aside|article)\b[^>]*>/gi, tag=> {
      const c = attr(tag,'class') || '';
      if (first && /(?:^|\s)(?:hero|premium-hero|planner-hero)(?:\s|$)/.test(c)) { first=false; return classes(tag,'vip-content-hero'); }
      if (/\b(?:hero-grid|premium-hero-grid|planner-hero-grid)\b/.test(c)) return classes(tag,'vip-content-hero-grid');
      if (/\b(?:hero-copy|premium-hero-copy|planner-hero-copy)\b/.test(c)) return classes(tag,'vip-content-hero-copy');
      if (/\b(?:hero-side|hero-media-card|planner-media-frame)\b/.test(c)) return classes(tag,'vip-content-hero-visual');
      return tag;
    });
  }
  if (!html.includes('class="vip-trust-strip')) {
    const labels=en?['at any time, subject to availability coordination','Private vehicle','Journey reference']:['تنسيق على مدار الساعة','مركبة خاصة','مرجع للرحلة'];
    const strip=`<section class="vip-trust-strip" aria-label="${en?'Service essentials':'مزايا الخدمة الأساسية'}"><div class="container vip-trust-grid">${labels.map(label=>`<div class="vip-trust-item"><span>${label}</span></div>`).join('')}</div></section>`;
    html=html.replace(/(<section\b[^>]*class=["'][^"']*\b(?:hero|premium-hero|planner-hero)\b[^"']*["'][^>]*>[\s\S]*?<\/section>)/i,`$1${strip}`);
  }
  // Choose sources in initial HTML, before the layout/browser code runs.
  let imageIndex = 0;
  html = html.replace(/<img\b[^>]*>/gi, tag=> {
    const raw = attr(tag,'data-media-source') || attr(tag,'src');
    if (!raw) return tag;
    const source = new URL(raw,url).pathname;
    const entry = media[source];
    if (!entry) return tag;
    const hero = imageIndex++ === 0;
    tag = set(tag,'data-media-source',source);
    const relativeUrl = value => posix.relative(new URL('.',url).pathname,value);
    tag = set(tag,'src',relativeUrl(entry.variants.find(v=>v.width>=768)?.url || entry.variants.at(-1).url));
    tag = set(tag,'srcset',entry.variants.map(v=>`${relativeUrl(v.url)} ${v.width}w`).join(', '));
    tag = set(tag,'sizes',hero ? '(max-width: 900px) 100vw, 50vw' : '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw');
    tag = set(set(tag,'width',entry.width),'height',entry.height);
    tag = set(tag,'loading',hero?'eager':'lazy');
    if (hero) { tag = set(tag,'fetchpriority','high'); if (slug !== 'home' && slug !== 'english-home') tag=classes(tag,'vip-page-hero-image'); }
    return tag;
  });
  // Hash query versions make each published static payload immutable without changing import paths.
  html = html.replace(/<(?:script|link)\b[^>]*>/gi, tag=> {
    const name = /^<script/i.test(tag)?'src':'href';
    const raw = attr(tag,name);
    if (!raw || !/\.(?:css|js)(?:\?|$)/.test(raw) || /^https?:/.test(raw)) return tag;
    const path = new URL(raw,url).pathname;
    const file = resolve(publicRoot,'.'+path);
    if (!existsSync(file)) return tag;
    if (!hashCache.has(file)) hashCache.set(file,createHash('sha256').update(readFileSync(file)).digest('hex').slice(0,12));
    return set(tag,name,raw.split('?')[0]+'?v='+hashCache.get(file));
  });
  return html.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,'\n\n').replace(/[ \t]+$/gm,'');
}
