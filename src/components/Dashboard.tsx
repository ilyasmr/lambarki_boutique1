import React from 'react';
import { Invoice, Product, Client, SystemActivity } from '../types';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  TrendingUp, 
  Coins, 
  Users2, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingDown, 
  ShieldAlert, 
  Sparkles,
  ShoppingBag,
  BellRing,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus, 
  UserMinus, 
  UserCheck, 
  RefreshCw, 
  Receipt,
  Clock,
  Activity,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';

interface DashboardProps {
  invoices: Invoice[];
  products: Product[];
  clients: Client[];
  activities?: SystemActivity[];
  lang: 'fr' | 'ar';
  onViewInvoice: (invoice: Invoice) => void;
  setActiveTab: (tab: string) => void;
  setShowLowStockOnly?: (val: boolean) => void;
  onDeleteActivity?: (id: string) => void;
  onEditActivity?: (id: string, descriptionAr: string, descriptionFr: string) => void;
}

export default function Dashboard({ 
  invoices, 
  products, 
  clients, 
  activities = [],
  lang, 
  onViewInvoice,
  setActiveTab,
  setShowLowStockOnly,
  onDeleteActivity,
  onEditActivity
}: DashboardProps) {
  
  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  const [filterDate, setFilterDate] = React.useState('');
  const [activityFilter, setActivityFilter] = React.useState('all');
  const [selectedActivityForDetails, setSelectedActivityForDetails] = React.useState<any | null>(null);

  const [editingActivity, setEditingActivity] = React.useState<any | null>(null);
  const [editDescAr, setEditDescAr] = React.useState('');
  const [editDescFr, setEditDescFr] = React.useState('');

  const filteredActivities = React.useMemo(() => {
    let filtered = activities;
    if (filterDate) {
      filtered = filtered.filter(act => act.date && act.date.startsWith(filterDate));
    }
    if (activityFilter !== 'all') {
      filtered = filtered.filter(act => {
        if (activityFilter === 'sales') return ['sale', 'invoice_edit', 'invoice_delete'].includes(act.type);
        if (activityFilter === 'clients') return ['client_add', 'client_edit', 'client_delete', 'payment'].includes(act.type);
        if (activityFilter === 'products') return ['product_add', 'product_edit', 'product_delete', 'stock_edit'].includes(act.type);
        if (activityFilter === 'cash') return ['withdraw_add', 'withdraw_edit', 'withdraw_delete'].includes(act.type);
        return true;
      });
    }
    return filtered;
  }, [activities, filterDate, activityFilter]);

  // Calculations for KPI Cards
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const revenueTotal = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const profitTotal = paidInvoices.reduce((sum, inv) => sum + inv.profit, 0);
  const salesCount = paidInvoices.length;
  
  const activeClientsCount = clients.filter(c => c.totalSpent > 0).length;

  // Stock Alert calculation
  const lowStockProducts = products.filter(p => p.stock <= p.minStockAlert);

  // Chart source data computation: Group by invoice date (e.g. Day)
  const chartData = React.useMemo(() => {
    const dailyMap: Record<string, { date: string; displayDate: string; total: number; profit: number }> = {};
    
    // Default fallback dates for visual richness if invoices are empty
    const last7Days = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (5 - i));
      return d;
    });

    last7Days.forEach(date => {
      const iso = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short' });
      dailyMap[iso] = { date: iso, displayDate: label, total: 0, profit: 0 };
    });

    // Feed with real invoices
    paidInvoices.forEach(inv => {
      const isoDate = inv.date.split('T')[0];
      if (dailyMap[isoDate]) {
        dailyMap[isoDate].total += inv.total;
        dailyMap[isoDate].profit += inv.profit;
      } else {
        const formatted = new Date(inv.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short' });
        dailyMap[isoDate] = { 
          date: isoDate, 
          displayDate: formatted, 
          total: inv.total, 
          profit: inv.profit 
        };
      }
    });

    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [paidInvoices, lang]);

  // Top Selling Products Calculation
  const topProducts = React.useMemo(() => {
    const productSalesMap: Record<string, { name: string; qty: number; totalRev: number }> = {};
    
    paidInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.name, qty: 0, totalRev: 0 };
        }
        productSalesMap[item.productId].qty += item.qty;
        productSalesMap[item.productId].totalRev += (item.qty * item.sellPrice);
      });
    });

    return Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [paidInvoices]);

  // Check alerts: identifying checks reaching or past expiration date
  const checkAlerts = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const alerts: Array<{
      client: typeof clients[0];
      check: { id: string; amount: number; entryDate: string; expiryDate: string };
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
            const isExpiringSoon = diffDays > 0 && diffDays <= 7;
            
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

  return (
    <div className="space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Alert Banner for Expired/Expiring Postal Checks */}
      {checkAlerts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5.5 h-5.5 text-amber-600 animate-bounce" />
            <div>
              <h4 className="text-sm font-black text-amber-955 leading-none">
                {isRtl ? 'تنبيه: شيكات ضمان بريدية مستحقة الصرف أو منتهية الصلاحية!' : 'Attention : Chèques de garantie échus ou arrivant à expiration !'}
              </h4>
              <p className="text-xs text-amber-700/90 mt-1 font-bold">
                {isRtl 
                  ? 'يرجى مراجعة الزبائن لتسوية ديونهم أو إيداع شيكاتهم لانتهاء تاريخ صلاحيتها كضمان.'
                  : 'Veuillez contacter ces clients pour régulariser ou déposer les chèques.'
                }
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {checkAlerts.map(({ client, check, daysLeft, isExpired }) => (
              <div 
                key={check.id}
                onClick={() => setActiveTab('clients')}
                className="bg-white hover:bg-amber-50/20 cursor-pointer p-3.5 rounded-xl border border-amber-100/60 shadow-xxs transition-all flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 group-hover:text-blue-700 transition truncate">{client.name}</p>
                  <p className="text-[10px] font-mono text-gray-500 font-bold">
                    {isRtl ? 'قيمة الشيك:' : 'Montant:'} <span className="font-black text-indigo-700">{check.amount?.toFixed(2)} DH</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {isExpired ? (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-[9px] font-black text-rose-700 uppercase animate-pulse">
                      {isRtl ? 'منتهي ⚠️' : 'Expiré ⚠️'}
                    </span>
                  ) : (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-[9px] font-black text-amber-800">
                      {isRtl ? `متبقي ${daysLeft} أيام` : `Dans ${daysLeft} j`}
                    </span>
                  )}
                  <p className="text-[9px] text-gray-400 font-bold mt-1 font-mono">{check.expiryDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Top 4 Key Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.revenue}</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight truncate">
              {revenueTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm">DH</span>
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+14.2%</span>
            </span>
          </div>
          <span className="p-4 bg-blue-50 text-blue-600 rounded-2xl transition-transform duration-300 group-hover:scale-105">
            <Coins className="w-6 h-6" />
          </span>
        </div>

        {/* Profit Margin Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.profit}</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight truncate">
              {profitTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm">DH</span>
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{revenueTotal > 0 ? ((profitTotal / revenueTotal) * 100).toFixed(1) : 0}% net</span>
            </span>
          </div>
          <span className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl transition-transform duration-300 group-hover:scale-105">
            <TrendingUp className="w-6 h-6" />
          </span>
        </div>

        {/* Number of Orders / Tickets Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.totalSales}</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight truncate">
              {salesCount} <span className="text-xs font-normal text-gray-400">({isRtl ? 'فاتورة' : 'Factures'})</span>
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md mt-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isRtl ? 'نشط اليوم' : 'Commandes actives'}</span>
            </span>
          </div>
          <span className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl transition-transform duration-300 group-hover:scale-105">
            <ShoppingBag className="w-6 h-6" />
          </span>
        </div>

        {/* Active Clients Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.activeClients}</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tight truncate">
              {activeClientsCount} <span className="text-xs font-normal text-gray-400">/ {clients.length}</span>
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-md mt-1">
              <Users2 className="w-3.5 h-3.5" />
              <span>{isRtl ? 'ولاء عالي' : 'Portefeuille Tiers'}</span>
            </span>
          </div>
          <span className="p-4 bg-purple-50 text-purple-600 rounded-2xl transition-transform duration-300 group-hover:scale-105">
            <Users2 className="w-6 h-6" />
          </span>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Area Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-md font-bold text-gray-900">
                {isRtl ? 'مخطط سير العمليات وإجمالي الأرباح' : 'Évolution des Recettes & Chiffre d\'Affaires'}
              </h3>
              <p className="text-xs text-gray-500">{isRtl ? 'مقارنة بين إجمالي المبيعات مقابل صافي الأرباح المحصلة' : 'Suivi des revenus contre la marge bénéficière générée'}</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="displayDate" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f3f4f6', shadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                />
                <Area type="monotone" dataKey="total" name={isRtl ? 'المبيعات' : 'Ventes'} stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="profit" name={isRtl ? 'الأرباح' : 'Marges'} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-Selling Products Bar Stats (1/3 width) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-md font-bold text-gray-900 mb-1">
              {t.topSellingProducts}
            </h3>
            <p className="text-xs text-gray-500 mb-6">{isRtl ? 'المنتجات الدارجة بالأرقام والكميات' : 'Classement par quantité vendue'}</p>
          </div>

          {topProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs font-medium">{isRtl ? 'لا توجد بيانات مبيعات حالية' : 'Aucune vente enregistrée'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, idx) => {
                const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-amber-600', 'bg-purple-600'];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-900 truncate max-w-[160px]">{p.name}</span>
                      <span className="text-slate-500 font-mono">
                        {p.qty} {isRtl ? 'وحدات' : 'unités'}
                      </span>
                    </div>
                    
                    {/* Progress Bar emulation */}
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${colors[idx % colors.length]}`} 
                        style={{ width: `${Math.min(100, (p.qty / topProducts[0].qty) * 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xxs font-mono text-gray-400">Total: {p.totalRev.toFixed(0)} DH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Unified Recent Activity Log */}
      <div className="grid grid-cols-1 gap-6 pb-6">
        
        {/* Recent Activity Log (سجل آخر المستجدات) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>{isRtl ? 'أحدث المستجدات والأنشطة' : 'Activités & Mises à Jour'}</span>
                </h3>
                <p className="text-xs text-gray-500">
                  {isRtl 
                    ? 'متابعة تفصيلية وفورية لكافة إجراءات الإضافة، التعديل، الحذف، المبيعات وسجل المخزون.' 
                    : 'Suivi instantané des ventes, ajouts, modifications, suppressions et stocks.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                <div className="flex items-center bg-gray-100/50 p-1 rounded-xl">
                  {['all', 'sales', 'clients', 'products', 'cash'].map((filter) => {
                    const labelsAr: Record<string, string> = { all: 'الكل', sales: 'المبيعات', clients: 'الزبائن', products: 'المنتجات', cash: 'الصندوق' };
                    const labelsFr: Record<string, string> = { all: 'Tout', sales: 'Ventes', clients: 'Clients', products: 'Produits', cash: 'Caisse' };
                    return (
                      <button
                        key={filter}
                        onClick={() => setActivityFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-xxs font-bold transition-all ${
                          activityFilter === filter 
                            ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                      >
                        {isRtl ? labelsAr[filter] : labelsFr[filter]}
                      </button>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
                  />
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate('')}
                      className="text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/75 border border-rose-100 px-3 py-1.5 rounded-xl cursor-pointer transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs font-semibold">
                  {isRtl ? 'لا توجد أنشطة مسجلة.' : 'Aucune activité enregistrée.'}
                </div>
              ) : (
                filteredActivities.slice(0, filterDate ? 50 : 7).map((act) => {
                  const getMeta = (typeOfAct: string) => {
                    switch (typeOfAct) {
                      case 'sale':
                        return { icon: Receipt, bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-100', labelAr: 'عملية بيع', labelFr: 'Vente' };
                      case 'invoice_edit':
                        return { icon: Edit2, bgColor: 'bg-amber-100/70 text-amber-700 border-amber-200', labelAr: 'تعديل فاتورة', labelFr: 'Modif facture' };
                      case 'invoice_delete':
                        return { icon: Trash2, bgColor: 'bg-rose-50 text-rose-700 border-rose-100', labelAr: 'حذف فاتورة', labelFr: 'Suppr facture' };
                      case 'product_add':
                        return { icon: Plus, bgColor: 'bg-indigo-50 text-indigo-600 border-indigo-100', labelAr: 'إضافة منتج', labelFr: 'Ajout produit' };
                      case 'product_edit':
                        return { icon: Edit2, bgColor: 'bg-amber-50 text-amber-600 border-amber-100', labelAr: 'تعديل منتج', labelFr: 'Modif produit' };
                      case 'product_delete':
                        return { icon: Trash2, bgColor: 'bg-rose-50 text-rose-600 border-rose-100', labelAr: 'حذف منتج', labelFr: 'Suppr produit' };
                      case 'client_add':
                        return { icon: UserPlus, bgColor: 'bg-teal-50 text-teal-600 border-teal-100', labelAr: 'إضافة زبون', labelFr: 'Ajout client' };
                      case 'client_edit':
                        return { icon: UserCheck, bgColor: 'bg-sky-50 text-sky-600 border-sky-100', labelAr: 'تعديل زبون', labelFr: 'Modif client' };
                      case 'client_delete':
                        return { icon: UserMinus, bgColor: 'bg-red-50 text-red-600 border-red-100', labelAr: 'حذف زبون', labelFr: 'Suppr client' };
                      case 'stock_edit':
                        return { icon: RefreshCw, bgColor: 'bg-orange-50 text-orange-600 border-orange-100', labelAr: 'تغيير مخزون', labelFr: 'Stock' };
                      case 'withdraw_add':
                        return { icon: Coins, bgColor: 'bg-pink-50 text-pink-600 border-pink-100', labelAr: 'سحب نقدي', labelFr: 'Retrait' };
                      case 'withdraw_edit':
                        return { icon: Edit2, bgColor: 'bg-amber-50 text-amber-600 border-amber-100', labelAr: 'تعديل سحب', labelFr: 'Modif retrait' };
                      case 'withdraw_delete':
                        return { icon: Trash2, bgColor: 'bg-rose-50 text-rose-600 border-rose-100', labelAr: 'حذف سحب', labelFr: 'Suppr retrait' };
                      default:
                        return { icon: Activity, bgColor: 'bg-slate-50 text-slate-600 border-slate-100', labelAr: 'عملية عامة', labelFr: 'Système' };
                    }
                  };
                  const meta = getMeta(act.type);
                  const IconComp = meta.icon;
                  const formattedTime = (() => {
                    try {
                      const d = new Date(act.date);
                      return d.toLocaleTimeString(isRtl ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString(isRtl ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: 'short' });
                    } catch {
                      return act.date;
                    }
                  })();

                  return (
                    <div 
                      key={act.id} 
                      onClick={() => {
                        if (act.type === 'sale' && act.targetId) {
                          const invoiceToOpen = invoices.find(inv => inv.id === act.targetId || inv.invoiceNumber === act.targetId);
                          if (invoiceToOpen) onViewInvoice(invoiceToOpen);
                          else setSelectedActivityForDetails(act);
                        } else {
                          setSelectedActivityForDetails(act);
                        }
                      }}
                      className="group flex gap-3 text-xs items-start p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer shadow-none hover:shadow-sm"
                    >
                      <div className={`p-2.5 rounded-xl border flex-shrink-0 ${meta.bgColor}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-[10px] uppercase text-gray-500 tracking-wider">
                            {isRtl ? meta.labelAr : meta.labelFr}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1 shrink-0 font-mono font-medium">
                            <Clock className="w-3 h-3" />
                            {formattedTime}
                          </span>
                        </div>
                        <p className="text-gray-900 font-bold leading-relaxed mt-1 text-xs ltr:text-left rtl:text-right">
                          {isRtl ? act.descriptionAr : act.descriptionFr}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 ltr:text-left rtl:text-right">
                            <span>{isRtl ? `بواسطة: ${act.operator}` : `Par: ${act.operator}`}</span>
                            {act.targetId && act.targetId !== 'bulk' && (
                              <>
                                <span>•</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-blue-600 font-bold border border-slate-200/60">
                                  {act.targetId}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Edit / Delete actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingActivity(act);
                                setEditDescAr(act.descriptionAr || '');
                                setEditDescFr(act.descriptionFr || '');
                              }}
                              className="p-1.5 text-blue-650 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title={isRtl ? 'تعديل' : 'Modifier'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا النشاط؟' : 'Confirmer la suppression de cette activité ?')) {
                                  onDeleteActivity?.(act.id);
                                }
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title={isRtl ? 'حذف' : 'Supprimer'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Activity Details Modal */}
      {selectedActivityForDetails && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                {isRtl ? 'تفاصيل العملية' : "Détails de l'opération"}
              </h3>
              <button onClick={() => setSelectedActivityForDetails(null)} className="p-1.5 hover:bg-gray-200 rounded-lg transition cursor-pointer text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{isRtl ? 'الوصف' : 'Description'}</span>
                  <p className="text-sm font-bold text-gray-900 leading-relaxed">
                    {isRtl ? selectedActivityForDetails.descriptionAr : selectedActivityForDetails.descriptionFr}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-xxs">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{isRtl ? 'المنفذ' : 'Opérateur'}</span>
                  <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    {selectedActivityForDetails.operator}
                  </p>
                </div>
                
                <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-xxs">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{isRtl ? 'الوقت والتاريخ' : 'Date & Heure'}</span>
                  <p className="text-xs font-black text-gray-800 font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    {(() => {
                      try {
                        const d = new Date(selectedActivityForDetails.date);
                        return d.toLocaleTimeString(isRtl ? 'ar-MA' : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString(isRtl ? 'ar-MA' : 'fr-FR', { day: '2-digit', month: '2-digit' });
                      } catch {
                        return selectedActivityForDetails.date;
                      }
                    })()}
                  </p>
                </div>
              </div>

              {selectedActivityForDetails.targetId && selectedActivityForDetails.targetId !== 'bulk' && (
                <div className="bg-white border border-gray-100 p-3 rounded-xl shadow-xxs">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{isRtl ? 'المرجع / المعرف' : 'Référence / ID'}</span>
                  <p className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md inline-block">
                    {selectedActivityForDetails.targetId}
                  </p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setSelectedActivityForDetails(null)} 
                className="px-6 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-xl font-bold cursor-pointer transition shadow-sm"
              >
                {isRtl ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="text-sm font-black text-gray-900">
                {isRtl ? 'تعديل وصف النشاط' : "Modifier la description de l'activité"}
              </h3>
              <button onClick={() => setEditingActivity(null)} className="p-1 hover:bg-gray-200 rounded-lg transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                onEditActivity?.(editingActivity.id, editDescAr, editDescFr);
                setEditingActivity(null);
              }}
              className="p-6 space-y-4 text-xs font-semibold text-left"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider block text-start">{isRtl ? 'الوصف بالعربية *' : 'Description en Arabe *'}</label>
                <input
                  type="text"
                  required
                  value={editDescAr}
                  onChange={(e) => setEditDescAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider block text-start">{isRtl ? 'الوصف بالفرنسية *' : 'Description en Français *'}</label>
                <input
                  type="text"
                  required
                  value={editDescFr}
                  onChange={(e) => setEditDescFr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition">
                  {isRtl ? 'حفظ التعديلات' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setEditingActivity(null)} className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold cursor-pointer">
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
