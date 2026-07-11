import React from 'react';
import { Client, User, PostalCheck, Invoice } from '../types';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Mail, 
  Phone, 
  MapPin, 
  History, 
  X,
  Sparkles,
  ShoppingBag,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ClientsListProps {
  clients: Client[];
  invoices?: Invoice[];
  lang: 'fr' | 'ar';
  onAddClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  prefilledSearch?: string;
  currentUser?: User;
}

export default function ClientsList({ 
  clients, 
  invoices = [],
  lang, 
  onAddClient, 
  onEditClient, 
  onDeleteClient,
  prefilledSearch = '',
  currentUser
}: ClientsListProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  // States
  const [searchTerm, setSearchTerm] = React.useState(prefilledSearch);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<'default' | 'debt_desc' | 'debt_asc' | 'debt_date_desc' | 'debt_date_asc' | 'debt_duedate_asc' | 'spent_desc' | 'check_expiry' | 'check_amount_desc'>('default');

  // Helper to obtain a unique chronological index for each customer
  const getSequentialNumber = React.useCallback((client: Client) => {
    const sorted = [...clients].sort((a, b) => {
      if (a.joinDate !== b.joinDate) {
        return a.joinDate.localeCompare(b.joinDate);
      }
      return a.id.localeCompare(b.id);
    });
    const index = sorted.findIndex(c => c.id === client.id);
    return index !== -1 ? index + 1 : 1;
  }, [clients]);

  React.useEffect(() => {
    if (prefilledSearch !== undefined) {
      setSearchTerm(prefilledSearch);
    }
  }, [prefilledSearch]);

  // Date helper for YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };
  const todayStr = getTodayDateString();

  const getCheckStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: '', className: '' };
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    exp.setHours(0,0,0,0);
    const diff = exp.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
      return { 
        label: isRtl ? `منتهي` : `Expiré`, 
        className: 'bg-rose-50 text-rose-700 border-rose-200' 
      };
    } else if (days <= 5) {
      return { 
        label: isRtl ? `قريب` : `Proche`, 
        className: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' 
      };
    } else {
      return { 
        label: isRtl ? `ساري` : `Valide`, 
        className: 'bg-indigo-50 text-indigo-700 border-indigo-150' 
      };
    }
  };

  // Form states (Modal)
  const [isOpenModal, setIsOpenModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [formName, setFormName] = React.useState('');
  const [formPhone, setFormPhone] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formAddress, setFormAddress] = React.useState('');
  const [formOutstandingDebt, setFormOutstandingDebt] = React.useState<number>(0);
  const [formDebtDate, setFormDebtDate] = React.useState<string>(todayStr);
  const [formDebtDueDate, setFormDebtDueDate] = React.useState<string>('');
  
  // Postal Check Form States
  const [formHasPostalCheck, setFormHasPostalCheck] = React.useState<boolean>(false);
  const [formPostalChecks, setFormPostalChecks] = React.useState<PostalCheck[]>([]);
  // Temp inputs for adding a new check inside modal
  const [tempAmount, setTempAmount] = React.useState<string>('');
  const [tempEntryDate, setTempEntryDate] = React.useState<string>(todayStr);
  const [tempExpiryDate, setTempExpiryDate] = React.useState<string>(todayStr);

  // Period filters for purchase calculation
  const [purchaseDateFrom, setPurchaseDateFrom] = React.useState('');
  const [purchaseDateTo, setPurchaseDateTo] = React.useState('');
  const [showOnlyDebtInvoices, setShowOnlyDebtInvoices] = React.useState(true);
  const [isMaximized, setIsMaximized] = React.useState(true);
  const [expandedDebtPaymentId, setExpandedDebtPaymentId] = React.useState<string | null>(null);

  // Confirmation modal state for client deletion
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null);

  // Debt settlement states
  const [isOpenSettleModal, setIsOpenSettleModal] = React.useState(false);
  const [settlementAmount, setSettlementAmount] = React.useState(0);
  const [settlementNote, setSettlementNote] = React.useState('');
  const [settlementMethod, setSettlementMethod] = React.useState<'cash' | 'card' | 'transfer' | 'check'>('cash');
  const [historyPage, setHistoryPage] = React.useState(1);
  const [sortAscending, setSortAscending] = React.useState(true);

  React.useEffect(() => {
    setHistoryPage(1);
  }, [selectedClient, purchaseDateFrom, purchaseDateTo, showOnlyDebtInvoices]);

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const currentDebt = selectedClient.outstandingDebt || 0;
    if (settlementAmount <= 0) {
      alert(isRtl ? 'المبلغ يجب أن يكون أكبر من 0.' : 'Le montant doit être supérieur à 0.');
      return;
    }
    if (settlementAmount > currentDebt) {
      alert(isRtl 
        ? 'خطأ: مبلغ التسديد أكبر من الدين المترتب على الزبون !' 
        : 'Erreur: Le montant dépasse la dette restante !'
      );
      return;
    }

    const newPayment = {
      id: `dp-${Date.now()}`,
      date: new Date().toISOString(),
      amount: settlementAmount,
      paymentMethod: settlementMethod,
      notes: settlementNote || (isRtl ? 'تسديد دفعة من الحساب' : 'Repaiement partiel/Intégral de dette'),
      operator: 'Caisse POS'
    };

    const finalDebt = Math.max(0, currentDebt - settlementAmount);
    const updatedClient: Client = {
      ...selectedClient,
      outstandingDebt: finalDebt,
      debtDate: finalDebt > 0 ? selectedClient.debtDate : undefined,
      debtDueDate: finalDebt > 0 ? selectedClient.debtDueDate : undefined,
      debtPayments: [...(selectedClient.debtPayments || []), newPayment]
    };

    onEditClient(updatedClient);
    setSelectedClient(updatedClient);
    setIsOpenSettleModal(false);
    setSettlementAmount(0);
    setSettlementNote('');
  };

  const handleAddCheck = () => {
    const amt = parseFloat(tempAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(isRtl ? '⚠️ يرجى إدخال مبلغ صحيح للشيك!' : '⚠️ Veuillez entrer un montant de chèque valide !');
      return;
    }
    if (!tempExpiryDate) {
      alert(isRtl ? '⚠️ تاريخ نهاية الصلاحية ضروري!' : "⚠️ L'échéance est obligatoire !");
      return;
    }

    const newCheck: PostalCheck = {
      id: `chk-${Date.now()}`,
      amount: amt,
      entryDate: tempEntryDate || todayStr,
      expiryDate: tempExpiryDate
    };

    setFormPostalChecks(prev => [...prev, newCheck]);
    setTempAmount('');
  };

  const handleRemoveCheck = (id: string) => {
    setFormPostalChecks(prev => prev.filter(chk => chk.id !== id));
  };

  const handleEditClick = (c: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent opening details
    setEditingId(c.id);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormAddress(c.address);
    setFormOutstandingDebt(c.outstandingDebt || 0);
    setFormDebtDate(c.debtDate || todayStr);
    setFormDebtDueDate(c.debtDueDate || '');
    setFormHasPostalCheck(c.hasPostalCheck || (c.postalChecks && c.postalChecks.length > 0) || false);
    setFormPostalChecks(c.postalChecks || []);
    setTempAmount('');
    setTempEntryDate(todayStr);
    setTempExpiryDate(todayStr);
    setIsOpenModal(true);
  };

  const handleCreateNewClick = () => {
    setEditingId(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormOutstandingDebt(0);
    setFormDebtDate(todayStr);
    setFormDebtDueDate('');
    setFormHasPostalCheck(false);
    setFormPostalChecks([]);
    setTempAmount('');
    setTempEntryDate(todayStr);
    setTempExpiryDate(todayStr);
    setIsOpenModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      alert(isRtl ? 'اسم الزبون حقل ضروري.' : 'Le nom complet est obligatoire.');
      return;
    }

    const isDuplicate = clients.some(c => c.name.trim().toLowerCase() === formName.trim().toLowerCase() && c.id !== editingId);
    if (isDuplicate) {
      alert(isRtl ? 'هذا الزبون مسجل مسبقاً بنفس الاسم!' : 'Ce client est déjà enregistré avec ce nom !');
      return;
    }

    const matchedClient = clients.find(c => c.id === editingId);

    const payload: Client = {
      id: editingId || `cli-${Date.now()}`,
      name: formName,
      email: formEmail.trim(),
      phone: formPhone,
      address: formAddress || (isRtl ? 'العنوان غير محدد' : 'Adresse non spécifiée'),
      joinDate: matchedClient?.joinDate || new Date().toISOString().split('T')[0],
      totalSpent: matchedClient?.totalSpent || 0,
      purchases: matchedClient?.purchases || [],
      outstandingDebt: formOutstandingDebt,
      debtDate: formOutstandingDebt > 0 ? formDebtDate : undefined,
      debtDueDate: formOutstandingDebt > 0 ? formDebtDueDate : undefined,
      debtPayments: matchedClient?.debtPayments || [],
      hasPostalCheck: formHasPostalCheck && formPostalChecks.length > 0,
      postalChecks: formHasPostalCheck ? formPostalChecks : []
    };

    if (editingId) {
      onEditClient(payload);
      if (selectedClient && selectedClient.id === editingId) {
        setSelectedClient(payload);
      }
    } else {
      onAddClient(payload);
    }
    setIsOpenModal(false);
  };

  // Search Filter & Sort
  const filteredClients = React.useMemo(() => {
    const list = clients.filter(c => {
      const nameMatch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const phoneMatch = (c.phone || '').includes(searchTerm);
      const addressMatch = (c.address || '').toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || phoneMatch || addressMatch;
    });

    if (sortBy === 'debt_desc') {
      return [...list].sort((a, b) => (b.outstandingDebt || 0) - (a.outstandingDebt || 0));
    }
    if (sortBy === 'debt_asc') {
      return [...list].sort((a, b) => (a.outstandingDebt || 0) - (b.outstandingDebt || 0));
    }
    if (sortBy === 'debt_date_desc') {
      return [...list].sort((a, b) => {
        const da = a.outstandingDebt && a.outstandingDebt > 0 ? (a.debtDate || a.joinDate || '') : '';
        const db = b.outstandingDebt && b.outstandingDebt > 0 ? (b.debtDate || b.joinDate || '') : '';
        return db.localeCompare(da);
      });
    }
    if (sortBy === 'debt_date_asc') {
      return [...list].sort((a, b) => {
        const da = a.outstandingDebt && a.outstandingDebt > 0 ? (a.debtDate || a.joinDate || '') : '9999-12-31';
        const db = b.outstandingDebt && b.outstandingDebt > 0 ? (b.debtDate || b.joinDate || '') : '9999-12-31';
        return da.localeCompare(db);
      });
    }
    if (sortBy === 'debt_duedate_asc') {
      return [...list].sort((a, b) => {
        const aHas = (a.outstandingDebt && a.outstandingDebt > 0 && a.debtDueDate) ? 1 : 0;
        const bHas = (b.outstandingDebt && b.outstandingDebt > 0 && b.debtDueDate) ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        if (aHas && bHas) {
          return (a.debtDueDate || '').localeCompare(b.debtDueDate || '');
        }
        return 0;
      });
    }
    if (sortBy === 'spent_desc') {
      return [...list].sort((a, b) => b.totalSpent - a.totalSpent);
    }
    if (sortBy === 'check_expiry') {
      return [...list].sort((a, b) => {
        const aHas = (a.postalChecks && a.postalChecks.length > 0) ? 1 : 0;
        const bHas = (b.postalChecks && b.postalChecks.length > 0) ? 1 : 0;
        if (bHas !== aHas) {
          return bHas - aHas;
        }
        if (aHas && bHas) {
          const getEarliestExpiry = (client: Client) => {
            if (!client.postalChecks || client.postalChecks.length === 0) return '9999-12-31';
            const dates = client.postalChecks.map(ch => ch.expiryDate).filter(Boolean);
            if (dates.length === 0) return '9999-12-31';
            return dates.reduce((earliest, cur) => cur < earliest ? cur : earliest, '9999-12-31');
          };
          const dateA = getEarliestExpiry(a);
          const dateB = getEarliestExpiry(b);
          return dateA.localeCompare(dateB);
        }
        return 0;
      });
    }
    if (sortBy === 'check_amount_desc') {
      return [...list].sort((a, b) => {
        const aHas = (a.postalChecks && a.postalChecks.length > 0) ? 1 : 0;
        const bHas = (b.postalChecks && b.postalChecks.length > 0) ? 1 : 0;
        if (bHas !== aHas) {
          return bHas - aHas;
        }
        const aSum = a.postalChecks?.reduce((s, x) => s + (x.amount || 0), 0) || 0;
        const bSum = b.postalChecks?.reduce((s, x) => s + (x.amount || 0), 0) || 0;
        return bSum - aSum;
      });
    }
    return list;
  }, [clients, searchTerm, sortBy]);

  // Calculation of total spent and list of purchases inside a selected period for a single customer
  const clientPurchasesInPeriod = React.useMemo(() => {
    if (!selectedClient) return [];
    return (selectedClient.purchases || []).filter((p) => {
      const pDate = p.date.split('T')[0]; 
      if (purchaseDateFrom && pDate < purchaseDateFrom) return false;
      if (purchaseDateTo && pDate > purchaseDateTo) return false;
      if (showOnlyDebtInvoices) {
        const invoice = invoices.find(inv => inv.id === p.invoiceId || inv.invoiceNumber === p.invoiceId);
        if (!invoice || !invoice.amountDue || invoice.amountDue <= 0) return false;
      }
      return true;
    });
  }, [selectedClient, purchaseDateFrom, purchaseDateTo, showOnlyDebtInvoices, invoices]);

  const clientTotalSpentInPeriod = React.useMemo(() => {
    return clientPurchasesInPeriod.reduce((sum, p) => sum + p.total, 0);
  }, [clientPurchasesInPeriod]);

  const combinedHistory = React.useMemo(() => {
    if (!selectedClient) return [];
    
    // 1. Build full history to calculate running debt correctly
    const allPurchases = (selectedClient.purchases || []).map(p => {
      const inv = invoices.find(i => i.id === p.invoiceId || i.invoiceNumber === p.invoiceId);
      return {
        type: 'purchase' as const,
        date: inv?.date || p.date,
        data: p
      };
    });
    
    const allPayments = (selectedClient.debtPayments || []).map(pay => ({
      type: 'payment' as const,
      date: pay.date,
      data: pay
    }));
    
    const fullHistory = [...allPurchases, ...allPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentDebt = 0;
    const historyWithDebt = fullHistory.map(item => {
      if (item.type === 'purchase') {
        const p = item.data;
        const invoice = invoices.find(inv => inv.id === p.invoiceId || inv.invoiceNumber === p.invoiceId);
        if (invoice && invoice.amountDue && invoice.amountDue > 0) {
          currentDebt += invoice.amountDue;
        }
      } else if (item.type === 'payment') {
        const pay = item.data;
        currentDebt -= pay.amount;
      }
      return { ...item, runningDebt: currentDebt };
    });
    
    // 2. Filter based on current filters
    return historyWithDebt.filter(item => {
      const iDate = item.date.split('T')[0];
      if (purchaseDateFrom && iDate < purchaseDateFrom) return false;
      if (purchaseDateTo && iDate > purchaseDateTo) return false;
      
      if (item.type === 'purchase') {
        if (showOnlyDebtInvoices) {
          const p = item.data;
          const invoice = invoices.find(inv => inv.id === p.invoiceId || inv.invoiceNumber === p.invoiceId);
          if (!invoice || !invoice.amountDue || invoice.amountDue <= 0) return false;
        }
      }
      
      return true;
    });
  }, [selectedClient, invoices, purchaseDateFrom, purchaseDateTo, showOnlyDebtInvoices]);

  // Check alerts computation for Client list (within 2 days or past)
  const checkAlerts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const alerts: Array<{
      client: Client;
      check: PostalCheck;
      daysLeft: number;
      isExpired: boolean;
      isExpiringSoon: boolean;
    }> = [];

    clients.forEach(c => {
      if (c.postalChecks && c.postalChecks.length > 0) {
        c.postalChecks.forEach(check => {
          if (check.expiryDate) {
            const expDate = new Date(check.expiryDate);
            expDate.setHours(0,0,0,0);
            
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const isExpired = diffDays <= 0;
            const isExpiringSoon = diffDays > 0 && diffDays <= 2; // Warn exactly 2 days prior
            
            if (isExpired || isExpiringSoon) {
              alerts.push({
                client: c,
                check,
                daysLeft: diffDays,
                isExpired,
                isExpiringSoon
              });
            }
          }
        });
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients]);

  // Debt Due Date alerts computation for Client list (within 2 days or past)
  const debtAlerts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const alerts: Array<{
      client: Client;
      daysLeft: number;
      isExpired: boolean;
      isExpiringSoon: boolean;
    }> = [];

    clients.forEach(c => {
      if (c.outstandingDebt && c.outstandingDebt > 0 && c.debtDueDate) {
        const dueDate = new Date(c.debtDueDate);
        dueDate.setHours(0,0,0,0);
        
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const isExpired = diffDays <= 0;
        const isExpiringSoon = diffDays > 0 && diffDays <= 2; // Warn 2 days prior
        
        if (isExpired || isExpiringSoon) {
          alerts.push({
            client: c,
            daysLeft: diffDays,
            isExpired,
            isExpiringSoon
          });
        }
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Alert Banner for Expired/Expiring Postal Checks or Debt Collection dates within 2 days or past */}
      {(checkAlerts.length > 0 || debtAlerts.length > 0) && (
        <div className="col-span-12 bg-amber-50/80 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-5 animate-fade-in no-print">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-600 animate-bounce shrink-0" />
            <div>
              <h4 className="text-sm font-black text-amber-955 leading-none">
                {isRtl ? 'بوابة التنبيهات العاجلة (شيكات ومستحقات متبقية خلال يومين أو أقل)' : 'Portail des alertes urgentes (Chèques & Dettes ≤ 2 jours)'}
              </h4>
              <p className="text-xs text-amber-700/90 mt-1 font-bold">
                {isRtl 
                  ? 'يرجى متابعة الزبناء المعنيين لتفادي تراكم المستحقات وضمان استلام المبالغ بالشيكات أو الديون المفتوحة.'
                  : 'Veuillez faire le suivi avec ces clients pour encaisser les chèques ou les créances proches.'
                }
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            
            {/* Column 1: Postal Checks Expiry Alerts (within 2 days or past) */}
            <div className="space-y-2.5">
              <h5 className="text-xs font-black text-amber-900 border-b border-amber-200/60 pb-1.5 flex items-center gap-1.5">
                <span>✉️</span> {isRtl ? 'شيكات ضمان مستحقة الصرف أو منتهية الصلاحية :' : 'Garanties chèques urgentes :'}
                <span className="bg-amber-650 text-white font-mono px-2 py-0.5 rounded-md text-[10px]">
                  {checkAlerts.length}
                </span>
              </h5>
              
              {checkAlerts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {checkAlerts.map(({ client, check, daysLeft, isExpired }) => (
                    <div 
                      key={check.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group bg-white shadow-xxs ${
                        selectedClient && selectedClient.id === client.id ? 'border-amber-400 ring-2 ring-amber-150' : 'border-amber-100/60 hover:border-amber-300'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-black text-gray-950 group-hover:text-amber-855 transition truncate">{client.name}</p>
                        <p className="text-[10px] text-amber-700 font-extrabold font-mono">
                          {check.amount?.toFixed(2)} DH
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isExpired ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 border border-rose-155 text-[8.5px] font-black text-rose-700 uppercase animate-pulse">
                            {isRtl ? 'منتهي ⚠️' : 'Expiré ⚠️'}
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-[8.5px] font-black text-amber-800">
                            {isRtl ? `خلال ${daysLeft} يوم` : `Dans ${daysLeft} j`}
                          </span>
                        )}
                        <p className="text-[8.5px] text-gray-400 font-bold mt-1 font-mono">{check.expiryDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-amber-750 font-bold bg-amber-100/30 p-2.5 rounded-xl border border-dashed border-amber-250 text-center">
                  {isRtl ? '✖ لا توجد أي شيكات في حالة استعجال حالياً.' : 'Aucun chèque échu pour le moment.'}
                </p>
              )}
            </div>

            {/* Column 2: Outstanding Debts Due Alerts (within 2 days or past) */}
            <div className="space-y-2.5">
              <h5 className="text-xs font-black text-amber-900 border-b border-amber-200/60 pb-1.5 flex items-center gap-1.5">
                <span>⏰</span> {isRtl ? 'ديون مستحقة ومجدولة للتحصيل العاجل :' : 'Créances de dettes planifiées :'}
                <span className="bg-amber-650 text-white font-mono px-2 py-0.5 rounded-md text-[10px]">
                  {debtAlerts.length}
                </span>
              </h5>
              
              {debtAlerts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {debtAlerts.map(({ client, daysLeft, isExpired }) => (
                    <div 
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group bg-white shadow-xxs ${
                        selectedClient && selectedClient.id === client.id ? 'border-amber-400 ring-2 ring-amber-150' : 'border-amber-100/60 hover:border-amber-300'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-black text-gray-950 group-hover:text-amber-855 transition truncate">{client.name}</p>
                        <p className="text-[10px] text-rose-700 font-extrabold font-mono">
                          {client.outstandingDebt?.toFixed(2)} DH
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isExpired ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 border border-rose-155 text-[8.5px] font-black text-rose-700 uppercase animate-pulse">
                            {isRtl ? 'مستحق ⚠️' : 'Échu ⚠️'}
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-150 border border-amber-250 text-[8.5px] font-black text-amber-900">
                            {isRtl ? `خلال ${daysLeft} يوم` : `Dans ${daysLeft} j`}
                          </span>
                        )}
                        <p className="text-[8.5px] text-rose-500 font-bold mt-1 font-mono">{client.debtDueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-amber-750 font-bold bg-amber-100/30 p-2.5 rounded-xl border border-dashed border-amber-250 text-center">
                  {isRtl ? '✖ لا توجد ديون بآجال منتهية أو قاربت على الحلول.' : 'Aucune échéance de dette urgente proche.'}
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* LEFT COLUMN: Search & Database listing (7 or 8 cols in desktop) */}
      <div className={`${selectedClient ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6 transition-all duration-350`}>
        
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={isRtl ? 'ابحث عن زبون بالاسم أو الهاتف...' : 'Rechercher par nom, téléphone, email...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full py-2.5 pl-10 pr-10 bg-slate-50 text-xs text-slate-800 font-bold rounded-xl border border-slate-200/80 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all ${
                  isRtl ? 'text-right' : 'text-left'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-650 transition-all"
                  title={isRtl ? 'مسح البحث' : 'Effacer la recherche'}
                >
                  <span className="text-[10px] font-black bg-slate-200/60 text-slate-500 hover:text-slate-700 w-4.5 h-4.5 rounded-full flex items-center justify-center">✕</span>
                </button>
              )}
            </div>

            {/* Dynamic Sort Selector */}
            <div className="relative w-full sm:w-56">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`w-full py-2.5 bg-slate-50 text-xs text-slate-850 font-black rounded-xl border border-slate-200/80 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer ${
                  isRtl ? 'text-right pr-3 pl-8' : 'text-left pl-3 pr-8'
                }`}
              >
                <option value="default">{isRtl ? '🔍 الترتيب التلقائي' : 'Tri automatique'}</option>
                <option value="debt_desc">{isRtl ? '📈 الديون: من الأعلى للأقل' : 'Dettes : Plus de dettes'}</option>
                <option value="debt_asc">{isRtl ? '📉 الديون: من الأقل للأعلى' : 'Dettes : Moins de dettes'}</option>
                <option value="debt_date_desc">{isRtl ? '📅 تاريخ الدين: الأحدث أولاً' : 'Date de dette : Récente d\'abord'}</option>
                <option value="debt_date_asc">{isRtl ? '📅 تاريخ الدين: الأقدم أولاً' : 'Date de dette : Ancienne d\'abord'}</option>
                <option value="debt_duedate_asc">{isRtl ? '⏰ تاريخ التحصيل: الأقرب أولاً' : 'Échéance recouvrement : Proche d\'abord'}</option>
                <option value="spent_desc">{isRtl ? '💎 مجموع المشتريات (الأعلى)' : 'Fidélité : Plus dépensé'}</option>
                <option value="check_expiry">{isRtl ? '📅 الشيكات: تاريخ الاستحقاق الأقرب' : 'Chèques : Échéance proche'}</option>
                <option value="check_amount_desc">{isRtl ? '💰 الشيكات: القيمة الأعلى أولاً' : 'Chèques : Montant élevé first'}</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateNewClick}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 w-full md:w-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isRtl ? 'فتح حساب زبون جديد' : 'Nouveau Client'}</span>
          </button>

        </div>

        {/* Database records list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                  <th className="py-3 px-4 text-start">{isRtl ? 'الزبون' : 'Client'}</th>
                  <th className="py-3 px-4 text-start">{tLabel.phoneNumber}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'شيكات الضمان' : 'Chèques de Garantie'}</th>
                  <th className="py-3 px-4 text-end text-rose-700">{isRtl ? 'الديون المستحقة' : 'Ardoise / Dettes'}</th>
                  {currentUser?.role !== 'cashier' && <th className="py-3 px-4 text-center">{t.actions}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-semibold text-slate-800">
                {filteredClients.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => { setSelectedClient(c); setIsMaximized(true); }}
                    className={`text-xs hover:bg-gray-50 cursor-pointer transition ${
                      selectedClient && selectedClient.id === c.id ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-4 px-4 font-bold text-gray-800 text-start">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-lg font-black shadow-sm shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-extrabold text-gray-900 text-[13px]">{c.name}</p>
                            {c.postalChecks && c.postalChecks.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-150 animate-pulse animate-duration-1000" title={isRtl ? 'شيك بريدي مسجل' : 'Chèque postal enregistré'}>
                                ✉️ {isRtl ? `شيكات (${c.postalChecks.length})` : `Chèques (${c.postalChecks.length})`}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100 block w-fit mt-1">#{String(getSequentialNumber(c)).padStart(2, '0')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-700 font-mono text-start">{c.phone}</td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                       {c.postalChecks && c.postalChecks.length > 0 ? (
                         <div className="flex flex-col gap-1 items-center justify-center">
                           {c.postalChecks.map((check, idx) => {
                             const status = getCheckStatus(check.expiryDate);
                             return (
                               <div key={check.id || idx} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9.5px] font-black ${status.className} min-w-[95px] shadow-xxs justify-between`}>
                                 <span className="font-mono">{check.amount?.toFixed(0)} DH</span>
                                 <span className="text-[7.5px] font-bold opacity-80 whitespace-nowrap">📅 {check.expiryDate}</span>
                               </div>
                             );
                           })}
                         </div>
                       ) : (
                         <span className="text-gray-300 font-bold font-mono text-center">—</span>
                       )}
                     </td>
                    <td className="py-4 px-4 text-end">
                      {c.outstandingDebt && c.outstandingDebt > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-extrabold text-rose-600 font-mono text-[13px] tracking-tight bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/50">
                            {c.outstandingDebt.toFixed(2)} DH
                          </span>
                          <div className="flex flex-col items-end text-[9px] text-gray-400 font-semibold leading-none font-mono">
                            <span>📅 {isRtl ? 'بدء:' : 'crédit:'} {c.debtDate || c.joinDate}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-300 font-medium font-mono text-xs">0.00 DH</span>
                      )}
                    </td>
                    {currentUser?.role !== 'cashier' && (
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => handleEditClick(c, e)}
                            className="p-1 px-2 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-150 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setClientToDelete(c)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded-lg border border-rose-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={currentUser?.role === 'cashier' ? 6 : 7} className="py-12 text-center text-gray-400 text-xs font-semibold">
                      {isRtl ? 'لا يوجد زبناء بهذا الاسم.' : 'Aucun client dans la base de données.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Profile details inspections panel (5 cols) */}
      {selectedClient && (
        <div className={
          isMaximized 
            ? "fixed inset-0 z-50 w-full h-full bg-white rounded-none m-0 overflow-hidden flex flex-col justify-between animate-fade-in shadow-2xl" 
            : "lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between max-h-[85vh] sticky top-6 animate-fade-in"
        }>
          
          {/* Header */}
          <div className="px-5 py-4.5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>{isRtl ? 'ملف وفواتير الزبون' : 'Historique & Fiches Client'}</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsMaximized(!isMaximized)} 
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-lg transition"
                title={isRtl ? 'تكبير / تصغير' : 'Agrandir / Réduire'}
              >
                {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => {
                  setSelectedClient(null);
                  setIsMaximized(false);
                }} 
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Profile particulars */}
          <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
            
            {/* Unified Client Header & Debt Summary */}
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
               {/* Left: Avatar + Name + Contact */}
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-mono font-black text-white flex flex-col items-center justify-center shadow-md shadow-blue-500/10 shrink-0">
                    <span className="text-md font-bold mt-[-2px]">#{String(getSequentialNumber(selectedClient)).padStart(2, '0')}</span>
                  </div>
                  <div className="flex flex-col">
                     <h2 className="text-sm font-extrabold text-gray-900 leading-tight">{selectedClient.name}</h2>
                     <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] text-gray-500 font-mono mt-1">
                        <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"><Phone className="w-2.5 h-2.5 text-blue-500"/> {selectedClient.phone}</span>
                        <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 max-w-[120px] truncate" title={selectedClient.address}><MapPin className="w-2.5 h-2.5 text-purple-500"/> {selectedClient.address}</span>
                     </div>
                  </div>
               </div>
               
               {/* Right: Debt summary & Action */}
               <div className="flex items-center gap-3 border-s border-gray-100 ps-3">
                  {editingId && (
                  <div className={`text-${isRtl ? 'right' : 'left'}`}>
                    <span className="text-[8.5px] text-rose-800 font-bold uppercase tracking-wider block mb-0.5">{isRtl ? 'المديونية :' : 'Dette :'}</span>
                    <span className="text-[12px] font-black text-rose-600 font-mono">{(selectedClient.outstandingDebt || 0).toFixed(2)} DH</span>
                  </div>
                  )}
                  {editingId && (selectedClient.outstandingDebt || 0) > 0 && currentUser?.role !== 'cashier' && (
                    <button
                      onClick={() => {
                        setSettlementAmount(selectedClient.outstandingDebt || 0);
                        setIsOpenSettleModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xxs font-black transition-all shadow-sm shrink-0"
                    >
                      {isRtl ? 'دفع' : 'Régler'}
                    </button>
                  )}
               </div>
            </div>

            {/* Postal Check details block */}
            <div className={`p-3 rounded-xl border ${selectedClient.postalChecks && selectedClient.postalChecks.length > 0 ? 'bg-indigo-50/40 border-indigo-100' : 'bg-slate-50 border-slate-200'} space-y-2`}>
              <div className="flex items-center justify-between">
                <h4 className={`text-[10px] font-black uppercase tracking-wide ${selectedClient.postalChecks && selectedClient.postalChecks.length > 0 ? 'text-indigo-800' : 'text-slate-500'}`}>
                  {isRtl ? 'حالة الشيكات البريدية كضمان مالي' : 'Garanties de Chèques Postaux'}
                </h4>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                  selectedClient.postalChecks && selectedClient.postalChecks.length > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {selectedClient.postalChecks && selectedClient.postalChecks.length > 0 
                    ? (isRtl ? `📩 متوفر (${selectedClient.postalChecks.length})` : `📩 Enregistré (${selectedClient.postalChecks.length})`) 
                    : (isRtl ? '⚠️ لا يوجد' : '⚠️ Aucun')
                  }
                </span>
              </div>

              {selectedClient.postalChecks && selectedClient.postalChecks.length > 0 ? (
                <div className="space-y-3 pt-2.5 border-t border-indigo-100/40 font-semibold text-gray-700 max-h-[180px] overflow-y-auto pr-0.5 select-none">
                  {selectedClient.postalChecks.map((check, idx) => (
                    <div key={check.id || idx} className="bg-white p-3 rounded-xl border border-indigo-100/50 shadow-xxs flex flex-col gap-2">
                      <div className="flex justify-between items-center bg-indigo-50/35 px-2 py-1 rounded-lg">
                        <span className="text-[10px] text-indigo-950 font-black">{isRtl ? `شيك رقم ${idx + 1}` : `Chèque N° ${idx + 1}`}</span>
                        <span className="font-mono text-xs font-black text-indigo-700">{check.amount?.toFixed(2)} DH</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xxs">
                        <div>
                          <span className="text-[9px] text-gray-400 block mb-0.5">{isRtl ? 'تاريخ الدخول :' : 'Date dépôt :'}</span>
                          <span className="font-mono text-slate-800 font-bold">{check.entryDate || (isRtl ? 'غير محدد' : 'N/A')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block mb-0.5">{isRtl ? 'تاريخ النهاية :' : 'Date échéance :'}</span>
                          <span className="font-mono text-rose-700 font-black">{check.expiryDate || (isRtl ? 'غير محدد' : 'N/A')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[9.5px] text-slate-400 font-bold leading-relaxed italic">
                  {isRtl 
                    ? '💡 لا يوجد شيك بريدي مسجل كضمان مالي لهذا الزبون حالياً.' 
                    : "Aucun chèque de garantie postal n'est configuré pour ce client."
                  }
                </p>
              )}
            </div>


            {/* Purchases ledger stack */}
            <div className="space-y-3.5">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <h4 className="text-xxs text-slate-400 font-bold uppercase tracking-wider">
                  {isRtl ? 'سجل المعاملات والعمليات' : 'Historique d\'achats'}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortAscending(!sortAscending)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                  >
                    {sortAscending ? (isRtl ? '⬇️ الأقدم أولاً' : '⬇️ Plus ancien d\'abord') : (isRtl ? '⬆️ الأحدث أولاً' : '⬆️ Plus récent d\'abord')}
                  </button>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] uppercase font-black font-semibold rounded-md">
                    {clientPurchasesInPeriod.length} / {(selectedClient.purchases || []).length} invoices
                  </span>
                </div>
              </div>

              {/* Period selection inputs */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wide">
                  {isRtl ? 'تحديد فترة حساب مجموع المشتريات :' : 'Calculer les achats sur une période :'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xxs font-bold text-slate-700">
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-0.5">{isRtl ? 'من تاريخ :' : 'Du :'}</label>
                    <input
                      type="date"
                      value={purchaseDateFrom}
                      onChange={(e) => setPurchaseDateFrom(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 mb-0.5">{isRtl ? 'إلى تاريخ :' : 'Au :'}</label>
                    <input
                      type="date"
                      value={purchaseDateTo}
                      onChange={(e) => setPurchaseDateTo(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Display calculated result */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-600">
                    {isRtl ? 'إجمالي المشتريات في هذه الفترة :' : 'Achats cumulés période :'}
                  </span>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-black font-mono rounded-lg text-[11px] border border-emerald-100/50">
                    {clientTotalSpentInPeriod.toFixed(2)} DH
                  </span>
                </div>

                {/* Filter Debt Checkbox */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showOnlyDebtInvoices"
                      checked={showOnlyDebtInvoices}
                      onChange={(e) => setShowOnlyDebtInvoices(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <label htmlFor="showOnlyDebtInvoices" className="text-[10px] font-extrabold text-slate-700 cursor-pointer">
                      {isRtl ? 'عرض فواتير الديون فقط' : 'Afficher uniquement les factures impayées'}
                    </label>
                  </div>
                </div>

                {(purchaseDateFrom || purchaseDateTo || showOnlyDebtInvoices) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseDateFrom('');
                      setPurchaseDateTo('');
                      setShowOnlyDebtInvoices(false);
                    }}
                    className="w-full text-center text-[10px] font-black text-rose-600 hover:text-rose-700 hover:underline pt-2 border-t border-slate-200/60 block transition-colors"
                  >
                    {isRtl ? '🔄 العودة للأرشيف (عرض جميع المشتريات)' : '🔄 Retour aux archives (tout afficher)'}
                  </button>
                )}
              </div>

              <div className={`space-y-2 overflow-y-auto pr-0.5 ${isMaximized ? 'flex-1 min-h-[300px]' : 'max-h-[160px]'}`}>
                {combinedHistory.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <ShoppingBag className="w-8 h-8 mx-auto stroke-1 text-gray-300 mb-1.5" />
                    <p className="text-[10px] font-semibold">{isRtl ? 'لا توجد عمليات تطابق الفترة الحالية.' : 'Aucun événement durant cette période.'}</p>
                  </div>
                ) : (
                  (() => {
                    const globalHistory = combinedHistory.slice().reverse();
                    const pageItems = globalHistory.slice((historyPage - 1) * 10, historyPage * 10);
                    return sortAscending ? pageItems.slice().reverse() : pageItems;
                  })().map((item, idx) => {
                    if (item.type === 'payment') {
                      const pay = item.data as any;
                      return (
                        <div key={`pay-${idx}`} className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                               <Sparkles className="w-4 h-4" />
                             </div>
                             <div>
                               <p className="text-[10px] text-emerald-900 font-bold uppercase tracking-wider">{isRtl ? 'تسديد دين / استخلاص' : 'Règlement de dette'}</p>
                               <p className="text-[9px] text-emerald-700/80 font-medium">{new Date(pay.date).toLocaleString(isRtl ? 'ar-MA' : 'fr', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} - {pay.notes}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="block text-[10px] font-bold text-gray-600 bg-white/80 px-2 py-1 rounded-lg border border-gray-200">
                                {isRtl ? 'الرصيد:' : 'Solde:'} {(item as any).runningDebt.toFixed(2)} DH
                              </span>
                            </div>

                            <div className="flex flex-col items-end w-20">
                              <span className="font-black text-emerald-700 text-[13px] font-mono bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200/50">
                                +{pay.amount.toFixed(2)} DH
                              </span>
                            </div>

                            <div className="text-emerald-200 ml-1 opacity-0 pointer-events-none">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    const p = item.data as any;
                    const invoice = invoices.find(inv => inv.id === p.invoiceId || inv.invoiceNumber === p.invoiceId);
                    const hasDebt = invoice && invoice.amountDue && invoice.amountDue > 0;
                    const isExpanded = expandedInvoiceId === p.invoiceId;

                    let safeItems: any[] = [];
                    if (invoice && invoice.items) {
                      let parsedItems = invoice.items;
                      let attempts = 0;
                      while (typeof parsedItems === 'string' && attempts < 3) {
                        try { 
                          parsedItems = JSON.parse(parsedItems); 
                        } catch(e) { 
                          break; 
                        }
                        attempts++;
                      }
                      if (Array.isArray(parsedItems)) {
                        safeItems = parsedItems;
                      }
                    }

                    return (
                      <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-200">
                        {/* Header Row */}
                        <div 
                          className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : p.invoiceId)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-xxs flex items-center gap-2">
                                {p.invoiceId}
                                {hasDebt && (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-100 text-rose-700 uppercase tracking-widest border border-rose-200">
                                    {isRtl ? 'بها دين' : 'Crédit'}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-450 font-medium">{new Date(item.date).toLocaleString(isRtl ? 'ar-MA' : 'fr', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="block text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                                {isRtl ? 'الرصيد:' : 'Solde:'} {(item as any).runningDebt.toFixed(2)} DH
                              </span>
                            </div>
                            
                            <div className="flex flex-col items-end w-20">
                              {hasDebt ? (
                                <span className="block text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  {isRtl ? 'الباقي:' : 'Reste:'} {invoice.amountDue?.toFixed(2)} DH
                                </span>
                              ) : (
                                <span className="block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {isRtl ? 'خالص' : 'Réglé'}
                                </span>
                              )}
                            </div>

                            <div className="text-gray-400 ml-1">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Items Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50/50 p-3">
                            <div className="mb-3 p-2 bg-white rounded-lg border border-blue-100 flex justify-between items-center shadow-sm">
                              <span className="text-[11px] font-extrabold text-blue-900">{isRtl ? 'قيمة المبيعات (الفاتورة):' : 'Total facture:'}</span>
                              <span className="text-[13px] font-black text-blue-700 font-mono">{p.total.toFixed(2)} DH</span>
                            </div>
                            
                            {safeItems.length > 0 ? (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-200 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className={`pb-2 ${isRtl ? 'text-right' : 'text-left'} font-medium`}>{isRtl ? 'السلعة' : 'Produit'}</th>
                                    <th className={`pb-2 ${isRtl ? 'text-right' : 'text-left'} font-medium`}>{isRtl ? 'الكمية' : 'Qté'}</th>
                                    <th className={`pb-2 ${isRtl ? 'text-right' : 'text-left'} font-medium`}>{isRtl ? 'السعر' : 'Prix'}</th>
                                    <th className={`pb-2 text-right font-medium`}>{isRtl ? 'المجموع' : 'Total'}</th>
                                  </tr>
                                </thead>
                                <tbody className="text-[10px] font-mono">
                                  {safeItems.map((item, i) => (
                                    <tr key={i} className="border-b border-gray-100/50 last:border-0 hover:bg-gray-100/50 transition-colors">
                                      <td className={`py-1.5 ${isRtl ? 'text-right' : 'text-left'} text-gray-700 font-medium`}>{item.name || 'Unknown'}</td>
                                      <td className={`py-1.5 ${isRtl ? 'text-right' : 'text-left'} text-gray-600`}>{item.qty}</td>
                                      <td className={`py-1.5 ${isRtl ? 'text-right' : 'text-left'} text-gray-600`}>{Number(item.sellPrice || 0).toFixed(2)}</td>
                                      <td className="py-1.5 text-right font-bold text-gray-800">{(Number(item.qty || 0) * Number(item.sellPrice || 0)).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-center text-gray-400 py-3 text-xs font-medium">
                                {invoice 
                                  ? (isRtl ? 'لا توجد تفاصيل سلع لهذه الفاتورة' : 'Aucun produit trouvé') 
                                  : (isRtl ? 'تعذر العثور على الفاتورة لتفاصيل السلع' : 'Facture introuvable')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {combinedHistory.length > 10 && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                  <button 
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                  >
                    {isRtl ? 'السابق' : 'Précédent'}
                  </button>
                  <span className="text-[10px] font-bold text-gray-500">
                    {historyPage} / {Math.ceil(combinedHistory.length / 10)}
                  </span>
                  <button 
                    onClick={() => setHistoryPage(p => Math.min(Math.ceil(combinedHistory.length / 10), p + 1))}
                    disabled={historyPage >= Math.ceil(combinedHistory.length / 10)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50"
                  >
                    {isRtl ? 'التالي' : 'Suivant'}
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="p-4.5 border-t border-gray-100 text-center bg-gray-50/50">
            <span className="text-[10px] text-gray-400 block font-semibold">
              LAMBARKI CRM Customer Ledger Security protocol
            </span>
          </div>

        </div>
      )}

      {/* COMPONENT MODAL: CREATE / EDIT CRM CARD */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="text-sm font-bold text-gray-900">
                {editingId ? (isRtl ? 'تعديل بيانات الزبون' : 'Mise à Jour Tiers Client') : (isRtl ? 'تسجيل زبون دائم جديد' : 'Enregistrer un Nouveau Client')}
              </h3>
              <button onClick={() => setIsOpenModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'الاسم الكامل للزبون *' : 'Nom Complet *'}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'رقم الهاتف المحمول' : 'Numéro de Téléphone'}</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'البريد الإلكتروني' : 'Adresse Email'}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{tLabel.physicalAddress}</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              {editingId && (
                <>
                  {/* Outstanding Debt */}
                  <div className="space-y-1">
                    <label className="text-xxs text-rose-800 uppercase tracking-wide">
                      {isRtl ? 'الديون المستحقة والمترتبة على الزبون (قابل للتعديل) *' : 'Dette en cours réglable de ce client *'}
                    </label>
                    <div className="relative">
                      <span className="absolute right-3.5 top-3 text-xs text-rose-600 font-black font-mono">DH</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={formOutstandingDebt}
                        onChange={(e) => setFormOutstandingDebt(parseFloat(e.target.value) || 0)}
                        className="w-full pl-3 pr-12 py-2.5 bg-rose-50/50 border border-rose-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-bold text-rose-700"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {isRtl ? 'تعديل أو إدخال رصيد الدين المستحق على الزبون مباشرة.' : 'Ajustez ou entrez directement le solde débiteur en suspens.'}
                    </p>
                  </div>

                  {/* Debt Dates details (Date of Debt & Collection Due Date) */}
                  {formOutstandingDebt > 0 && (
                    <div className="grid grid-cols-2 gap-3.5 p-4 bg-rose-50/25 border border-rose-100/50 rounded-2xl animate-fade-in">
                      <div className="space-y-1 text-left">
                        <label className="text-xxs text-rose-800 uppercase tracking-wide block">
                          {isRtl ? 'تاريخ بدء الدين *' : 'Date de début du crédit *'}
                        </label>
                        <input
                          type="date"
                          required
                          value={formDebtDate}
                          onChange={(e) => setFormDebtDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono font-bold text-rose-900"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-xxs text-rose-800 uppercase tracking-wide block">
                          {isRtl ? 'تاريخ التحصيل الاستحقاق' : 'Échéance de recouvrement'}
                        </label>
                        <input
                          type="date"
                          value={formDebtDueDate}
                          onChange={(e) => setFormDebtDueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono font-bold text-rose-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Postal Check Section */}
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                  <label className="text-xxs text-indigo-900 font-extrabold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formHasPostalCheck}
                      onChange={(e) => setFormHasPostalCheck(e.target.checked)}
                      className="w-4.5 h-4.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span>{isRtl ? 'تسجيل شيكات بريدية كضمان مالى' : 'Garanties de chèques postaux ?'}</span>
                  </label>
                </div>

                {formHasPostalCheck && (
                  <div className="space-y-3 pt-3 border-t border-dashed border-gray-200 animate-fade-in text-xs font-semibold">
                    
                    {/* List of currently added checks */}
                    {formPostalChecks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block">
                          {isRtl ? 'الشيكات المضافة حاليا:' : 'Chèques ajoutés :'}
                        </span>
                        
                        <div className="space-y-1 max-h-[150px] overflow-y-auto bg-white p-2.5 rounded-xl border border-gray-100">
                          {formPostalChecks.map((ch, idx) => (
                            <div 
                              key={ch.id} 
                              className="flex items-center justify-between p-2 bg-indigo-50/45 rounded-lg border border-indigo-100/50 text-xxs font-bold text-gray-850"
                            >
                              <div className="space-y-0.5">
                                <p className="text-[10.5px] font-black text-indigo-950">
                                  {isRtl ? `الشيك ${idx + 1}:` : `Chèque ${idx + 1}:`} <span className="font-mono text-indigo-700">{ch.amount?.toFixed(2)} DH</span>
                                </p>
                                <p className="text-[9px] text-gray-400">
                                  📅 {ch.entryDate} • ⏰ <span className="text-rose-600 font-bold">{ch.expiryDate}</span>
                                </p>
                              </div>
                              
                              {/* Delete button ("azil") */}
                              <button
                                type="button"
                                onClick={() => handleRemoveCheck(ch.id)}
                                className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-150 rounded text-[10px] font-black"
                                title={isRtl ? 'حذف الشيك' : 'Supprimer le chèque'}
                              >
                                {isRtl ? 'حذف' : 'Supprimer'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add another check sub-form */}
                    <div className="bg-white/80 p-3 rounded-xl border border-gray-200/80 space-y-2 mt-2 shadow-xxs animate-fade-in">
                      <span className="text-[10px] font-black text-gray-600 block mb-1">
                        ➕ {isRtl ? 'إضافة شيك جديد إلى القائمة:' : 'Ajouter un nouveau chèque à la liste :'}
                      </span>

                      {/* Check Value / Amount */}
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'مبلغ الشيك (DH) :' : 'Montant du chèque postal (DH) :'}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tempAmount}
                          onChange={(e) => setTempAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-slate-50/50 border border-gray-200 rounded-lg text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-2 pb-1">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'تاريخ الدخول :' : 'Date de dépôt :'}</label>
                          <input
                            type="date"
                            value={tempEntryDate}
                            onChange={(e) => setTempEntryDate(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50/50 border border-gray-200 rounded-lg text-[11px] font-bold focus:outline-none font-mono text-slate-800"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'تاريخ النهاية :' : 'Date d\'échéance :'}</label>
                          <input
                            type="date"
                            value={tempExpiryDate}
                            onChange={(e) => setTempExpiryDate(e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50/50 border border-gray-200 rounded-lg text-[11px] font-bold focus:outline-none font-mono text-rose-700"
                          />
                        </div>
                      </div>

                      {/* Button to push into the list */}
                      <button
                        type="button"
                        onClick={handleAddCheck}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans tracking-wide shadow-xxs transition-all"
                      >
                        {isRtl ? '⚙️ إدراج الشيك في القائمة' : '⚙️ Insérer ce chèque dans la liste'}
                      </button>
                    </div>

                  </div>
                )}
              </div>
              </>
              )}

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-sans shadow-md"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* COMPONENT MODAL: SETTLE DEBT */}
      {isOpenSettleModal && selectedClient && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl shrink-0">
              <h3 className="text-sm font-bold text-gray-900">
                {isRtl ? 'تسجيل دفعة استخلاص الدين' : 'Enregistrer un remboursement de dette'}
              </h3>
              <button onClick={() => setIsOpenSettleModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="p-6 space-y-4 text-xs font-semibold overflow-y-auto flex-1">
              
              <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                <p className="text-xxs text-rose-800 uppercase tracking-wide">{isRtl ? 'إجمالي الدين الحالي للتسوية :' : 'Total dette restante à solder :'}</p>
                <p className="text-lg font-black text-rose-700 font-mono mt-0.5">
                  {(selectedClient.outstandingDebt || 0).toFixed(2)} DH
                </p>
              </div>

              {/* Repay Amount */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'المبلغ المستخلص بالدرهم *' : 'Montant à rembourser (DH) *'}</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedClient.outstandingDebt || 0}
                  value={settlementAmount || ''}
                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-sm"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'ملاحظات / تفاصيل المعاملة :' : 'Notes / Motif :'}</label>
                <input
                  type="text"
                  value={settlementNote}
                  onChange={(e) => setSettlementNote(e.target.value)}
                  placeholder={isRtl ? 'مثال: سداد الدفعة الثانية من الفاتورة...' : 'Ex: Paiement acompte n°2...'}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold font-sans shadow-md"
                >
                  {isRtl ? 'تأكيد وقيد الاستلام' : 'Solder & Confirmer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpenSettleModal(false)}
                  className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
                >
                  {t.cancel}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* COMPONENT MODAL: CONFIRM CLIENT DELETION */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-rose-50 rounded-full text-rose-600">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-md font-black text-gray-900">
                {isRtl ? 'هل أنت متأكد من حذف هذا الزبون؟' : 'Confirmer la suppression ?'}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {isRtl 
                  ? `سيتم حذف ملف الزبون "${clientToDelete.name}" نهائياً من قاعدة البيانات مع كافة سجلات المعاملات الخاصة به.` 
                  : `Le profil du client "${clientToDelete.name}" sera définitivement supprimé, y compris l'historique complet de ses transactions.`}
              </p>
            </div>

            <div className="flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  onDeleteClient(clientToDelete.id);
                  if (selectedClient && selectedClient.id === clientToDelete.id) {
                    setSelectedClient(null);
                  }
                  setClientToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold font-sans transition-all"
              >
                {isRtl ? 'حذف الزبون' : 'Supprimer'}
              </button>
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-205 text-gray-800 rounded-xl font-bold transition-all"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
