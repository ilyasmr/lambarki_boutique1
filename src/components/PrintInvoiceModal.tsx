import React from 'react';
import { Invoice } from '../types';
import { translations, arabicDashboardLabels, resolveUserName } from '../translations';
import { X, Printer, FileText, ShoppingBag, Send } from 'lucide-react';

interface PrintInvoiceModalProps {
  invoice: Invoice;
  lang: 'fr' | 'ar';
  onClose: () => void;
}

export default function PrintInvoiceModal({ invoice, lang, onClose }: PrintInvoiceModalProps) {
  const [printFormat, setPrintFormat] = React.useState<'a4' | 'ticket'>('a4');
  const [customPhone, setCustomPhone] = React.useState(invoice.clientPhone || '');
  const t = translations[lang];
  const tLabel = arabicDashboardLabels[lang];
  const isRtl = lang === 'ar';
  const displayClientName = invoice.clientName ? invoice.clientName.replace('(صندوق)', '').trim() : (isRtl ? 'زبون عابر' : 'Client Comptoir');

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    let targetPhone = customPhone || invoice.clientPhone || "";
    if (!targetPhone) {
      alert(isRtl ? "الرجاء إدخال رقم هاتف الزبون أولاً !" : "Veuillez entrer le numéro de téléphone WhatsApp !");
      return;
    }
    // Sanitize phone number (remove spaces, parentheses, keeps numbers and plus)
    targetPhone = targetPhone.replace(/[^\d+]/g, '');
    if (!targetPhone.startsWith('+') && targetPhone.startsWith('0')) {
      if (targetPhone.startsWith('05') || targetPhone.startsWith('06') || targetPhone.startsWith('07')) {
        targetPhone = '+212' + targetPhone.substring(1);
      }
    }

    // Prepare message contents
    let msg = `*LAMBARKI - FACTURE ${invoice.invoiceNumber}*\n\n`;
    msg += `👤 *Client :* ${displayClientName}\n`;
    msg += `📅 *Date d'émission :* ${new Date(invoice.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
    msg += `💰 *Montant TTC :* ${invoice.total.toFixed(2)}\n`;
    
    if (invoice.paymentStatus && invoice.paymentStatus !== 'paid') {
      msg += `💳 *Statut paiement :* ${invoice.paymentStatus === 'unpaid' ? 'À Crédit (Non payée)' : 'Paiement Partiel (Avance)'}\n`;
      msg += `💰 *Montant Payé d'avance :* ${(invoice.amountPaid || 0).toFixed(2)}\n`;
      msg += `🔴 *Reste Dû :* ${(invoice.amountDue || 0).toFixed(2)}\n`;
    } else {
      msg += `🟢 *Statut paiement :* Payée entièrement (${(invoice.paymentMethod || 'cash').toUpperCase()})\n`;
    }

    msg += `\n📦 *Articles commandés :*\n`;
    invoice.items.forEach(item => {
      msg += `• _${item.qty}x_ *${item.name}*   [${(item.qty * item.sellPrice).toFixed(2)}]\n`;
    });
    msg += `\n🙏 _Merci pour votre confiance !_`;

    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(targetPhone)}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const getPaymentLabel = (method: string) => {
    switch(method) {
      case 'cash': return tLabel.paymentCash;
      case 'card': return tLabel.paymentCard;
      case 'transfer': return tLabel.paymentTransfer;
      case 'check': return tLabel.paymentCheck;
      default: return method;
    }
  };

  const formattedDate = new Date(invoice.date).toLocaleString(
    lang === 'ar' ? 'ar-MA' : 'fr-FR', 
    { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isRtl ? 'معاينة وطباعة الفاتورة' : 'Impression / Aperçu Facture'}
              </h3>
              <p className="text-xs text-gray-500 font-mono">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Print Options */}
        <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                printFormat === 'a4' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              {isRtl ? 'فاتورة قياسية A4' : 'Facture Standard A4'}
            </button>
            <button
              onClick={() => setPrintFormat('ticket')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                printFormat === 'ticket' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {isRtl ? 'تذكرة صندوق POS' : 'Ticket de Caisse POS'}
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            {isRtl ? 'بدء الطباعة الحقيقية' : 'Lancer l\'Impression'}
          </button>
        </div>

        {/* WhatsApp Sharing Bar */}
        <div className="p-4 border-b border-gray-100 bg-emerald-50/40 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <span className="p-1 px-2.5 bg-emerald-100 font-extrabold text-[10px] uppercase text-emerald-700 rounded-md">WhatsApp</span>
            <p className="text-xs font-bold">
              {isRtl ? 'إرسال تفاصيل الفاتورة مباشرة للزبون :' : 'Envoyer la facture via WhatsApp au client :'}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto items-center">
            <input
              type="text"
              placeholder={isRtl ? 'رقم هاتف الزبون (مثال: 0612345678)...' : 'N° WhatsApp (Ex: 0612345678)...'}
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold w-full md:w-56"
            />
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow transition-all whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isRtl ? 'إرسال بالواتساب' : 'Envoyer Direct'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Area Container */}
        <div className="p-8 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
          
          {/* Main Visual Invoice Body (ID 'printable-area' will be targeted by browser @media print) */}
          <div 
            id="printable-area" 
            className={`bg-white shadow-lg p-8 border border-gray-200 select-all transition-all ${
              printFormat === 'a4' 
                ? 'w-full max-w-[210mm] min-h-[297mm]' 
                : 'w-[80mm] min-h-[150mm] text-xs p-4 border-dashed'
            }`}
            style={{ fontFamily: lang === 'ar' ? '"Cairo", sans-serif' : '"Inter", sans-serif' }}
          >
            {printFormat === 'a4' ? (
              /* A4 Classic Dolibarr Invoice Layout */
              <div className="flex flex-col h-full text-gray-800">
                
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-emerald-500 pb-6 mb-8">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-emerald-700 font-trad" style={{ fontFamily: 'Amiri, serif' }}>محل المباركي</h1>
                    <div className="mt-3 text-gray-900">
                      <p className="font-bold text-xl">{displayClientName}</p>
                      {invoice.clientPhone && (
                        <p className="text-sm font-semibold text-gray-600 mt-0.5">{invoice.clientPhone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">
                      {isRtl ? 'فاتورة بيع' : 'Facture de Vente'}
                    </h2>
                    <p className="text-lg font-bold text-blue-700 font-mono mt-1">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {tLabel.invoiceDate} : <span className="font-semibold text-gray-700">{formattedDate}</span>
                    </p>
                  </div>
                </div>



                {/* Items Table */}
                <div className="flex-1 overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} border-collapse`}>
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                        <th className="py-3 px-4">{isRtl ? 'المنتج / الوصف' : "Désignation Produit"}</th>
                        <th className="py-3 px-4 text-center">{isRtl ? 'الكمية' : "Quantité"}</th>
                        <th className="py-3 px-4 text-right">{isRtl ? 'سعر الوحدة' : "Prix Unitaire"}</th>
                        <th className="py-3 px-4 text-right">{isRtl ? 'الإجمالي' : "Total Unitaire"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map((item, index) => (
                        <tr key={index} className="text-sm">
                          <td className="py-4 px-4">
                            <p className="font-bold text-gray-900 text-base">{item.name}</p>
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-medium">{item.qty}</td>
                          <td className="py-4 px-4 text-right font-mono">{item.sellPrice.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-gray-900">
                            {(item.qty * item.sellPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="mt-8 border-t border-gray-200 pt-6 flex justify-end">
                  <div className="w-64 space-y-3 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>{isRtl ? 'المجموع الجزئي :' : 'Sous-total :'}</span>
                      <span className="font-mono">{(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>{isRtl ? 'التخفيض المطبق :' : 'Remise immédiate :'}</span>
                        <span className="font-mono">-{invoice.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {invoice.tax > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{isRtl ? 'الضريبة (TVA) :' : 'Taxes (TVA) :'}</span>
                        <span className="font-mono">+{invoice.tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-blue-900">
                      <span>{isRtl ? 'المبلغ الإجمالي :' : 'Net à payer :'}</span>
                      <span className="font-mono">{invoice.total.toFixed(2)}</span>
                    </div>
                    {invoice.paymentStatus && invoice.paymentStatus !== 'paid' && (
                      <>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-dashed border-gray-200 pt-2.5">
                          <span>{isRtl ? 'المؤدى بالصندوق :' : 'Acompte Réglé :'}</span>
                          <span className="font-mono">{(invoice.amountPaid || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-extrabold text-[15px]">
                          <span>{isRtl ? 'باقي دين مستحق :' : 'Reste dû client :'}</span>
                          <span className="font-mono">{(invoice.amountDue || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Transaction terms */}
                <div className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400 leading-relaxed grid grid-cols-2">
                  <div>
                    <p>{isRtl ? 'حالة السداد :' : 'Statut de paie :'} <span className="font-extrabold font-semibold text-indigo-700">
                      {invoice.status === 'cancelled' ? (isRtl ? 'ملغاة' : 'Annulée') :
                       invoice.paymentStatus === 'unpaid' ? (isRtl ? 'دين بالكامل' : 'À Crédit') :
                       invoice.paymentStatus === 'partial' ? (isRtl ? 'دفعة+دين' : 'Acompte + Reste') :
                       (isRtl ? 'خالص بالكامل' : 'Payée en totalité')}
                    </span></p>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <p className="font-semibold text-gray-600 italic">"{isRtl ? 'شكراً لزيارتكم وصداقتكم' : 'Merci pour votre confiance !'}"</p>
                  </div>
                </div>

              </div>
            ) : (
              /* Heat/Thermal POS Ticket Layout */
              <div className="flex flex-col text-gray-800 text-center font-mono">
                <h1 className="text-3xl font-bold tracking-tight font-trad text-slate-900 mb-4" style={{ fontFamily: 'Amiri, serif' }}>محل المباركي</h1>
                
                <div className="border-b border-dashed border-gray-300 my-3 pb-2 text-left text-xs leading-normal space-y-1">
                  <p><strong>{isRtl ? 'تذكرة رقم :' : 'TICKET N°:'}</strong> {invoice.invoiceNumber}</p>
                  <p><strong>{isRtl ? 'تاريخ :' : 'DATE:'}</strong> {formattedDate}</p>
                  <p><strong>{isRtl ? 'الزبون :' : 'CLIENT:'}</strong> {displayClientName}</p>
                  {invoice.clientPhone && <p><strong>{isRtl ? 'رقم الهاتف :' : 'TEL:'}</strong> {invoice.clientPhone}</p>}
                </div>

                {/* Items List */}
                <div className="text-left text-xxs space-y-1 mb-3">
                  {invoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="truncate max-w-[170px]">
                        {item.qty}x {item.name}
                      </span>
                      <span className="text-right">{(item.qty * item.sellPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Ticket Totals */}
                <div className="border-t border-dashed border-gray-300 pt-2 text-xxs text-right space-y-1 font-bold">
                  <div className="flex justify-between">
                    <span>{isRtl ? 'المجموع :' : 'SUBTOTAL:'}</span>
                    <span>{(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{isRtl ? 'خصم :' : 'REMISE:'}</span>
                      <span>-{invoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-dashed border-gray-300 pt-2 text-blue-900">
                    <span>{isRtl ? 'المبلغ الإجمالي :' : 'TOTAL NET:'}</span>
                    <span>{invoice.total.toFixed(2)}</span>
                  </div>
                  {invoice.paymentStatus && invoice.paymentStatus !== 'paid' && (
                    <div className="text-[11px] font-bold space-y-1 pt-1.5 border-t border-dotted border-gray-300">
                      <div className="flex justify-between text-emerald-800">
                        <span>{isRtl ? 'المؤدى بالصندوق :' : 'AVANCE PAYÉE :' }</span>
                        <span>{(invoice.amountPaid || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>{isRtl ? 'المتبقي كدين :' : 'RESTE DU :' }</span>
                        <span>{(invoice.amountDue || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-300 my-3 pt-2 text-center text-xs text-gray-500 space-y-1">
                  {invoice.paymentStatus === 'unpaid' ? (
                    <p className="uppercase text-rose-650 font-extrabold">{isRtl ? 'دين بالكامل' : 'À CRÉDIT'}</p>
                  ) : invoice.paymentStatus === 'partial' ? (
                    <p className="uppercase text-amber-650 font-extrabold">{isRtl ? 'دفعة+دين' : 'ACOMPTE + RESTE'}</p>
                  ) : (
                    <p className="uppercase text-emerald-700 font-extrabold">{isRtl ? 'خالص بالكامل' : 'PAYÉE EN TOTALITÉ'}</p>
                  )}
                  <p className="italic mt-3">{isRtl ? 'شكراً لزيارتكم وصداقتكم' : 'MERCI DE VOTRE VISITE !'}</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" />
            {isRtl 
              ? 'تلميح: اضغط CTRL + P أو رز الطباعة للطباعة كملف PDF' 
              : 'Astuce: Utilisez le bouton imprimer pour exporter au format PDF.'
            }
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-semibold transition"
          >
            {t.cancel}
          </button>
        </div>

      </div>
    </div>
  );
}

