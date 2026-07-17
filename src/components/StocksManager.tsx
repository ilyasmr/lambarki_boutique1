import React from 'react';
import { Product, StockMovement } from '../types';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Boxes, 
  User, 
  Tag, 
  History,
  CheckCircle,
  ShieldAlert,
  Trash2,
  Edit2,
  X
} from 'lucide-react';

interface StocksManagerProps {
  products: Product[];
  movements: StockMovement[];
  lang: 'fr' | 'ar';
  currentUser: { name: string };
  onUpdateStock: (productId: string, newQty: number, movement: StockMovement) => void;
  onUpdateStocksBulk?: (updates: { productId: string; newQty: number; movement: StockMovement }[]) => void;
  onDeleteMovement?: (id: string) => void;
  onEditMovement?: (id: string, qty: number, reason: string) => void;
}

interface BulkItem {
  id: string;
  productId: string;
  qty: number;
}

export default function StocksManager({ 
  products, 
  movements, 
  lang, 
  currentUser,
  onUpdateStock,
  onUpdateStocksBulk,
  onDeleteMovement,
  onEditMovement
}: StocksManagerProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  // Mode: single adjustment or bulk adjustment
  const [formMode, setFormMode] = React.useState<'single' | 'bulk'>('single');

  // Single form states
  const [selectedProdId, setSelectedProdId] = React.useState('');
  const [movementQty, setMovementQty] = React.useState(10);
  const [movementReason, setMovementReason] = React.useState('');
  const [movementType, setMovementType] = React.useState<'in' | 'out'>('in');

  // Bulk form states
  const [bulkType, setBulkType] = React.useState<'in' | 'out'>('in');
  const [bulkItems, setBulkItems] = React.useState<BulkItem[]>([
    { id: 'bulk-1', productId: '', qty: 10 }
  ]);
  const [bulkReason, setBulkReason] = React.useState('');

  // Editing movement states
  const [editingMovement, setEditingMovement] = React.useState<StockMovement | null>(null);
  const [editQty, setEditQty] = React.useState(0);
  const [editReason, setEditReason] = React.useState('');

  // Filter state for stock history list (All, In/Entrée, Out/Sortie)
  const [filterType, setFilterType] = React.useState<'all' | 'in' | 'out'>('all');

  const addBulkRow = () => {
    setBulkItems(prev => [...prev, { id: `bulk-${Date.now()}-${Math.random()}`, productId: '', qty: 10 }]);
  };

  const removeBulkRow = (id: string) => {
    if (bulkItems.length <= 1) {
      alert(isRtl ? 'يجب الإبقاء على منتج واحد على الأقل.' : 'Au moins un produit doit rester dans la liste.');
      return;
    }
    setBulkItems(prev => prev.filter(item => item.id !== id));
  };

  const updateBulkRow = (id: string, field: 'productId' | 'qty', value: any) => {
    setBulkItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Compute low stocks list
  const lowStockProds = products.filter(p => p.stock <= p.minStockAlert);

  // Filter movements dynamically
  const filteredMovements = React.useMemo(() => {
    return movements.filter(m => {
      if (filterType === 'all') return true;
      return m.type === filterType;
    });
  }, [movements, filterType]);

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProdId) {
      alert(isRtl ? 'يرجى تحديد المنتج المستهدف.' : 'Veuillez sélectionner un produit.');
      return;
    }

    const targetProduct = products.find(p => p.id === selectedProdId);
    if (!targetProduct) return;

    if (movementQty <= 0) {
      alert(isRtl ? 'الكمية يجب أن تكون أعلى من الصفر.' : 'La quantité doit être supérieure à zéro.');
      return;
    }

    if (movementType === 'out' && targetProduct.stock < movementQty) {
      alert(isRtl 
        ? 'خطأ: الكمية المتاحة بالمستودع أصغر من كمية السحب والتسوية.' 
        : 'Erreur: Le stock disponible est inférieur à la quantité de sortie demandée.'
      );
      return;
    }

    // New amount calculation
    const currentStockLevel = targetProduct.stock;
    const finalStockLevel = movementType === 'in' 
      ? currentStockLevel + movementQty 
      : currentStockLevel - movementQty;

    // Build the movement log ledger
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: targetProduct.id,
      productName: targetProduct.name,
      type: movementType,
      qty: movementQty,
      date: new Date().toISOString(),
      reason: movementReason.trim() || (movementType === 'in' ? (isRtl ? 'إدخال مخزون يدوي' : 'Entrée stock manuelle') : (isRtl ? 'تسوية أو تلف' : 'Dépréciation / Casse')),
      operator: currentUser.name
    };

    // Trigger save
    onUpdateStock(targetProduct.id, finalStockLevel, newMovement);

    // Reset Form fields
    setSelectedProdId('');
    setMovementQty(10);
    setMovementReason('');
    alert(isRtl ? 'تم تحديث الكميات وتسجيل العملية بنجاح !' : 'Mouvement de stock enregistré avec succès !');
  };

  const handleSubmitBulk = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter valid items where a product is selected
    const validItems = bulkItems.filter(item => item.productId !== '');
    if (validItems.length === 0) {
      alert(isRtl ? 'يرجى تحديد منتج واحد على الأقل.' : 'Veuillez sélectionner au moins un produit.');
      return;
    }

    // Check for duplicate products in the list
    const selectedIds = validItems.map(item => item.productId);
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      alert(isRtl ? 'تنبيه: لقد قمت باختيار نفس المنتج أكثر من مرة في القائمة.' : 'Attention: Vous avez sélectionné le même produit plusieurs fois.');
      return;
    }

    // Validate quantities and stock levels
    for (const item of validItems) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod) continue;

      if (item.qty <= 0) {
        alert(isRtl 
          ? `الكمية المدخلة للمنتج "${prod.name}" يجب أن تكون أكبر من الصفر.` 
          : `La quantité pour "${prod.name}" doit être supérieure à zéro.`
        );
        return;
      }

      if (bulkType === 'out' && prod.stock < item.qty) {
        alert(isRtl 
          ? `خطأ: كمية السحب المتوفرة لـ "${prod.name}" غير كافية (المتاح: ${prod.stock} وحدات).` 
          : `Quantité insuffisante pour "${prod.name}" (Disponible: ${prod.stock} unités).`
        );
        return;
      }
    }

    // All valid! Proceed with updates
    const currentBatchId = `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (onUpdateStocksBulk) {
      const updates = validItems.map((item, index) => {
        const prod = products.find(p => p.id === item.productId)!;
        const finalStockLevel = bulkType === 'in' 
          ? prod.stock + item.qty 
          : prod.stock - item.qty;

        const newMovement: StockMovement = {
          id: `mov-bulk-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          productId: prod.id,
          productName: prod.name,
          type: bulkType,
          qty: item.qty,
          date: new Date().toISOString(),
          reason: bulkReason.trim() || (bulkType === 'in' ? (isRtl ? 'واردات متعددة' : 'Entrées groupées') : (isRtl ? 'تسوية مخزون جماعية' : 'Ajustement groupé')),
          operator: currentUser.name,
          batchId: currentBatchId
        };

        return {
          productId: prod.id,
          newQty: finalStockLevel,
          movement: newMovement
        };
      });

      onUpdateStocksBulk(updates);
    } else {
      // Fallback
      validItems.forEach((item, index) => {
        const prod = products.find(p => p.id === item.productId)!;
        const finalStockLevel = bulkType === 'in' 
          ? prod.stock + item.qty 
          : prod.stock - item.qty;

        const newMovement: StockMovement = {
          id: `mov-bulk-fb-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
          productId: prod.id,
          productName: prod.name,
          type: bulkType,
          qty: item.qty,
          date: new Date().toISOString(),
          reason: bulkReason.trim() || (bulkType === 'in' ? (isRtl ? 'واردات متعددة' : 'Entrées groupées') : (isRtl ? 'تسوية مخزون جماعية' : 'Ajustement groupé')),
          operator: currentUser.name,
          batchId: currentBatchId
        };

        onUpdateStock(prod.id, finalStockLevel, newMovement);
      });
    }

    // Reset bulk states
    setBulkItems([{ id: `bulk-${Date.now()}`, productId: '', qty: 10 }]);
    setBulkReason('');

    alert(isRtl ? 'تم تحديث كميات جميع السلع وتسجيل عمليات الحركة الكلية بنجاح!' : 'Ajustements en masse enregistrés avec succès !');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      
      {/* LEFT COLUMN: Entry/Exit Forms & Low Stock notifications (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Low stock indicators alarm */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-amber-500 w-5 h-5" />
            <span>{isRtl ? 'إنذارات العتبة الدنيا للمخزون' : 'Seuils Alerte Minimum'}</span>
          </h3>

          <div className="space-y-2.5 max-h-[190px] overflow-y-auto">
            {lowStockProds.map((p) => (
              <div key={p.id} className="p-3 bg-amber-50/70 hover:bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-extrabold text-amber-950 truncate max-w-[190px]">{p.name}</h4>
                  <p className="text-xxs text-amber-700 font-mono">Min limit: {p.minStockAlert}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-black font-mono ${p.stock === 0 ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'}`}>
                    {p.stock} units
                  </span>
                </div>
              </div>
            ))}
            {lowStockProds.length === 0 && (
              <div className="p-6 text-center text-gray-400 font-semibold bg-emerald-50/50 border border-emerald-100 rounded-xl flex flex-col items-center">
                <CheckCircle className="text-emerald-500 w-7 h-7 mb-2" />
                <p className="text-[10px] text-emerald-950 font-bold">{isRtl ? 'المستودع آمن بالكامل ! كل المنتجات أعلى من حد الأمان.' : 'Aucun produit en stock critique !'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic transaction Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
            <Boxes className="text-blue-600 w-5 h-5 animate-spin" />
            <span>{isRtl ? 'تسجيل حركة مستودع تجارية' : 'Ajustement Manuel de Stock'}</span>
          </h3>

          {/* Interactive Mode Tabs */}
          <div className="flex border-b border-gray-100 mb-5 gap-3 sm:gap-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFormMode('single')}
              className={`pb-2 text-[11px] sm:text-xs font-black transition-all cursor-pointer relative whitespace-nowrap ${
                formMode === 'single'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <span>{isRtl ? 'حركة فردية (سلعة واحدة)' : 'Ajustement unique'}</span>
              {formMode === 'single' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setFormMode('bulk')}
              className={`pb-2 text-[11px] sm:text-xs font-black transition-all cursor-pointer relative whitespace-nowrap ${
                formMode === 'bulk'
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              <span>{isRtl ? 'إدخال متعدد (دفعة واحدة)' : 'Ajustement groupé (Multi-produits)'}</span>
              {formMode === 'bulk' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {formMode === 'single' ? (
            <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs font-semibold">
              
              {/* IN / OUT toggles */}
              <div className="p-1.5 bg-gray-100 rounded-xl flex gap-1.5 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setMovementType('in')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    movementType === 'in' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{t.stockEntry}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('out')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    movementType === 'out' 
                      ? 'bg-rose-600 text-white shadow' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{t.stockExit}</span>
                </button>
              </div>

              {/* Product selection */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'اختر المنتج من الكتالوج *' : 'Sélectionner Produit *'}</label>
                <select
                  required
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                >
                  <option value="">-- {isRtl ? 'اختر منتجاً لتعديل كميته' : 'Sélectionner un article'} --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.stock} | Alert: {p.minStockAlert})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'الكمية المراد حركتها *' : 'Quantité du mouvement *'}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementQty || ''}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'سبب ومنفذ الحركة *' : 'Motif / Justification du transfert *'}</label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === 'in' ? (isRtl ? 'مثال: توريد شحنة جديدة، بضاعة مرتجعة...' : 'Ex: Arrivage Coopérative') : (isRtl ? 'مثال: كسر سلع، استهلاك شخصي، هدايا...' : 'Ex: Échantillon offert')}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className={`w-full py-3.5 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  movementType === 'in' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10'
                }`}
              >
                <span>{isRtl ? 'تنفيذ وتحديث بطاقة المخزون' : 'Valider le Transfert de Stock'}</span>
              </button>

            </form>
          ) : (
            <form onSubmit={handleSubmitBulk} className="space-y-4 text-xs font-semibold">
              {/* BULK IN / OUT toggles */}
              <div className="p-1.5 bg-gray-100 rounded-xl flex gap-1.5 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setBulkType('in')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    bulkType === 'in' 
                      ? 'bg-emerald-600 text-white shadow' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>{t.stockEntry} ({isRtl ? 'جمعي' : 'Masse'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkType('out')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    bulkType === 'out' 
                      ? 'bg-rose-600 text-white shadow' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{t.stockExit} ({isRtl ? 'جمعي' : 'Masse'})</span>
                </button>
              </div>

              {/* Bulk Items Grid list */}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-xxs uppercase text-gray-400 font-bold tracking-wider">
                  <span>{isRtl ? 'المنتج *' : 'Produit *'}</span>
                  <span className="w-24 text-center">{isRtl ? 'الكمية *' : 'Quantité *'}</span>
                </div>

                {bulkItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {/* Item Dropdown */}
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => updateBulkRow(item.id, 'productId', e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 bg-white rounded-lg border border-gray-205 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xxs font-extrabold text-slate-800"
                    >
                      <option value="">-- {isRtl ? 'اختر المنتج من الكتالوج' : 'Choisir produit'} --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({isRtl ? 'الحالي' : 'Actuel'}: {p.stock})
                        </option>
                      ))}
                    </select>

                    {/* Quantity field */}
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.qty || ''}
                      onChange={(e) => updateBulkRow(item.id, 'qty', Number(e.target.value))}
                      className="w-16 px-1.5 py-1.5 bg-white rounded-lg border border-gray-205 text-center font-mono font-bold text-xxs mb-0 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {/* Trash remove row button */}
                    <button
                      type="button"
                      disabled={bulkItems.length <= 1}
                      onClick={() => removeBulkRow(item.id)}
                      className={`p-1.5 bg-rose-50 text-rose-650 hover:bg-rose-100 rounded-lg transition-all cursor-pointer ${
                        bulkItems.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add row helper button */}
              <button
                type="button"
                onClick={addBulkRow}
                className="w-full py-2 bg-slate-50 border border-dashed border-slate-200 text-blue-650 text-[10px] font-black rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRtl ? 'إضافة خانة لسلعة أخرى للقائمة' : 'Ajouter un autre article à ajuster'}</span>
              </button>

              {/* Common Reason */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'التفاصيل / سبب التوريد أو الجرد الجماعي' : 'Motif / Justification commune'}</label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder={bulkType === 'in' ? (isRtl ? 'مثال: تفريغ سلعة جديدة، شحنة الصباح...' : 'Ex: Réception livraison groupée') : (isRtl ? 'مثال: سحب تلف دوري، تسويات جردية...' : 'Ex: Dépréciation mensuelle')}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              {/* Submit All button */}
              <button
                type="submit"
                className={`w-full py-3.5 text-white rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  bulkType === 'in' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10' 
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10'
                }`}
              >
                <span>{isRtl ? 'تسجيل كميات كل السلع دفعة واحدة' : 'Enregistrer tous les mouvements'}</span>
              </button>
            </form>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Ledger Logs History (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        <div className="md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm p-0 md:p-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-gray-50 pb-4">
            <div className="flex items-center gap-2">
              <History className="text-blue-600 w-5 h-5" />
              <h3 className="text-sm font-black text-gray-950">
                {tLabel.stockLogs}
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-750 text-[10px] font-extrabold rounded-md font-mono">
                {filteredMovements.length} logs
              </span>
            </div>

            {/* Interactive User choice between Input, Output, or Both */}
            <div className="p-1 bg-slate-100/80 rounded-xl flex gap-1 border border-slate-200/60 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-[10px] rounded-lg font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/15'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {isRtl ? 'الكل معاً' : 'Les deux'}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('in')}
                className={`px-3 py-1.5 text-[10px] rounded-lg font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  filterType === 'in'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/15'
                    : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>{isRtl ? 'الواردات' : 'Entrées'}</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('out')}
                className={`px-3 py-1.5 text-[10px] rounded-lg font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  filterType === 'out'
                    ? 'bg-rose-605 bg-rose-600 text-white shadow-sm shadow-rose-500/15'
                    : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{isRtl ? 'الصادرات' : 'Sorties'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-hidden md:overflow-x-auto max-h-[64vh]">
            <table className="w-full text-left block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-bold uppercase text-gray-450">
                  <th className="py-3 px-3">{isRtl ? 'المنتج' : 'Produit'}</th>
                  <th className="py-3 px-3 text-center">{isRtl ? 'النوع' : 'Mouvement'}</th>
                  <th className="py-3 px-3 text-right">{isRtl ? 'القدر' : 'Qté'}</th>
                  <th className="py-3 px-3">{isRtl ? 'التفاصيل / السبب' : 'Détail / Motif'}</th>
                  <th className="py-3 px-3">{isRtl ? 'تاريخ / منفذ' : 'Date / Opérateur'}</th>
                  <th className="py-3 px-3 text-center">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group md:divide-y md:divide-gray-50 space-y-3 md:space-y-0 pb-4 md:pb-0">
                {(() => {
                  const reversedList = filteredMovements.slice().reverse();
                  return reversedList.map((m, idx) => {
                    const prevItem = reversedList[idx - 1];
                    const nextItem = reversedList[idx + 1];

                    const isFirstInBatch = m.batchId && (!prevItem || prevItem.batchId !== m.batchId);
                    const isPartOfBatch = !!m.batchId;

                    return (
                      <React.Fragment key={m.id}>
                        {isFirstInBatch && (
                          <tr className="block md:table-row bg-blue-50/25 border-y border-blue-100/50">
                            <td colSpan={6} className="block md:table-cell py-2 px-3 text-[10px] md:text-[10px] font-black text-blue-700 tracking-wider">
                              <span className="flex items-center gap-1.5 justify-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-650 animate-pulse"></span>
                                {isRtl ? 'عملية موحدة (عدة سلع دفعة واحدة)' : 'Opération groupée (Multi-articles)'}
                              </span>
                            </td>
                          </tr>
                        )}
                        <tr className="block md:table-row text-xs hover:bg-gray-50/50 transition-colors p-4 md:p-0 bg-white rounded-2xl shadow-sm border border-gray-100 md:border-none md:shadow-none md:rounded-none md:bg-transparent relative" style={{ borderLeft: (isPartOfBatch && !isRtl) ? '4px solid #60a5fa' : undefined, borderRight: (isPartOfBatch && isRtl) ? '4px solid #60a5fa' : undefined }}>
                          <td className="block md:table-cell py-1 md:py-3 px-3">
                            <p className="font-extrabold text-gray-800 text-[14px] md:text-xs truncate max-w-full md:max-w-[150px]">{m.productName}</p>
                            <span className="text-[9px] text-gray-400 font-mono">ID: {m.productId}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-3 text-center border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-3">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'النوع' : 'Mouvement'}</span>
                            <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-bold uppercase ${
                              m.type === 'in' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                : 'bg-rose-50 text-rose-800 border border-rose-100'
                            }`}>
                              {m.type === 'in' ? '+' : '-'}
                            </span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-3 text-right font-mono font-black text-gray-800 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'القدر' : 'Qté'}</span>
                            <span className="text-[14px] md:text-xs">{m.qty}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-3 italic text-gray-500 font-medium text-[11px] max-w-full md:max-w-[120px] truncate border-t border-dashed border-gray-100 md:border-none" title={m.reason}>
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'التفاصيل' : 'Détail'}</span>
                            <span className="truncate max-w-[150px] md:max-w-none text-right md:text-left">{m.reason}</span>
                          </td>
                          <td className="flex justify-between md:table-cell py-2 md:py-3 px-3 text-xxs font-medium text-gray-400 leading-normal space-y-0.5 border-t border-dashed border-gray-100 md:border-none">
                            <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase shrink-0">{isRtl ? 'منفذ' : 'Opérateur'}</span>
                            <div className="text-right md:text-left">
                              <p className="font-semibold text-gray-600 font-sans">{m.operator}</p>
                              <p className="font-mono text-gray-400">
                                {new Date(m.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr', {
                                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            </div>
                          </td>
                          <td className="block md:table-cell py-3 md:py-3 px-3 text-center border-t border-dashed border-gray-100 md:border-none bg-slate-50 md:bg-transparent rounded-xl mt-2 md:mt-0">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMovement(m);
                                  setEditQty(m.qty);
                                  setEditReason(m.reason);
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg cursor-pointer transition flex-1 md:flex-none border border-blue-200 md:border-none bg-white md:bg-transparent shadow-sm md:shadow-none"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(isRtl ? 'هل أنت متأكد من مسح حركة المخزون هذه؟ سيتم تعديل مخزون المنتج تلقائياً.' : 'Confirmer la suppression ? Le stock du produit sera ajusté.')) {
                                    onDeleteMovement?.(m.id);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-450 font-semibold">
                      {isRtl ? 'لم يثبت أي حركة مطابقة للتصفية المحددة.' : 'Aucun mouvement correspondant au filtre sélectionné.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Edit Movement Modal */}
      {editingMovement && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="text-sm font-black text-gray-900">
                {isRtl ? 'تعديل حركة المخزون' : 'Modifier le mouvement'}
              </h3>
              <button onClick={() => setEditingMovement(null)} className="p-1 hover:bg-gray-200 rounded-lg transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                onEditMovement?.(editingMovement.id, editQty, editReason);
                setEditingMovement(null);
              }}
              className="p-6 space-y-4 text-xs font-semibold text-left"
             
            >
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider block text-start">{isRtl ? 'الكمية *' : 'Quantité *'}</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={editQty}
                  onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider block text-start">{isRtl ? 'السبب / الملاحظة *' : 'Raison / Motif *'}</label>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition">
                  {isRtl ? 'حفظ التعديلات' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setEditingMovement(null)} className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold cursor-pointer">
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
