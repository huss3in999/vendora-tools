const sharp = require('../../public/node_modules/sharp');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
(async () => {
  await sharp(path.join(out,'vendora-transport-app-icon.svg')).resize(800,800).flatten({background:'#ffffff'}).png().toFile(path.join(out,'company-logo.png'));
  const photo = await sharp(path.join(out,'website-vehicle.webp')).resize(1512,256,{fit:'cover',position:'centre'}).png().toBuffer();
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1512" height="256"><defs><linearGradient id="g"><stop stop-color="#071A2E" stop-opacity="0.5"/><stop offset="0.32" stop-color="#071A2E" stop-opacity="0.96"/><stop offset="0.77" stop-color="#071A2E" stop-opacity="0.96"/><stop offset="1" stop-color="#071A2E" stop-opacity="0.2"/></linearGradient></defs><rect width="1512" height="256" fill="url(#g)"/><path d="M450 39H1062" stroke="#C8A96B" stroke-width="2"/><text x="756" y="92" text-anchor="middle" font-family="Georgia" font-size="40" font-weight="bold" fill="#F7F2E8">Vendora Transport</text><text x="756" y="133" text-anchor="middle" font-family="Arial" font-size="25" fill="#E1C78E">Bahrain ↔ Riyadh | Private GCC Transfers</text><text x="756" y="176" text-anchor="middle" font-family="Arial" font-size="26" fill="#F7F2E8" direction="rtl">نقل خاص بين البحرين والرياض ودول الخليج</text><text x="756" y="215" text-anchor="middle" font-family="Arial" font-size="20" letter-spacing="2" fill="#E1C78E">getvendora.net</text></svg>`);
  await sharp(photo).composite([{input:overlay}]).png().toFile(path.join(out,'linkedin-cover-1512x256.png'));
  await sharp(path.join(out,'website-vehicle.webp')).resize(1200,627,{fit:'cover'}).jpeg({quality:94}).toFile(path.join(out,'intro-post.jpg'));
})();
