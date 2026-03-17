/**
 * UI Generator
 * 
 * Generates documentation pages for UI components:
 * - UI layer overview page
 * - FlexiPages listing
 * - LWC components listing
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class UIGenerator extends BaseGenerator {
    constructor(repoRoot, data) {
        super(repoRoot, data);
        this.type = 'ui';
    }
    
    /**
     * Generate all UI pages
     */
    async generate() {
        console.log('  Generating UI pages...');
        
        // Generate UI overview page
        await this.generateOverviewPage();
        
        console.log(`    Generated UI documentation successfully.`);
    }
    
    /**
     * Generate UI overview page with pagination
     */
    async generateOverviewPage() {
        const lwcComponents = Object.keys(this.data.lwcComponents || {});
        const flexiPages = Object.keys(this.data.flexiPages || {});
        const auraComponents = Object.keys(this.data.auraComponents || {});
        const vfPages = Object.keys(this.data.visualforcePages || {});
        const itemsPerPage = 50;

        // Generate single index page (client-side JS handles pagination)
        const data = {
            LWC_COUNT: lwcComponents.length,
            FLEXIPAGES_COUNT: flexiPages.length,
            AURA_COUNT: auraComponents.length,
            VF_COUNT: vfPages.length,
            LWC_LIST: this.generateLWCList(lwcComponents, 1, itemsPerPage),
            FLEXIPAGES_LIST: this.generateFlexiPagesList(flexiPages, 1, itemsPerPage),
            AURA_LIST: this.generateAuraList(auraComponents),
            VF_LIST: this.generateVFList(vfPages),
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>UI Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'ui',
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
                currentPage: 'ui',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Generate LWC components list HTML with "Where it is used" and pagination
     */
    generateLWCList(components, currentPage = 1, itemsPerPage = 50) {
        if (components.length === 0) return '<p>No LWC components found.</p>';
        
        // Sort components
        const sorted = components.sort();
        
        // Calculate pagination info
        const totalPages = Math.ceil(sorted.length / itemsPerPage);
        
        let html = '';
        
        // Pagination info (will be updated by JS)
        html += `<div class="pagination-info">Showing 1-${Math.min(itemsPerPage, sorted.length)} of ${sorted.length} LWC Components</div>\n`;
        
        // Table with ALL items (client-side JS will paginate)
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="lwcTable">\n';
        html += '<thead><tr><th>Component Name</th><th>Exposed</th><th>Where Used</th></tr></thead>\n';
        html += '<tbody>\n';
        
        for (const componentName of sorted) {
            const componentData = this.data.lwcComponents[componentName];
            const isExposed = componentData?.isExposed ? 'Yes' : 'No';
            const whereUsed = this.generateLWCWhereUsed(componentName);
            const whereUsedPreview = whereUsed.includes('<ul>') 
                ? whereUsed.match(/<strong>([^<]+)<\/strong>/g)?.map(s => s.replace(/<\/?strong>/g, '')).join(', ') || 'Not used'
                : 'Not used';
            
            html += `<tr>\n`;
            html += `  <td><strong>${this.escapeHtml(componentName)}</strong></td>\n`;
            html += `  <td>${isExposed}</td>\n`;
            html += `  <td>${whereUsedPreview}</td>\n`;
            html += `</tr>\n`;
        }
        
        html += '</tbody></table></div>\n';
        
        // Pagination controls - always generate if more than one page
        if (totalPages > 1) {
            html += this.generatePagination(1, totalPages, 'index.html#lwcTable');
        }
        
        return html;
    }
    
    /**
     * Generate FlexiPages list HTML with pagination
     */
    generateFlexiPagesList(pages, currentPage = 1, itemsPerPage = 50) {
        if (pages.length === 0) return '<p>No FlexiPages found.</p>';
        
        // Sort pages
        const sorted = pages.sort();
        
        // Paginate
        const pagination = this.paginateItems(sorted, itemsPerPage, currentPage);
        const paginatedPages = pagination.items;
        
        let html = '';
        
        // Pagination info
        html += `<div class="pagination-info">Showing ${pagination.startIndex}-${pagination.endIndex} of ${pagination.totalItems} FlexiPages</div>\n`;
        
        // Table format
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="flexiPagesTable">\n';
        html += '<thead><tr><th>FlexiPage Name</th><th>Type</th><th>LWC Components</th><th>Aura Components</th></tr></thead>\n';
        html += '<tbody>\n';
        
        for (const pageName of paginatedPages) {
            const pageData = this.data.flexiPages[pageName];
            const type = pageData?.type || 'Unknown';
            const lwcCount = pageData?.lwcComponents?.length || 0;
            const auraCount = pageData?.auraComponents?.length || 0;
            
            html += `            <tr>
                <td><strong>${this.escapeHtml(pageName)}</strong></td>
                <td>${this.escapeHtml(type)}</td>
                <td>${lwcCount}</td>
                <td>${auraCount}</td>
            </tr>\n`;
        }
        
        html += '        </tbody></table></div>\n';
        
        // Pagination controls - always generate if more than one page
        if (pagination.totalPages > 1) {
            html += this.generatePagination(currentPage, pagination.totalPages, 'index.html#flexiPagesTable');
        }
        
        return html;
    }
    
    /**
     * Generate Aura Components list HTML
     */
    generateAuraList(components) {
        if (components.length === 0) return '<p>No Aura components found.</p>';

        const sorted = components.sort();
        const totalPages = Math.ceil(sorted.length / 50);

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, sorted.length)} of ${sorted.length} Aura Components</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="auraTable">\n';
        html += '<thead><tr><th>Component Name</th><th>Description</th><th>Has Controller</th></tr></thead>\n';
        html += '<tbody>\n';

        for (const name of sorted) {
            const d = this.data.auraComponents[name] || {};
            const desc = this.escapeHtml(d.description || '');
            const hasController = d.hasController ? 'Yes' : 'No';
            html += `<tr><td><strong>${this.escapeHtml(name)}</strong></td><td>${desc}</td><td>${hasController}</td></tr>\n`;
        }

        html += '</tbody></table></div>\n';
        if (totalPages > 1) {
            html += this.generatePagination(1, totalPages, 'index.html#auraTable');
        }
        return html;
    }

    /**
     * Generate Visualforce Pages list HTML
     */
    generateVFList(pages) {
        if (pages.length === 0) return '<p>No Visualforce pages found.</p>';

        const sorted = pages.sort();
        const totalPages = Math.ceil(sorted.length / 50);

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, sorted.length)} of ${sorted.length} Visualforce Pages</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="vfTable">\n';
        html += '<thead><tr><th>Page Name</th><th>Label</th><th>API Version</th><th>Mobile</th></tr></thead>\n';
        html += '<tbody>\n';

        for (const name of sorted) {
            const d = this.data.visualforcePages[name] || {};
            html += `<tr>
                <td><strong>${this.escapeHtml(name)}</strong></td>
                <td>${this.escapeHtml(d.label || '')}</td>
                <td>${this.escapeHtml(d.apiVersion || '')}</td>
                <td>${d.availableInTouch ? 'Yes' : 'No'}</td>
            </tr>\n`;
        }

        html += '</tbody></table></div>\n';
        if (totalPages > 1) {
            html += this.generatePagination(1, totalPages, 'index.html#vfTable');
        }
        return html;
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
    <title>UI Layer - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>UI Layer</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${data.LWC_COUNT}</h3>
                    <p>LWC Components</p>
                </div>
                <div class="stat-card">
                    <h3>${data.FLEXIPAGES_COUNT}</h3>
                    <p>FlexiPages</p>
                </div>
                <div class="stat-card">
                    <h3>${data.AURA_COUNT}</h3>
                    <p>Aura Components</p>
                </div>
                <div class="stat-card">
                    <h3>${data.VF_COUNT}</h3>
                    <p>Visualforce Pages</p>
                </div>
            </div>
            <section>
                <h3>Lightning Web Components</h3>
                ${data.LWC_LIST}
            </section>
            <section>
                <h3>FlexiPages</h3>
                ${data.FLEXIPAGES_LIST}
            </section>
            <section>
                <h3>Aura Components</h3>
                ${data.AURA_LIST}
            </section>
            <section>
                <h3>Visualforce Pages</h3>
                ${data.VF_LIST}
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}
