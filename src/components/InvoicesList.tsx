import React from 'react';
import { Invoice, AppTranslation, User, InvoiceItem, PaymentMethod } from '../types';
import { translations, arabicDashboardLabels, resolveUserName } from '../translations';
import { 
  Search, 
  Filter, 
  Calendar, 
  RotateCcw, 
  FileText, 
  Coins, 
  Printer, 
  TrendingUp, 
  CheckCircle2,
  Users2,
  Receipt,
  Edit3,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  ChevronDown,
  X,
  CreditCard,
  Building,
  HelpCircle
} from 'lucide-react';

interface InvoicesListProps {
  invoices: Invoice[];
  lang: 'fr' | 'ar';
  onViewInvoice: (invoice: Invoice) => void;
  currentUser?: User | null;
  onEditInvoice?: (updated: Invoice, previous: Invoice, shouldAdjustStock?: boolean) => void;
  onDeleteInvoice?: (id: string, restoreStock?: boolean) => void;
}

export default function InvoicesList({ 
  invoices, 
  lang, 
  onViewInvoice, 
  currentUser, 
  onEditInvoice, 
  onDeleteInvoice 
}: InvoicesListProps) {
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  const isAdmin = currentUser?.role === 'admin';

  // Filters State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
  const [dateFilter, setDateFilter] = React.useState<string>('all');

  // Deleting states
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = React.useState(true);

  // Editing states
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [originalInvoice, setOriginalInvoice] = React.useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = React.useState<Invoice | null>(null);

  // Edit fields
  const [editClientName, setEditClientName] = React.useState('');
  const [editDate, setEditDate] = React.useState('');
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [editDiscount, setEditDiscount] = React.useState(0);
  const [editTaxPercent, setEditTaxPercent] = React.useState(0);
  const [editItems, setEditItems] = React.useState<InvoiceItem[]>([]);
  const [editNotes, setEditNotes] = React.useState('');
  const [editStockRestore, setEditStockRestore] = React.useState(true);

  const handleStartEdit = (inv: Invoice) => {
    setOriginalInvoice(inv);
    setEditingInvoice(inv);
    setEditClientName(inv.clientName);
    // Convert date for standard datetime-local input YYYY-MM-DDTHH:MM
    let fmt = '';
    if (inv.date) {
      try {
        const dObj = new Date(inv.date);
        const yyyy = dObj.getFullYear();
        const mm = String(dObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dObj.getDate()).padStart(2, '0');
        const hh = String(dObj.getHours()).padStart(2, '0');
        const min = String(dObj.getMinutes()).padStart(2, '0');
        fmt = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      } catch (e) {
        fmt = inv.date.substring(0, 16);
      }
    }
    setEditDate(fmt);
    setEditPaymentMethod(inv.paymentMethod);
    setEditDiscount(inv.discount || 0);
    const calculatedTaxPercent = inv.subtotal > 0 ? Math.round((inv.tax / inv.subtotal) * 100) : 0;
    setEditTaxPercent(calculatedTaxPercent);
    setEditItems(inv.items.map(item => ({ ...item })));
    setEditNotes(inv.notes || '');
    setEditStockRestore(true);
    setIsEditModalOpen(true);
  };

  const liveTotals = React.useMemo(() => {
    const subtotal = editItems.reduce((sum, item) => sum + (item.qty * item.sellPrice), 0);
    const tax = subtotal * (editTaxPercent / 100);
    const total = Math.max(0, subtotal + tax - editDiscount);
    const profit = editItems.reduce((sum, item) => sum + (item.qty * (item.sellPrice - item.buyPrice)), 0) - editDiscount;
    return { subtotal, tax, total, profit };
  }, [editItems, editDiscount, editTaxPercent]);

  const handleUpdateItemQty = (prodId: string, delta: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === prodId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleUpdateItemPrice = (prodId: string, price: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.productId === prodId) {
        return { ...item, sellPrice: Math.max(0, price) };
      }
      return item;
    }));
  };

  const handleRemoveItem = (prodId: string) => {
    setEditItems(prev => prev.filter(item => item.productId !== prodId));
  };

  const handleSaveInvoiceEdits = () => {
    if (!originalInvoice || !editingInvoice || !onEditInvoice) return;
    if (editItems.length === 0) {
      alert(isRtl ? '⚠️ الفاتورة يجب أن تحتوي على منتج واحد على الأقل!' : '⚠️ La facture doit contenir au moins un produit !');
      return;
    }

    const newTotal = liveTotals.total;
    let finalAmountPaid = editingInvoice.amountPaid || 0;
    let finalAmountDue = 0;

    if (editingInvoice.paymentStatus === 'paid') {
      finalAmountPaid = newTotal;
      finalAmountDue = 0;
    } else if (editingInvoice.paymentStatus === 'unpaid') {
      finalAmountPaid = 0;
      finalAmountDue = newTotal;
    } else if (editingInvoice.paymentStatus === 'partial') {
      finalAmountPaid = Math.min(finalAmountPaid, newTotal);
      finalAmountDue = newTotal - finalAmountPaid;
    }

    const updated: Invoice = {
      ...editingInvoice,
      clientName: editClientName,
      date: editDate ? new Date(editDate).toISOString() : new Date().toISOString(),
      paymentMethod: editPaymentMethod,
      discount: editDiscount,
      items: editItems,
      subtotal: liveTotals.subtotal,
      tax: liveTotals.tax,
      total: newTotal,
      profit: liveTotals.profit,
      amountPaid: finalAmountPaid,
      amountDue: finalAmountDue,
      notes: editNotes
    };

    onEditInvoice(updated, originalInvoice, editStockRestore);
    setIsEditModalOpen(false);
    setOriginalInvoice(null);
    setEditingInvoice(null);
  };

  const handleConfirmDeleteInvoice = () => {
    if (!invoiceToDelete || !onDeleteInvoice) return;
    onDeleteInvoice(invoiceToDelete.id, restoreStockOnDelete);
    setInvoiceToDelete(null);
    setConfirmDelete(false);
  };

  // Compute filtered invoices
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(inv => {
      const query = searchQuery.toLowerCase().trim();
      const resolvedCashier = inv.cashierName ? resolveUserName(inv.cashierName, lang).toLowerCase() : '';
      const matchesSearch = !query || 
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.clientName.toLowerCase().includes(query) ||
        (inv.cashierName && inv.cashierName.toLowerCase().includes(query)) ||
        resolvedCashier.includes(query);

      const matchesPayment = paymentFilter === 'all' || inv.paymentMethod === paymentFilter;

      let matchesDate = true;
      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        matchesDate = inv.date.startsWith(todayStr);
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        matchesDate = new Date(inv.date) >= oneWeekAgo;
      } else if (dateFilter === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        matchesDate = new Date(inv.date) >= oneMonthAgo;
      }

      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [invoices, searchQuery, paymentFilter, dateFilter]);

  // General Statistics based on paid invoices
  const stats = React.useMemo(() => {
    const totalCount = invoices.length;
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
    const cashTotal = invoices.filter(i => i.status === 'paid' && i.paymentMethod === 'cash').reduce((sum, i) => sum + i.total, 0);
    const checkTotal = invoices.filter(i => i.status === 'paid' && i.paymentMethod === 'check').reduce((sum, i) => sum + i.total, 0);

    return {
      totalCount,
      totalPaid,
      cashTotal,
      checkTotal
    };
  }, [invoices]);

  const hasActiveFilters = searchQuery !== '' || paymentFilter !== 'all' || dateFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setPaymentFilter('all');
    setDateFilter('all');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>{isRtl ? 'إدارة الفواتير وقائمة المبيعات' : 'Gestion des Factures & Ventes'}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isRtl 
              ? 'تصفح، تتبع وبحث شامل في سجل كافة المبيعات والوصولات الصادرة من الصندوق.' 
              : 'Consultez, recherchez et filtrez l\'historique de toutes vos factures de ventes.'}
          </p>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Total Invoices Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxs uppercase font-black text-gray-400 tracking-wider">
              {isRtl ? 'إجمالي عدد الفواتير' : 'Nombre de Factures'}
            </p>
            <h4 className="text-lg font-black text-slate-800 font-mono mt-1">
              {stats.totalCount} {isRtl ? 'فاتورة' : 'factures'}
            </h4>
            <p className="text-xxs text-slate-500 mt-1">
              {isRtl ? 'سجل العمليات الإجمالي' : 'Historique complet des ventes'}
            </p>
          </div>
          <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Receipt className="w-5 h-5" />
          </span>
        </div>

        {/* Total Revenue Invoiced */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxs uppercase font-black text-gray-400 tracking-wider">
              {isRtl ? 'إجمالي المداخيل المغلقة (الفواتير المدفوعة)' : 'Chiffre d\'Affaires Encaissé'}
            </p>
            <h4 className="text-lg font-black text-emerald-600 font-mono mt-1">
              {stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH
            </h4>
            <p className="text-xxs text-emerald-600/80 mt-1">
              {isRtl ? 'مغلقة بالكامل في الصندوق' : 'Encaissé en caisse avec succès'}
            </p>
          </div>
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </span>
        </div>

        {/* Cash vs Check ratio */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xxs uppercase font-black text-indigo-100 tracking-wider">
              {isRtl ? 'تفصيل السيولة النقدية والشيكات' : 'Ratios de Règlement'}
            </p>
            <div className="text-xs space-y-0.5 mt-1 font-semibold text-indigo-100">
              <div className="flex justify-between gap-4 font-mono">
                <span>{isRtl ? 'النقد (Espèces) :' : 'Espèces :'}</span>
                <span className="font-extrabold">{stats.cashTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} DH</span>
              </div>
              <div className="flex justify-between gap-4 font-mono">
                <span>{isRtl ? 'الشيكات (Chèques) :' : 'Chèques :'}</span>
                <span className="font-extrabold">{stats.checkTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })} DH</span>
              </div>
            </div>
          </div>
          <Coins className="w-8 h-8 text-indigo-200 stroke-1 flex-shrink-0" />
        </div>

      </div>

      {/* Main Table Card */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        
        {/* Title & Reset filter button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>{isRtl ? 'سجل الفواتير والمبيعات التفصيلية' : 'Savoir-Faire Factures Récentes'}</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-mono text-[10px]">
              {filteredInvoices.length} {isRtl ? 'النتائج' : 'résultats'}
            </span>
          </h3>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl text-xs font-bold transition cursor-pointer self-start md:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إعادة تعيين التصفية' : 'Réinitialiser'}</span>
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Quick Search Input */}
          <div className="relative">
            <span className={`absolute inset-y-0 flex items-center text-slate-400 pointer-events-none ${isRtl ? 'right-3' : 'left-3'}`}>
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'البحث بالاسم، رقم الفاتورة أو البائع...' : 'Recherche nom, n° facture, caissier...'}
              className={`w-full py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition ${
                isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            />
          </div>

          {/* Date Filter Selection */}
          <div className="relative">
            <span className={`absolute inset-y-0 flex items-center text-slate-400 pointer-events-none ${isRtl ? 'right-3' : 'left-3'}`}>
              <Calendar className="w-4 h-4" />
            </span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`w-full py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition appearance-none cursor-pointer ${
                isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            >
              <option value="all">{isRtl ? 'كل التواريخ والشهور' : 'Toutes les dates'}</option>
              <option value="today">{isRtl ? 'اليوم الحالي' : 'Aujourd\'hui'}</option>
              <option value="week">{isRtl ? 'آخر 7 أيام' : '7 derniers jours'}</option>
              <option value="month">{isRtl ? 'آخر 30 يوماً' : '30 derniers jours'}</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="relative">
            <span className={`absolute inset-y-0 flex items-center text-slate-400 pointer-events-none ${isRtl ? 'right-3' : 'left-3'}`}>
              <Filter className="w-4 h-4" />
            </span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className={`w-full py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition appearance-none cursor-pointer ${
                isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            >
              <option value="all">{isRtl ? 'كل طرق الدفع' : 'Tous les modes de règlement'}</option>
              <option value="cash">{tLabel.paymentCash}</option>
              <option value="card">{tLabel.paymentCard}</option>
              <option value="transfer">{tLabel.paymentTransfer}</option>
              <option value="check">{tLabel.paymentCheck}</option>
            </select>
          </div>

        </div>

        {/* Invoice List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                <th className="py-3 px-3">{tLabel.invoiceNum}</th>
                <th className="py-3 px-3">{tLabel.invoiceClient}</th>
                <th className="py-3 px-3">{tLabel.invoiceDate}</th>
                <th className="py-3 px-3 text-right">{isRtl ? 'قيمة الخصم' : 'Remise Applied'}</th>
                <th className="py-3 px-3 text-right">{tLabel.invoiceTotal}</th>
                <th className="py-3 px-3 text-center">{tLabel.invoiceStatus}</th>
                <th className="py-3 px-3 text-center">{tLabel.invoicePayment}</th>
                <th className="py-3 px-3 text-center">{isRtl ? 'البائع مسؤول العملية' : 'Caissier'}</th>
                <th className="py-3 px-3 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 text-xs font-bold">
                    {isRtl ? 'لم يتم العثور على أي فواتير مطابقة للتصفية.' : 'Aucune facture ne correspond.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.slice().reverse().map((invoice) => (
                  <tr key={invoice.id} className="text-xs hover:bg-gray-50 transition">
                    <td className="py-3.5 px-3 font-mono text-indigo-600 font-bold">{invoice.invoiceNumber}</td>
                    <td className="py-3.5 px-3 text-gray-900 font-bold">{invoice.clientName}</td>
                    <td className="py-3.5 px-3 text-gray-500 font-medium">
                      {new Date(invoice.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-600 bg-amber-50/20">
                      {invoice.discount && invoice.discount > 0 ? `-${invoice.discount.toFixed(2)} DH` : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900">
                      {invoice.total.toFixed(2)} DH
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {invoice.status === 'cancelled' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-800 border border-gray-200">
                          {isRtl ? 'ملغاة' : 'Annulée'}
                        </span>
                      ) : invoice.paymentStatus === 'unpaid' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-800 border border-rose-100">
                          {isRtl ? 'دين بالكامل' : 'À Crédit (Salaf)'}
                        </span>
                      ) : invoice.paymentStatus === 'partial' ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-850 border border-amber-100 font-extrabold">
                          {isRtl ? 'دفعة+دين' : 'Acompte + Reste'}
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {isRtl ? 'خالص بالكامل' : 'Payée en totalité'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-gray-600">
                      {{
                        cash: tLabel.paymentCash,
                        card: tLabel.paymentCard,
                        transfer: tLabel.paymentTransfer,
                        check: tLabel.paymentCheck
                      }[invoice.paymentMethod] || invoice.paymentMethod}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-600 font-medium truncate max-w-[120px]">
                      {resolveUserName(invoice.cashierName, lang)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 min-w-[150px]">
                        <button
                          onClick={() => onViewInvoice(invoice)}
                          className="p-1 px-2 bg-indigo-50 text-indigo-750 font-bold rounded-lg hover:bg-indigo-100 text-[10px] transition cursor-pointer inline-flex items-center gap-1"
                          title={isRtl ? 'مشاهدة وطباعة الفاتورة' : 'Voir & Imprimer'}
                        >
                          <Printer className="w-3 h-3 text-indigo-600" />
                          <span>{t.print}</span>
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleStartEdit(invoice)}
                              className="p-1 px-2 bg-amber-50 text-amber-700 font-bold rounded-lg hover:bg-amber-100 text-[10px] transition cursor-pointer inline-flex items-center gap-1"
                              title={isRtl ? 'تعديل الفاتورة' : 'Modifier'}
                            >
                              <Edit3 className="w-3 h-3 text-amber-600" />
                              <span>{isRtl ? 'تعديل' : 'Modifier'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setInvoiceToDelete(invoice);
                                setConfirmDelete(true);
                              }}
                              className="p-1 px-2 bg-rose-50 text-rose-700 font-bold rounded-lg hover:bg-rose-100 text-[10px] transition cursor-pointer inline-flex items-center gap-1"
                              title={isRtl ? 'حذف الفاتورة' : 'Supprimer'}
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>{isRtl ? 'حذف' : 'Supprimer'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL 1: CONFIRM DELETE OVERLAY */}
      {confirmDelete && invoiceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl border border-rose-100 shadow-2xl max-w-md w-full p-6 space-y-6 text-right">
            
            <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
              <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5 animate-bounce" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  {isRtl ? 'تأكيد حذف الفاتورة بصفة نهائية' : 'Confirmer la suppression'}
                </h3>
                <p className="text-xxs text-gray-400 mt-0.5">
                  {isRtl ? 'هذه العملية لا يمكن التراجع عنها لاحقاً!' : 'Cette action est irréversible.'}
                </p>
              </div>
            </div>

            <div className={`space-y-3 p-4 bg-slate-50 rounded-xl text-xs font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className="flex justify-between">
                <span className="text-gray-450">{isRtl ? 'رقم الفاتورة :' : 'N° Facture :'}</span>
                <span className="font-mono text-indigo-600 font-extrabold">{invoiceToDelete.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-450">{isRtl ? 'الزبون :' : 'Client :'}</span>
                <span className="text-slate-800 font-extrabold">{invoiceToDelete.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-450">{isRtl ? 'التاريخ :' : 'Date :'}</span>
                <span className="text-slate-600 font-bold">
                  {new Date(invoiceToDelete.date).toLocaleDateString(isRtl ? 'ar-MA' : 'fr', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200/60 pt-2 font-black">
                <span className="text-gray-900">{isRtl ? 'المبلغ الإجمالي :' : 'Montant Total :'}</span>
                <span className="text-rose-600 font-mono text-sm">{invoiceToDelete.total.toFixed(2)} DH</span>
              </div>
            </div>

            {/* Restore stock option */}
            <label className="flex items-start gap-3 cursor-pointer p-1 group">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded cursor-pointer"
              />
              <div className={`text-xxs ${isRtl ? 'text-right' : 'text-left'}`}>
                <span className="font-extrabold text-slate-800 group-hover:text-rose-600 transition-colors">
                  {isRtl ? 'إرجاع كميات السلع تلقائياً للمخزن' : 'Réintégrer automatiquement les articles au stock'}
                </span>
                <p className="text-[10px] text-gray-400 font-medium">
                  {isRtl 
                    ? 'سيتم تزويد المخزن تلقائياً بالكميات التي كانت معبأة في هذه الفاتورة وإلغاء خروجها.' 
                    : 'Les unités vendues dans cette facture seront réinjectées dans les stocks physiques.'}
                </p>
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  setInvoiceToDelete(null);
                }}
                className="flex-1 py-3 border border-gray-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {isRtl ? 'تراجع وإلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInvoice}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm hover:shadow-lg cursor-pointer"
              >
                {isRtl ? 'نعم، حذف الفاتورة' : 'Oui, Supprimer'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: INTERACTIVE INVOICE EDIT OVERLAY */}
      {isEditModalOpen && editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-4xl w-full flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    {isRtl ? 'تعديل تفاصيل الفاتورة والمبيعات' : 'Modifier la Facture'}
                  </h3>
                  <p className="text-[10px] text-indigo-650 font-mono mt-0.5">
                     Code: {editingInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setOriginalInvoice(null);
                  setEditingInvoice(null);
                }}
                className="p-1.5 hover:bg-slate-250 text-gray-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Client Name Input */}
                <div className="space-y-1">
                  <label className="text-xxs uppercase font-black text-gray-400 tracking-wider">
                    {isRtl ? 'اسم الزبون المعني الفاتورة *' : 'Nom du Client *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 transition"
                  />
                </div>

                {/* Edit Date Input */}
                <div className="space-y-1">
                  <label className="text-xxs uppercase font-black text-gray-400 tracking-wider">
                    {isRtl ? 'تاريخ المعاملة والوقت *' : 'Date de la transaction *'}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 transition"
                  />
                </div>

                {/* Edit Payment Method Dropdown */}
                <div className="space-y-1">
                  <label className="text-xxs uppercase font-black text-gray-400 tracking-wider">
                    {isRtl ? 'طريقة السداد والتسوية *' : 'Mode de Réglement *'}
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2.5 outline-none font-bold text-slate-800 transition cursor-pointer"
                  >
                    <option value="cash">{tLabel.paymentCash}</option>
                    <option value="card">{tLabel.paymentCard}</option>
                    <option value="transfer">{tLabel.paymentTransfer}</option>
                    <option value="check">{tLabel.paymentCheck}</option>
                  </select>
                </div>
              </div>

              {/* Items editing table container */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-2 text-xxs uppercase font-black text-slate-500 tracking-wider border-b border-slate-100">
                  {isRtl ? 'قائمة المنتجات المشتراة وتعديل كمياتها' : 'Articles & Quantités à modifier'}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold uppercase text-gray-400">
                        <th className="py-2.5 px-4">{isRtl ? 'المنتج' : 'Article'}</th>
                        <th className="py-2.5 px-4 w-32 text-center">{isRtl ? 'سعر البيع (DH)' : 'P.U. Vente (DH)'}</th>
                        <th className="py-2.5 px-4 w-40 text-center">{isRtl ? 'الكمية المباعة' : 'Quantité vendue'}</th>
                        <th className="py-2.5 px-4 w-32 text-right">{isRtl ? 'المجموع الفرعي' : 'Montant Total'}</th>
                        <th className="py-2.5 px-4 w-16 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {editItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50/40 text-xxs">
                          <td className="py-3 px-4 font-bold text-slate-800">{item.name}</td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.sellPrice}
                              onChange={(e) => handleUpdateItemPrice(item.productId, Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-center text-xs font-bold font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, -1)}
                                className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-10 text-center font-mono font-extrabold text-xs text-slate-800">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQty(item.productId, 1)}
                                className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                            {(item.qty * item.sellPrice).toFixed(2)} DH
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded-lg transition"
                              title={isRtl ? 'إزالة هذا المنتج' : 'Retirer l\'article'}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculations and stock correction summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Stock alignment & Notes block */}
                <div className="space-y-4">
                  {/* Notes Area */}
                  <div className="space-y-1">
                    <label className="text-xxs uppercase font-black text-gray-400 tracking-wider">
                      {isRtl ? 'ملاحظات الفاتورة والتعليقات' : 'Notes publiques / Commentaires'}
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder={isRtl ? 'مثال: تمت تسوية المعاملة بترحيب...' : 'Notes imprimées sur le ticket...'}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-2 outline-none font-semibold text-slate-800 transition"
                    />
                  </div>

                  {/* Stock Correction Checkbox option */}
                  <label className="flex items-start gap-3 cursor-pointer p-3 border border-amber-100/70 bg-amber-50/20 rounded-2xl group">
                    <input
                      type="checkbox"
                      checked={editStockRestore}
                      onChange={(e) => setEditStockRestore(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-extrabold text-slate-800 group-hover:text-amber-700 transition-colors">
                        {isRtl ? 'مزامنة وتعديل كميات المخزن تلقائياً' : 'Réajuster automatiquement les stocks physiques'}
                      </span>
                      <p className="text-[10px] text-gray-400 font-medium leading-relaxed mt-0.5">
                        {isRtl 
                          ? 'عند تعديل كمية مبيعات أي عنصر، سيتم إضافة أو سحب الفارق من المخزن الفعلي للسلعة لتفادي أي خلل.' 
                          : 'Le stock disponible sera diminué ou crédité selon la différence nette des quantités éditées.'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Dynamic live calculation summary card */}
                <div className="p-5 bg-slate-50 rounded-2xl space-y-3 font-semibold border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRtl ? 'المجموع الأولي :' : 'Sous-total :'}</span>
                    <span className="font-mono text-slate-700">{liveTotals.subtotal.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-y border-gray-150">
                    <span className="text-slate-500">{isRtl ? 'قيمة الخصم الممنوح (DH) :' : 'Remise à appliquer (DH) :'}</span>
                    <input
                      type="number"
                      min="0"
                      value={editDiscount || ''}
                      onChange={(e) => setEditDiscount(Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-white border border-gray-200 rounded text-right text-xs font-black font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-150">
                    <span className="text-slate-500">{isRtl ? 'نسبة الضريبة المطبقة (%) :' : 'Taux TVA à appliquer (%) :'}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editTaxPercent || 0}
                      onChange={(e) => setEditTaxPercent(Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-white border border-gray-200 rounded text-right text-xs font-black font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-between text-indigo-700 font-bold">
                    <span>{isRtl ? 'قيمة الضريبة المحسوبة :' : 'Montant TVA calculé :'}</span>
                    <span className="font-mono">{liveTotals.tax.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-250 pt-2 font-black text-sm text-slate-900">
                    <span>{isRtl ? 'مجموع الفاتورة الحالي :' : 'Montant Total Régler :'}</span>
                    <span className="font-mono text-indigo-600 text-base">{liveTotals.total.toFixed(2)} DH</span>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-[10px] font-bold border border-emerald-100/50 flex justify-between">
                    <span>{isRtl ? 'ربح تقديري للعملية :' : 'Marge commerciale brute estimée :'}</span>
                    <span className="font-mono font-black">{liveTotals.profit.toFixed(2)} DH</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setOriginalInvoice(null);
                  setEditingInvoice(null);
                }}
                className="px-4 py-2.5 border border-gray-200 hover:bg-slate-50 text-slate-705 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {isRtl ? 'تراجع وإلغاء' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={handleSaveInvoiceEdits}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm hover:shadow-lg flex items-center gap-1 cursor-pointer"
              >
                <span>{isRtl ? 'حفظ التعديلات' : 'Enregistrer'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
