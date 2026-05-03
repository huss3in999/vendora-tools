import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";
import { Logo } from "~/components/brand/Logo";
import { buttonClassName } from "~/components/ui/Button";

export const meta: MetaFunction = () => [
  { title: "Smart Page Platform - Link-in-Bio, Landing Pages, and Hosted HTML Sites" },
  {
    name: "description",
    content:
      "Create mobile landing pages, link-in-bio websites, short links, forms, analytics, templates, themes, and hosted HTML pages for creators and small businesses."
  },
  {
    name: "keywords",
    content:
      "link in bio builder, landing page builder, smart page platform, short link page, hosted HTML website, WhatsApp landing page, small business landing page, creator page builder, Linktree alternative, Taplink alternative, Beacons alternative"
  },
  { name: "robots", content: "index, follow" },
  { property: "og:title", content: "Smart Page Platform - Build a polished public page for your business" },
  {
    property: "og:description",
    content:
      "A Cloudflare-powered page builder for creators, shops, restaurants, salons, freelancers, and anyone who needs a public page with links, forms, analytics, templates, and HTML support."
  },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" }
];

const featureGroups = [
  {
    eyebrow: "Page builder",
    title: "Build pages that feel finished, not temporary.",
    items: [
      "Profile and avatar blocks",
      "Link buttons and WhatsApp buttons",
      "FAQ, price list, map, contact card, gallery, divider, announcement, and timer blocks",
      "Full HTML embed support for custom mini-sites"
    ]
  },
  {
    eyebrow: "Business tools",
    title: "Give owners simple controls without making the dashboard heavy.",
    items: [
      "Owner dashboard with page stats",
      "Views, clicks, top pages, and top clicked blocks",
      "Lead/contact form storage",
      "Publish, unpublish, short links, and indexing controls"
    ]
  },
  {
    eyebrow: "SEO foundation",
    title: "Public pages are prepared for search and sharing.",
    items: [
      "Sitemap and robots.txt support",
      "Canonical public URLs",
      "SEO title and description controls",
      "Open Graph and Twitter metadata from page content"
    ]
  }
];

const demoPages = [
  {
    title: "Creator demo",
    href: "/p/demo-creator",
    description: "Profile, social links, gallery, media kit, FAQ, and collaboration form.",
    accent: "bg-[#f8e8ef]"
  },
  {
    title: "Restaurant demo",
    href: "/p/demo-restaurant",
    description: "Menu highlights, WhatsApp ordering, map, offers, gallery, and FAQ.",
    accent: "bg-[#fbecd8]"
  },
  {
    title: "Salon demo",
    href: "/p/demo-salon",
    description: "Booking CTA, service prices, beauty gallery, contact card, and client FAQ.",
    accent: "bg-[#f6e8eb]"
  }
];
const templates = [
  "Creator / Personal Brand",
  "Restaurant / Food",
  "Clothing Store",
  "Salon / Beauty",
  "Driver / Transport Service",
  "Freelancer / Services",
  "Event / Booking Page"
];

const comparison = [
  ["One public URL", "Share a page that contains links, offers, forms, contact, and custom sections."],
  ["No-code first", "Owners can create and publish without touching code."],
  ["Code when needed", "Advanced users can paste hosted HTML for a more custom website style."],
  ["Cloudflare-friendly", "D1-backed storage, Workers deployment, and fast public rendering."],
  ["Privacy-conscious analytics", "Simple performance data without storing raw IP addresses."],
  ["Multi-tenant ready", "Owner and super admin dashboards are separated and role-protected."]
];

export default function Index() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Smart Page Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://smart.getvendora.net/",
    description:
      "A Cloudflare-powered link-in-bio, landing page, short link, and hosted HTML page builder for creators and small businesses.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-[#1e2420]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="relative overflow-hidden px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(92,120,82,0.16),transparent_32%),radial-gradient(circle_at_92%_18%,rgba(206,154,102,0.16),transparent_30%),linear-gradient(180deg,#fbfaf6_0%,#f1ede4_100%)]" />
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between rounded-3xl border border-[#d8d1c2] bg-white/75 px-4 py-3 shadow-sm backdrop-blur animate-[sppFadeDown_0.65s_ease-out_both]">
            <Logo />
            <nav className="hidden items-center gap-7 text-sm font-semibold text-[#596157] md:flex" aria-label="Homepage navigation">
              <a href="#features" className="transition hover:text-[#1e2420]">Features</a>
              <a href="#demos" className="transition hover:text-[#1e2420]">Demos</a>
              <a href="#templates" className="transition hover:text-[#1e2420]">Templates</a>
              <a href="#seo" className="transition hover:text-[#1e2420]">SEO</a>
              <a href="#workflow" className="transition hover:text-[#1e2420]">How it works</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/login" className={buttonClassName({ variant: "ghost", className: "rounded-full px-4" })}>
                Log in
              </Link>
              <Link to="/signup" className={buttonClassName({ className: "rounded-full bg-[#26352b] px-5 hover:bg-[#1c281f]" })}>
                Start free
              </Link>
            </div>
          </header>

          <div className="grid min-h-[calc(100svh-96px)] items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
            <div className="max-w-2xl animate-[sppRise_0.8s_ease-out_0.08s_both]">
              <p className="inline-flex rounded-full border border-[#d8d1c2] bg-white/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b705f]">
                Link-in-bio, landing pages, hosted HTML
              </p>
              <h1 className="mt-5 text-[2.65rem] font-semibold leading-[1.03] tracking-[-0.055em] text-[#1c211d] sm:text-5xl lg:text-[4.35rem]">
                A polished public page for every business link.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#5d635b] sm:text-lg">
                Smart Page Platform helps owners launch mobile pages with templates, useful content blocks, short links, analytics, SEO controls, and safe custom HTML when a simple page needs to become a mini-site.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className={buttonClassName({ className: "h-11 rounded-full bg-[#26352b] px-6 text-sm hover:bg-[#1c281f]" })}>
                  Create your first page
                </Link>
                <Link to="/p/demo-creator" className={buttonClassName({ variant: "ghost", className: "h-11 rounded-full border border-[#d8d1c2] bg-white/70 px-6 text-sm" })}>
                  See creator demo
                </Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
                {[
                  ["20+", "content blocks"],
                  ["7", "starter templates"],
                  ["D1", "persistent backend"]
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-[#d8d1c2] bg-white/60 p-4">
                    <div className="text-2xl font-semibold tracking-[-0.03em]">{value}</div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#777d72]">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-3xl animate-[sppFloatIn_0.85s_ease-out_0.16s_both]">
              <div className="absolute -left-3 top-10 hidden rounded-2xl border border-[#d8d1c2] bg-white px-4 py-3 text-sm shadow-xl lg:block animate-[sppBob_6s_ease-in-out_infinite]">
                <div className="text-xs uppercase tracking-[0.16em] text-[#7a8276]">Analytics</div>
                <div className="mt-1 text-xl font-semibold">+428 views</div>
              </div>
              <div className="absolute -right-3 bottom-10 hidden rounded-2xl bg-[#26352b] px-4 py-3 text-sm text-white shadow-xl lg:block animate-[sppBob_7s_ease-in-out_0.8s_infinite]">
                <div className="text-xs uppercase tracking-[0.16em] text-white/55">Top action</div>
                <div className="mt-1 font-semibold">WhatsApp click</div>
              </div>

              <div className="rounded-[2rem] border border-[#d8d1c2] bg-white p-3 shadow-[0_28px_80px_rgba(47,55,48,0.16)] sm:p-4">
                <div className="rounded-[1.5rem] bg-[#f9f7f1] p-4 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                    <div className="rounded-[1.25rem] bg-[#26352b] p-4 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Owner preview</span>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">Published</span>
                      </div>
                      <div className="mt-9 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#d6a15f] to-[#f2d5a2]" />
                      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Aisha Studio</h2>
                      <p className="mt-2 text-sm leading-6 text-white/68">Offers, booking links, prices, location, and WhatsApp in one elegant page.</p>
                      <div className="mt-6 space-y-2">
                        <div className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#26352b]">Book on WhatsApp</div>
                        <div className="rounded-xl bg-white/12 px-4 py-3 text-center text-sm font-semibold">View services</div>
                        <div className="rounded-xl bg-white/12 px-4 py-3 text-center text-sm font-semibold">Instagram gallery</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-[#ded8ca] bg-white p-4">
                        <div className="flex items-center justify-between gap-3 border-b border-[#ece7dc] pb-3">
                          <div>
                            <div className="text-sm font-semibold">Builder dashboard</div>
                            <div className="text-xs text-[#777d72]">Edit, publish, and track one page.</div>
                          </div>
                          <div className="rounded-full bg-[#e8efe5] px-3 py-1 text-xs font-semibold text-[#3a5c3c]">Live</div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                          {[
                            ["8.4k", "views"],
                            ["1.9k", "clicks"],
                            ["12", "leads"]
                          ].map(([value, label]) => (
                            <div key={label} className="rounded-xl bg-[#f6f4ee] p-3">
                              <div className="font-semibold">{value}</div>
                              <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#777d72]">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.25rem] border border-[#ded8ca] bg-white p-4">
                          <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a715b]">Blocks</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#4f574d]">
                            {['FAQ', 'Gallery', 'Map', 'Form', 'HTML', 'Links'].map((tag) => (
                              <span key={tag} className="rounded-full bg-[#f1ede4] px-3 py-1">{tag}</span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[1.25rem] border border-[#ded8ca] bg-white p-4">
                          <div className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a715b]">SEO</div>
                          <div className="mt-3 space-y-2 text-sm text-[#4f574d]">
                            <div className="h-2 w-full rounded bg-[#e8efe5]" />
                            <div className="h-2 w-4/5 rounded bg-[#e8efe5]" />
                            <div className="text-xs text-[#777d72]">Sitemap + metadata ready</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#ddd6c8] bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]">Features</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1c211d] sm:text-4xl">Everything needed for a useful public page.</h2>
              <p className="mt-4 leading-7 text-[#636961]">The homepage should rank because it explains the product clearly: what it does, who it helps, and why a business would use it instead of a basic link list.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {featureGroups.map((group) => (
                <article key={group.title} className="rounded-3xl border border-[#ddd6c8] bg-[#fbfaf6] p-5 transition hover:-translate-y-1 hover:shadow-xl">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7c654e]">{group.eyebrow}</p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{group.title}</h3>
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-[#5d635b]">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6f8b68]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section id="demos" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]">Live demos</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Preview real page types before creating your own.</h2>
              <p className="mt-4 leading-7 text-[#636961]">These demos are separate from test pages. They are designed to show visitors how a finished Smart Page can look for different business types.</p>
            </div>
            <Link to="/signup" className={buttonClassName({ variant: "ghost", className: "w-fit rounded-full border border-[#d8d1c2] bg-white px-5" })}>
              Build your version
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {demoPages.map((demo) => (
              <Link key={demo.href} to={demo.href} className="group rounded-3xl border border-[#ddd6c8] bg-[#fbfaf6] p-4 transition hover:-translate-y-1 hover:shadow-xl">
                <div className={`h-36 rounded-2xl ${demo.accent} p-4`}>
                  <div className="h-10 w-10 rounded-xl bg-[#26352b]" />
                  <div className="mt-7 h-3 w-2/3 rounded-full bg-[#26352b]/25" />
                  <div className="mt-3 h-3 w-1/2 rounded-full bg-[#26352b]/15" />
                  <div className="mt-5 h-9 rounded-xl bg-white/80 shadow-sm" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-[#1c211d]">{demo.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#636961]">{demo.description}</p>
                <span className="mt-4 inline-flex text-sm font-semibold text-[#3d5b42] group-hover:underline">Open demo page</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section id="templates" className="bg-[#f6f4ee] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]">Templates</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Start with a business type, then customize everything.</h2>
            </div>
            <Link to="/signup" className={buttonClassName({ variant: "ghost", className: "w-fit rounded-full border border-[#d8d1c2] bg-white px-5" })}>
              Try templates
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((template) => (
              <div key={template} className="rounded-2xl border border-[#d8d1c2] bg-white p-5 text-sm font-semibold text-[#28302a] transition hover:-translate-y-1 hover:shadow-lg">
                {template}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#26352b] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Create, publish, measure, improve.</h2>
            <p className="mt-4 leading-7 text-white/65">Owners do not need to understand hosting, analytics scripts, or database setup. They create the page, publish it, and share one clean short link.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["1", "Create a workspace and page"],
              ["2", "Choose a template and theme"],
              ["3", "Add blocks, forms, links, or HTML"],
              ["4", "Publish and watch analytics"]
            ].map(([number, label]) => (
              <div key={number} className="rounded-3xl border border-white/12 bg-white/7 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#26352b]">{number}</div>
                <div className="mt-5 text-lg font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="seo" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]">SEO and indexing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Made for Google to understand the product and the public pages.</h2>
            <p className="mt-4 leading-7 text-[#636961]">The platform exposes a real homepage, robots.txt, sitemap.xml, indexable published pages, canonical URLs, and page-level SEO metadata. Private dashboards remain blocked from search.</p>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {comparison.map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-[#ddd6c8] bg-[#fbfaf6] p-5">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#636961]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f4ee] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#d8d1c2] bg-white p-8 text-center shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]">Start free</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Launch a page today, then improve it as your business grows.</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#636961]">Use Smart Page for your bio link, service menu, WhatsApp contact page, local business page, product links, or hosted HTML mini-site.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/signup" className={buttonClassName({ className: "h-11 rounded-full bg-[#26352b] px-7 hover:bg-[#1c281f]" })}>
              Sign up free
            </Link>
            <Link to="/login" className={buttonClassName({ variant: "ghost", className: "h-11 rounded-full border border-[#d8d1c2] bg-white px-7" })}>
              Log in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


