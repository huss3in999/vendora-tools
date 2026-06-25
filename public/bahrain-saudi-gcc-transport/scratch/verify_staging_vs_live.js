import fs from 'fs';

const pairs = [
  {
    staging: 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/src/ar/index.html',
    live: 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/index.html'
  },
  {
    staging: 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/gcc-private-transport-guide/src/en/index.html',
    live: 'e:/Users/Hussain Alyaqoob/Documents/GitHub/public/bahrain-saudi-gcc-transport/en/gcc-private-transport-guide/index.html'
  }
];

for (const pair of pairs) {
  console.log(`Comparing staging and live:`);
  console.log(`Staging: ${pair.staging}`);
  console.log(`Live: ${pair.live}`);
  if (!fs.existsSync(pair.staging)) {
    console.log(`Staging file does not exist!`);
    continue;
  }
  if (!fs.existsSync(pair.live)) {
    console.log(`Live file does not exist!`);
    continue;
  }
  const sContent = fs.readFileSync(pair.staging, 'utf8');
  const lContent = fs.readFileSync(pair.live, 'utf8');
  if (sContent === lContent) {
    console.log(`MATCH: Staging and Live are identical.`);
  } else {
    console.log(`MISMATCH: Staging and Live differ!`);
    console.log(`Staging size: ${sContent.length}, Live size: ${lContent.length}`);
  }
}
