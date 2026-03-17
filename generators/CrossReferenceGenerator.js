/**
 * Cross-Reference Generator
 * 
 * Generates documentation pages for Cross-Reference:
 * - Cross-reference index page
 * - Component relationships
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class CrossReferenceGenerator extends BaseGenerator {
    constructor(repoRoot, data) {
        super(repoRoot, data);
        this.type = 'cross-reference';
    }
    
    /**
     * Generate all cross-reference pages
     */
    async generate() {
        console.log('  Generating cross-reference pages...');
        
        // Generate cross-reference overview page
        await this.generateOverviewPage();
        
        console.log(`    Generated cross-reference documentation successfully.`);
    }
    
    /**
     * Generate cross-reference overview page
     */
    async generateOverviewPage() {
        const data = {
            RELATIONSHIPS_COUNT: this.countRelationships(),
            RELATIONSHIPS_TABLE: this.generateRelationshipsTable(),
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Cross-Reference Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'cross-reference',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'api'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            console.warn(`    Template not found, creating basic overview page`);
            const basicHtml = this.createBasicOverview(data);
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'cross-reference',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'api'
            });
        }
    }
    
    /**
     * Count total relationships
     */
    countRelationships() {
        const relationships = this.data.relationships || {};
        let count = 0;
        for (const relType of Object.values(relationships)) {
            if (typeof relType === 'object') {
                count += Object.keys(relType).length;
            }
        }
        return count;
    }
    
    /**
     * Generate relationships table HTML
     */
    generateRelationshipsTable() {
        const relationships = this.data.relationships || {};
        let html = '<tbody>\n';
        
        // Profile to Classes
        for (const [profile, classes] of Object.entries(relationships.profileToClasses || {})) {
            if (Array.isArray(classes) && classes.length > 0) {
                html += `                        <tr>
                            <td>Profile</td>
                            <td>${this.escapeHtml(profile)}</td>
                            <td>Apex Classes</td>
                            <td>${classes.length} class(es)</td>
                        </tr>\n`;
            }
        }
        
        // Class to LWC
        for (const [className, lwcComponents] of Object.entries(relationships.classToLWC || {})) {
            if (Array.isArray(lwcComponents) && lwcComponents.length > 0) {
                html += `                        <tr>
                            <td>Apex Class</td>
                            <td>${this.escapeHtml(className)}</td>
                            <td>LWC Components</td>
                            <td>${lwcComponents.length} component(s)</td>
                        </tr>\n`;
            }
        }
        
        // LWC to FlexiPages
        for (const [lwcName, pages] of Object.entries(relationships.lwcToFlexiPages || {})) {
            if (Array.isArray(pages) && pages.length > 0) {
                html += `                        <tr>
                            <td>LWC Component</td>
                            <td>${this.escapeHtml(lwcName)}</td>
                            <td>FlexiPages</td>
                            <td>${pages.length} page(s)</td>
                        </tr>\n`;
            }
        }
        
        html += '                    </tbody>';
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
    <title>Cross-Reference - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Cross-Reference Index</h2>
            <section>
                <h3>Overview</h3>
                <p>This page shows relationships between different components in the system.</p>
                <p>Total Relationships: ${data.RELATIONSHIPS_COUNT}</p>
            </section>
            <section>
                <h3>Relationships</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Source Type</th>
                                <th>Source Name</th>
                                <th>Target Type</th>
                                <th>Target Count</th>
                            </tr>
                        </thead>
                        ${data.RELATIONSHIPS_TABLE}
                    </table>
                </div>
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}
