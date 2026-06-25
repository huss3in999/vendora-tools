import fs from 'fs';

const files = [
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html',
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html'
];

for (const file of files) {
  console.log(`\n=== File: ${file} ===`);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    if (line.includes('<section') || line.includes('class="faq"') || line.includes('id="saudi-causeway"') || line.includes('id="fleet-luggage"') || line.includes('application/ld+json')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}
