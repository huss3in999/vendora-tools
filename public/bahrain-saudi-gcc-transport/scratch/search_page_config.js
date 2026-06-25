import fs from 'fs';

const file = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/index.html';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('pageConfig')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
