import React from 'react';
import { api } from '../api';
import { Invoice, User, Product, StockMovement, Client } from '../types';
import { translations, arabicDashboardLabels, resolveUserName } from '../translations';
import { 
  Coins, 
  TrendingUp, TrendingDown, 
  Printer, 
  FileText, 
  ArrowDownRight, 
  ArrowUpRight,
  ClipboardCheck, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Users2, 
  PlusCircle, 
  Check, 
  Info,
  Calendar,
  RotateCcw,
  Search,
  CheckCircle2,
  Lock,
  Download,
  Filter,
  Eye,
  ClipboardList,
  Edit3,
  Trash2
} from 'lucide-react';

interface AccountProps {
  invoices: Invoice[];
  clients: Client[];
  products: Product[];
  lang: 'fr' | 'ar';
  onViewInvoice: (invoice: Invoice) => void;
  currentUser: User;
  onUpdateStocksBulk: (updates: { productId: string; newQty: number; movement: StockMovement }[]) => void;
  onLogActivity?: (
    type: 'sale' | 'product_add' | 'product_edit' | 'product_delete' | 'client_add' | 'client_edit' | 'client_delete' | 'stock_edit' | 'withdraw_add' | 'withdraw_edit' | 'withdraw_delete',
    descriptionAr: string,
    descriptionFr: string,
    targetId: string
  ) => void;
}

interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  person: string;
  responsible: string;
  notes: string;
}

interface AuditSessionItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  expected: number;
  actual: number;
  diff: number;
  buyPrice: number;
}

interface AuditSession {
  id: string;
  date: string;
  auditor: string;
  type: 'monthly' | 'semiannual';
  totalDeficitQty: number;
  totalDeficitValue: number;
  notes: string;
  items?: AuditSessionItem[];
}

export default function Account({ 
  invoices, 
  clients, 
  products,
  lang, 
  onViewInvoice,
  currentUser,
  onUpdateStocksBulk,
  onLogActivity
}: AccountProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  // Tab controller: 'withdrawals' (Ø³Ø­ÙˆØ¨Ø§Øª) vs 'audit' (Ù…Ø³Ø§Ø¦Ù„Ø© ÙˆØªØ¯Ù‚ÙŠÙ‚ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙˆØ§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø©) vs 'profits' (ØªØ­Ù‚ÙŠÙ‚ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ ÙˆØ§Ù„Ø®ØµÙˆÙ…Ø§Øª)
  const [activeTab, setActiveTab] = React.useState<'withdrawals' | 'audit' | 'profits'>('withdrawals');

  React.useEffect(() => {
    if (currentUser?.role === 'cashier') {
      setActiveTab('withdrawals');
    }
  }, [currentUser]);

  // PRINT PREVIEW STATE FOR WITHDRAWAL VOUCHER
  const [printWithdrawal, setPrintWithdrawal] = React.useState<Withdrawal | null>(null);

  // --- CORES STATE 1: CASH WITHDRAWALS ---
  const [withdrawals, setWithdrawals] = React.useState<Withdrawal[]>([]);
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
        
        let loadedWithdrawals = (wData || []).map((w: any) => ({ ...w, amount: Number(w.amount) }));
        
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
    
    // Auto-refresh every 10 seconds to sync changes across devices (Phone <-> PC)
    const interval = setInterval(() => {
      fetchWithdrawalsAndState();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const syncDrawerState = async (updates: Partial<typeof drawerState>) => {
    const newState = { ...drawerState, ...updates };
    setDrawerState(newState);
    try {
      await api.drawerState.update(newState);
    } catch (err) { console.error('Failed to update drawer state', err); }
  };


  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [withdrawPerson, setWithdrawPerson] = React.useState('Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ');
  const [customPerson, setCustomPerson] = React.useState('');
  const [withdrawNotes, setWithdrawNotes] = React.useState('');
  const [withdrawalSuccess, setWithdrawalSuccess] = React.useState(false);

  // Edit withdrawal states
  const [editingWithdrawal, setEditingWithdrawal] = React.useState<Withdrawal | null>(null);
  const [editAmount, setEditAmount] = React.useState('');
  const [editPerson, setEditPerson] = React.useState('Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ');
  const [editCustomPerson, setEditCustomPerson] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');

  // Manual adjustments saved in local storage
  const [cashIncomeAdjustment, setCashIncomeAdjustment] = React.useState<number>(0);

  const [withdrawalsAdjustment, setWithdrawalsAdjustment] = React.useState<number>(0);

  const [drawerBalanceAdjustment, setDrawerBalanceAdjustment] = React.useState<number>(0);

  // Keep state updated in localStorage






  // Adjustments edit Modal state
  const [editingField, setEditingField] = React.useState<'drawer_balance' | 'withdrawals' | 'cash_income' | null>(null);
  const [tempValue, setTempValue] = React.useState('');
  const [adjustmentReason, setAdjustmentReason] = React.useState('');

  // Calculations for current Cash Drawer balance
  const cumulativeCashSum = React.useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => {
        if (inv.paymentStatus === 'paid' || !inv.paymentStatus) {
          return sum + (inv.paymentMethod === 'cash' ? inv.total : 0);
        }
        if (inv.paymentStatus === 'partial') {
          return sum + (inv.amountPaid || 0);
        }
        return sum;
      }, 0);
  }, [invoices]);

  const cumulativeDebtSum = React.useMemo(() => {
    return clients.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
  }, [clients]);

  const cumulativeChecksSum = React.useMemo(() => {
    return clients.reduce((sum, c) => {
      const checks = c.postalChecks || [];
      return sum + checks.reduce((chkSum, chk) => chkSum + (chk.amount || 0), 0);
    }, 0);
  }, [clients]);

  const totalOverallSales = React.useMemo(() => {
    return invoices
      .filter(inv => inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const baseCashIncome = React.useMemo(() => {
    // 1. Cash from fully paid cash invoices
    const cashInvoicesSum = invoices
      .filter(inv => inv.status === 'paid' && inv.paymentMethod === 'cash')
      .reduce((sum, inv) => sum + inv.total, 0);

    // 2. Cash from partial cash payments of pending/unpaid invoices
    const partialCashSum = invoices
      .filter(inv => inv.status !== 'cancelled' && inv.paymentStatus === 'partial' && inv.paymentMethod === 'cash')
      .reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    // 3. Cash collected from debt repayments
    const debtRepaymentsSum = clients.reduce((sum, c) => {
      const repayments = c.debtPayments || [];
      const cashRepayments = repayments.filter((p: any) => p.paymentMethod === 'cash');
      return sum + cashRepayments.reduce((pSum: number, p: any) => pSum + p.amount, 0);
    }, 0);

    return cashInvoicesSum + partialCashSum + debtRepaymentsSum;
  }, [invoices, clients]);

  const totalCashIncome = React.useMemo(() => {
    return baseCashIncome + cashIncomeAdjustment;
  }, [baseCashIncome, cashIncomeAdjustment]);

  const baseWithdrawnAmount = React.useMemo(() => {
    return withdrawals.reduce((sum, w) => sum + w.amount, 0);
  }, [withdrawals]);

  const totalWithdrawnAmount = React.useMemo(() => {
    return baseWithdrawnAmount + withdrawalsAdjustment;
  }, [baseWithdrawnAmount, withdrawalsAdjustment]);

  const currentDrawerBalance = React.useMemo(() => {
    return totalCashIncome - totalWithdrawnAmount + drawerBalanceAdjustment;
  }, [totalCashIncome, totalWithdrawnAmount, drawerBalanceAdjustment]);

  const handleAddWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;

    const finalPerson = withdrawPerson === 'autre' ? customPerson.trim() : withdrawPerson;

    const newWithdrawal: Withdrawal = {
      id: `w-${Date.now()}`,
      amount,
      date: new Date().toISOString(),
      person: finalPerson || (isRtl ? 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯' : 'Non spÃ©cifiÃ©'),
      responsible: currentUser?.name || (isRtl ? 'Ø­Ø³Ø§Ø¨ Ø§Ù„Ù†Ø¸Ø§Ù…' : 'SystÃ¨me'),
      notes: withdrawNotes.trim() || (isRtl ? 'Ø³Ø­Ø¨ Ù†Ù‚Ø¯ÙŠ Ù…Ù† Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'PrÃ©lÃ¨vement de caisse')
    };

    setWithdrawals(prev => [newWithdrawal, ...prev]);
    api.withdrawals.create(newWithdrawal).catch(e => console.error('Error saving withdrawal', e));
    
    if (onLogActivity) {
      onLogActivity(
        'withdraw_add',
        `Ø¹Ù…Ù„ÙŠØ© Ø³Ø­Ø¨ Ù†Ù‚Ø¯ÙŠ Ø¬Ø¯ÙŠØ¯Ø© Ø¨Ù‚ÙŠÙ…Ø© ${amount.toFixed(2)} Ù„ÙØ§Ø¦Ø¯Ø© "${newWithdrawal.person}" (Ø§Ù„Ø³Ø¨Ø¨ Ø§Ù„Ø¯Ø§Ø¹ÙŠ: ${newWithdrawal.notes})`,
        `Nouveau retrait de caisse de ${amount.toFixed(2)} pour "${newWithdrawal.person}" (Motif: ${newWithdrawal.notes})`,
        newWithdrawal.id
      );
    }

    setWithdrawAmount('');
    setWithdrawNotes('');
    setCustomPerson('');
    setWithdrawalSuccess(true);
    setTimeout(() => setWithdrawalSuccess(false), 4000);
  };

  const handleDeleteWithdrawal = (id: string) => {
    const w = withdrawals.find(x => x.id === id);
    if (!w) return;
    if (confirm(isRtl ? 'Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø³Ù†Ø¯ØŸ' : 'ÃŠtes-vous sÃ»r de vouloir supprimer ce bon ?')) {
      setWithdrawals(prev => prev.filter(x => x.id !== id));
      api.withdrawals.delete(id).catch(e => console.error('Error deleting withdrawal', e));
      if (onLogActivity) {
        onLogActivity(
          'withdraw_delete',
          `Ø­Ø°Ù Ù…Ø³ØªÙ†Ø¯ ØµØ±Ù Ø¨Ù‚ÙŠÙ…Ø© ${w.amount.toFixed(2)} Ù„ÙØ§Ø¦Ø¯Ø© "${w.person}"`,
          `Suppression d'un retrait de ${w.amount.toFixed(2)} pour "${w.person}"`,
          id
        );
      }
    }
  };

  const handleEditWithdrawalClick = (w: Withdrawal) => {
    setEditingWithdrawal(w);
    setEditAmount(w.amount.toString());
    setEditNotes(w.notes);
    const presets = ['Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ', 'ÙØ¤Ø§Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ', 'Ø§Ø­Ù…Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ'];
    if (presets.includes(w.person)) {
      setEditPerson(w.person);
      setEditCustomPerson('');
    } else {
      setEditPerson('autre');
      setEditCustomPerson(w.person);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWithdrawal) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;

    const finalPerson = editPerson === 'autre' ? editCustomPerson.trim() : editPerson;

    const updatedW = {
      ...editingWithdrawal,
      amount,
      person: finalPerson || (isRtl ? 'ØºÙŠØ± Ù…Ø­Ø¯Ø¯' : 'Non spÃ©cifiÃ©'),
      notes: editNotes.trim() || (isRtl ? 'Ø³Ø­Ø¨ Ù†Ù‚Ø¯ÙŠ Ù…Ù† Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'PrÃ©lÃ¨vement de caisse')
    };

    setWithdrawals(prev => prev.map(w => w.id === editingWithdrawal.id ? updatedW : w));
    
    // Save to server
    api.withdrawals.update(editingWithdrawal.id, updatedW).catch(e => console.error('Error updating withdrawal', e));


    if (onLogActivity) {
      onLogActivity(
        'withdraw_edit',
        `ØªØ¹Ø¯ÙŠÙ„ Ù…Ø³ØªÙ†Ø¯ ØµØ±Ù (Ø§Ù„Ù…Ø±Ø¬Ø¹ #${editingWithdrawal.id.substring(editingWithdrawal.id.length - 5)}) Ø¨Ù‚ÙŠÙ…Ø© ${amount.toFixed(2)} Ù„ÙØ§Ø¦Ø¯Ø© "${finalPerson}"`,
        `Modification du retrait #${editingWithdrawal.id.substring(editingWithdrawal.id.length - 5)} de ${amount.toFixed(2)} pour "${finalPerson}"`,
        editingWithdrawal.id
      );
    }

    setEditingWithdrawal(null);
    setEditAmount('');
    setEditNotes('');
    setEditCustomPerson('');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempValue);
    if (isNaN(val)) return;

    let previousVal = 0;
    let fieldAr = '';
    let fieldFr = '';

    if (editingField === 'cash_income') {
      previousVal = totalCashIncome;
      fieldAr = 'Ø§Ù„Ù…Ø¯Ø§Ø®ÙŠÙ„ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ© ÙÙŠ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚';
      fieldFr = 'EntrÃ©es de caisse cumulÃ©es';
      const newAdj = val - baseCashIncome; setCashIncomeAdjustment(newAdj); syncDrawerState({ cash_income_adjustment: newAdj });
    } else if (editingField === 'withdrawals') {
      previousVal = totalWithdrawnAmount;
      fieldAr = 'Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª ÙˆÙ…Ù‚ØªØ·Ø¹Ø§Øª Ø§Ù„Ù…Ø§Ù„Ùƒ';
      fieldFr = 'Total des prÃ©lÃ¨vements';
      const newAdj = val - baseWithdrawnAmount; setWithdrawalsAdjustment(newAdj); syncDrawerState({ withdrawals_adjustment: newAdj });
    } else if (editingField === 'drawer_balance') {
      previousVal = currentDrawerBalance;
      fieldAr = 'Ø±ØµÙŠØ¯ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø§Ù„Ù…ØªÙˆÙØ±';
      fieldFr = 'Solde direct du coffre';
      const newAdj = val - (totalCashIncome - totalWithdrawnAmount); setDrawerBalanceAdjustment(newAdj); syncDrawerState({ drawer_balance_adjustment: newAdj });
    }

    if (onLogActivity) {
      const reasonText = adjustmentReason.trim() || (isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ Ù…Ø§Ù„ÙŠ ÙŠØ¯ÙˆÙŠ Ø¹Ø§Ù…' : 'Ajustement financier manuel');
      onLogActivity(
        'withdraw_add',
        `ØªØ¹Ø¯ÙŠÙ„ Ù…Ø§Ù„ÙŠ: ØªÙ… ØªØ¹Ø¯ÙŠÙ„ "${fieldAr}" Ù…Ù† ${previousVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Ø¥Ù„Ù‰ ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Ø§Ù„Ù…Ø¨Ø±Ø±: ${reasonText})`,
        `Modif financiÃ¨re : "${fieldFr}" ajustÃ© de ${previousVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} Ã  ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Raison : ${reasonText})`,
        `financial-adj-${editingField}`
      );
    }

    setEditingField(null);
    setTempValue('');
    setAdjustmentReason('');
  };


  // --- CORES STATE 2: ANTI-THEFT INVENTORY AUDIT ---
  const [auditType, setAuditType] = React.useState<'monthly' | 'semiannual'>('monthly');
  const [auditorName, setAuditorName] = React.useState(currentUser.name || 'Fouad Lambarki');
  const [auditNotes, setAuditNotes] = React.useState('');
  const [auditSuccess, setAuditSuccess] = React.useState(false);
  const [auditCategoryFilter, setAuditCategoryFilter] = React.useState<string>('all');
  const [auditSearchQuery, setAuditSearchQuery] = React.useState('');
  const [verifiedProducts, setVerifiedProducts] = React.useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  // Audit counting state initialized to expected system quantities
  const [physicalCounts, setPhysicalCounts] = React.useState<Record<string, number>>({});

  // Historical audit registers state
  const [selectedAudit, setSelectedAudit] = React.useState<AuditSession | null>(null);
  const [auditHistory, setAuditHistory] = React.useState<AuditSession[]>(() => {
    const saved = localStorage.getItem('dolibarr_audits');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('dolibarr_audits', JSON.stringify(auditHistory));
  }, [auditHistory]);

  // --- STATE AND MEMOS FOR PROFIT & DISCOUNT TREASURY CONTROL ---
  const [profitDateFilter, setProfitDateFilter] = React.useState<'all' | 'today' | 'yesterday' | 'this_month' | 'custom'>('all');
  const [profitStartDate, setProfitStartDate] = React.useState<string>('');
  const [profitEndDate, setProfitEndDate] = React.useState<string>('');
  const [profitGroupBy, setProfitGroupBy] = React.useState<'none' | 'product' | 'category'>('none');
  const [profitSearchText, setProfitSearchText] = React.useState<string>('');

  const activeInvoices = React.useMemo(() => {
    return invoices.filter(inv => inv.status !== 'cancelled');
  }, [invoices]);

  const dateFilteredInvoices = React.useMemo(() => {
    return activeInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      const today = new Date();
      
      if (profitDateFilter === 'today') {
        return invDate.toDateString() === today.toDateString();
      }
      if (profitDateFilter === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        return invDate.toDateString() === yesterday.toDateString();
      }
      if (profitDateFilter === 'this_month') {
        return invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear();
      }
      if (profitDateFilter === 'custom') {
        if (!profitStartDate && !profitEndDate) return true;
        const start = profitStartDate ? new Date(profitStartDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        const end = profitEndDate ? new Date(profitEndDate) : null;
        if (end) end.setHours(23, 59, 59, 999);
        
        if (start && invDate < start) return false;
        if (end && invDate > end) return false;
        return true;
      }
      return true; // 'all'
    });
  }, [activeInvoices, profitDateFilter, profitStartDate, profitEndDate]);

  const soldItemsList = React.useMemo(() => {
    const list: Array<{
      date: string;
      invoiceNumber: string;
      productId: string;
      productName: string;
      category: string;
      qty: number;
      buyPrice: number;
      sellPrice: number;
      totalBuyCost: number;
      totalSellRevenue: number;
      rawProfit: number;
      proportionalDiscount: number;
      netRevenue: number;
      netProfit: number;
    }> = [];

    dateFilteredInvoices.forEach(inv => {
      // Calculate total sell revenue of all items in this invoice to get the correct ratios
      const invItemsTotalSell = inv.items.reduce((sum, it) => sum + (it.qty * it.sellPrice), 0);

      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const category = prod?.category || (isRtl ? 'ØºÙŠØ± Ù…ØµÙ†Ù' : 'Non classÃ©');

        const totalBuyCost = item.qty * item.buyPrice;
        const totalSellRevenue = item.qty * item.sellPrice;
        const rawProfit = totalSellRevenue - totalBuyCost;

        // Proportional discount allocation
        const ratio = invItemsTotalSell > 0 ? (totalSellRevenue / invItemsTotalSell) : 0;
        const proportionalDiscount = Math.round(inv.discount * ratio);

        const netRevenue = totalSellRevenue - proportionalDiscount;
        const netProfit = rawProfit - proportionalDiscount;

        list.push({
          date: inv.date,
          invoiceNumber: inv.invoiceNumber,
          productId: item.productId,
          productName: item.name,
          category,
          qty: item.qty,
          buyPrice: item.buyPrice,
          sellPrice: item.sellPrice,
          totalBuyCost,
          totalSellRevenue,
          rawProfit,
          proportionalDiscount,
          netRevenue,
          netProfit
        });
      });
    });

    if (profitSearchText.trim()) {
      const q = profitSearchText.toLowerCase();
      return list.filter(item => 
        item.productName.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q) || 
        item.invoiceNumber.toLowerCase().includes(q)
      );
    }

    return list;
  }, [dateFilteredInvoices, products, profitSearchText, isRtl]);

  const groupedByProduct = React.useMemo(() => {
    const groups: Record<string, {
      productName: string;
      category: string;
      totalQty: number;
      totalBuyCost: number;
      totalSellRevenue: number;
      totalDiscount: number;
      totalProfit: number;
    }> = {};

    soldItemsList.forEach(item => {
      const key = item.productId;
      if (!groups[key]) {
        groups[key] = {
          productName: item.productName,
          category: item.category,
          totalQty: 0,
          totalBuyCost: 0,
          totalSellRevenue: 0,
          totalDiscount: 0,
          totalProfit: 0
        };
      }
      groups[key].totalQty += item.qty;
      groups[key].totalBuyCost += item.totalBuyCost;
      groups[key].totalSellRevenue += item.netRevenue;
      groups[key].totalDiscount += item.proportionalDiscount;
      groups[key].totalProfit += item.netProfit;
    });

    return Object.values(groups).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [soldItemsList]);

  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, {
      category: string;
      totalProductsCount: number;
      totalQty: number;
      totalBuyCost: number;
      totalSellRevenue: number;
      totalDiscount: number;
      totalProfit: number;
    }> = {};

    soldItemsList.forEach(item => {
      const key = item.category;
      if (!groups[key]) {
        groups[key] = {
          category: item.category,
          totalProductsCount: 0,
          totalQty: 0,
          totalBuyCost: 0,
          totalSellRevenue: 0,
          totalDiscount: 0,
          totalProfit: 0
        };
      }
      groups[key].totalQty += item.qty;
      groups[key].totalBuyCost += item.totalBuyCost;
      groups[key].totalSellRevenue += item.netRevenue;
      groups[key].totalDiscount += item.proportionalDiscount;
      groups[key].totalProfit += item.netProfit;
    });

    Object.keys(groups).forEach(cat => {
      const uniqueProds = new Set(soldItemsList.filter(item => item.category === cat).map(item => item.productId));
      groups[cat].totalProductsCount = uniqueProds.size;
    });

    return Object.values(groups).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [soldItemsList]);

  const totalChiffreAffaireBrut = React.useMemo(() => {
    return dateFilteredInvoices.reduce((sum, inv) => sum + inv.subtotal + inv.tax, 0);
  }, [dateFilteredInvoices]);

  const totalDiscountsApplied = React.useMemo(() => {
    return dateFilteredInvoices.reduce((sum, inv) => sum + inv.discount, 0);
  }, [dateFilteredInvoices]);

  const totalChiffreAffaireNet = React.useMemo(() => {
    return dateFilteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  }, [dateFilteredInvoices]);

  const totalNetProfit = React.useMemo(() => {
    return dateFilteredInvoices.reduce((sum, inv) => sum + inv.profit, 0);
  }, [dateFilteredInvoices]);

  const handlePhysicalCountChange = (productId: string, val: string) => {
    const qty = parseInt(val);
    setPhysicalCounts(prev => ({
      ...prev,
      [productId]: isNaN(qty) ? 0 : qty
    }));
  };

  // Perform calculations for discrepancy list
  const auditAnalysis = React.useMemo(() => {
    let deficitQty = 0;
    let deficitValue = 0;
    let excessQty = 0;
    let excessValue = 0;

    const items = products.map(p => {
      const actual = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : p.stock;
      const expected = p.stock;
      const diff = actual - expected;
      const valueDiff = diff * p.buyPrice;

      if (diff < 0) {
        deficitQty += Math.abs(diff);
        deficitValue += Math.abs(valueDiff);
      } else if (diff > 0) {
        excessQty += diff;
        excessValue += valueDiff;
      }

      return {
        product: p,
        actual,
        expected,
        diff,
        valueDiff
      };
    });

    return {
      items,
      deficitQty,
      deficitValue,
      excessQty,
      excessValue
    };
  }, [products, physicalCounts]);

  // Unique categories of products for selection
  const categoriesList = React.useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  }, [products]);

  // Stats per category to track auditing progress
  const auditCategoryStats = React.useMemo(() => {
    const statsMap: Record<string, { total: number; counted: number; pct: number }> = {};
    const isCounted = (productId: string) => physicalCounts[productId] !== undefined || verifiedProducts[productId] === true;
    
    // Add "all" category
    const allTotal = products.length;
    const allCounted = products.filter(p => isCounted(p.id)).length;
    statsMap['all'] = {
      total: allTotal,
      counted: allCounted,
      pct: allTotal > 0 ? Math.round((allCounted / allTotal) * 100) : 0
    };

    categoriesList.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat);
      const total = catProducts.length;
      const counted = catProducts.filter(p => isCounted(p.id)).length;
      statsMap[cat] = {
        total,
        counted,
        pct: total > 0 ? Math.round((counted / total) * 100) : 0
      };
    });

    return statsMap;
  }, [products, categoriesList, physicalCounts, verifiedProducts]);

  const filteredAuditProducts = React.useMemo(() => {
    let list = products;
    if (auditCategoryFilter !== 'all') {
      list = list.filter(p => p.category === auditCategoryFilter);
    }
    if (auditSearchQuery.trim() !== '') {
      const q = auditSearchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, auditCategoryFilter, auditSearchQuery]);

  // Submit complete audit report and auto-adjust
  const executeApplyAudit = () => {
    const updates = auditAnalysis.items
      .filter(item => item.diff !== 0)
      .map(item => {
        const type = item.diff > 0 ? 'in' as const : 'out' as const;
        const movement: StockMovement = {
          id: `mov-audit-${Date.now()}-${item.product.id}`,
          productId: item.product.id,
          productName: item.product.name,
          type,
          qty: Math.abs(item.diff),
          date: new Date().toISOString(),
          reason: isRtl 
            ? `Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ© ÙˆÙ…Ø±Ø§Ù‚Ø¨Ø© ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ (${auditType === 'monthly' ? 'Ø´Ù‡Ø±ÙŠ' : 'Ù†ØµÙ Ø³Ù†ÙˆÙŠ'})` 
            : `Ajustement Audit de Caisse (${auditType === 'monthly' ? 'Mensuel' : 'Semestriel'})`,
          operator: auditorName,
          batchId: `audit-${Date.now()}`
        };

        return {
          productId: item.product.id,
          newQty: item.actual,
          movement
        };
      });

    // Submit bulk updating to parent state
    if (updates.length > 0) {
      onUpdateStocksBulk(updates);
    }

    // Record final audit register
    const auditReportItems: AuditSessionItem[] = auditAnalysis.items
      .filter(item => item.diff !== 0)
      .map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        category: item.product.category || '',
        expected: item.expected,
        actual: item.actual,
        diff: item.diff,
        buyPrice: item.product.buyPrice
      }));

    const newReport: AuditSession = {
      id: `aud-${Date.now()}`,
      date: new Date().toISOString(),
      auditor: auditorName,
      type: auditType,
      totalDeficitQty: auditAnalysis.deficitQty,
      totalDeficitValue: auditAnalysis.deficitValue,
      notes: auditNotes.trim() || (isRtl ? 'ØªÙ… Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© ÙˆØªØ³ÙˆÙŠØ© Ø§Ù„ÙƒÙ…ÙŠØ§Øª ÙˆØªØµÙÙŠØ© Ø§Ù„ÙØ±ÙˆÙ‚Ø§Øª' : 'Audit et rectification de stock effectuÃ©s.'),
      items: auditReportItems
    };

    setAuditHistory(prev => [newReport, ...prev]);
    setAuditNotes('');
    setAuditSuccess(true);
    setTimeout(() => setAuditSuccess(false), 5000);
    
    // Reset counters to match new values automatically
    setPhysicalCounts({});
    setVerifiedProducts({});
    setShowConfirmModal(false);
  };

  const handleApplyAudit = () => {
    setShowConfirmModal(true);
  };

  // Quick helper to fill physical inventory counts to perfect match
  const handleForcePerfectMatch = () => {
    setPhysicalCounts({});
  };

  // Calculations for total estimated database values
  const totalStockWorthBuying = products.reduce((sum, p) => sum + (p.stock * p.buyPrice), 0);
  const totalStockWorthSelling = products.reduce((sum, p) => sum + (p.stock * p.sellPrice), 0);
  const potentialStockProfit = totalStockWorthSelling - totalStockWorthBuying;

  return (
    <div className="space-y-8">
      
      {/* Title Header & Financial Dashboard Overview */}
      <div className="flex flex-col gap-6 border-b border-slate-100 pb-8 mb-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <span className="p-2 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl shadow-sm">
                <Lock className="w-5 h-5 text-white" />
              </span>
              <span>{isRtl ? 'Ø¥Ø¯Ø§Ø±Ø© ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø£Ø±ØµØ¯Ø© Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'Finances, Caisse & Audit de Caisse'}</span>
            </h2>
            <p className="hidden md:block text-sm font-semibold text-slate-500 mt-2 max-w-2xl">
              {isRtl 
                ? (currentUser?.role === 'cashier' ? 'ØªØªØ¨Ø¹ Ø²Ù…Ù†ÙŠ Ø¯Ù‚ÙŠÙ‚ Ù„ÙƒÙ„ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª Ø§Ù„Ù…Ø³Ø¬Ù„Ø© ÙˆÙ…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ù…Ù‚ØªØ·Ø¹Ø§Øª Ù…Ù† Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚.' : 'Ø³Ø­Ø¨ Ø§Ù„Ø£Ù…ÙˆØ§Ù„ ÙˆØ§Ù„Ø¹Ù…ÙˆÙ„Ø§Øª Ø§Ù„ÙŠÙˆÙ…ÙŠØ© Ù…Ù† Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ØŒ ÙˆØ§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø¯ÙˆØ±ÙŠØ© Ø§Ù„Ø´Ø§Ù…Ù„Ø© Ù„Ù„Ù…Ø®Ø²Ù† ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙˆØ§Ù„Ø§Ø³ØªØ­Ù‚Ø§Ù‚.')
                : (currentUser?.role === 'cashier' ? 'Suivi des prÃ©lÃ¨vements de caisse nets.' : 'GÃ©rez les retraits de caisse quotidiens et rÃ©alisez l\'audit pÃ©riodique d\'inventaire.')}
            </p>
          </div>
        </div>

        {/* BENTO GRID FINANCIAL DASHBOARD */}
        {/* Modern Segmented Control Navigation */}
        {currentUser?.role !== 'cashier' && (
          <div className="flex justify-center md:justify-start w-full mt-4">
            <div className="flex bg-slate-100/80 p-1.5 rounded-[1.25rem] gap-1 shadow-inner backdrop-blur-md border border-slate-200/60 overflow-x-auto hide-scrollbar max-w-full">
              <button
                onClick={() => setActiveTab('withdrawals')}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 relative ${
                  activeTab === 'withdrawals' 
                    ? 'bg-white text-indigo-700 shadow-[0_2px_10px_rgba(0,0,0,0.06)] scale-100 z-10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95 opacity-80'
                }`}
              >
                <Coins className={`w-4 h-4 ${activeTab === 'withdrawals' ? 'text-indigo-600' : ''}`} />
                <span>{isRtl ? 'Ù…Ø³Ø­ÙˆØ¨Ø§Øª Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„ÙŠÙˆÙ…ÙŠØ©' : 'Retraits de Caisse'}</span>
              </button>
              
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 relative ${
                  activeTab === 'audit' 
                    ? 'bg-white text-emerald-700 shadow-[0_2px_10px_rgba(0,0,0,0.06)] scale-100 z-10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95 opacity-80'
                }`}
              >
                <ClipboardCheck className={`w-4 h-4 ${activeTab === 'audit' ? 'text-emerald-600' : ''}`} />
                <span>{isRtl ? 'Ù…Ø·Ø§Ø¨Ù‚Ø© ÙˆÙ…Ø±Ø§Ù‚Ø¨Ø© ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'Audit & ContrÃ´le de Caisse'}</span>
              </button>

              <button
                onClick={() => setActiveTab('profits')}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 relative ${
                  activeTab === 'profits' 
                    ? 'bg-white text-purple-700 shadow-[0_2px_10px_rgba(0,0,0,0.06)] scale-100 z-10' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 scale-95 opacity-80'
                }`}
              >
                <TrendingUp className={`w-4 h-4 ${activeTab === 'profits' ? 'text-purple-600' : ''}`} />
                <span>{isRtl ? 'Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ ÙˆØ§Ù„Ø®ØµÙˆÙ…Ø§Øª' : 'Marges & Chiffre d\'Affaires'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          VIEW A: CASH DRAWER WITHDRAWALS ROOM (Ø³Ø­ÙˆØ¨Ø§Øª Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚)
         ======================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Statistics summary row */}
          <div className={`grid grid-cols-1 ${currentUser?.role === 'cashier' ? 'sm:grid-cols-1 max-w-sm' : 'sm:grid-cols-3'} gap-6`}>
            
            {/* Cumulated income & Overall Sales details */}
            {currentUser?.role !== 'cashier' && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xxs uppercase font-black text-emerald-600 tracking-wider">
                      {isRtl ? 'Ø§Ù„Ù…Ø¯Ø§Ø®ÙŠÙ„ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ© ÙÙŠ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'EntrÃ©es de Caisse (EspÃ¨ces)'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField('cash_income');
                        setTempValue(totalCashIncome.toString());
                        setAdjustmentReason('');
                      }}
                      className="text-emerald-650 hover:text-emerald-800 p-1 rounded hover:bg-slate-50 transition cursor-pointer flex items-center justify-center"
                      title={isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ ÙŠØ¯ÙˆÙŠ' : 'Ajustement manuel'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-lg font-black text-emerald-950 font-mono mt-1">
                    {totalCashIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xxs text-emerald-600 mt-1">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ù‚Ø¨ÙˆØ¶Ø§Øª Ø§Ù„Ù†Ù‚Ø¯ÙŠØ©' : 'Total des encaissements'}</p>
                </div>
              </div>
            )}

            {/* Total logged withdrawals */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xxs uppercase font-black text-gray-400 tracking-wider">
                    {isRtl ? 'Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª ÙˆÙ…Ù‚ØªØ·Ø¹Ø§Øª Ø§Ù„Ù…Ø§Ù„Ùƒ' : 'PrÃ©lÃ¨vements & Retraits'}
                  </p>
                  {currentUser?.role !== 'cashier' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField('withdrawals');
                        setTempValue(totalWithdrawnAmount.toString());
                        setAdjustmentReason('');
                      }}
                      className="text-amber-650 hover:text-amber-850 p-1 rounded hover:bg-slate-50 transition cursor-pointer flex items-center justify-center"
                      title={isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ ÙŠØ¯ÙˆÙŠ' : 'Ajustement manuel'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h4 className="text-lg font-black text-amber-600 font-mono mt-1">
                  {totalWithdrawnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xxs text-slate-500 mt-1">{isRtl ? `${withdrawals.length} Ø³Ø­ÙˆØ¨Ø§Øª Ù…Ø³Ø¬Ù„Ø©` : `${withdrawals.length} retraits`}</p>
              </div>
              <span className="p-3 bg-slate-50 text-slate-600 rounded-xl shrink-0">
                <ArrowDownRight className="w-5 h-5 text-amber-500" />
              </span>
            </div>

            {/* Current liquid balance in store drawer */}
            {currentUser?.role !== 'cashier' && (
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xxs uppercase font-black text-emerald-100 tracking-wider">
                      {isRtl ? 'Ø±ØµÙŠØ¯ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ø­Ø§Ù„ÙŠ Ø§Ù„Ù…ØªÙˆÙØ±' : 'Solde Net en Casserole'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField('drawer_balance');
                        setTempValue(currentDrawerBalance.toString());
                        setAdjustmentReason('');
                      }}
                      className="text-emerald-100 hover:text-white p-1 rounded hover:bg-white/15 transition cursor-pointer flex items-center justify-center"
                      title={isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ ÙŠØ¯ÙˆÙŠ' : 'Ajustement manuel'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xl font-black font-mono mt-1">
                    {currentDrawerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xxs text-emerald-200 mt-1">
                    {currentDrawerBalance < 1000 
                      ? (isRtl ? 'âš ï¸ Ù…Ø®Ø²ÙˆÙ† Ù†Ù‚Ø¯ÙŠ Ù…Ù†Ø®ÙØ¶ Ø¨Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'Casserole basse') 
                      : (isRtl ? 'âœ… Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù†Ù‚Ø¯ÙŠ Ù…Ù…ØªØ§Ø² ÙˆÙ…ØªØ§Ø­' : 'LiquiditÃ© bonne')}
                  </p>
                </div>
                <Coins className="w-8 h-8 text-emerald-200 stroke-1 shrink-0" />
              </div>
            )}

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* New Withdrawal Form Card */}
            {currentUser?.role !== 'cashier' && (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {isRtl ? 'ØªØ³Ø¬ÙŠÙ„ Ø¹Ù…Ù„ÙŠØ© Ø³Ø­Ø¨ Ù†Ù‚Ø¯ÙŠ Ø¬Ø¯ÙŠØ¯Ø©' : 'Nouveau PrÃ©lÃ¨vement de Caisse'}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isRtl ? 'Ø³Ø¬Ù„ Ø£ÙŠ ÙƒÙ…ÙŠØ© Ù…Ø§Ù„ Ù…Ø£Ø®ÙˆØ°Ø© Ù…Ù† Ù…Ø³Ø¤ÙˆÙ„ÙŠ Ø§Ù„ØµÙ†Ø§Ø¯ÙŠÙ‚ ÙÙˆØ±Ø§Ù‹ Ù„Ø¶Ø¨Ø· Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª.' : 'Saisissez les montants retirÃ©s pour maintenir l\'Ã©quilibre des comptes.'}
                  </p>
                </div>

                {withdrawalSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{isRtl ? 'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø³Ø­Ø¨ Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ§Ù‚ØªØ·Ø§Ø¹Ù‡ Ù…Ù† Ø±ØµÙŠØ¯ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ !' : 'Retrait enregistrÃ© avec succÃ¨s !'}</span>
                  </div>
                )}

                <form onSubmit={handleAddWithdrawal} className="space-y-4">
                  {/* 1. Draw Amount */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ Ø³Ø­Ø¨Ù‡' : 'Montant RetirÃ©'}</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    />
                  </div>

                  {/* 2. Recipient Person */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ù„Ø³Ø§Ø­Ø¨ Ø§Ù„Ù…Ø³ØªÙÙŠØ¯ (Ù…Ù† Ø£Ø®Ø° Ø§Ù„Ù…Ø§Ù„ØŸ)' : 'BÃ©nÃ©ficiaire / Destinataire'}</label>
                    <select
                      value={withdrawPerson}
                      onChange={(e) => setWithdrawPerson(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    >
                      <option value="Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ">{isRtl ? 'Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ' : 'Ilyas El Moubarki'}</option>
                      <option value="ÙØ¤Ø§Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ">{isRtl ? 'ÙØ¤Ø§Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ' : 'Fouad El Moubarki'}</option>
                      <option value="Ø§Ø­Ù…Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ">{isRtl ? 'Ø§Ø­Ù…Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ' : 'Ahmed El Moubarki'}</option>
                      <option value="autre">{isRtl ? 'Ø´Ø®Øµ Ø¢Ø®Ø± (ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø£Ø³ÙÙ„)' : 'Autre personne (saisir ci-dessous)'}</option>
                    </select>
                  </div>

                  {/* Conditional custom name input */}
                  {withdrawPerson === 'autre' && (
                    <div className="space-y-1">
                      <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ø³Ù… Ø§Ù„Ø´Ø®Øµ Ø§Ù„Ù…Ø³ØªÙÙŠØ¯ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù' : 'Nom du bÃ©nÃ©ficiaire'}</label>
                      <input
                        type="text"
                        required
                        value={customPerson}
                        onChange={(e) => setCustomPerson(e.target.value)}
                        placeholder={isRtl ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø§Ø³Ù… Ù‡Ù†Ø§...' : 'Entrez le nom...'}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  )}

                  {/* 3. Reason notes */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ù„Ø³Ø¨Ø¨ Ø£Ùˆ ØªØ¯ÙˆÙŠÙ† Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø©' : 'Motif / Description'}</label>
                    <textarea
                      rows={2}
                      value={withdrawNotes}
                      onChange={(e) => setWithdrawNotes(e.target.value)}
                      placeholder={isRtl ? 'Ù…Ø«Ù„Ø§Ù‹: Ù…Ù‚ØªØ·Ø¹Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙƒØŒ Ø£Ø¯Ø§Ø¡ ÙÙˆØ§ØªÙŠØ±ØŒ Ù†Ù‚Ù„ Ø§Ù„Ø³Ù„Ø¹ØŒ Ø¥Ù„Ø®...' : 'DÃ©penses personnelles, achats logistiques...'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isRtl ? 'ØªØ£ÙƒÙŠØ¯ ÙˆØµØ±Ù Ø§Ù„Ø³Ø­Ø¨' : 'Valider le PrÃ©lÃ¨vement'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Withdrawal Registry Log (2/3 width) */}
            <div className={`${currentUser?.role === 'cashier' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {isRtl ? 'Ø³Ø¬Ù„ Ù…Ø³ØªÙ†Ø¯Ø§Øª Ø§Ù„ØµØ±Ù ÙˆØ§Ù„Ù…Ø³Ø­ÙˆØ¨Ø§Øª' : 'Historique des Mouvements de Sortie'}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isRtl ? 'ØªØªØ¨Ø¹ Ø²Ù…Ù†ÙŠ Ø¯Ù‚ÙŠÙ‚ Ù„ÙƒÙ„ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ù…Ø¹ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø¨Ø§Ù„Øº ÙˆØ§Ù„Ù…Ø³Ø¤ÙˆÙ„ÙŠÙ†.' : 'Liste exhaustive des dÃ©caissements et prÃ©lÃ¨vements d\'espÃ¨ces.'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar max-h-[320px] pr-1">
                <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} whitespace-nowrap">
                  <thead className="bg-white">
                    <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400">
                      <th className="py-2.5 px-2">{isRtl ? 'Ø§Ù„Ù…Ø±Ø¬Ø¹' : 'RÃ©f'}</th>
                      <th className="py-2.5 px-2">{isRtl ? 'Ø§Ù„ØªØ§Ø±ÙŠØ®' : 'Date'}</th>
                      <th className="py-2.5 px-2">{isRtl ? 'Ø§Ù„Ù…Ø³ØªÙÙŠØ¯' : 'BÃ©nÃ©ficiaire'}</th>
                      <th className="py-2.5 px-2 text-right">{isRtl ? 'Ø§Ù„Ù…Ø¨Ù„Øº' : 'Montant'}</th>
                      <th className="py-2.5 px-2 text-center">{isRtl ? 'Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„' : 'Saisi par'}</th>
                      <th className="py-2.5 px-2 text-center">{isRtl ? 'Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y divide-gray-100/60 md:divide-gray-50">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-xs font-bold">
                          {isRtl ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø­ÙˆØ¨Ø§Øª Ù…Ø³Ø¬Ù„Ø© Ø¨Ø§Ù„Ø®Ø²ÙŠÙ†Ø©.' : 'Aucun prÃ©lÃ¨vement de caisse.'}
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w, idx) => (
                        <tr key={w.id} className="text-xs hover:bg-gray-50 transition font-medium text-slate-700">
                          <td className="py-3 px-2 font-mono font-bold text-blue-600">#{w.id.substring(w.id.length - 5)}</td>
                          <td className="py-3 px-2 font-mono text-[11px] text-gray-400">
                            {new Date(w.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-bold text-slate-800">{w.person}</span>
                            <span className="block text-[10px] text-gray-400 italic truncate max-w-[130px]" title={w.notes}>{w.notes}</span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono font-black text-amber-600">
                            -{w.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-2 text-center text-[11px] text-gray-500 font-bold">
                            {resolveUserName(w.responsible, lang)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setPrintWithdrawal(w)}
                                title={isRtl ? 'Ø·Ø¨Ø§Ø¹Ø©' : 'Imprimer'}
                                className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-slate-600 border border-gray-200 rounded-lg text-[10px] font-black cursor-pointer inline-flex items-center gap-0.5 transition"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden md:inline">{isRtl ? 'Ø·Ø¨Ø§Ø¹Ø©' : 'Imprimer'}</span>
                              </button>
                              <button
                                onClick={() => handleEditWithdrawalClick(w)}
                                title={isRtl ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Modifier'}
                                className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-slate-600 border border-gray-200 rounded-lg text-[10px] font-black cursor-pointer inline-flex items-center gap-0.5 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                <span className="hidden md:inline">{isRtl ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Modifier'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteWithdrawal(w.id)}
                                title={isRtl ? 'Ø­Ø°Ù' : 'Supprimer'}
                                className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-red-600 border border-gray-200 rounded-lg text-[10px] font-black cursor-pointer inline-flex items-center gap-0.5 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span className="hidden md:inline">{isRtl ? 'Ø­Ø°Ù' : 'Supprimer'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* VOUCHER MODAL/POPUP FOR PRINTING */}
          {printWithdrawal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 no-print">
              <div className="bg-white p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl relative border border-gray-100">
                <button 
                  onClick={() => setPrintWithdrawal(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Printable receipt structure perfectly formatted */}
                <div id="printable-area" className="border-2 border-slate-900 p-4 space-y-4 font-mono text-xs text-slate-800 bg-white">
                  <div className="text-center border-b border-dashed border-slate-900 pb-3">
                    <h2 className="font-extrabold text-sm">{isRtl ? 'Ø§Ù„Ø¬Ù…ÙŠÙ„Ø© - Ù„ØªØ¯Ø¨ÙŠØ± Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ§Ù„Ù…Ø®Ø§Ø²Ù†' : 'Al Jamila - Gestion de Caisse'}</h2>
                    <p className="text-[10px] text-slate-500">{isRtl ? 'Ù…Ø³ØªÙ†Ø¯ ÙˆÙˆØµÙ„ Ø³Ø­Ø¨ Ù†Ù‚Ø¯ÙŠ Ø±Ø³Ù…ÙŠ' : 'BON DE RETRAIT DE CAISSE'}</p>
                    <p className="text-[9px] font-semibold mt-1">NÂº: {printWithdrawal.id}</p>
                  </div>

                  <div className="space-y-1.5 py-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>{isRtl ? 'Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙˆÙ‚Øª:' : 'Date/Heure:'}</span>
                      <span className="font-bold">{new Date(printWithdrawal.date).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? 'Ø§Ù„Ù…Ø³ØªÙ„Ù… ÙˆØ§Ù„Ø³Ø§Ø­Ø¨ :' : 'BÃ©nÃ©ficiaire:'}</span>
                      <span className="font-bold">{printWithdrawal.person}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? 'Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„ØªØ³Ø¬ÙŠÙ„:' : 'OpÃ©rateur:'}</span>
                      <span className="font-bold">{resolveUserName(printWithdrawal.responsible, lang)}</span>
                    </div>
                  </div>

                  <div className="border-y border-dashed border-slate-900 py-3 text-center my-3">
                    <p className="text-[10px] text-slate-500 uppercase">{isRtl ? 'Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø³Ø­ÙˆØ¨Ø© Ù…Ù† Ø§Ù„ØµØ±Ù' : 'MONTANT PRÃ‰LEVÃ‰'}</p>
                    <h3 className="text-xl font-black mt-1 font-mono text-slate-900">
                      {printWithdrawal.amount.toFixed(2)}
                    </h3>
                  </div>

                  <div className="space-y-1 text-slate-600 text-[10px]">
                    <p className="font-semibold">{isRtl ? 'Ø¹Ù„Ø§Ù‚Ø© Ø§Ù„Ø³Ø­Ø¨ / Ù…Ù„Ø§Ø­Ø¸Ø§Øª:' : 'Motif de dÃ©caissement:'}</p>
                    <p className="italic bg-gray-50 p-2 rounded border border-gray-100">{printWithdrawal.notes}</p>
                  </div>

                  <div className="pt-4 flex justify-between text-[10px] border-t border-dashed border-slate-900">
                    <div className="text-center">
                      <p>{isRtl ? 'ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'Sign. Caisse'}</p>
                      <div className="h-6"></div>
                      <p>................</p>
                    </div>
                    <div className="text-center">
                      <p>{isRtl ? 'ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙ„Ù…' : 'Sign. Receveur'}</p>
                      <div className="h-6"></div>
                      <p>................</p>
                    </div>
                  </div>
                </div>

                {/* Print confirmation action */}
                <div className="flex gap-2 text-xs font-bold">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isRtl ? 'Ø¨Ø¯Ø¡ Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙÙˆØ±ÙŠØ©' : 'Lancer l\'impression'}</span>
                  </button>
                  <button
                    onClick={() => setPrintWithdrawal(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer text-center"
                  >
                    {isRtl ? 'Ø¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù…Ø³ØªÙ†Ø¯' : 'Fermer'}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* EDIT WITHDRAWAL MODAL */}
          {editingWithdrawal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 no-print animate-fade-in">
              <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl relative border border-gray-100">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    {isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ Ù…Ø³ØªÙ†Ø¯ Ø§Ù„ØµØ±Ù' : 'Modifier le PrÃ©lÃ¨vement'}
                  </h3>
                  <button 
                    onClick={() => setEditingWithdrawal(null)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer font-bold text-xs"
                  >
                    {isRtl ? 'Ø¥Ù„ØºØ§Ø¡' : 'Annuler'}
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù ' : 'Montant PrÃ©levÃ© '}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                  </div>

                  {/* Beneficiary */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ù„Ù…Ø³ØªÙÙŠØ¯' : 'BÃ©nÃ©ficiaire'}</label>
                    <select
                      value={editPerson}
                      onChange={(e) => setEditPerson(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition cursor-pointer"
                    >
                      <option value="Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ">{isRtl ? 'Ø§Ù„ÙŠØ§Ø³ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ' : 'Ilyas El Moubarki'}</option>
                      <option value="ÙØ¤Ø§Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ">{isRtl ? 'ÙØ¤Ø§Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ' : 'Fouad El Moubarki'}</option>
                      <option value="Ø§Ø­Ù…Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ">{isRtl ? 'Ø§Ø­Ù…Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ' : 'Ahmed El Moubarki'}</option>
                      <option value="autre">{isRtl ? 'Ø´Ø®Øµ Ø¢Ø®Ø± (ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø£Ø³ÙÙ„)' : 'Autre personne (saisir ci-dessous)'}</option>
                    </select>
                  </div>

                  {/* Custom Beneficiary */}
                  {editPerson === 'autre' && (
                    <div className="space-y-1">
                      <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ø³Ù… Ø§Ù„Ø´Ø®Øµ Ø§Ù„Ù…Ø³ØªÙÙŠØ¯ Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù' : 'Nom du bÃ©nÃ©ficiaire'}</label>
                      <input
                        type="text"
                        required
                        value={editCustomPerson}
                        onChange={(e) => setEditCustomPerson(e.target.value)}
                        placeholder={isRtl ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø§Ø³Ù… Ù‡Ù†Ø§...' : 'Entrez le nom...'}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'Ø§Ù„Ø³Ø¨Ø¨ Ø£Ùˆ ØªØ¯ÙˆÙŠÙ† Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø©' : 'Motif / Description'}</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder={isRtl ? 'Ù…Ø«Ù„Ø§Ù‹: Ù…Ù‚ØªØ·Ø¹Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙƒØŒ Ø£Ø¯Ø§Ø¡ ÙÙˆØ§ØªÙŠØ±ØŒ Ù†Ù‚Ù„ Ø§Ù„Ø³Ù„Ø¹ØŒ Ø¥Ù„Ø®...' : 'DÃ©penses personnelles, achats logistiques...'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    ></textarea>
                  </div>

                  {/* Save button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>{isRtl ? 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' : 'Enregistrer les modifications'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ========================================================
          VIEW B: PERIODIC STOCK AUDITING (Ù…Ø±Ø§Ù‚Ø¨Ø© Ø¹Ø¬Ø² Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚)
         ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-fade-in text-slate-800">
          
          {/* General Security metrics */}
          <div className="max-w-xs">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xxs uppercase font-black text-gray-400 tracking-wider">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ ÙØ¦Ø§Øª ÙˆØªÙ†ÙˆØ¹ Ø§Ù„Ø³Ù„Ø¹ ' : 'Nombre d\'Articles distincts'}</p>
                <h4 className="text-lg font-black font-mono mt-1 text-slate-800">
                  {products.length} {isRtl ? 'Ø£ØµÙ†Ø§Ù Ù…ØªÙ†ÙˆØ¹Ø©' : 'produits'}
                </h4>
              </div>
              <span className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <FileText className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Interactive Audit Form Session */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-50">
              <div>
                <h3 className="text-xs uppercase font-extrabold text-blue-800 tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isRtl ? 'Ù…Ø·Ø¨Ø® Ø§Ù„ØªÙØªÙŠØ´ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ø®Ø²Ù† Ø§Ù„ÙØ¹Ù„ÙŠ Ù„Ù„Ø³Ù„Ø¹ Ù„Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„ÙØ±ÙˆÙ‚Ø§Øª ÙˆØ§Ù„Ø¹Ø¬Ø²' : 'Salle d\'Audit & Reconcialiation Physique de Stock'}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isRtl 
                    ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„ÙƒÙ…ÙŠØ§Øª Ø§Ù„Ù…ØªÙˆÙØ±Ø© Ù…Ø§Ø¯ÙŠØ§Ù‹ ÙˆÙ‚Ø§Ø±Ù†Ù‡Ø§ Ù…Ø¹ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ø±ØµØ¯ Ø§Ù„Ø¹Ø¬Ø² ÙˆØ§Ù„Ø³Ø±Ù‚Ø§Øª ÙÙˆØ±Ø§Ù‹.' 
                    : 'Ajustez les quantitÃ©s physiques observÃ©es sur l\'Ã©tagÃ¨re pour calculer les dÃ©ficits.'}
                </p>
              </div>

              {/* Force Match Action Button */}
              <button
                type="button"
                onClick={handleForcePerfectMatch}
                className="text-xxs font-black px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-slate-900 border border-gray-200 rounded-xl transition cursor-pointer self-start md:self-auto flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRtl ? 'Ø¥Ø¹Ø§Ø¯Ø© Ù…Ø·Ø§Ø¨Ù‚Ø© Ù…Ø¹ Ø§Ù„Ù†Ø¸Ø§Ù…' : 'Recopier le stock thÃ©orique'}</span>
              </button>
            </div>

            {auditSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p>{isRtl ? 'ØªÙ… ØªØ·Ø¨ÙŠÙ‚ ØªÙ‚Ø±ÙŠØ± Ø¬Ø±Ø¯ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø¨Ù†Ø¬Ø§Ø­ !' : 'Audit de stock validÃ© avec succÃ¨s !'}</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    {isRtl ? 'ØªÙ…Øª ØªØ³ÙˆÙŠØ© ÙˆØªØµÙÙŠØ© Ø¬Ù…ÙŠØ¹ Ø§Ù„ÙØ±ÙˆÙ‚Ø§Øª ÙˆØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø§Ø²Ù† ÙˆØªÙˆÙ„ÙŠØ¯ Ø§Ù„Ø­Ø±ÙƒØ§Øª ÙÙŠ Ø§Ù„Ø£Ø±Ø´ÙŠÙ.' : 'Les stocks ont Ã©tÃ© adaptÃ©s et les mouvements gÃ©nÃ©rÃ©s.'}
                  </p>
                </div>
              </div>
            )}

            {/* Config metadata of audit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-xxs font-black text-slate-400 uppercase block">{isRtl ? 'ÙˆØªÙŠØ±Ø© ÙˆÙ†ÙˆØ¹ÙŠØ© Ø§Ù„ØªÙØªÙŠØ´ Ø§Ù„Ø¯ÙˆØ±ÙŠ' : 'FrÃ©quence de l\'Audit'}</label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as any)}
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  <option value="monthly">{isRtl ? 'ØªÙØªÙŠØ´ ÙˆØªØ¹Ø¯ÙŠÙ„ Ø´Ù‡Ø±ÙŠ Ø¯ÙˆØ±ÙŠ Ù„Ù„ØµÙ†Ø¯ÙˆÙ‚' : 'Mensuel (ContrÃ´le de Caisse)'}</option>
                  <option value="semiannual">{isRtl ? 'Ø¬Ø±Ø¯ Ø´Ø§Ù…Ù„ Ø³Ù†ÙˆÙŠ / Ù†ØµÙ Ø³Ù†ÙˆÙŠ' : 'Semestriel / Annuel Complet'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-black text-slate-400 uppercase block">{isRtl ? 'Ø§Ù„Ù…ÙØªØ´ Ø§Ù„Ù‚Ø§Ø¦Ù… Ø¨Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚ ÙˆØ§Ù„Ø¹Ø¯ Ø§Ù„ÙØ¹Ù„ÙŠ' : 'Responsable / Auditeur'}</label>
                <input
                  type="text"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-black text-slate-400 uppercase block">{isRtl ? 'Ù…Ù„Ø§Ø­Ø¸Ø© ØªÙØªÙŠØ´ Ø´Ø§Ù…Ù„Ø©' : 'Rapport & Notes de ClÃ´ture'}</label>
                <input
                  type="text"
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder={isRtl ? 'Ù…Ø«Ø§Ù„: ØªÙ… ØªØµÙÙŠØ© Ø§Ù„Ø¹Ø¬Ø² Ø§Ù„Ù…Ø§Ù„ÙŠ Ø§Ù„Ù†Ø§ØªØ¬ Ø¹Ù† Ø§Ù„ØªØ®Ø±ÙŠØ¨...' : 'Ex: Ajustement suite Ã  pertes.'}
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Filter by Category for Stock Auditing */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50 flex-shrink-0">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">
                    {isRtl ? 'ØªØµÙ†ÙŠÙ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø­Ø³Ø¨ ÙØ¦Ø© Ø§Ù„Ù…Ù†ØªÙˆØ¬' : 'Audit et matching par catÃ©gorie de produit'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isRtl 
                      ? 'Ø§Ø®ØªØ± ÙØ¦Ø© Ù…Ø¹ÙŠÙ†Ø© Ù„ØªØ³Ù‡ÙŠÙ„ Ø¬Ø±Ø¯ ÙˆØªÙØªÙŠØ´ Ø§Ù„Ø±ÙÙˆÙ ÙˆÙ…ÙƒØ§ÙØ­Ø© Ø§Ù„Ø³Ø±Ù‚Ø© Ø¨Ø´ÙƒÙ„ Ù…Ù†Ø¸Ù… Ø¬Ø²Ø¦ÙŠ.' 
                      : 'SÃ©lectionnez une catÃ©gorie pour filtrer la table de vÃ©rification courante.'}
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                {/* Search products bar */}
                <div className="relative w-full sm:w-64">
                  <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 w-4 h-4 text-slate-400`} />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder={isRtl ? 'Ø§Ù„Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø±Ù…Ø² SKU...' : 'Rechercher par nom, SKU...'}
                    className={`w-full py-1.5 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                  {auditSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAuditSearchQuery('')}
                      className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} top-1.5 text-slate-400 hover:text-slate-600 font-bold text-base`}
                    >
                      Ã—
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={auditCategoryFilter}
                    onChange={(e) => setAuditCategoryFilter(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">{isRtl ? 'Ø¬Ù…ÙŠØ¹ ÙØ¦Ø§Øª Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ø³Ù„Ø¹' : 'Toutes les catÃ©gories'}</option>
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Category Matching Status Progress indicators & Cards */}
            <div className="space-y-2">
              <div className="text-xxs font-black text-slate-400 uppercase tracking-widest block leading-none">
                {isRtl ? 'Ù…Ø¤Ø´Ø±Ø§Øª Ø¬Ø±Ø¯ ÙˆØªÙØªÙŠØ´ Ø§Ù„ÙØ¦Ø§Øª ÙˆØ§Ù„Ø±ÙÙˆÙ (Ø§Ø¶ØºØ· Ù„Ù„Ø§Ø®ØªÙŠØ§Ø± ÙˆØ§Ù„ØªØµÙÙŠØ©)' : 'Progression d\'audit par catÃ©gorie (cliquez pour filtrer)'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Card for 'all' */}
                {(() => {
                  const stats = auditCategoryStats['all'];
                  const isSelected = auditCategoryFilter === 'all';
                  return (
                    <button
                      type="button"
                      onClick={() => setAuditCategoryFilter('all')}
                      className={`p-3 rounded-xl border text-right transition flex flex-col justify-between h-20 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 ring-1 ring-indigo-500/20 shadow-sm' 
                          : 'bg-white border-slate-150 hover:border-slate-250 text-slate-700 hover:bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400">
                          {isRtl ? 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ø§Ù…' : 'Total GÃ©nÃ©ral'}
                        </span>
                        {stats.pct === 100 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className={`text-[9.5px] font-mono font-black shrink-0 ${stats.pct > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{stats.pct}%</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 truncate">
                          {isRtl ? 'ÙƒÙ„ ÙØ¦Ø§Øª Ø§Ù„Ø³Ù„Ø¹' : 'Toutes CatÃ©gories'}
                        </p>
                        <span className="text-[9px] text-gray-450 font-bold block mt-0.5">
                          {isRtl ? `${stats.counted} Ù…Ù† ${stats.total} Ø³Ù„Ø¹` : `${stats.counted} sur ${stats.total}`}
                        </span>
                      </div>
                    </button>
                  );
                })()}

                {categoriesList.map(cat => {
                  const stats = auditCategoryStats[cat] || { total: 0, counted: 0, pct: 0 };
                  const isSelected = auditCategoryFilter === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setAuditCategoryFilter(cat)}
                      className={`p-3 rounded-xl border text-right transition flex flex-col justify-between h-20 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 ring-1 ring-indigo-500/20 shadow-sm' 
                          : 'bg-white border-slate-150 hover:border-slate-250 text-slate-700 hover:bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-extrabold text-[8px] uppercase tracking-wider text-slate-400 truncate max-w-[80px]">
                          {isRtl ? 'ÙØ¦Ø©' : 'Cat.'}
                        </span>
                        {stats.pct === 100 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className={`text-[9.5px] font-mono font-black shrink-0 ${stats.pct > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{stats.pct}%</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[124px]">
                          {cat}
                        </p>
                        <span className="text-[9px] text-gray-450 font-bold block mt-1">
                          {isRtl ? `${stats.counted} Ù…Ù† ${stats.total} Ø³Ù„Ø¹` : `${stats.counted} sur ${stats.total}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discrepancy warning board */}
            {(auditAnalysis.deficitQty > 0 || auditAnalysis.excessQty > 0) && (
              <div className="p-4 rounded-xl text-xs font-bold flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center bg-red-50/50 border border-red-100">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h5 className="text-red-900 font-extrabold">{isRtl ? 'ØªØ­Ø°ÙŠØ± Ø§Ù„Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©: ØªÙ… Ø±ØµØ¯ ÙØ±ÙˆÙ‚Ø§Øª ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚Ø© !' : 'Anomalie de Stock DÃ©tectÃ©e'}</h5>
                    <p className="text-[10px] text-red-700 font-bold mt-0.5">
                      {isRtl 
                        ? `ØªÙ… Ø±ØµØ¯ Ø¹Ø¬Ø² ÙˆØ§Ø®ØªÙ„Ø§Ø³ ÙƒÙ„ÙŠ Ø¨Ù‚ÙŠÙ…Ø© ${auditAnalysis.deficitQty} ÙˆØ­Ø¯Ø§Øª Ù…Ù† Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„Ù…ÙÙ‚ÙˆØ¯Ø©.` 
                        : `DÃ©ficit cumulÃ© estimÃ© Ã  ${auditAnalysis.deficitQty} unitÃ©s perdues.`}
                    </p>
                  </div>
                </div>
                <div className="text-slate-800 self-stretch sm:self-auto bg-white p-2.5 px-4 rounded-xl border border-red-100 text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'Ø§Ù„Ø¶Ø±Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ Ø§Ù„Ù†Ø§ØªØ¬ Ø¹Ù† Ø§Ù„Ø¹Ø¬Ø² Ø§Ù„Ù…Ø§Ù„ÙŠ (Ø´Ø±Ø§Ø¡)' : 'Pertes CoÃ»t d\'Achat Restant'}</p>
                  <p className="font-mono text-base font-black text-red-600">
                    -{auditAnalysis.deficitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* Product verification list table */}
            <div className="overflow-x-auto no-scrollbar">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} whitespace-nowrap">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                    <th className="py-2.5 px-2">{isRtl ? 'Ø§Ù„Ù…Ù†ØªØ¬ ÙˆØ§Ù„ØµÙ†Ù' : 'DÃ©signation de l\'article'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡' : 'P. Achat'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹' : 'P. Vente'}</th>
                    <th className="py-2.5 px-2 text-center bg-blue-50/30 text-blue-900 font-black">{isRtl ? 'Ø§Ù„Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø­Ø§Ù„ÙŠØ§Ù‹' : 'Stock ThÃ©orique'}</th>
                    <th className="py-2.5 px-2 text-center bg-emerald-50/30 text-emerald-900 font-black">{isRtl ? 'Ø§Ù„Ø¹Ø¯Ø¯ Ø§Ù„ÙØ¹Ù„ÙŠ Ø§Ù„Ù…Ø§Ø¯ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ø±Ù' : 'QuantitÃ© RÃ©elle'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'ØªØµÙÙŠØ© Ø§Ù„ÙØ§Ø±Ù‚' : 'Ã‰cart / DiffÃ©rence'}</th>
                    <th className="py-2.5 px-2 text-right">{isRtl ? 'Ù‚ÙŠÙ…Ø© Ø§Ù„ÙØ§Ø±Ù‚ Ø§Ù„Ù…Ø§Ù„ÙŠ' : 'Impulsion FinanciÃ¨re'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'Ø§Ù„Ø­Ø§Ù„Ø© ÙˆØ§Ù„Ù…Ø±Ø§Ù‚Ø¨Ø©' : 'Statut'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© ÙˆØ§Ù„ØªØ¯Ù‚ÙŠÙ‚' : 'VÃ©rification'}</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group md:divide-y md:divide-gray-50 text-xs font-semibold space-y-3 md:space-y-0 pb-4 md:pb-0">
                  {filteredAuditProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 font-bold">
                        {isRtl ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ù„Ø¹ Ø£Ùˆ Ù…Ù†ØªØ¬Ø§Øª Ù…Ø³Ø¬Ù„Ø© Ø¶Ù…Ù† Ù‡Ø°Ù‡ Ø§Ù„ÙØ¦Ø© Ø­Ø§Ù„ÙŠØ§Ù‹.' : 'Aucun produit enregistrÃ© sous cette catÃ©gorie.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAuditProducts.map(p => {
                      const actualValue = physicalCounts[p.id] !== undefined ? physicalCounts[p.id] : p.stock;
                      const expectedValue = p.stock;
                      const diffValue = actualValue - expectedValue;
                      const profitLossValue = diffValue * p.buyPrice;
                      const isVerified = !!verifiedProducts[p.id];

                      return (
                        <tr key={p.id} className="block md:table-row transition whitespace-normal md:whitespace-nowrap p-4 md:p-0 bg-white rounded-2xl shadow-sm border border-gray-100 md:border-none md:shadow-none md:rounded-none md:bg-transparent relative hover:bg-emerald-50/20">
                          <td className="block md:table-cell py-1 md:py-3 px-2 text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              
                              <span className="font-extrabold text-slate-850 block">{p.name}</span>
                              {physicalCounts[p.id] !== undefined ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded font-black shrink-0">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{isRtl ? 'ØªÙ… Ø­Ø³Ø§Ø¨Ù‡ Ø¹Ù…Ø¯Ø§Ù‹' : 'ComptÃ©'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span>{isRtl ? 'Ù…Ø¹ÙŠÙ† ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹' : 'Par dÃ©faut'}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono font-medium text-slate-500 border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-3">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡' : 'P. Achat'}</span>
                            <span>{p.buyPrice.toFixed(1)}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono font-medium text-slate-500 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹' : 'P. Vente'}</span>
                            <span>{p.sellPrice.toFixed(1)}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono font-extrabold bg-blue-50/10 text-blue-700 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø§Ù„Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø­Ø§Ù„ÙŠØ§Ù‹' : 'Stock ThÃ©orique'}</span>
                            <span>{expectedValue}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-3 md:py-3 px-2 text-center bg-emerald-50/10 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø§Ù„Ø¹Ø¯Ø¯ Ø§Ù„ÙØ¹Ù„ÙŠ Ø§Ù„Ù…Ø§Ø¯ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ø±Ù' : 'QuantitÃ© RÃ©elle'}</span>
                            <div className="inline-flex items-center gap-1 text-center justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  handlePhysicalCountChange(p.id, Math.max(0, actualValue - 1).toString());
                                }}
                                className="w-5 h-5 bg-gray-100 hover:bg-gray-200 font-bold rounded flex items-center justify-center cursor-pointer text-slate-600 text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={actualValue}
                                onChange={(e) => handlePhysicalCountChange(p.id, e.target.value)}
                                className="w-12 text-center bg-white border border-gray-200 rounded font-bold font-mono py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handlePhysicalCountChange(p.id, (actualValue + 1).toString());
                                }}
                                className="w-5 h-5 bg-gray-100 hover:bg-gray-200 font-bold rounded flex items-center justify-center cursor-pointer text-slate-600 text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'ØªØµÙÙŠØ© Ø§Ù„ÙØ§Ø±Ù‚' : 'Ã‰cart / DiffÃ©rence'}</span>
                            {diffValue === 0 ? (
                              <span className="font-mono font-bold text-gray-300">-</span>
                            ) : (
                              <span className={`font-mono font-black ${diffValue > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {diffValue > 0 ? `+${diffValue}` : diffValue}
                              </span>
                            )}
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-right font-mono font-bold border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ù‚ÙŠÙ…Ø© Ø§Ù„ÙØ§Ø±Ù‚ Ø§Ù„Ù…Ø§Ù„ÙŠ' : 'Impulsion FinanciÃ¨re'}</span>
                            {diffValue === 0 ? (
                              <span className="text-gray-300">0.00</span>
                            ) : (
                              <span className={diffValue > 0 ? 'text-blue-600' : 'text-red-600'}>
                                {diffValue > 0 ? '+' : ''}{profitLossValue.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center border-t border-dashed border-gray-100 md:border-none">
                            {diffValue === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-black">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{isRtl ? 'Ù…Ø·Ø§Ø¨Ù‚' : 'Parfait'}</span>
                              </span>
                            ) : diffValue < 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-black">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{isRtl ? 'Ø¹Ø¬Ø² âš ï¸' : 'Anomalie'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-black">
                                <Info className="w-3 h-3" />
                                <span>{isRtl ? 'Ø²Ø§Ø¦Ø¯' : 'Inconnu'}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center border-t border-dashed border-gray-100 md:border-none">
                            <button
                              type="button"
                              onClick={() => {
                                setVerifiedProducts(prev => {
                                  const newVal = !prev[p.id];
                                  if (newVal) {
                                    setPhysicalCounts(pc => ({
                                      ...pc,
                                      [p.id]: pc[p.id] !== undefined ? pc[p.id] : p.stock
                                    }));
                                  }
                                  return { ...prev, [p.id]: newVal };
                                });
                              }}
                              className={`py-1 px-3 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 mx-auto transition cursor-pointer border ${
                                isVerified 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm' 
                                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              <Check className={`w-3 h-3 stroke-[3.5] ${isVerified ? 'text-white' : 'text-slate-400'}`} />
                              <span>{isVerified ? (isRtl ? 'ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚' : 'VÃ©rifiÃ©') : (isRtl ? 'ØªØ­Ù‚Ù‚' : 'VÃ©rifier')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Validate Audit CTA Actions Bar */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[11px] text-gray-400">
                {isRtl 
                  ? 'âš ï¸ ØªØ°ÙƒÙŠØ±: Ø¹Ù†Ø¯ Ø§Ù„Ø¶ØºØ· Ø¹Ù„Ù‰ Ø²Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ØŒ Ø³ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù†Ø¸Ø§Ù… Ø¨ØªØ³ÙˆÙŠØ© Stocks ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙˆØªØ±Ø³ÙŠØ¨ Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±.' 
                  : 'Note: La validation ajustera les inventaires et stockera cette session historique.'}
              </p>
              <button
                type="button"
                onClick={handleApplyAudit}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>{isRtl ? 'Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© ØªØµÙÙŠØ© ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø®Ø²Ù† Ø§Ù„ÙØ¹Ù„ÙŠ' : 'Confirmer & Enregistrer l\'Audit d\'Inventaire'}</span>
              </button>
            </div>

          </div>

          {/* Audit History Room List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {isRtl ? 'Ø£Ø±Ø´ÙŠÙ Ù…Ø­Ø§Ø¶Ø± Ø§Ù„ØªÙØªÙŠØ´ ÙˆØ§Ù„Ø¬Ø±Ø¯ Ø§Ù„Ù…Ø§Ù„ÙŠ Ù„Ù„Ù…Ø®Ø§Ø²Ù†' : 'Rapports LÃ©gaux de l\'Audit d\'Inventaire PÃ©riodiques'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isRtl ? 'Ù…Ø­Ø§Ø¶Ø± Ø¬Ø±Ø¯ Ø§Ù„Ù…Ø®Ø§Ø²Ù† Ø´Ù‡Ø±ÙŠØ§Ù‹ ÙˆÙ„ØªØ£ÙƒÙŠØ¯ Ø¹Ø¯Ù… ÙˆØ¬ÙˆØ¯ Ø§Ø®ØªÙ„Ø§Ø³ Ø§Ù„Ø³Ù„Ø¹ Ø£Ùˆ ØªÙ„Ø§Ø¹Ø¨ ÙÙŠ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚.' : 'Archivage des sessions de rÃ©conciliation physique et de dÃ©tection de dÃ©tournements.'}
              </p>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} whitespace-nowrap">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400">
                    <th className="py-2 px-2">{isRtl ? 'Ù…Ø¹Ø±Ù Ø§Ù„ØªÙØªÙŠØ´' : 'Session ID'}</th>
                    <th className="py-2 px-2">{isRtl ? 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¬Ø±Ø¯' : 'Date d\'Audit'}</th>
                    <th className="py-2 px-2">{isRtl ? 'Ø¯ÙˆØ±ÙŠØ© Ø§Ù„Ø¬Ø±Ø¯' : 'PÃ©riodicitÃ©'}</th>
                    <th className="py-2 px-2">{isRtl ? 'Ø§Ù„Ù…ÙØªØ´ Ø§Ù„Ù‚Ø§Ø¦Ù… Ø¨Ø§Ù„Ø¹Ù…Ù„ÙŠØ©' : 'AuditÃ© par'}</th>
                    <th className="py-2 px-2 text-center">{isRtl ? 'Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„Ù…ÙÙ‚ÙˆØ¯Ø©' : 'Anomalies'}</th>
                    <th className="py-2 px-2 text-right">{isRtl ? 'Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¹Ø¬Ø² Ø§Ù„Ù…Ø³ØªÙƒØ´Ù' : 'Perte EstimÃ©e Cost'}</th>
                    <th className="py-2 px-2">{isRtl ? 'Ø®Ù„Ø§ØµØ© Ø§Ù„ØªÙ‚Ø±ÙŠØ±' : 'SynthÃ¨se & Certificat'}</th>
                    <th className="py-2 px-2 text-center">{isRtl ? 'Ø§Ù„ØªÙØ§ØµÙŠÙ„' : 'DÃ©tails'}</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group divide-y divide-gray-100/60 md:divide-gray-50 text-slate-700 font-medium">
                  {auditHistory.map(audit => (
                    <tr 
                      key={audit.id} 
                      className="block md:table-row text-xs hover:bg-slate-50 transition cursor-pointer p-4 md:p-0"
                      onClick={() => setSelectedAudit(audit)}
                    >
                      <td className="block md:table-cell py-1 md:py-3 px-2 font-mono font-bold text-blue-600 text-[14px] md:text-xs">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase mr-2 ml-2">{isRtl ? 'Ù…Ø¹Ø±Ù Ø§Ù„ØªÙØªÙŠØ´' : 'Session ID'}:</span>
                        #{audit.id.substring(audit.id.length - 6)}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 font-mono text-[12px] md:text-[11px] text-gray-400 font-extrabold border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-3">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¬Ø±Ø¯' : 'Date d\'Audit'}</span>
                        {new Date(audit.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø¯ÙˆØ±ÙŠØ© Ø§Ù„Ø¬Ø±Ø¯' : 'PÃ©riodicitÃ©'}</span>
                        {audit.type === 'monthly' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-bold text-[10px] uppercase">
                            {isRtl ? 'ØªÙØªÙŠØ´ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø´Ù‡Ø±ÙŠØ©' : 'Mensuelle'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-bold text-[10px] uppercase">
                            {isRtl ? 'Ø¬Ø±Ø¯ Ø´Ø§Ù…Ù„ Ø³Ù†ÙˆÙŠ/Ù†ØµÙ Ø³Ù†ÙˆÙŠ' : 'Semestrielle'}
                          </span>
                        )}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-slate-900 font-extrabold border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø§Ù„Ù…ÙØªØ´' : 'AuditÃ© par'}</span>
                        {audit.auditor}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„Ù…ÙÙ‚ÙˆØ¯Ø©' : 'Anomalies'}</span>
                        {audit.totalDeficitQty > 0 ? (
                          <span className="text-amber-600 font-bold">{audit.totalDeficitQty} ÙˆØ­Ø¯Ø§Øª</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">{isRtl ? '0 Ù…Ø·Ø§Ø¨Ù‚Ø© ØªØ§Ù…Ø©' : 'Aucune'}</span>
                        )}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-right font-mono font-black text-red-600 border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¹Ø¬Ø² Ø§Ù„Ù…Ø³ØªÙƒØ´Ù' : 'Perte EstimÃ©e Cost'}</span>
                        {audit.totalDeficitValue > 0 ? `-${audit.totalDeficitValue.toFixed(1)}` : '0.00'}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 italic text-[11px] md:text-[10px] text-gray-500 max-w-full md:max-w-[200px] truncate border-t border-dashed border-gray-100 md:border-none" title={audit.notes}>
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø®Ù„Ø§ØµØ© Ø§Ù„ØªÙ‚Ø±ÙŠØ±' : 'SynthÃ¨se'}</span>
                        <span className="truncate">{audit.notes}</span>
                      </td>
                      <td className="block md:table-cell py-3 md:py-3 px-2 text-center border-t border-dashed border-gray-100 md:border-none bg-slate-50 md:bg-transparent rounded-xl mt-2 md:mt-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAudit(audit);
                          }}
                          className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 py-2 md:py-1 px-4 md:px-2.5 bg-white md:bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[12px] md:text-[10px] rounded-lg transition shrink-0 cursor-pointer border border-indigo-200 md:border-indigo-100 shadow-sm md:shadow-none"
                        >
                          <Eye className="w-4 h-4 md:w-3.5 md:h-3.5" />
                          <span>{isRtl ? 'Ø¹Ø±Ø¶' : 'DÃ©tails'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          VIEW C: PROFITABILITY & TREASURY SECURITY CONTROL ROOM
         ======================================================== */}
      {activeTab === 'profits' && (
        <div className="space-y-8 animate-fade-in text-right animate-once">
          
          {/* Section description */}
          <div className="p-4 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-xs font-black text-slate-855 uppercase tracking-wider">
                  {isRtl ? 'Ø¨ÙˆØ§Ø¨Ø© Ù…Ø±Ø§Ù‚Ø¨Ø© Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª ÙˆØ§Ù„Ø®ØµÙˆÙ…Ø§Øª' : 'Suivi des Marges Profit, Remises & Chiffre d\'Affaires'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isRtl 
                    ? 'Ù…Ù†ØµØ© Ø£Ù…Ø§Ù† Ù…ØªØ·ÙˆØ±Ø© Ù„Ø±Ø¨Ø· Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„ÙƒØ§Ø´ÙŠØ± Ø¨Ø§Ù„Ù‡ÙˆØ§Ù…Ø´ Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ© ÙˆÙ…Ø±Ø§Ø¬Ø¹Ø© ØªØ£Ø«ÙŠØ± Ø§Ù„Ø®ØµÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­.' 
                    : 'AperÃ§u consolidÃ© des ventes, dÃ©duction faite de toutes les remises accordÃ©es pour l\'audit financier.'}
                </p>
              </div>
            </div>
          </div>

          {/* Filters Bar: Date & Grouping */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Box 1: Period filter selection */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-3 lg:col-span-2">
              <label className="text-xxs uppercase font-black text-slate-400 tracking-wider block">
                {isRtl ? 'ØªØ­Ø¯ÙŠØ¯ Ø§Ù„ÙØªØ±Ø© Ø§Ù„Ø²Ù…Ù†ÙŠØ© Ù„Ù„Ø¨Ø­Ø«' : 'Filtrer la pÃ©riode de vente'}
              </label>
              <div className="grid grid-cols-5 gap-1.5 flex-wrap">
                {(['all', 'today', 'yesterday', 'this_month', 'custom'] as const).map(f => {
                  const label = f === 'all' ? (isRtl ? 'Ø§Ù„ÙƒÙ„' : 'Tous') :
                                f === 'today' ? (isRtl ? 'Ø§Ù„ÙŠÙˆÙ…' : 'Aujourd\'hui') :
                                f === 'yesterday' ? (isRtl ? 'Ø§Ù„Ø¨Ø§Ø±Ø­Ø©' : 'Hier') :
                                f === 'this_month' ? (isRtl ? 'Ø§Ù„Ø´Ù‡Ø± Ø§Ù„Ø¬Ø§Ø±ÙŠ' : 'Ce mois') :
                                (isRtl ? 'Ù…Ø®ØµØµ' : 'Perso');
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setProfitDateFilter(f)}
                      className={`py-2 px-1 rounded-lg text-[10px] font-black text-center transition cursor-pointer ${
                        profitDateFilter === f 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {profitDateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2 animate-fade-in">
                  <div>
                    <label className="text-[9px] text-gray-450 block mb-1 font-bold">{isRtl ? 'Ù…Ù† ØªØ§Ø±ÙŠØ®' : 'Du'}</label>
                    <input
                      type="date"
                      value={profitStartDate}
                      onChange={(e) => setProfitStartDate(e.target.value)}
                      className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-455 block mb-1 font-bold">{isRtl ? 'Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®' : 'Au'}</label>
                    <input
                      type="date"
                      value={profitEndDate}
                      onChange={(e) => setProfitEndDate(e.target.value)}
                      className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Box 2: Search sold items */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-3">
              <label className="text-xxs uppercase font-black text-slate-400 tracking-wider block">
                {isRtl ? 'Ø§Ù„Ø¨Ø­Ø« Ø¹Ù† Ø³Ù„Ø¹Ø©ØŒ ÙØ¦Ø©ØŒ Ø£Ùˆ ÙØ§ØªÙˆØ±Ø©' : 'Rechercher produit, fac, cat'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profitSearchText}
                  onChange={(e) => setProfitSearchText(e.target.value)}
                  placeholder={isRtl ? 'Ø§Ø¨Ø­Ø« Ù‡Ù†Ø§...' : 'Ex: Produit, CatÃ©gorie ou Facture...'}
                  className="w-full py-2.5 pl-3 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className={`w-4 h-4 text-gray-400 absolute top-3.5 ${isRtl ? 'right-3' : 'left-3'}`} />
              </div>
            </div>

            {/* Box 3: Grouping level options */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-3">
              <label className="text-xxs uppercase font-black text-slate-400 tracking-wider block">
                {isRtl ? 'Ù…Ø³ØªÙˆÙ‰ ØªØ±ØªÙŠØ¨ Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ø£Ø±Ø¨Ø§Ø­' : 'Niveau de regroupement des marges'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'none', labelAr: 'ØªØ³Ù„Ø³Ù„ Ø§Ù„ØªÙˆØ§Ø±ÙŠØ®', labelFr: 'Chronologique' },
                  { value: 'product', labelAr: 'Ø­Ø³Ø¨ Ø§Ù„Ø³Ù„Ø¹', labelFr: 'Par Produit' },
                  { value: 'category', labelAr: 'Ø­Ø³Ø¨ Ø§Ù„ÙØ¦Ø§Øª', labelFr: 'Par CatÃ©gorie' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProfitGroupBy(opt.value as any)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-black text-center transition cursor-pointer flex flex-col justify-center items-center h-14 leading-tight ${
                      profitGroupBy === opt.value 
                        ? 'bg-indigo-50 text-indigo-900 border-2 border-indigo-400/85 shadow-xs' 
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-150'
                    }`}
                  >
                    <span>{isRtl ? opt.labelAr : opt.labelFr}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Consolidated Treasury Indicator Cards (Merged into 1 compact box as requested) */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-100">
              
              {/* Section 1: Transactions & Revenue Audit */}
              <div className="p-4 sm:p-6 flex flex-col justify-between space-y-4 bg-slate-50/30">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-3 font-semibold">
                    {isRtl ? 'ðŸ’¼ Ù…Ø¹Ø§Ù…Ù„Ø§Øª ÙˆØ£Ø±Ø¨Ø§Ø­ Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø­Ø³Ø§Ø¨ÙŠ' : 'Transactions & Revenu Fiscal'}
                  </span>
                  <div className="space-y-3.5">
                    {/* Brut sales */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª Ø§Ù„Ø®Ø§Ù…' : 'Chiffre d\'Affaires Brut'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-800">
                        {totalChiffreAffaireBrut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Discounts applied */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'Ø§Ù„Ø®ØµÙˆÙ…Ø§Øª Ø§Ù„Ù…Ù…Ù†ÙˆØ­Ø©' : 'Total Remises'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-amber-600">
                        {totalDiscountsApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Net turnover */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'ØµØ§ÙÙŠ Ø±Ù‚Ù… Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø§Øª' : 'Chiffre d\'Affaires Net'}
                      </span>
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {totalChiffreAffaireNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Net Profits */}
                    <div className="flex justify-between items-center bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 mt-2">
                      <span className="text-xs font-black text-emerald-800">
                        {isRtl ? 'ØµØ§ÙÙŠ Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ø®Ø²ÙŠÙ†Ø©' : 'BÃ©nÃ©fice Net RÃ©el'}
                      </span>
                      <span className="font-mono text-sm font-black text-emerald-700">
                        {totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Store Physical Sales & Desk Receipts */}
              <div className="p-4 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-3 font-semibold">
                    {isRtl ? 'ðŸ›’ Ù…Ø¨ÙŠØ¹Ø§Øª ÙˆØ¹Ø§Ø¦Ø¯Ø§Øª Ø§Ù„Ù…Ø­Ù„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©' : 'Ventes du Magasin & Encaissements'}
                  </span>
                  <div className="space-y-3.5">
                    {/* Overall Sales */}
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">
                        {isRtl ? 'ðŸ›ï¸ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ù…Ø­Ù„ :' : 'Ventes globales du magasin :'}
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900">
                        {totalOverallSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Cash Income received */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 px-1 pt-1">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <span>ðŸ’µ</span> {isRtl ? 'Ù†Ù‚Ø¯ (Ù…Ù‚Ø¨Ø¶ Ù†Ù‚Ø¯ÙŠ) :' : 'EspÃ¨ces de caisse :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-emerald-600">
                        {cumulativeCashSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Debts outstanding */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 px-1">
                      <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                        <span>ðŸ’¸</span> {isRtl ? 'Ø³Ù„Ù (Ø¯ÙŠÙˆÙ† Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡) :' : 'Dettes clients :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-rose-600">
                        {cumulativeDebtSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Client checks (postal checks as guarantee) */}
                    <div className="flex justify-between items-center pb-1 px-1">
                      <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                        <span>ðŸ“©</span> {isRtl ? 'Ø´ÙŠÙƒØ§Øª Ø§Ù„Ø¶Ù…Ø§Ù† :' : 'ChÃ¨ques de garantie :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-indigo-600">
                        {cumulativeChecksSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Inventory Valuation & Latent Profit */}
              <div className="p-4 sm:p-6 flex flex-col justify-between space-y-4 bg-slate-50/30">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-3 font-semibold">
                    {isRtl ? 'ðŸ“¦ Ù…Ø³ØªÙˆØ¯Ø¹ Ø§Ù„Ø³Ù„Ø¹ ÙˆØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ù…Ø®Ø§Ø²Ù†' : 'Valorisation du Stock & Profit Latent'}
                  </span>
                  <div className="space-y-3.5">
                    {/* Purchase/Buying price worth */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'Ù‚ÙŠÙ…Ø© Ø´Ø±Ø§Ø¡ Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„ÙƒÙ„ÙŠ' : 'Valeur d\'Achat (Stock) :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-800">
                        {totalStockWorthBuying.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    {/* Estimated Selling worth */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'ØªÙ‚Ø¯ÙŠØ± Ø¨ÙŠØ¹ Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹' : 'Estimation de Vente (Stock) :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-800">
                        {totalStockWorthSelling.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    {/* Potential Stock Profit / Margin in warehouse */}
                    <div className="flex justify-between items-center bg-indigo-950 text-white p-2.5 rounded-xl shadow-xs mt-2">
                      <span className="text-xs font-bold text-indigo-100">
                        {isRtl ? 'Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ Ø§Ù„Ù…ØªÙˆÙ‚Ø¹' : 'Profit Latent au Stock :'}
                      </span>
                      <span className="font-mono text-sm font-black text-emerald-400">
                        +{potentialStockProfit.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Main profits list details card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>
                    {profitGroupBy === 'none' ? (isRtl ? 'Ø³Ø¬Ù„ ØªÙØµÙŠÙ„ÙŠ Ù„Ø­Ø³Ø§Ø¨ ÙˆÙ…Ø±Ø§Ù‚Ø¨Ø© Ø£Ø±Ø¨Ø§Ø­ Ø§Ù„Ø³Ù„Ø¹ ÙˆØ§Ù„Ø®ØµÙˆÙ…Ø§Øª' : 'DÃ©tail des ventes et profits chronologiques') :
                     profitGroupBy === 'product' ? (isRtl ? 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ ÙˆÙ…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ø³Ù„Ø¹ ÙˆØ§Ù„Ù…Ù†ØªØ¬Ø§Øª' : 'Marges bÃ©nÃ©ficiaires regroupÃ©es par Produit') :
                     (isRtl ? 'ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ ÙˆÙ‡ÙˆØ§Ù…Ø´ Ø§Ù„ÙØ¦Ø§Øª ÙˆÙ†ÙˆØ¹ Ø§Ù„Ø³Ù„Ø¹' : 'Marges bÃ©nÃ©ficiaires regroupÃ©es par CatÃ©gorie')}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {isRtl ? 'ØªÙ‚Ø±ÙŠØ± Ø¯ÙˆØ±ÙŠ Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­ ÙˆÙ‚Ù…Ø¹ Ø§Ù„Ø³Ø±Ù‚Ø© ÙˆØ§Ù„ØªÙ„Ø§Ø¹Ø¨ Ø¨Ø§Ù„Ø®ØµÙˆÙ…Ø§Øª.' : 'Tracer l\'origine de toutes les marges dÃ©gagÃ©es par transaction.'}
                </p>
              </div>

              {/* Reset filter button */}
              <button
                type="button"
                onClick={() => {
                  setProfitDateFilter('all');
                  setProfitStartDate('');
                  setProfitEndDate('');
                  setProfitSearchText('');
                  setProfitGroupBy('none');
                }}
                className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black border border-slate-200 transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isRtl ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø¶Ø¨Ø· Ø§Ù„ØªØµÙÙŠØ©' : 'RÃ©initialiser'}</span>
              </button>
            </div>

            {/* View A: Detail Table (Chronological Transactions) */}
            {profitGroupBy === 'none' && (
              <div className="overflow-x-auto">
                <table className={`w-full sm:text-right ${isRtl ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-gray-400 whitespace-nowrap">
                      <th className="py-3 px-2 text-right">{isRtl ? 'ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø¹Ø§Ù…Ù„Ø©' : 'Date de Vente'}</th>
                      <th className="py-3 px-2 text-right">{isRtl ? 'Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©' : 'NÂ° Facture'}</th>
                      <th className="py-3 px-2 text-right">{isRtl ? 'Ø§Ù„Ù…Ù†ØªÙˆØ¬ Ø§Ù„Ù…Ø¨Ø§Ø¹' : 'Produit'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'ÙØ¦Ø© Ø§Ù„Ø³Ù„Ø¹Ø©' : 'CatÃ©gorie'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„Ù…Ø¨Ø§Ø¹Ø©' : 'QuantitÃ©'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'Ø´Ø±Ø§Ø¡ ÙØ±Ø¯ÙŠ' : 'Achat Unitaire'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'Ø¨ÙŠØ¹ ÙØ±Ø¯ÙŠ' : 'Vente Unitaire'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'ØµØ§ÙÙŠ Ø§Ù„Ø±Ø¨Ø­ Ø§Ù„ÙØ¹Ù„ÙŠ' : 'Marge Net'}</th>
                      <th className="py-3 px-3 text-center bg-amber-50/20 text-amber-800">{isRtl ? 'Ø§Ù„Ø®ØµÙ… Ø§Ù„ØªÙ†Ø§Ø³Ø¨ÙŠ' : 'Remise Prop.'}</th>
                      <th className="py-3 px-3 text-right text-slate-850">{isRtl ? 'ØµØ§ÙÙŠ Ø§Ù„Ù…Ù‚Ø¨ÙˆØ¶Ø§Øª' : 'Revenu net'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-slate-750">
                    {soldItemsList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 text-xs font-bold">
                          {isRtl ? 'Ù„Ù… ØªØ³Ø¬Ù„ Ø£ÙŠ Ø¹Ù…Ù„ÙŠØ§Øª Ø¨ÙŠØ¹ Ø£Ùˆ Ù…Ø¨ÙŠØ¹Ø§Øª Ø¨Ø¹Ø¯ Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„ÙÙ„Ø§ØªØ± Ø§Ù„ØªØµÙÙŠØ©.' : 'Aucun produit vendu correspondant.'}
                        </td>
                      </tr>
                    ) : (
                      soldItemsList.map((item, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-2 text-right font-mono text-[10.5px] text-gray-400 whitespace-nowrap">
                              {new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-indigo-600">
                              #{item.invoiceNumber}
                            </td>
                            <td className="py-3 px-2 text-right font-extrabold text-slate-900 truncate max-w-[150px]">
                              {item.productName}
                            </td>
                            <td className="py-3 px-2 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/50 rounded font-black text-[10px]">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                              {item.qty} {isRtl ? 'ÙˆØ­Ø¯Ø§Øª' : 'U'}
                            </td>
                            <td className="py-3 px-2 text-center font-mono text-gray-400">{item.buyPrice.toFixed(1)}</td>
                            <td className="py-3 px-2 text-center font-mono text-slate-500">{item.sellPrice.toFixed(1)}</td>
                            <td className="py-3 px-2 text-center font-mono">
                              <div className="flex flex-col items-center">
                                <span className={item.netProfit >= 0 ? "font-extrabold text-emerald-600" : "font-extrabold text-rose-600"}>
                                  {item.netProfit >= 0 ? '+' : ''}{item.netProfit.toFixed(1)}
                                </span>
                                {item.proportionalDiscount > 0 && (
                                  <span className="text-[9px] text-gray-400 font-bold font-mono">
                                    ({isRtl ? 'Ø§Ù„Ø®Ø§Ù…' : 'Brut'}: +{item.rawProfit.toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-extrabold text-amber-600 bg-amber-50/10">
                              {item.proportionalDiscount > 0 ? (
                                <span title={isRtl ? 'Ø­ØµØ© Ø§Ù„Ø®ØµÙ… Ø§Ù„ØªÙ†Ø§Ø³Ø¨ÙŠØ©' : 'Part Remise'}>
                                  -{item.proportionalDiscount.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900 bg-slate-50/20 whitespace-nowrap">
                              {item.netRevenue.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* View B: Grouped By Product Table */}
            {profitGroupBy === 'product' && (
              <div className="overflow-x-auto animate-fade-in">
                <table className={`w-full sm:text-right ${isRtl ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-gray-400 whitespace-nowrap">
                      <th className="py-3 px-3 text-right">{isRtl ? 'Ø§Ù„Ù…Ù†ØªÙˆØ¬ ÙˆØ§Ù„Ø³Ù„Ø¹Ø©' : 'Produit'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ø±Ø¬Ø¹ÙŠØ©' : 'CatÃ©gorie'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒÙ…ÙŠØ§Øª Ø§Ù„Ù…Ø¨Ø§Ø¹Ø©' : 'QuantitÃ© CumulÃ©e'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ ØªÙƒÙ„ÙØ© Ø§Ù„Ø´Ø±Ø§Ø¡' : 'CoÃ»t global d\'achat'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'ØµØ§ÙÙŠ Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª' : 'Revenu net'}</th>
                      <th className="py-3 px-3 text-right">{isRtl ? 'ØµØ§ÙÙŠ Ø§Ù„Ø±Ø¨Ø­ Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠ' : 'Marge Nette CumulÃ©e'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-slate-700">
                    {groupedByProduct.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-bold">
                          {isRtl ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù…ØªØ§Ø­Ø© Ù„Ù„Ù…Ù†ØªØ¬Ø§Øª ØªØ­Øª Ø§Ù„ØªØµÙÙŠØ© Ø§Ù„Ù…Ø­Ø¯Ø¯Ø©.' : 'Aucune donnÃ©e correspondante.'}
                        </td>
                      </tr>
                    ) : (
                      groupedByProduct.map((pGroup, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-3.5 px-3 text-right font-black text-slate-900">{pGroup.productName}</td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded font-black text-[9px] uppercase">
                              {pGroup.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-800">
                            {pGroup.totalQty} {isRtl ? 'ÙˆØ­Ø¯Ø©' : 'U'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-gray-400">{pGroup.totalBuyCost.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-slate-600 font-bold">{pGroup.totalSellRevenue.toFixed(2)}</span>
                              {pGroup.totalDiscount > 0 && (
                                <span className="text-[10px] text-amber-600 font-semibold font-mono">
                                  (-{pGroup.totalDiscount.toFixed(2)} {isRtl ? 'Ø®ØµÙ…' : 'Remise'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right bg-emerald-50/5">
                            <div className="flex flex-col items-end">
                              <span className={pGroup.totalProfit >= 0 ? "font-mono font-black text-emerald-600" : "font-mono font-black text-rose-600"}>
                                {pGroup.totalProfit >= 0 ? '+' : ''}{pGroup.totalProfit.toFixed(2)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* View C: Grouped By Category Table */}
            {profitGroupBy === 'category' && (
              <div className="overflow-x-auto animate-fade-in">
                <table className={`w-full sm:text-right ${isRtl ? 'text-right' : 'text-left'}`}>
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-gray-400 whitespace-nowrap">
                      <th className="py-3 px-4 text-right">{isRtl ? 'Ø§Ù„ÙØ¦Ø© Ø§Ù„Ù…Ø³ØªÙ‡Ø¯ÙØ©' : 'CatÃ©gorie'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'Ø¹Ø¯Ø¯ Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„Ù…Ø®ØªÙ„ÙØ© Ø§Ù„Ù…Ø¨Ø§Ø¹Ø©' : 'Produits distincts'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù‚Ø·Ø¹ Ø§Ù„Ù…ÙˆØ²Ø¹Ø©' : 'QuantitÃ© totale cumulÃ©e'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ ÙƒÙ„ÙØ© Ø§Ù„Ù…Ù‚ØªÙ†ÙŠØ§Øª' : 'CoÃ»t d\'acquisition total'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'ØµØ§ÙÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª' : 'Revenu net total'}</th>
                      <th className="py-3 px-4 text-right">{isRtl ? 'ØµØ§ÙÙŠ Ø±Ø¨Ø­ Ø§Ù„ÙØ¦Ø© ÙˆÙ†Ø³Ø¨ØªÙ‡' : 'Profil net dÃ©gagÃ©'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-slate-700">
                    {groupedByCategory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-bold">
                          {isRtl ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¨ÙŠØ¹Ø§Øª Ù…Ø³Ø¬Ù„Ø© Ù„Ø£ÙŠ ÙØ¦Ø© ØªØ­Øª ÙÙ„Ø§ØªØ± Ø§Ù„ÙØ±Ø² Ø§Ù„Ø­Ø§Ù„ÙŠØ©.' : 'aucune vente par catÃ©gorie enregistrÃ©e.'}
                        </td>
                      </tr>
                    ) : (
                      groupedByCategory.map((cGroup, idx) => {
                        const marginPercent = cGroup.totalBuyCost > 0 
                          ? ((cGroup.totalProfit / cGroup.totalBuyCost) * 105).toFixed(0) 
                          : '0';

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 px-4 text-right font-black text-indigo-950 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                              <span>{cGroup.category}</span>
                            </td>
                            <td className="py-4 px-4 text-center font-bold text-slate-500">
                              {cGroup.totalProductsCount} {isRtl ? 'Ø³Ù„Ø¹ Ù…Ø®ØªÙ„ÙØ©' : 'produits'}
                            </td>
                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                              {cGroup.totalQty} {isRtl ? 'Ù‚Ø·Ø¹Ø©' : 'Pcs'}
                            </td>
                            <td className="py-4 px-4 text-center font-mono text-gray-400">{cGroup.totalBuyCost.toFixed(2)}</td>
                            <td className="py-4 px-4 text-center font-mono">
                              <div className="flex flex-col items-center flex-wrap">
                                <span className="font-mono text-slate-600 font-bold">{cGroup.totalSellRevenue.toFixed(2)}</span>
                                {cGroup.totalDiscount > 0 && (
                                  <span className="text-[10px] text-amber-600 font-bold font-mono">
                                    (-{cGroup.totalDiscount.toFixed(2)} {isRtl ? 'Ø®ØµÙ…' : 'Remise'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right font-mono bg-emerald-50/5">
                              <div className="flex flex-col items-end">
                                <span className={cGroup.totalProfit >= 0 ? "font-black text-emerald-600" : "font-black text-rose-600"}>
                                  {cGroup.totalProfit >= 0 ? '+' : ''}{cGroup.totalProfit.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-emerald-500 font-bold">({marginPercent}% {isRtl ? 'Ø¹Ø§Ø¦Ø¯' : 'marge'})</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="audit-confirm-overlay">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-150 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up" id="audit-confirm-modal">
            
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isRtl ? 'Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„ÙØ¹Ù„ÙŠ' : 'Validation & Alignement de l\'Inventaire'}
                  </h3>
                  <p className="text-xxs font-bold text-gray-400 mt-0.5">
                    {isRtl ? 'ÙŠØ±Ø¬Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØªØ£ÙƒÙŠØ¯ Ø§Ù„ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ù‚Ø¨Ù„ Ø§Ù„ØªØ±Ø³ÙŠØ¨ ÙˆØªØ­Ø¯ÙŠØ« Ù‚ÙˆØ§Ø¹Ø¯ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' : 'Veuillez vÃ©rifier les Ã©carts avant alignement de la base.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Ã—
              </button>
            </div>

            {/* Scrollable discrepancies list representing updates */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                {isRtl 
                  ? 'Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø§Ø¹ØªÙ…Ø§Ø¯ ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªÙØªÙŠØ´ ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„ÙØ¹Ù„ÙŠØŸ Ø³ÙŠÙ‚ÙˆÙ… Ø§Ù„Ù†Ø¸Ø§Ù… Ø¨ØªØ³ÙˆÙŠØ© Stocks ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙˆØ³ØªØ³Ø¬Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ø¯ÙˆØ±Ø© Ø¨Ø§Ø³Ù…Ùƒ Ø¨Ø´ÙƒÙ„ Ø¯Ø§Ø¦Ù….' 
                  : 'ÃŠtes-vous sÃ»r de vouloir valider le rapport d\'inspection ? Cela va rectifier les stocks thÃ©oriques.'}
              </p>

              {/* Stats card inside summary */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase block">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ø¬Ø² Ø§Ù„Ù…Ø§Ù„ÙŠ' : 'DÃ©penses DÃ©ficit total'}</span>
                  <span className="text-sm font-black text-red-600 font-mono mt-0.5 block">
                    -{auditAnalysis.deficitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center border-r sm:border-slate-200 border-none">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase block">{isRtl ? 'Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„Ù‚Ø§Ø¦Ù… Ø¨Ø§Ù„Ø¹Ø¯' : 'Auditeur Responsable'}</span>
                  <span className="text-xs font-bold text-slate-800 truncate mt-0.5 block">
                    {auditorName}
                  </span>
                </div>
              </div>

              {/* Table of adjustments */}
              <div className="space-y-1.5">
                <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø³Ù„Ø¹ ÙˆØ§Ù„ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„Ù…Ø±Ø§Ø¯ ØªØ³ÙˆÙŠØªÙ‡Ø§ ØªØµÙÙŠØ© Ø§Ù„ÙØ§Ø±Ù‚:' : 'DÃ©tails des articles qui vont Ãªtre modifiÃ©s :'}
                </span>
                
                {auditAnalysis.items.filter(item => item.diff !== 0).length === 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center text-xs font-black border border-emerald-100 animate-pulse">
                    {isRtl ? 'ðŸŽ‰ Ù…Ù…ØªØ§Ø²: Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙŠ ÙØ±ÙˆÙ‚Ø§Øª Ù…Ø§Ø¯ÙŠØ©! Ù…Ø·Ø§Ø¨Ù‚Ø© ØªØ§Ù…Ø© 100% Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø³Ù„Ø¹ Ø¹Ù„Ù‰ Ø§Ù„Ø±ÙÙˆÙ.' : 'Excellent : aucun Ã©cart constatÃ©.'}
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {auditAnalysis.items
                      .filter(item => item.diff !== 0)
                      .map(item => {
                        const isDeficit = item.diff < 0;
                        return (
                          <div key={item.product.id} className="p-3 bg-white hover:bg-slate-50/50 flex items-center justify-between text-xs font-semibold gap-4">
                            <div className="flex flex-col truncate">
                              <span className="font-extrabold text-slate-800 truncate">{item.product.name}</span>
                              
                            </div>
                            <div className="flex items-center gap-4 shrink-0 text-right">
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block">{isRtl ? 'Ø§Ù„ÙØ±Ù‚' : 'Ã‰cart'}</span>
                                <span className={`font-mono font-black ${isDeficit ? 'text-red-600' : 'text-blue-600'}`}>
                                  {item.diff > 0 ? `+${item.diff}` : item.diff}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block">{isRtl ? 'Ù…Ù† âž” Ø¥Ù„Ù‰' : 'Avant -> AprÃ¨s'}</span>
                                <span className="font-mono font-bold text-slate-600">
                                  {item.expected} âž” {item.actual}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 px-5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                {isRtl ? 'Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ØªØ±Ø§Ø¬Ø¹' : 'Annuler'}
              </button>

              <button
                type="button"
                onClick={executeApplyAudit}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>{isRtl ? 'Ù†Ø¹Ù…ØŒ Ø§Ø¹ØªÙ…Ø¯ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø®Ø²Ù†' : 'Oui, Confirmer & Rectifier le Stock'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {selectedAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="audit-details-overlay">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-150 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up" id="audit-details-modal">
            
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {isRtl ? 'ØªÙØ§ØµÙŠÙ„ Ù…Ø­Ø¶Ø± Ø§Ù„ØªÙØªÙŠØ´ ÙˆØ§Ù„Ø¬Ø±Ø¯ Ø§Ù„Ù…Ø§Ù„ÙŠ Ù„Ù„Ù…Ø®Ø§Ø²Ù†' : 'DÃ©tails du Rapport d\'Inspection d\'Inventaire'}
                  </h3>
                  <p className="text-xxs font-bold text-gray-400 mt-0.5">
                    {isRtl ? `Ù…Ø³ØªÙ†Ø¯ ØªØ¯Ù‚ÙŠÙ‚ Ø±Ø³Ù…ÙŠ Ø±Ù‚Ù…: #${selectedAudit.id.substring(selectedAudit.id.length - 8)}` : `DÃ©tail du document d'audit officiel #${selectedAudit.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Ã—
              </button>
            </div>

            {/* Scrollable details list */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Stats & Metadata Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Stat block 1 */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                    {isRtl ? 'Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ ÙˆØ§Ù„ØªØ­Ù‚Ù‚' : 'DÃ©tails de l\'Auditeur'}
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'Ø§Ù„Ù‚Ø§Ø¦Ù… Ø¨Ø§Ù„Ø¹Ù…Ù„ÙŠØ©:' : 'Responsable:'}</span>
                      <span className="text-slate-900 font-extrabold">{selectedAudit.auditor}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'Ù†ÙˆØ¹ Ø§Ù„Ø¬Ø±Ø¯:' : 'Type d\'Audit:'}</span>
                      <span className="text-indigo-600 font-bold">
                        {selectedAudit.type === 'monthly' 
                          ? (isRtl ? 'ØªÙØªÙŠØ´ ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø´Ù‡Ø±ÙŠØ©' : 'Mensuel') 
                          : (isRtl ? 'Ø¬Ø±Ø¯ Ø´Ø§Ù…Ù„ Ø³Ù†ÙˆÙŠ' : 'Semestriel')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat block 2 */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                    {isRtl ? 'Ø±Ù…Ø² ÙˆØªØ§Ø±ÙŠØ® Ø§Ù„Ù…Ø­Ø¶Ø±' : 'Date d\'Inspection'}
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'Ø§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙŠÙˆÙ…:' : 'Date d\'audit:'}</span>
                      <span className="text-slate-750 font-mono font-bold">
                        {new Date(selectedAudit.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'Ø§Ù„ØªÙˆÙ‚ÙŠØª:' : 'Heure:'}</span>
                      <span className="text-slate-700 font-mono">
                        {new Date(selectedAudit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat block 3 */}
                <div className="p-4 bg-red-50/45 border border-red-100/50 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-wider block">
                    {isRtl ? 'Ø§Ù„Ù†ØªØ§Ø¦Ø¬ ÙˆØ§Ù„ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ©' : 'Impact Financier & Pertes'}
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-red-750">{isRtl ? 'Ø§Ù„Ø³Ù„Ø¹ Ø§Ù„Ù…ÙÙ‚ÙˆØ¯Ø©:' : 'Articles Perdus:'}</span>
                      <span className="text-red-700 font-mono font-black">{selectedAudit.totalDeficitQty} {isRtl ? 'ÙˆØ­Ø¯Ø§Øª' : 'unitÃ©s'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-red-650">{isRtl ? 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ø¬Ø²:' : 'DÃ©ficit total:'}</span>
                      <span className="text-red-600 font-mono font-black">-{selectedAudit.totalDeficitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                
              </div>

              {/* Notes block */}
              <div className="p-4 bg-amber-50/40 border border-amber-150 rounded-2xl">
                <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider block mb-1">
                  {isRtl ? 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª ÙˆØªÙˆØµÙŠØ© ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªÙØªÙŠØ´ Ø§Ù„Ù…Ø§Ù„ÙŠ:' : 'Observations de l\'inspecteur :'}
                </span>
                <p className="text-xs font-extrabold text-slate-800 leading-relaxed italic">
                  "{selectedAudit.notes}"
                </p>
              </div>

              {/* Grid or Table representing discrepancies items alignment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">
                    {isRtl ? 'Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙØ±ÙˆÙ‚Ø§Øª ÙˆØ§Ù„ØªØ³ÙˆÙŠØ§Øª Ø§Ù„ØªÙØµÙŠÙ„ÙŠØ© Ø¨Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª:' : 'Ajustements dÃ©taillÃ©s des produits affectÃ©s :'}
                  </span>
                  <span className="text-xxs font-bold text-gray-400">
                    {(selectedAudit.items ? selectedAudit.items.length : 0)} {isRtl ? 'ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ù…ØµØ¬Ù„Ø©' : 'modifications'}
                  </span>
                </div>

                {!selectedAudit.items || selectedAudit.items.length === 0 ? (
                  <div className="p-8 bg-emerald-55 bg-emerald-50 text-emerald-800 rounded-3xl text-center text-xs font-black border border-emerald-100/50">
                    {isRtl ? 'ðŸŽ‰ Ù…Ø·Ø§Ø¨Ù‚Ø© ØªØ§Ù…Ø© 100%! Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙŠ ÙØ±ÙˆÙ‚Ø§Øª Ù…Ø§Ø¯ÙŠØ© Ù…Ø³Ø¬Ù„Ø© ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ø¬Ø±Ø¯.' : 'Excellence : aucun Ã©cart constatÃ© sur cette pÃ©riode.'}
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-80 overflow-y-auto shadow-sm">
                    <table className="w-full text-xs font-semibold">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-right">{isRtl ? 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„ØªÙŠ Ø¨Ù‡Ø§ Ø²ÙŠØ§Ø¯Ø© Ø£Ùˆ Ù†Ù‚ØµØ§Ù†' : 'Articles affectÃ©s'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†' : 'Statut d\'Ã‰cart'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„ØªÙŠ ÙƒØ§Ù†Øª Ø¨Ø§Ù„Ù…Ø®Ø²ÙˆÙ†' : 'QuantitÃ© attendue'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'Ø§Ù„ÙƒÙ…ÙŠØ© Ø§Ù„ØªÙŠ Ø¨Ø§Ù„Ø±Ù Ø§Ù„ÙØ¹Ù„ÙŠ' : 'QuantitÃ© sur Rayon'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'ÙƒÙ…ÙŠØ© Ø§Ù„Ø²ÙŠØ§Ø¯Ø© Ø£Ùˆ Ø§Ù„Ù†Ù‚ØµØ§Ù†' : 'QuantitÃ© variation'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡' : 'Prix d\'Achat'}</th>
                          <th className="py-2.5 px-3 text-left">{isRtl ? 'Ø§Ù„Ø®Ø³Ø§Ø¦Ø± / Ø§Ù„Ø£Ø«Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ' : 'Pertes / Impact'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-700">
                        {selectedAudit.items.map((item, idx) => {
                          const isDeficit = item.diff < 0;
                          const financialEffect = item.diff * item.buyPrice;
                          return (
                            <tr key={`${item.productId}-${idx}`} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-3">
                                <div className="flex flex-col text-right">
                                  <span className="font-extrabold text-slate-800">{item.productName}</span>
                                  
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {isDeficit ? (
                                  <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-red-50 text-red-700 rounded-lg text-[10px] font-black border border-red-100">
                                    {isRtl ? 'Ù†Ù‚ØµØ§Ù† / Ø¹Ø¬Ø² ðŸ“‰' : 'DÃ©ficit (Baisse)'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-emerald-55 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black border border-emerald-100">
                                    {isRtl ? 'Ø²ÙŠØ§Ø¯Ø© / ÙØ§Ø¦Ø¶ ðŸ“ˆ' : 'ExcÃ©dent (Hausse)'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-gray-500 bg-slate-50/30">{item.expected}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">{item.actual}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`font-mono font-black px-1.5 py-0.5 rounded text-[10px] ${
                                  isDeficit ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                  {item.diff > 0 ? `+${item.diff}` : item.diff}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-gray-450">{item.buyPrice.toFixed(2)}</td>
                              <td className="py-3 px-3 text-left font-mono font-black text-red-600">
                                {isDeficit ? (
                                  <span className="text-red-650 bg-red-50/50 p-1 px-2 rounded border border-red-100">
                                    -{Math.abs(financialEffect).toFixed(2)} ({isRtl ? 'Ø®Ø³Ø§Ø±Ø©' : 'Perte'})
                                  </span>
                                ) : (
                                  <span className="text-emerald-650 bg-emerald-50/50 p-1 px-2 rounded border border-emerald-100">
                                    +{financialEffect.toFixed(2)} ({isRtl ? 'Ø£Ø±Ø¨Ø§Ø­ ØªØ³ÙˆÙŠØ©' : 'Gain'})
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>

            {/* Actions Footer */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                {isRtl ? 'Ø¥ØºÙ„Ø§Ù‚ ÙˆÙ…ØªØ§Ø¨Ø¹Ø©' : 'Fermer'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. MANUAL FINANCIAL ADJUSTMENT MODAL */}
      {editingField && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-slate-800" id="financial-adj-overlay">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-150 shadow-2xl overflow-hidden flex flex-col animate-scale-up" id="financial-adj-modal">
            
            {/* Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <h3 className="text-xs font-black text-slate-900">
                    {isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ ÙˆØªØµØ­ÙŠØ­ Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø§Ù„ÙŠ' : 'Correction du Solde Financier'}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {editingField === 'cash_income' && (isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ "Ø§Ù„Ù…Ø¯Ø§Ø®ÙŠÙ„ Ø§Ù„Ù†Ù‚Ø¯ÙŠØ© Ø§Ù„ØªØ±Ø§ÙƒÙ…ÙŠØ©"' : 'Ajustement des entrÃ©es de caisse')}
                    {editingField === 'withdrawals' && (isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ "Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø³Ø­ÙˆØ¨Ø§Øª ÙˆÙ…Ù‚ØªØ·Ø¹Ø§Øª Ø§Ù„Ù…Ø§Ù„Ùƒ"' : 'Ajustement des prÃ©lÃ¨vements')}
                    {editingField === 'drawer_balance' && (isRtl ? 'ØªØ¹Ø¯ÙŠÙ„ "Ø±ØµÙŠØ¯ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ Ø§Ù„Ø­Ø§Ù„ÙŠ"' : 'Ajustement du solde du coffre')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                Ã—
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAdjustment}>
              <div className="p-5 space-y-4">
                
                {/* Information Callout */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[10px] text-blue-800 leading-relaxed font-bold">
                  <p>
                    {isRtl 
                      ? 'ðŸ’¡ ÙŠÙ‚ÙˆÙ… Ù‡Ø°Ø§ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø¨Ø­ÙØ¸ Ù‚ÙŠÙ…Ø© Ø¥Ø¬Ù…Ø§Ù„ÙŠØ© Ù…Ø®ØµØµØ© Ù„Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ù…Ø§Ù„ÙŠ. Ø³ÙŠØªÙ… ØªØ³Ø¬ÙŠÙ„ Ù‡Ø°Ø§ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ ÙÙŠ Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ù…Ø³ØªØ¬Ø¯Ø§Øª Ø§Ù„ØªØ§Ø±ÙŠØ®ÙŠØ© ÙÙˆØ±Ø§Ù‹ ÙˆØ¨ÙƒÙ„ Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ù„Ù„Ø´ÙØ§ÙÙŠØ©.' 
                      : "L'exercice d'ajustement manuel enregistre un Ã©cart de trÃ©sorerie. L'activitÃ© sera consignÃ©e pour un audit transparent."}
                  </p>
                </div>

                {/* Input Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                      {isRtl ? 'Ø§Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠØ© Ø§Ù„Ù…Ø±Ø§Ø¯ Ø§Ø¹ØªÙ…Ø§Ø¯Ù‡Ø§  :' : 'Nouveau Montant Cible  :'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={tempValue}
                      onChange={e => setTempValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-850 focus:border-indigo-500 focus:bg-white outline-none transition font-mono"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                      {isRtl ? 'Ø§Ù„Ø³Ø¨Ø¨ Ø£Ùˆ ØªØ¨Ø±ÙŠØ± Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø­Ø³Ø§Ø¨ÙŠ (Ø¥Ù„Ø²Ø§Ù…ÙŠ) :' : 'Motif ou explication de l\'ajustement (requis) :'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition resize-none"
                      placeholder={isRtl ? 'Ù…Ø«Ù„Ø§Ù‹: Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ù…Ø¯Ø§Ø®ÙŠÙ„ØŒ ØªØµØ­ÙŠØ­ ÙØ±ÙˆÙ‚Ø§Øª Ø§Ù„ØµØ±Ù Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ø§Ù„ØµØ¨Ø§Ø­ÙŠ...' : 'Ex: Correction des Ã©carts de caisse de la journÃ©e...'}
                    />
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="py-2 px-4 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 rounded-xl transition cursor-pointer"
                >
                  {isRtl ? 'Ø¥Ù„ØºØ§Ø¡' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-850 text-white rounded-xl shadow-md font-black transition cursor-pointer"
                >
                  {isRtl ? 'Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØ­ÙØ¸' : 'Valider & Enregistrer'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}


