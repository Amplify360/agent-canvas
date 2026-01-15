#!/usr/bin/env node
/**
 * Find unused exports and functions in the codebase
 * 
 * Usage: node scripts/find-unused.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Files to analyze
const CLIENT_DIR = join(ROOT, 'client');
const CONVEX_DIR = join(ROOT, 'convex');

// Ignore patterns
const IGNORE_PATTERNS = [
  /_generated/,
  /node_modules/,
  /\.test\./,
  /\.d\.ts$/,
  /api\.d\.ts$/,
  /api\.js$/,
  /server\.d\.ts$/,
  /server\.js$/,
  /dataModel\.d\.ts$/,
];

function getAllJsFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (IGNORE_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      getAllJsFiles(fullPath, files);
    } else if (extname(entry.name) === '.js' || extname(entry.name) === '.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractExports(content, filePath) {
  const exports = [];
  const lines = content.split('\n');
  
  // Match export patterns
  const exportPatterns = [
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+const\s+(\w+)/gm,
    /^export\s+let\s+(\w+)/gm,
    /^export\s+var\s+(\w+)/gm,
    /^export\s+(?:default\s+)?class\s+(\w+)/gm,
    /^export\s+\{\s*([^}]+)\s*\}/gm,
    /^export\s+default\s+function\s+(\w+)/gm,
  ];
  
  for (const pattern of exportPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        // Handle named exports: { a, b, c }
        const names = match[1].split(',').map(s => {
          const parts = s.trim().split(/\s+as\s+/);
          return parts[parts.length - 1].trim();
        });
        exports.push(...names);
      }
    }
  }
  
  // Also find function declarations that might be exported
  const functionPattern = /^function\s+(\w+)/gm;
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    // Check if this function is exported elsewhere in the file
    const funcName = match[1];
    if (content.includes(`export { ${funcName}`) || 
        content.includes(`export ${funcName}`) ||
        content.includes(`export default ${funcName}`)) {
      exports.push(funcName);
    }
  }
  
  return [...new Set(exports)];
}

function findUsages(exportName, allFiles, sourceFile) {
  const usages = [];
  
  for (const file of allFiles) {
    if (file === sourceFile) continue;
    
    const content = readFileSync(file, 'utf-8');
    
    // Check for imports
    const importPatterns = [
      new RegExp(`import\\s+.*\\b${exportName}\\b`, 'g'),
      new RegExp(`import\\s+.*\\{.*\\b${exportName}\\b.*\\}`, 'g'),
      new RegExp(`from\\s+['"].*['"]`, 'g'), // Will check if file imports from source
    ];
    
    // Check for direct usage (not imported)
    const usagePattern = new RegExp(`\\b${exportName}\\b`, 'g');
    
    // Check if file imports from source file
    const relativePath = file.replace(ROOT, '').replace(/\\/g, '/');
    const sourceRelative = sourceFile.replace(ROOT, '').replace(/\\/g, '/');
    
    if (content.includes(`from '${sourceRelative}'`) || 
        content.includes(`from "${sourceRelative}"`) ||
        content.includes(`from './`) || // Relative imports
        content.includes(`from '../`)) {
      
      if (usagePattern.test(content) || importPatterns.some(p => p.test(content))) {
        usages.push(file);
      }
    }
    
    // Also check for direct usage in same directory or known patterns
    if (usagePattern.test(content) && !content.includes('export')) {
      // Might be a usage, but need to verify it's not a definition
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (new RegExp(`\\b${exportName}\\b`).test(lines[i])) {
          // Check if it's not a definition
          if (!lines[i].includes(`function ${exportName}`) &&
              !lines[i].includes(`const ${exportName}`) &&
              !lines[i].includes(`let ${exportName}`) &&
              !lines[i].includes(`var ${exportName}`)) {
            usages.push(file);
            break;
          }
        }
      }
    }
  }
  
  return usages;
}

function analyzeFile(filePath, allFiles) {
  const content = readFileSync(filePath, 'utf-8');
  const exports = extractExports(content, filePath);
  const unused = [];
  
  for (const exp of exports) {
    // Skip common patterns that are always used
    if (exp === 'default' || exp === 'state' || exp === 'api' || exp === 'internal') {
      continue;
    }
    
    const usages = findUsages(exp, allFiles, filePath);
    
    if (usages.length === 0) {
      unused.push({
        name: exp,
        file: filePath.replace(ROOT, ''),
      });
    }
  }
  
  return unused;
}

function main() {
  console.log('🔍 Analyzing codebase for unused exports...\n');
  
  const clientFiles = getAllJsFiles(CLIENT_DIR);
  const convexFiles = getAllJsFiles(CONVEX_DIR);
  const allFiles = [...clientFiles, ...convexFiles];
  
  const allUnused = [];
  
  for (const file of allFiles) {
    const unused = analyzeFile(file, allFiles);
    if (unused.length > 0) {
      allUnused.push({ file, unused });
    }
  }
  
  if (allUnused.length === 0) {
    console.log('✅ No unused exports found!');
    return;
  }
  
  console.log(`⚠️  Found ${allUnused.reduce((sum, f) => sum + f.unused.length, 0)} potentially unused exports:\n`);
  
  for (const { file, unused } of allUnused) {
    const relativePath = file.replace(ROOT, '');
    console.log(`📄 ${relativePath}`);
    for (const { name } of unused) {
      console.log(`   - ${name}`);
    }
    console.log();
  }
  
  console.log('\n💡 Note: This is a basic analysis. Some exports might be:');
  console.log('   - Used dynamically');
  console.log('   - Used in HTML files');
  console.log('   - Used in tests');
  console.log('   - Part of a public API');
  console.log('\n   Always verify before removing!');
}

main();
