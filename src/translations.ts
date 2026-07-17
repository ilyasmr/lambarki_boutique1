import { AppTranslation } from './types';

export const translations: Record<'fr' | 'ar', AppTranslation> = {
  fr: {
    dashboard: "Tableau de Bord",
    pos: "Vente",
    products: "Stock & Produits",
    clients: "Clients",
    stock: "Gestion de Stock",
    sales: "Facturation & Ventes",
    users: "Utilisateurs & Droits",
    settings: "Configuration",
    logout: "Déconnexion",
    account: "Comptabilité & Caisse",

    revenue: "Chiffre d'Affaires",
    profit: "Marge Bénéficiaire",
    totalSales: "Total Ventes",
    activeClients: "Clients Actifs",
    lowStockAlerts: "Alertes Seuil Minimum",
    topSellingProducts: "Palmarès Produits les plus vendus",
    recentSales: "Dernières Factures",

    add: "Ajouter",
    edit: "Modifier",
    delete: "Supprimer",
    save: "Enregistrer",
    cancel: "Annuler",
    search: "Rechercher...",
    actions: "Actions",
    print: "Imprimer Ticket / PDF",
    filter: "Filtrer",

    cart: "Panier de Caisse",
    emptyCart: "Le panier est vide. Cliquez sur un produit pour l'ajouter.",
    checkout: "Valider la Vente",
    selectClient: "Associer un Client",
    discountPlh: "Remise ",
    taxPlh: "Taxes (TVA %)",
    paymentDone: "Paiement effectué avec succès !",
    receiptTicket: "Ticket de Caisse",

    stockEntry: "Entrée de Stock",
    stockExit: "Sortie Dépréciation",
    currentStock: "Stock Réel",
    minStock: "Seuil Alerte",
    inventoryHistory: "Mouvements de Stock",

    langFrench: "Français",
    langArabic: "العربية"
  },
  ar: {
    dashboard: "لوحة التحكم",
    pos: "نقطة البيع",
    products: "المخزون والمنتجات",
    clients: "الزبناء",
    stock: "إدارة المخزون",
    sales: "الفواتير والمبيعات",
    users: "المستخدمون والصلاحيات",
    settings: "الإعدادات",
    logout: "تسجيل الخروج",
    account: "الحسابات والمالية",

    revenue: "إجمالي رقم المعاملات",
    profit: "الهامش الربحي",
    totalSales: "مجموع المبيعات",
    activeClients: "الزبائن النشطون",
    lowStockAlerts: "تنبيهات انخفاض المخزون",
    topSellingProducts: "المنتجات الأكثر مبيعاً",
    recentSales: "آخر الفواتير الصادرة",

    add: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    save: "حفظ",
    cancel: "إلغاء",
    search: "بحث سريع...",
    actions: "الإجراءات",
    print: "طباعة الفاتورة / الوصل",
    filter: "تصفية",

    cart: "سلة المشتريات",
    emptyCart: "السلة فارغة. اضغط على منتج لإضافته للبيع.",
    checkout: "تأكيد واستلام الدفع",
    selectClient: "تحديد الزبون",
    discountPlh: "خصم (درهم)",
    taxPlh: "الضريبة (%)",
    paymentDone: "تم تسجيل الدفع وإتمام العملية بنجاح !",
    receiptTicket: "وصل صندوق البيع",

    stockEntry: "إدخال للمخزون",
    stockExit: "إخراج / تسوية",
    currentStock: "المخزون الحالي",
    minStock: "حد التنبيه",
    inventoryHistory: "حركة وحسابات المخازن",

    langFrench: "الفرنسية (Français)",
    langArabic: "العربية"
  }
};

export const arabicDashboardLabels = {
  ar: {
    monthlySales: "المبيعات الشهرية",
    product: "المنتج",
    stockLevel: "كمية المخزون",
    sku: "الرمز المرجعي",
    price: "سعر البيع",
    total: "المجموع",
    role: "الدور",
    username: "اسم المستخدم",
    newUser: "مستخدم جديد",
    addSuccess: "تمت الإضافة بنجاح",
    deleteConfirm: "هل تريد بالتأكيد الحذف؟",
    stockLogs: "سجل العمليات وحركات المخزون",
    newClient: "زبون جديد",
    phoneNumber: "الهاتف",
    emailAddress: "البريد الإلكتروني",
    physicalAddress: "العنوان",
    invoiceNum: "رقم الفاتورة",
    invoiceDate: "تاريخ الفاتورة",
    invoiceClient: "الزبون",
    invoiceTotal: "المبلغ الإجمالي",
    invoiceStatus: "حالة الفاتورة",
    invoicePayment: "طريقة الدفع",
    paymentCash: "نقداً",
    paymentCard: "بطاقة بنكية",
    paymentTransfer: "تحويل بنكي",
    paymentCheck: "شيك بريدي",
    invoicePaid: "مدفوعة",
    invoicePending: "غير مدفوعة",
    invoiceCancelled: "ملغاة",
    adminPower: "لوحة تحكم المسؤول",
    backToApp: "العودة للتطبيق",
    loginTitle: "بوابة نظام LAMBARKI",
    loginSubtitle: "يرجى تسجيل الدخول للوصول للإدارة",
    quickSearchProduct: "البحث عن منتج بالاسم أو الباركود...",
    recentOrders: "سجل الطلبيات والمبيعات",
    generateBackup: "خطوات النسخ الاحتياطي التلقائي",
    backupTitle: "النسخ الاحتياطي والأرشفة التلقائية",
    backupDesc: "يقوم النظام بحفظ البيانات تلقائياً في المتصفح المحلي لضمان سلامة المعطيات ويدعم التصدير الفوري.",
    exportBackup: "تصدير البيانات بصيغة JSON",
    importBackup: "استيراد قاعدة بيانات",
    hostingerOvhCompat: "التوافق مع الاستضافة (Hostinger / OVH)",
    hostingerOvhDesc: "تم تكوين هذا النظام ليعمل بشكل مستقل وخفيف للغاية دون الحاجة لقواعد بيانات معقدة، مما يجعله جاهزاً للرفع على مجلد public_html في أي استضافة مباشرة.",
    lowStockPlural: "منتجات بلغت الحد الأدنى",
    minStockAlerter: "تنبيه انخفاض المخزون !"
  },
  fr: {
    monthlySales: "Mentes Mensuelles",
    product: "Produit",
    stockLevel: "Quantité en Stock",
    sku: "ID",
    price: "Prix de Vente",
    total: "Total",
    role: "Rôle",
    username: "Identifiant",
    newUser: "Nouvel Utilisateur",
    addSuccess: "Ajouté avec succès !",
    deleteConfirm: "Êtes-vous sûr de vouloir supprimer cet élément ?",
    stockLogs: "Historique des mouvements de stock",
    newClient: "Nouvel Acheteur / Client",
    phoneNumber: "Téléphone",
    emailAddress: "Email",
    physicalAddress: "Adresse postale",
    invoiceNum: "N° Facture",
    invoiceDate: "Date d'émission",
    invoiceClient: "Client",
    invoiceTotal: "Montant TTC",
    invoiceStatus: "Statut",
    invoicePayment: "Moyen de Règlement",
    paymentCash: "Espèces (Cash)",
    paymentCard: "Carte Bancaire",
    paymentTransfer: "Virement",
    paymentCheck: "Chèque",
    invoicePaid: "Payée",
    invoicePending: "En attente",
    invoiceCancelled: "Annulée",
    adminPower: "Administration LAMBARKI",
    backToApp: "Retourner au magasin",
    loginTitle: "Portail LAMBARKI",
    loginSubtitle: "Connectez-vous pour accéder à la gestion du magasin",
    quickSearchProduct: "Rechercher un produit par nom ou code-barre...",
    recentOrders: "Commandes récentes & Tickets",
    generateBackup: "Sauvegarde & Exportation",
    backupTitle: "Sécurité & Sauvegardes Automatiques",
    backupDesc: "Vos données sont sauvegardées en temps réel (Autosave local) pour éviter les pertes accidentelles. Vous pouvez exporter de manière sécurisée.",
    exportBackup: "Exporter la Base de Données (JSON)",
    importBackup: "Importer un fichier de sauvegarde",
    hostingerOvhCompat: "Déploiement Hostinger & OVH",
    hostingerOvhDesc: "Ce système est hautement optimisé et s'exécute de manière autonome sous forme de SPA ou via un serveur Node.js rapide, idéal pour Hostinger, OVH ou n'importe quel hébergement mutualisé.",
    lowStockPlural: "produits en stock faible",
    minStockAlerter: "Attention : Stock Faible !"
  }
};

export function resolveUserName(name: string | undefined | null, lang: 'fr' | 'ar'): string {
  if (!name) return lang === 'ar' ? "مسؤول الصندوق" : "Responsable Caisse";
  const nameLower = name.toLowerCase();
  
  // "modir 3am 1" -> "Ilias Lambarki" in French, "الياس المباركي" in Arabic.
  if (
    nameLower.includes("ilyas") || 
    nameLower.includes("ilias") || 
    nameLower === "admin" ||
    nameLower === "directeur général 1" ||
    nameLower.includes("الياس")
  ) {
    return lang === 'ar' ? "الياس المباركي" : "Ilias Lambarki";
  }
  
  // "modir 3am 2" -> "Fouad Lambarki" in French, "فؤاد المباركي" in Arabic.
  if (
    nameLower.includes("fouad") || 
    nameLower === "stock" ||
    nameLower === "directeur général 2" ||
    nameLower.includes("فؤاد")
  ) {
    return lang === 'ar' ? "فؤاد المباركي" : "Fouad Lambarki";
  }
  
  // Any other operator/cashier is strictly mapped to "مسؤول الصندوق" in Arabic and "Responsable Caisse" in French
  return lang === 'ar' ? "مسؤول الصندوق" : "Responsable Caisse";
}
