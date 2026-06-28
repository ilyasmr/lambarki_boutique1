import React from 'react';
import { 
  User, 
  Client, 
  Product, 
  Invoice, 
  StockMovement, 
  UserRole,
  SystemActivity
} from './types';
import { api } from './api';
import { 
  initialUsers, 
  initialClients, 
  initialProducts, 
  initialInvoices, 
  initialStockMovements,
  initialActivities
} from './initialData';
import { translations, arabicDashboardLabels, resolveUserName } from './translations';

// Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PosCaisse from './components/PosCaisse';
import ProductsList from './components/ProductsList';
import ClientsList from './components/ClientsList';
import StocksManager from './components/StocksManager';
import UsersManager from './components/UsersManager';
import Settings from './components/Settings';
import PrintInvoiceModal from './components/PrintInvoiceModal';
import Account from './components/Account';
import InvoicesList from './components/InvoicesList';

import { Key, Building, Sparkles, Search, Package, Users, FileText, X, Menu } from 'lucide-react';

export default function App() {
  // Locale state: Defaulting to Arabic as requested in the prompt
  const [lang, setLang] = React.useState<'fr' | 'ar'>('ar');
  const isRtl = lang === 'ar';
  
  // Tab controller
  const [activeTab, setActiveTab ] = React.useState<string>('dashboard');

  // Mobile responsive sidebar drawer open status
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  // Collapse / hide the entire side menu
  const [isMenuHidden, setIsMenuHidden] = React.useState(false);

  // Core CRM Tables database state
  const [users, setUsers] = React.useState<User[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [stockMovements, setStockMovements] = React.useState<StockMovement[]>([]);
  const [activities, setActivities] = React.useState<SystemActivity[]>([]);

  // Simulation Login screen helper states
  const [loginUsername, setLoginUsername] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');

  // Floating printable invoice selection
  const [previewedInvoice, setPreviewedInvoice] = React.useState<Invoice | null>(null);

  // Custom low stock selection state filter
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false);

  // Global search and preset routing filters matching modern template spec perfectly
  const [globalSearchQuery, setGlobalSearchQuery] = React.useState('');
  const [showGlobalResults, setShowGlobalResults] = React.useState(false);
  const [prefilledProductSearch, setPrefilledProductSearch] = React.useState('');
  const [prefilledClientSearch, setPrefilledClientSearch] = React.useState('');

  // Load all data from Neon PostgreSQL via Express API
  React.useEffect(() => {
    const loadAll = async () => {
      try {
        const [loadedUsers, loadedClients, loadedProducts, loadedInvoices, loadedMovements, loadedActivities] = await Promise.all([
          api.users.getAll(),
          api.clients.getAll(),
          api.products.getAll(),
          api.invoices.getAll(),
          api.movements.getAll(),
          api.activities.getAll(),
        ]);

        setUsers(loadedUsers);
        setClients(loadedClients);
        setProducts(loadedProducts);
        setInvoices(loadedInvoices);
        setStockMovements(loadedMovements);
        setActivities(loadedActivities);

        // Session: still uses localStorage for client-side login persistence
        const savedUser = localStorage.getItem('dolibarr_current_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            const matched = loadedUsers.find((u: User) => u.id === parsedUser.id);
            const resolvedUser = matched || parsedUser;
            setCurrentUser(resolvedUser);
            setActiveTab(resolvedUser.role === 'cashier' ? 'pos' : 'dashboard');
          } catch(e) { console.error(e); }
        } else if (loadedUsers.length > 0) {
          const defaultUser = loadedUsers[0];
          setCurrentUser(defaultUser);
          localStorage.setItem('dolibarr_current_user', JSON.stringify(defaultUser));
          setActiveTab(defaultUser.role === 'cashier' ? 'pos' : 'dashboard');
        }
      } catch (err) {
        console.error('❌ Failed to load data from API:', err);
      }
    };
    loadAll();
  }, []);

  const logActivity = (
    type: 'sale' | 'product_add' | 'product_edit' | 'product_delete' | 'client_add' | 'client_edit' | 'client_delete' | 'stock_edit' | 'withdraw_add' | 'withdraw_edit' | 'withdraw_delete' | 'invoice_edit' | 'invoice_delete',
    descriptionAr: string,
    descriptionFr: string,
    targetId: string
  ) => {
    const newAct: SystemActivity = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      date: new Date().toISOString(),
      operator: currentUser?.name || 'النظام',
      descriptionAr,
      descriptionFr,
      targetId
    };
    api.activities.create(newAct).catch(console.error);
    setActivities(prev => [newAct, ...prev].slice(0, 50));
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const inputName = loginUsername.trim().toLowerCase();
    if (!inputName) return;

    // Search by username or email
    const op = users.find(u => 
      (u.username.toLowerCase() === inputName || u.email.toLowerCase() === inputName) && 
      u.active
    );

    if (op) {
      const userPassword = op.password || '';
      if (userPassword && loginPassword !== userPassword) {
        setLoginError(lang === 'ar' 
          ? '❌ كلمة المرور التي أدخلتها غير صحيحة! يرجى مراجعة الحساب والمحاولة مجدداً.' 
          : '❌ Mot de passe incorrect. Veuillez vérifier vos identifiants et réessayer.'
        );
        return;
      }
      
      setCurrentUser(op);
      localStorage.setItem('dolibarr_current_user', JSON.stringify(op));
      // Sync updated user from DB in case data changed
      api.users.getAll().then(u => setUsers(u)).catch(console.error);
      setLoginUsername('');
      setLoginPassword('');
      if (op.role === 'cashier') {
        setActiveTab('pos');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      setLoginError(lang === 'ar' 
        ? '⚠️ اسم المستخدم أو البريد الإلكتروني غير مسجل في النظام!' 
        : '⚠️ Identifiant ou email inconnu.'
      );
    }
  };

  // Sign out
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dolibarr_current_user');
  };

  // CRM Action: New checkout processed
  const handleNewSale = (newInvoice: Invoice, updatedProds: Product[], updatedClis: Client[]) => {
    // 1. Save invoice to DB
    api.invoices.create(newInvoice).catch(console.error);
    setInvoices(prev => [...prev, newInvoice]);

    // 2. Update products stock in DB
    updatedProds.forEach(p => api.products.update(p.id, p).catch(console.error));
    setProducts(updatedProds);

    // 3. Update clients in DB
    updatedClis.forEach(c => api.clients.update(c.id, c).catch(console.error));
    setClients(updatedClis);

    // 4. Record stock movements out
    const extraMovements: StockMovement[] = newInvoice.items.map((item, idx) => ({
      id: `mov-sale-${Date.now()}-${idx}`,
      productId: item.productId,
      productName: item.name,
      type: 'out' as const,
      qty: item.qty,
      date: new Date().toISOString(),
      reason: `Vente POS (${newInvoice.invoiceNumber})`,
      operator: currentUser?.name || 'Caisse',
      batchId: `sale-${newInvoice.id || Date.now()}`
    }));
    extraMovements.forEach(m => api.movements.create(m).catch(console.error));
    setStockMovements(prev => [...prev, ...extraMovements]);

    logActivity(
      'sale',
      `إصدار فاتورة مبيعات جديدة بقيمة ${newInvoice.total.toFixed(2)} DH للزبون "${newInvoice.clientName}"`,
      `Création d'une nouvelle facture de ${newInvoice.total.toFixed(2)} DH pour le client "${newInvoice.clientName}"`,
      newInvoice.invoiceNumber
    );
  };

  // Warehouse Action: Manual stock update
  const handleUpdateStock = (productId: string, newQty: number, movement: StockMovement) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === productId ? { ...p, stock: newQty } : p);
      const changed = updated.find(p => p.id === productId);
      if (changed) api.products.update(productId, changed).catch(console.error);
      return updated;
    });
    api.movements.create(movement).catch(console.error);
    setStockMovements(prev => [...prev, movement]);

    logActivity(
      'stock_edit',
      `تغيير مخزون المنتج "${movement.productName}" بمقدار ${movement.type === 'in' ? '+' : '-'}${movement.qty} (السبب: ${movement.reason})`,
      `Changement du stock pour "${movement.productName}" de ${movement.type === 'in' ? '+' : '-'}${movement.qty} (Raison: ${movement.reason})`,
      productId
    );
  };

  const handleUpdateStocksBulk = (updates: { productId: string; newQty: number; movement: StockMovement }[]) => {
    setProducts(prev => {
      const updatedProducts = prev.map(p => {
        const match = updates.find(u => u.productId === p.id);
        return match ? { ...p, stock: match.newQty } : p;
      });
      updates.forEach(u => {
        const changed = updatedProducts.find(p => p.id === u.productId);
        if (changed) api.products.update(u.productId, changed).catch(console.error);
      });
      return updatedProducts;
    });
    updates.forEach(u => api.movements.create(u.movement).catch(console.error));
    setStockMovements(prev => [...prev, ...updates.map(u => u.movement)]);

    logActivity(
      'stock_edit',
      `تعديل جماعي للمخزون لعدد ${updates.length} منتجات`,
      `Ajustement de stock groupé pour ${updates.length} produits`,
      'bulk'
    );
  };

  // Products CRUD actions
  const handleAddProduct = (p: Product) => {
    api.products.create(p).catch(console.error);
    setProducts(prev => [...prev, p]);
    logActivity(
      'product_add',
      `إضافة منتج جديد: "${p.name}" في صنف ${p.category} بسعر بيع ${p.sellPrice} DH`,
      `Ajout d'un nouveau produit: "${p.name}" dans la catégorie ${p.category} au prix de ${p.sellPrice} DH`,
      p.id
    );
  };

  const handleEditProduct = (p: Product) => {
    api.products.update(p.id, p).catch(console.error);
    setProducts(prev => prev.map(item => item.id === p.id ? p : item));
    logActivity(
      'product_edit',
      `تعديل معلومات المنتج: "${p.name}" (الرمز: ${p.sku})`,
      `Modification des informations du produit: "${p.name}" (SKU: ${p.sku})`,
      p.id
    );
  };

  const handleDeleteProduct = (id: string) => {
    const deletedProd = products.find(p => p.id === id);
    api.products.delete(id).catch(console.error);
    setProducts(prev => prev.filter(p => p.id !== id));
    logActivity(
      'product_delete',
      `حذف المنتج: "${deletedProd ? deletedProd.name : id}"`,
      `Suppression du produit: "${deletedProd ? deletedProd.name : id}"`,
      id
    );
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const updated = products.map(item => item.category === oldName ? { ...item, category: newName } : item);
    updated.filter(p => p.category === newName).forEach(p => api.products.update(p.id, p).catch(console.error));
    setProducts(updated);
  };

  const handleDeleteCategory = (categoryName: string) => {
    const defaultCat = lang === 'ar' ? 'عام' : 'Général';
    const updated = products.map(item => item.category === categoryName ? { ...item, category: defaultCat } : item);
    updated.filter(p => p.category === defaultCat).forEach(p => api.products.update(p.id, p).catch(console.error));
    setProducts(updated);
  };

  // Clients CRUD actions
  const handleAddClient = (c: Client) => {
    api.clients.create(c).catch(console.error);
    setClients(prev => [...prev, c]);
    logActivity(
      'client_add',
      `إضافة زبون جديد: "${c.name}" (${c.phone})`,
      `Ajout d'un nouveau client: "${c.name}" (${c.phone})`,
      c.id
    );
  };

  const handleEditClient = (c: Client) => {
    api.clients.update(c.id, c).catch(console.error);
    setClients(prev => prev.map(item => item.id === c.id ? c : item));
    logActivity(
      'client_edit',
      `تعديل معلومات الزبون: "${c.name}"`,
      `Modification des informations du client: "${c.name}"`,
      c.id
    );
  };

  const handleDeleteClient = (id: string) => {
    const deletedCli = clients.find(c => c.id === id);
    api.clients.delete(id).catch(console.error);
    setClients(prev => prev.filter(c => c.id !== id));
    logActivity(
      'client_delete',
      `حذف الزبون: "${deletedCli ? deletedCli.name : id}"`,
      `Suppression du client: "${deletedCli ? deletedCli.name : id}"`,
      id
    );
  };

  // Invoices & Sales modifications (Edit and Delete)
  const handleDeleteInvoice = (id: string, restoreStock: boolean = true) => {
    const deletedInv = invoices.find(inv => inv.id === id);
    if (!deletedInv) return;

    api.invoices.delete(id).catch(console.error);
    setInvoices(prev => prev.filter(inv => inv.id !== id));

    if (restoreStock && deletedInv.items && deletedInv.items.length > 0) {
      const updatedProducts = products.map(p => {
        const itemInSale = deletedInv.items.find(item => item.productId === p.id);
        return itemInSale ? { ...p, stock: p.stock + itemInSale.qty } : p;
      });
      updatedProducts.forEach(p => api.products.update(p.id, p).catch(console.error));
      setProducts(updatedProducts);

      const newMovements: StockMovement[] = deletedInv.items.map((item, idx) => ({
        id: `mov-refund-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        productId: item.productId,
        productName: item.name,
        type: 'in' as const,
        qty: item.qty,
        date: new Date().toISOString(),
        reason: `Annulation Vente (${deletedInv.invoiceNumber})`,
        operator: currentUser?.name || 'Admin',
        batchId: `refund-${deletedInv.id}`
      }));
      newMovements.forEach(m => api.movements.create(m).catch(console.error));
      setStockMovements(prev => [...prev, ...newMovements]);
    }

    logActivity(
      'invoice_delete',
      `إلغاء وحذف الفاتورة رقم ${deletedInv.invoiceNumber} للزبون "${deletedInv.clientName}"`,
      `Annulation et suppression de la facture n° ${deletedInv.invoiceNumber} pour le client "${deletedInv.clientName}"`,
      id
    );
  };

  const handleEditInvoice = (updatedInvoice: Invoice, previousInvoice: Invoice, shouldAdjustStock: boolean = true) => {
    api.invoices.update(updatedInvoice.id, updatedInvoice).catch(console.error);
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));

    if (shouldAdjustStock) {
      const stockAdjustments: { [prodId: string]: { previous: number, current: number, name: string } } = {};
      previousInvoice.items.forEach(item => {
        if (!stockAdjustments[item.productId]) stockAdjustments[item.productId] = { previous: 0, current: 0, name: item.name };
        stockAdjustments[item.productId].previous += item.qty;
      });
      updatedInvoice.items.forEach(item => {
        if (!stockAdjustments[item.productId]) stockAdjustments[item.productId] = { previous: 0, current: 0, name: item.name };
        stockAdjustments[item.productId].current += item.qty;
      });

      const newMovements: StockMovement[] = [];
      const updatedProducts = products.map(p => {
        const adj = stockAdjustments[p.id];
        if (adj) {
          const diff = adj.previous - adj.current;
          if (diff !== 0) {
            newMovements.push({
              id: `mov-edit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: p.id, productName: p.name,
              type: diff > 0 ? 'in' : 'out',
              qty: Math.abs(diff),
              date: new Date().toISOString(),
              reason: `Correction Qte Facture (${updatedInvoice.invoiceNumber})`,
              operator: currentUser?.name || 'Admin',
              batchId: `edit-${updatedInvoice.id}`
            });
            return { ...p, stock: p.stock + diff };
          }
        }
        return p;
      });
      if (newMovements.length > 0) {
        updatedProducts.forEach(p => api.products.update(p.id, p).catch(console.error));
        newMovements.forEach(m => api.movements.create(m).catch(console.error));
        setProducts(updatedProducts);
        setStockMovements(prev => [...prev, ...newMovements]);
      }
    }

    if (updatedInvoice.clientId) {
      setClients(prevClients => {
        const updated = prevClients.map(c => {
          if (c.id === updatedInvoice.clientId) {
            const totalSpentDiff = updatedInvoice.total - previousInvoice.total;
            const debtDiff = (updatedInvoice.amountDue || 0) - (previousInvoice.amountDue || 0);
            const updatedPurchases = c.purchases.map(p =>
              p.invoiceId === updatedInvoice.invoiceNumber ? { ...p, total: updatedInvoice.total } : p
            );
            const updatedClient = {
              ...c,
              totalSpent: Math.max(0, c.totalSpent + totalSpentDiff),
              outstandingDebt: Math.max(0, (c.outstandingDebt || 0) + debtDiff),
              purchases: updatedPurchases
            };
            api.clients.update(c.id, updatedClient).catch(console.error);
            return updatedClient;
          }
          return c;
        });
        return updated;
      });
    }

    logActivity(
      'invoice_edit',
      `تعديل الفاتورة رقم ${updatedInvoice.invoiceNumber} للزبون "${updatedInvoice.clientName}" - المجموع الحالي: ${updatedInvoice.total.toFixed(2)} DH`,
      `Modification de la facture n° ${updatedInvoice.invoiceNumber} pour le client "${updatedInvoice.clientName}" - Nouveau Total: ${updatedInvoice.total.toFixed(2)} DH`,
      updatedInvoice.id
    );
  };

  // Users CRM actions
  const handleAddUser = (u: User) => {
    api.users.create(u).catch(console.error);
    setUsers(prev => [...prev, u]);
  };

  const handleSwitchUser = (u: User) => {
    setCurrentUser(u);
    localStorage.setItem('dolibarr_current_user', JSON.stringify(u));
  };

  const handleDeleteUser = (id: string) => {
    api.users.delete(id).catch(console.error);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const updateLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  // Backup: Exports full catalog to JSON download file
  const handleBackupExport = () => {
    const payload = {
      dbVersion: "1.0",
      exportTime: new Date().toISOString(),
      products,
      clients,
      invoices,
      stockMovements,
      users
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `dolibarr_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  // Backup: Overwrites app state with uploaded JSON parsed structure
  const handleBackupImport = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.products && parsed.clients && parsed.invoices) {
        setProducts(parsed.products);
        updateLocalStorage('dolibarr_products', parsed.products);

        setClients(parsed.clients);
        updateLocalStorage('dolibarr_clients', parsed.clients);

        setInvoices(parsed.invoices);
        updateLocalStorage('dolibarr_invoices', parsed.invoices);

        if (parsed.stockMovements) {
          setStockMovements(parsed.stockMovements);
          updateLocalStorage('dolibarr_movements', parsed.stockMovements);
        }

        if (parsed.users) {
          setUsers(parsed.users);
          updateLocalStorage('dolibarr_users', parsed.users);
        }
        return true;
      }
      return false;
    } catch(e) {
      console.error(e);
      return false;
    }
  };

  // Backup: Reset fully back to initial start state
  const handleResetDatabase = () => {
    localStorage.clear();
    setProducts(initialProducts);
    setClients(initialClients);
    setInvoices(initialInvoices);
    setStockMovements(initialStockMovements);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    localStorage.setItem('dolibarr_users', JSON.stringify(initialUsers));
    localStorage.setItem('dolibarr_current_user', JSON.stringify(initialUsers[0]));
    localStorage.setItem('dolibarr_clients', JSON.stringify(initialClients));
    localStorage.setItem('dolibarr_products', JSON.stringify(initialProducts));
    localStorage.setItem('dolibarr_invoices', JSON.stringify(initialInvoices));
    localStorage.setItem('dolibarr_movements', JSON.stringify(initialStockMovements));
    setActiveTab('dashboard');
  };

  // Reset all business data completely (tassfir)
  const handleClearAllData = async () => {
    try {
      await api.system.clearAll();
    } catch (err) {
      console.error('❌ Failed to clear database on server:', err);
      alert(lang === 'ar' 
        ? 'حدث خطأ أثناء محاولة مسح البيانات من السيرفر. سيتم تصفير البيانات محلياً فقط.' 
        : 'Erreur lors de la suppression des données du serveur. Réinitialisation locale uniquement.'
      );
    }

    localStorage.clear();
    
    setProducts([]);
    setClients([]);
    setInvoices([]);
    setStockMovements([]);
    setActivities([]);
    
    localStorage.setItem('dolibarr_withdrawals', JSON.stringify([]));
    localStorage.setItem('dolibarr_adj_cash_income', '0');
    localStorage.setItem('dolibarr_adj_withdrawals', '0');
    localStorage.setItem('dolibarr_adj_drawer_balance', '0');

    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    localStorage.setItem('dolibarr_users', JSON.stringify(initialUsers));
    localStorage.setItem('dolibarr_current_user', JSON.stringify(initialUsers[0]));

    alert(lang === 'ar'
      ? 'تم تصفير وحذف جميع الحسابات والمنتجات والمبيعات والنشاطات بنجاح!'
      : 'Tous les comptes, produits, ventes et activités ont été vidés avec succès !'
    );
    
    setActiveTab('dashboard');
  };

  // Rendering screen routing based on actual Operator Privileges
  const renderTabContent = () => {
    if (!currentUser) return null;

    switch(activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            invoices={invoices}
            products={products}
            clients={clients}
            activities={activities}
            lang={lang}
            onViewInvoice={(inv) => setPreviewedInvoice(inv)}
            setActiveTab={setActiveTab}
            setShowLowStockOnly={setShowLowStockOnly}
          />
        );
      case 'pos':
        return (
          <PosCaisse
            products={products}
            clients={clients}
            lang={lang}
            currentUser={currentUser}
            onNewSale={handleNewSale}
            onViewInvoice={(inv) => setPreviewedInvoice(inv)}
          />
        );
      case 'products':
        return (
          <ProductsList
            products={products}
            lang={lang}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            showLowStockOnly={showLowStockOnly}
            setShowLowStockOnly={setShowLowStockOnly}
            prefilledSearch={prefilledProductSearch}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
            currentUser={currentUser}
          />
        );
      case 'clients':
        return (
          <ClientsList
            clients={clients}
            lang={lang}
            onAddClient={handleAddClient}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            prefilledSearch={prefilledClientSearch}
            currentUser={currentUser}
          />
        );
      case 'stock':
        return (
          <StocksManager
            products={products}
            movements={stockMovements}
            lang={lang}
            currentUser={currentUser}
            onUpdateStock={handleUpdateStock}
            onUpdateStocksBulk={handleUpdateStocksBulk}
          />
        );
      case 'sales':
        return (
          <InvoicesList
            invoices={invoices}
            lang={lang}
            onViewInvoice={setPreviewedInvoice}
            currentUser={currentUser}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
          />
        );
      case 'account':
        return (
          <Account
            invoices={invoices}
            clients={clients}
            products={products}
            lang={lang}
            onViewInvoice={setPreviewedInvoice}
            currentUser={currentUser!}
            onUpdateStocksBulk={handleUpdateStocksBulk}
            onLogActivity={logActivity}
          />
        );
      case 'users':
        return (
          <UsersManager
            users={users}
            currentUser={currentUser}
            lang={lang}
            onAddUser={handleAddUser}
            onSwitchUser={handleSwitchUser}
            onDeleteUser={handleDeleteUser}
          />
        );
      case 'settings':
        return (
          <Settings
            lang={lang}
            onBackupExport={handleBackupExport}
            onBackupImport={handleBackupImport}
            onResetDatabase={handleResetDatabase}
            onClearAllData={handleClearAllData}
          />
        );
      default:
        return null;
    }
  };

  // SECURITY PROTOCOL: Authenticate view if logged out completely
  if (!currentUser) {
    const tLabelLogin = arabicDashboardLabels[lang];
    return (
      <div 
        className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-[500px] h-[500px] bg-blue-650/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 transform -translate-x-12 translate-y-12 w-[500px] h-[500px] bg-indigo-650/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 z-10">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-blue-650 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Building className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{tLabelLogin.loginTitle}</h2>
              <p className="text-xs text-slate-400 mt-1">{tLabelLogin.loginSubtitle}</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xxs text-slate-400 font-bold uppercase tracking-wider">
                {isRtl ? 'اسم الولوج أو البريد الإلكتروني الخاص بالموظف *' : 'Nom d\'utilisateur ou Email Professionnel *'}
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 flex items-center px-3.5 text-slate-500 ${isRtl ? 'left-0' : 'right-0'}`}>
                  <Users className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => {
                    setLoginUsername(e.target.value);
                    setLoginError('');
                  }}
                  placeholder={isRtl ? 'أدخل اسم الحساب أو البريد الإلكتروني (مثال: lamb.ilyas@gmail.com)' : 'Identifiant ou Email (ex: lamb.ilyas@gmail.com)'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none transition-all placeholder-slate-650 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xxs text-slate-400 font-bold uppercase tracking-wider">
                {isRtl ? 'كلمة السر الخاصة بالحساب *' : 'Mot de passe sécurisé *'}
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 flex items-center px-3.5 text-slate-500 ${isRtl ? 'left-0' : 'right-0'}`}>
                  <Key className="w-4 h-4 text-slate-500" />
                </span>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder={isRtl ? 'أدخل كلمة مرور الحساب' : 'Saisir le mot de passe'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-xs font-mono text-white outline-none transition-all placeholder-slate-650"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-xxs text-rose-450 font-semibold bg-rose-950/20 p-2.5 rounded-lg border border-rose-950/40 leading-normal">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
            >
              <span>{isRtl ? 'تحقق وولوج للوحة المراقبة' : 'Entrée Sécurisée'}</span>
            </button>

          </form>

          {/* Tips block for test ease */}
          <div className="bg-slate-950/50 rounded-2xl p-4.5 border border-slate-800 text-xxs text-slate-400 space-y-2.5 font-mono">
            <p className="font-extrabold text-slate-200 border-b border-slate-800/80 pb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{isRtl ? 'حسابات تجريبية سريعة المفعول (الحساب والسر)' : 'Comptes de Test Rapides :'}</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-center text-slate-300 font-bold uppercase">
              <button 
                type="button" 
                onClick={() => {
                  setLoginUsername('lamb.ilyas@gmail.com');
                  setLoginPassword('ilyas_mr3');
                }}
                className="bg-slate-900 border border-slate-840 hover:border-blue-650 p-1.5 rounded-md transition text-[10px]"
              >
                {isRtl ? 'إلياس' : 'Ilias'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setLoginUsername('caissier');
                  setLoginPassword('yassine123');
                }}
                className="bg-slate-900 border border-slate-840 hover:border-blue-650 p-1.5 rounded-md transition text-[10px]"
              >
                {isRtl ? 'ياسين' : 'Yassine'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setLoginUsername('rachida');
                  setLoginPassword('fouad123');
                }}
                className="bg-slate-900 border border-slate-840 hover:border-blue-650 p-1.5 rounded-md transition text-[10px]"
              >
                {isRtl ? 'فؤاد' : 'Fouad'}
              </button>
            </div>
          </div>

          {/* Quick Lang Switch */}
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => setLang('fr')}
              className={`px-3 py-1 rounded text-xxs font-bold uppercase ${lang === 'fr' ? 'bg-blue-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              FR
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`px-3 py-1 rounded text-xxs font-bold uppercase font-arabic ${lang === 'ar' ? 'bg-blue-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              عربي
            </button>
          </div>

        </div>
      </div>
    );
  }

  // STANDARD LOGGED VIEW IN THE MAIN WORKSPACE
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role: UserRole) => {
    const roles = {
      admin: { fr: 'Administrateur', ar: 'المدير العام' },
      cashier: { fr: 'Caisse / POS', ar: 'مسؤول الصندوق' },
      stock_manager: { fr: 'Gestionnaire Stock', ar: 'أمين المستودع' }
    };
    return roles[role]?.[lang] || role;
  };

  // Synchronized search filters for the header bar
  const filteredProducts = globalSearchQuery.trim() ? products.filter(p => 
    p.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(globalSearchQuery.toLowerCase())
  ).slice(0, 5) : [];

  const filteredClients = globalSearchQuery.trim() ? clients.filter(c => 
    c.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || 
    c.phone.includes(globalSearchQuery) || 
    (c.email && c.email.toLowerCase().includes(globalSearchQuery.toLowerCase()))
  ).slice(0, 5) : [];

  const filteredInvoices = globalSearchQuery.trim() ? invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
    i.clientName.toLowerCase().includes(globalSearchQuery.toLowerCase())
  ).slice(0, 5) : [];

  const hasGlobalResults = filteredProducts.length > 0 || filteredClients.length > 0 || filteredInvoices.length > 0;

  const handleSidebarTabSelect = (tab: string) => {
    setPrefilledProductSearch('');
    setPrefilledClientSearch('');
    setActiveTab(tab);
  };

  const handleGlobalSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!globalSearchQuery.trim()) return;

    if (filteredProducts.length > 0) {
      setPrefilledProductSearch(filteredProducts[0].name);
      setActiveTab('products');
      setShowGlobalResults(false);
    } else if (filteredClients.length > 0) {
      setPrefilledClientSearch(filteredClients[0].name);
      setActiveTab('clients');
      setShowGlobalResults(false);
    } else if (filteredInvoices.length > 0) {
      setPreviewedInvoice(filteredInvoices[0]);
      setShowGlobalResults(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 flex h-screen overflow-hidden"
      style={{ fontFamily: isRtl ? '"Cairo", sans-serif' : '"Inter", sans-serif' }}
    >
      {/* 1. Sidebar Panel (Handles RTL orientation flow dynamically with responsive Drawer state) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSidebarTabSelect}
        lang={lang}
        setLang={setLang}
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isHidden={isMenuHidden}
      />

      {/* Modern Translucent Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300 no-print"
        />
      )}

      {/* Main Content Pane wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header matching Professional Polish theme precisely and optimized for Mobile */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 no-print shrink-0" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Universal Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsMenuHidden(prev => !prev);
              setIsSidebarOpen(prev => !prev);
            }}
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-xl transition-all duration-150 shrink-0 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 bg-white font-black"
            title={isRtl ? "إخفاء/إظهار القائمة" : "Afficher/Cacher le menu"}
          >
            <Menu className="w-5 h-5 text-emerald-600" />
            <span className="hidden md:inline text-[11px] font-extrabold uppercase tracking-wide">
              {isRtl 
                ? (isMenuHidden ? "إظهار القائمة" : "إخفاء القائمة")
                : (isMenuHidden ? "Afficher Menu" : "Masquer Menu")
              }
            </span>
          </button>

          <div className="relative flex items-center gap-2 sm:gap-4 w-[60%] lg:w-[65%] xl:w-[70%] z-50">
            {/* Search Box taking exactly 75% of parent container */}
            <div className="w-[75%] relative">
              <div className="flex items-center bg-white border border-[#e5e7eb] rounded-xl p-0.5 sm:p-1 shadow-sm transition-all duration-300 ease-in-out focus-within:border-[#3b82f6] focus-within:shadow-md w-full gap-1">
                <span className="text-sm sm:text-base text-[#94a3b8] px-2.5 select-none shrink-0">🔍</span>
                <input 
                  type="text" 
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setShowGlobalResults(true);
                  }}
                  onFocus={() => setShowGlobalResults(true)}
                  className={`flex-1 min-w-0 bg-transparent py-1 sm:py-1.5 px-1 outline-none text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 border-none focus:outline-none focus:ring-0 focus:border-none ${
                    isRtl ? 'text-right' : 'text-left'
                  }`} 
                  placeholder={isRtl ? "البحث السريع: سلع، زبائن، فواتير..." : "Rechercher..."}
                />
                <button 
                  type="button"
                  onClick={() => handleGlobalSearchSubmit()}
                  className="border-none bg-blue-600 hover:bg-blue-700 text-white py-1 sm:py-1.5 px-3 sm:px-4 rounded-lg text-xs sm:text-xs font-bold cursor-pointer transition-all duration-200 shrink-0 select-none flex items-center justify-center font-sans"
                >
                  <span>{isRtl ? "بحث" : "Chercher"}</span>
                </button>
              </div>

              {/* Floating autocompletion dropdown for global search */}
              {showGlobalResults && globalSearchQuery && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowGlobalResults(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 py-3.5 max-h-96 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
                    {/* Products group */}
                    {filteredProducts.length > 0 && (
                      <div className="px-3 pb-2.5 border-b border-slate-50 last:border-0">
                        <div className="text-[10px] text-emerald-650 font-extrabold flex items-center gap-1.5 px-2 py-1 bg-emerald-50/50 rounded-lg mb-1.5 align-middle">
                          <Package className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isRtl ? 'المنتجات المطابقة' : 'Produits Correspondants'}</span>
                        </div>
                        <div className="space-y-0.5">
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setPrefilledProductSearch(p.name);
                                setActiveTab('products');
                                setShowGlobalResults(false);
                              }}
                              className="w-full text-left flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xxs text-slate-450 font-mono">[{p.sku}]</span>
                                <span className="text-slate-900">{p.name}</span>
                              </div>
                              <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-black">{p.category}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clients group */}
                    {filteredClients.length > 0 && (
                      <div className="px-3 py-2.5 border-b border-slate-50 last:border-0">
                        <div className="text-[10px] text-blue-650 font-extrabold flex items-center gap-1.5 px-2 py-1 bg-blue-50/50 rounded-lg mb-1.5 align-middle">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{isRtl ? 'الزبائن المطابقين' : 'Clients Correspondants'}</span>
                        </div>
                        <div className="space-y-0.5">
                          {filteredClients.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setPrefilledClientSearch(c.name);
                                setActiveTab('clients');
                                setShowGlobalResults(false);
                              }}
                              className="w-full text-left flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900">{c.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-450 font-mono">{c.phone}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invoices Group */}
                    {filteredInvoices.length > 0 && (
                      <div className="px-3 pt-2.5">
                        <div className="text-[10px] text-indigo-650 font-extrabold flex items-center gap-1.5 px-2 py-1 bg-indigo-50/50 rounded-lg mb-1.5 align-middle">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{isRtl ? 'الفواتير المطابقة' : 'Factures Correspondantes'}</span>
                        </div>
                        <div className="space-y-0.5">
                          {filteredInvoices.map(i => (
                            <button
                              key={i.id}
                              type="button"
                              onClick={() => {
                                setPreviewedInvoice(i);
                                setShowGlobalResults(false);
                              }}
                              className="w-full text-left flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xxs text-slate-450 font-mono">[{i.invoiceNumber}]</span>
                                <span className="text-slate-900">{i.clientName}</span>
                              </div>
                              <span className="text-[10px] text-emerald-650 font-black font-mono">{i.total.toFixed(2)} Dhs</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasGlobalResults && (
                      <div className="px-5 py-4 text-center">
                        <div className="text-slate-400 text-xs font-bold mb-1">
                          {isRtl ? 'لا توجد نتائج مطابقة لمصطلح البحث' : 'Recherche infructueuse'}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          {isRtl ? 'الرجاء تجربة كتابة منتج، رقم باركود، اسم زبون أو فاتورة...' : "Essayez d'écrire un produit, code à barres, ou un nom..."}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Active Page Badge taking exactly 25% of parent container */}
            <div className="w-[25%] hidden sm:flex shrink-0">
              <div className="w-full flex items-center justify-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full py-2 px-1.5 text-center font-bold whitespace-nowrap overflow-hidden truncate shadow-[0_2px_8px_rgba(16,185,129,0.08)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate font-sans font-bold">
                  {translations[lang][activeTab as keyof typeof translations['fr']] || activeTab}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Profile Detail */}
            <div className="flex items-center gap-3">
              <div className={`${isRtl ? 'text-left' : 'text-right'}`}>
                <div className="text-xs font-bold text-slate-900">{currentUser ? resolveUserName(currentUser.name, lang) : ''}</div>
                <div className="text-[10px] text-slate-500 font-semibold">{currentUser ? getRoleLabel(currentUser.role) : ''}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center font-black text-xs ring-2 ring-blue-500 ring-offset-2">
                {currentUser ? getInitials(resolveUserName(currentUser.name, lang)) : ''}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Router */}
        <main 
          className="flex-1 p-8 overflow-y-auto max-w-full bg-slate-50"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {renderTabContent()}
        </main>
        
      </div>

      {/* 3. Global absolute Floating Printable Invoice Previewer */}
      {previewedInvoice && (
        <PrintInvoiceModal
          invoice={previewedInvoice}
          lang={lang}
          onClose={() => setPreviewedInvoice(null)}
        />
      )}
    </div>
  );
}
