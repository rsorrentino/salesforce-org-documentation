/**
 * Flows Generator
 * 
 * Generates documentation pages for Salesforce Flows including:
 * - Flow overview page
 * - Individual flow pages with Mermaid diagrams
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class FlowsGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'flows';
    }
    
    /**
     * Generate all flow pages
     */
    async generate() {
        console.log('  Generating flow pages...');
        
        // Generate flows overview page
        await this.generateOverviewPage();
        
        // Generate individual flow pages
        await this.generateIndividualPages();
        
        console.log(`    Generated flow documentation successfully.`);
    }
    
    /**
     * Generate flows overview page with pagination
     */
    async generateOverviewPage() {
        const flows = Object.entries(this.data.flows || {});
        const flowsCount = flows.length;
        const itemsPerPage = 50;
        
        // Generate single index page (client-side JS handles pagination)
        const data = {
            FLOWS_COUNT: flowsCount,
            FLOWS_LIST: this.generateFlowsList(1, itemsPerPage)
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Flow Navigation</h3>
                    <ul>
                        <li><a href="../automation/index.html">Automation Overview</a></li>
                        <li><a href="index.html" class="active">All Flows</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'automation',
                currentSubPage: 'flows',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            console.warn(`    Template not found, creating basic overview page`);
            const basicHtml = this.createBasicOverview(flowsCount, data.FLOWS_LIST);
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'automation',
                currentSubPage: 'flows',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Create a basic overview page if template doesn't exist
     */
    createBasicOverview(count, flowsList) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flows - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="../automation/index.html">Automation</a> / Flows
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><a href="../automation/index.html">Automation Overview</a></li>
                        <li><a href="index.html" class="active">All Flows</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>Flows</h2>
                <p>Total Flows: ${count}</p>
                ${flowsList || this.generateFlowsList(1, 50)}
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
    
    /**
     * Generate individual flow pages
     */
    async generateIndividualPages() {
        const flows = this.data.flows || {};
        const templatePath = path.join(this.getTemplateDir(this.type), 'flow.html');
        
        let successCount = 0;
        for (const [flowName, flowData] of Object.entries(flows)) {
            try {
                await this.generateFlowPage(flowName, flowData, templatePath);
                successCount++;
            } catch (error) {
                console.error(`    Error generating page for flow ${flowName}:`, error.message);
            }
        }
        
        console.log(`    Generated ${successCount}/${Object.keys(flows).length} flow pages.`);
    }
    
    /**
     * Generate a single flow page
     */
    async generateFlowPage(flowName, flowData, templatePath) {
        const mermaidDiagram = this.generateFlowMermaid(flowName, flowData);
        const safeFlowName = this.sanitizeNodeName(flowName);
        
        const data = {
            FLOW_NAME: flowName,
            FLOW_LABEL: flowData.label || flowName,
            FLOW_STATUS: flowData.status || 'Active',
            FLOW_PROCESS_TYPE: flowData.processType || 'Flow',
            FLOW_API_VERSION: flowData.apiVersion || String(flowData.apiVersion || '60'),
            MERMAID_DIAGRAM: mermaidDiagram || 'flowchart TD\n    Start([Start])\n    End([End])\n    Start --> End',
            DECISIONS_COUNT: String((flowData.decisions || []).length),
            DECISIONS_TABLE: this.generateDecisionsTable(flowData.decisions || []),
            RECORD_LOOKUPS_COUNT: String((flowData.recordLookups || []).length),
            RECORD_LOOKUPS_TABLE: this.generateRecordLookupsTable(flowData.recordLookups || []),
            RECORD_UPDATES_COUNT: String((flowData.recordUpdates || []).length),
            RECORD_UPDATES_TABLE: this.generateRecordUpdatesTable(flowData.recordUpdates || []),
            RECORD_CREATES_COUNT: String((flowData.recordCreates || []).length),
            RECORD_CREATES_TABLE: this.generateRecordCreatesTable(flowData.recordCreates || []),
            ASSIGNMENTS_COUNT: String((flowData.assignments || []).length),
            ASSIGNMENTS_TABLE: this.generateAssignmentsTable(flowData.assignments || []),
            ACTIONS_COUNT: String((flowData.actions || []).length),
            ACTIONS_TABLE: this.generateActionsTable(flowData.actions || []),
            FORMULAS_COUNT: String((flowData.formulas || []).length),
            FORMULAS_TABLE: this.generateFormulasTable(flowData.formulas || []),
            VARIABLES_COUNT: String((flowData.variables || []).length),
            VARIABLES_TABLE: this.generateVariablesTable(flowData.variables || []),
            WHERE_USED: this.generateFlowWhereUsed(flowName) || '<p><em>No usage information available.</em></p>',
            RELATIONSHIP_MAP: this.generateRelationshipMap(flowName, 'flow')
        };
        
        const html = await this.renderTemplate(templatePath, data);
        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Flow Navigation</h3>
                <ul>
                    <li><a href="../automation/index.html">Automation Overview</a></li>
                    <li><a href="index.html">All Flows</a></li>
                </ul>
            </div>
        `;
        await this.writePage(this.type, `flow-${safeFlowName}.html`, html, {
            standardizeLayout: true,
            currentPage: 'automation',
            currentSubPage: 'flows',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }
    
    /**
     * Generate Mermaid diagram for a flow
     */
    generateFlowMermaid(flowName, flowData) {
        const sanitizeLabel = (val, maxLen = 60) => {
            if (val === undefined || val === null) return '';
            const cleaned = String(val)
                .replace(/\r?\n/g, ' ')       // Mermaid labels don't like raw newlines
                .replace(/\s+/g, ' ')
                .replace(/\|/g, '/')         // '|' breaks edge-label syntax
                .replace(/"/g, "'")          // Avoid breaking quoted labels
                .replace(/[{}]/g, '')        // Avoid breaking decision node {{ }} syntax
                .replace(/[<>]/g, '')        // Avoid HTML-like tokens confusing Mermaid
                .replace(/\\/g, '/')         // Avoid escape sequences
                .replace(/\[/g, '(').replace(/\]/g, ')') // Avoid bracket syntax collisions
                .replace(/`/g, "'")
                .trim()
                .slice(0, maxLen);
            return cleaned.length ? cleaned : ' ';
        };

        let mermaid = '%%{init: {"flowchart": {"curve": "basis", "htmlLabels": true}} }%%\nflowchart TD\n';
        const nodes = {};
        const edges = [];
        
        // Start node
        mermaid += '    Start([Start])\n';
        
        // Check if flow has any elements
        const hasElements = (flowData.recordLookups && flowData.recordLookups.length > 0) ||
                           (flowData.decisions && flowData.decisions.length > 0) ||
                           (flowData.recordUpdates && flowData.recordUpdates.length > 0) ||
                           (flowData.recordCreates && flowData.recordCreates.length > 0) ||
                           (flowData.assignments && flowData.assignments.length > 0) ||
                           (flowData.actions && flowData.actions.length > 0);
        
        if (!hasElements) {
            // Simple flow with just start and end
            mermaid += '    End([End])\n';
            mermaid += '    Start --> End\n';
            return mermaid;
        }
        
        if (flowData.start) {
            edges.push(['Start', this.sanitizeNodeName(flowData.start), '']);
        }
        
        // Record lookups
        for (const lookup of flowData.recordLookups || []) {
            const lookupName = this.sanitizeNodeName(lookup.name || `Lookup_${flowData.recordLookups.indexOf(lookup)}`);
            nodes[lookupName] = { type: 'lookup', label: sanitizeLabel(lookup.label || lookup.name || lookupName) };
            if (lookup.target) {
                edges.push([lookupName, this.sanitizeNodeName(lookup.target), '']);
            }
        }
        
        // Decisions
        for (const decision of flowData.decisions || []) {
            const decName = this.sanitizeNodeName(decision.name || `Decision_${flowData.decisions.indexOf(decision)}`);
            nodes[decName] = { type: 'decision', label: sanitizeLabel(decision.label || decision.name || decName) };
            
            for (const rule of decision.rules || []) {
                if (rule.target) {
                    edges.push([decName, this.sanitizeNodeName(rule.target), sanitizeLabel(rule.label || rule.name || '', 24)]);
                }
            }
            if (decision.defaultTarget) {
                edges.push([decName, this.sanitizeNodeName(decision.defaultTarget), sanitizeLabel(decision.defaultLabel || 'Default', 24)]);
            }
        }
        
        // Record updates
        for (const update of flowData.recordUpdates || []) {
            const updateName = this.sanitizeNodeName(update.name || `Update_${flowData.recordUpdates.indexOf(update)}`);
            nodes[updateName] = { type: 'update', label: sanitizeLabel(update.label || update.name || updateName) };
            if (update.target) {
                edges.push([updateName, this.sanitizeNodeName(update.target), '']);
            }
            if (update.faultTarget) {
                edges.push([updateName, this.sanitizeNodeName(update.faultTarget), 'Error']);
            }
        }
        
        // Record creates
        for (const create of flowData.recordCreates || []) {
            const createName = this.sanitizeNodeName(create.name || `Create_${flowData.recordCreates.indexOf(create)}`);
            nodes[createName] = { type: 'create', label: sanitizeLabel(create.label || create.name || createName) };
            if (create.target) {
                edges.push([createName, this.sanitizeNodeName(create.target), '']);
            }
        }
        
        // Assignments
        for (const assignment of flowData.assignments || []) {
            const assignName = this.sanitizeNodeName(assignment.name || `Assign_${flowData.assignments.indexOf(assignment)}`);
            nodes[assignName] = { type: 'assignment', label: sanitizeLabel(assignment.label || assignment.name || assignName) };
            if (assignment.target) {
                edges.push([assignName, this.sanitizeNodeName(assignment.target), '']);
            }
        }
        
        // Screens
        for (const screen of flowData.screens || []) {
            const screenName = this.sanitizeNodeName(screen.name || `Screen_${flowData.screens.indexOf(screen)}`);
            nodes[screenName] = { type: 'screen', label: sanitizeLabel(screen.label || screen.name || screenName) };
            if (screen.target) {
                edges.push([screenName, this.sanitizeNodeName(screen.target), '']);
            }
        }
        
        // Loops
        for (const loop of flowData.loops || []) {
            const loopName = this.sanitizeNodeName(loop.name || `Loop_${flowData.loops.indexOf(loop)}`);
            nodes[loopName] = { type: 'loop', label: sanitizeLabel(loop.label || loop.name || loopName) };
            if (loop.target) {
                edges.push([loopName, this.sanitizeNodeName(loop.target), '']);
            }
        }
        
        // Actions
        for (const action of flowData.actions || []) {
            const actionName = this.sanitizeNodeName(action.name || `Action_${flowData.actions.indexOf(action)}`);
            const actionType = action.type || 'action';
            if (actionType === 'apex') {
                const base = action.label || action.name || actionName;
                const suffix = action.actionName ? ` (${action.actionName})` : '';
                nodes[actionName] = { type: 'apex', label: sanitizeLabel(`${base}${suffix}`) };
            } else {
                nodes[actionName] = { type: 'action', label: sanitizeLabel(action.label || action.name || actionName) };
            }
            if (action.target) {
                edges.push([actionName, this.sanitizeNodeName(action.target), '']);
            }
            if (action.faultTarget) {
                edges.push([actionName, this.sanitizeNodeName(action.faultTarget), 'Error']);
            }
        }
        
        // Add end node definition first so edges can reference it
        mermaid += '    End([End])\n';

        // Generate node definitions — always use quoted labels so parentheses,
        // dashes and other special chars inside the label text can't break Mermaid syntax.
        for (const [nodeName, nodeInfo] of Object.entries(nodes)) {
            const nodeLabel = nodeInfo.label;
            if (nodeInfo.type === 'decision') {
                mermaid += `    ${nodeName}{"${nodeLabel}"}\n`;
            } else {
                mermaid += `    ${nodeName}["${nodeLabel}"]\n`;
            }
        }

        // Only emit edges where both source AND target are defined to prevent layout errors
        const definedNodes = new Set(['Start', 'End', ...Object.keys(nodes)]);
        const validEdges = edges.filter(([src, tgt]) => definedNodes.has(src) && definedNodes.has(tgt));

        // Track which nodes appear as targets so we can find terminals
        const targetNodes = new Set(validEdges.map(e => e[1]));

        // Generate edges
        for (const [source, target, label] of validEdges) {
            if (label) {
                mermaid += `    ${source} -->|${sanitizeLabel(label, 24)}| ${target}\n`;
            } else {
                mermaid += `    ${source} --> ${target}\n`;
            }
        }

        // Connect terminal nodes (not pointed to by anyone) to End
        const allNodeNames = Object.keys(nodes);
        if (allNodeNames.length > 0) {
            const terminalNodes = allNodeNames.filter(n => !targetNodes.has(n) && n !== 'Start' && n !== 'End');
            for (const t of terminalNodes.slice(0, 5)) {
                mermaid += `    ${t} --> End\n`;
            }
        } else if (validEdges.length === 0) {
            mermaid += '    Start --> End\n';
        }
        
        // Style nodes
        mermaid += '    classDef decision fill:#E31E24,stroke:#B8151A,stroke-width:2px,color:#fff\n';
        mermaid += '    classDef action fill:#2C2C2C,stroke:#1a1a1a,stroke-width:2px,color:#fff\n';
        mermaid += '    classDef startEnd fill:#F5F5F5,stroke:#E0E0E0,stroke-width:2px\n';
        
        // Apply styles
        for (const [nodeName, nodeInfo] of Object.entries(nodes)) {
            if (nodeInfo.type === 'decision') {
                mermaid += `    class ${nodeName} decision\n`;
            } else {
                mermaid += `    class ${nodeName} action\n`;
            }
        }
        mermaid += '    class Start,End startEnd\n';
        
        return mermaid;
    }
    
    /**
     * Generate HTML table for decisions
     */
    generateDecisionsTable(decisions) {
        if (decisions.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const decision of decisions) {
            const rulesCount = (decision.rules || []).length;
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(decision.name || '')}</strong></td>
                            <td>${this.escapeHtml(decision.label || '')}</td>
                            <td>${rulesCount} rule(s)</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for record lookups
     */
    generateRecordLookupsTable(lookups) {
        if (lookups.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const lookup of lookups) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(lookup.name || '')}</strong></td>
                            <td>${this.escapeHtml(lookup.label || '')}</td>
                            <td>${this.escapeHtml(lookup.object || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for record updates
     */
    generateRecordUpdatesTable(updates) {
        if (updates.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const update of updates) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(update.name || '')}</strong></td>
                            <td>${this.escapeHtml(update.label || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for record creates
     */
    generateRecordCreatesTable(creates) {
        if (creates.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const create of creates) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(create.name || '')}</strong></td>
                            <td>${this.escapeHtml(create.label || '')}</td>
                            <td>${this.escapeHtml(create.target || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for assignments
     */
    generateAssignmentsTable(assignments) {
        if (assignments.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const assignment of assignments) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(assignment.name || '')}</strong></td>
                            <td>${this.escapeHtml(assignment.label || '')}</td>
                            <td>${this.escapeHtml(assignment.target || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for actions
     */
    generateActionsTable(actions) {
        if (actions.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const action of actions) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(action.name || '')}</strong></td>
                            <td>${this.escapeHtml(action.label || '')}</td>
                            <td>${this.escapeHtml(action.type || '')}</td>
                            <td>${this.escapeHtml(action.actionName || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for formulas
     */
    generateFormulasTable(formulas) {
        if (formulas.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const formula of formulas) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(formula.name || '')}</strong></td>
                            <td><code>${this.escapeHtml(formula.expression || '')}</code></td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for variables
     */
    generateVariablesTable(variables) {
        if (variables.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const variable of variables) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(variable.name || '')}</strong></td>
                            <td>${this.escapeHtml(variable.type || '')}</td>
                            <td>${variable.isInput ? 'Yes' : 'No'}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate flows list HTML with pagination
     */
    generateFlowsList(currentPage = 1, itemsPerPage = 50) {
        const flows = Object.entries(this.data.flows || {})
            .sort(([a], [b]) => a.localeCompare(b));
        
        if (flows.length === 0) {
            return '<p>No flows found.</p>';
        }
        
        // Calculate pagination info
        const totalPages = Math.ceil(flows.length / itemsPerPage);
        
        let html = '';
        
        // Pagination info (will be updated by JS)
        html += `<div class="pagination-info">Showing 1-${Math.min(itemsPerPage, flows.length)} of ${flows.length} Flows</div>\n`;
        
        // Table format with ALL items (client-side JS will paginate)
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="flowsTable">\n';
        html += '<thead><tr><th>Label</th><th>API Name</th><th>Type</th><th>Status</th></tr></thead>\n';
        html += '<tbody>\n';

        for (const [flowName, flowData] of flows) {
            const statusClass = flowData.status === 'Active' ? 'badge-success' : (flowData.status === 'Obsolete' ? 'badge-danger' : 'badge-secondary');
            html += `            <tr>
                <td><a href="flow-${this.sanitizeNodeName(flowName)}.html"><strong>${this.escapeHtml(flowData.label || flowName)}</strong></a></td>
                <td><code style="font-size:0.8rem">${this.escapeHtml(flowName)}</code></td>
                <td><span class="badge badge-info">${this.escapeHtml(flowData.processType || 'Flow')}</span></td>
                <td><span class="badge ${statusClass}">${this.escapeHtml(flowData.status || 'Unknown')}</span></td>
            </tr>\n`;
        }
        
        html += '        </tbody></table></div>\n';
        
        // Pagination controls - always generate if more than one page
        if (totalPages > 1) {
            html += this.generatePagination(1, totalPages, 'index.html');
        }
        
        return html;
    }
}
