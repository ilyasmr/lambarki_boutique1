const fs = require('fs');
let content = fs.readFileSync('src/components/ClientsList.tsx', 'utf8');

// 1. Remove the Red Banner since they've seen it and it worked.
content = content.replace(/<div className="lg:col-span-12 bg-rose-600 text-white p-6 rounded-2xl shadow-xl border-4 border-yellow-400 animate-pulse text-center">[\s\S]*?<\/div>/, '');

// 2. Wrap the existing desktop table in hidden md:block, and remove block/md: classes from it so it's a pure table.
let desktopTable = content.match(/<table className="w-full text-start block md:table">[\s\S]*?<\/table>/)[0];
// Clean up the desktop table to remove mobile artifacts
desktopTable = desktopTable.replace('block md:table', 'table');
desktopTable = desktopTable.replace(/<thead className="hidden md:table-header-group">/g, '<thead className="table-header-group">');
desktopTable = desktopTable.replace(/<tbody className="block md:table-row-group md:divide-y md:divide-gray-50 font-semibold text-slate-800 space-y-3 md:space-y-0 pb-4 md:pb-0">/g, '<tbody className="table-row-group divide-y divide-gray-50 font-semibold text-slate-800">');
desktopTable = desktopTable.replace(/className={`block md:table-row text-xs cursor-pointer transition p-4 md:p-0 bg-white rounded-2xl shadow-sm border border-gray-100 md:border-none md:shadow-none md:rounded-none md:bg-transparent relative \$\{/g, 'className={`table-row text-xs cursor-pointer transition relative ${');
desktopTable = desktopTable.replace(/className="block md:table-cell py-1 md:py-4 md:px-4 font-bold text-gray-800 text-start"/g, 'className="table-cell py-4 px-4 font-bold text-gray-800 text-start"');
desktopTable = desktopTable.replace(/<div className="w-12 h-12 md:w-10 md:h-10 /g, '<div className="w-10 h-10 ');
desktopTable = desktopTable.replace(/className="font-extrabold text-gray-900 text-\[15px\] md:text-\[13px\]"/g, 'className="font-extrabold text-gray-900 text-[13px]"');
desktopTable = desktopTable.replace(/className="text-\[10px\] md:text-\[9px\] /g, 'className="text-[9px] ');
desktopTable = desktopTable.replace(/className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-4 font-semibold text-gray-700 font-mono text-start border-t border-dashed border-gray-100 md:border-none mt-3 md:mt-0 pt-3 md:pt-4"/g, 'className="table-cell py-4 px-4 font-semibold text-gray-700 font-mono text-start"');
desktopTable = desktopTable.replace(/<span className="md:hidden text-gray-400 font-medium text-\[10px\] uppercase">[^<]*<\/span>\s*/g, '');
desktopTable = desktopTable.replace(/className="text-sm md:text-xs bg-slate-50 md:bg-transparent px-2 py-1 md:p-0 rounded-md border border-slate-100 md:border-none"/g, 'className="text-xs"');
desktopTable = desktopTable.replace(/className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-4 text-center border-t border-dashed border-gray-100 md:border-none"/g, 'className="table-cell py-4 px-4 text-center"');
desktopTable = desktopTable.replace(/className="flex flex-col gap-1 items-end md:items-center justify-center"/g, 'className="flex flex-col gap-1 items-center justify-center"');
desktopTable = desktopTable.replace(/className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-\[10px\] md:text-\[9.5px\] font-black \$\{status.className\} min-w-\[95px\] shadow-xxs justify-between`}/g, 'className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9.5px] font-black ${status.className} min-w-[95px] shadow-xxs justify-between`}');
desktopTable = desktopTable.replace(/className="text-\[8px\] md:text-\[7.5px\] /g, 'className="text-[7.5px] ');
desktopTable = desktopTable.replace(/text-sm md:text-xs/g, 'text-xs');
desktopTable = desktopTable.replace(/className="flex justify-between items-center md:table-cell py-2 md:py-4 md:px-4 text-end border-t border-dashed border-gray-100 md:border-none"/g, 'className="table-cell py-4 px-4 text-end"');
desktopTable = desktopTable.replace(/className="font-extrabold text-rose-600 font-mono text-\[14px\] md:text-\[13px\] tracking-tight bg-rose-50\/80 px-2.5 py-1 md:py-0.5 rounded border border-rose-100 shadow-xxs"/g, 'className="font-extrabold text-rose-600 font-mono text-[13px] tracking-tight bg-rose-50/80 px-2.5 py-0.5 rounded border border-rose-100 shadow-xxs"');
desktopTable = desktopTable.replace(/mt-0.5 md:mt-0/g, 'mt-0');
desktopTable = desktopTable.replace(/bg-gray-50 md:bg-transparent px-2 py-1 md:p-0 rounded border border-gray-100 md:border-none/g, '');
desktopTable = desktopTable.replace(/className="flex md:table-cell py-3 md:py-4 md:px-4 text-center border-t border-dashed border-gray-100 md:border-none bg-slate-50 md:bg-transparent rounded-xl mt-3 md:mt-0 px-3 md:px-4"/g, 'className="table-cell py-4 px-4 text-center"');
desktopTable = desktopTable.replace(/flex-1 md:flex-none p-2 px-4 hover:bg-white md:hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 md:border-gray-150 transition shadow-xxs md:shadow-none flex justify-center items-center gap-1.5 bg-white md:bg-transparent/g, 'p-2 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-150 transition flex justify-center items-center');
desktopTable = desktopTable.replace(/flex-1 md:flex-none p-2 px-4 bg-white md:bg-transparent hover:bg-rose-50 text-rose-600 rounded-lg border border-rose-150 md:border-rose-100 transition shadow-xxs md:shadow-none flex justify-center items-center gap-1.5/g, 'p-2 hover:bg-rose-50 text-rose-600 rounded-lg border border-rose-100 transition flex justify-center items-center');
desktopTable = desktopTable.replace(/w-4 h-4 md:w-3.5 md:h-3.5/g, 'w-3.5 h-3.5');
desktopTable = desktopTable.replace(/<tr className="block md:table-row">/g, '<tr className="table-row">');
desktopTable = desktopTable.replace(/className="block md:table-cell /g, 'className="table-cell ');

const mobileCards = `
          {/* MOBILE CARDS */}
          <div className="md:hidden space-y-4 px-4 pb-8 pt-2">
            {filteredClients.map((c) => (
              <div 
                key={c.id}
                onClick={() => { setSelectedClient(c); setIsMaximized(true); }}
                className={\`bg-white rounded-2xl shadow-sm border p-4 flex flex-col gap-4 relative overflow-hidden transition-all duration-200 active:scale-[0.98] \${
                  selectedClient && selectedClient.id === c.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
                }\`}
              >
                {/* Header: Avatar + Name + Check tags */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xl font-black shadow-sm shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-gray-900 text-[16px] leading-tight mb-1 truncate">{c.name}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md">#{String(getSequentialNumber(c)).padStart(2, '0')}</span>
                      {c.postalChecks && c.postalChecks.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-150 animate-pulse animate-duration-1000">
                          {isRtl ? \`شيكات (\${c.postalChecks.length})\` : \`Chèques (\${c.postalChecks.length})\`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 font-medium text-[9px] uppercase tracking-wider">{tLabel.phoneNumber}</span>
                    <span className="text-[12px] font-semibold text-gray-700 font-mono truncate">{c.phone || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-end text-end">
                    <span className="text-gray-400 font-medium text-[9px] uppercase tracking-wider">{isRtl ? 'الأردواز / الديون' : 'Ardoise / Dettes'}</span>
                    {c.outstandingDebt && c.outstandingDebt > 0 ? (
                      <span className="font-black text-rose-600 font-mono text-[14px] bg-rose-100 px-2 rounded-md truncate max-w-full">
                        {c.outstandingDebt.toFixed(2)} DH
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium font-mono text-[12px]">0.00 DH</span>
                    )}
                  </div>
                </div>

                {/* Actions (if not cashier) */}
                {currentUser?.role !== 'cashier' && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={(e) => handleEditClick(c, e)}
                      className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 font-bold text-[12px] flex justify-center items-center gap-2 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                      {t.edit || 'Edit'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setClientToDelete(c); }}
                      className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 font-bold text-[12px] flex justify-center items-center gap-2 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t.delete || 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredClients.length === 0 && (
              <div className="text-center py-12 px-6 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 font-semibold">{isRtl ? 'لا يوجد عملاء.' : 'Aucun client.'}</p>
              </div>
            )}
          </div>
`;

content = content.replace(/<table className="w-full text-start block md:table">[\s\S]*?<\/table>/, mobileCards + '\n          <div className="hidden md:block overflow-x-auto">\n            <table className="w-full text-start table">\n' + desktopTable.replace('<table className="w-full text-start table">', '') + '\n          </div>');


// 3. Fix the Purchases table in the Profile Panel
const profilePurchasesTable = content.match(/<table className="w-full text-left border-collapse">[\s\S]*?<\/table>/)[0];
// We'll wrap it in hidden md:table, and add a mobile list version!
const desktopPurchasesTable = profilePurchasesTable.replace('className="w-full text-left border-collapse"', 'className="w-full text-left border-collapse hidden md:table"');

const mobilePurchasesList = `
                              {/* Mobile View for Purchases */}
                              <div className="md:hidden space-y-2">
                                {safeItems.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100 shadow-xxs">
                                    <div className="flex flex-col max-w-[65%]">
                                      <span className="text-[11px] font-bold text-gray-800 truncate">{item.name || 'Unknown'}</span>
                                      <span className="text-[9px] font-mono text-gray-500">{item.qty} x {Number(item.sellPrice || 0).toFixed(2)} DH</span>
                                    </div>
                                    <div className="text-[12px] font-black font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                      {(Number(item.qty || 0) * Number(item.sellPrice || 0)).toFixed(2)} DH
                                    </div>
                                  </div>
                                ))}
                              </div>
`;

content = content.replace(profilePurchasesTable, mobilePurchasesList + '\n' + desktopPurchasesTable);

fs.writeFileSync('src/components/ClientsList.tsx', content);
console.log('Successfully updated ClientsList tables for Mobile!');
