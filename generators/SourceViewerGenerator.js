/**
 * Source Viewer Generator
 *
 * Generates an embedded source file navigator and file reader inside the
 * documentation portal.  For every analyzed Salesforce component it creates:
 *
 *   pages/source/index.html           – master file-tree navigator
 *   pages/source/file-<safe>.html     – individual file viewer (Apex, Trigger, Flow …)
 *   pages/source/folder-<safe>.html   – folder browser  (LWC components)
 *
 * Source links in the rest of the portal point to these pages so developers
 * can read the raw source without leaving the documentation site.
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';

export class SourceViewerGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'source';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public entry point
    // ─────────────────────────────────────────────────────────────────────────

    async generate() {
        console.log('  Generating source viewer pages...');

        let count = 0;

        // Apex classes  (single .cls file)
        for (const [name, cls] of Object.entries(this.data.apexClasses || {})) {
            if (cls.file) {
                await this._generateFileViewerPage(cls.file, name);
                count++;
            }
        }

        // Apex triggers (single .trigger file)
        for (const [name, trig] of Object.entries(this.data.triggers || {})) {
            if (trig.file) {
                await this._generateFileViewerPage(trig.file, name);
                count++;
            }
        }

        // LWC components (folder – list every file inside)
        for (const [name, lwc] of Object.entries(this.data.lwcComponents || {})) {
            if (lwc.folder) {
                await this._generateFolderViewerPage(lwc.folder, name);
                count++;
            }
        }

        // Flows (single .flow-meta.xml file)
        for (const [name, flow] of Object.entries(this.data.flows || {})) {
            if (flow.file) {
                await this._generateFileViewerPage(flow.file, name);
                count++;
            }
        }

        // Generate the navigator index last (needs all pages to exist)
        await this._generateIndexPage();

        console.log(`    Generated ${count} source viewer pages.`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Individual page builders
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a viewer page for a single source file.
     * @param {string} relativeFilePath  - Path relative to repoRoot (stored in data)
     * @param {string} name              - Human-readable component name
     */
    async _generateFileViewerPage(relativeFilePath, name) {
        const absolutePath = path.join(this.repoRoot, relativeFilePath);
        let content = '';
        try {
            content = await fs.readFile(absolutePath, 'utf-8');
        } catch {
            content = `// Source file not found: ${relativeFilePath}`;
        }

        const fileName  = path.basename(relativeFilePath);
        const language  = this._detectLanguage(fileName);
        const safeName  = this._safeName(relativeFilePath);
        const lineCount = content.split('\n').length;

        const html = this._buildViewerPageHtml({
            title: `${name} – Source`,
            filePath: relativeFilePath,
            fileName,
            content,
            language,
            lineCount,
        });

        await this.writePage(this.type, `file-${safeName}.html`, html, {
            standardizeLayout: true,
            currentPage: 'source',
            depthToRoot: 2,
            activeTop: 'guides',
        });
    }

    /**
     * Create a folder-browser page for a directory (e.g. LWC component).
     * Each file inside the folder also gets its own viewer page.
     * @param {string} relativeFolderPath - Path relative to repoRoot
     * @param {string} name               - Human-readable component name
     */
    async _generateFolderViewerPage(relativeFolderPath, name) {
        const absolutePath = path.join(this.repoRoot, relativeFolderPath);
        let files = [];
        try {
            const entries = await fs.readdir(absolutePath, { withFileTypes: true });
            files = entries
                .filter(e => e.isFile())
                .map(e => ({
                    name: e.name,
                    path: `${relativeFolderPath}/${e.name}`.replace(/\\/g, '/'),
                }));
        } catch {
            // Folder not accessible – generate an empty page
        }

        // Generate individual file viewer pages for every file in the folder
        for (const file of files) {
            await this._generateFileViewerPage(file.path, `${name}/${file.name}`);
        }

        const safeName = this._safeName(relativeFolderPath);
        const html = this._buildFolderPageHtml({
            title: `${name} – Source Folder`,
            folderPath: relativeFolderPath,
            name,
            files,
        });

        await this.writePage(this.type, `folder-${safeName}.html`, html, {
            standardizeLayout: true,
            currentPage: 'source',
            depthToRoot: 2,
            activeTop: 'guides',
        });
    }

    /**
     * Create the master navigator page that lists every known source file
     * grouped by component type.
     */
    async _generateIndexPage() {
        const apexItems = Object.entries(this.data.apexClasses || {})
            .filter(([, c]) => c.file)
            .map(([name, c]) => ({ name, path: c.file, isFolder: false }));

        const triggerItems = Object.entries(this.data.triggers || {})
            .filter(([, t]) => t.file)
            .map(([name, t]) => ({ name, path: t.file, isFolder: false }));

        const lwcItems = Object.entries(this.data.lwcComponents || {})
            .filter(([, l]) => l.folder)
            .map(([name, l]) => ({ name, path: l.folder, isFolder: true }));

        const flowItems = Object.entries(this.data.flows || {})
            .filter(([, f]) => f.file)
            .map(([name, f]) => ({ name, path: f.file, isFolder: false }));

        const sections = [
            this._buildIndexSection('Apex Classes',   apexItems),
            this._buildIndexSection('Apex Triggers',  triggerItems),
            this._buildIndexSection('LWC Components', lwcItems),
            this._buildIndexSection('Flows',          flowItems),
        ].filter(Boolean).join('\n');

        const total = apexItems.length + triggerItems.length + lwcItems.length + flowItems.length;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Source Navigator – Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / Source Navigator
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Source Navigator</h3>
                    <ul>
                        <li><a href="index.html" class="active">All Source Files</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>Source File Navigator</h2>
                <p>Browse and read the source files for all ${total} analyzed Salesforce components.</p>
                ${sections || '<p><em>No source files found.</em></p>'}
            </main>
        </div>
        <footer><p>Salesforce Technical Documentation</p></footer>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;

        await this.writePage(this.type, 'index.html', html, {
            standardizeLayout: true,
            currentPage: 'source',
            depthToRoot: 2,
            activeTop: 'guides',
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HTML builders
    // ─────────────────────────────────────────────────────────────────────────

    _buildIndexSection(title, items) {
        if (!items.length) return '';
        const rows = items
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(item => {
                const safe = this._safeName(item.path);
                const icon = item.isFolder ? '📁' : '📄';
                const href = item.isFolder ? `folder-${safe}.html` : `file-${safe}.html`;
                return `<tr>
                    <td><a href="${href}">${icon} ${this.escapeHtml(item.name)}</a></td>
                    <td><code>${this.escapeHtml(item.path)}</code></td>
                </tr>`;
            })
            .join('\n');
        return `<h3>${this.escapeHtml(title)} (${items.length})</h3>
<div class="table-container">
    <table class="data-table">
        <thead><tr><th>Name</th><th>Path</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
</div>`;
    }

    _buildViewerPageHtml({ title, filePath, fileName, content, language, lineCount }) {
        const escapedContent = this.escapeHtml(content);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)} – Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="index.html">Source Navigator</a> / ${this.escapeHtml(fileName)}
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Source Navigator</h3>
                    <ul>
                        <li><a href="index.html">All Source Files</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <div class="source-viewer-header">
                    <h2>${this.escapeHtml(fileName)}</h2>
                    <div class="source-viewer-meta">
                        <span class="badge badge-info">${this.escapeHtml(language)}</span>
                        <span class="text-muted">${lineCount} line${lineCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <p class="source-file-path"><code>${this.escapeHtml(filePath)}</code></p>
                <pre class="source-code-block language-${this.escapeHtml(language)}"><code>${escapedContent}</code></pre>
            </main>
        </div>
        <footer><p>Salesforce Technical Documentation</p></footer>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;
    }

    _buildFolderPageHtml({ title, folderPath, name, files }) {
        const filesHtml = files.length
            ? files.map(f => {
                const safePath = this._safeName(f.path);
                return `<li><a href="file-${safePath}.html" class="source-link">📄 ${this.escapeHtml(f.name)}</a></li>`;
            }).join('\n')
            : '<li><em>No files found.</em></li>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)} – Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="index.html">Source Navigator</a> / ${this.escapeHtml(name)}
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Source Navigator</h3>
                    <ul>
                        <li><a href="index.html">All Source Files</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>📁 ${this.escapeHtml(name)}</h2>
                <p class="source-file-path"><code>${this.escapeHtml(folderPath)}</code></p>
                <div class="info-box source-folder-listing">
                    <h3>Files (${files.length})</h3>
                    <ul>${filesHtml}</ul>
                </div>
            </main>
        </div>
        <footer><p>Salesforce Technical Documentation</p></footer>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert a relative file/folder path to a safe filename fragment.
     * e.g. "force-app/main/default/classes/MyClass.cls" → "force_app_main_default_classes_MyClass_cls"
     */
    _safeName(p) {
        return String(p).replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Detect a display language name from a file extension.
     */
    _detectLanguage(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const map = {
            '.cls':      'apex',
            '.trigger':  'apex',
            '.js':       'javascript',
            '.html':     'html',
            '.css':      'css',
            '.xml':      'xml',
            '.json':     'json',
            '.md':       'markdown',
            '.yaml':     'yaml',
            '.yml':      'yaml',
        };
        return map[ext] || 'text';
    }
}
