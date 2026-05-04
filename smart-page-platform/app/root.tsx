import type { LinksFunction, MetaFunction } from "@remix-run/cloudflare";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "@remix-run/react";
import tailwindCss from "~/styles/tailwind.css?url";

const GOOGLE_ANALYTICS_MEASUREMENT_ID = "G-DFY197R2MS";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: tailwindCss }];

export const meta: MetaFunction = () => {
  return [
    { title: "Smart Page Platform - Link in Bio Website Builder" },
    {
      name: "description",
      content:
        "Create fast mobile landing pages, link-in-bio websites, short links, forms, analytics, and hosted HTML pages on Cloudflare."
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { property: "og:site_name", content: "Smart Page Platform" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" }
  ];
};

export default function App() {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GOOGLE_ANALYTICS_MEASUREMENT_ID}');`
          }}
        />
      </head>
      <body className="h-full text-slate-900">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

