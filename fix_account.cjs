const fs = require('fs');
let content = fs.readFileSync('src/components/Account.tsx', 'utf8');

// Fix amount parsing
content = content.replace(
  'const amount = parseFloat(withdrawAmount);',
  'const amount = parseFloat(withdrawAmount.replace(",", "."));'
);

// Fix input type to be more mobile friendly
content = content.replace(
  'type="number"\n                        step="any"\n                        required\n                        value={withdrawAmount}',
  'type="text"\n                        inputMode="decimal"\n                        required\n                        value={withdrawAmount}'
);

// Fix tables layout for mobile (make them horizontally scrollable instead of broken blocks)
content = content.replace(/className="overflow-x-hidden md:overflow-x-auto/g, 'className="overflow-x-auto no-scrollbar');
content = content.replace(/className="w-full text-left block md:table"/g, 'className="w-full text-left whitespace-nowrap"');
content = content.replace(/className="hidden md:table-header-group"/g, 'className="bg-white"');

fs.writeFileSync('src/components/Account.tsx', content);
console.log('Fixed Account.tsx');
