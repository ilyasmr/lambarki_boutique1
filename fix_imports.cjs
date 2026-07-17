const fs = require('fs');
const path = require('path');

// 1. Fix ProductsList.tsx imports
const prodPath = path.join(__dirname, 'src', 'components', 'ProductsList.tsx');
let prodContent = fs.readFileSync(prodPath, 'utf8');

const importRegex = /Tag\r?\n\}\s*from\s*'lucide-react';/g;
prodContent = prodContent.replace(importRegex, `Tag,
  History,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';`);

fs.writeFileSync(prodPath, prodContent, 'utf8');
console.log('ProductsList.tsx imports fixed.');

// 2. Fix App.tsx StocksManager import
const appPath = path.join(__dirname, 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');

appContent = appContent.replace(/import\s+StocksManager\s+from\s+'\.\/components\/StocksManager';\r?\n?/g, '');
fs.writeFileSync(appPath, appContent, 'utf8');
console.log('App.tsx StocksManager import removed.');
