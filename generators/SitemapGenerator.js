/**
 * Sitemap Generator
 *
 * Generates:
 *  - sitemap.xml at the documentation-portal root for SEO / internal portal indexing
 *  - Injects <link rel="canonical"> into every generated HTML page so crawlers
 *    resolve the canonical URL even when the portal is served under different paths.
 *
 * Usage (called automatically by generate.js after all other generators finish):
 *   const gen = new SitemapGenerator(repoRoot, data, siteBaseUrl);
 *   await gen.generate();
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';

export class SitemapGenerator extends BaseGenerator {
    /**
     * @param {string} repoRoot
     * @param {object} data         – shared metadata object
     * @param {string} siteBaseUrl  – e.g. "https://your-org.github.io/repo-name"
     *                                Falls back to the DOCS_BASE_URL env var, then
     *                                a relative placeholder so the file is still valid.
     */
    constructor(repoRoot, data, siteBaseUrl, toolDir) {
        super(repoRoot, data, toolDir);
        this.siteBaseUrl = (
            siteBaseUrl ||
            process.env.DOCS_BASE_URL ||
            ''
        ).replace(/\/$/, ''); // strip trailing slash
    }

    async generate() {
        console.log('  Generating sitemap.xml and canonical links...');

        const pages = await this._collectPages();
        await this._writeSitemap(pages);
        await this._injectCanonicals(pages);

        console.log(`    Sitemap: ${pages.length} URLs written to sitemap.xml`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Walk the output directory and collect every .html file.
     * Returns objects: { relPath, absPath, lastmod }
     */
    async _collectPages() {
        const root = this.outputDir;
        const pages = [];
        await this._walkDir(root, root, pages);
        // Sort: index.html first, then alphabetically
        pages.sort((a, b) => {
            if (a.relPath === 'index.html') return -1;
            if (b.relPath === 'index.html') return 1;
            return a.relPath.localeCompare(b.relPath);
        });
        return pages;
    }

    async _walkDir(base, dir, results) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }

        // Directories to skip (not part of the published site)
        const skipDirs = new Set(['node_modules', '.git', 'templates', 'generators', 'js', 'css', 'data']);

        for (const entry of entries) {
            const absPath = path.join(dir, entry.name);
            const relPath = path.relative(base, absPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                if (!skipDirs.has(entry.name)) {
                    await this._walkDir(base, absPath, results);
                }
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                let lastmod = new Date().toISOString().split('T')[0];
                try {
                    const stat = await fs.stat(absPath);
                    lastmod = stat.mtime.toISOString().split('T')[0];
                } catch { /* ignore */ }

                results.push({ relPath, absPath, lastmod });
            }
        }
    }

    /** Assign <priority> based on path depth / page type */
    _priority(relPath) {
        if (relPath === 'index.html') return '1.0';
        const depth = relPath.split('/').length;
        if (depth <= 2) return '0.8';
        if (depth <= 3) return '0.6';
        return '0.5';
    }

    /** Assign <changefreq> – overview pages change more than detail pages */
    _changefreq(relPath) {
        if (relPath.endsWith('/index.html') || relPath === 'index.html') return 'weekly';
        return 'monthly';
    }

    async _writeSitemap(pages) {
        const base = this.siteBaseUrl;
        const lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        ];

        for (const { relPath, lastmod } of pages) {
            const loc = base
                ? `${base}/${relPath}`
                : relPath;  // relative fallback (valid for internal portals served at /)

            lines.push(
                '  <url>',
                `    <loc>${this._xmlEscape(loc)}</loc>`,
                `    <lastmod>${lastmod}</lastmod>`,
                `    <changefreq>${this._changefreq(relPath)}</changefreq>`,
                `    <priority>${this._priority(relPath)}</priority>`,
                '  </url>'
            );
        }
        lines.push('</urlset>');

        const sitemapPath = path.join(this.outputDir, 'sitemap.xml');
        await fs.writeFile(sitemapPath, lines.join('\n'), 'utf-8');
    }

    /**
     * Inject (or replace) <link rel="canonical"> in the <head> of each page.
     * Also injects a <meta name="robots" content="index,follow"> if absent.
     */
    async _injectCanonicals(pages) {
        const base = this.siteBaseUrl;
        for (const { relPath, absPath } of pages) {
            try {
                let html = await fs.readFile(absPath, 'utf-8');
                const canonicalHref = base ? `${base}/${relPath}` : `/${relPath}`;

                // Remove any existing canonical
                html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
                // Remove any existing robots meta
                html = html.replace(/<meta\s+name=["']robots["'][^>]*>/gi, '');

                // Inject after <meta charset…> or at the end of <head>
                const inject = [
                    `<link rel="canonical" href="${this._htmlAttrEscape(canonicalHref)}">`,
                    `<meta name="robots" content="index,follow">`
                ].join('\n    ');

                if (html.includes('<meta charset')) {
                    html = html.replace(
                        /(<meta\s+charset[^>]*>)/i,
                        `$1\n    ${inject}`
                    );
                } else {
                    html = html.replace('</head>', `    ${inject}\n</head>`);
                }

                await fs.writeFile(absPath, html, 'utf-8');
            } catch {
                // Skip unreadable files
            }
        }
    }

    _xmlEscape(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    _htmlAttrEscape(str) {
        return String(str).replace(/"/g, '&quot;');
    }
}
