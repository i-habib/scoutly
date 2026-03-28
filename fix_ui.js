const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Idea 3: Diffused Soft Shadows + rounded-[1.45rem] instead of rounded-2xl
    content = content.replace(/rounded-2xl border border-slate-200 bg-white/g, 'rounded-[1.45rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]');
    
    // Idea 3 for rounded-xl:
    content = content.replace(/rounded-xl border border-slate-200 bg-white/g, 'rounded-[1.25rem] border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]');

    // Make sure we apply the spring micro-animation to key cards like EventCard, SnapshotRow, etc.
    // Instead of regexing all cards, let's find `hover:scale-105` or `transition-all` inside Link or button and enhance it.
    // Wait, the bento cards we replaced might not be interactive.
    // Let's add hover classes only when they had `hover:` before, or if it's a specific element we want.

    // Let's enhance any gradient button or primary button with tinted shadows (Idea 5)
    // Emerald buttons:
    content = content.replace(/bg-emerald-600([^"']*)text-white/g, 'bg-emerald-600$1text-white shadow-[0_8px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:-translate-y-0.5');
    
    // Sky buttons:
    content = content.replace(/bg-sky-600([^"']*)text-white/g, 'bg-sky-600$1text-white shadow-[0_8px_16px_rgba(14,165,233,0.2)] hover:shadow-[0_8px_20px_rgba(14,165,233,0.3)] hover:-translate-y-0.5');
    
    // Slate-900 primary buttons (like Save Changes)
    content = content.replace(/bg-slate-900([^"']*)text-white/g, 'bg-slate-900$1text-white shadow-[0_8px_16px_rgba(15,23,42,0.2)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.3)] hover:-translate-y-0.5');

    // Gradients (from-emerald-600 to-sky-600):
    content = content.replace(/from-emerald-600 to-sky-600([^"']*)text-white/g, 'from-emerald-600 to-sky-600$1text-white shadow-[0_8px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_12px_24px_rgba(16,185,129,0.3)] hover:-translate-y-0.5');

    // Add interactive spring animation to any rounded-[1.45rem] card that is wrapped in <Link className="...">
    // Or we just add it to any clickable bento element.
    // Actually, we can just replace `transition-all hover:scale-105` with our smoother spring:
    content = content.replace(/transition-all hover:scale-105/g, 'transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:border-emerald-200');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    }
});
