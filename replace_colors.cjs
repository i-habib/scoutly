const fs = require('fs');

const path = '/Users/admin/Documents/Github Repos/Scoutly/src/routes/events.tsx';
let content = fs.readFileSync(path, 'utf8');

// Slate and Gray replacements
const colorMap = {
  'slate-900': 'stone-800',
  'slate-800': 'stone-700',
  'slate-700': 'stone-600',
  'slate-600': 'stone-500',
  'slate-500': 'stone-400',
  'slate-400': 'stone-400',
  'slate-200': 'stone-200',
  'slate-100': 'stone-100',
  'slate-50': 'stone-50',
  'gray-950': 'stone-900',
  'gray-700': 'stone-600',
  'gray-600': 'stone-500',
  'gray-500': 'stone-500',
  'gray-300': 'stone-300',
  'gray-200': 'stone-200',
  'gray-100': 'stone-100',
  'gray-50': 'stone-50'
};

for (const [oldColor, newColor] of Object.entries(colorMap)) {
  const regex = new RegExp(`\\b${oldColor}\\b`, 'g');
  content = content.replace(regex, newColor);
}

// Decoration
content = content.replace(/decoration-(?:slate|stone)-400/g, 'decoration-stone-400');
content = content.replace(/hover:decoration-(?:slate|stone)-600/g, 'hover:decoration-stone-600');

// Focus rings
content = content.replace(/focus:ring-(?:slate|stone)-400/g, 'focus:ring-stone-300');
content = content.replace(/focus:border-transparent/g, 'focus:border-stone-400');

// Overlay
content = content.replace(/bg-(?:slate|stone)-900\/35/g, 'bg-stone-900/30');

// Event type colors
content = content.replace(/bg-sky-50 text-sky-[0-9]+ border-sky-[0-9]+/g, 'border-sky-200 bg-sky-50 text-sky-800');
content = content.replace(/bg-emerald-50 text-emerald-[0-9]+ border-emerald-[0-9]+/g, 'border-emerald-200 bg-emerald-50 text-emerald-800');
content = content.replace(/bg-violet-50 text-violet-[0-9]+ border-violet-[0-9]+/g, 'border-violet-200 bg-violet-50 text-violet-800');

// getEventTypeColor default fallback replacement
content = content.replace(/bg-(?:slate|stone)-100 text-(?:slate|stone)-700 border-(?:slate|stone)-200/g, 'border-stone-200 bg-stone-100 text-stone-700');

// Priority Colors
content = content.replace(/const getPriorityColor = \(priority: string \| undefined\) => \{[\s\S]*?\};/, `const getPriorityColor = (priority: string | undefined) => {
    if (!priority || typeof priority !== 'string') return 'bg-stone-100 text-stone-700 border-stone-200';
    if (priority === 'high') return 'bg-stone-800 text-white border-stone-800';
    if (priority === 'medium') return 'bg-stone-200 text-stone-800 border-stone-300';
    return 'bg-stone-100 text-stone-700 border-stone-200';
  };`);

// Regex for buttons (radius, padding, weight)
content = content.replace(/<button\b([^>]*)className="([^"]*)"/g, (match, p1, p2) => {
  let classes = p2.split(' ');
  let newClasses = [];
  
  for (let c of classes) {
    if (c.startsWith('rounded-')) continue;
    if (c === 'rounded') continue;
    if (c.startsWith('px-') || c.startsWith('py-')) continue;
    if (c === 'font-bold') {
      newClasses.push('font-medium');
      continue;
    }
    if (c) newClasses.push(c);
  }
  
  newClasses.push('rounded-xl');
  newClasses.push('px-4', 'py-2.5');
  
  if (!newClasses.includes('font-medium') && !newClasses.includes('font-semibold') && !newClasses.includes('font-normal')) {
    newClasses.push('font-medium');
  }

  return `<button ${p1}className="${newClasses.join(' ')}"`;
});

// Link buttons (ones functioning as buttons)
// We might just search for "rounded-" and if it contains "rounded-" inside a className we replace based on type, but regex is tricky. Let's do it globally for inputs and cards.

content = content.replace(/<(input|textarea|select)\b([^>]*)className="([^"]*)"/g, (match, tag, p1, p2) => {
  let classes = p2.split(' ');
  let newClasses = [];
  for (let c of classes) {
    if (c.startsWith('rounded-') || c === 'rounded') continue;
    if (c) newClasses.push(c);
  }
  newClasses.push('rounded-xl');
  return `<${tag} ${p1}className="${newClasses.join(' ')}"`;
});

content = content.replace(/<div\b([^>]*)className="([^"]*bg-white[^"]*border[^"]*)"/g, (match, p1, p2) => {
  let classes = p2.split(' ');
  let newClasses = [];
  let isCard = classes.includes('bg-white') && (classes.includes('border') || classes.includes('border-stone-200'));
  
  for (let c of classes) {
    if (isCard && (c.startsWith('rounded-') || c === 'rounded')) continue;
    if (c) newClasses.push(c);
  }
  if (isCard) {
    newClasses.push('rounded-2xl');
  }
  return `<div ${p1}className="${newClasses.join(' ')}"`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Colors replaced successfully!');
