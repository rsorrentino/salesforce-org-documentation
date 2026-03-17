/**
 * Deployment Generator
 * 
 * Generates documentation pages for Deployment:
 * - Deployment overview page
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class DeploymentGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'deployment';
    }
    
    /**
     * Generate all deployment pages
     */
    async generate() {
        console.log('  Generating deployment pages...');
        
        // Generate deployment overview page
        await this.generateOverviewPage();
        
        console.log(`    Generated deployment documentation successfully.`);
    }
    
    /**
     * Generate deployment overview page
     */
    async generateOverviewPage() {
        const data = {};
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Deployment Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'deployment',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'deployment'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            console.warn(`    Template not found, creating basic overview page`);
            const basicHtml = this.createBasicOverview();
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'deployment',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'deployment'
            });
        }
    }
    
    /**
     * Create basic overview page
     */
    createBasicOverview() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deployment - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Deployment & Environments</h2>
            <section>
                <h3>Overview</h3>
                <p>This section documents deployment processes and environment configurations.</p>
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}
