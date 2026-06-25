import fs from 'fs';

const file = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/site.js';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('isPassengerCareEnabled')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
