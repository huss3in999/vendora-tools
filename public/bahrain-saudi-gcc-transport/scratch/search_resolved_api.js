import fs from 'fs';

const file = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/admin/index.html';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('__VENDORA_TRANSPORT_ADMIN_RESOLVED_API__') || line.includes('RESOLVED_API')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
