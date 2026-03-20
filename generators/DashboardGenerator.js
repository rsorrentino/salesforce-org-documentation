/**
 * Dashboard Generator
 *
 * Generates pages/dashboard/index.html with:
 *  - Per-type counts (objects, apex, flows, lwc, profiles, permission sets, triggers, …)
 *  - Trend badges compared to the previous build stored in data/metrics-history.json
 *    Trend badge meanings:
 *      ↑ green  – count increased since last build
 *      ↓ red    – count decreased since last build
 *      =  gray  – no change
 *      NEW      – first build, no baseline
 *
 * The file data/metrics-history.json accumulates one entry per build (capped at 30)
 * so trend arrows always reflect the most recent prior build.
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';

export class DashboardGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'dashboard';
        this.historyFile = path.join(this.outputDir, 'data', 'metrics-history.json');
    }

    async generate() {
        console.log('  Generating per-type dashboard...');

        const current = this._computeMetrics();
        const history = await this._loadHistory();
        const previous = history.length > 0 ? history[history.length - 1].metrics : null;

        await this._saveHistory(history, current);
        await this._writeDashboard(current, previous, history);

        console.log('    Dashboard generated.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Metrics computation
    // ─────────────────────────────────────────────────────────────────────────

    _computeMetrics() {
        const d = this.data;
        const countKeys = (obj) => Object.keys(obj || {}).length;

        const validationRulesTotal = Object.values(d.validationRules || {})
            .reduce((s, arr) => s + (arr?.length || 0), 0);

        const fieldsTotal = Object.values(d.objects || {})
            .reduce((s, o) => s + (o?.fields?.length || 0), 0);

        const recordTypesTotal = Object.values(d.recordTypes || {})
            .reduce((s, arr) => s + (arr?.length || 0), 0);

        const flowElements = Object.values(d.flows || {})
            .reduce((s, f) => s + (f?.elements?.length || 0), 0);

        const quickActionsTotal = Object.values(d.quickActions || {})
            .reduce((s, obj) => s + Object.keys(obj).length, 0);

        const cmtRecordsTotal = Object.values(d.customMetadata || {})
            .reduce((s, recs) => s + Object.keys(recs).length, 0);

        return {
            objects: countKeys(d.objects),
            apexClasses: countKeys(d.apexClasses),
            flows: countKeys(d.flows),
            lwcComponents: countKeys(d.lwcComponents),
            auraComponents: countKeys(d.auraComponents),
            vfPages: countKeys(d.visualforcePages),
            profiles: countKeys(d.profiles),
            permissionSets: countKeys(d.permissionSets),
            roles: countKeys(d.roles),
            queues: countKeys(d.queues),
            triggers: countKeys(d.triggers),
            flexiPages: countKeys(d.flexiPages),
            fields: fieldsTotal,
            validationRules: validationRulesTotal,
            recordTypes: recordTypesTotal,
            flowElements,
            globalValueSets: countKeys(d.globalValueSets),
            staticResources: countKeys(d.staticResources),
            quickActions: quickActionsTotal,
            sharingRules: countKeys(d.sharingRules),
            workflows: countKeys(d.workflows),
            customMetadataTypes: countKeys(d.customMetadata),
            customMetadataRecords: cmtRecordsTotal,
            generatedAt: new Date().toISOString()
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // History persistence
    // ─────────────────────────────────────────────────────────────────────────

    async _loadHistory() {
        try {
            const raw = await fs.readFile(this.historyFile, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    async _saveHistory(history, currentMetrics) {
        const entry = { generatedAt: currentMetrics.generatedAt, metrics: { ...currentMetrics } };
        delete entry.metrics.generatedAt;

        const updated = [...history, entry].slice(-30); // keep last 30 builds
        await fs.mkdir(path.dirname(this.historyFile), { recursive: true });
        await fs.writeFile(this.historyFile, JSON.stringify(updated, null, 2), 'utf-8');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HTML generation
    // ─────────────────────────────────────────────────────────────────────────

    _trendBadge(key, current, previous) {
        if (!previous) {
            return '<span class="badge badge-info">NEW</span>';
        }
        const cur = current[key] ?? 0;
        const prev = previous[key] ?? 0;
        if (cur > prev) {
            const diff = cur - prev;
            return `<span class="badge badge-success" title="Was ${prev}">&#8593; +${diff}</span>`;
        }
        if (cur < prev) {
            const diff = prev - cur;
            return `<span class="badge badge-danger" title="Was ${prev}">&#8595; -${diff}</span>`;
        }
        return `<span class="badge badge-secondary">&#61; no change</span>`;
    }

    _cardRow(label, key, current, previous, icon = '') {
        const val = current[key] ?? 0;
        const badge = this._trendBadge(key, current, previous);
        return `
        <div class="stat-card dashboard-card">
            <div class="dashboard-card-icon">${icon}</div>
            <div class="dashboard-card-body">
                <div class="dashboard-card-count">${val.toLocaleString()}</div>
                <div class="dashboard-card-label">${label}</div>
                <div class="dashboard-card-trend">${badge}</div>
            </div>
        </div>`;
    }

    _sparklinePoints(history, key) {
        if (history.length < 2) return '';
        const vals = history.map(h => h.metrics[key] ?? 0);
        const max = Math.max(...vals, 1);
        const w = 120;
        const h = 30;
        const points = vals.map((v, i) => {
            const x = Math.round((i / (vals.length - 1)) * w);
            const y = Math.round(h - (v / max) * h);
            return `${x},${y}`;
        }).join(' ');
        return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
            <polyline fill="none" stroke="var(--primary-color)" stroke-width="2" points="${points}"/>
        </svg>`;
    }

    _historyTableRows(history) {
        if (history.length === 0) return '<tr><td colspan="9"><em>No history yet.</em></td></tr>';
        return [...history].reverse().slice(0, 10).map(entry => {
            const m = entry.metrics;
            const date = new Date(entry.generatedAt).toLocaleString();
            return `<tr>
                <td>${date}</td>
                <td>${m.objects ?? 0}</td>
                <td>${m.apexClasses ?? 0}</td>
                <td>${m.flows ?? 0}</td>
                <td>${m.lwcComponents ?? 0}</td>
                <td>${m.profiles ?? 0}</td>
                <td>${m.triggers ?? 0}</td>
                <td>${m.fields ?? 0}</td>
                <td>${m.validationRules ?? 0}</td>
            </tr>`;
        }).join('\n');
    }

    async _writeDashboard(current, previous, history) {
        const cards = [
            this._cardRow('Custom Objects',         'objects',             current, previous, '&#128204;'),
            this._cardRow('Apex Classes',           'apexClasses',         current, previous, '&#128296;'),
            this._cardRow('Flows',                  'flows',               current, previous, '&#9889;'),
            this._cardRow('LWC Components',         'lwcComponents',       current, previous, '&#127760;'),
            this._cardRow('Aura Components',        'auraComponents',      current, previous, '&#9889;'),
            this._cardRow('Visualforce Pages',      'vfPages',             current, previous, '&#128196;'),
            this._cardRow('Profiles',               'profiles',            current, previous, '&#128101;'),
            this._cardRow('Permission Sets',        'permissionSets',      current, previous, '&#128274;'),
            this._cardRow('Roles',                  'roles',               current, previous, '&#128100;'),
            this._cardRow('Queues',                 'queues',              current, previous, '&#128228;'),
            this._cardRow('Triggers',               'triggers',            current, previous, '&#9881;'),
            this._cardRow('FlexiPages',             'flexiPages',          current, previous, '&#128196;'),
            this._cardRow('Fields',                 'fields',              current, previous, '&#128202;'),
            this._cardRow('Validation Rules',       'validationRules',     current, previous, '&#9888;'),
            this._cardRow('Record Types',           'recordTypes',         current, previous, '&#127991;'),
            this._cardRow('Flow Elements',          'flowElements',        current, previous, '&#128257;'),
            this._cardRow('Global Value Sets',      'globalValueSets',     current, previous, '&#128195;'),
            this._cardRow('Static Resources',       'staticResources',     current, previous, '&#128190;'),
            this._cardRow('Quick Actions',          'quickActions',        current, previous, '&#9889;'),
            this._cardRow('Sharing Rules',          'sharingRules',        current, previous, '&#128275;'),
            this._cardRow('Workflows',              'workflows',           current, previous, '&#9881;'),
            this._cardRow('Custom Metadata Types',  'customMetadataTypes', current, previous, '&#128203;'),
            this._cardRow('Custom Metadata Records','customMetadataRecords',current, previous,'&#128203;'),
        ].join('\n');

        const sparklines = [
            'objects', 'apexClasses', 'flows', 'lwcComponents'
        ].map(key => {
            const label = key.replace(/([A-Z])/g, ' $1');
            return `<div class="sparkline-card"><span class="sparkline-label">${label}</span>${this._sparklinePoints(history, key)}</div>`;
        }).join('\n');

        const generatedAt = new Date(current.generatedAt).toLocaleString();

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
<div class="container">
    <header>
        <div class="header-left">
            <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </div>
        <nav class="breadcrumb">
            <a href="../../index.html">Home</a> / Dashboard
        </nav>
    </header>
    <div class="content-wrapper">
        <nav class="sidebar">
        </nav>
        <main class="main-content">
            <h2>Per-Type Dashboard</h2>
            <p class="text-muted">Metadata counts extracted from the latest build. Trend badges compare to the previous build.</p>
            <p><small>Last generated: ${generatedAt}</small></p>

            <section>
                <h3>Counts Overview</h3>
                <div class="dashboard-grid">
                    ${cards}
                </div>
            </section>

            <section>
                <h3>Trend Sparklines <small>(last ${Math.min(history.length, 30)} builds)</small></h3>
                <div class="sparkline-grid">
                    ${sparklines}
                </div>
            </section>

            <section>
                <h3>Build History <small>(last 10 builds)</small></h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Build Date</th>
                                <th>Objects</th>
                                <th>Apex</th>
                                <th>Flows</th>
                                <th>LWC</th>
                                <th>Profiles</th>
                                <th>Triggers</th>
                                <th>Fields</th>
                                <th>Val. Rules</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this._historyTableRows(history)}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>
    <footer><p>Salesforce Technical Documentation</p></footer>
</div>
<script src="../../js/app.js"></script>
</body>
</html>`;

        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Dashboard</h3>
                <ul>
                    <li><a href="index.html" class="active">Overview</a></li>
                </ul>
            </div>`;
        await this.writePage(this.type, 'index.html', html, {
            standardizeLayout: true,
            currentPage: 'dashboard',
            currentSubPage: 'index',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }
}
