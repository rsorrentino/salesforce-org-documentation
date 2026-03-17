/**
 * Integrations Generator
 * 
 * Generates documentation pages for Integrations:
 * - Integrations overview page
 * - Named Credentials listing
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';
import fs from 'fs/promises';

export class IntegrationsGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'integrations';
    }
    
    /**
     * Generate all integration pages
     */
    async generate() {
        console.log('  Generating integration pages...');
        
        // Generate integrations overview page
        await this.generateOverviewPage();
        
        console.log(`    Generated integration documentation successfully.`);
    }
    
    /**
     * Generate Static Resources list HTML
     */
    generateStaticResourcesList() {
        const sr = this.data.staticResources || {};
        const names = Object.keys(sr).sort();
        if (names.length === 0) return '<p>No static resources found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Static Resources</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="staticResourcesTable">\n';
        html += '<thead><tr><th>Name</th><th>Content Type</th><th>Cache Control</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const name of names) {
            const d = sr[name] || {};
            html += `<tr>
                <td><strong>${this.escapeHtml(name)}</strong></td>
                <td>${this.escapeHtml(d.contentType || '')}</td>
                <td>${this.escapeHtml(d.cacheControl || '')}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#staticResourcesTable');
        }
        return html;
    }

    /**
     * Generate integrations overview page
     */
    async generateOverviewPage() {
        const data = {
            NAMED_CREDENTIALS_COUNT: Object.keys(this.data.namedCredentials || {}).length,
            STATIC_RESOURCES_COUNT: Object.keys(this.data.staticResources || {}).length,
            STATIC_RESOURCES_LIST: this.generateStaticResourcesList(),
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Integrations Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'integrations',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            console.warn(`    Template not found, creating basic overview page`);
            const basicHtml = this.createBasicOverview(data);
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'integrations',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Create basic overview page
     */
    createBasicOverview(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integrations - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Integrations</h2>
            <section>
                <h3>Overview</h3>
                <p>This section documents all integrations with external systems.</p>
            </section>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${data.NAMED_CREDENTIALS_COUNT}</h3>
                    <p>Named Credentials</p>
                </div>
                <div class="stat-card">
                    <h3>${data.STATIC_RESOURCES_COUNT}</h3>
                    <p>Static Resources</p>
                </div>
            </div>
            <section>
                <h3>Static Resources</h3>
                ${data.STATIC_RESOURCES_LIST}
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}
