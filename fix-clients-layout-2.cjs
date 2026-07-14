const fs = require('fs');
let content = fs.readFileSync('src/components/ClientsList.tsx', 'utf8');

content = content.replace(
  '{/* Mobile View for Purchases */}', 
  '<>\n                              {/* Mobile View for Purchases */}'
);

content = content.replace(
  '</table>\n                            ) : (',
  '</table>\n                              </>\n                            ) : ('
);

fs.writeFileSync('src/components/ClientsList.tsx', content);
