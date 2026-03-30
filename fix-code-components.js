import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.md')) {
                results.push(file);
            }
        }
    });
    return results;
}

const targetDir = path.join(__dirname, 'src', 'content', 'posts');
const files = walk(targetDir);

function unescapeHTML(str) {
    return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

let modifiedFiles = 0;
let totalReplaced = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Using a multiline non-greedy regex
    const regex = /<!-- 🧠 Code Block Component -->\s*<div\s+class="code-box"\s+data-lang="([^"]+)"[\s\S]*?<code>\s*([\s\S]*?)\s*<\/code>[\s\S]*?<\/div>/g;
    
    let fileReplacedCount = 0;
    const newContent = content.replace(regex, (match, p1, p2) => {
        let lang = p1.toLowerCase();
        let code = unescapeHTML(p2).trimEnd();
        if (code.startsWith("\n")) {
            code = code.substring(1);
        }
        
        fileReplacedCount++;
        totalReplaced++;
        return `\`\`\`${lang}\n${code}\n\`\`\``;
    });

    if (fileReplacedCount > 0) {
        fs.writeFileSync(file, newContent, 'utf8');
        modifiedFiles++;
        console.log(`Updated ${path.basename(file)}: replaced ${fileReplacedCount} blocks`);
    }
}

console.log(`Done! Modified ${modifiedFiles} files, replaced ${totalReplaced} code block structures.`);
