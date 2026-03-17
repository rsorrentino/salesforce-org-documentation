/**
 * Architecture Generator
 * 
 * Generates documentation pages for Architecture:
 * - Architecture overview page
 * - Repository structure page
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class ArchitectureGenerator extends BaseGenerator {
    constructor(repoRoot, data) {
        super(repoRoot, data);
        this.type = 'architecture';
    }
    
    /**
     * Generate all architecture pages
     */
    async generate() {
        console.log('  Generating architecture pages...');
        
        // Generate architecture overview page
        await this.generateOverviewPage();
        
        // Generate repository structure page
        await this.generateRepositoryStructurePage();
        
        console.log(`    Generated architecture documentation successfully.`);
    }
    
    /**
     * Generate architecture overview page
     */
    async generateOverviewPage() {
        const data = {
            APEX_COUNT: Object.keys(this.data.apexClasses || {}).length,
            TRIGGERS_COUNT: Object.keys(this.data.triggers || {}).length,
            LWC_COUNT: Object.keys(this.data.lwcComponents || {}).length,
            FLOWS_COUNT: Object.keys(this.data.flows || {}).length,
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Architecture Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                        <li><a href="repository-structure.html">Repository Structure</a></li>
                        <li><a href="functional-map.html">Functional Map</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'architecture',
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
                currentPage: 'architecture',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Generate repository structure page
     */
    async generateRepositoryStructurePage() {
        const data = {
            APEX_COUNT: Object.keys(this.data.apexClasses || {}).length,
            TRIGGERS_COUNT: Object.keys(this.data.triggers || {}).length,
            LWC_COUNT: Object.keys(this.data.lwcComponents || {}).length,
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'repository-structure.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Architecture Navigation</h3>
                    <ul>
                        <li><a href="index.html">Overview</a></li>
                        <li><a href="repository-structure.html" class="active">Repository Structure</a></li>
                        <li><a href="functional-map.html">Functional Map</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'repository-structure.html', html, {
                standardizeLayout: true,
                currentPage: 'architecture',
                currentSubPage: 'repository-structure',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // Skip if template doesn't exist
            console.warn(`    Repository structure template not found, skipping...`);
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
    <title>Architecture - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Architecture</h2>
            <section>
                <h3>Overview</h3>
                <p>This section provides an overview of the system architecture and repository structure.</p>
            </section>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${data.APEX_COUNT}</h3>
                    <p>Apex Classes</p>
                </div>
                <div class="stat-card">
                    <h3>${data.TRIGGERS_COUNT}</h3>
                    <p>Triggers</p>
                </div>
                <div class="stat-card">
                    <h3>${data.LWC_COUNT}</h3>
                    <p>LWC Components</p>
                </div>
                <div class="stat-card">
                    <h3>${data.FLOWS_COUNT}</h3>
                    <p>Flows</p>
                </div>
            </div>
        </main>
    </div>
</body>
</html>`;
    }
}
