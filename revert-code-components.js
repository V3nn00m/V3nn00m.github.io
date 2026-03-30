import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFiles = [
    '2026-1-30-chapter1_23.md',
    '2026-1-3-chapter1.18part2.md',
    '2026-1-9-chapter1_19To1_20.md',
    '2026-2-5-chapter1_24.md',
    '2026-3-6-chapter1_25_Part2.md',
    '2026-3-18-chapter1_26_Part1.md',
    '2026-2-21-chapter1_25_Part1.md'
];

let modifiedFiles = 0;
let totalReplaced = 0;

for (const filename of targetFiles) {
    const file = path.join(__dirname, 'src', 'content', 'posts', 'Re4B', filename);
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        continue;
    }

    let content = fs.readFileSync(file, 'utf8');
    
    // Using regex to find markdown code blocks
    const regex = /```([a-zA-Z0-9_+\-]+)\n([\s\S]*?)\n```/g;
    
    let fileReplacedCount = 0;
    const newContent = content.replace(regex, (match, lang, code) => {
        // Escape HTML entities to match original structure
        let escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        fileReplacedCount++;
        totalReplaced++;
        
        let displayLang = lang;
        if (lang.toLowerCase() === 'assembly') displayLang = 'Assembly';
        if (lang.toLowerCase() === 'c') displayLang = 'C';
        if (lang.toLowerCase() === 'c/c++') displayLang = 'C/C++';
        if (lang.toLowerCase() === 'bash') displayLang = 'Bash';
        if (lang.toLowerCase() === 'nasm') displayLang = 'NASM';
        if (lang.toLowerCase() === 'text') displayLang = 'Text';

        return `<!-- 🧠 Code Block Component -->\n<div class="code-box" data-lang="${displayLang}" style="border:1px solid #30363d;border-radius:8px;overflow:hidden;background:#0d1117;font-family:Consolas, monospace;">\n  <pre style="margin:0;padding:1rem;font-size:15px;line-height:1.6;overflow-x:auto;color:#c9d1d9;">\n<code>\n${escapedCode}\n</code>\n  </pre>\n</div>`;
    });

    if (fileReplacedCount > 0) {
        fs.writeFileSync(file, newContent, 'utf8');
        modifiedFiles++;
        console.log(`Reverted ${filename}: replaced ${fileReplacedCount} blocks back to HTML`);
    }
}

console.log(`Done! Reverted ${modifiedFiles} files, ${totalReplaced} code blocks restored.`);
