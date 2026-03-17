/**
 * Maintenance Generator
 * 
 * Generates documentation pages for Maintenance:
 * - Maintenance overview page
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class MaintenanceGenerator extends BaseGenerator {
    constructor(repoRoot, data) {
        super(repoRoot, data);
        this.type = 'maintenance';
    }
    
    /**
     * Generate all maintenance pages
     */
    async generate() {
        console.log('  Generating maintenance pages...');
        
        // Generate maintenance overview page
        await this.generateOverviewPage();

        // Generate documentation health page
        await this.generateHealthPage();
        
        console.log(`    Generated maintenance documentation successfully.`);
    }
    
    /**
     * Generate maintenance overview page
     */
    async generateOverviewPage() {
        const data = {};
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Maintenance Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                        <li><a href="health.html">Documentation Health</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'maintenance',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            console.warn(`    Template not found, creating basic overview page`);
            const basicHtml = this.createBasicOverview();
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'maintenance',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }

    /**
     * Generate documentation health page
     */
    async generateHealthPage() {
        const data = this.buildHealthData();
        const templatePath = path.join(this.getTemplateDir(this.type), 'health.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Maintenance Navigation</h3>
                    <ul>
                        <li><a href="index.html">Overview</a></li>
                        <li><a href="health.html" class="active">Documentation Health</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'health.html', html, {
                standardizeLayout: true,
                currentPage: 'maintenance',
                currentSubPage: 'health',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            console.warn('    Health template not found, creating basic page');
            const basicHtml = this.createBasicHealthPage(data);
            await this.writePage(this.type, 'health.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'maintenance',
                currentSubPage: 'health',
                depthToRoot: 2,
                activeTop: 'guides'
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
    <title>Maintenance & Support - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Maintenance & Support</h2>
            <section>
                <h3>Overview</h3>
                <p>This section provides information about maintenance procedures and support resources.</p>
            </section>
        </main>
    </div>
</body>
</html>`;
    }

    buildHealthData() {
        const apexEntries = Object.entries(this.data.apexClasses || {});
        const apexTotal = apexEntries.length;
        const apexTests = apexEntries.filter(([, data]) => data?.isTest).length;
        const apexWithDescription = apexEntries.filter(([, data]) => (data?.description || '').trim().length > 0).length;
        const apexNoDescription = apexTotal - apexWithDescription;

        const flows = Object.values(this.data.flows || {});
        const flowTotal = flows.length;
        const flowActive = flows.filter(flow => (flow.status || '').toLowerCase() === 'active').length;
        const flowInactive = flowTotal - flowActive;

        const lwcEntries = Object.entries(this.data.lwcComponents || {});
        const lwcTotal = lwcEntries.length;
        const lwcWithApex = lwcEntries.filter(([, data]) => (data?.apexMethods || []).length > 0).length;
        const lwcWithoutApex = lwcTotal - lwcWithApex;

        const objectNames = Object.keys(this.data.objects || {});
        const objectTotal = objectNames.length;
        const customObjects = objectNames.filter(name => name.includes('__c')).length;
        const validationRulesTotal = Object.values(this.data.validationRules || {}).reduce((sum, rules) => sum + (rules?.length || 0), 0);
        const recordTypesTotal = Object.values(this.data.recordTypes || {}).reduce((sum, rts) => sum + (rts?.length || 0), 0);

        const relationships = this.data.relationships || {};
        const apexUsed = new Set();
        ['classToLWC', 'classToFlow', 'classToTrigger', 'classToAura', 'classToVisualforce'].forEach(key => {
            Object.keys(relationships[key] || {}).forEach(name => apexUsed.add(name));
        });
        const unusedApex = apexEntries.map(([name]) => name).filter(name => !apexUsed.has(name));

        const lwcUsed = new Set(Object.keys(relationships.lwcToFlexiPages || {}));
        const unusedLwc = lwcEntries.map(([name]) => name).filter(name => !lwcUsed.has(name));

        const flowsReferenced = new Set();
        Object.values(relationships.objectToFlows || {}).forEach(list => list.forEach(flow => flowsReferenced.add(flow)));
        Object.values(relationships.classToFlow || {}).forEach(list => list.forEach(flow => flowsReferenced.add(flow)));
        const unusedFlows = Object.keys(this.data.flows || {}).filter(name => !flowsReferenced.has(name));

        const formatList = (items, limit = 20) => {
            if (!items.length) return '<p><em>None</em></p>';
            const limited = items.slice(0, limit);
            const list = limited.map(item => `<li>${this.escapeHtml(item)}</li>`).join('');
            const more = items.length > limit ? `<li><em>... and ${items.length - limit} more</em></li>` : '';
            return `<ul>${list}${more}</ul>`;
        };

        return {
            APEX_TOTAL: apexTotal,
            APEX_TESTS: apexTests,
            APEX_NO_DESC: apexNoDescription,
            FLOW_TOTAL: flowTotal,
            FLOW_ACTIVE: flowActive,
            FLOW_INACTIVE: flowInactive,
            LWC_TOTAL: lwcTotal,
            LWC_WITH_APEX: lwcWithApex,
            LWC_NO_APEX: lwcWithoutApex,
            OBJECT_TOTAL: objectTotal,
            OBJECT_CUSTOM: customObjects,
            VALIDATION_RULES_TOTAL: validationRulesTotal,
            RECORD_TYPES_TOTAL: recordTypesTotal,
            UNUSED_APEX_LIST: formatList(unusedApex),
            UNUSED_LWC_LIST: formatList(unusedLwc),
            UNUSED_FLOW_LIST: formatList(unusedFlows),
        };
    }

    createBasicHealthPage(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Health - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Documentation Health</h2>
            <section>
                <h3>Summary</h3>
                <div class="stats-grid">
                    <div class="stat-card"><h3>${data.APEX_TOTAL}</h3><p>Apex Classes</p></div>
                    <div class="stat-card"><h3>${data.FLOW_TOTAL}</h3><p>Flows</p></div>
                    <div class="stat-card"><h3>${data.LWC_TOTAL}</h3><p>LWC Components</p></div>
                    <div class="stat-card"><h3>${data.OBJECT_TOTAL}</h3><p>Objects</p></div>
                </div>
            </section>
            <section>
                <h3>Potential Orphans</h3>
                <h4>Apex Classes (Not Referenced)</h4>
                ${data.UNUSED_APEX_LIST}
                <h4>LWC Components (Not on FlexiPages)</h4>
                ${data.UNUSED_LWC_LIST}
                <h4>Flows (No Tracked Entry Points)</h4>
                ${data.UNUSED_FLOW_LIST}
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}
