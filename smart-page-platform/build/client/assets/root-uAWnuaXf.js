import{r as i,j as t}from"./jsx-runtime-56DGgGmo.js";import{t as y,d as f,v as w,w as x,_ as S,x as a,M as g,y as j,O as k,S as b}from"./components-BMLruC94.js";/**
 * @remix-run/react v2.17.4
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let l="positions";function M({getKey:r,...c}){let{isSpaMode:m}=y(),n=f(),d=w();x({getKey:r,storageKey:l});let u=i.useMemo(()=>{if(!r)return null;let e=r(n,d);return e!==n.key?e:null},[]);if(m)return null;let p=((e,h)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let o=JSON.parse(sessionStorage.getItem(e)||"{}")[h||window.history.state.key];typeof o=="number"&&window.scrollTo(0,o)}catch(s){console.error(s),sessionStorage.removeItem(e)}}).toString();return i.createElement("script",S({},c,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${p})(${a(JSON.stringify(l))}, ${a(JSON.stringify(u))})`}}))}const R="/assets/tailwind-BRFRRv5n.css",N=()=>[{rel:"stylesheet",href:R}],O=()=>[{title:"Smart Page Platform - Link in Bio Website Builder"},{name:"description",content:"Create fast mobile landing pages, link-in-bio websites, short links, forms, analytics, and hosted HTML pages on Cloudflare."},{name:"viewport",content:"width=device-width, initial-scale=1"},{property:"og:site_name",content:"Smart Page Platform"},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}];function _(){return t.jsxs("html",{lang:"en",className:"h-full bg-slate-50",children:[t.jsxs("head",{children:[t.jsx("meta",{charSet:"utf-8"}),t.jsx(g,{}),t.jsx(j,{})]}),t.jsxs("body",{className:"h-full text-slate-900",children:[t.jsx(k,{}),t.jsx(M,{}),t.jsx(b,{})]})]})}export{_ as default,N as links,O as meta};
