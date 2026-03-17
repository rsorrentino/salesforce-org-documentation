/**
 * Custom Metadata Generator
 *
 * Generates documentation pages for Custom Metadata Types:
 * - Overview page listing all CMT types with record counts
 * - Per-type detail pages listing records and field values
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';
import fs from 'fs/promises';

export class CustomMetadataGenerator extends BaseGenerator {
    constructor(repoRoot, data) {
        super(repoRoot, data);
        this.type = 'custommetadata';
    }

    /**
     * Generate all custom metadata pages
     */
    async generate() {
        console.log('  Generating custom metadata pages...');
        await this.generateOverviewPage();
        await this.generateTypePages();
        console.log('    Generated custom metadata documentation successfully.');
    }

    /**
     * Generate summary table of all CMT types
     */
    generateTypesSummary() {
        const cmTypes = this.data.customMetadata || {};
        const typeNames = Object.keys(cmTypes).sort();

        if (typeNames.length === 0) return '<p>No custom metadata types found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, typeNames.length)} of ${typeNames.length} Custom Metadata Types</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="cmtTypesTable">\n';
        html += '<thead><tr><th>Type Name</th><th>Record Count</th><th>Details</th></tr></thead>\n';
        html += '<tbody>\n';

        for (const typeName of typeNames) {
            const records = cmTypes[typeName] || {};
            const count = Object.keys(records).length;
            const safeType = typeName.replace(/[^a-zA-Z0-9]/g, '_');
            html += `<tr>
                <td><strong>${this.escapeHtml(typeName)}</strong></td>
                <td>${count}</td>
                <td><a href="type-${safeType}.html">View Records &rarr;</a></td>
            </tr>\n`;
        }

        html += '</tbody></table></div>\n';
        if (typeNames.length > 50) {
            html += this.generatePagination(1, Math.ceil(typeNames.length / 50), 'index.html#cmtTypesTable');
        }
        return html;
    }

    /**
     * Generate records list HTML for a given type
     */
    generateTypeRecordsList(typeName, records) {
        const recordNames = Object.keys(records).sort();
        if (recordNames.length === 0) return '<p>No records found for this type.</p>';

        // Show first 100 records
        const shown = recordNames.slice(0, 100);
        const total = recordNames.length;

        let html = `<div class="pagination-info">Showing 1-${shown.length} of ${total} records</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="cmtRecordsTable">\n';
        html += '<thead><tr><th>Developer Name</th><th>Label</th><th>Protected</th><th>Fields</th></tr></thead>\n';
        html += '<tbody>\n';

        for (const recName of shown) {
            const d = records[recName] || {};
            const fieldSummary = (d.values || [])
                .slice(0, 3)
                .map(v => `${this.escapeHtml(v.field)}: ${this.escapeHtml(String(v.value || ''))}`)
                .join('; ');
            const moreSuffix = (d.values || []).length > 3 ? ` (+${(d.values || []).length - 3} more)` : '';
            html += `<tr>
                <td><strong>${this.escapeHtml(recName)}</strong></td>
                <td>${this.escapeHtml(d.label || '')}</td>
                <td>${d.protected ? 'Yes' : 'No'}</td>
                <td>${fieldSummary}${moreSuffix}</td>
            </tr>\n`;
        }

        html += '</tbody></table></div>\n';
        if (total > 100) {
            html += `<p class="muted"><em>Note: Only first 100 of ${total} records shown.</em></p>\n`;
        }
        return html;
    }

    /**
     * Generate overview page
     */
    async generateOverviewPage() {
        const cmTypes = this.data.customMetadata || {};
        const totalTypes = Object.keys(cmTypes).length;
        const totalRecords = Object.values(cmTypes).reduce((sum, records) => sum + Object.keys(records).length, 0);

        const data = {
            CMT_TYPES_COUNT: totalTypes,
            CMT_RECORDS_COUNT: totalRecords,
            CMT_TYPES_LIST: this.generateTypesSummary(),
        };

        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Custom Metadata Navigation</h3>
                <ul>
                    <li><a href="index.html" class="active">Overview</a></li>
                </ul>
            </div>
        `;

        try {
            const html = await this.renderTemplate(templatePath, data);
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'custommetadata',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            console.warn('    Custom Metadata template not found, creating basic page');
            const basicHtml = this.createBasicOverview(data);
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'custommetadata',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }

    /**
     * Generate individual type pages
     */
    async generateTypePages() {
        const cmTypes = this.data.customMetadata || {};
        const typeNames = Object.keys(cmTypes).sort();

        for (const typeName of typeNames) {
            const records = cmTypes[typeName] || {};
            const safeType = typeName.replace(/[^a-zA-Z0-9]/g, '_');
            const recordCount = Object.keys(records).length;

            const html = this.createTypePageHtml(typeName, records, recordCount);
            await this.writePage(this.type, `type-${safeType}.html`, html, {
                standardizeLayout: true,
                currentPage: 'custommetadata',
                currentSubPage: `type-${safeType}`,
                depthToRoot: 2,
                sectionNavHtml: `
                    <div class="nav-section">
                        <h3>Custom Metadata Navigation</h3>
                        <ul>
                            <li><a href="index.html">Overview</a></li>
                            <li><a href="type-${safeType}.html" class="active">${this.escapeHtml(typeName)}</a></li>
                        </ul>
                    </div>
                `,
                activeTop: 'guides'
            });
        }
    }

    /**
     * Create HTML for a type detail page
     */
    createTypePageHtml(typeName, records, recordCount) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(typeName)} - Custom Metadata - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="index.html">Custom Metadata</a> / ${this.escapeHtml(typeName)}
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Custom Metadata Navigation</h3>
                    <ul>
                        <li><a href="index.html">Overview</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>${this.escapeHtml(typeName)}</h2>
                <section>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>${recordCount}</h3>
                            <p>Records</p>
                        </div>
                    </div>
                </section>
                <section>
                    <h3>Records</h3>
                    ${this.generateTypeRecordsList(typeName, records)}
                </section>
            </main>
        </div>
        <footer>
            <p>Salesforce Technical Documentation</p>
        </footer>
    </div>
    <script src="../../js/app.js"></script>
    <script src="../../js/pagination.js"></script>
</body>
</html>`;
    }

    /**
     * Create basic overview page (fallback)
     */
    createBasicOverview(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Metadata - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Custom Metadata Types</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${data.CMT_TYPES_COUNT}</h3>
                    <p>Custom Metadata Types</p>
                </div>
                <div class="stat-card">
                    <h3>${data.CMT_RECORDS_COUNT}</h3>
                    <p>Total Records</p>
                </div>
            </div>
            <section>
                <h3>Types</h3>
                ${data.CMT_TYPES_LIST}
            </section>
        </main>
    </div>
    <script src="../../js/app.js"></script>
    <script src="../../js/pagination.js"></script>
</body>
</html>`;
    }
}
