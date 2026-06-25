import fs from 'fs';

const staging = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/src/ar/index.html';
const live = 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html';

const sContent = fs.readFileSync(staging, 'utf8');
const lContent = fs.readFileSync(live, 'utf8');

console.log('Staging contains data-route-planner:', sContent.includes('data-route-planner'));
console.log('Live contains data-route-planner:', lContent.includes('data-route-planner'));

console.log('Staging contains Why GetVendora:', sContent.includes('Why GetVendora') || sContent.includes('لماذا GetVendora') || sContent.includes('لماذا الحجز مع شركة'));
console.log('Live contains Why GetVendora:', lContent.includes('Why GetVendora') || lContent.includes('لماذا GetVendora') || lContent.includes('لماذا الحجز مع شركة'));

// Let's write the first 50 lines of both files to compare
console.log('\n--- FIRST 20 LINES OF STAGING ---');
console.log(sContent.split('\n').slice(0, 20).join('\n'));

console.log('\n--- FIRST 20 LINES OF LIVE ---');
console.log(lContent.split('\n').slice(0, 20).join('\n'));
