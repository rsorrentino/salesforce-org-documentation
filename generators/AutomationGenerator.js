/**
 * Automation Generator
 * 
 * Generates documentation pages for Automation:
 * - Automation overview page
 * - Triggers listing
 * - Approval processes, assignment rules, etc.
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class AutomationGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'automation';
    }
    
    /**
     * Generate all automation pages
     */
    async generate() {
        console.log('  Generating automation pages...');
        
        // Generate automation overview page
        await this.generateOverviewPage();
        
        console.log(`    Generated automation documentation successfully.`);
    }
    
    /**
     * Generate Approval Processes list HTML
     */
    generateApprovalsList() {
        const approvals = this.data.approvalProcesses || {};
        const names = Object.keys(approvals).sort();
        if (names.length === 0) return '<p>No approval processes found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Approval Processes</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="approvalsTable">\n';
        html += '<thead><tr><th>Name</th><th>Object</th><th>Active Steps</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const name of names) {
            const d = approvals[name] || {};
            const obj = this.escapeHtml(d.object || '');
            const steps = Array.isArray(d.steps) ? d.steps.length : 0;
            html += `<tr><td><strong>${this.escapeHtml(name)}</strong></td><td>${obj}</td><td>${steps}</td></tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#approvalsTable');
        }
        return html;
    }

    /**
     * Generate Workflows list HTML
     */
    generateWorkflowsList() {
        const workflows = this.data.workflows || {};
        const names = Object.keys(workflows).sort();
        if (names.length === 0) return '<p>No workflows found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Workflows</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="workflowsTable">\n';
        html += '<thead><tr><th>Object</th><th>Alert Count</th><th>Field Update Count</th><th>Rule Count</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const obj of names) {
            const d = workflows[obj] || {};
            html += `<tr>
                <td><strong>${this.escapeHtml(obj)}</strong></td>
                <td>${(d.alerts || []).length}</td>
                <td>${(d.fieldUpdates || []).length}</td>
                <td>${(d.rules || []).length}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#workflowsTable');
        }
        return html;
    }

    /**
     * Generate Quick Actions list HTML
     */
    generateQuickActionsList() {
        const quickActions = this.data.quickActions || {};
        const rows = [];
        for (const [obj, actions] of Object.entries(quickActions)) {
            for (const [actionName, d] of Object.entries(actions)) {
                rows.push({ obj, actionName, ...d });
            }
        }
        rows.sort((a, b) => `${a.obj}.${a.actionName}`.localeCompare(`${b.obj}.${b.actionName}`));

        if (rows.length === 0) return '<p>No quick actions found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, rows.length)} of ${rows.length} Quick Actions</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="quickActionsTable">\n';
        html += '<thead><tr><th>Object</th><th>Action Name</th><th>Label</th><th>Type</th><th>LWC</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const r of rows) {
            html += `<tr>
                <td>${this.escapeHtml(r.obj)}</td>
                <td><strong>${this.escapeHtml(r.actionName)}</strong></td>
                <td>${this.escapeHtml(r.label || '')}</td>
                <td>${this.escapeHtml(r.type || '')}</td>
                <td>${this.escapeHtml(r.lwcComponent || '')}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (rows.length > 50) {
            html += this.generatePagination(1, Math.ceil(rows.length / 50), 'index.html#quickActionsTable');
        }
        return html;
    }

    /**
     * Generate Sharing Rules list HTML
     */
    generateSharingRulesList() {
        const sharingRules = this.data.sharingRules || {};
        const names = Object.keys(sharingRules).sort();
        if (names.length === 0) return '<p>No sharing rules found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Objects with Sharing Rules</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="sharingRulesTable">\n';
        html += '<thead><tr><th>Object</th><th>Owner Rules</th><th>Criteria Rules</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const obj of names) {
            const d = sharingRules[obj] || {};
            html += `<tr>
                <td><strong>${this.escapeHtml(obj)}</strong></td>
                <td>${(d.ownerRules || []).length}</td>
                <td>${(d.criteriaRules || []).length}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#sharingRulesTable');
        }
        return html;
    }

    /**
     * Generate automation overview page
     */
    async generateOverviewPage() {
        // Count validation rules
        const validationRulesCount = Object.values(this.data.validationRules || {})
            .reduce((sum, rules) => sum + (rules?.length || 0), 0);

        const data = {
            TRIGGERS_COUNT: Object.keys(this.data.triggers || {}).length,
            FLOWS_COUNT: Object.keys(this.data.flows || {}).length,
            APPROVAL_PROCESSES_COUNT: Object.keys(this.data.approvalProcesses || {}).length,
            ASSIGNMENT_RULES_COUNT: Object.keys(this.data.assignmentRules || {}).length,
            AUTO_RESPONSE_RULES_COUNT: Object.keys(this.data.autoResponseRules || {}).length,
            ESCALATION_RULES_COUNT: Object.keys(this.data.escalationRules || {}).length,
            VALIDATION_RULES_COUNT: validationRulesCount,
            WORKFLOWS_COUNT: Object.keys(this.data.workflows || {}).length,
            QUICK_ACTIONS_COUNT: Object.values(this.data.quickActions || {}).reduce((sum, a) => sum + Object.keys(a).length, 0),
            SHARING_RULES_COUNT: Object.keys(this.data.sharingRules || {}).length,
            APPROVAL_PROCESSES_LIST: this.generateApprovalsList(),
            WORKFLOWS_LIST: this.generateWorkflowsList(),
            QUICK_ACTIONS_LIST: this.generateQuickActionsList(),
            SHARING_RULES_LIST: this.generateSharingRulesList(),
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Automation Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                        <li><a href="../flows/index.html">Flows</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'automation',
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
                currentPage: 'automation',
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
    <title>Automation - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Automation</h2>
            <section>
                <h3>Overview</h3>
                <p>Automation in Salesforce includes Flows, Triggers, Approval Processes, Assignment Rules, AutoResponse Rules, Escalation Rules, and Validation Rules.</p>
            </section>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${data.TRIGGERS_COUNT}</h3>
                    <p>Triggers</p>
                </div>
                <div class="stat-card">
                    <h3>${data.FLOWS_COUNT}</h3>
                    <p>Flows</p>
                </div>
                <div class="stat-card">
                    <h3>${data.APPROVAL_PROCESSES_COUNT}</h3>
                    <p>Approval Processes</p>
                </div>
                <div class="stat-card">
                    <h3>${data.ASSIGNMENT_RULES_COUNT}</h3>
                    <p>Assignment Rules</p>
                </div>
                <div class="stat-card">
                    <h3>${data.AUTO_RESPONSE_RULES_COUNT}</h3>
                    <p>AutoResponse Rules</p>
                </div>
                <div class="stat-card">
                    <h3>${data.ESCALATION_RULES_COUNT}</h3>
                    <p>Escalation Rules</p>
                </div>
                <div class="stat-card">
                    <h3>${data.VALIDATION_RULES_COUNT}</h3>
                    <p>Validation Rules</p>
                </div>
                <div class="stat-card">
                    <h3>${data.WORKFLOWS_COUNT}</h3>
                    <p>Workflows</p>
                </div>
                <div class="stat-card">
                    <h3>${data.QUICK_ACTIONS_COUNT}</h3>
                    <p>Quick Actions</p>
                </div>
                <div class="stat-card">
                    <h3>${data.SHARING_RULES_COUNT}</h3>
                    <p>Objects w/ Sharing Rules</p>
                </div>
            </div>
            <section>
                <h3>Approval Processes</h3>
                ${data.APPROVAL_PROCESSES_LIST}
            </section>
            <section>
                <h3>Workflows</h3>
                ${data.WORKFLOWS_LIST}
            </section>
            <section>
                <h3>Quick Actions</h3>
                ${data.QUICK_ACTIONS_LIST}
            </section>
            <section>
                <h3>Sharing Rules</h3>
                ${data.SHARING_RULES_LIST}
            </section>
            <section>
                <h3>Related Pages</h3>
                <ul>
                    <li><a href="../flows/index.html">All Flows</a></li>
                    <li><a href="../apex/index.html">Apex Layer (Triggers)</a></li>
                </ul>
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}
