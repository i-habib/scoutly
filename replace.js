const fs = require('fs');
let content = fs.readFileSync('src/routes/profile.tsx', 'utf-8');

// 1. Replace slate with gray
content = content.replace(/slate-/g, 'gray-');

// 2. Remove app-shell__grid and app-shell__glow
content = content.replace(/app-shell__grid/g, '');
content = content.replace(/app-shell__glow/g, '');

// 3. Cards
content = content.replace(/border border-gray-100 bg-white shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, 'bg-white border border-gray-200 shadow-sm');

// 4. Primary buttons
content = content.replace(/bg-gray-900 px-4 py-2 font-semibold text-white shadow-\[0_8px_16px_rgba\(15,23,42,0\.2\)\] hover:shadow-\[0_8px_20px_rgba\(15,23,42,0\.3\)\] hover:-translate-y-0\.5 transition-colors hover:bg-gray-800/g, 'bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 transition-colors');

// 5. Notification checkboxes
content = content.replace(/bg-gray-50/g, 'bg-gray-50'); // It's already mostly gray, but let's check
content = content.replace(/focus:ring-gray-500/g, 'focus:ring-gray-400');

// 6. BadgeCount styles
content = content.replace(/emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',/g, "emerald: 'border-gray-200 bg-gray-50 text-gray-900',");
content = content.replace(/sky: 'border-sky-200 bg-sky-50 text-sky-900',/g, "sky: 'border-gray-200 bg-gray-50 text-gray-900',");

fs.writeFileSync('src/routes/profile.tsx', content);
console.log('done');
