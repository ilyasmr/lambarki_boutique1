import React from 'react';
import { translations, arabicDashboardLabels } from '../translations';
import { 
  Database, 
  Download, 
  Upload, 
  Globe2, 
  Server, 
  CloudLightning, 
  ShieldCheck, 
  RefreshCw,
  HelpCircle,
  Trash2
} from 'lucide-react';

interface SettingsProps {
  lang: 'fr' | 'ar';
  onBackupExport: () => void;
  onBackupImport: (jsonData: string) => boolean;
  onResetDatabase: () => void;
  onResetCashDrawer: () => void;
}

export default function Settings({ 
  lang, 
  onBackupExport, 
  onBackupImport, 
  onResetDatabase,
  onResetCashDrawer
}: SettingsProps) {

  const isRtl = lang === 'ar';
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];

  const [importText, setImportText] = React.useState('');
  const [importSuccess, setImportSuccess] = React.useState<boolean | null>(null);

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const worked = onBackupImport(importText);
    setImportSuccess(worked);
    if (worked) {
      setImportText('');
      alert(isRtl 
        ? 'تمت مطابقة واستيراد قاعدة البيانات بنجاح !' 
        : 'Base de données importée et restaurée avec succès !'
      );
    } else {
      alert(isRtl 
        ? 'فشل الاستيراد: الملف المرفق يحتوي على أخطاء هيكلية.' 
        : 'Échec de l\'importation: structure JSON invalide ou corrompue.'
      );
    }
  };

  return (
    <div className="space-y-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Visual Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
          <Database className="text-blue-600 w-5.5 h-5.5 animate-pulse" />
          <span>{isRtl ? 'الإعدادات ومستندات الأرشفة والرفع' : 'Administration Générale & Sauvegardes'}</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {isRtl 
            ? 'تحكم بنسخك الاحتياطية واقرأ دليل الرفع المباشر على خوادم الاستضافة المشتركة.' 
            : 'Gérez la base de données ERP, exportez vos tables de ventes et lisez le guide d\'hébergement autonome.'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION 1: AUTOSAVE & DATABASE EXPORTS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <ShieldCheck className="text-blue-600 w-5 h-5" />
            <h3 className="text-sm font-black text-gray-900">{tLabel.backupTitle}</h3>
          </div>

          <p className="text-xs text-gray-650 leading-relaxed">
            {tLabel.backupDesc}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBackupExport}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>{tLabel.exportBackup}</span>
            </button>

            <button
              onClick={() => {
                const yes = window.confirm(isRtl 
                  ? 'انتبه: سيقوم هذا الإجراء بإعادة تعيين قاعدة البيانات إلى قيمها الافتراضية للبداية. هل ترغب بالاستمرار؟' 
                  : 'Attention: Cela va réinitialiser toutes les ventes et modifier les stocks aux valeurs de départ. Continuer ?'
                );
                if (yes) onResetDatabase();
              }}
              className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إعادة ضبط المصنع' : 'Réinitialiser Données'}</span>
            </button>

            <button
              onClick={() => {
                const yes = window.confirm(isRtl
                  ? '⚠️ انتبه: سيقوم هذا الإجراء بتصفير أرصدة الصندوق وسجل السحوبات والتسويات بالكامل. لن يتم حذف المنتجات أو العملاء أو الفواتير أو الأنشطة. هل تريد الاستمرار؟'
                  : '⚠️ Attention : Cela réinitialisera les soldes de caisse, l\'historique des retraits et des ajustements. Les produits, clients, factures et activités ne seront pas supprimés. Continuer ?'
                );
                if (yes) onResetCashDrawer();
              }}
              className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تصفير حسابات الصندوق' : 'Réinitialiser la Caisse'}</span>
            </button>
          </div>

          {/* Import interface and pasting block */}
          <form onSubmit={handleImport} className="space-y-2.5 pt-4 border-t border-gray-100 text-xs">
            <label className="text-xxs text-gray-400 uppercase tracking-wider block font-bold">{tLabel.importBackup}</label>
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportSuccess(null);
              }}
              rows={3}
              placeholder={isRtl ? 'الصق محتويات ملف JSON المصدر سابقاً هنا...' : 'Collez le contenu JSON de votre fichier d\'exportation ici...'}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none font-mono text-[11px]"
            />
            <button
              type="submit"
              disabled={!importText.trim()}
              className="py-2.5 px-4.5 bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تحميل واستعادة الفولدر الحالي' : 'Restaurer la Base'}</span>
            </button>
          </form>
        </div>

        {/* SECTION 2: HOSTINGER & OVH DEPLOYMENT GUIDE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <Server className="text-indigo-600 w-5 h-5 animate-pulse" />
            <h3 className="text-sm font-black text-gray-900">{tLabel.hostingerOvhCompat}</h3>
          </div>

          <p className="text-xs text-gray-650 leading-relaxed">
            {tLabel.hostingerOvhDesc}
          </p>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4 text-xs font-semibold text-slate-800">
            <h4 className="font-extrabold text-blue-900 flex items-center gap-1">
              <CloudLightning className="w-4 h-4 text-amber-500" />
              <span>{isRtl ? 'خطوات الرفع المباشر والسهل (3 دقائق)' : 'Guide de Déploiement Rapide (3 étapes)'}</span>
            </h4>

            {isRtl ? (
              <ol className="list-decimal list-inside space-y-2.5 leading-relaxed font-semibold">
                <li>
                  <strong className="text-slate-950">بناء وتصدير الكود:</strong> قم بتشغيل الأمر <code className="bg-slate-200 font-mono px-1 py-0.2 rounded">npm run build</code> محلياً لإنتاج مجلد <code className="bg-slate-200 font-mono px-1 py-0.2 rounded">dist</code>.
                </li>
                <li>
                  <strong className="text-slate-950">الاتصال بالاستضافة FTP:</strong> افتح لوحة تحكم هيروشيما (Hostinger) أو (OVH) واذهب لمدير الملفات File Manager.
                </li>
                <li>
                  <strong className="text-slate-950">الرفع والمباشرة:</strong> ارفع محتويات المجلد <code className="bg-slate-200 font-mono px-1 py-0.2 rounded">dist</code> داخل المجلد الرئيسي <code className="bg-slate-200 font-mono px-1 py-0.2 rounded">public_html</code>.
                </li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-2.5 leading-relaxed">
                <li>
                  <strong className="text-slate-950">Compilation :</strong> Exécutez la commande locale <code className="bg-slate-250 font-mono px-1 py-0.2 rounded text-indigo-700">npm run build</code> afin de générer le dossier final autonome <code className="font-mono text-indigo-700">dist/</code>.
                </li>
                <li>
                  <strong className="text-slate-950">Connexion FTP :</strong> Connectez-vous à votre espace client Hostinger, o2switch ou OVH Cloud via FileZilla ou le gestionnaire web de fichiers.
                </li>
                <li>
                  <strong className="text-slate-950">Mise en ligne :</strong> Glissez/déposez simplement tous les fichiers du dossier <code className="font-mono text-indigo-700">dist/</code> à la racine du dossier public de votre nom de domaine (généralement <code className="font-mono text-indigo-705">public_html/</code> ou <code className="font-mono text-indigo-705">www/</code>).
                </li>
              </ol>
            )}

            <div className="p-3.5 bg-blue-50 text-blue-900 border border-blue-100 rounded-xl flex items-start gap-2 text-xxs leading-normal">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                {isRtl 
                  ? 'هذا التطبيق مجاني، خفيف الوزن ولا يتطلب أي حزمة قواعد بيانات خادم SQL للعمل، البيانات تحفظ تلقائياً في المتصفح وتوفر الأرشفة التلقائية.' 
                  : 'Astuce : L\'application s\'exécute entièrement côté client (SPA), elle est ultra rapide et sécurisée car vos données ne transitent pas par un serveur tiers vulnérable.'
                }
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
