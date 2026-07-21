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

  // Tab controller: 'withdrawals' (سحوبات) vs 'audit' (مسائلة وتدقيق الصندوق والمطابقة) vs 'profits' (تحقيق الأرباح والخصومات)
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
  const [withdrawPerson, setWithdrawPerson] = React.useState('الياس المباركي');
  const [customPerson, setCustomPerson] = React.useState('');
  const [withdrawNotes, setWithdrawNotes] = React.useState('');
  const [withdrawalSuccess, setWithdrawalSuccess] = React.useState(false);

  // Edit withdrawal states
  const [editingWithdrawal, setEditingWithdrawal] = React.useState<Withdrawal | null>(null);
  const [editAmount, setEditAmount] = React.useState('');
  const [editPerson, setEditPerson] = React.useState('الياس المباركي');
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
      person: finalPerson || (isRtl ? 'غير محدد' : 'Non spécifié'),
      responsible: currentUser?.name || (isRtl ? 'حساب النظام' : 'Système'),
      notes: withdrawNotes.trim() || (isRtl ? 'سحب نقدي من الصندوق' : 'Prélèvement de caisse')
    };

    setWithdrawals(prev => [newWithdrawal, ...prev]);
    api.withdrawals.create(newWithdrawal).catch(e => console.error('Error saving withdrawal', e));
    
    if (onLogActivity) {
      onLogActivity(
        'withdraw_add',
        `عملية سحب نقدي جديدة بقيمة ${amount.toFixed(2)} لفائدة "${newWithdrawal.person}" (السبب الداعي: ${newWithdrawal.notes})`,
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
    if (confirm(isRtl ? 'هل أنت متأكد من حذف هذا السند؟' : 'Êtes-vous sûr de vouloir supprimer ce bon ?')) {
      setWithdrawals(prev => prev.filter(x => x.id !== id));
      api.withdrawals.delete(id).catch(e => console.error('Error deleting withdrawal', e));
      if (onLogActivity) {
        onLogActivity(
          'withdraw_delete',
          `حذف مستند صرف بقيمة ${w.amount.toFixed(2)} لفائدة "${w.person}"`,
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
    const presets = ['الياس المباركي', 'فؤاد المباركي', 'احمد المباركي'];
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

    setWithdrawals(prev => prev.map(w => {
      if (w.id === editingWithdrawal.id) {
        return {
          ...w,
          amount,
          person: finalPerson || (isRtl ? 'غير محدد' : 'Non spécifié'),
          notes: editNotes.trim() || (isRtl ? 'سحب نقدي من الصندوق' : 'Prélèvement de caisse')
        };
      }
      return w;
    }));

    if (onLogActivity) {
      onLogActivity(
        'withdraw_edit',
        `تعديل مستند صرف (المرجع #${editingWithdrawal.id.substring(editingWithdrawal.id.length - 5)}) بقيمة ${amount.toFixed(2)} لفائدة "${finalPerson}"`,
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
      fieldAr = 'المداخيل النقدية التراكمية في الصندوق';
      fieldFr = 'Entrées de caisse cumulées';
      const newAdj = val - baseCashIncome; setCashIncomeAdjustment(newAdj); syncDrawerState({ cash_income_adjustment: newAdj });
    } else if (editingField === 'withdrawals') {
      previousVal = totalWithdrawnAmount;
      fieldAr = 'مجموع السحوبات ومقتطعات المالك';
      fieldFr = 'Total des prélèvements';
      const newAdj = val - baseWithdrawnAmount; setWithdrawalsAdjustment(newAdj); syncDrawerState({ withdrawals_adjustment: newAdj });
    } else if (editingField === 'drawer_balance') {
      previousVal = currentDrawerBalance;
      fieldAr = 'رصيد الصندوق الحالي المتوفر';
      fieldFr = 'Solde direct du coffre';
      const newAdj = val - (totalCashIncome - totalWithdrawnAmount); setDrawerBalanceAdjustment(newAdj); syncDrawerState({ drawer_balance_adjustment: newAdj });
    }

    if (onLogActivity) {
      const reasonText = adjustmentReason.trim() || (isRtl ? 'تعديل مالي يدوي عام' : 'Ajustement financier manuel');
      onLogActivity(
        'withdraw_add',
        `تعديل مالي: تم تعديل "${fieldAr}" من ${previousVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} إلى ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} (المبرر: ${reasonText})`,
        `Modif financière : "${fieldFr}" ajusté de ${previousVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} à ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Raison : ${reasonText})`,
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
        const category = prod?.category || (isRtl ? 'غير مصنف' : 'Non classé');

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
            ? `المطابقة الدورية ومراقبة فروقات الصندوق (${auditType === 'monthly' ? 'شهري' : 'نصف سنوي'})` 
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
      notes: auditNotes.trim() || (isRtl ? 'تم المطابقة الكاملة وتسوية الكميات وتصفية الفروقات' : 'Audit et rectification de stock effectués.'),
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
              <span>{isRtl ? 'إدارة ومطابقة أرصدة الصندوق' : 'Finances, Caisse & Audit de Caisse'}</span>
            </h2>
            <p className="text-sm font-semibold text-slate-500 mt-2 max-w-2xl">
              {isRtl 
                ? (currentUser?.role === 'cashier' ? 'تتبع زمني دقيق لكل السحوبات المسجلة ومجموع المقتطعات من الصندوق.' : 'سحب الأموال والعمولات اليومية من الصندوق، والمطابقة الدورية الشاملة للمخزن ومراجعة فروقات الصندوق والاستحقاق.')
                : (currentUser?.role === 'cashier' ? 'Suivi des prélèvements de caisse nets.' : 'Gérez les retraits de caisse quotidiens et réalisez l\'audit périodique d\'inventaire.')}
            </p>
          </div>
        </div>

        {/* BENTO GRID FINANCIAL DASHBOARD */}
        {currentUser?.role !== 'cashier' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-2">
            
            {/* Drawer Balance - Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 p-6 rounded-[2rem] shadow-2xl flex flex-col justify-between group hover:shadow-purple-500/20 transition-all transform hover:-translate-y-1">
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <Lock className="w-5 h-5 text-indigo-300" />
                  </div>
                  <p className="text-xs font-extrabold text-indigo-200 uppercase tracking-widest">{isRtl ? 'رصيد الصندوق الحالي' : 'Solde Caisse Actuel'}</p>
                </div>
              </div>
              
              <div className="relative z-10 mt-6 mb-2">
                <h3 className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md flex items-end gap-2">
                  {currentDrawerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Total Income */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'إجمالي المداخيل' : 'Entrées de Caisse'}</p>
                </div>
              </div>
              
              <div className="relative z-10 mt-6 mb-2">
                <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {totalCashIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

            {/* Total Withdrawn */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl opacity-50"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-100 text-rose-600">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isRtl ? 'إجمالي السحوبات' : 'Total Retraits'}</p>
                </div>
              </div>
              
              <div className="relative z-10 mt-6 mb-2">
                <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tight text-rose-650">
                  {totalWithdrawnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>

          </div>
        )}

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
                <span>{isRtl ? 'مسحوبات الصندوق اليومية' : 'Retraits de Caisse'}</span>
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
                <span>{isRtl ? 'مطابقة ومراقبة فروقات الصندوق' : 'Audit & Contrôle de Caisse'}</span>
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
                <span>{isRtl ? 'مراقبة الأرباح والخصومات' : 'Marges & Chiffre d\'Affaires'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          VIEW A: CASH DRAWER WITHDRAWALS ROOM (سحوبات الصندوق)
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
                      {isRtl ? 'المداخيل النقدية التراكمية في الصندوق' : 'Entrées de Caisse (Espèces)'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField('cash_income');
                        setTempValue(totalCashIncome.toString());
                        setAdjustmentReason('');
                      }}
                      className="text-emerald-650 hover:text-emerald-800 p-1 rounded hover:bg-slate-50 transition cursor-pointer flex items-center justify-center"
                      title={isRtl ? 'تعديل يدوي' : 'Ajustement manuel'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-lg font-black text-emerald-950 font-mono mt-1">
                    {totalCashIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xxs text-emerald-600 mt-1">{isRtl ? 'إجمالي المقبوضات النقدية' : 'Total des encaissements'}</p>
                </div>
              </div>
            )}

            {/* Total logged withdrawals */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xxs uppercase font-black text-gray-400 tracking-wider">
                    {isRtl ? 'مجموع السحوبات ومقتطعات المالك' : 'Prélèvements & Retraits'}
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
                      title={isRtl ? 'تعديل يدوي' : 'Ajustement manuel'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h4 className="text-lg font-black text-amber-600 font-mono mt-1">
                  {totalWithdrawnAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xxs text-slate-500 mt-1">{isRtl ? `${withdrawals.length} سحوبات مسجلة` : `${withdrawals.length} retraits`}</p>
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
                      {isRtl ? 'رصيد الصندوق الحالي المتوفر' : 'Solde Net en Casserole'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField('drawer_balance');
                        setTempValue(currentDrawerBalance.toString());
                        setAdjustmentReason('');
                      }}
                      className="text-emerald-100 hover:text-white p-1 rounded hover:bg-white/15 transition cursor-pointer flex items-center justify-center"
                      title={isRtl ? 'تعديل يدوي' : 'Ajustement manuel'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xl font-black font-mono mt-1">
                    {currentDrawerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xxs text-emerald-200 mt-1">
                    {currentDrawerBalance < 1000 
                      ? (isRtl ? '⚠️ مخزون نقدي منخفض بالصندوق' : 'Casserole basse') 
                      : (isRtl ? '✅ الرصيد النقدي ممتاز ومتاح' : 'Liquidité bonne')}
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
                    {isRtl ? 'تسجيل عملية سحب نقدي جديدة' : 'Nouveau Prélèvement de Caisse'}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isRtl ? 'سجل أي كمية مال مأخوذة من مسؤولي الصناديق فوراً لضبط الحسابات.' : 'Saisissez les montants retirés pour maintenir l\'équilibre des comptes.'}
                  </p>
                </div>

                {withdrawalSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{isRtl ? 'تم تسجيل السحب بنجاح واقتطاعه من رصيد الصندوق !' : 'Retrait enregistré avec succès !'}</span>
                  </div>
                )}

                <form onSubmit={handleAddWithdrawal} className="space-y-4">
                  {/* 1. Draw Amount */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'المبلغ المطلوب سحبه' : 'Montant Retiré'}</label>
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
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'الساحب المستفيد (من أخذ المال؟)' : 'Bénéficiaire / Destinataire'}</label>
                    <select
                      value={withdrawPerson}
                      onChange={(e) => setWithdrawPerson(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    >
                      <option value="الياس المباركي">{isRtl ? 'الياس المباركي' : 'Ilyas El Moubarki'}</option>
                      <option value="فؤاد المباركي">{isRtl ? 'فؤاد المباركي' : 'Fouad El Moubarki'}</option>
                      <option value="احمد المباركي">{isRtl ? 'احمد المباركي' : 'Ahmed El Moubarki'}</option>
                      <option value="autre">{isRtl ? 'شخص آخر (كتابة الاسم بالأسفل)' : 'Autre personne (saisir ci-dessous)'}</option>
                    </select>
                  </div>

                  {/* Conditional custom name input */}
                  {withdrawPerson === 'autre' && (
                    <div className="space-y-1">
                      <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'اسم الشخص المستفيد المستهدف' : 'Nom du bénéficiaire'}</label>
                      <input
                        type="text"
                        required
                        value={customPerson}
                        onChange={(e) => setCustomPerson(e.target.value)}
                        placeholder={isRtl ? 'أدخل الاسم هنا...' : 'Entrez le nom...'}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                      />
                    </div>
                  )}

                  {/* 3. Reason notes */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'السبب أو تدوين الملاحظة' : 'Motif / Description'}</label>
                    <textarea
                      rows={2}
                      value={withdrawNotes}
                      onChange={(e) => setWithdrawNotes(e.target.value)}
                      placeholder={isRtl ? 'مثلاً: مقتطعات المالك، أداء فواتير، نقل السلع، إلخ...' : 'Dépenses personnelles, achats logistiques...'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{isRtl ? 'تأكيد وصرف السحب' : 'Valider le Prélèvement'}</span>
                  </button>
                </form>
              </div>
            )}

            {/* Withdrawal Registry Log (2/3 width) */}
            <div className={`${currentUser?.role === 'cashier' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4`}>
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {isRtl ? 'سجل مستندات الصرف والمسحوبات' : 'Historique des Mouvements de Sortie'}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isRtl ? 'تتبع زمني دقيق لكل السحوبات المسجلة مع تفاصيل المبالغ والمسؤولين.' : 'Liste exhaustive des décaissements et prélèvements d\'espèces.'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar max-h-[320px] pr-1">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-white">
                    <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400">
                      <th className="py-2.5 px-2">{isRtl ? 'المرجع' : 'Réf'}</th>
                      <th className="py-2.5 px-2">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2.5 px-2">{isRtl ? 'المستفيد' : 'Bénéficiaire'}</th>
                      <th className="py-2.5 px-2 text-right">{isRtl ? 'المبلغ' : 'Montant'}</th>
                      <th className="py-2.5 px-2 text-center">{isRtl ? 'المسؤول' : 'Saisi par'}</th>
                      <th className="py-2.5 px-2 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y divide-gray-100/60 md:divide-gray-50">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 text-xs font-bold">
                          {isRtl ? 'لا توجد سحوبات مسجلة بالخزينة.' : 'Aucun prélèvement de caisse.'}
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
                                title={isRtl ? 'طباعة' : 'Imprimer'}
                                className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-slate-600 border border-gray-200 rounded-lg text-[10px] font-black cursor-pointer inline-flex items-center gap-0.5 transition"
                              >
                                <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden md:inline">{isRtl ? 'طباعة' : 'Imprimer'}</span>
                              </button>
                              <button
                                onClick={() => handleEditWithdrawalClick(w)}
                                title={isRtl ? 'تعديل' : 'Modifier'}
                                className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-slate-600 border border-gray-200 rounded-lg text-[10px] font-black cursor-pointer inline-flex items-center gap-0.5 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                <span className="hidden md:inline">{isRtl ? 'تعديل' : 'Modifier'}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteWithdrawal(w.id)}
                                title={isRtl ? 'حذف' : 'Supprimer'}
                                className="p-1 px-2 bg-gray-50 hover:bg-gray-100 text-red-600 border border-gray-200 rounded-lg text-[10px] font-black cursor-pointer inline-flex items-center gap-0.5 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span className="hidden md:inline">{isRtl ? 'حذف' : 'Supprimer'}</span>
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
                    <h2 className="font-extrabold text-sm">{isRtl ? 'الجميلة - لتدبير الحسابات والمخازن' : 'Al Jamila - Gestion de Caisse'}</h2>
                    <p className="text-[10px] text-slate-500">{isRtl ? 'مستند ووصل سحب نقدي رسمي' : 'BON DE RETRAIT DE CAISSE'}</p>
                    <p className="text-[9px] font-semibold mt-1">Nº: {printWithdrawal.id}</p>
                  </div>

                  <div className="space-y-1.5 py-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>{isRtl ? 'التاريخ والوقت:' : 'Date/Heure:'}</span>
                      <span className="font-bold">{new Date(printWithdrawal.date).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? 'المستلم والساحب :' : 'Bénéficiaire:'}</span>
                      <span className="font-bold">{printWithdrawal.person}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{isRtl ? 'مسؤول التسجيل:' : 'Opérateur:'}</span>
                      <span className="font-bold">{resolveUserName(printWithdrawal.responsible, lang)}</span>
                    </div>
                  </div>

                  <div className="border-y border-dashed border-slate-900 py-3 text-center my-3">
                    <p className="text-[10px] text-slate-500 uppercase">{isRtl ? 'القيمة المسحوبة من الصرف' : 'MONTANT PRÉLEVÉ'}</p>
                    <h3 className="text-xl font-black mt-1 font-mono text-slate-900">
                      {printWithdrawal.amount.toFixed(2)}
                    </h3>
                  </div>

                  <div className="space-y-1 text-slate-600 text-[10px]">
                    <p className="font-semibold">{isRtl ? 'علاقة السحب / ملاحظات:' : 'Motif de décaissement:'}</p>
                    <p className="italic bg-gray-50 p-2 rounded border border-gray-100">{printWithdrawal.notes}</p>
                  </div>

                  <div className="pt-4 flex justify-between text-[10px] border-t border-dashed border-slate-900">
                    <div className="text-center">
                      <p>{isRtl ? 'توقيع الصندوق' : 'Sign. Caisse'}</p>
                      <div className="h-6"></div>
                      <p>................</p>
                    </div>
                    <div className="text-center">
                      <p>{isRtl ? 'توقيع المستلم' : 'Sign. Receveur'}</p>
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
                    <span>{isRtl ? 'بدء الطباعة الفورية' : 'Lancer l\'impression'}</span>
                  </button>
                  <button
                    onClick={() => setPrintWithdrawal(null)}
                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer text-center"
                  >
                    {isRtl ? 'إغلاق المستند' : 'Fermer'}
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
                    {isRtl ? 'تعديل مستند الصرف' : 'Modifier le Prélèvement'}
                  </h3>
                  <button 
                    onClick={() => setEditingWithdrawal(null)}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer font-bold text-xs"
                  >
                    {isRtl ? 'إلغاء' : 'Annuler'}
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'المبلغ المستهدف ' : 'Montant Prélevé '}</label>
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
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'المستفيد' : 'Bénéficiaire'}</label>
                    <select
                      value={editPerson}
                      onChange={(e) => setEditPerson(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition cursor-pointer"
                    >
                      <option value="الياس المباركي">{isRtl ? 'الياس المباركي' : 'Ilyas El Moubarki'}</option>
                      <option value="فؤاد المباركي">{isRtl ? 'فؤاد المباركي' : 'Fouad El Moubarki'}</option>
                      <option value="احمد المباركي">{isRtl ? 'احمد المباركي' : 'Ahmed El Moubarki'}</option>
                      <option value="autre">{isRtl ? 'شخص آخر (كتابة الاسم بالأسفل)' : 'Autre personne (saisir ci-dessous)'}</option>
                    </select>
                  </div>

                  {/* Custom Beneficiary */}
                  {editPerson === 'autre' && (
                    <div className="space-y-1">
                      <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'اسم الشخص المستفيد المستهدف' : 'Nom du bénéficiaire'}</label>
                      <input
                        type="text"
                        required
                        value={editCustomPerson}
                        onChange={(e) => setEditCustomPerson(e.target.value)}
                        placeholder={isRtl ? 'أدخل الاسم هنا...' : 'Entrez le nom...'}
                        className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-xxs font-black uppercase text-gray-400 block">{isRtl ? 'السبب أو تدوين الملاحظة' : 'Motif / Description'}</label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder={isRtl ? 'مثلاً: مقتطعات المالك، أداء فواتير، نقل السلع، إلخ...' : 'Dépenses personnelles, achats logistiques...'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    ></textarea>
                  </div>

                  {/* Save button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>{isRtl ? 'حفظ التعديلات' : 'Enregistrer les modifications'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ========================================================
          VIEW B: PERIODIC STOCK AUDITING (مراقبة عجز الصندوق)
         ======================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-8 animate-fade-in text-slate-800">
          
          {/* General Security metrics */}
          <div className="max-w-xs">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xxs uppercase font-black text-gray-400 tracking-wider">{isRtl ? 'إجمالي فئات وتنوع السلع ' : 'Nombre d\'Articles distincts'}</p>
                <h4 className="text-lg font-black font-mono mt-1 text-slate-800">
                  {products.length} {isRtl ? 'أصناف متنوعة' : 'produits'}
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
                  <span>{isRtl ? 'مطبخ التفتيش ومطابقة المخزن الفعلي للسلع لمراقبة الفروقات والعجز' : 'Salle d\'Audit & Reconcialiation Physique de Stock'}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isRtl 
                    ? 'أدخل الكميات المتوفرة مادياً وقارنها مع قاعدة البيانات لرصد العجز والسرقات فوراً.' 
                    : 'Ajustez les quantités physiques observées sur l\'étagère pour calculer les déficits.'}
                </p>
              </div>

              {/* Force Match Action Button */}
              <button
                type="button"
                onClick={handleForcePerfectMatch}
                className="text-xxs font-black px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-slate-900 border border-gray-200 rounded-xl transition cursor-pointer self-start md:self-auto flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إعادة مطابقة مع النظام' : 'Recopier le stock théorique'}</span>
              </button>
            </div>

            {auditSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p>{isRtl ? 'تم تطبيق تقرير جرد ومطابقة الصندوق بنجاح !' : 'Audit de stock validé avec succès !'}</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                    {isRtl ? 'تمت تسوية وتصفية جميع الفروقات وتعديل المخازن وتوليد الحركات في الأرشيف.' : 'Les stocks ont été adaptés et les mouvements générés.'}
                  </p>
                </div>
              </div>
            )}

            {/* Config metadata of audit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-xxs font-black text-slate-400 uppercase block">{isRtl ? 'وتيرة ونوعية التفتيش الدوري' : 'Fréquence de l\'Audit'}</label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as any)}
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                >
                  <option value="monthly">{isRtl ? 'تفتيش وتعديل شهري دوري للصندوق' : 'Mensuel (Contrôle de Caisse)'}</option>
                  <option value="semiannual">{isRtl ? 'جرد شامل سنوي / نصف سنوي' : 'Semestriel / Annuel Complet'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-black text-slate-400 uppercase block">{isRtl ? 'المفتش القائم بالتدقيق والعد الفعلي' : 'Responsable / Auditeur'}</label>
                <input
                  type="text"
                  value={auditorName}
                  onChange={(e) => setAuditorName(e.target.value)}
                  className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-black text-slate-400 uppercase block">{isRtl ? 'ملاحظة تفتيش شاملة' : 'Rapport & Notes de Clôture'}</label>
                <input
                  type="text"
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder={isRtl ? 'مثال: تم تصفية العجز المالي الناتج عن التخريب...' : 'Ex: Ajustement suite à pertes.'}
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
                    {isRtl ? 'تصنيف ومطابقة المخزون حسب فئة المنتوج' : 'Audit et matching par catégorie de produit'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isRtl 
                      ? 'اختر فئة معينة لتسهيل جرد وتفتيش الرفوف ومكافحة السرقة بشكل منظم جزئي.' 
                      : 'Sélectionnez une catégorie pour filtrer la table de vérification courante.'}
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
                    placeholder={isRtl ? 'البحث بالاسم أو رمز SKU...' : 'Rechercher par nom, SKU...'}
                    className={`w-full py-1.5 ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                  {auditSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAuditSearchQuery('')}
                      className={`absolute ${isRtl ? 'left-2.5' : 'right-2.5'} top-1.5 text-slate-400 hover:text-slate-600 font-bold text-base`}
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={auditCategoryFilter}
                    onChange={(e) => setAuditCategoryFilter(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">{isRtl ? 'جميع فئات المنتجات والسلع' : 'Toutes les catégories'}</option>
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
                {isRtl ? 'مؤشرات جرد وتفتيش الفئات والرفوف (اضغط للاختيار والتصفية)' : 'Progression d\'audit par catégorie (cliquez pour filtrer)'}
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
                          {isRtl ? 'الإجمالي العام' : 'Total Général'}
                        </span>
                        {stats.pct === 100 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className={`text-[9.5px] font-mono font-black shrink-0 ${stats.pct > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{stats.pct}%</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 truncate">
                          {isRtl ? 'كل فئات السلع' : 'Toutes Catégories'}
                        </p>
                        <span className="text-[9px] text-gray-450 font-bold block mt-0.5">
                          {isRtl ? `${stats.counted} من ${stats.total} سلع` : `${stats.counted} sur ${stats.total}`}
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
                          {isRtl ? 'فئة' : 'Cat.'}
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
                          {isRtl ? `${stats.counted} من ${stats.total} سلع` : `${stats.counted} sur ${stats.total}`}
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
                    <h5 className="text-red-900 font-extrabold">{isRtl ? 'تحذير المراقبة المالية: تم رصد فروقات غير متطابقة !' : 'Anomalie de Stock Détectée'}</h5>
                    <p className="text-[10px] text-red-700 font-bold mt-0.5">
                      {isRtl 
                        ? `تم رصد عجز واختلاس كلي بقيمة ${auditAnalysis.deficitQty} وحدات من السلع المفقودة.` 
                        : `Déficit cumulé estimé à ${auditAnalysis.deficitQty} unités perdues.`}
                    </p>
                  </div>
                </div>
                <div className="text-slate-800 self-stretch sm:self-auto bg-white p-2.5 px-4 rounded-xl border border-red-100 text-right">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'الضرر المالي الناتج عن العجز المالي (شراء)' : 'Pertes Coût d\'Achat Restant'}</p>
                  <p className="font-mono text-base font-black text-red-600">
                    -{auditAnalysis.deficitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* Product verification list table */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                    <th className="py-2.5 px-2">{isRtl ? 'المنتج والصنف' : 'Désignation de l\'article'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'سعر الشراء' : 'P. Achat'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'سعر البيع' : 'P. Vente'}</th>
                    <th className="py-2.5 px-2 text-center bg-blue-50/30 text-blue-900 font-black">{isRtl ? 'المسجل بالنظام حالياً' : 'Stock Théorique'}</th>
                    <th className="py-2.5 px-2 text-center bg-emerald-50/30 text-emerald-900 font-black">{isRtl ? 'العدد الفعلي المادي على الرف' : 'Quantité Réelle'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'تصفية الفارق' : 'Écart / Différence'}</th>
                    <th className="py-2.5 px-2 text-right">{isRtl ? 'قيمة الفارق المالي' : 'Impulsion Financière'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'الحالة والمراقبة' : 'Statut'}</th>
                    <th className="py-2.5 px-2 text-center">{isRtl ? 'المطابقة والتدقيق' : 'Vérification'}</th>
                  </tr>
                </thead>
                <tbody className="block md:table-row-group md:divide-y md:divide-gray-50 text-xs font-semibold space-y-3 md:space-y-0 pb-4 md:pb-0">
                  {filteredAuditProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 font-bold">
                        {isRtl ? 'لا توجد سلع أو منتجات مسجلة ضمن هذه الفئة حالياً.' : 'Aucun produit enregistré sous cette catégorie.'}
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
                                  <span>{isRtl ? 'تم حسابه عمداً' : 'Compté'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-bold shrink-0">
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span>{isRtl ? 'معين تلقائياً' : 'Par défaut'}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono font-medium text-slate-500 border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-3">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'سعر الشراء' : 'P. Achat'}</span>
                            <span>{p.buyPrice.toFixed(1)}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono font-medium text-slate-500 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'سعر البيع' : 'P. Vente'}</span>
                            <span>{p.sellPrice.toFixed(1)}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono font-extrabold bg-blue-50/10 text-blue-700 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'المسجل بالنظام حالياً' : 'Stock Théorique'}</span>
                            <span>{expectedValue}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-3 md:py-3 px-2 text-center bg-emerald-50/10 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'العدد الفعلي المادي على الرف' : 'Quantité Réelle'}</span>
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
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'تصفية الفارق' : 'Écart / Différence'}</span>
                            {diffValue === 0 ? (
                              <span className="font-mono font-bold text-gray-300">-</span>
                            ) : (
                              <span className={`font-mono font-black ${diffValue > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {diffValue > 0 ? `+${diffValue}` : diffValue}
                              </span>
                            )}
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-right font-mono font-bold border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'قيمة الفارق المالي' : 'Impulsion Financière'}</span>
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
                                <span>{isRtl ? 'مطابق' : 'Parfait'}</span>
                              </span>
                            ) : diffValue < 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-black">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{isRtl ? 'عجز ⚠️' : 'Anomalie'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-black">
                                <Info className="w-3 h-3" />
                                <span>{isRtl ? 'زائد' : 'Inconnu'}</span>
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
                              <span>{isVerified ? (isRtl ? 'تم التحقق' : 'Vérifié') : (isRtl ? 'تحقق' : 'Vérifier')}</span>
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
                  ? '⚠️ تذكير: عند الضغط على زر الاعتماد، سيقوم النظام بتسوية Stocks تلقائياً وترسيب التقارير.' 
                  : 'Note: La validation ajustera les inventaires et stockera cette session historique.'}
              </p>
              <button
                type="button"
                onClick={handleApplyAudit}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>{isRtl ? 'اعتماد المطابقة تصفية وتحديث المخزن الفعلي' : 'Confirmer & Enregistrer l\'Audit d\'Inventaire'}</span>
              </button>
            </div>

          </div>

          {/* Audit History Room List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {isRtl ? 'أرشيف محاضر التفتيش والجرد المالي للمخازن' : 'Rapports Légaux de l\'Audit d\'Inventaire Périodiques'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {isRtl ? 'محاضر جرد المخازن شهرياً ولتأكيد عدم وجود اختلاس السلع أو تلاعب في الصندوق.' : 'Archivage des sessions de réconciliation physique et de détection de détournements.'}
              </p>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white">
                  <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-gray-400">
                    <th className="py-2 px-2">{isRtl ? 'معرف التفتيش' : 'Session ID'}</th>
                    <th className="py-2 px-2">{isRtl ? 'تاريخ الجرد' : 'Date d\'Audit'}</th>
                    <th className="py-2 px-2">{isRtl ? 'دورية الجرد' : 'Périodicité'}</th>
                    <th className="py-2 px-2">{isRtl ? 'المفتش القائم بالعملية' : 'Audité par'}</th>
                    <th className="py-2 px-2 text-center">{isRtl ? 'مجموع السلع المفقودة' : 'Anomalies'}</th>
                    <th className="py-2 px-2 text-right">{isRtl ? 'قيمة العجز المستكشف' : 'Perte Estimée Cost'}</th>
                    <th className="py-2 px-2">{isRtl ? 'خلاصة التقرير' : 'Synthèse & Certificat'}</th>
                    <th className="py-2 px-2 text-center">{isRtl ? 'التفاصيل' : 'Détails'}</th>
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
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase mr-2 ml-2">{isRtl ? 'معرف التفتيش' : 'Session ID'}:</span>
                        #{audit.id.substring(audit.id.length - 6)}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 font-mono text-[12px] md:text-[11px] text-gray-400 font-extrabold border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-3">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'تاريخ الجرد' : 'Date d\'Audit'}</span>
                        {new Date(audit.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'دورية الجرد' : 'Périodicité'}</span>
                        {audit.type === 'monthly' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-bold text-[10px] uppercase">
                            {isRtl ? 'تفتيش ومطابقة شهرية' : 'Mensuelle'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-bold text-[10px] uppercase">
                            {isRtl ? 'جرد شامل سنوي/نصف سنوي' : 'Semestrielle'}
                          </span>
                        )}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-slate-900 font-extrabold border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'المفتش' : 'Audité par'}</span>
                        {audit.auditor}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-center font-mono border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'مجموع السلع المفقودة' : 'Anomalies'}</span>
                        {audit.totalDeficitQty > 0 ? (
                          <span className="text-amber-600 font-bold">{audit.totalDeficitQty} وحدات</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">{isRtl ? '0 مطابقة تامة' : 'Aucune'}</span>
                        )}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 text-right font-mono font-black text-red-600 border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'قيمة العجز المستكشف' : 'Perte Estimée Cost'}</span>
                        {audit.totalDeficitValue > 0 ? `-${audit.totalDeficitValue.toFixed(1)}` : '0.00'}
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-3 px-2 italic text-[11px] md:text-[10px] text-gray-500 max-w-full md:max-w-[200px] truncate border-t border-dashed border-gray-100 md:border-none" title={audit.notes}>
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'خلاصة التقرير' : 'Synthèse'}</span>
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
                          <span>{isRtl ? 'عرض' : 'Détails'}</span>
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
                  {isRtl ? 'بوابة مراقبة الأرباح ومطابقة إجمالي المعاملات والخصومات' : 'Suivi des Marges Profit, Remises & Chiffre d\'Affaires'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isRtl 
                    ? 'منصة أمان متطورة لربط مبيعات الكاشير بالهوامش الحقيقية المستهدفة ومراجعة تأثير الخصومات المباشرة على الأرباح.' 
                    : 'Aperçu consolidé des ventes, déduction faite de toutes les remises accordées pour l\'audit financier.'}
                </p>
              </div>
            </div>
          </div>

          {/* Filters Bar: Date & Grouping */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* Box 1: Period filter selection */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-3 lg:col-span-2">
              <label className="text-xxs uppercase font-black text-slate-400 tracking-wider block">
                {isRtl ? 'تحديد الفترة الزمنية للبحث' : 'Filtrer la période de vente'}
              </label>
              <div className="grid grid-cols-5 gap-1.5 flex-wrap">
                {(['all', 'today', 'yesterday', 'this_month', 'custom'] as const).map(f => {
                  const label = f === 'all' ? (isRtl ? 'الكل' : 'Tous') :
                                f === 'today' ? (isRtl ? 'اليوم' : 'Aujourd\'hui') :
                                f === 'yesterday' ? (isRtl ? 'البارحة' : 'Hier') :
                                f === 'this_month' ? (isRtl ? 'الشهر الجاري' : 'Ce mois') :
                                (isRtl ? 'مخصص' : 'Perso');
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
                    <label className="text-[9px] text-gray-450 block mb-1 font-bold">{isRtl ? 'من تاريخ' : 'Du'}</label>
                    <input
                      type="date"
                      value={profitStartDate}
                      onChange={(e) => setProfitStartDate(e.target.value)}
                      className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-455 block mb-1 font-bold">{isRtl ? 'إلى تاريخ' : 'Au'}</label>
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
                {isRtl ? 'البحث عن سلعة، فئة، أو فاتورة' : 'Rechercher produit, fac, cat'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profitSearchText}
                  onChange={(e) => setProfitSearchText(e.target.value)}
                  placeholder={isRtl ? 'ابحث هنا...' : 'Ex: Produit, Catégorie ou Facture...'}
                  className="w-full py-2.5 pl-3 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className={`w-4 h-4 text-gray-400 absolute top-3.5 ${isRtl ? 'right-3' : 'left-3'}`} />
              </div>
            </div>

            {/* Box 3: Grouping level options */}
            <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs space-y-3">
              <label className="text-xxs uppercase font-black text-slate-400 tracking-wider block">
                {isRtl ? 'مستوى ترتيب مبيعات الأرباح' : 'Niveau de regroupement des marges'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'none', labelAr: 'تسلسل التواريخ', labelFr: 'Chronologique' },
                  { value: 'product', labelAr: 'حسب السلع', labelFr: 'Par Produit' },
                  { value: 'category', labelAr: 'حسب الفئات', labelFr: 'Par Catégorie' }
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
                    {isRtl ? '💼 معاملات وأرباح النشاط الحسابي' : 'Transactions & Revenu Fiscal'}
                  </span>
                  <div className="space-y-3.5">
                    {/* Brut sales */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'إجمالي المعاملات الخام' : 'Chiffre d\'Affaires Brut'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-800">
                        {totalChiffreAffaireBrut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Discounts applied */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'الخصومات الممنوحة' : 'Total Remises'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-amber-600">
                        {totalDiscountsApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Net turnover */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'صافي رقم المعاملات' : 'Chiffre d\'Affaires Net'}
                      </span>
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {totalChiffreAffaireNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Net Profits */}
                    <div className="flex justify-between items-center bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 mt-2">
                      <span className="text-xs font-black text-emerald-800">
                        {isRtl ? 'صافي أرباح الخزينة' : 'Bénéfice Net Réel'}
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
                    {isRtl ? '🛒 مبيعات وعائدات المحل المباشرة' : 'Ventes du Magasin & Encaissements'}
                  </span>
                  <div className="space-y-3.5">
                    {/* Overall Sales */}
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-700">
                        {isRtl ? '🛍️ إجمالي مبيعات المحل :' : 'Ventes globales du magasin :'}
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900">
                        {totalOverallSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Cash Income received */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 px-1 pt-1">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <span>💵</span> {isRtl ? 'نقد (مقبض نقدي) :' : 'Espèces de caisse :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-emerald-600">
                        {cumulativeCashSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Debts outstanding */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2.5 px-1">
                      <span className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                        <span>💸</span> {isRtl ? 'سلف (ديون العملاء) :' : 'Dettes clients :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-rose-600">
                        {cumulativeDebtSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {/* Client checks (postal checks as guarantee) */}
                    <div className="flex justify-between items-center pb-1 px-1">
                      <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                        <span>📩</span> {isRtl ? 'شيكات الضمان :' : 'Chèques de garantie :'}
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
                    {isRtl ? '📦 مستودع السلع وتقييم المخازن' : 'Valorisation du Stock & Profit Latent'}
                  </span>
                  <div className="space-y-3.5">
                    {/* Purchase/Buying price worth */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'قيمة شراء السلع الكلي' : 'Valeur d\'Achat (Stock) :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-800">
                        {totalStockWorthBuying.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    {/* Estimated Selling worth */}
                    <div className="flex justify-between items-center border-b border-slate-100/50 pb-2.5">
                      <span className="text-xs font-semibold text-slate-600">
                        {isRtl ? 'تقدير بيع السلع المتوقع' : 'Estimation de Vente (Stock) :'}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-slate-800">
                        {totalStockWorthSelling.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </span>
                    </div>
                    {/* Potential Stock Profit / Margin in warehouse */}
                    <div className="flex justify-between items-center bg-indigo-950 text-white p-2.5 rounded-xl shadow-xs mt-2">
                      <span className="text-xs font-bold text-indigo-100">
                        {isRtl ? 'هامش الربح المتوقع' : 'Profit Latent au Stock :'}
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
                    {profitGroupBy === 'none' ? (isRtl ? 'سجل تفصيلي لحساب ومراقبة أرباح السلع والخصومات' : 'Détail des ventes et profits chronologiques') :
                     profitGroupBy === 'product' ? (isRtl ? 'تحليل الأرباح ومبيعات السلع والمنتجات' : 'Marges bénéficiaires regroupées par Produit') :
                     (isRtl ? 'تحليل الأرباح وهوامش الفئات ونوع السلع' : 'Marges bénéficiaires regroupées par Catégorie')}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {isRtl ? 'تقرير دوري لمطابقة هامش الربح وقمع السرقة والتلاعب بالخصومات.' : 'Tracer l\'origine de toutes les marges dégagées par transaction.'}
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
                <span>{isRtl ? 'إعادة ضبط التصفية' : 'Réinitialiser'}</span>
              </button>
            </div>

            {/* View A: Detail Table (Chronological Transactions) */}
            {profitGroupBy === 'none' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right sm:text-right">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-gray-400 whitespace-nowrap">
                      <th className="py-3 px-2 text-right">{isRtl ? 'تاريخ المعاملة' : 'Date de Vente'}</th>
                      <th className="py-3 px-2 text-right">{isRtl ? 'رقم الفاتورة' : 'N° Facture'}</th>
                      <th className="py-3 px-2 text-right">{isRtl ? 'المنتوج المباع' : 'Produit'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'فئة السلعة' : 'Catégorie'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'الكمية المباعة' : 'Quantité'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'شراء فردي' : 'Achat Unitaire'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'بيع فردي' : 'Vente Unitaire'}</th>
                      <th className="py-3 px-2 text-center">{isRtl ? 'صافي الربح الفعلي' : 'Marge Net'}</th>
                      <th className="py-3 px-3 text-center bg-amber-50/20 text-amber-800">{isRtl ? 'الخصم التناسبي' : 'Remise Prop.'}</th>
                      <th className="py-3 px-3 text-right text-slate-850">{isRtl ? 'صافي المقبوضات' : 'Revenu net'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-slate-750">
                    {soldItemsList.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 text-xs font-bold">
                          {isRtl ? 'لم تسجل أي عمليات بيع أو مبيعات بعد مطابقة لفلاتر التصفية.' : 'Aucun produit vendu correspondant.'}
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
                              {item.qty} {isRtl ? 'وحدات' : 'U'}
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
                                    ({isRtl ? 'الخام' : 'Brut'}: +{item.rawProfit.toFixed(1)})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-extrabold text-amber-600 bg-amber-50/10">
                              {item.proportionalDiscount > 0 ? (
                                <span title={isRtl ? 'حصة الخصم التناسبية' : 'Part Remise'}>
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
                <table className="w-full text-right sm:text-right">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-gray-400 whitespace-nowrap">
                      <th className="py-3 px-3 text-right">{isRtl ? 'المنتوج والسلعة' : 'Produit'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'الفئة المرجعية' : 'Catégorie'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'إجمالي الكميات المباعة' : 'Quantité Cumulée'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'إجمالي تكلفة الشراء' : 'Coût global d\'achat'}</th>
                      <th className="py-3 px-3 text-center">{isRtl ? 'صافي المبيعات' : 'Revenu net'}</th>
                      <th className="py-3 px-3 text-right">{isRtl ? 'صافي الربح التراكمي' : 'Marge Nette Cumulée'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-slate-700">
                    {groupedByProduct.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-bold">
                          {isRtl ? 'لا توجد بيانات متاحة للمنتجات تحت التصفية المحددة.' : 'Aucune donnée correspondante.'}
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
                            {pGroup.totalQty} {isRtl ? 'وحدة' : 'U'}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-gray-400">{pGroup.totalBuyCost.toFixed(2)}</td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-slate-600 font-bold">{pGroup.totalSellRevenue.toFixed(2)}</span>
                              {pGroup.totalDiscount > 0 && (
                                <span className="text-[10px] text-amber-600 font-semibold font-mono">
                                  (-{pGroup.totalDiscount.toFixed(2)} {isRtl ? 'خصم' : 'Remise'})
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
                <table className="w-full text-right sm:text-right">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-gray-400 whitespace-nowrap">
                      <th className="py-3 px-4 text-right">{isRtl ? 'الفئة المستهدفة' : 'Catégorie'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'عدد السلع المختلفة المباعة' : 'Produits distincts'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'إجمالي القطع الموزعة' : 'Quantité totale cumulée'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'إجمالي كلفة المقتنيات' : 'Coût d\'acquisition total'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'صافي الإيرادات' : 'Revenu net total'}</th>
                      <th className="py-3 px-4 text-right">{isRtl ? 'صافي ربح الفئة ونسبته' : 'Profil net dégagé'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs font-semibold text-slate-700">
                    {groupedByCategory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-bold">
                          {isRtl ? 'لا توجد مبيعات مسجلة لأي فئة تحت فلاتر الفرز الحالية.' : 'aucune vente par catégorie enregistrée.'}
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
                              {cGroup.totalProductsCount} {isRtl ? 'سلع مختلفة' : 'produits'}
                            </td>
                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                              {cGroup.totalQty} {isRtl ? 'قطعة' : 'Pcs'}
                            </td>
                            <td className="py-4 px-4 text-center font-mono text-gray-400">{cGroup.totalBuyCost.toFixed(2)}</td>
                            <td className="py-4 px-4 text-center font-mono">
                              <div className="flex flex-col items-center flex-wrap">
                                <span className="font-mono text-slate-600 font-bold">{cGroup.totalSellRevenue.toFixed(2)}</span>
                                {cGroup.totalDiscount > 0 && (
                                  <span className="text-[10px] text-amber-600 font-bold font-mono">
                                    (-{cGroup.totalDiscount.toFixed(2)} {isRtl ? 'خصم' : 'Remise'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right font-mono bg-emerald-50/5">
                              <div className="flex flex-col items-end">
                                <span className={cGroup.totalProfit >= 0 ? "font-black text-emerald-600" : "font-black text-rose-600"}>
                                  {cGroup.totalProfit >= 0 ? '+' : ''}{cGroup.totalProfit.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-emerald-500 font-bold">({marginPercent}% {isRtl ? 'عائد' : 'marge'})</span>
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
                    {isRtl ? 'اعتماد ومطابقة المخزون الفعلي' : 'Validation & Alignement de l\'Inventaire'}
                  </h3>
                  <p className="text-xxs font-bold text-gray-400 mt-0.5">
                    {isRtl ? 'يرجى مراجعة وتأكيد الفروقات المسجلة قبل الترسيب وتحديث قواعد البيانات' : 'Veuillez vérifier les écarts avant alignement de la base.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Scrollable discrepancies list representing updates */}
            <div className="p-6 overflow-y-auto space-y-4">
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                {isRtl 
                  ? 'هل أنت متأكد من اعتماد تقرير التفتيش وتحديث المخزون الفعلي؟ سيقوم النظام بتسوية Stocks تلقائياً وستسجل هذه الدورة باسمك بشكل دائم.' 
                  : 'Êtes-vous sûr de vouloir valider le rapport d\'inspection ? Cela va rectifier les stocks théoriques.'}
              </p>

              {/* Stats card inside summary */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase block">{isRtl ? 'إجمالي العجز المالي' : 'Dépenses Déficit total'}</span>
                  <span className="text-sm font-black text-red-600 font-mono mt-0.5 block">
                    -{auditAnalysis.deficitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center border-r sm:border-slate-200 border-none">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase block">{isRtl ? 'المسؤول القائم بالعد' : 'Auditeur Responsable'}</span>
                  <span className="text-xs font-bold text-slate-800 truncate mt-0.5 block">
                    {auditorName}
                  </span>
                </div>
              </div>

              {/* Table of adjustments */}
              <div className="space-y-1.5">
                <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">
                  {isRtl ? 'تفاصيل السلع والفروقات المراد تسويتها تصفية الفارق:' : 'Détails des articles qui vont être modifiés :'}
                </span>
                
                {auditAnalysis.items.filter(item => item.diff !== 0).length === 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-center text-xs font-black border border-emerald-100 animate-pulse">
                    {isRtl ? '🎉 ممتاز: لا توجد أي فروقات مادية! مطابقة تامة 100% لجميع السلع على الرفوف.' : 'Excellent : aucun écart constaté.'}
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
                                <span className="text-[9px] text-gray-400 uppercase block">{isRtl ? 'الفرق' : 'Écart'}</span>
                                <span className={`font-mono font-black ${isDeficit ? 'text-red-600' : 'text-blue-600'}`}>
                                  {item.diff > 0 ? `+${item.diff}` : item.diff}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] text-gray-400 uppercase block">{isRtl ? 'من ➔ إلى' : 'Avant -> Après'}</span>
                                <span className="font-mono font-bold text-slate-600">
                                  {item.expected} ➔ {item.actual}
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
                {isRtl ? 'إلغاء التراجع' : 'Annuler'}
              </button>

              <button
                type="button"
                onClick={executeApplyAudit}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>{isRtl ? 'نعم، اعتمد المطابقة وتحديث المخزن' : 'Oui, Confirmer & Rectifier le Stock'}</span>
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
                    {isRtl ? 'تفاصيل محضر التفتيش والجرد المالي للمخازن' : 'Détails du Rapport d\'Inspection d\'Inventaire'}
                  </h3>
                  <p className="text-xxs font-bold text-gray-400 mt-0.5">
                    {isRtl ? `مستند تدقيق رسمي رقم: #${selectedAudit.id.substring(selectedAudit.id.length - 8)}` : `Détail du document d'audit officiel #${selectedAudit.id}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Scrollable details list */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Stats & Metadata Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Stat block 1 */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                    {isRtl ? 'معلومات المسؤول والتحقق' : 'Détails de l\'Auditeur'}
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'القائم بالعملية:' : 'Responsable:'}</span>
                      <span className="text-slate-900 font-extrabold">{selectedAudit.auditor}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'نوع الجرد:' : 'Type d\'Audit:'}</span>
                      <span className="text-indigo-600 font-bold">
                        {selectedAudit.type === 'monthly' 
                          ? (isRtl ? 'تفتيش ومطابقة شهرية' : 'Mensuel') 
                          : (isRtl ? 'جرد شامل سنوي' : 'Semestriel')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat block 2 */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">
                    {isRtl ? 'رمز وتاريخ المحضر' : 'Date d\'Inspection'}
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'التاريخ واليوم:' : 'Date d\'audit:'}</span>
                      <span className="text-slate-750 font-mono font-bold">
                        {new Date(selectedAudit.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-gray-400">{isRtl ? 'التوقيت:' : 'Heure:'}</span>
                      <span className="text-slate-700 font-mono">
                        {new Date(selectedAudit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stat block 3 */}
                <div className="p-4 bg-red-50/45 border border-red-100/50 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] text-red-500 font-extrabold uppercase tracking-wider block">
                    {isRtl ? 'النتائج والفروقات المالية' : 'Impact Financier & Pertes'}
                  </span>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-red-750">{isRtl ? 'السلع المفقودة:' : 'Articles Perdus:'}</span>
                      <span className="text-red-700 font-mono font-black">{selectedAudit.totalDeficitQty} {isRtl ? 'وحدات' : 'unités'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-red-650">{isRtl ? 'إجمالي العجز:' : 'Déficit total:'}</span>
                      <span className="text-red-600 font-mono font-black">-{selectedAudit.totalDeficitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                
              </div>

              {/* Notes block */}
              <div className="p-4 bg-amber-50/40 border border-amber-150 rounded-2xl">
                <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider block mb-1">
                  {isRtl ? 'ملاحظات وتوصية تقرير التفتيش المالي:' : 'Observations de l\'inspecteur :'}
                </span>
                <p className="text-xs font-extrabold text-slate-800 leading-relaxed italic">
                  "{selectedAudit.notes}"
                </p>
              </div>

              {/* Grid or Table representing discrepancies items alignment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xxs font-black text-slate-400 uppercase tracking-wider block">
                    {isRtl ? 'قائمة الفروقات والتسويات التفصيلية بالمنتجات:' : 'Ajustements détaillés des produits affectés :'}
                  </span>
                  <span className="text-xxs font-bold text-gray-400">
                    {(selectedAudit.items ? selectedAudit.items.length : 0)} {isRtl ? 'تعديلات مصجلة' : 'modifications'}
                  </span>
                </div>

                {!selectedAudit.items || selectedAudit.items.length === 0 ? (
                  <div className="p-8 bg-emerald-55 bg-emerald-50 text-emerald-800 rounded-3xl text-center text-xs font-black border border-emerald-100/50">
                    {isRtl ? '🎉 مطابقة تامة 100%! لا توجد أي فروقات مادية مسجلة في هذا الجرد.' : 'Excellence : aucun écart constaté sur cette période.'}
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-80 overflow-y-auto shadow-sm">
                    <table className="w-full text-xs font-semibold">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-right">{isRtl ? 'المنتجات التي بها زيادة أو نقصان' : 'Articles affectés'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'حالة المخزون' : 'Statut d\'Écart'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'الكمية التي كانت بالمخزون' : 'Quantité attendue'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'الكمية التي بالرف الفعلي' : 'Quantité sur Rayon'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'كمية الزيادة أو النقصان' : 'Quantité variation'}</th>
                          <th className="py-2.5 px-3 text-center">{isRtl ? 'سعر الشراء' : 'Prix d\'Achat'}</th>
                          <th className="py-2.5 px-3 text-left">{isRtl ? 'الخسائر / الأثر المالي' : 'Pertes / Impact'}</th>
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
                                    {isRtl ? 'نقصان / عجز 📉' : 'Déficit (Baisse)'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-emerald-55 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black border border-emerald-100">
                                    {isRtl ? 'زيادة / فائض 📈' : 'Excédent (Hausse)'}
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
                                    -{Math.abs(financialEffect).toFixed(2)} ({isRtl ? 'خسارة' : 'Perte'})
                                  </span>
                                ) : (
                                  <span className="text-emerald-650 bg-emerald-50/50 p-1 px-2 rounded border border-emerald-100">
                                    +{financialEffect.toFixed(2)} ({isRtl ? 'أرباح تسوية' : 'Gain'})
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
                {isRtl ? 'إغلاق ومتابعة' : 'Fermer'}
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
                    {isRtl ? 'تعديل وتصحيح الحساب المالي' : 'Correction du Solde Financier'}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                    {editingField === 'cash_income' && (isRtl ? 'تعديل "المداخيل النقدية التراكمية"' : 'Ajustement des entrées de caisse')}
                    {editingField === 'withdrawals' && (isRtl ? 'تعديل "مجموع السحوبات ومقتطعات المالك"' : 'Ajustement des prélèvements')}
                    {editingField === 'drawer_balance' && (isRtl ? 'تعديل "رصيد الصندوق الحالي"' : 'Ajustement du solde du coffre')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="p-1 px-2.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAdjustment}>
              <div className="p-5 space-y-4">
                
                {/* Information Callout */}
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[10px] text-blue-800 leading-relaxed font-bold">
                  <p>
                    {isRtl 
                      ? '💡 يقوم هذا التعديل بحفظ قيمة إجمالية مخصصة للرصيد المالي. سيتم تسجيل هذا التعديل في جدول المستجدات التاريخية فوراً وبكل التفاصيل للشفافية.' 
                      : "L'exercice d'ajustement manuel enregistre un écart de trésorerie. L'activité sera consignée pour un audit transparent."}
                  </p>
                </div>

                {/* Input Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
                      {isRtl ? 'القيمة الإجمالية المراد اعتمادها  :' : 'Nouveau Montant Cible  :'}
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
                      {isRtl ? 'السبب أو تبرير التعديل الحسابي (إلزامي) :' : 'Motif ou explication de l\'ajustement (requis) :'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition resize-none"
                      placeholder={isRtl ? 'مثلاً: مراجعة المداخيل، تصحيح فروقات الصرف المباشر الصباحي...' : 'Ex: Correction des écarts de caisse de la journée...'}
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
                  {isRtl ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-slate-900 hover:bg-slate-850 text-white rounded-xl shadow-md font-black transition cursor-pointer"
                >
                  {isRtl ? 'اعتماد وحفظ' : 'Valider & Enregistrer'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
