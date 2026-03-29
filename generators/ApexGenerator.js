/**
 * Apex Generator
 * 
 * Generates documentation pages for Apex Classes and Triggers:
 * - Apex layer overview page
 * - Individual Apex class pages (optional)
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';
import fs from 'fs/promises';

export class ApexGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'apex';
    }
    
    /**
     * Generate all Apex pages
     */
    async generate() {
        console.log('  Generating Apex pages...');
        
        // Generate Apex overview page
        await this.generateOverviewPage();
        
        // Generate individual Apex class pages
        await this.generateIndividualPages();
        
        console.log(`    Generated Apex documentation successfully.`);
    }
    
    /**
     * Generate individual Apex class pages
     */
    async generateIndividualPages() {
        const apexClasses = Object.entries(this.data.apexClasses || {});
        const templatePath = path.join(this.getTemplateDir(this.type), 'class.html');
        
        // Check if template exists, if not create basic pages
        let hasTemplate = true;
        try {
            await fs.access(templatePath);
        } catch {
            hasTemplate = false;
        }
        
        let successCount = 0;
        for (const [className, classData] of apexClasses) {
            try {
                if (hasTemplate) {
                    await this.generateClassPage(className, classData, templatePath);
                } else {
                    await this.generateBasicClassPage(className, classData);
                }
                successCount++;
            } catch (error) {
                console.error(`    Error generating page for class ${className}:`, error.message);
            }
        }
        
        console.log(`    Generated ${successCount}/${apexClasses.length} Apex class pages.`);
    }
    
    /**
     * Generate a single Apex class page
     */
    async generateClassPage(className, classData, templatePath) {
        const safeName = className.replace(/[^a-zA-Z0-9]/g, '_');
        const whereUsed = this.generateApexWhereUsed(className);
        
        const relationshipMap = this.generateRelationshipMap(className, 'apex');
        const data = {
            CLASS_NAME: className,
            CLASS_DESCRIPTION: classData?.description || '',
            IS_TEST: classData?.isTest ? 'Yes' : 'No',
            SHARING_MODEL: classData?.sharingModel || 'Inherited',
            METHODS_COUNT: classData?.methods?.length || 0,
            WHERE_USED: whereUsed,
            RELATIONSHIP_MAP: relationshipMap,
            SOURCE_LINK: this.generateSourceFileLink(classData?.file, 'View Source (.cls)'),
        };
        
        const html = await this.renderTemplate(templatePath, data);
        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Apex Navigation</h3>
                <ul>
                    <li><a href="index.html">Apex Overview</a></li>
                </ul>
            </div>
        `;
        await this.writePage(this.type, `class-${safeName}.html`, html, {
            standardizeLayout: true,
            currentPage: 'apex',
            currentSubPage: 'class',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }
    
    /**
     * Generate a basic Apex class page without template
     */
    async generateBasicClassPage(className, classData) {
        const safeName = className.replace(/[^a-zA-Z0-9]/g, '_');
        const whereUsed = this.generateApexWhereUsed(className);
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apex Class: ${this.escapeHtml(className)} - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="index.html">Apex Layer</a> / Class: ${this.escapeHtml(className)}
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><a href="index.html">Apex Overview</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>Apex Class: ${this.escapeHtml(className)}</h2>
                <section>
                    <h3>Class Information</h3>
                    <div class="info-box">
                        <p><strong>Class Name:</strong> ${this.escapeHtml(className)}</p>
                        <p><strong>Is Test:</strong> ${classData?.isTest ? 'Yes' : 'No'}</p>
                        <p><strong>Sharing Model:</strong> ${this.escapeHtml(classData?.sharingModel || 'Inherited')}</p>
                        ${classData?.description ? `<p><strong>Description:</strong> ${this.escapeHtml(classData.description)}</p>` : ''}
                        ${classData?.file ? `<p><strong>Source:</strong> ${this.generateSourceFileLink(classData.file, 'View Source (.cls)')}</p>` : ''}
                    </div>
                </section>
                <section>
                    <h3>Where it is Used</h3>
                    <div class="info-box">
                        ${whereUsed || '<p>This class is not used anywhere.</p>'}
                    </div>
                </section>
                <section>
                    ${this.generateRelationshipMap(className, 'apex')}
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
        
        const sectionNavHtmlBasic = `
            <div class="nav-section">
                <h3>Apex Navigation</h3>
                <ul>
                    <li><a href="index.html">Apex Overview</a></li>
                </ul>
            </div>
        `;
        await this.writePage(this.type, `class-${safeName}.html`, html, {
            standardizeLayout: true,
            currentPage: 'apex',
            currentSubPage: 'class',
            depthToRoot: 2,
            sectionNavHtml: sectionNavHtmlBasic,
            activeTop: 'guides'
        });
    }
    
    /**
     * Generate Apex overview page
     */
    async generateOverviewPage() {
        const apexClasses = Object.keys(this.data.apexClasses || {});
        const triggers = Object.keys(this.data.triggers || {});
        
        // Generate single index page (client-side JS handles pagination)
        const itemsPerPage = 50;
        const data = {
            APEX_COUNT: apexClasses.length,
            TRIGGERS_COUNT: triggers.length,
            APEX_CLASSES_LIST: this.generateApexClassesList(apexClasses, 1, itemsPerPage),
            TRIGGERS_LIST: this.generateTriggersList(triggers, 1, itemsPerPage),
            APEX_CLASSES_DETAILED: this.generateApexClassesDetailed(apexClasses.slice(0, 50)), // Limit detailed view
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Apex Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'apex',
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
                currentPage: 'apex',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
        
    }
    
    /**
     * Generate Apex classes list HTML with "Where it is used" information and pagination
     */
    generateApexClassesList(classes, currentPage = 1, itemsPerPage = 50) {
        if (classes.length === 0) return '<p>No Apex classes found.</p>';
        
        // Sort classes
        const sorted = classes.sort();
        
        // Calculate pagination info
        const totalPages = Math.ceil(sorted.length / itemsPerPage);
        
        let html = '';
        
        // Pagination info (will be updated by JS)
        html += `<div class="pagination-info">Showing 1-${Math.min(itemsPerPage, sorted.length)} of ${sorted.length} Apex Classes</div>\n`;
        
        // Table with ALL items (client-side JS will paginate)
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="apexTable">\n';
        html += '<thead><tr><th>Class Name</th><th>Type</th><th>Where Used</th><th>Source</th></tr></thead>\n';
        html += '<tbody>\n';
        
        for (const className of sorted) {
            const classData = this.data.apexClasses[className];
            const isTest = classData?.isTest ? 'Test' : 'Production';
            const whereUsed = this.generateApexWhereUsed(className);
            // Extract first line of whereUsed for table display
            const whereUsedPreview = whereUsed.includes('<ul>') 
                ? whereUsed.match(/<strong>([^<]+)<\/strong>/g)?.map(s => s.replace(/<\/?strong>/g, '')).join(', ') || 'Not used'
                : 'Not used';
            
            const safeName = className.replace(/[^a-zA-Z0-9]/g, '_');
            const sourceLink = this.generateSourceFileLink(classData?.file, 'View Source');
            html += `<tr>\n`;
            html += `  <td><a href="class-${safeName}.html"><strong>${this.escapeHtml(className)}</strong></a></td>\n`;
            html += `  <td>${isTest}</td>\n`;
            html += `  <td>${whereUsedPreview}</td>\n`;
            html += `  <td>${sourceLink}</td>\n`;
            html += `</tr>\n`;
        }
        
        html += '</tbody></table></div>\n';
        
        // Pagination controls - always generate if more than one page
        if (totalPages > 1) {
            html += this.generatePagination(1, totalPages, 'index.html');
        }
        
        return html;
    }
    
    /**
     * Generate Apex classes detailed list with "Where it is used" sections
     */
    generateApexClassesDetailed(classes) {
        if (classes.length === 0) return '<p>No Apex classes found.</p>';
        
        const sorted = classes.sort().slice(0, 50); // Limit to 50 for detailed view
        let html = '';
        
        for (const className of sorted) {
            const classData = this.data.apexClasses[className];
            const isTest = classData?.isTest ? ' (Test)' : '';
            const whereUsed = this.generateApexWhereUsed(className);
            
            html += `<section id="apex-${this.sanitizeNodeName(className)}">\n`;
            html += `  <h3>${this.escapeHtml(className)}${isTest}</h3>\n`;
            if (classData?.description) {
                html += `  <p>${this.escapeHtml(classData.description)}</p>\n`;
            }
            html += `  <h4>Where is it Used</h4>\n`;
            html += `  <div class="info-box">${whereUsed}</div>\n`;
            html += `</section>\n\n`;
        }
        
        if (classes.length > 50) {
            html += `<p><em>... and ${classes.length - 50} more classes (see table above)</em></p>\n`;
        }
        
        return html;
    }
    
    /**
     * Generate triggers list HTML with "Where it is used"
     */
    generateTriggersList(triggers) {
        if (triggers.length === 0) return '<p>No triggers found.</p>';
        
        let html = '<div class="table-container">\n';
        html += '<table class="data-table">\n';
        html += '<thead><tr><th>Trigger Name</th><th>Object</th><th>Where Used</th></tr></thead>\n';
        html += '<tbody>\n';
        
        for (const triggerName of triggers.sort()) {
            const triggerData = this.data.triggers[triggerName];
            const objectName = triggerData?.object || 'Unknown';
            const whereUsed = this.generateTriggerWhereUsed(triggerName);
            const whereUsedPreview = whereUsed.includes('<ul>') 
                ? whereUsed.match(/<strong>([^<]+)<\/strong>/g)?.map(s => s.replace(/<\/?strong>/g, '')).join(', ') || 'No handlers'
                : 'No handlers';
            
            html += `<tr>\n`;
            html += `  <td><strong>${this.escapeHtml(triggerName)}</strong></td>\n`;
            html += `  <td>${this.escapeHtml(objectName)}</td>\n`;
            html += `  <td>${whereUsedPreview}</td>\n`;
            html += `</tr>\n`;
        }
        
        html += '</tbody></table></div>\n';
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
    <title>Apex Layer - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / Apex Layer
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                    <h3>Related</h3>
                    <ul>
                        <li><a href="../automation/index.html">Automation</a></li>
                        <li><a href="../ui/index.html">UI Layer</a></li>
                        <li><a href="../profiles/index.html">Security & Access</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>Apex Layer</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${data.APEX_COUNT}</h3>
                        <p>Apex Classes</p>
                    </div>
                    <div class="stat-card">
                        <h3>${data.TRIGGERS_COUNT}</h3>
                        <p>Triggers</p>
                    </div>
                </div>
                <section>
                    <h3>Apex Classes</h3>
                    ${data.APEX_CLASSES_LIST}
                </section>
                <section>
                    <h3>Triggers</h3>
                    ${data.TRIGGERS_LIST}
                </section>
            </main>
        </div>
        <footer>
            <p>Salesforce Technical Documentation</p>
        </footer>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;
    }
}
