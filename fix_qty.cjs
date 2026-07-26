const fs = require('fs');
let content = fs.readFileSync('src/components/ProductsList.tsx', 'utf8');

// 1. Change stock movement default qty to 0 (by using value={item.qty} instead of value={item.qty || ''})
content = content.replace("value={item.qty || ''}", "value={item.qty}");
content = content.replace('min="1"', 'min="0"');

// 2. Make Stock movement modal scrollable
// We need to change the div wrapping the form to handle overflow if needed, although it already has it.
// Let's check if the form is scrollable. Yes it has overflow-y-auto. 
// "9abila li so3od wa nozol" might mean that the user couldn't scroll inside the modal because on mobile it doesn't scroll well if the touch is captured.
// Let's change the max-h from 250px to 400px so it's bigger, and ensure the form itself scrolls properly.
content = content.replace('max-h-[250px] overflow-y-auto', 'max-h-[400px] overflow-y-auto');

fs.writeFileSync('src/components/ProductsList.tsx', content);
console.log('Done!');
