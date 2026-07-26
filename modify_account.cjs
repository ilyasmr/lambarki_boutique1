const fs = require('fs');
let code = fs.readFileSync('src/components/Account.tsx', 'utf8');

// Replace initialization and useEffect for withdrawals
const oldWithdrawalsInit = `  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>(() => {
    const saved = localStorage.getItem('dolibarr_withdrawals');
    return saved ? JSON.parse(saved) : [];
  });

  // Save changes automatically
  React.useEffect(() => {
    localStorage.setItem('dolibarr_withdrawals', JSON.stringify(withdrawals));
  }, [withdrawals]);`;

const newWithdrawalsInit = `  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
  const [drawerState, setDrawerState] = React.useState({
    withdrawals_adjustment: 0,
    cash_income_adjustment: 0,
    drawer_balance_adjustment: 0
  });

  // Fetch from database on mount
  React.useEffect(() => {
    const fetchWithdrawalsAndState = async () => {
      try {
        const [wData, sData] = await Promise.all([
          api.withdrawals.getAll(),
          api.drawerState.get()
        ]);
        
        let loadedWithdrawals = wData || [];
        
        // One-time migration from localStorage
        const localSaved = localStorage.getItem('dolibarr_withdrawals');
        if (localSaved && localSaved !== '[]') {
          try {
            const localW = JSON.parse(localSaved);
            if (Array.isArray(localW) && localW.length > 0) {
              console.log('Migrating local withdrawals to database...');
              for (const w of localW) {
                // If it doesn't already exist in database, create it
                if (!loadedWithdrawals.find(dw => dw.id === w.id)) {
                  await api.withdrawals.create(w);
                  loadedWithdrawals.push(w);
                }
              }
              // Clear local storage after successful migration
              localStorage.setItem('dolibarr_withdrawals', '[]');
            }
          } catch(e) { console.error('Migration error', e); }
        }
        
        setWithdrawals(loadedWithdrawals);
        if (sData) {
          setDrawerState(sData);
          setWithdrawalsAdjustment(Number(sData.withdrawals_adjustment));
          setCashIncomeAdjustment(Number(sData.cash_income_adjustment));
          setDrawerBalanceAdjustment(Number(sData.drawer_balance_adjustment));
        }
      } catch (err) {
        console.error('Failed to fetch withdrawals:', err);
      }
    };
    fetchWithdrawalsAndState();
  }, []);

  const syncDrawerState = async (updates: Partial<typeof drawerState>) => {
    const newState = { ...drawerState, ...updates };
    setDrawerState(newState);
    try {
      await api.drawerState.update(newState);
    } catch (err) { console.error('Failed to update drawer state', err); }
  };
`;

code = code.replace(oldWithdrawalsInit, newWithdrawalsInit);

// Update withdrawalsAdjustment setter
const oldWAdj = `  const [withdrawalsAdjustment, setWithdrawalsAdjustment] = React.useState<number>(() => {
    const saved = localStorage.getItem('dolibarr_adj_withdrawals');
    return saved ? parseFloat(saved) : 0;
  });`;
const newWAdj = `  const [withdrawalsAdjustment, setWithdrawalsAdjustment] = React.useState<number>(0);`;
code = code.replace(oldWAdj, newWAdj);

const oldWAdjEffect = `  React.useEffect(() => {
    localStorage.setItem('dolibarr_adj_withdrawals', withdrawalsAdjustment.toString());
  }, [withdrawalsAdjustment]);`;
code = code.replace(oldWAdjEffect, '');

// Update cashIncomeAdjustment setter
const oldCAdj = `  const [cashIncomeAdjustment, setCashIncomeAdjustment] = React.useState<number>(() => {
    const saved = localStorage.getItem('dolibarr_adj_cash_income');
    return saved ? parseFloat(saved) : 0;
  });`;
const newCAdj = `  const [cashIncomeAdjustment, setCashIncomeAdjustment] = React.useState<number>(0);`;
code = code.replace(oldCAdj, newCAdj);

const oldCAdjEffect = `  React.useEffect(() => {
    localStorage.setItem('dolibarr_adj_cash_income', cashIncomeAdjustment.toString());
  }, [cashIncomeAdjustment]);`;
code = code.replace(oldCAdjEffect, '');

// Update drawerBalanceAdjustment setter
const oldDAdj = `  const [drawerBalanceAdjustment, setDrawerBalanceAdjustment] = React.useState<number>(() => {
    const saved = localStorage.getItem('dolibarr_adj_drawer_balance');
    return saved ? parseFloat(saved) : 0;
  });`;
const newDAdj = `  const [drawerBalanceAdjustment, setDrawerBalanceAdjustment] = React.useState<number>(0);`;
code = code.replace(oldDAdj, newDAdj);

const oldDAdjEffect = `  React.useEffect(() => {
    localStorage.setItem('dolibarr_adj_drawer_balance', drawerBalanceAdjustment.toString());
  }, [drawerBalanceAdjustment]);`;
code = code.replace(oldDAdjEffect, '');


// Update handleAddWithdrawal
const oldAddW = `    setWithdrawals(prev => [newWithdrawal, ...prev]);`;
const newAddW = `    setWithdrawals(prev => [newWithdrawal, ...prev]);
    api.withdrawals.create(newWithdrawal).catch(e => console.error('Error saving withdrawal', e));`;
code = code.replace(oldAddW, newAddW);

// Update handleDeleteWithdrawal
const oldDelW = `      setWithdrawals(prev => prev.filter(x => x.id !== id));`;
const newDelW = `      setWithdrawals(prev => prev.filter(x => x.id !== id));
      api.withdrawals.delete(id).catch(e => console.error('Error deleting withdrawal', e));`;
code = code.replace(oldDelW, newDelW);

// Update handleSaveWithdrawal
const oldEditW = `    setWithdrawals(prev => prev.map(w => {
      if (w.id === editingWithdrawal.id) {
        return {
          ...w,
          amount,
          person: finalPerson,
          notes: editNotes.trim(),
          responsible: editPerson === 'autre' ? editCustomPerson.trim() : editPerson
        };
      }
      return w;
    }));`;
const newEditW = `    const updatedWithdrawal = {
      ...editingWithdrawal,
      amount,
      person: finalPerson,
      notes: editNotes.trim(),
      responsible: editPerson === 'autre' ? editCustomPerson.trim() : editPerson
    };
    setWithdrawals(prev => prev.map(w => w.id === editingWithdrawal.id ? updatedWithdrawal : w));
    api.withdrawals.update(editingWithdrawal.id, updatedWithdrawal).catch(e => console.error('Error updating withdrawal', e));`;
code = code.replace(oldEditW, newEditW);

// Update edit handlers for drawer state
code = code.replace(
  `setDrawerBalanceAdjustment(val - (totalCashIncome - totalWithdrawnAmount));`,
  `const newAdj = val - (totalCashIncome - totalWithdrawnAmount); setDrawerBalanceAdjustment(newAdj); syncDrawerState({ drawer_balance_adjustment: newAdj });`
);
code = code.replace(
  `setCashIncomeAdjustment(val - baseCashIncome);`,
  `const newAdj = val - baseCashIncome; setCashIncomeAdjustment(newAdj); syncDrawerState({ cash_income_adjustment: newAdj });`
);
code = code.replace(
  `setWithdrawalsAdjustment(val - baseWithdrawnAmount);`,
  `const newAdj = val - baseWithdrawnAmount; setWithdrawalsAdjustment(newAdj); syncDrawerState({ withdrawals_adjustment: newAdj });`
);

// Add missing api import at the top of Account.tsx
if (!code.includes("import { api } from '../api';")) {
  code = code.replace("import React from 'react';", "import React from 'react';\nimport { api } from '../api';");
}

fs.writeFileSync('src/components/Account.tsx', code);
console.log('Updated Account.tsx');
