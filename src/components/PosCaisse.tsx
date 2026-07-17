import React from 'react';
import { Product, Client, InvoiceItem, Invoice, PaymentMethod } from '../types';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  UserPlus, 
  Check, 
  ShoppingCart, 
  TicketCheck, 
  AlertCircle,
  Hash,
  ShoppingBag,
  Image,
  Barcode,
  AlertTriangle
} from 'lucide-react';

interface PosCaisseProps {
  invoices?: Invoice[];
  products: Product[];
  clients: Client[];
  lang: 'fr' | 'ar';
  currentUser: { name: string };
  onNewSale: (invoice: Invoice, updatedProducts: Product[], updatedClients: Client[]) => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export default function PosCaisse({ 
  invoices = [],
  products, 
  clients, 
  lang, 
  currentUser,
  onNewSale,
  onViewInvoice
}: PosCaisseProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  // States
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [cart, setCart] = React.useState<{ product: Product; qty: number }[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [discountValue, setDiscountValue] = React.useState(0);
  const [taxPercent, setTaxPercent] = React.useState(0);
   const [payMethod, setPayMethod] = React.useState<PaymentMethod>('cash');
  const [orderNotes, setOrderNotes] = React.useState('');
  const [paymentStatusSelect, setPaymentStatusSelect] = React.useState<'paid' | 'unpaid' | 'partial'>('paid');
  const [amountPaidUpfront, setAmountPaidUpfront] = React.useState<number>(0);

  const [lastCompletedInvoice, setLastCompletedInvoice] = React.useState<Invoice | null>(null);

  // Error & warning messaging (to override potentially blocked window.alert)
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [posWarning, setPosWarning] = React.useState<string | null>(null);

  // Clear errors when input variables change
  React.useEffect(() => {
    setCheckoutError(null);
    setPosWarning(null);
  }, [selectedClientId, paymentStatusSelect, amountPaidUpfront]);

  // Track broken images dynamically to render elegant placeholders
  const [brokenImages, setBrokenImages] = React.useState<Record<string, boolean>>({});

  // Extract categories dynamically
  const categories = React.useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['all', ...Array.from(list)];
  }, [products]);

  // Filter products by search and category
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.sku || '').includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Action: Add to Cart
  const addToCart = (product: Product) => {
    setCheckoutError(null);
    setPosWarning(null);
    if (product.stock <= 0) {
      const msg = isRtl 
        ? 'نفذ المخزون! هذا المنتج غير متوفر حالياً، يرجى القيام بتسوية مخزون.' 
        : 'Stock épuisé ! Ce produit n\'est plus disponible actuellement.';
      setPosWarning(msg);
      alert(msg);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          const msg = isRtl 
            ? 'خطأ: لقد وصلت إلى الحد الأقصى المتوفر في مخزونك.' 
            : 'Erreur: Vous avez atteint la limite disponible en stock.';
          setPosWarning(msg);
          alert(msg);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setLastCompletedInvoice(null);
  };

  // Action: Decrement Cart Qty
  const decrementQty = (productId: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, qty: Math.max(1, item.qty - 1) };
      }
      return item;
    }));
  };

  // Action: Increment Cart Qty
  const incrementQty = (productId: string, maxStock: number) => {
    setCheckoutError(null);
    setPosWarning(null);
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        if (item.qty >= maxStock) {
          const msg = isRtl 
            ? 'لا توجد كميات كافية في المستودع حالياً !' 
            : 'Le stock actuel est insuffisant !';
          setPosWarning(msg);
          alert(msg);
          return item;
        }
        return { ...item, qty: item.qty + 1 };
      }
      return item;
    }));
  };

  // Action: Remove Item
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Computed Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.qty), 0);
  const taxSum = subtotal * (taxPercent / 100);
  const totalAmount = Math.max(0, subtotal + taxSum - discountValue);

  // Profit margins
  const totalProfit = cart.reduce((sum, item) => {
    const margin = item.product.sellPrice - item.product.buyPrice;
    return sum + (margin * item.qty);
  }, 0) - discountValue;

   // Action: Validate Ticket
  const handleValidateSale = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setPosWarning(null);
    if (cart.length === 0) return;

    // Validate that we have a selected client for unpaid or partial sales!
    if ((paymentStatusSelect === 'unpaid' || paymentStatusSelect === 'partial') && !selectedClientId) {
      const errMsg = isRtl 
        ? 'خطأ: يجب تحديد زبون مسجل لإتمام المعاملات بالدين أو الدفع الجزئي !' 
        : 'Erreur: Vous devez sélectionner un client enregistré pour les ventes à crédit ou partielles !';
      setCheckoutError(errMsg);
      try { alert(errMsg); } catch (e) { console.error('Alert blocked or failed', e); }
      return;
    }

    const finalAmountPaid = paymentStatusSelect === 'paid' 
      ? totalAmount 
      : paymentStatusSelect === 'unpaid' 
        ? 0 
        : amountPaidUpfront;

    if (paymentStatusSelect === 'partial' && (finalAmountPaid <= 0 || finalAmountPaid >= totalAmount)) {
      const errMsg = isRtl
        ? 'خطأ: مبلغ الدفعة جزئية يجب أن يكون أكبر من 0 وأقل من المبلغ الإجمالي !'
        : 'Erreur: Le montant payé d\'avance doit être supérieur à 0 et inférieur au total !';
      setCheckoutError(errMsg);
      try { alert(errMsg); } catch (e) { console.error('Alert blocked or failed', e); }
      return;
    }

    const outstandingDue = totalAmount - finalAmountPaid;

    // Identify associated client
    const client = clients.find(c => c.id === selectedClientId);
    const clientName = client ? client.name : (isRtl ? 'زبون عابر (صندوق)' : 'Client de Passage');

    // Prepare Invoice items
    const invoiceItems: InvoiceItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      qty: item.qty,
      sellPrice: item.product.sellPrice,
      buyPrice: item.product.buyPrice
    }));

    // Generate sequential invoice number: 000001
    let maxInvoiceNum = 0;
    for (const inv of invoices) {
      const numMatch = inv.invoiceNumber.match(/\d+$/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (!isNaN(num) && num > maxInvoiceNum) {
          maxInvoiceNum = num;
        }
      }
    }
    const serial = String(maxInvoiceNum + 1).padStart(6, '0');

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: serial,
      clientName,
      clientId: selectedClientId || undefined,
      clientPhone: client ? client.phone : undefined,
      items: invoiceItems,
      subtotal,
      tax: taxSum,
      discount: discountValue,
      total: totalAmount,
      profit: totalProfit,
      date: new Date().toISOString(),
      status: paymentStatusSelect === 'paid' ? 'paid' : 'pending',
      paymentMethod: payMethod,
      paymentStatus: paymentStatusSelect,
      amountPaid: finalAmountPaid,
      amountDue: outstandingDue,
      notes: orderNotes + (paymentStatusSelect !== 'paid' ? ` (${isRtl ? 'باقي دين:' : 'Reste dû:'} ${outstandingDue.toFixed(2)} DH)` : ''),
      cashierName: currentUser.name
    };

    // Deduct quantity from products list
    const updatedProductsList = products.map(p => {
      const cartItem = cart.find(item => item.product.id === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      }
      return p;
    });

    // Update Clients Total Spent & outstandingDebt
    const updatedClientsList = clients.map(c => {
      if (c.id === selectedClientId) {
        const preDebt = c.outstandingDebt || 0;
        const newDebt = preDebt + outstandingDue;
        return {
          ...c,
          totalSpent: c.totalSpent + totalAmount,
          outstandingDebt: newDebt,
          debtDate: newDebt > 0 ? (c.debtDate || new Date().toISOString().split('T')[0]) : undefined,
          purchases: [
            ...c.purchases,
            { invoiceId: serial, date: new Date().toISOString().split('T')[0], total: totalAmount }
          ]
        };
      }
      return c;
    });

    // Trigger save up to App level
    onNewSale(newInvoice, updatedProductsList, updatedClientsList);

    // Save state, clear form
    setLastCompletedInvoice(newInvoice);
    setCart([]);
    setSelectedClientId('');
    setDiscountValue(0);
    setTaxPercent(0);
    setOrderNotes('');
    setPaymentStatusSelect('paid');
    setAmountPaidUpfront(0);
  };

  const [mobileTab, setMobileTab] = React.useState<'catalog' | 'cart'>('catalog');
  const cartItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden p-1.5 bg-slate-100/90 rounded-xl flex gap-1 border border-slate-200/60 w-full shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isRtl ? 'كتالوج السلع' : 'Rayon Catalogue'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-3 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 relative cursor-pointer ${
            mobileTab === 'cart'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
              : 'text-slate-650 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{isRtl ? 'سلة المبيعات' : 'Panier & Caisse'}</span>
          {cartItemsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center ring-2 ring-white">
              {cartItemsCount}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Catalog and search filters (8 cols in desktop) */}
        <div className={`lg:col-span-7 flex-col gap-6 ${mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Search header & categories */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          {/* Modern Polished Search Box matching the products list style */}
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder={isRtl ? 'البحث عن منتج بالاسم أو الباركود...' : 'Chercher un produit par nom ou code...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-2.5 pl-10 pr-10 bg-slate-50 text-xs text-slate-800 font-bold rounded-xl border border-slate-200/85 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all ${
                isRtl ? 'text-right' : 'text-left'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
                title={isRtl ? 'مسح البحث' : 'Effacer la recherche'}
              >
                <span className="text-[10px] font-black bg-slate-200/60 text-slate-505 hover:text-slate-700 w-5 h-5 rounded-full flex items-center justify-center">✕</span>
              </button>
            )}
          </div>

          {/* Quick Categories filter buttons */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat === 'all' ? (isRtl ? 'جميع الأقسام' : 'Toutes Catégories') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Interactive Grid of products */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto max-h-[58vh] pr-1">
          {filteredProducts.map((p) => {
            const isLowStock = p.stock <= p.minStockAlert;
            return (
              <div 
                key={p.id}
                onClick={() => addToCart(p)}
                className={`bg-white rounded-xl p-3.5 border shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition relative duration-200 group select-none cursor-pointer ${
                  p.stock <= 0 
                  ? 'border-gray-200 opacity-60' 
                  : 'border-slate-100'
                }`}
              >
                <div>
                  {/* Product Header with category badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded shadow-sm bg-slate-900/80 text-white">
                      {p.category}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">{p.sku}</span>
                  </div>

                  {/* Product name */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2">
                  {/* Stock Level */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">{isRtl ? 'المخزون :' : 'Stock :'}</span>
                    
                    {p.stock === 0 ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black uppercase rounded shadow-xs border border-rose-200">
                        {isRtl ? 'منفذ' : 'Rupture'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black font-mono shadow-xs ${
                        isLowStock 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {p.stock} units
                      </span>
                    )}
                  </div>

                  {/* Pricing displays ONLY Sale Price to avoid sensitive buy prices */}
                  <div className="flex items-center justify-between bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{isRtl ? 'ثمن البيع :' : 'Prix Vente :'}</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-blue-900">{(p.sellPrice || 0).toFixed(2)} DH</span>
                  </div>
                </div>

                {/* Low Stock alerting indicator overlay */}
                {isLowStock && (
                  <div className={`absolute top-1.5 p-0.5 bg-amber-500 text-white rounded-full ${isRtl ? 'left-1.5' : 'right-1.5'} shadow`}>
                    <AlertTriangle className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-gray-300 mb-2" />
              <p className="text-sm font-semibold">{isRtl ? 'لم يثبت وجود أي منتج عثر عليه.' : 'Aucun produit trouvé dans ce rayon.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Cart checkout, Billing form (5 cols in desktop) */}
      <div className={`lg:col-span-5 flex-col gap-6 ${mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
        
        {/* Success dialog for the previous transaction, ready to trigger print action */}
        {lastCompletedInvoice && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <TicketCheck className="w-6 h-6" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">{t.paymentDone}</h4>
                <p className="text-xxs text-emerald-700 font-mono mt-0.5">ID: {lastCompletedInvoice.invoiceNumber}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onViewInvoice(lastCompletedInvoice)}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 shadow"
              >
                {isRtl ? 'طباعة الوصل الحالي' : 'Imprimer Ticket Direct'}
              </button>
              <button
                onClick={() => setLastCompletedInvoice(null)}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-extrabold transition"
              >
                {isRtl ? 'إخفاء' : 'Fermer'}
              </button>
            </div>
          </div>
        )}

        {/* Ticket calculation box */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col max-h-[80vh]">
          
          {/* Header */}
          <div className="px-5 py-4.5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span>{t.cart}</span>
            </h3>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xxs font-extrabold rounded-md font-mono">
              {cart.reduce((sum, item) => sum + item.qty, 0)} items
            </span>
          </div>

          {/* Cart ledger lists */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[220px]">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-3 justify-between items-center text-xs">
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-gray-900 truncate">{item.product.name}</h4>
                  <p className="text-xxs text-gray-400 font-mono">
                    {(item.product.sellPrice || 0).toFixed(2)} DH / unit
                  </p>
                </div>

                {/* Qty action adjusters */}
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                  <button
                    onClick={() => decrementQty(item.product.id)}
                    className="p-1 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-black text-gray-800 text-xs font-mono">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => incrementQty(item.product.id, item.product.stock)}
                    className="p-1 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right w-24">
                  <span className="font-black text-gray-900 font-mono">
                    {(item.product.sellPrice * item.qty).toFixed(2)} DH
                  </span>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="p-1.5 hover:bg-red-50 text-red-400 hover:text-red-700 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-12">
                <ShoppingCart className="w-10 h-10 mb-2 stroke-1 text-gray-300" />
                <p className="text-xxs font-semibold max-w-[200px] leading-relaxed">
                  {t.emptyCart}
                </p>
              </div>
            )}
          </div>

          {/* Checkout billing inputs */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-4">
            
            <form onSubmit={handleValidateSale} className="space-y-4 text-xs font-semibold">
              
              {/* Client Picker */}
              <div className="space-y-1.5">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{t.selectClient}</label>
                <div className="flex gap-2">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="">-- {isRtl ? 'زبون عابر (صندوق)' : 'Client de Passage (Walk-in)'} --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Status (Credit & Debt Management controls) */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-gray-150">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusSelect('paid');
                      setAmountPaidUpfront(0);
                    }}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-md transition-all ${
                      paymentStatusSelect === 'paid' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {isRtl ? 'خالص بالكامل' : 'Payé complet'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusSelect('unpaid');
                      setAmountPaidUpfront(0);
                    }}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-md transition-all ${
                      paymentStatusSelect === 'unpaid' 
                        ? 'bg-rose-600 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {isRtl ? 'دين بالكامل' : 'Tout à Crédit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusSelect('partial');
                      setAmountPaidUpfront(Math.floor(totalAmount / 2));
                    }}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-md transition-all ${
                      paymentStatusSelect === 'partial' 
                        ? 'bg-amber-500 text-white shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {isRtl ? 'دفعة + دين متبقي' : 'Paiement Partiel'}
                  </button>
                </div>

                {paymentStatusSelect === 'partial' && (
                  <div className="pt-2">
                    <label className="text-[10px] text-amber-800 block mb-1 font-bold">
                      {isRtl ? 'المبلغ المؤدى نقداً مسبقاً (درهم) :' : 'Montant payé d\'avance (DH) :'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={totalAmount - 1}
                      value={amountPaidUpfront || ''}
                      onChange={(e) => setAmountPaidUpfront(Number(e.target.value))}
                      placeholder="0.00 DH"
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isRtl ? 'الباقي كدين على ذمة الزبون :' : 'Reste dû en crédit :'} <span className="font-extrabold text-blue-950">{(totalAmount - amountPaidUpfront).toFixed(2)} DH</span>
                    </p>
                  </div>
                )}
                {paymentStatusSelect === 'unpaid' && (
                  <p className="text-[10px] text-rose-700 font-medium mt-1">
                    {isRtl ? 'سيتم قيد إجمالي المبلغ كدين مستحق :' : 'Totalité portée en ardoise client :'} <span className="font-extrabold font-mono">{totalAmount.toFixed(2)} DH</span>
                  </p>
                )}
              </div>

              {/* Discounts Inputs */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wide">{t.discountPlh}</label>
                <input
                  type="number"
                  min="0"
                  max={subtotal > 0 ? subtotal : 9999}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder="0.00 DH"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#22c55e] font-mono font-bold"
                />
              </div>

              {/* Summary Calculation display ledger */}
              <div className="border-t border-dashed border-gray-200 pt-3 space-y-2 font-mono text-xs">
                {discountValue > 0 && (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>{isRtl ? 'تخفيض فوري :' : 'Marge de Remise :'}</span>
                    <span>-{discountValue.toFixed(2)} DH</span>
                  </div>
                )}
                {taxSum > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>TVA :</span>
                    <span>+{taxSum.toFixed(2)} DH</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-lg font-black text-emerald-700 leading-none">
                  <span>{isRtl ? 'المجموع المستحق :' : 'Net à Payer :'}</span>
                  <span>{totalAmount.toFixed(2)} DH</span>
                </div>
              </div>

              {/* Validation errors/warnings */}
              {checkoutError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-[11px] font-black flex items-start gap-2 shadow-sm animate-pulse">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{checkoutError}</span>
                </div>
              )}
              {posWarning && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-[11px] font-black flex items-start gap-2 shadow-sm animate-pulse">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{posWarning}</span>
                </div>
              )}

              {/* Action checkout button */}
              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 cursor-pointer font-bold uppercase transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{t.checkout}</span>
              </button>

            </form>
          </div>

        </div>

      </div>

    </div>
    </div>
  );
}
