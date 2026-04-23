const fs = require('fs');
const path = require('path');

const ICON = 'https://pub-35cd730843794eadacaef9613c686ba8.r2.dev/logo-icon.png';
const minifiedNeedle = '<head><meta charset="UTF-8" />';
const minifiedInsert =
  `<head><link rel="icon" type="image/png" href="${ICON}" /><link rel="apple-touch-icon" href="${ICON}" /><meta charset="UTF-8" />`;

const multilineNeedleLf = `<head>\n  <meta charset="UTF-8" />`;
const multilineInsertLf =
  `<head>\n  <link rel="icon" type="image/png" href="${ICON}" />\n  <link rel="apple-touch-icon" href="${ICON}" />\n  <meta charset="UTF-8" />`;
const multilineNeedleCrlf = `<head>\r\n  <meta charset="UTF-8" />`;
const multilineInsertCrlf =
  `<head>\r\n  <link rel="icon" type="image/png" href="${ICON}" />\r\n  <link rel="apple-touch-icon" href="${ICON}" />\r\n  <meta charset="UTF-8" />\r\n`;

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') continue;
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

for (const file of walkHtml(root)) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('logo-icon.png')) {
    skipped++;
    continue;
  }
  let n = s;
  if (n.includes(minifiedNeedle)) n = n.replace(minifiedNeedle, minifiedInsert);
  else if (n.includes(multilineNeedleCrlf)) n = n.replace(multilineNeedleCrlf, multilineInsertCrlf);
  else if (n.includes(multilineNeedleLf)) n = n.replace(multilineNeedleLf, multilineInsertLf);
  else {
    console.warn('No matching <head> pattern:', path.relative(root, file));
    continue;
  }
  if (n !== s) {
    fs.writeFileSync(file, n);
    console.log('Updated', path.relative(root, file));
    updated++;
  }
}

console.log(`Done. Updated ${updated}, skipped (already had icon): ${skipped}`);
