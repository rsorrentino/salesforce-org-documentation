/**
 * Diff Generator  – "What Changed"
 *
 * Compares the current build's metadata snapshot against the previous one stored
 * at data/metadata-snapshot.json, then generates:
 *   pages/maintenance/changes.html   – human-readable diff report
 *
 * After generating the report, the current snapshot is saved to
 *   data/metadata-snapshot.json
 * so the next build can diff against it.
 *
 * Tracked types (counts + name sets):
 *   objects, apexClasses, flows, lwcComponents, profiles, permissionSets,
 *   triggers, flexiPages, validationRules (per-object flattened)
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';

export class DiffGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'maintenance';
        this.snapshotFile = path.join(this.outputDir, 'data', 'metadata-snapshot.json');
    }

    async generate() {
        console.log('  Generating what-changed diff report...');

        const current  = this._buildSnapshot();
        const previous = await this._loadPreviousSnapshot();

        const diff = previous ? this._computeDiff(previous, current) : null;

        await this._writePage(diff, current, previous);
        await this._saveSnapshot(current);

        console.log('    Diff report generated.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Snapshot building
    // ─────────────────────────────────────────────────────────────────────────

    _buildSnapshot() {
        const d = this.data;

        const flatValidationRules = {};
        for (const [obj, rules] of Object.entries(d.validationRules || {})) {
            for (const rule of (rules || [])) {
                flatValidationRules[`${obj}.${rule.name || rule}`] = true;
            }
        }

        return {
            generatedAt: new Date().toISOString(),
            types: {
                objects:        new Set(Object.keys(d.objects        || {})),
                apexClasses:    new Set(Object.keys(d.apexClasses    || {})),
                flows:          new Set(Object.keys(d.flows          || {})),
                lwcComponents:  new Set(Object.keys(d.lwcComponents  || {})),
                profiles:       new Set(Object.keys(d.profiles       || {})),
                permissionSets: new Set(Object.keys(d.permissionSets || {})),
                triggers:       new Set(Object.keys(d.triggers       || {})),
                flexiPages:     new Set(Object.keys(d.flexiPages     || {})),
                validationRules:new Set(Object.keys(flatValidationRules))
            }
        };
    }

    _snapshotToJSON(snapshot) {
        const out = { generatedAt: snapshot.generatedAt, types: {} };
        for (const [k, v] of Object.entries(snapshot.types)) {
            out.types[k] = v instanceof Set ? [...v].sort() : v;
        }
        return out;
    }

    _snapshotFromJSON(raw) {
        const out = { generatedAt: raw.generatedAt, types: {} };
        for (const [k, v] of Object.entries(raw.types || {})) {
            out.types[k] = new Set(Array.isArray(v) ? v : []);
        }
        return out;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────

    async _loadPreviousSnapshot() {
        try {
            const raw = JSON.parse(await fs.readFile(this.snapshotFile, 'utf-8'));
            return this._snapshotFromJSON(raw);
        } catch {
            return null;
        }
    }

    async _saveSnapshot(snapshot) {
        await fs.mkdir(path.dirname(this.snapshotFile), { recursive: true });
        await fs.writeFile(
            this.snapshotFile,
            JSON.stringify(this._snapshotToJSON(snapshot), null, 2),
            'utf-8'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Diff computation
    // ─────────────────────────────────────────────────────────────────────────

    _computeDiff(previous, current) {
        const diff = {};

        for (const type of Object.keys(current.types)) {
            const prev = previous.types[type] || new Set();
            const curr = current.types[type]  || new Set();

            const added   = [...curr].filter(n => !prev.has(n)).sort();
            const removed = [...prev].filter(n => !curr.has(n)).sort();
            const unchanged = [...curr].filter(n => prev.has(n)).length;

            diff[type] = { added, removed, unchanged, prevCount: prev.size, currCount: curr.size };
        }

        return diff;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HTML page
    // ─────────────────────────────────────────────────────────────────────────

    _typeLabel(type) {
        const labels = {
            objects:        'Custom Objects',
            apexClasses:    'Apex Classes',
            flows:          'Flows',
            lwcComponents:  'LWC Components',
            profiles:       'Profiles',
            permissionSets: 'Permission Sets',
            triggers:       'Triggers',
            flexiPages:     'FlexiPages',
            validationRules:'Validation Rules'
        };
        return labels[type] || type;
    }

    _typeLink(type, name) {
        const linkMap = {
            objects:       `../objects/object-${name.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_')}.html`,
            apexClasses:   `../apex/class-${name.replace(/[^a-zA-Z0-9]/g, '_')}.html`,
            flows:         `../flows/flow-${name.replace(/[^a-zA-Z0-9_]/g, '_')}.html`,
            lwcComponents: `../ui/lwc-${name.replace(/[^a-zA-Z0-9]/g, '_')}.html`,
            profiles:      `../profiles/profile-${name.replace(/[^a-zA-Z0-9]/g, '_')}.html`,
            permissionSets:`../profiles/permissionset-${name.replace(/[^a-zA-Z0-9]/g, '_')}.html`,
        };
        return linkMap[type] ? `<a href="${linkMap[type]}">${this.escapeHtml(name)}</a>` : this.escapeHtml(name);
    }

    _diffSection(type, d) {
        const label   = this._typeLabel(type);
        const delta   = d.currCount - d.prevCount;
        const deltaHtml = delta > 0
            ? `<span class="badge badge-success">+${delta}</span>`
            : delta < 0
                ? `<span class="badge badge-danger">${delta}</span>`
                : `<span class="badge badge-secondary">no change</span>`;

        const addedList = d.added.length > 0
            ? `<ul class="diff-added">${d.added.map(n => `<li>&#43; ${this._typeLink(type, n)}</li>`).join('')}</ul>`
            : '';
        const removedList = d.removed.length > 0
            ? `<ul class="diff-removed">${d.removed.map(n => `<li>&#8722; <span>${this.escapeHtml(n)}</span></li>`).join('')}</ul>`
            : '';

        const hasChanges = d.added.length > 0 || d.removed.length > 0;

        return `
        <div class="diff-block${hasChanges ? '' : ' diff-block-clean'}">
            <h4>${label} ${deltaHtml}
                <small class="text-muted">${d.prevCount} → ${d.currCount}</small>
            </h4>
            ${hasChanges ? addedList + removedList : '<p class="diff-clean"><em>No changes.</em></p>'}
        </div>`;
    }

    async _writePage(diff, current, previous) {
        const generatedAt = new Date(current.generatedAt).toLocaleString();
        const prevDate    = previous ? new Date(previous.generatedAt).toLocaleString() : 'N/A (first build)';

        let diffHtml;
        if (!diff) {
            diffHtml = `<div class="info-box">
                <p><strong>No previous build snapshot found.</strong></p>
                <p>This is the first build. A snapshot has been saved for future comparisons.</p>
            </div>`;
        } else {
            // Summary counts
            const totalAdded   = Object.values(diff).reduce((s, d) => s + d.added.length,   0);
            const totalRemoved = Object.values(diff).reduce((s, d) => s + d.removed.length, 0);

            const formatDelta = (n) => n === 0 ? '0' : (n > 0 ? `+${n}` : `${n}`);

            const summaryRows = Object.entries(diff).map(([type, d]) => {
                return `<tr>
                    <td>${this._typeLabel(type)}</td>
                    <td>${d.prevCount}</td>
                    <td>${d.currCount}</td>
                    <td class="${d.added.length > 0 ? 'diff-added-cell' : ''}">${d.added.length > 0 ? '+' + d.added.length : '–'}</td>
                    <td class="${d.removed.length > 0 ? 'diff-removed-cell' : ''}">${d.removed.length > 0 ? '-' + d.removed.length : '–'}</td>
                </tr>`;
            }).join('');

            const sections = Object.entries(diff)
                .map(([type, d]) => this._diffSection(type, d))
                .join('');

            diffHtml = `
            <div class="stats-grid">
                <div class="stat-card"><h3 style="color:#28a745">${formatDelta(totalAdded)}</h3><p>Added items</p></div>
                <div class="stat-card"><h3 style="color:#dc3545">${formatDelta(-totalRemoved)}</h3><p>Removed items</p></div>
            </div>

            <section>
                <h3>Summary</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr><th>Type</th><th>Previous</th><th>Current</th><th>Added</th><th>Removed</th></tr>
                        </thead>
                        <tbody>${summaryRows}</tbody>
                    </table>
                </div>
            </section>

            <section>
                <h3>Detail</h3>
                ${sections}
            </section>`;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>What Changed - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
<div class="container">
    <header>
        <div class="header-left">
            <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </div>
        <nav class="breadcrumb">
            <a href="../../index.html">Home</a> /
            <a href="index.html">Maintenance</a> /
            What Changed
        </nav>
    </header>
    <div class="content-wrapper">
        <nav class="sidebar"></nav>
        <main class="main-content">
            <h2>What Changed</h2>
            <p>
                <strong>Current build:</strong> ${generatedAt}<br>
                <strong>Compared to:</strong> ${prevDate}
            </p>
            ${diffHtml}
        </main>
    </div>
    <footer><p>Salesforce Technical Documentation</p></footer>
</div>
<script src="../../js/app.js"></script>
</body>
</html>`;

        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Maintenance</h3>
                <ul>
                    <li><a href="index.html">Overview</a></li>
                    <li><a href="changes.html" class="active">What Changed</a></li>
                </ul>
            </div>`;
        await this.writePage(this.type, 'changes.html', html, {
            standardizeLayout: true,
            currentPage: 'maintenance',
            currentSubPage: 'changes',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }
}
