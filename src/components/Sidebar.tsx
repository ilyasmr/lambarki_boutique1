import React from 'react';
import { User } from '../types';
import { translations, resolveUserName } from '../translations';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ShoppingBasket, 
  Users, 
  Boxes, 
  FileText, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Globe,
  Database,
  Building,
  Coins,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: 'fr' | 'ar';
  setLang: (lang: 'fr' | 'ar') => void;
  currentUser: User;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isHidden?: boolean;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  lang, 
  setLang, 
  currentUser, 
  onLogout,
  isOpen,
  onClose,
  isHidden
}: SidebarProps) {
  
  const isRtl = lang === 'ar';
  const t = translations[lang];

  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard, roles: ['admin'] },
    { id: 'pos', label: t.pos, icon: ShoppingBag, roles: ['admin', 'cashier'] },
    { id: 'products', label: t.products, icon: ShoppingBasket, roles: ['admin', 'cashier'] },
    { id: 'clients', label: t.clients, icon: Users, roles: ['admin', 'cashier'] },
    { id: 'stock', label: t.stock, icon: Boxes, roles: ['admin'] },
    { id: 'sales', label: t.sales, icon: FileText, roles: ['admin', 'cashier'] },
    { id: 'account', label: t.account, icon: Coins, roles: ['admin', 'cashier'] },
    { id: 'users', label: t.users, icon: ShieldAlert, roles: ['admin'] },
    { id: 'settings', label: t.settings, icon: Settings, roles: ['admin'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(currentUser.role));

  const roleLabels = {
    admin: { fr: 'Administrateur', ar: 'المدير العام' },
    cashier: { fr: 'Caisse / POS', ar: 'مسؤول الصندوق' },
    stock_manager: { fr: 'Gestionnaire Stock', ar: 'أمين المستودع' },
  };

  return (
    <aside 
      className={`w-64 bg-white text-slate-700 flex flex-col h-screen shadow-lg overflow-y-auto no-print transition-all duration-300 border-r border-slate-200
        fixed inset-y-0 z-50 
        ${isHidden ? 'lg:hidden' : 'lg:relative lg:flex'}
        ${isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
        ${isRtl ? 'right-0 border-l border-r-0' : 'left-0 border-r border-l-0'}
      `}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Brand Header & Mobile Close Button */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col items-center gap-3 relative">
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="lg:hidden absolute top-4 left-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 shadow-sm"
            title={isRtl ? "إغلاق" : "Fermer"}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2.5 mt-2 lg:mt-0 text-center justify-center">
          <div className="text-center">
            <h1 className="text-[24px] font-bold text-emerald-600 leading-none font-trad" style={{ fontFamily: 'Amiri, serif' }}>محل المباركي</h1>
            <p className="text-[11px] text-slate-500 font-semibold italic tracking-wide mt-1.5 lowercase">lambarki boutique</p>
          </div>
        </div>
      </div>

      {/* Operator Status Profile */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/40">
        <p className="text-xxs text-slate-400 font-bold uppercase tracking-wider mb-1">
          {isRtl ? 'المستخدم الحالي' : 'Opérateur Actif'}
        </p>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 font-bold flex items-center justify-center text-sm text-white border-2 border-emerald-500/30 shadow">
            {resolveUserName(currentUser.name, lang).charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{resolveUserName(currentUser.name, lang)}</p>
            <span className="inline-block mt-0.5 text-xxs px-1.5 py-0.5 bg-slate-100 text-emerald-700 rounded-md font-bold font-mono border border-slate-200">
              {roleLabels[currentUser.role][lang]}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Navigation Links */}
      <nav className="flex-1 px-4 py-5 space-y-1.5">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 font-bold text-white shadow-md shadow-emerald-500/15'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Language Toggle Bar & Session Management */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/55 space-y-3">
        
        {/* Language Selection Buttons */}
        <div className="p-1 bg-slate-100 rounded-lg flex gap-1 border border-slate-200">
          <button
            onClick={() => setLang('fr')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold uppercase transition cursor-pointer ${
              lang === 'fr' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>FR</span>
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold font-arabic transition cursor-pointer ${
              lang === 'ar' 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>عربي</span>
          </button>
        </div>

        {/* Active Page Indicator */}
        {(() => {
          const activeMenuItem = menuItems.find(item => item.id === activeTab);
          return (
            <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-slate-100/50 border border-slate-200/60 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] uppercase font-bold text-slate-400">
                  {isRtl ? 'الصفحة النشطة' : 'Page Active'}
                </span>
              </div>
              <span className="font-extrabold text-xs text-emerald-700">
                {activeMenuItem ? activeMenuItem.label : ''}
              </span>
            </div>
          );
        })()}

        {/* Sign out */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-850 rounded-xl text-xs font-bold transition duration-155 border border-rose-100 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-650" />
          <span>{t.logout}</span>
        </button>
      </div>
    </aside>
  );
}
