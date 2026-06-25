import fs from 'fs';
import path from 'path';

const files = [
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/index.html',
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/site.js'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    console.log(`=== Searching in ${file} ===`);
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('data-booking-submit') || line.includes('__VENDORA_TRANSPORT_ADMIN_RESOLVED_API__')) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    });
  } else {
    console.log(`File not found: ${file}`);
  }
}
