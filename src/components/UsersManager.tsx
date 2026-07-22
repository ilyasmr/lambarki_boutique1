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
      admin: { fr: 'Super Administrateur', ar: 'Ø§Ù„Ù…Ø¯ÙŠØ± Ø§Ù„Ø¹Ø§Ù…' },
      cashier: { fr: 'Agent Caisse POS', ar: 'Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚' },
      stock_manager: { fr: 'Gestionnaire Stock', ar: 'Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹' }
    };
    return labels[role][lang];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formUsername.trim()) {
      alert(isRtl ? 'Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ÙˆØ§Ù„Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ù…Ù„ Ø¶Ø±ÙˆØ±ÙŠØ§Ù†.' : 'Tous les champs marquÃ©s d\'une Ã©toile sont obligatoires.');
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
    alert(isRtl ? 'ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø¬Ø¯ÙŠØ¯ ÙˆØªØ¹ÙŠÙŠÙ† Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª !' : 'Nouvel utilisateur crÃ©Ã© avec succÃ¨s !');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      
      {/* LEFT COLUMN: Administrative Access description (5 cols in desktop) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Switch simulator explanation */}
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white text-xs border border-purple-400 shadow-lg">
          <ShieldCheck className="w-8 h-8 text-indigo-400 mb-3" />
          <h3 className="text-sm font-black mb-2">{tLabel.adminPower}</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            {isRtl 
              ? 'ØªØ³Ù…Ø­ Ù„Ùƒ Ù‡Ø°Ù‡ Ø§Ù„Ù„ÙˆØ­Ø© Ø¨Ø§Ø®ØªØ¨Ø§Ø± ÙˆØªÙ‚Ù…Øµ Ù‡ÙˆÙŠØ§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù„ØªØ¬Ø±Ø¨Ø© Ù…Ø±ÙˆÙ†Ø© Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…Ø®ØµØµØ© Ø¨Ù†Ø§Ø¡ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø¯ÙˆØ§Ø± Ø§Ù„Ù…Ù…Ù†ÙˆØ­Ø© Ù…Ø³Ø¨Ù‚Ø§Ù‹.' 
              : 'Simulez facilement une connexion utilisateur en cliquant sur le commutateur de compte d\'un opÃ©rateur de la liste pour tester les restrictions d\'Ã©crans en temps rÃ©el.'
            }
          </p>
          <div className="space-y-2 text-xxs font-mono text-slate-300 leading-normal">
            <p className="flex items-center gap-1.5 bg-white/20 p-2 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              <span><strong>{getRoleLabel('admin')}:</strong> {isRtl ? 'Ø­Ù‚ÙˆÙ‚ ØªØ­ÙƒÙ… ÙƒØ§Ù…Ù„Ø© Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø¨Ø§Ù„ÙƒØ§Ù…Ù„' : 'AccÃ¨s total sans limites'}</span>
            </p>
            <p className="flex items-center gap-1.5 bg-white/20 p-2 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              <span><strong>{getRoleLabel('cashier')}:</strong> {isRtl ? 'ÙÙ‚Ø· Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø¨ÙŠØ¹ ÙˆØ§Ù„Ø¨Ø­Ø« ÙˆØ§Ù„Ø²Ø¨Ø§Ø¦Ù†' : 'Uniquement POS, Tiers, Ventes et Dashboard'}</span>
            </p>
          </div>
        </div>



      </div>

      {/* RIGHT COLUMN: Active user accounts management table (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        
        <div className="md:bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm p-0 md:p-6 overflow-hidden">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-4 px-2 md:px-0">
            <UserCheck className="text-indigo-600 w-5 h-5 animate-pulse" />
            <span>{isRtl ? 'Ø³Ø¬Ù„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† ÙˆØ·Ø§Ù‚Ù… Ø§Ù„Ù…ØªØ¬Ø±' : 'Comptes & Droits du Personnel'}</span>
          </h3>

          <div className="overflow-x-hidden md:overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-50/60 border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                  <th className="py-3 px-3">{tLabel.username}</th>
                  <th className="py-3 px-3">{isRtl ? 'Ø§Ù„Ø¯ÙˆØ± ÙˆØ§Ù„ØµÙ„Ø§Ø­ÙŠØ©' : 'RÃ´le ERP'}</th>
                  <th className="py-3 px-3">{tLabel.emailAddress}</th>
                  <th className="py-3 px-3 text-center">{isRtl ? 'Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø­Ø³Ø§Ø¨' : 'SÃ©curitÃ© Compte'}</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group md:divide-y md:divide-gray-50 space-y-3 md:space-y-0 pb-4 md:pb-0">
                {users.slice().sort((a, b) => {
                  // Principal Admin (Ilyas) first
                  if (a.username === 'admin') return -1;
                  if (b.username === 'admin') return 1;
                  // Rest alphabetic
                  return a.name.localeCompare(b.name);
                }).map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id} className={`block md:table-row text-xs transition-all p-4 md:p-0 bg-white rounded-2xl shadow-sm border border-gray-100 md:border-none md:shadow-none md:rounded-none md:bg-transparent relative ${isSelf ? 'md:bg-indigo-50/20 font-bold ring-2 ring-indigo-500 md:ring-0' : 'hover:bg-gray-50/45'}`}>
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
                                  {isRtl ? 'Ø£Ù†Øª Ø­Ø§Ù„ÙŠØ§Ù‹' : 'Actif'}
                                </span>
                              )}
                            </p>
                            <span className="text-xxs text-gray-400 font-mono">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 px-3 border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-4">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø§Ù„Ø¯ÙˆØ± ÙˆØ§Ù„ØµÙ„Ø§Ø­ÙŠØ©' : 'RÃ´le ERP'}</span>
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black font-semibold ${getRoleBadge(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 px-3 text-gray-500 font-mono text-xxs truncate max-w-full md:max-w-[140px] border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{tLabel.emailAddress}</span>
                        <span className="truncate">{u.email}</span>
                      </td>
                      <td className="flex justify-between md:table-cell py-2 md:py-4 px-3 text-center border-t border-dashed border-gray-100 md:border-none">
                        <span className="md:hidden text-gray-400 font-medium text-[10px] uppercase">{isRtl ? 'Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø­Ø³Ø§Ø¨' : 'SÃ©curitÃ© Compte'}</span>
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg text-xxs font-mono font-bold text-slate-500 border border-slate-200">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>â€¢â€¢â€¢â€¢â€¢â€¢</span>
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

