import { Client, Product, Invoice, StockMovement, User, SystemActivity } from './types';

export const initialUsers: User[] = [
  {
    id: "usr-1",
    username: "admin",
    name: "Ilias Lambarki",
    role: "admin",
    email: "lamb.ilyas@gmail.com",
    active: true,
    password: "ilyas_mr3"
  },
  {
    id: "usr-2",
    username: "caissier",
    name: "Yassine Alami",
    role: "cashier",
    email: "yassine.alami@lambarki.ma",
    active: true,
    password: "yassine123"
  },
  {
    id: "usr-3",
    username: "rachida",
    name: "Fouad Lambarki",
    role: "admin",
    email: "fouad.l@lambarki.ma",
    active: true,
    password: "fouad123"
  }
];

export const initialClients: Client[] = [
  {
    id: "cli-1",
    name: "Ahmed El Amrani",
    email: "ahmed.elamrani@yahoo.fr",
    phone: "0612345678",
    address: "Avenue Allal Ben Abdallah, Rabat, Maroc",
    joinDate: "2026-03-10",
    totalSpent: 320,
    purchases: [
      { invoiceId: "INV-2026-001", date: "2026-05-10T11:20:00Z", total: 320 }
    ],
    outstandingDebt: 0,
    debtPayments: []
  },
  {
    id: "cli-2",
    name: "Hassan Agro",
    email: "hassan.agro@gmail.com",
    phone: "0623456789",
    address: "Zone Industrielle Bir Rami, Kénitra, Maroc",
    joinDate: "2026-04-15",
    totalSpent: 420,
    purchases: [
      { invoiceId: "INV-2026-002", date: "2026-05-18T10:15:00Z", total: 420 }
    ],
    outstandingDebt: 850,
    debtDate: "2026-05-18",
    debtDueDate: "2026-07-15",
    debtPayments: [
      { id: "dp-1", date: "2026-05-20T14:30:00Z", amount: 400, paymentMethod: "cash", notes: "Acompte d'irrigation", operator: "Yassine Alami" }
    ]
  },
  {
    id: "cli-3",
    name: "Ferme Atlas",
    email: "contact@fermeatlas.ma",
    phone: "0634567890",
    address: "Route d'El Hajeb, Meknès, Maroc",
    joinDate: "2026-05-01",
    totalSpent: 400,
    purchases: [
      { invoiceId: "INV-2026-003", date: "2026-05-22T17:45:00Z", total: 400 }
    ],
    outstandingDebt: 1500,
    debtDate: "2026-05-22",
    debtDueDate: "2026-08-01",
    debtPayments: []
  },
  {
    id: "cli-4",
    name: "Youssef Farming",
    email: "youssef.farming@outlook.com",
    phone: "0645678901",
    address: "Plaine du Saïss, Fès, Maroc",
    joinDate: "2026-05-15",
    totalSpent: 0,
    purchases: [],
    outstandingDebt: 0,
    debtPayments: []
  }
];

export const initialProducts: Product[] = [
  {
    id: "prod-1",
    name: "Engrais NPK 20-20-20",
    sku: "61111001",
    buyPrice: 120,
    sellPrice: 160,
    category: "Engrais",
    stock: 48, // Started at 50, now 48 after Ahmed's purchase of 2
    minStockAlert: 15,
    description: "Engrais minéral hautement soluble équilibré en azote, phosphore et potassium pour stimuler le rendement.",
    image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&w=400&q=85"
  },
  {
    id: "prod-2",
    name: "Semences Tomate",
    sku: "61111002",
    buyPrice: 25,
    sellPrice: 40,
    category: "Semences",
    stock: 190, // Started at 200, now 190 after Ferme Atlas's purchase of 10
    minStockAlert: 20,
    description: "Semences hybrides sélectionnées à haut rendement de tomates de plein champ, tolérantes aux maladies.",
    image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=400&q=85"
  },
  {
    id: "prod-3",
    name: "Pesticide Bio Protect",
    sku: "61111003",
    buyPrice: 80,
    sellPrice: 120,
    category: "Pesticides",
    stock: 35,
    minStockAlert: 10,
    description: "Solution écologique de traitement bio, prévient et élimine les parasites sans résidus de synthèse.",
    image: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=400&q=85"
  },
  {
    id: "prod-4",
    name: "Tuyau Irrigation 20m",
    sku: "61111004",
    buyPrice: 90,
    sellPrice: 140,
    category: "Irrigation",
    stock: 12, // Started at 15, now 12 after Hassan's purchase of 3
    minStockAlert: 5,
    description: "Tuyau d'irrigation goutte-à-goutte professionnel flexible de haute longévité résistant aux UV.",
    image: "https://images.unsplash.com/photo-1463123081488-729f6db80f58?auto=format&fit=crop&w=400&q=85"
  },
  {
    id: "prod-5",
    name: "Pompe Eau Agricole",
    sku: "61111005",
    buyPrice: 1200,
    sellPrice: 1600,
    category: "Matériel",
    stock: 5, // Alert level!
    minStockAlert: 8, // Triggers alert out of the box
    description: "Pompe électrique submersible haute puissance idéale pour puits et réseaux d'irrigation de grande superficie.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=85"
  },
  {
    id: "prod-6",
    name: "Pulvérisateur Manuel",
    sku: "61111006",
    buyPrice: 110,
    sellPrice: 180,
    category: "Matériel",
    stock: 10, // Alert level!
    minStockAlert: 12, // Triggers alert out of the box
    description: "Pulvérisateur à pression préalable dorsal de capacité 16L avec buses interchangeables pour soin agricole.",
    image: "https://images.unsplash.com/photo-1563514223741-21b40d8665a5?auto=format&fit=crop&w=400&q=85"
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    clientName: "Ahmed El Amrani",
    clientId: "cli-1",
    items: [
      {
        productId: "prod-1",
        name: "Engrais NPK 20-20-20",
        qty: 2,
        sellPrice: 160,
        buyPrice: 120
      }
    ],
    subtotal: 320,
    tax: 0,
    discount: 0,
    total: 320,
    profit: 80, // (160 - 120) * 2 = 80
    date: "2026-05-10T11:20:00Z",
    status: "paid",
    paymentMethod: "cash",
    cashierName: "Yassine Alami"
  },
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-002",
    clientName: "Hassan Agro",
    clientId: "cli-2",
    items: [
      {
        productId: "prod-4",
        name: "Tuyau Irrigation 20m",
        qty: 3,
        sellPrice: 140,
        buyPrice: 90
      }
    ],
    subtotal: 420,
    tax: 0,
    discount: 0,
    total: 420,
    profit: 150, // (140 - 90) * 3 = 150
    date: "2026-05-18T10:15:00Z",
    status: "paid",
    paymentMethod: "card",
    cashierName: "Yassine Alami"
  },
  {
    id: "inv-3",
    invoiceNumber: "INV-2026-003",
    clientName: "Ferme Atlas",
    clientId: "cli-3",
    items: [
      {
        productId: "prod-2",
        name: "Semences Tomate",
        qty: 10,
        sellPrice: 40,
        buyPrice: 25
      }
    ],
    subtotal: 400,
    tax: 0,
    discount: 0,
    total: 400,
    profit: 150, // (40 - 25) * 10 = 150
    date: "2026-05-22T17:45:00Z",
    status: "paid",
    paymentMethod: "cash",
    cashierName: "Ilias Lambarki"
  }
];

export const initialStockMovements: StockMovement[] = [
  {
    id: "mov-1",
    productId: "prod-1",
    productName: "Engrais NPK 20-20-20",
    type: "in",
    qty: 50,
    date: "2026-05-01T09:00:00Z",
    reason: "Entrée stock approvisionnement",
    operator: "Fouad Lambarki"
  },
  {
    id: "mov-2",
    productId: "prod-1",
    productName: "Engrais NPK 20-20-20",
    type: "out",
    qty: 2,
    date: "2026-05-10T11:20:00Z",
    reason: "Vente POS Ticket #001",
    operator: "Yassine Alami"
  },
  {
    id: "mov-3",
    productId: "prod-4",
    productName: "Tuyau Irrigation 20m",
    type: "in",
    qty: 15,
    date: "2026-05-02T11:00:00Z",
    reason: "Achat fournisseur matériel",
    operator: "Fouad Lambarki"
  },
  {
    id: "mov-4",
    productId: "prod-4",
    productName: "Tuyau Irrigation 20m",
    type: "out",
    qty: 3,
    date: "2026-05-18T10:15:00Z",
    reason: "Vente POS Ticket #002",
    operator: "Yassine Alami"
  },
  {
    id: "mov-5",
    productId: "prod-2",
    productName: "Semences Tomate",
    type: "in",
    qty: 200,
    date: "2026-05-03T09:12:00Z",
    reason: "Réception de semences certifiées",
    operator: "Fouad Lambarki"
  },
  {
    id: "mov-6",
    productId: "prod-2",
    productName: "Semences Tomate",
    type: "out",
    qty: 10,
    date: "2026-05-22T17:45:00Z",
    reason: "Vente POS Ticket #003",
    operator: "Ilias Lambarki"
  }
];

export const initialActivities: SystemActivity[] = [
  {
    id: "act-init-1",
    type: "sale",
    date: "2026-06-18T10:15:00Z",
    operator: "Yassine Alami",
    descriptionAr: "إصدار فاتورة مبيعات جديدة بقيمة 420.00 DH للزبون أحمد العمراني",
    descriptionFr: "Création d'une nouvelle facture de 420.00 DH pour le client Ahmed El Amrani",
    targetId: "INV-2026-001"
  },
  {
    id: "act-init-2",
    type: "product_add",
    date: "2026-06-17T14:30:00Z",
    operator: "Fouad Lambarki",
    descriptionAr: "إضافة منتج جديد: \"قميص صيفي إيطالي راقي\" في صنف الملابس بسعر بيع 350 DH",
    descriptionFr: "Ajout d'un nouveau produit: \"Chemise été italienne haut de gamme\" dans la catégorie Vêtements au prix de 350 DH",
    targetId: "prod-it-shirt"
  },
  {
    id: "act-init-3",
    type: "stock_edit",
    date: "2026-06-16T16:00:00Z",
    operator: "Fouad Lambarki",
    descriptionAr: "تغيير في مخزون المنتج \"حذاء جلدي رسمي\" بمقدار +15 وحدات. السبب: توريد السلع من المورد",
    descriptionFr: "Mise à jour du stock pour \"Chaussures cuir officiel\" de +15 unités. Raison: Arrivage fournisseur",
    targetId: "prod-it-shoes"
  },
  {
    id: "act-init-4",
    type: "client_add",
    date: "2026-06-15T09:12:00Z",
    operator: "Ilias Lambarki",
    descriptionAr: "إضافة زبون جديد: \"كريم التازي\" (0663459812)",
    descriptionFr: "Ajout d'un nouveau client: \"Karim Tazi\" (0663459812)",
    targetId: "cli-new-1"
  },
  {
    id: "act-init-5",
    type: "product_edit",
    date: "2026-06-14T11:45:00Z",
    operator: "Ilias Lambarki",
    descriptionAr: "تعديل معلومات المنتج: \"نظارات شمسية إيطالية\"",
    descriptionFr: "Modification des informations du produit: \"Lunettes de soleil italiennes\"",
    targetId: "prod-glasses"
  }
];

