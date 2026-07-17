const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'ProductsList.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix ProductsListProps
// The interface ends with "currentUser?: User;\n}"
const propsRegex = /currentUser\?:\s*User;\s*\r?\n}/g;
if (propsRegex.test(content)) {
  content = content.replace(propsRegex, `currentUser?: User;
  movements?: StockMovement[];
  onUpdateStock?: (productId: string, newQty: number, movement: StockMovement) => void;
  onUpdateStocksBulk?: (updates: { productId: string; newQty: number; movement: StockMovement }[]) => void;
  onDeleteMovement?: (id: string) => void;
  onEditMovement?: (id: string, qty: number, reason: string) => void;
}`);
  console.log('Props updated.');
} else {
  console.log('Props regex not matched.');
}

// 2. Fix Component Signature
const sigRegex = /currentUser\r?\n\}:\s*ProductsListProps\)\s*\{/g;
if (sigRegex.test(content)) {
  content = content.replace(sigRegex, `currentUser,
  movements = [],
  onUpdateStock,
  onUpdateStocksBulk,
  onDeleteMovement,
  onEditMovement
}: ProductsListProps) {`);
  console.log('Signature updated.');
} else {
  console.log('Signature regex not matched.');
}

fs.writeFileSync(filePath, content, 'utf8');
