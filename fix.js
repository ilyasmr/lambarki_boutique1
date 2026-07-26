const fs = require('fs');
const path = require('path');
const componentsDir = path.join(process.cwd(), 'src', 'components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  content = content.replace(/<table className="w-full text-left([^"]*)">/g, '<table className={`w-full ${isRtl ? \'text-right\' : \'text-left\'}$1`}>');
  content = content.replace(/<table className="w-full text-right sm:text-right">/g, '<table className={`w-full sm:text-right ${isRtl ? \'text-right\' : \'text-left\'}`}>');
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed', file);
  }
}
