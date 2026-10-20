import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import profiles from '../config/route-profiles.mjs';
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
