import { remark } from 'remark';
import fs from 'fs';

const content = fs.readFileSync('src/content/posts/Re4B/chapter1_28_part1.md', 'utf-8');

// Remove frontmatter
const withoutFrontmatter = content.replace(/^---[\s\S]*?---\r?\n/, '');

const tree = remark().parse(withoutFrontmatter);

// Show first 15 children types and a snippet of their value
for (let i = 0; i < Math.min(tree.children.length, 25); i++) {
    const node = tree.children[i];
    const val = node.value ? node.value.substring(0, 120).replace(/\n/g, '\\n') : '';
    const childCount = node.children ? node.children.length : 0;
    console.log(`[${i}] type="${node.type}" children=${childCount} value="${val}"`);
    
    // If it has children, show the first few
    if (node.children) {
        for (let j = 0; j < Math.min(node.children.length, 3); j++) {
            const child = node.children[j];
            const cval = child.value ? child.value.substring(0, 80).replace(/\n/g, '\\n') : '';
            console.log(`    [${j}] type="${child.type}" value="${cval}"`);
        }
    }
}

// Count types
const typeCounts = {};
function countTypes(node) {
    typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    if (node.children) node.children.forEach(countTypes);
}
countTypes(tree);
console.log('\n--- Type counts ---');
console.log(typeCounts);

// Count text from text nodes
let textNodeText = '';
let htmlNodeText = '';
function visit(node) {
    if (node.type === 'text' && node.value) textNodeText += node.value + ' ';
    if (node.type === 'html' && node.value) {
        const stripped = node.value.replace(/<[^>]*>/g, ' ').replace(/&[a-zA-Z]+;/g, ' ').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
        htmlNodeText += stripped + ' ';
    }
    if (node.children) node.children.forEach(visit);
}
visit(tree);
console.log(`\nText from "text" nodes: ${textNodeText.split(/\s+/).filter(Boolean).length} words`);
console.log(`Text from "html" nodes: ${htmlNodeText.split(/\s+/).filter(Boolean).length} words`);
console.log(`Total: ${(textNodeText + htmlNodeText).split(/\s+/).filter(Boolean).length} words`);
