#!/usr/bin/env node
/**
 * Broken Link Checker  – build-step script
 *
 * Walks every HTML file under documentation-portal/ (skipping node_modules,
 * generators, templates, etc.), collects:
 *   - All <a href="..."> internal links
 *   - All id / name anchors defined on each page
 *
 * Then verifies that every internal link (href="path/to/page.html#anchor")
 * resolves to an existing file, and that the optional #anchor fragment
 * exists in that target file.
 *
 * Exit codes:
 *   0 – no broken links found (or --warn-only flag set)
 *   1 – broken links found (hard failure for CI)
 *
 * Usage:
 *   node link-checker.js [--warn-only] [--output results.json]
 *
 * Flags:
 *   --warn-only     Print errors but exit 0 (useful during development)
 *   --output <file> Save JSON report to <file> (default: data/link-check-report.json)
 *   --verbose       Print each checked link
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// CLI argument parsing
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const WARN_ONLY = args.includes('--warn-only');
const VERBOSE   = args.includes('--verbose');
const outputIdx = args.indexOf('--output');
const OUTPUT_FILE = outputIdx !== -1 && args[outputIdx + 1]
    ? args[outputIdx + 1]
    : path.join(__dirname, 'data', 'link-check-report.json');

// ─────────────────────────────────────────────────────────────────────────────
// Dirs / patterns
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = __dirname; // documentation-portal/
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'generators', 'templates', 'js', 'css'
]);

// External / special prefixes to skip
const SKIP_HREF_PREFIXES = [
    'http://', 'https://', 'mailto:', 'javascript:', '#', 'data:', 'tel:'
];

// ─────────────────────────────────────────────────────────────────────────────
// HTML walking helpers
// ─────────────────────────────────────────────────────────────────────────────

async function walkHTML(dir, results = []) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return results; }

    for (const e of entries) {
        if (e.isDirectory()) {
            if (!SKIP_DIRS.has(e.name)) await walkHTML(path.join(dir, e.name), results);
        } else if (e.isFile() && e.name.endsWith('.html')) {
            results.push(path.join(dir, e.name));
        }
    }
    return results;
}

/** Extract all href values from <a> tags */
function extractLinks(html) {
    const links = [];
    const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        links.push(m[1]);
    }
    return links;
}

/** Extract all id and name attribute values */
function extractAnchors(html) {
    const anchors = new Set();
    // id="..."
    const idRe = /\sid\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = idRe.exec(html)) !== null) anchors.add(m[1]);
    // name="..."
    const nameRe = /\sname\s*=\s*["']([^"']+)["']/gi;
    while ((m = nameRe.exec(html)) !== null) anchors.add(m[1]);
    return anchors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main check logic
// ─────────────────────────────────────────────────────────────────────────────

async function run() {
    console.log('=== Broken Link Checker ===');
    console.log(`Root: ${ROOT}\n`);

    const htmlFiles = await walkHTML(ROOT);
    console.log(`Found ${htmlFiles.length} HTML files.\n`);

    // Step 1: index anchors for every file
    const anchorIndex = new Map(); // absPath → Set<string>
    const htmlCache   = new Map(); // absPath → string (raw html)

    for (const file of htmlFiles) {
        const html = await fs.readFile(file, 'utf-8');
        htmlCache.set(file, html);
        anchorIndex.set(file, extractAnchors(html));
    }

    // Set of existing files (normalised to lower-case on case-insensitive OS)
    const fileSet = new Set(htmlFiles.map(f => f.toLowerCase()));
    const fileSetExact = new Set(htmlFiles);

    // Step 2: check links
    const broken = [];   // { source, href, reason }
    let   checked = 0;

    for (const file of htmlFiles) {
        const html  = htmlCache.get(file);
        const links = extractLinks(html);
        const dir   = path.dirname(file);

        for (const href of links) {
            // Skip external / special
            if (SKIP_HREF_PREFIXES.some(p => href.startsWith(p))) continue;

            // Skip client-side query-string URLs (e.g. ?page=2#table) — JS handles these at runtime
            if (href.includes('?')) continue;

            // Split fragment
            const [filePart, fragment] = href.split('#');

            // Pure fragment-only link → same page
            if (!filePart) {
                if (fragment && !anchorIndex.get(file)?.has(fragment)) {
                    broken.push({
                        source: path.relative(ROOT, file),
                        href,
                        reason: `Anchor #${fragment} not found in same page`
                    });
                }
                continue;
            }

            // Resolve target path
            const targetAbs = path.resolve(dir, filePart);

            // Check file exists (case-insensitive)
            const exists = fileSetExact.has(targetAbs) || fileSet.has(targetAbs.toLowerCase());

            if (!exists) {
                // Also check if it might be a directory with index.html
                const withIndex = path.join(targetAbs, 'index.html');
                const indexExists = fileSetExact.has(withIndex) || fileSet.has(withIndex.toLowerCase());
                if (!indexExists) {
                    broken.push({
                        source: path.relative(ROOT, file),
                        href,
                        reason: `Target file not found: ${path.relative(ROOT, targetAbs)}`
                    });
                    checked++;
                    continue;
                }
            }

            // Check fragment in target
            if (fragment) {
                // Find the actual case-matched path
                const resolvedTarget = fileSetExact.has(targetAbs) ? targetAbs
                    : htmlFiles.find(f => f.toLowerCase() === targetAbs.toLowerCase());

                if (resolvedTarget) {
                    const targetAnchors = anchorIndex.get(resolvedTarget);
                    if (targetAnchors && !targetAnchors.has(fragment)) {
                        broken.push({
                            source: path.relative(ROOT, file),
                            href,
                            reason: `Anchor #${fragment} not found in ${path.relative(ROOT, resolvedTarget)}`
                        });
                    }
                }
            }

            if (VERBOSE) {
                console.log(`  OK  ${path.relative(ROOT, file)} → ${href}`);
            }
            checked++;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Report
    // ─────────────────────────────────────────────────────────────────────────

    const report = {
        generatedAt: new Date().toISOString(),
        filesChecked: htmlFiles.length,
        linksChecked: checked,
        brokenCount: broken.length,
        broken
    };

    // Save JSON report
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(report, null, 2), 'utf-8');

    if (broken.length === 0) {
        console.log(`✓ No broken links found in ${htmlFiles.length} files (${checked} links checked).`);
        console.log(`  Report saved to ${path.relative(ROOT, OUTPUT_FILE)}\n`);
        process.exit(0);
    }

    // Print broken links
    console.error(`\n✗ Found ${broken.length} broken link${broken.length !== 1 ? 's' : ''}:\n`);

    // Group by source file for readability
    const bySource = {};
    for (const b of broken) {
        (bySource[b.source] = bySource[b.source] || []).push(b);
    }

    for (const [src, items] of Object.entries(bySource)) {
        console.error(`  ${src}`);
        for (const b of items) {
            console.error(`    ✗ ${b.href}`);
            console.error(`      → ${b.reason}`);
        }
    }

    console.error(`\n  Report saved to ${path.relative(ROOT, OUTPUT_FILE)}\n`);

    if (WARN_ONLY) {
        console.warn('  (--warn-only: exiting 0 despite broken links)\n');
        process.exit(0);
    } else {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Link checker error:', err);
    process.exit(1);
});
