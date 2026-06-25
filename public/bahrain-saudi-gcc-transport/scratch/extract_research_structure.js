import fs from 'fs';

const files = [
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/research/incoming/deep-research-report-01.md',
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/research/incoming/deep-research-report-02.md'
];

for (const file of files) {
  console.log(`\n=== Analyzing ${file} ===`);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  console.log('Total lines:', lines.length);
  console.log('Headings found:');
  lines.forEach((line, idx) => {
    if (line.startsWith('#')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}
