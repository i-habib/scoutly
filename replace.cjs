const fs = require('fs');
let content = fs.readFileSync('src/routes/profile.tsx', 'utf-8');

// 1. Remove app-shell__grid and app-shell__glow
content = content.replace(/app-shell__grid/g, '');
content = content.replace(/app-shell__glow/g, '');

// 2. Cards
content = content.replace(/rounded-\[1\.45rem\] border border-slate-100 bg-white shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, 'rounded-2xl border border-gray-200 bg-white shadow-sm');
content = content.replace(/rounded-\[1\.25rem\] border border-slate-100 bg-white shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, 'rounded-xl border border-gray-200 bg-white shadow-sm');

// 3. Primary buttons
content = content.replace(/bg-slate-900 px-4 py-2 font-semibold text-white shadow-\[0_8px_16px_rgba\(15,23,42,0\.2\)\] hover:shadow-\[0_8px_20px_rgba\(15,23,42,0\.3\)\] hover:-translate-y-0\.5 transition-colors hover:bg-slate-800/g, 'bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 transition-colors');

// 4. BadgeCount styles
content = content.replace(/emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',/g, "emerald: 'border-gray-200 bg-gray-50 text-gray-900',");
content = content.replace(/sky: 'border-sky-200 bg-sky-50 text-sky-900',/g, "sky: 'border-gray-200 bg-gray-50 text-gray-900',");
content = content.replace(/slate: 'border-slate-200 bg-slate-50 text-slate-900',/g, "slate: 'border-gray-200 bg-gray-50 text-gray-900',");

// 5. Replace any remaining slate with gray
content = content.replace(/(text|bg|border|ring|from|to|via)-slate-([0-9]{2,3})/g, '$1-gray-$2');
content = content.replace(/(text|bg|border|ring|from|to|via)-emerald-([0-9]{2,3})/g, '$1-gray-$2');
content = content.replace(/(text|bg|border|ring|from|to|via)-sky-([0-9]{2,3})/g, '$1-gray-$2');

fs.writeFileSync('src/routes/profile.tsx', content);
console.log('done');
