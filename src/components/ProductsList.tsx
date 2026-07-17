import React from 'react';
import { Product, User, StockMovement } from '../types';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Grid, 
  List, 
  Barcode, 
  ArrowUpDown,
  X,
  PackageCheck,
  Settings,
  Check,
  Tag,
  History,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface ProductsListProps {
  products: Product[];
  lang: 'fr' | 'ar';
  onAddProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  showLowStockOnly?: boolean;
  setShowLowStockOnly?: (value: boolean) => void;
  prefilledSearch?: string;
  onRenameCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (categoryName: string) => void;
  currentUser?: User;
  movements?: StockMovement[];
  onUpdateStock?: (productId: string, newQty: number, movement: StockMovement) => void;
  onUpdateStocksBulk?: (updates: { productId: string; newQty: number; movement: StockMovement }[]) => void;
  onDeleteMovement?: (id: string) => void;
  onEditMovement?: (id: string, qty: number, reason: string) => void;
}



export default function ProductsList({ 
  products, 
  lang, 
  onAddProduct, 
  onEditProduct, 
  onDeleteProduct,
  showLowStockOnly = false,
  setShowLowStockOnly,
  prefilledSearch = '',
  onRenameCategory,
  onDeleteCategory,
  currentUser,
  movements = [],
  onUpdateStock,
  onUpdateStocksBulk,
  onDeleteMovement,
  onEditMovement
}: ProductsListProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];
  const isCashier = currentUser?.role === 'cashier';

  // States
    const [isStockModalOpen, setIsStockModalOpen] = React.useState(false);
  const [stockFormType, setStockFormType] = React.useState<'in' | 'out'>('in');
  const [stockFormReason, setStockFormReason] = React.useState('');
  const [bulkItems, setBulkItems] = React.useState<{ id: string, productId: string, qty: number }[]>([{ id: 'bulk-0', productId: '', qty: 1 }]);

const [activeTab, setActiveTab] = React.useState<'database' | 'history'>('database');
  const [filterType, setFilterType] = React.useState<'all' | 'in' | 'out'>('all');
  const [viewMode, setViewMode] = React.useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = React.useState(prefilledSearch);

  React.useEffect(() => {
    if (prefilledSearch !== undefined) {
      setSearchTerm(prefilledSearch);
    }
  }, [prefilledSearch]);

  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'name' | 'stock' | 'price'>('name');

  // Category management states
  const [isManageModalOpen, setIsManageModalOpen] = React.useState(false);
  const [editingCategoryOldName, setEditingCategoryOldName] = React.useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = React.useState('');
  const [showCatDropdown, setShowCatDropdown] = React.useState(false);
  const [categoryToDelete, setCategoryToDelete] = React.useState<string | null>(null);
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);

  // Form states (Modal)
  const [isOpenModal, setIsOpenModal] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  const [formName, setFormName] = React.useState('');
  const [formSku, setFormSku] = React.useState('');
  const [formBuyPrice, setFormBuyPrice] = React.useState(0);
  const [formSellPrice, setFormSellPrice] = React.useState(0);
  const [formCategory, setFormCategory] = React.useState('');
  const [formStock, setFormStock] = React.useState(0);
  const [formMinStock, setFormMinStock] = React.useState(5);
  const [formDesc, setFormDesc] = React.useState('');

  // Extract categories dynamically
  const categories = React.useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return Array.from(list);
  }, [products]);

  // Handle Edit click
  const handleEditClick = (p: Product) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBuyPrice(p.buyPrice);
    setFormSellPrice(p.sellPrice);
    setFormCategory(p.category);
    setFormStock(p.stock);
    setFormMinStock(p.minStockAlert);
    setFormDesc(p.description);
    setIsOpenModal(true);
  };

  // Open New Form
  const handleCreateNewClick = () => {
    setEditingId(null);
    setFormName('');
    // Auto generate high accuracy EAN Barcode
    setFormSku(`611${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setFormBuyPrice(10);
    setFormSellPrice(18);
    setFormCategory(categories[0] || 'Alimentation');
    setFormStock(20);
    setFormMinStock(5);
    setFormDesc('');
    setIsOpenModal(true);
  };

  // Submit product Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formSku.trim() || !formCategory.trim()) {
      alert(isRtl ? 'يرجى ملء جميع الحقول المطلوبة الأساسية.' : 'Saisie invalide ou champs vides requis.');
      return;
    }

    const isDuplicateSku = products.some(p => p.sku.trim() === formSku.trim() && p.id !== editingId);
    if (isDuplicateSku) {
      alert(isRtl 
        ? 'خطأ: هذا الرمز الشريطي (الباركود) مستخدم بالفعل لمنتج آخر!' 
        : 'Erreur: Ce code à barre (SKU) est déjà utilisé par un autre produit !'
      );
      return;
    }

    const isDuplicateName = products.some(p => p.name.trim().toLowerCase() === formName.trim().toLowerCase() && p.id !== editingId);
    if (isDuplicateName) {
      alert(isRtl 
        ? 'خطأ: هذا المنتج مسجل مسبقاً بنفس الاسم!' 
        : 'Erreur: Ce produit est déjà enregistré avec ce nom !'
      );
      return;
    }

    if (formSellPrice < formBuyPrice) {
      const ok = window.confirm(isRtl 
        ? 'تنبيه: سعر البيع أقل من سعر الشراء (خسارة محتومة). هل ترغب بالمضي قدماً؟' 
        : 'Attention: Le prix de vente est inférieur au prix de revient d\'achat. Continuer quand même ?'
      );
      if (!ok) return;
    }

    const payload: Product = {
      id: editingId || `prod-${Date.now()}`,
      name: formName,
      sku: formSku,
      buyPrice: Number(formBuyPrice),
      sellPrice: Number(formSellPrice),
      category: formCategory,
      stock: Number(formStock),
      minStockAlert: Number(formMinStock),
      description: formDesc,
      image: ''
    };

    if (editingId) {
      onEditProduct(payload);
    } else {
      onAddProduct(payload);
    }
    setIsOpenModal(false);
  };

    const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = bulkItems.filter(i => i.productId && i.qty > 0);
    if (validItems.length === 0) {
      alert(isRtl ? 'يرجى تحديد سلعة واحدة على الأقل بكمية صحيحة.' : 'Veuillez sélectionner au moins un article avec quantité valide.');
      return;
    }

    if (stockFormType === 'out') {
      for (const item of validItems) {
        const p = products.find(x => x.id === item.productId);
        if (p && p.stock - item.qty < 0) {
          alert(isRtl ? `الكمية المسحوبة أكبر من المخزون المتوفر للمنتج: ${p.name}!` : `Stock insuffisant pour: ${p.name}!`);
          return;
        }
      }
    }

    const currentBatchId = `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const updates = validItems.map(item => {
      const p = products.find(x => x.id === item.productId)!;
      const newQty = stockFormType === 'in' ? p.stock + item.qty : p.stock - item.qty;
      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.random()}`,
        productId: p.id,
        productName: p.name,
        type: stockFormType,
        qty: item.qty,
        date: new Date().toISOString(),
        reason: stockFormReason || (stockFormType === 'in' ? (isRtl ? 'واردات متعددة' : 'Entrées groupées') : (isRtl ? 'تسوية مخزون جماعية' : 'Ajustement groupé')),
        operator: currentUser?.name || 'Admin',
        batchId: currentBatchId
      };
      return { productId: p.id, newQty, movement };
    });

    if (onUpdateStocksBulk) {
      onUpdateStocksBulk(updates);
    } else if (onUpdateStock) {
      updates.forEach(u => onUpdateStock(u.productId, u.newQty, u.movement));
    }
    
    setIsStockModalOpen(false);
    setBulkItems([{ id: `bulk-${Date.now()}`, productId: '', qty: 1 }]);
    setStockFormReason('');
  };

  const addBulkRow = () => setBulkItems(prev => [...prev, { id: `bulk-${Date.now()}`, productId: '', qty: 1 }]);
  const updateBulkRow = (id: string, field: 'productId' | 'qty', value: any) => setBulkItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeBulkRow = (id: string) => setBulkItems(prev => prev.filter(item => item.id !== id));

const handleInlineStockUpdate = (p: Product, diff: number) => {
    if (p.stock + diff < 0) return;
    if (!onUpdateStock) return;
    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random()}`,
      productId: p.id,
      productName: p.name,
      type: diff > 0 ? 'in' : 'out',
      qty: Math.abs(diff),
      date: new Date().toISOString(),
      reason: isRtl ? 'تعديل سريع من الواجهة' : 'Ajustement rapide',
      operator: currentUser?.name || 'Admin',
      batchId: `quick-${Date.now()}`
    };
    onUpdateStock(p.id, p.stock + diff, movement);
  };

  // Search product List
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku || '').includes(searchTerm);
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesLowStock = !showLowStockOnly || p.stock <= p.minStockAlert;
      return matchesSearch && matchesCategory && matchesLowStock;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return a.stock - b.stock;
      if (sortBy === 'price') return a.sellPrice - b.sellPrice;
      return 0;
    });
  }, [products, searchTerm, categoryFilter, sortBy, showLowStockOnly]);

  return (
    <div className="space-y-6">
      
      {/* INVENTORY HUB TABS */}
      <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap flex-1 justify-center ${activeTab === 'database' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Grid className="w-4 h-4" />
          {isRtl ? 'قاعدة المنتجات' : 'Base Produits'}
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            setFilterType('all');
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition whitespace-nowrap flex-1 justify-center ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <History className="w-4 h-4" />
          {isRtl ? 'سجل حركة المخزون' : 'Historique Stock'}
        </button>
      </div>

      {activeTab === 'database' && (
        <>
          {/* Search and Filters Layout toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Left Side: Prominent Dynamic Alert/Filter for critical stocks (Swapped to the left) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowLowStockOnly?.(!showLowStockOnly)}
              className={`flex items-center gap-3 px-4.5 py-3 rounded-xl text-xs font-black border transition-all duration-300 shadow-sm text-right ${
                showLowStockOnly 
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse scale-[1.02] shadow-rose-100' 
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900 shadow-amber-50'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 ${showLowStockOnly ? 'text-rose-600' : 'text-amber-750 animate-bounce'}`} />
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-extrabold leading-none mb-1">
                  {isRtl ? 'مستويات المخزون' : 'Niveaux de Stock'}
                </span>
                <span className="font-extrabold text-xs block leading-none">
                  {isRtl ? '⚠️ السلع القريبة من النفاد' : '⚠️ Alerte Stock Critique'}
                </span>
              </div>
              {showLowStockOnly && (
                <span 
                  onClick={(e) => { e.stopPropagation(); setShowLowStockOnly?.(false); }} 
                  className="w-5 h-5 rounded-full bg-rose-250/25 text-rose-800 hover:bg-rose-300 transition-all flex items-center justify-center font-black text-[10px] cursor-pointer"
                >
                  ✕
                </span>
              )}
            </button>
          </div>

          {/* Right Side: Search input & filter selectors aligned beautifully */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            
            {/* Search Input Box */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={isRtl ? 'ابحث باسم المنتج أو الباركود EAN...' : 'Chercher par nom, code...'}
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
                  <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                </button>
              )}
            </div>

            {/* Category selection */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-700 outline-none cursor-pointer text-xs font-extrabold border-none p-0 focus:ring-0"
              >
                <option value="all">{isRtl ? 'القسم: الكل' : 'Tous les Rayons'}</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Manage categories button */}
            {!isCashier && (
              <button
                type="button"
                onClick={() => setIsManageModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-black shrink-0 transition"
                title={isRtl ? "إدارة الأقسام (تعديل أو حذف)" : "Gérer les rayons (Modifier ou Supprimer)"}
              >
                <Settings className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isRtl ? "إدارة الأقسام" : "Gérer Rayons"}</span>
              </button>
            )}

            {/* Sort selection */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-700 outline-none cursor-pointer text-xs font-extrabold border-none p-0 focus:ring-0"
              >
                <option value="name">{isRtl ? 'ترتيب: الاسم' : 'Trier par: Nom'}</option>
                <option value="stock">{isRtl ? 'ترتيب: المخزن' : 'Trier par: Stock'}</option>
                <option value="price">{isRtl ? 'ترتيب: السعر' : 'Trier par: Prix'}</option>
              </select>
            </div>

            {/* Layout Toggles */}
            <div className="flex gap-1 p-1 bg-slate-100 border border-slate-250 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-650 shadow-sm' : 'text-slate-400 hover:text-slate-800'}`}
                title={isRtl ? 'شبكة' : 'Grille'}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-emerald-650 shadow-sm' : 'text-slate-400 hover:text-slate-800'}`}
                title={isRtl ? 'جدول' : 'Tableau'}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Create Add core Catalog */}
            {!isCashier && (
              <button
                onClick={handleCreateNewClick}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'بطاقة منتج جديدة' : 'Nouveau Produit'}</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* RENDER COMPONENT: VIEW MAPPING (Grid vs Table) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const isLowStock = p.stock <= p.minStockAlert;
            return (
              <div 
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-lg hover:border-blue-200 transition relative duration-200 group"
              >
                <div>
                  {/* Product Header with category badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-md shadow-sm bg-slate-900/80 text-white`}>
                      {p.category}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 font-bold">{p.sku}</span>
                  </div>

                  {/* Product name and barcode */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-gray-900 leading-snug line-clamp-2">{p.name}</h4>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                  {/* Stock Level */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold">{isRtl ? 'المخزون :' : 'Stock :'}</span>
                    
                    {p.stock === 0 ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black uppercase rounded-md shadow-xs border border-rose-200">
                        {isRtl ? 'منفذ بالكامل' : 'Rupture'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-black font-mono shadow-xs ${
                        isLowStock 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                      }`}>
                        {p.stock} units
                      </span>
                    )}
                  </div>

                  {/* Pricing displays ONLY Sale Price to avoid displaying buy sensitive costs here */}
                  <div className="flex items-center justify-between bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{isRtl ? 'ثمن البيع :' : 'Prix Vente :'}:</span>
                    <span className="font-mono text-xs font-black text-blue-900">{(p.sellPrice || 0).toFixed(2)} DH</span>
                  </div>

                  {/* Actions (Pencil is "ta3dil" / edit where they inspect everything) */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(p)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white border border-slate-200 text-slate-700 font-bold text-xxs rounded-lg transition-all flex items-center justify-center gap-1 group/btn cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 text-slate-400 group-hover/btn:text-white" />
                      <span>{t.edit}</span>
                    </button>
                    {!isCashier && (
                      <button
                        onClick={() => setProductToDelete(p)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg border border-rose-100/50 transition-all flex items-center justify-center animate-pulse cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Low Stock alerting indicator overlay */}
                {isLowStock && (
                  <div className={`absolute top-2.5 p-1 bg-amber-500 text-white rounded-full ${isRtl ? 'left-2.5' : 'right-2.5'} shadow`}>
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Classic Business Table Layout */
        <div className="md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
          <div className="overflow-x-hidden md:overflow-x-auto">
            <table className="w-full text-left block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-bold uppercase text-gray-400">
                  <th className="py-3 px-4">{isRtl ? 'المنتج' : 'Désignation'}</th>
                  <th className="py-3 px-4">{isRtl ? 'الباركود' : 'Code SKU'}</th>
                  <th className="py-3 px-4">{isRtl ? 'التصنيف' : 'Rayon / Catégorie'}</th>
                  <th className="py-3 px-4 text-right">{isRtl ? 'سعر البيع' : 'P. Vente'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'الكمية' : 'Quantité'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'إجراء' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group md:divide-y md:divide-gray-50 space-y-3 md:space-y-0 pb-4 md:pb-0">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="block md:table-row text-xs hover:bg-gray-50/40 transition p-4 md:p-0 bg-white rounded-2xl shadow-sm border border-gray-100 md:border-none md:shadow-none md:rounded-none md:bg-transparent relative">
                      <td className="block md:table-cell py-1 md:py-4 md:px-4">
                        <p className="font-bold text-gray-900 text-[15px] md:text-sm">{p.name}</p>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 md:px-4 font-mono text-slate-500 border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-4">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'الباركود' : 'Code SKU'}</span>
                        <span className="text-sm md:text-xs">{p.sku}</span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 md:px-4 font-semibold border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'التصنيف' : 'Catégorie'}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                          {p.category}
                        </span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 md:px-4 text-right font-mono font-bold text-blue-900 border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'سعر البيع' : 'Prix Vente'}</span>
                        <span className="text-[14px] md:text-[12px]">{(p.sellPrice || 0).toFixed(2)} DH</span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 md:px-4 text-center border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'الكمية' : 'Qté'}</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-bold ${
                          p.stock === 0 
                            ? 'bg-rose-100 text-rose-800' 
                            : isLowStock 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="flex md:table-cell py-3 md:py-4 md:px-4 text-center border-t border-dashed border-gray-100 md:border-none bg-slate-50 md:bg-transparent rounded-xl mt-3 md:mt-0 px-3 md:px-4">
                        <div className="flex gap-2 justify-center w-full">
                          <button
                            onClick={() => handleEditClick(p)}
                            className="flex-1 md:flex-none p-2 px-4 bg-white md:bg-gray-50 hover:bg-gray-150 border border-gray-200 md:border-gray-105 text-gray-650 rounded-lg text-[11px] md:text-[10px] font-bold transition duration-150 shadow-xxs md:shadow-none flex justify-center items-center gap-1.5"
                          >
                            <Edit3 className="w-4 h-4 md:hidden" />
                            <span>{t.edit}</span>
                          </button>
                          {!isCashier && (
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="flex-1 md:flex-none p-2 px-4 bg-white md:bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-150 md:border-rose-100/50 transition duration-150 shadow-xxs md:shadow-none flex justify-center items-center gap-1.5"
                            >
                              <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                              <span className="md:hidden text-[11px] font-bold">{t.delete || 'Delete'}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}\n\n
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-6 animate-fade-in">
          {/* History Header & Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
                {isRtl ? 'سجل حركة المخزون' : 'Historique des Mouvements'}
              </h2>
              
              {!isCashier && (
                <button
                  onClick={() => setIsStockModalOpen(true)}
                  className="hidden lg:flex px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all items-center justify-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{isRtl ? 'تسجيل دخول/خروج مخزون' : 'Nouveau Mouvement'}</span>
                </button>
              )}
            <div className="flex gap-2 w-full lg:w-auto overflow-x-auto no-scrollbar">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                {isRtl ? 'الكل' : 'Tout'}
              </button>
              <button
                onClick={() => setFilterType('in')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${filterType === 'in' ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                {isRtl ? 'دخول (+)' : 'Entrée (+)'}
              </button>
              <button
                onClick={() => setFilterType('out')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${filterType === 'out' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                {isRtl ? 'خروج (-)' : 'Sortie (-)'}
              </button>
            </div>
          </div>

          {/* History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className={`py-3 px-4 font-bold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className={`py-3 px-4 font-bold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'المنتج' : 'Produit'}</th>
                  <th className="py-3 px-4 font-bold text-center">{isRtl ? 'النوع' : 'Type'}</th>
                  <th className="py-3 px-4 font-bold text-center">{isRtl ? 'الكمية' : 'Qté'}</th>
                  <th className={`py-3 px-4 font-bold ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'السبب / الملاحظة' : 'Motif'}</th>
                  <th className="py-3 px-4 font-bold text-center">{isRtl ? 'المسؤول' : 'Opérateur'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {movements
                  .filter(m => filterType === 'all' || m.type === filterType)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((m, idx, arr) => {
                    const prevItem = arr[idx - 1];
                    const isFirstInBatch = m.batchId && m.batchId.startsWith('bulk-') && (!prevItem || prevItem.batchId !== m.batchId);
                    
                    return (
                      <React.Fragment key={m.id}>
                        {isFirstInBatch && (
                          <tr className="bg-blue-50/20 border-y border-blue-100/40">
                            <td colSpan={6} className="py-2 px-4 text-xs font-black text-blue-700 tracking-wider">
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                {isRtl ? 'عملية جماعية (دخول/خروج لعدة سلع)' : 'Opération groupée (Multi-articles)'}
                              </span>
                            </td>
                          </tr>
                        )}
                        <tr className={`hover:bg-slate-50/50 transition ${m.batchId?.startsWith('bulk-') ? 'border-l-4 border-l-blue-400 bg-blue-50/5' : ''}`}>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {new Date(m.date).toLocaleString(isRtl ? 'ar-MA' : 'fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{m.productName}</td>
                      <td className="py-3 px-4 text-center">
                        {m.type === 'in' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                            <ArrowDownLeft className="w-3 h-3" /> {isRtl ? 'دخول' : 'Entrée'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider">
                            <ArrowUpRight className="w-3 h-3" /> {isRtl ? 'خروج' : 'Sortie'}
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-center font-black font-mono ${m.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.type === 'in' ? '+' : '-'}{m.qty}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-medium max-w-[200px] truncate" title={m.reason}>
                        {m.reason || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                          {m.operator || 'Admin'}
                        </span>
                      </td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      {isRtl ? 'لا يوجد أي حركات مسجلة حالياً.' : 'Aucun mouvement enregistré.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      \n\n      
      {/* MODAL: STOCK MOVEMENT */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                {isRtl ? 'تسجيل حركة مخزون' : 'Mouvement de Stock'}
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleStockSubmit} className="p-6 space-y-5">
              
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setStockFormType('in')}
                  className={`py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all border ${
                    stockFormType === 'in' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  {isRtl ? 'دخول (+)' : 'Entrée'}
                </button>
                <button
                  type="button"
                  onClick={() => setStockFormType('out')}
                  className={`py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-all border ${
                    stockFormType === 'out' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  {isRtl ? 'خروج (-)' : 'Sortie'}
                </button>
              </div>

              <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xxs uppercase text-gray-400 font-bold tracking-wider mb-2">
                  <span>{isRtl ? 'المنتجات' : 'Produits'}</span>
                  <span className="w-20 text-center">{isRtl ? 'الكمية' : 'Quantité'}</span>
                </div>
                
                {bulkItems.map((item) => (
                  <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => updateBulkRow(item.id, 'productId', e.target.value)}
                      className={`flex-1 min-w-0 px-2 py-2 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-bold text-slate-800 ${isRtl ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">-- {isRtl ? 'اختر المنتج' : 'Choisir produit'} --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.qty || ''}
                      onChange={(e) => updateBulkRow(item.id, 'qty', Number(e.target.value))}
                      className="w-16 px-1.5 py-2 bg-white rounded-lg border border-gray-200 text-center font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={bulkItems.length <= 1}
                      onClick={() => removeBulkRow(item.id)}
                      className={`p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-all ${bulkItems.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addBulkRow}
                className="w-full py-2 bg-slate-50 border border-dashed border-slate-200 text-emerald-600 text-xs font-black rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{isRtl ? 'إضافة سلعة أخرى للقائمة' : 'Ajouter un autre article'}</span>
              </button>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 block">{isRtl ? 'السبب / الملاحظة' : 'Motif'}</label>
                <input
                  type="text"
                  value={stockFormReason}
                  onChange={(e) => setStockFormReason(e.target.value)}
                  placeholder={isRtl ? 'مثال: شراء جديد، تلف، الخ...' : 'Ex: Achat, Casse, etc...'}
                  className={`w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 block p-3 outline-none transition ${isRtl ? 'text-right' : 'text-left'}`}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-3.5 rounded-xl text-white font-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${
                    stockFormType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                  }`}
                >
                  {isRtl ? 'تأكيد العملية لكافة السلع' : 'Confirmer l\'opération groupée'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* MODAL: ADD / EDIT CARD FORM */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="text-md font-bold text-gray-900">
                {editingId ? (isRtl ? 'تعديل بيانات المنتج المعني' : 'Modifier les Fiches Produit') : (isRtl ? 'إضافة منتج تجاري جديد' : 'Création d\'un Nouveau Produit')}
              </h3>
              <button onClick={() => setIsOpenModal(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto text-xs font-semibold">
              
              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'اسم المنتج أو السلعة *' : 'Intitulé Produit *'}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={isRtl ? 'أدخل اسم المنتج بالكامل...' : 'Ex: Huile d\'olive Extra Vierge'}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                />
              </div>

              {/* SKU Barcode removed per user request */}

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'تصنيف السلعة (القسم) *' : 'Référencement Rayon *'}</label>
                <select
                  value={formCategory === "" || !categories.includes(formCategory) ? "NEW_CATEGORY_OPTION" : formCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "NEW_CATEGORY_OPTION") {
                      setFormCategory("");
                    } else {
                      setFormCategory(val);
                    }
                  }}
                  disabled={isCashier}
                  className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs cursor-pointer ${isCashier ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75 font-normal' : 'bg-gray-50 border-gray-200 focus:bg-white text-slate-800'}`}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="NEW_CATEGORY_OPTION" className="text-blue-650 font-black">
                    {isRtl ? '➕ قسم جديد...' : '➕ Nouveau rayon...'}
                  </option>
                </select>

                {/* If NEW_CATEGORY_OPTION is selected, display the input field underneath it */}
                {(formCategory === "" || !categories.includes(formCategory)) && (
                  <div className="pt-2 animate-fade-in relative">
                    <input
                      type="text"
                      required
                      disabled={isCashier}
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder={isRtl ? 'اكتب اسم القسم الجديد هنا...' : 'Écrire le nom du nouveau rayon...'}
                      className={`w-full px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs ${isCashier ? 'bg-slate-100 border-slate-205 text-slate-400 cursor-not-allowed opacity-75' : 'bg-white border-blue-200 text-slate-800'}`}
                    />
                  </div>
                )}
              </div>

              {/* Prices: Buy and Sell */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'سعر الشراء (الكلفة) *' : 'Prix de Revient Achat (HT) *'}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={isCashier}
                    value={formBuyPrice || ''}
                    onChange={(e) => setFormBuyPrice(Number(e.target.value))}
                    placeholder="Prix de gros"
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${isCashier ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75 font-normal' : 'bg-gray-50 border-gray-200 focus:bg-white text-slate-850'}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs text-blue-500 uppercase tracking-wide">{isRtl ? 'سعر البيع المقترح *' : 'Prix de Vente Client *'}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    disabled={isCashier}
                    value={formSellPrice || ''}
                    onChange={(e) => setFormSellPrice(Number(e.target.value))}
                    placeholder="Prix public"
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${isCashier ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75 font-normal' : 'bg-white border-blue-200 text-blue-900 font-extrabold'}`}
                  />
                </div>
              </div>

              {/* Initial stock and alarm levels */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'الكمية المتوفرة حالياً بالرف' : 'Quantité Initiale en Stock'}</label>
                  <input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    disabled={editingId !== null || isCashier}
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      (editingId !== null || isCashier) 
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75 font-normal' 
                        : 'bg-gray-50 border-gray-200 focus:bg-white text-slate-800'
                    }`}
                  />

                </div>
                <div className="space-y-1">
                  <label className="text-xxs text-amber-600 uppercase tracking-wide">{isRtl ? 'حد التنبيه الأدنى' : 'Seuil d\'Alerte Minimum'}</label>
                  <input
                    type="number"
                    min="1"
                    disabled={isCashier}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${isCashier ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75 font-normal' : 'bg-gray-50 border-gray-200 focus:bg-white text-slate-850'}`}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xxs text-slate-400 uppercase tracking-wide">{isRtl ? 'وصف تفصيلي للسلعة' : 'Description / Ingrédients'}</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal"
                />
              </div>

              {/* Footer */}
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

      {/* Manage Rayons Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="font-sans font-extrabold text-sm text-slate-800">
                  {isRtl ? 'إدارة الأقسام والرفوف' : 'Gestion des Rayons & Catégories'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingCategoryOldName(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-750 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-center text-xs text-slate-405 py-6 font-bold">
                  {isRtl ? 'لا توجد أقسام متوفرة حالياً.' : 'Aucun rayon disponible pour le moment.'}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {categories.map((catName) => {
                    const isEditingThis = editingCategoryOldName === catName;
                    return (
                      <div 
                        key={catName} 
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/50 rounded-xl transition"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={editingCategoryNewName}
                              onChange={(e) => setEditingCategoryNewName(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs text-slate-850 font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingCategoryNewName.trim()) return;
                                onRenameCategory?.(catName, editingCategoryNewName.trim());
                                setEditingCategoryOldName(null);
                                setEditingCategoryNewName('');
                              }}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                              title={isRtl ? 'حفظ التعديل' : 'Enregistrer'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryOldName(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-350 text-slate-650 rounded-lg transition"
                              title={isRtl ? 'إلغاء' : 'Annuler'}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-extrabold text-slate-800">
                              {catName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryOldName(catName);
                                  setEditingCategoryNewName(catName);
                                }}
                                className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition"
                                title={isRtl ? 'تعديل اسم القسم' : 'Modifier le nom'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCategoryToDelete(catName);
                                }}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition"
                                title={isRtl ? 'حذف القسم' : 'Supprimer'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer Info */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 text-[10px] text-slate-500 font-medium text-center">
              {isRtl 
                ? '💡 يؤدي تعديل اسم القسم أو حذفه إلى تحديث كافة المنتجات التابعة له تلقائياً.' 
                : '💡 Modifier ou supprimer un rayon met à jour automatiquement tous les produits associés.'
              }
            </div>
          </div>
        </div>
      )}

      {/* Category Delete Confirmation Modal */}
      {categoryToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-sm w-full p-6 space-y-5 transform scale-100 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" />
              </div>
              <h4 className="font-sans font-extrabold text-sm text-slate-950">
                {isRtl ? 'تأكيد حذف القسم' : 'Confirmer la suppression'}
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              {isRtl 
                ? `هل أنت متأكد من حذف القسم "${categoryToDelete}"؟ سيتم نقل المنتجات التابعة له تلقائياً إلى قسم "عام".`
                : `Voulez-vous vraiment supprimer le rayon "${categoryToDelete}" ? Les produits associés seront déplacés vers le rayon "Général".`
              }
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory?.(categoryToDelete);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-sm hover:shadow-md"
              >
                {isRtl ? 'نعم، احذف القسم' : 'Oui, Supprimer'}
              </button>
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition border border-slate-200"
              >
                {isRtl ? 'إلغاء' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {productToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl max-w-sm w-full p-6 space-y-5 transform scale-100 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <h4 className="font-sans font-extrabold text-sm text-slate-950">
                {isRtl ? 'تأكيد حذف المنتج' : 'Confirmer la suppression'}
              </h4>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                {isRtl 
                  ? `هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً من القائمة؟`
                  : `Voulez-vous vraiment supprimer définitivement ce produit de la liste ?`
                }
              </p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-black shrink-0">
                  {productToDelete.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-right flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{productToDelete.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{productToDelete.sku}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-sm hover:shadow-md"
              >
                {isRtl ? 'نعم، احذف المنتج' : 'Oui, Supprimer'}
              </button>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition border border-slate-200"
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
