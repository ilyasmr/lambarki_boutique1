import React from 'react';
import { User, UserRole } from '../types';
import { translations, arabicDashboardLabels, resolveUserName } from '../translations';
import { 
  ShieldCheck, 
  UserCheck, 
  Trash2, 
  Plus, 
  Lock, 
  RefreshCcw,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';

interface UsersManagerProps {
  users: User[];
  currentUser: User;
  lang: 'fr' | 'ar';
  onAddUser: (user: User) => void;
  onSwitchUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export default function UsersManager({ 
  users, 
  currentUser, 
  lang, 
  onAddUser, 
  onSwitchUser, 
  onDeleteUser 
}: UsersManagerProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  // Forms
  const [formName, setFormName] = React.useState('');
  const [formUsername, setFormUsername] = React.useState('');
  const [formEmail, setFormEmail] = React.useState('');
  const [formPassword, setFormPassword] = React.useState('');
  const [formRole, setFormRole] = React.useState<UserRole>('cashier');
  const [isOpenForm, setIsOpenForm] = React.useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch(role) {
      case 'admin':
        return 'bg-violet-100 text-violet-800 border border-violet-200';
      case 'cashier':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'stock_manager':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      admin: { fr: 'Super Administrateur', ar: 'المدير العام' },
      cashier: { fr: 'Agent Caisse POS', ar: 'مسؤول الصندوق' },
      stock_manager: { fr: 'Gestionnaire Stock', ar: 'مسؤول المستودع' }
    };
    return labels[role][lang];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formUsername.trim()) {
      alert(isRtl ? 'اسم المستخدم والاسم الكامل ضروريان.' : 'Tous les champs marqués d\'une étoile sont obligatoires.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: formUsername.toLowerCase().trim(),
      name: formName,
      email: formEmail || `${formUsername}@lambarki.ma`,
      role: formRole,
      active: true,
      password: formPassword.trim() || 'pwd123'
    };

    onAddUser(newUser);
    setFormName('');
    setFormUsername('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('cashier');
    setIsOpenForm(false);
    alert(isRtl ? 'تم تسجيل المستخدم الجديد وتعيين الصلاحيات !' : 'Nouvel utilisateur créé avec succès !');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* LEFT COLUMN: Administrative Access description (5 cols in desktop) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Switch simulator explanation */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white text-xs border border-indigo-950 shadow-md">
          <ShieldCheck className="w-8 h-8 text-indigo-400 mb-3" />
          <h3 className="text-sm font-black mb-2">{tLabel.adminPower}</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            {isRtl 
              ? 'تسمح لك هذه اللوحة باختبار وتقمص هويات المستخدمين لتجربة مرونة الواجهة المخصصة بناء على الأدوار الممنوحة مسبقاً.' 
              : 'Simulez facilement une connexion utilisateur en cliquant sur le commutateur de compte d\'un opérateur de la liste pour tester les restrictions d\'écrans en temps réel.'
            }
          </p>
          <div className="space-y-2 text-xxs font-mono text-slate-300 leading-normal">
            <p className="flex items-center gap-1.5 bg-indigo-950/50 p-2 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              <span><strong>{getRoleLabel('admin')}:</strong> {isRtl ? 'حقوق تحكم كاملة بالنظام بالكامل' : 'Accès total sans limites'}</span>
            </p>
            <p className="flex items-center gap-1.5 bg-indigo-950/50 p-2 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span><strong>{getRoleLabel('cashier')}:</strong> {isRtl ? 'فقط عمليات البيع والبحث والزبائن' : 'Uniquement POS, Tiers, Ventes et Dashboard'}</span>
            </p>
          </div>
        </div>



      </div>

      {/* RIGHT COLUMN: Active user accounts management table (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
            <UserCheck className="text-indigo-600 w-5 h-5 animate-pulse" />
            <span>{isRtl ? 'سجل المستخدمين وطاقم المتجر' : 'Comptes & Droits du Personnel'}</span>
          </h3>

          <div className="overflow-x-hidden md:overflow-x-auto">
            <table className="w-full text-left block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                  <th className="py-3 px-3">{tLabel.username}</th>
                  <th className="py-3 px-3">{isRtl ? 'الدور والصلاحية' : 'Rôle ERP'}</th>
                  <th className="py-3 px-3">{tLabel.emailAddress}</th>
                  <th className="py-3 px-3 text-center">{isRtl ? 'حماية الحساب' : 'Sécurité Compte'}</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group divide-y divide-gray-100/60 md:divide-gray-50">
                {users.slice().sort((a, b) => {
                  // Principal Admin (Ilyas) first
                  if (a.username === 'admin') return -1;
                  if (b.username === 'admin') return 1;
                  // Rest alphabetic
                  return a.name.localeCompare(b.name);
                }).map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className={`block md:table-row text-xs hover:bg-gray-50/45 transition-all p-4 md:p-0 ${isSelf ? 'bg-indigo-50/20 font-bold' : ''}`}>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 md:px-3 text-left">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase shrink-0 mt-2">{tLabel.username}</span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-150 to-gray-200 font-black text-gray-700 flex items-center justify-center">
                            {resolveUserName(u.name, lang).charAt(0)}
                          </div>
                          <div>
                            <p className="text-gray-900 flex items-center gap-1 text-[14px] md:text-xs font-bold">
                              <span>{resolveUserName(u.name, lang)}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded-md uppercase font-semibold">
                                  {isRtl ? 'أنت حالياً' : 'Actif'}
                                </span>
                              )}
                            </p>
                            <span className="text-xxs text-gray-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 px-3 border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-4">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'الدور والصلاحية' : 'Rôle ERP'}</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black font-semibold ${getRoleBadge(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 px-3 text-gray-500 font-mono text-xxs truncate max-w-full md:max-w-[140px] border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{tLabel.emailAddress}</span>
                        <span className="truncate">{u.email}</span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 px-3 text-center border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'حماية الحساب' : 'Sécurité Compte'}</span>
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg text-xxs font-mono font-bold text-slate-500 border border-slate-200">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>••••••</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
