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

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    let targetPhone = customPhone || invoice.clientPhone || "";
    if (!targetPhone) {
      alert(isRtl ? "Ø§Ù„Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø§Ù„Ø²Ø¨ÙˆÙ† Ø£ÙˆÙ„Ø§Ù‹ !" : "Veuillez entrer le numÃ©ro de tÃ©lÃ©phone WhatsApp !");
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
    msg += `ðŸ‘¤ *Client :* ${invoice.clientName}\n`;
    msg += `ðŸ“… *Date d'Ã©mission :* ${new Date(invoice.date).toLocaleString(lang === 'ar' ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
    msg += `ðŸ’° *Montant TTC :* ${invoice.total.toFixed(2)}\n`;
    
    if (invoice.paymentStatus && invoice.paymentStatus !== 'paid') {
      msg += `ðŸ’³ *Statut paiement :* ${invoice.paymentStatus === 'unpaid' ? 'Ã€ CrÃ©dit (Non payÃ©e)' : 'Paiement Partiel (Avance)'}\n`;
      msg += `ðŸ’° *Montant PayÃ© d'avance :* ${(invoice.amountPaid || 0).toFixed(2)}\n`;
      msg += `ðŸ”´ *Reste DÃ» :* ${(invoice.amountDue || 0).toFixed(2)}\n`;
    } else {
      msg += `ðŸŸ¢ *Statut paiement :* PayÃ©e entiÃ¨rement (${(invoice.paymentMethod || 'cash').toUpperCase()})\n`;
    }

    msg += `\nðŸ“¦ *Articles commandÃ©s :*\n`;
    invoice.items.forEach(item => {
      msg += `â€¢ _${item.qty}x_ *${item.name}*   [${(item.qty * item.sellPrice).toFixed(2)}]\n`;
    });
    msg += `\nðŸ™ _Merci pour votre confiance !_`;

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
                {isRtl ? 'Ù…Ø¹Ø§ÙŠÙ†Ø© ÙˆØ·Ø¨Ø§Ø¹Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©' : 'Impression / AperÃ§u Facture'}
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
              {isRtl ? 'ÙØ§ØªÙˆØ±Ø© Ù‚ÙŠØ§Ø³ÙŠØ© A4' : 'Facture Standard A4'}
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
              {isRtl ? 'ØªØ°ÙƒØ±Ø© ØµÙ†Ø¯ÙˆÙ‚ POS' : 'Ticket de Caisse POS'}
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Printer className="w-4 h-4" />
            {isRtl ? 'Ø¨Ø¯Ø¡ Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ©' : 'Lancer l\'Impression'}
          </button>
        </div>

        {/* WhatsApp Sharing Bar */}
        <div className="p-4 border-b border-gray-100 bg-emerald-50/40 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <span className="p-1 px-2.5 bg-emerald-100 font-extrabold text-[10px] uppercase text-emerald-700 rounded-md">WhatsApp</span>
            <p className="text-xs font-bold">
              {isRtl ? 'Ø¥Ø±Ø³Ø§Ù„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ø¨Ø§Ø´Ø±Ø© Ù„Ù„Ø²Ø¨ÙˆÙ† :' : 'Envoyer la facture via WhatsApp au client :'}
            </p>
          </div>
          <div className="flex gap-2 w-full md:w-auto items-center">
            <input
              type="text"
              placeholder={isRtl ? 'Ø±Ù‚Ù… Ù‡Ø§ØªÙ Ø§Ù„Ø²Ø¨ÙˆÙ† (Ù…Ø«Ø§Ù„: 0612345678)...' : 'NÂ° WhatsApp (Ex: 0612345678)...'}
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold w-full md:w-56"
            />
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow transition-all whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isRtl ? 'Ø¥Ø±Ø³Ø§Ù„ Ø¨Ø§Ù„ÙˆØ§ØªØ³Ø§Ø¨' : 'Envoyer Direct'}</span>
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
                    <h1 className="text-4xl font-bold tracking-tight text-emerald-700 font-trad" style={{ fontFamily: 'Amiri, serif' }}>Ù…Ø­Ù„ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ</h1>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">
                      {isRtl ? 'ÙØ§ØªÙˆØ±Ø© Ø¨ÙŠØ¹' : 'Facture de Vente'}
                    </h2>
                    <p className="text-lg font-bold text-blue-700 font-mono mt-1">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {tLabel.invoiceDate} : <span className="font-semibold text-gray-700">{formattedDate}</span>
                    </p>
                  </div>
                </div>

                {/* Tiers / Billing Party address */}
                <div className="mb-8">
                  <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 max-w-sm">
                    <h4 className="text-xs font-bold uppercase text-blue-400 tracking-wider mb-2">
                      {isRtl ? 'Ø§Ù„Ù…ÙØ±Ø³ÙŽÙ„ Ø¥Ù„ÙŠÙ‡ (Ø§Ù„Ø²Ø¨ÙˆÙ†)' : 'Client'}
                    </h4>
                    <p className="font-bold text-gray-900 text-lg">{invoice.clientName}</p>
                    {invoice.clientPhone && (
                      <p className="text-sm font-semibold text-gray-700 mt-2">
                        {isRtl ? 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ:' : 'TÃ©lÃ©phone:'} {invoice.clientPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="flex-1 overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} border-collapse`}>
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                        <th className="py-3 px-4">{isRtl ? 'Ø§Ù„Ù…Ù†ØªØ¬ / Ø§Ù„ÙˆØµÙ' : "DÃ©signation Produit"}</th>
                        <th className="py-3 px-4 text-center">{isRtl ? 'Ø§Ù„ÙƒÙ…ÙŠØ©' : "QuantitÃ©"}</th>
                        <th className="py-3 px-4 text-right">{isRtl ? 'Ø³Ø¹Ø± Ø§Ù„ÙˆØ­Ø¯Ø©' : "Prix Unitaire"}</th>
                        <th className="py-3 px-4 text-right">{isRtl ? 'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ' : "Total Unitaire"}</th>
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
                      <span>{isRtl ? 'Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„Ø¬Ø²Ø¦ÙŠ :' : 'Sous-total :'}</span>
                      <span className="font-mono">{(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-red-600 font-medium">
                        <span>{isRtl ? 'Ø§Ù„ØªØ®ÙÙŠØ¶ Ø§Ù„Ù…Ø·Ø¨Ù‚ :' : 'Remise immÃ©diate :'}</span>
                        <span className="font-mono">-{invoice.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {invoice.tax > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>{isRtl ? 'Ø§Ù„Ø¶Ø±ÙŠØ¨Ø© (TVA) :' : 'Taxes (TVA) :'}</span>
                        <span className="font-mono">+{invoice.tax.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold text-blue-900">
                      <span>{isRtl ? 'Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ :' : 'Net Ã  payer :'}</span>
                      <span className="font-mono">{invoice.total.toFixed(2)}</span>
                    </div>
                    {invoice.paymentStatus && invoice.paymentStatus !== 'paid' && (
                      <>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-dashed border-gray-200 pt-2.5">
                          <span>{isRtl ? 'Ø§Ù„Ù…Ø¤Ø¯Ù‰ Ø¨Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ :' : 'Acompte RÃ©glÃ© :'}</span>
                          <span className="font-mono">{(invoice.amountPaid || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 font-extrabold text-[15px]">
                          <span>{isRtl ? 'Ø¨Ø§Ù‚ÙŠ Ø¯ÙŠÙ† Ù…Ø³ØªØ­Ù‚ :' : 'Reste dÃ» client :'}</span>
                          <span className="font-mono">{(invoice.amountDue || 0).toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Transaction terms */}
                <div className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400 leading-relaxed grid grid-cols-2">
                  <div>
                    <p>{isRtl ? 'Ø­Ø§Ù„Ø© Ø§Ù„Ø³Ø¯Ø§Ø¯ :' : 'Statut de paie :'} <span className="font-extrabold font-semibold text-indigo-700">
                      {invoice.status === 'cancelled' ? (isRtl ? 'Ù…Ù„ØºØ§Ø©' : 'AnnulÃ©e') :
                       invoice.paymentStatus === 'unpaid' ? (isRtl ? 'Ø¯ÙŠÙ† Ø¨Ø§Ù„ÙƒØ§Ù…Ù„' : 'Ã€ CrÃ©dit') :
                       invoice.paymentStatus === 'partial' ? (isRtl ? 'Ø¯ÙØ¹Ø©+Ø¯ÙŠÙ†' : 'Acompte + Reste') :
                       (isRtl ? 'Ø®Ø§Ù„Øµ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„' : 'PayÃ©e en totalitÃ©')}
                    </span></p>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <p className="font-semibold text-gray-600 italic">"{isRtl ? 'Ø´ÙƒØ±Ø§Ù‹ Ù„Ø²ÙŠØ§Ø±ØªÙƒÙ… ÙˆØµØ¯Ø§Ù‚ØªÙƒÙ…' : 'Merci pour votre confiance !'}"</p>
                  </div>
                </div>

              </div>
            ) : (
              /* Heat/Thermal POS Ticket Layout */
              <div className="flex flex-col text-gray-800 text-center font-mono">
                <h1 className="text-3xl font-bold tracking-tight font-trad text-slate-900 mb-4" style={{ fontFamily: 'Amiri, serif' }}>Ù…Ø­Ù„ Ø§Ù„Ù…Ø¨Ø§Ø±ÙƒÙŠ</h1>
                
                <div className="border-b border-dashed border-gray-300 my-3 pb-2 text-left text-xs leading-normal space-y-1">
                  <p><strong>{isRtl ? 'ØªØ°ÙƒØ±Ø© Ø±Ù‚Ù… :' : 'TICKET NÂ°:'}</strong> {invoice.invoiceNumber}</p>
                  <p><strong>{isRtl ? 'ØªØ§Ø±ÙŠØ® :' : 'DATE:'}</strong> {formattedDate}</p>
                  <p><strong>{isRtl ? 'Ø§Ù„Ø²Ø¨ÙˆÙ† :' : 'CLIENT:'}</strong> {invoice.clientName}</p>
                  {invoice.clientPhone && <p><strong>{isRtl ? 'Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ :' : 'TEL:'}</strong> {invoice.clientPhone}</p>}
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
                    <span>{isRtl ? 'Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ :' : 'SUBTOTAL:'}</span>
                    <span>{(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>{isRtl ? 'Ø®ØµÙ… :' : 'REMISE:'}</span>
                      <span>-{invoice.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-dashed border-gray-300 pt-2 text-blue-900">
                    <span>{isRtl ? 'Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ :' : 'TOTAL NET:'}</span>
                    <span>{invoice.total.toFixed(2)}</span>
                  </div>
                  {invoice.paymentStatus && invoice.paymentStatus !== 'paid' && (
                    <div className="text-[11px] font-bold space-y-1 pt-1.5 border-t border-dotted border-gray-300">
                      <div className="flex justify-between text-emerald-800">
                        <span>{isRtl ? 'Ø§Ù„Ù…Ø¤Ø¯Ù‰ Ø¨Ø§Ù„ØµÙ†Ø¯ÙˆÙ‚ :' : 'AVANCE PAYÃ‰E :' }</span>
                        <span>{(invoice.amountPaid || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>{isRtl ? 'Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ ÙƒØ¯ÙŠÙ† :' : 'RESTE DU :' }</span>
                        <span>{(invoice.amountDue || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-300 my-3 pt-2 text-center text-xs text-gray-500 space-y-1">
                  {invoice.paymentStatus === 'unpaid' ? (
                    <p className="uppercase text-rose-650 font-extrabold">{isRtl ? 'Ø¯ÙŠÙ† Ø¨Ø§Ù„ÙƒØ§Ù…Ù„' : 'Ã€ CRÃ‰DIT'}</p>
                  ) : invoice.paymentStatus === 'partial' ? (
                    <p className="uppercase text-amber-650 font-extrabold">{isRtl ? 'Ø¯ÙØ¹Ø©+Ø¯ÙŠÙ†' : 'ACOMPTE + RESTE'}</p>
                  ) : (
                    <p className="uppercase text-emerald-700 font-extrabold">{isRtl ? 'Ø®Ø§Ù„Øµ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„' : 'PAYÃ‰E EN TOTALITÃ‰'}</p>
                  )}
                  <p className="italic mt-3">{isRtl ? 'Ø´ÙƒØ±Ø§Ù‹ Ù„Ø²ÙŠØ§Ø±ØªÙƒÙ… ÙˆØµØ¯Ø§Ù‚ØªÙƒÙ…' : 'MERCI DE VOTRE VISITE !'}</p>
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
              ? 'ØªÙ„Ù…ÙŠØ­: Ø§Ø¶ØºØ· CTRL + P Ø£Ùˆ Ø±Ø² Ø§Ù„Ø·Ø¨Ø§Ø¹Ø© Ù„Ù„Ø·Ø¨Ø§Ø¹Ø© ÙƒÙ…Ù„Ù PDF' 
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


