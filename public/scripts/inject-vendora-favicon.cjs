const fs = require('fs');
const path = require('path');

const ICON = 'https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png';
const SNIPPET = `\n  <link rel="icon" type="image/png" href="${ICON}">\n  <link rel="apple-touch-icon" href="${ICON}">`;

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === '_site') continue;
    const p = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, '..');
let updated = 0;
let skipped = 0;
let failed = 0;

for (const file of walkHtml(root)) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('logo-icon.png')) {
    skipped++;
    continue;
  }
  const i = s.indexOf('<head>');
  if (i === -1) {
    console.warn('No <head>:', path.relative(root, file));
    failed++;
    continue;
  }
  const insertAt = i + '<head>'.length;
  const n = s.slice(0, insertAt) + SNIPPET + s.slice(insertAt);
  fs.writeFileSync(file, n);
  console.log('Updated', path.relative(root, file));
  updated++;
}

console.log(`Done. Updated ${updated}, skipped (already had icon): ${skipped}, no head: ${failed}`);
