import fs from 'fs';

const files = [
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/research/incoming/deep-research-report-01.md',
  'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/research/incoming/deep-research-report-02.md'
];

for (const file of files) {
  console.log(`\n=== File: ${file} ===`);
  const buffer = fs.readFileSync(file);
  console.log('Size:', buffer.length, 'bytes');
  console.log('First 20 bytes (hex):', buffer.slice(0, 20).toString('hex'));
  console.log('First 20 bytes (ascii):', buffer.slice(0, 20).toString('ascii').replace(/[^ -~]/g, '.'));
}
