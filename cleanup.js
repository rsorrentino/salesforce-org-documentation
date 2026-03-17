#!/usr/bin/env node
/**
 * Cleanup Script
 * 
 * Removes all generated files to allow for a fresh regeneration/reinitialization.
 * 
 * Removes:
 * - pages/ directory (all generated HTML pages)
 * - index.html (root index page)
 * - data/metadata.json (analyzed metadata cache)
 * 
 * Keeps:
 * - templates/ (source templates)
 * - css/ (styles)
 * - js/ (scripts)
 * - generators/ (generator code)
 * - analyzer.js, generate.js, init.js, update.js, serve.js (scripts)
 * - package.json, package-lock.json (dependencies)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = __dirname;

/**
 * Remove a file or directory recursively
 */
async function removePath(targetPath) {
    try {
        const stats = await fs.stat(targetPath);
        if (stats.isDirectory()) {
            await fs.rm(targetPath, { recursive: true, force: true });
            return true;
        } else {
            await fs.unlink(targetPath);
            return true;
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File/directory doesn't exist, which is fine
            return false;
        }
        throw error;
    }
}

/**
 * Main cleanup function
 */
async function cleanup() {
    console.log('🧹 Cleaning up generated files...\n');
    
    const itemsToRemove = [
        { path: path.join(DOCS_DIR, 'pages'), name: 'pages/ directory' },
        { path: path.join(DOCS_DIR, 'index.html'), name: 'index.html' },
        { path: path.join(DOCS_DIR, 'data', 'metadata.json'), name: 'data/metadata.json' }
    ];
    
    let removed = 0;
    let skipped = 0;
    
    for (const item of itemsToRemove) {
        try {
            const existed = await removePath(item.path);
            if (existed) {
                console.log(`  ✅ Removed: ${item.name}`);
                removed++;
            } else {
                console.log(`  ⏭️  Skipped: ${item.name} (does not exist)`);
                skipped++;
            }
        } catch (error) {
            console.error(`  ❌ Error removing ${item.name}:`, error.message);
        }
    }
    
    // Also remove the data directory if it's empty
    try {
        const dataDir = path.join(DOCS_DIR, 'data');
        const entries = await fs.readdir(dataDir).catch(() => []);
        if (entries.length === 0) {
            await fs.rmdir(dataDir);
            console.log(`  ✅ Removed: data/ directory (empty)`);
        }
    } catch (error) {
        // Ignore if data directory doesn't exist or can't be removed
    }
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   - Removed: ${removed} item(s)`);
    console.log(`   - Skipped: ${skipped} item(s) (did not exist)`);
    console.log(`\n📝 Next steps:`);
    console.log(`   - Run 'npm run init' to initialize from scratch`);
    console.log(`   - Run 'npm run generate' to regenerate documentation`);
}

// Run cleanup
cleanup().catch(error => {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
});
