/**
 * Pandoc Importer
 *
 * Reads Markdown files from pandoc-generated source folders (configured via
 * config.pandocPaths) and copies them into the MkDocs docs tree under
 * docs/functional/<section>/.
 *
 * Returns an array of MkDocs nav entries that MkDocsGenerator can include
 * in mkdocs.yml under the "Functional Documentation" section.
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';

export class PandocImporter extends BaseGenerator {
    /**
     * @param {string}  repoRoot  – Salesforce metadata repository root
     * @param {Object}  data      – Shared analysis data (not actively used here)
     * @param {string}  toolDir   – Directory where this tool lives (generate.js location)
     * @param {Object}  config    – Merged configuration from config.js
     */
    constructor(repoRoot, data, toolDir, config) {
        super(repoRoot, data, toolDir);
        this.config = config;
        this.docsDir = path.join(toolDir, config.docsOutputDir || 'docs');
        this.type = 'pandoc';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Import all pandoc-configured folders.
     * @returns {Promise<Array>} Array of MkDocs nav entries (may be empty).
     */
    async importAll() {
        const pandocPaths = (this.config.pandocPaths || []).filter(Boolean);
        if (pandocPaths.length === 0) {
            return [];
        }

        console.log(`  Importing ${pandocPaths.length} pandoc-generated folder(s)...`);

        const navEntries = [];
        const functionalDir = path.join(this.docsDir, 'functional');
        await fs.mkdir(functionalDir, { recursive: true });

        for (const entry of pandocPaths) {
            try {
                const navEntry = await this._importFolder(entry, functionalDir);
                if (navEntry) {
                    navEntries.push(navEntry);
                }
            } catch (err) {
                console.error(`    Error importing pandoc folder "${entry.path}": ${err.message}`);
            }
        }

        return navEntries;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Import a single pandoc source folder.
     * @param {Object} entry        – { path, section, title }
     * @param {string} functionalDir – Destination parent directory (docs/functional/)
     * @returns {Object|null} A single MkDocs nav entry or null if nothing was copied.
     */
    async _importFolder(entry, functionalDir) {
        // Resolve the source path relative to the tool directory (this.outputDir is
        // set by BaseGenerator to the resolved toolDir, i.e. the documentation-portal
        // folder, not the generated docs/ sub-directory).
        const sourcePath = path.isAbsolute(entry.path)
            ? entry.path
            : path.resolve(this.outputDir, entry.path);

        const sectionName = entry.section || path.basename(entry.path);
        const title = entry.title || sectionName;
        const destDir = path.join(functionalDir, sectionName);

        // Verify source exists
        try {
            await fs.access(sourcePath);
        } catch {
            console.warn(`    Warning: pandoc source path not found, skipping: ${sourcePath}`);
            return null;
        }

        await fs.mkdir(destDir, { recursive: true });

        // Copy all markdown files preserving the sub-directory structure
        const mdFiles = await this._findMarkdownFiles(sourcePath);
        if (mdFiles.length === 0) {
            console.warn(`    Warning: no .md files found in: ${sourcePath}`);
            return null;
        }

        const navItems = [];
        for (const filePath of mdFiles) {
            const relPath = path.relative(sourcePath, filePath);
            const destPath = path.join(destDir, relPath);

            await fs.mkdir(path.dirname(destPath), { recursive: true });

            const raw = await fs.readFile(filePath, 'utf-8');
            const processed = this._processMarkdown(raw, entry);
            await fs.writeFile(destPath, processed, 'utf-8');

            const navPath = `functional/${sectionName}/${relPath}`;
            const pageTitle = this._extractTitle(raw) || path.basename(relPath, '.md');
            navItems.push({ [pageTitle]: navPath });
        }

        console.log(`    Imported ${mdFiles.length} file(s): ${entry.path} → docs/functional/${sectionName}/`);

        if (navItems.length === 1) {
            // Single file – flatten to a direct nav entry
            return { [title]: Object.values(navItems[0])[0] };
        }
        return { [title]: navItems };
    }

    /**
     * Recursively find all Markdown files under a directory.
     */
    async _findMarkdownFiles(dir) {
        const files = [];
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return files;
        }

        for (const entry of entries) {
            // Skip hidden files/directories
            if (entry.name.startsWith('.')) continue;

            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...(await this._findMarkdownFiles(fullPath)));
            } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
                files.push(fullPath);
            }
        }
        return files;
    }

    /**
     * Ensure the markdown file has YAML front-matter with at least the
     * 'pandoc' and 'functional' tags so MkDocs can filter/index properly.
     */
    _processMarkdown(content, entry) {
        // If the file already contains front-matter, leave it untouched.
        if (content.trimStart().startsWith('---')) {
            return content;
        }

        const title = this._extractTitle(content);
        const lines = ['---'];
        if (title) lines.push(`title: "${title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
        lines.push('tags:');
        lines.push('  - functional');
        lines.push('  - pandoc');
        if (entry.section) lines.push(`  - "${entry.section}"`);
        lines.push('---', '', '');

        return lines.join('\n') + content;
    }

    /**
     * Extract the text of the first ATX H1 heading from markdown content.
     * Returns null if no H1 is found.
     */
    _extractTitle(content) {
        const match = content.match(/^#[ \t]+(.+)$/m);
        return match ? match[1].trim() : null;
    }
}
