const fs = require('fs');
let content = fs.readFileSync('src/components/Account.tsx', 'utf8');

// Replace withdrawals mock data
const withdrawalsRegex = /const \[withdrawals, setWithdrawals\] = React\.useState<Withdrawal\[\]>\(\(\) => \{\s*const saved = localStorage\.getItem\('dolibarr_withdrawals'\);\s*return saved \? JSON\.parse\(saved\) : \[[\s\S]*?\];\s*\}\);/;
const withdrawalsReplacement = `const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>(() => {
    const saved = localStorage.getItem('dolibarr_withdrawals');
    return saved ? JSON.parse(saved) : [];
  });`;

content = content.replace(withdrawalsRegex, withdrawalsReplacement);

// Replace audits mock data
const auditsRegex = /const \[audits, setAudits\] = React\.useState<AuditRecord\[\]>\(\(\) => \{\s*const saved = localStorage\.getItem\('dolibarr_audits'\);\s*return saved \? JSON\.parse\(saved\) : \[[\s\S]*?\];\s*\}\);/;
const auditsReplacement = `const [audits, setAudits] = React.useState<AuditRecord[]>(() => {
    const saved = localStorage.getItem('dolibarr_audits');
    return saved ? JSON.parse(saved) : [];
  });`;

content = content.replace(auditsRegex, auditsReplacement);

fs.writeFileSync('src/components/Account.tsx', content);
console.log('Fixed Account.tsx dummy data');
