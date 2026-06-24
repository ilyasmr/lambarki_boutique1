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

        {/* Quick action build user button */}
        <button
          onClick={() => setIsOpenForm(true)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{isRtl ? 'تسجيل مستخدم وصلاحية جديدة' : 'Créer un Nouvel Opérateur'}</span>
        </button>

      </div>

      {/* RIGHT COLUMN: Active user accounts management table (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4">
            <UserCheck className="text-indigo-600 w-5 h-5 animate-pulse" />
            <span>{isRtl ? 'سجل المستخدمين وطاقم المتجر' : 'Comptes & Droits du Personnel'}</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                  <th className="py-3 px-3">{tLabel.username}</th>
                  <th className="py-3 px-3">{isRtl ? 'الدور والصلاحية' : 'Rôle ERP'}</th>
                  <th className="py-3 px-3">{tLabel.emailAddress}</th>
                  <th className="py-3 px-3 text-center">{isRtl ? 'الحالة' : 'Connexion'}</th>
                  <th className="py-3 px-3 text-center">{isRtl ? 'حماية الحساب' : 'Sécurité Compte'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.slice().sort((a, b) => {
                  // Principal Admin (Ilyas) first
                  if (a.username === 'admin') return -1;
                  if (b.username === 'admin') return 1;
                  // Admin 2 (Rachida) second
                  if (a.username === 'rachida') return -1;
                  if (b.username === 'rachida') return 1;
                  // Rest alphabetic
                  return a.name.localeCompare(b.name);
                }).map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className={`text-xs hover:bg-gray-50/45 transition-all ${isSelf ? 'bg-indigo-50/20 font-bold' : ''}`}>
                      <td className="py-4 px-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-150 to-gray-200 font-black text-gray-700 flex items-center justify-center">
                          {resolveUserName(u.name, lang).charAt(0)}
                        </div>
                        <div>
                          <p className="text-gray-900 flex items-center gap-1 text-xs">
                            <span>{resolveUserName(u.name, lang)}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded-md uppercase font-semibold">
                                {isRtl ? 'أنت حالياً' : 'Actif'}
                              </span>
                            )}
                          </p>
                          <span className="text-xxs text-gray-400 font-mono">@{u.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black font-semibold ${getRoleBadge(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-gray-500 font-mono text-xxs truncate max-w-[140px]">{u.email}</td>
                      <td className="py-4 px-3 text-center">
                        <button
                          onClick={() => {
                            onSwitchUser(u);
                            alert(isRtl 
                              ? `تم تقمص شخصية: ${resolveUserName(u.name, lang)} بنجاح. لقد تغيرت الصلاحيات.` 
                              : `Session simulée avec succès pour: ${resolveUserName(u.name, lang)}`
                            );
                          }}
                          className={`px-3 py-1 text-xxs font-bold rounded-lg flex items-center gap-1 mx-auto transition-all ${
                            isSelf 
                              ? 'bg-emerald-100 text-emerald-800 cursor-default' 
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          <RefreshCcw className="w-3 h-3" />
                          <span>{isSelf ? (isRtl ? 'المستخدم النشط' : 'Session active') : (isRtl ? 'تسجيل دخول' : 'Permuter')}</span>
                        </button>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg text-xxs font-mono font-bold text-slate-700 border border-slate-200">
                          <Lock className="w-3.5 h-3.5 text-blue-500" />
                          <span>{u.password || (isRtl ? 'بـدون كـلمـة سـر' : 'Aucun')}</span>
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

      {/* MODAL FORM: CREATE NEW OPERATOR */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full">
            
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <h3 className="text-sm font-black text-gray-900">
                {isRtl ? 'إضافة بطاقة مستخدم جديدة' : 'Créer un Dossier Personnel'}
              </h3>
              <button onClick={() => setIsOpenForm(false)} className="p-1 hover:bg-gray-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'الاسم الكامل الموثق *' : 'Nom Complet *'}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Youssef Chahine"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'اسم الولوج (المعرّف) *' : 'Identifiant / Nom en Caisse *'}</label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Ex: youssefc"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'البريد الإلكتروني المخصص' : 'Email Professionnel'}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="youssef@lambarki.ma"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'كلمة السر المخصصة لتسجيل الدخول *' : 'Mot de passe de Connexion *'}</label>
                <input
                  type="text"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={isRtl ? 'أدخل كلمة مرور (مثال: isam_s2)' : 'Ex: password123'}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-xs text-blue-600 focus:ring-blue-550"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xxs text-gray-400 uppercase tracking-wider">{isRtl ? 'تعيين الصلاحية الوظيفية *' : 'Niveau de Permissions Droits *'}</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cashier">{getRoleLabel('cashier')}</option>
                  <option value="admin">{getRoleLabel('admin')}</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex gap-3 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold font-sans shadow-md"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold"
                >
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
