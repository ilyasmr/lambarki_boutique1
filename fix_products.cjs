const fs = require('fs');
let content = fs.readFileSync('src/components/ProductsList.tsx', 'utf8');

const insertion = `

              {/* Min Stock Alert (Only when editing) */}
              {editingId !== null && (
                <div className="space-y-1">
                  <label className="text-xxs text-amber-600 uppercase tracking-wide">{isRtl ? 'حد التنبيه الأدنى' : 'Seuil d\\'Alerte Minimum'}</label>
                  <input
                    type="number"
                    min="1"
                    disabled={isCashier}
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className={\`w-full px-3.5 py-2.5 border rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 \${isCashier ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75 font-normal' : 'bg-gray-50 border-gray-200 focus:bg-white text-slate-850'}\`}
                  />
                </div>
              )}`;

content = content.replace('</div>\n\n              {/* Footer */}', '</div>' + insertion + '\n\n              {/* Footer */}');

fs.writeFileSync('src/components/ProductsList.tsx', content);
console.log('Fixed ProductsList.tsx');
