const fs = require('fs');
let content = fs.readFileSync('src/components/ProductsList.tsx', 'utf8');

// 1. Remove the rogue \n\n prints
content = content.replace('      )}\\n\\n', '      )}');
content = content.replace('      \\n\\n      ', '      ');

// 2. Remove the empty barcode td that is messing up the table alignment
const regex = /\s*<td className="flex justify-between md:table-cell py-2 md:py-4 md:px-4 font-mono text-slate-500 border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-4">\s*<span className="md:hidden text-gray-400 font-medium text-\[10px\] uppercase">\{isRtl \? 'الباركود' : 'Code SKU'\}<\/span>\s*<\/td>/g;
content = content.replace(regex, '');

fs.writeFileSync('src/components/ProductsList.tsx', content);
console.log('Fixed ProductsList.tsx');
