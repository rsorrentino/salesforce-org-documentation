/**
 * Objects Generator
 *
 * Generates documentation pages for Data Model:
 * - Data model overview page
 * - Object listing
 * - Individual object pages
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';

export class ObjectsGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'objects';
    }

    /**
     * Generate all object pages
     */
    async generate() {
        console.log('  Generating object pages...');

        await this.generateOverviewPage();
        await this.generateIndividualPages();

        console.log('    Generated object documentation successfully.');
    }

    /**
     * Generate individual object detail pages
     */
    async generateIndividualPages() {
        const objects = Object.keys(this.data.objects || {});
        for (const objName of objects) {
            await this.generateObjectPage(objName);
        }
    }

    /**
     * Generate a single object detail page
     */
    async generateObjectPage(objName) {
        const objData = this.data.objects[objName];
        if (!objData) return;

        const recordTypes = this.data.recordTypes[objName] || [];
        const fields = objData.fields || [];
        const relationships = objData.relationships || [];
        const validationRules = this.data.validationRules?.[objName] || [];

        const html = this.createObjectPageHTML({
            OBJECT_NAME: objName,
            OBJECT_LABEL: objData.label || objName,
            FIELDS_COUNT: fields.length,
            RECORD_TYPES_COUNT: recordTypes.length,
            RELATIONSHIPS_COUNT: relationships.length,
            VALIDATION_RULES_COUNT: validationRules.length,
            RECORD_TYPES: this.formatRecordTypes(recordTypes),
            FIELDS: this.formatFields(fields),
            RELATIONSHIPS: this.formatRelationships(relationships),
            VALIDATION_RULES: this.formatValidationRules(validationRules),
            WHERE_IT_IS_USED: this.generateWhereItIsUsed(objName),
            RELATIONSHIP_MAP: this.generateRelationshipMap(objName, 'object'),
            OBJECT_MINI_MAP: this.generateObjectMiniMap(objName)
        });

        const fileName = `object-${objName.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_')}.html`;
        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Data Model Navigation</h3>
                <ul>
                    <li><a href="index.html">Overview</a></li>
                </ul>
            </div>
        `;
        await this.writePage(this.type, fileName, html, {
            standardizeLayout: true,
            currentPage: 'objects',
            currentSubPage: 'object',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }

    /**
     * Create HTML for individual object page
     */
    createObjectPageHTML(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Object: ${this.escapeHtml(data.OBJECT_NAME)} - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="index.html">Data Model</a> / ${this.escapeHtml(data.OBJECT_NAME)}
            </nav>
        </header>

        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Data Model Navigation</h3>
                    <ul>
                        <li><a href="index.html">Overview</a></li>
                    </ul>
                </div>
                <div class="nav-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><a href="../../index.html">Home</a></li>
                        <li><a href="../../pages/profiles/navigation-map.html">Profile Navigation</a></li>
                        <li><a href="../../pages/profiles/index.html">Security & Access</a></li>
                        <li><a href="../../pages/objects/index.html" class="active">Data Model</a></li>
                        <li><a href="../../pages/ui/index.html">UI Layer</a></li>
                        <li><a href="../../pages/apex/index.html">Apex Layer</a></li>
                        <li><a href="../../pages/automation/index.html">Automation</a></li>
                        <li><a href="../../pages/integrations/index.html">Integrations</a></li>
                        <li><a href="../../pages/architecture/index.html">Architecture</a></li>
                        <li><a href="../../pages/deployment/index.html">Deployment</a></li>
                        <li><a href="../../pages/maintenance/index.html">Maintenance & Support</a></li>
                        <li><a href="../../pages/cross-reference/index.html">Cross-Reference</a></li>
                    </ul>
                </div>
            </nav>

            <main class="main-content">
                <h2>Object: ${this.escapeHtml(data.OBJECT_NAME)}</h2>
                <section>
                    <h3>Overview</h3>
                    <div class="info-box">
                        <p><strong>API Name:</strong> ${this.escapeHtml(data.OBJECT_NAME)}</p>
                        <p><strong>Label:</strong> ${this.escapeHtml(data.OBJECT_LABEL)}</p>
                        <p><strong>Fields:</strong> ${data.FIELDS_COUNT}</p>
                        <p><strong>Record Types:</strong> ${data.RECORD_TYPES_COUNT}</p>
                        <p><strong>Relationships:</strong> ${data.RELATIONSHIPS_COUNT}</p>
                        <p><strong>Validation Rules:</strong> ${data.VALIDATION_RULES_COUNT}</p>
                    </div>
                </section>
                ${data.RECORD_TYPES}
                ${data.FIELDS}
                ${data.RELATIONSHIPS}
                ${data.VALIDATION_RULES}
                <section>
                    <h3>Where it is Used</h3>
                    <div class="info-box">
                        ${data.WHERE_IT_IS_USED}
                    </div>
                </section>
                ${data.RELATIONSHIP_MAP}
                ${data.OBJECT_MINI_MAP}
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

    formatRecordTypes(recordTypes) {
        if (recordTypes.length === 0) {
            return '<section><h3>Record Types</h3><p><em>No record types defined for this object.</em></p></section>';
        }

        let html = '<section><h3>Record Types</h3><div class="table-container"><table class="data-table"><thead><tr><th>Name</th><th>Label</th><th>Active</th><th>Description</th></tr></thead><tbody>';

        for (const rt of recordTypes) {
            html += `<tr>
                <td>${this.escapeHtml(rt.name || '')}</td>
                <td>${this.escapeHtml(rt.label || '')}</td>
                <td>${rt.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>'}</td>
                <td>${this.escapeHtml(rt.description || '')}</td>
            </tr>`;
        }

        html += '</tbody></table></div></section>';
        return html;
    }

    formatFields(fields) {
        if (fields.length === 0) {
            return '<section><h3>Fields</h3><p><em>No fields defined for this object.</em></p></section>';
        }

        let html = '<section><h3>Fields</h3><div class="table-container"><table class="data-table"><thead><tr><th>Field Name</th><th>Type</th><th>Label</th><th>Required</th><th>Description</th></tr></thead><tbody>';

        for (const field of fields) {
            html += `<tr>
                <td><strong>${this.escapeHtml(field.name || '')}</strong></td>
                <td>${this.escapeHtml(field.type || '')}</td>
                <td>${this.escapeHtml(field.label || '')}</td>
                <td>${field.required ? '<span class="badge badge-warning">Required</span>' : ''}</td>
                <td>${this.escapeHtml(field.description || '')}</td>
            </tr>`;
        }

        html += '</tbody></table></div></section>';
        return html;
    }

    formatRelationships(relationships) {
        if (relationships.length === 0) {
            return '<section><h3>Relationships</h3><p><em>No relationships defined for this object.</em></p></section>';
        }

        let html = '<section><h3>Relationships</h3><div class="table-container"><table class="data-table"><thead><tr><th>Field</th><th>Related Object</th><th>Type</th><th>Cardinality</th></tr></thead><tbody>';

        for (const rel of relationships) {
            const rObj = rel.relatedObject || '';
            const relCell = rObj && this._objExists(rObj)
                ? `<a href="object-${this._objSafe(rObj)}.html">${this.escapeHtml(rObj)}</a>`
                : this.escapeHtml(rObj);
            html += `<tr>
                <td><strong>${this.escapeHtml(rel.field || '')}</strong></td>
                <td>${relCell}</td>
                <td>${this.escapeHtml(rel.type || '')}</td>
                <td>${rel.type === 'MasterDetail' ? '1:N' : 'N:1'}</td>
            </tr>`;
        }

        html += '</tbody></table></div></section>';
        return html;
    }

    formatValidationRules(validationRules) {
        if (validationRules.length === 0) {
            return '<section><h3>Validation Rules</h3><p><em>No validation rules defined for this object.</em></p></section>';
        }

        let html = '<section><h3>Validation Rules</h3>';

        for (const rule of validationRules) {
            html += `<div class="info-box">
                <h4>${this.escapeHtml(rule.name || '')}</h4>
                <p><strong>Error Message:</strong> ${this.escapeHtml(rule.errorMessage || '')}</p>
                <p><strong>Active:</strong> ${rule.active ? 'Yes' : 'No'}</p>
                ${rule.description ? `<p><strong>Description:</strong> ${this.escapeHtml(rule.description)}</p>` : ''}
            </div>`;
        }

        html += '</section>';
        return html;
    }

    generateWhereItIsUsed(objName) {
        return this.generateObjectWhereUsed(objName);
    }

    /**
     * Generate data model overview page with pagination
     */
    async generateOverviewPage() {
        const validationRulesCount = Object.values(this.data.validationRules || {})
            .reduce((sum, rules) => sum + (rules?.length || 0), 0);

        const objects = Object.keys(this.data.objects || {});
        const umlDiagram = this.generateUMLDiagram();

        const recordTypesCount = Object.values(this.data.recordTypes || {})
            .reduce((sum, rts) => sum + (rts?.length || 0), 0);

        const itemsPerPage = 50;

        const data = {
            OBJECTS_COUNT: objects.length,
            VALIDATION_RULES_COUNT: validationRulesCount,
            RECORD_TYPES_COUNT: recordTypesCount,
            UML_DIAGRAM: umlDiagram,
            OBJECTS_LIST: this.generateObjectsList(objects, 1, itemsPerPage),
            OBJECTS_DETAILED: '',
            GLOBAL_VALUE_SETS_COUNT: Object.keys(this.data.globalValueSets || {}).length,
            GLOBAL_VALUE_SETS_LIST: this.generateGlobalValueSetsList(),
        };

        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Data Model Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'objects',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            console.warn('    Template not found, creating basic overview page');
            const basicHtml = this.createBasicOverview(data);
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'objects',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }

    /**
     * Generate UML diagram for data model
     * Limited to prevent Mermaid "Maximum text size" error
     */
    generateUMLDiagram() {
        const keyObjects = ['Account', 'Contact', 'Order', 'OrderItem', 'Case', 'Opportunity',
            'ServiceAppointment', 'Asset'];
        const allObjects = Object.keys(this.data.objects || {});
        const limitedObjects = allObjects.slice(0, 15);

        if (limitedObjects.length === 0 && keyObjects.length === 0) {
            return 'erDiagram\n    Note_NoObjects "No objects found"\n';
        }

        let uml = 'erDiagram\n';

        for (const objName of keyObjects) {
            const safeObjName = objName.replace(/[^a-zA-Z0-9_]/g, '_');
            if (!safeObjName) continue;
            uml += `    ${safeObjName} {\n`;
            uml += '        string Id\n';
            uml += '        string Name\n';
            uml += '    }\n';
        }

        for (const objName of limitedObjects) {
            const objData = this.data.objects[objName];
            if (!objData) continue;

            let cleanName = this.sanitizeNodeName(objName.replace(/__c/g, '').replace(/_/g, ''));
            if (/^[0-9]/.test(cleanName)) {
                cleanName = 'Obj' + cleanName;
            }
            cleanName = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');
            if (!cleanName) continue;

            uml += `    ${cleanName} {\n`;

            const fields = (objData.fields || []).slice(0, 5);
            for (const field of fields) {
                let fieldType = (field.type || 'String').substring(0, 15);
                fieldType = fieldType.replace(/[^a-zA-Z0-9]/g, '');
                if (!fieldType) fieldType = 'String';

                let fieldName = (field.name || '').substring(0, 30);
                fieldName = fieldName.replace(/[^a-zA-Z0-9_]/g, '_');
                if (!fieldName) fieldName = 'Field';

                uml += `        ${fieldType} ${fieldName}\n`;
            }
            uml += '    }\n';
        }

        let relationshipCount = 0;
        const maxRelationships = 20;
        const cleanNameMap = new Map();

        for (const objName of limitedObjects) {
            const objData = this.data.objects[objName];
            if (!objData) continue;

            let cleanName = this.sanitizeNodeName(objName.replace(/__c/g, '').replace(/_/g, ''));
            if (/^[0-9]/.test(cleanName)) {
                cleanName = 'Obj' + cleanName;
            }
            cleanName = cleanName.replace(/[^a-zA-Z0-9_]/g, '_');
            if (cleanName) {
                cleanNameMap.set(objName, cleanName);
            }
        }

        for (const objName of limitedObjects) {
            if (relationshipCount >= maxRelationships) break;
            const objData = this.data.objects[objName];
            if (!objData) continue;

            const cleanName = cleanNameMap.get(objName);
            if (!cleanName) continue;

            const relationships = (objData.relationships || []).slice(0, 2);
            for (const rel of relationships) {
                if (relationshipCount >= maxRelationships) break;
                const relatedObj = rel.relatedObject;
                if (!relatedObj) continue;

                const isKeyObject = keyObjects.includes(relatedObj);
                const isInLimited = limitedObjects.includes(relatedObj);

                if (isKeyObject || isInLimited) {
                    let relatedClean;
                    if (isKeyObject) {
                        relatedClean = relatedObj.replace(/[^a-zA-Z0-9_]/g, '_');
                    } else {
                        relatedClean = cleanNameMap.get(relatedObj);
                    }

                    if (!relatedClean) continue;

                    const relSyntax = rel.type === 'MasterDetail' ? '||--o{' : '}o--o{';

                    let relLabel = (rel.field || rel.name || 'rel').substring(0, 12);
                    relLabel = relLabel.replace(/[^a-zA-Z0-9_ ]/g, '_');
                    if (!relLabel) relLabel = 'rel';
                    relLabel = relLabel.replace(/"/g, "'");

                    uml += `    ${cleanName} ${relSyntax} ${relatedClean} : "${relLabel}"\n`;
                    relationshipCount++;
                }
            }
        }

        return uml;
    }

    /**
     * Generate objects list HTML with pagination
     */
    generateObjectsList(objects, currentPage = 1, itemsPerPage = 50) {
        if (objects.length === 0) return '<p>No custom objects found.</p>';

        const sorted = objects.sort();
        const pagination = this.paginateItems(sorted, itemsPerPage, currentPage);

        let html = '';
        html += `<div class="pagination-info" id="objectsPaginationInfo">Showing ${pagination.startIndex}-${pagination.endIndex} of ${pagination.totalItems} Objects</div>\n`;
        html += '<div class="table-container"><table class="data-table" id="objectsTable">\n';
        html += '            <thead><tr><th>Object Name</th><th>Label</th><th>Fields</th><th>Record Types</th><th>Relationships</th></tr></thead>\n';
        html += '            <tbody>\n';

        for (const objName of sorted) {
            const objData = this.data.objects[objName];
            const fieldsCount = objData?.fields?.length || 0;
            const recordTypes = this.data.recordTypes[objName] || [];
            const relationshipsCount = objData?.relationships?.length || 0;
            const objectLabel = objData?.label || objName;
            const objectLink = `object-${objName.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_')}.html`;
            html += `                <tr>
                    <td><a href="${objectLink}" class="object-link"><strong>${this.escapeHtml(objName)}</strong></a></td>
                    <td>${this.escapeHtml(objectLabel)}</td>
                    <td>${fieldsCount}</td>
                    <td>${recordTypes.length}</td>
                    <td>${relationshipsCount}</td>
                </tr>\n`;
        }

        html += '            </tbody>\n';
        html += '        </table></div>\n';

        if (pagination.totalPages > 1) {
            html += this.generatePagination(currentPage, pagination.totalPages, 'index.html#objectsTable');
        } else if (pagination.totalItems > itemsPerPage) {
            const calculatedPages = Math.ceil(pagination.totalItems / itemsPerPage);
            if (calculatedPages > 1) {
                html += this.generatePagination(1, calculatedPages, 'index.html#objectsTable');
            }
        }

        return html;
    }

    /**
     * Generate detailed objects information with record types
     */
    generateObjectsDetailed(objects) {
        if (objects.length === 0) return '<p>No custom objects found.</p>';

        let html = '';
        const sortedObjects = objects.sort();

        for (const objName of sortedObjects) {
            const objData = this.data.objects[objName];
            if (!objData) continue;

            const recordTypes = this.data.recordTypes[objName] || [];
            const fields = objData.fields || [];
            const relationships = objData.relationships || [];

            const objectPageName = `object-${objName.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_')}.html`;
            html += `        <section class="object-detail">
            <h4><a href="${objectPageName}" class="object-link">${this.escapeHtml(objName)}</a></h4>
            <div class="info-box">
                <p><strong>Label:</strong> ${this.escapeHtml(objData.label || objName)}</p>
                <p><strong>Fields:</strong> ${fields.length}</p>
                <p><strong>Record Types:</strong> ${recordTypes.length}</p>
                <p><strong>Relationships:</strong> ${relationships.length}</p>
            </div>`;

            if (recordTypes.length > 0) {
                html += `            <h5>Record Types</h5>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Label</th>
                            <th>Active</th>
                            <th>Description</th>
                            <th>Picklist Values</th>
                        </tr>
                    </thead>
                    <tbody>`;

                for (const rt of recordTypes) {
                    const picklistInfo = rt.picklistValues && rt.picklistValues.length > 0
                        ? `${rt.picklistValues.length} picklist(s)`
                        : 'None';
                    html += `                        <tr>
                            <td>${this.escapeHtml(rt.name || '')}</td>
                            <td>${this.escapeHtml(rt.label || '')}</td>
                            <td>${rt.active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-secondary">Inactive</span>'}</td>
                            <td>${this.escapeHtml(rt.description || '')}</td>
                            <td>${picklistInfo}</td>
                        </tr>`;
                }

                html += `                    </tbody>
                </table>
            </div>`;
            } else {
                html += '            <p><em>No record types defined for this object.</em></p>';
            }

            if (fields.length > 0) {
                html += `            <h5>Fields</h5>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Field Name</th>
                            <th>Type</th>
                            <th>Label</th>
                            <th>Required</th>
                        </tr>
                    </thead>
                    <tbody>`;

                for (const field of fields.slice(0, 50)) {
                    html += `                        <tr>
                            <td>${this.escapeHtml(field.name || '')}</td>
                            <td>${this.escapeHtml(field.type || '')}</td>
                            <td>${this.escapeHtml(field.label || '')}</td>
                            <td>${field.required ? '<span class="badge badge-warning">Required</span>' : ''}</td>
                        </tr>`;
                }

                if (fields.length > 50) {
                    html += `                        <tr><td colspan="4"><em>... and ${fields.length - 50} more fields</em></td></tr>`;
                }

                html += `                    </tbody>
                </table>
            </div>`;
            }

            if (relationships.length > 0) {
                html += '            <h5>Relationships</h5><ul>';
                for (const rel of relationships.slice(0, 20)) {
                    html += `                <li><strong>${this.escapeHtml(rel.field || '')}</strong> -> ${this.escapeHtml(rel.relatedObject || '')} (${this.escapeHtml(rel.type || '')})</li>`;
                }
                if (relationships.length > 20) {
                    html += `                <li><em>... and ${relationships.length - 20} more relationships</em></li>`;
                }
                html += '            </ul>';
            }

            html += '        </section>\n';
        }

        return html;
    }

    /**
     * Generate per-object mini functional map (Mermaid flowchart).
     *
     * Shows the object's immediate neighbourhood:
     *   Triggers → [Object] ← Flows
     *              [Object] → Apex Classes → LWC Components
     *              [Object] → Related Objects (lookups / master-detail)
     *
     * Capped at reasonable node limits to avoid Mermaid overflow.
     */
    generateObjectMiniMap(objName) {
        const rel = this.data.relationships || {};
        const objData = this.data.objects?.[objName];

        const safeId = (n) => 'N_' + String(n).replace(/[^a-zA-Z0-9]/g, '_');
        const objNode = safeId(objName);

        const nodes   = [];   // Mermaid node definitions
        const edges   = [];   // Mermaid edge definitions
        const styles  = [];   // Mermaid style lines
        const clicks  = [];   // Mermaid click callbacks

        // Central object node
        nodes.push(`    ${objNode}["&#128204; ${this.escapeHtml(objName)}"]`);
        styles.push(`    style ${objNode} fill:#E31E24,color:#fff,stroke:#B8151A`);

        // ── Triggers ────────────────────────────────────────────────────────
        const triggers = (rel.objectToTriggers?.[objName] || []).slice(0, 5);
        for (const t of triggers) {
            const tNode = safeId('trg_' + t);
            nodes.push(`    ${tNode}["&#9881; ${this.escapeHtml(t)}"]`);
            edges.push(`    ${tNode} -->|triggers| ${objNode}`);
            styles.push(`    style ${tNode} fill:#6c757d,color:#fff,stroke:#5a6268`);
            clicks.push(`    click ${tNode} "../automation/index.html" "View Trigger"`);
        }

        // ── Flows ────────────────────────────────────────────────────────────
        const flows = (rel.objectToFlows?.[objName] || []).slice(0, 6);
        for (const f of flows) {
            const fNode = safeId('flow_' + f);
            nodes.push(`    ${fNode}["&#9889; ${this.escapeHtml(f)}"]`);
            edges.push(`    ${fNode} -->|uses| ${objNode}`);
            styles.push(`    style ${fNode} fill:#17a2b8,color:#fff,stroke:#138496`);
            clicks.push(`    click ${fNode} "../flows/flow-${this.sanitizeNodeName(f)}.html" "View Flow"`);
        }

        // ── Apex Classes ─────────────────────────────────────────────────────
        const apexClasses = (rel.objectToApex?.[objName] || []).slice(0, 6);
        for (const cls of apexClasses) {
            const cNode = safeId('apex_' + cls);
            nodes.push(`    ${cNode}["&#128296; ${this.escapeHtml(cls)}"]`);
            edges.push(`    ${objNode} -.->|Apex| ${cNode}`);
            styles.push(`    style ${cNode} fill:#6f42c1,color:#fff,stroke:#5a32a3`);
            const safeCls = cls.replace(/[^a-zA-Z0-9]/g, '_');
            clicks.push(`    click ${cNode} "../apex/class-${safeCls}.html" "View Apex Class"`);

            // Apex → LWC (one level deeper, capped at 3 per class)
            const lwcs = (rel.classToLWC?.[cls] || []).slice(0, 3);
            for (const lwc of lwcs) {
                const lNode = safeId('lwc_' + lwc);
                nodes.push(`    ${lNode}["&#127760; ${this.escapeHtml(lwc)}"]`);
                edges.push(`    ${cNode} -->|wire| ${lNode}`);
                styles.push(`    style ${lNode} fill:#fd7e14,color:#fff,stroke:#e96b02`);
                const safeLwc = lwc.replace(/[^a-zA-Z0-9]/g, '_');
                clicks.push(`    click ${lNode} "../ui/lwc-${safeLwc}.html" "View LWC"`);
            }
        }

        // ── Related Objects (lookup / master-detail) ──────────────────────
        const relatedObjs = (objData?.relationships || []).slice(0, 5);
        for (const r of relatedObjs) {
            const rObj = r.relatedObject;
            if (!rObj) continue;
            const rNode = safeId('rel_' + rObj);
            nodes.push(`    ${rNode}["&#128204; ${this.escapeHtml(rObj)}"]`);
            const arrow = r.type === 'MasterDetail' ? '==>' : '-->';
            edges.push(`    ${objNode} ${arrow}|${this.escapeHtml(r.type || 'Lookup')}| ${rNode}`);
            styles.push(`    style ${rNode} fill:#20c997,color:#fff,stroke:#199d76`);
            // Only add click link if the related object has a generated page
            if (this._objExists(rObj)) {
                clicks.push(`    click ${rNode} "object-${this._objSafe(rObj)}.html" "View Object"`);
            }
        }

        // Nothing to show?
        const hasContent = triggers.length + flows.length + apexClasses.length + relatedObjs.length > 0;
        if (!hasContent) {
            return `<section>
                <h3>Object Mini-Map</h3>
                <p><em>No direct connections found for this object.</em></p>
            </section>`;
        }

        // Deduplicate node / edge lines (same node might be added twice)
        const uniqueNodes  = [...new Set(nodes)];
        const uniqueEdges  = [...new Set(edges)];
        const uniqueStyles = [...new Set(styles)];
        const uniqueClicks = [...new Set(clicks)];

        const diagram = [
            'flowchart LR',
            ...uniqueNodes,
            ...uniqueEdges,
            ...uniqueStyles,
            ...uniqueClicks
        ].join('\n');

        return `<section>
            <h3>Object Mini-Map</h3>
            <p><small>Direct connections: triggers, flows, Apex classes, related objects. Click a node to navigate.</small></p>
            <div class="mermaid" style="overflow-x:auto">
${diagram}
            </div>
        </section>`;
    }

    /**
     * Generate Global Value Sets list HTML
     */
    generateGlobalValueSetsList() {
        const gvs = this.data.globalValueSets || {};
        const names = Object.keys(gvs).sort();
        if (names.length === 0) return '<p>No global value sets found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Global Value Sets</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="globalValueSetsTable">\n';
        html += '<thead><tr><th>Name</th><th>Value Count</th><th>Values (Preview)</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const name of names) {
            const d = gvs[name] || {};
            const values = d.values || [];
            const preview = values.slice(0, 5).map(v => this.escapeHtml(v.label || v.fullName || '')).join(', ');
            const suffix = values.length > 5 ? `, ...+${values.length - 5} more` : '';
            html += `<tr>
                <td><strong>${this.escapeHtml(name)}</strong></td>
                <td>${values.length}</td>
                <td>${preview}${suffix}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#globalValueSetsTable');
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
    <title>Data Model - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Data Model</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${data.OBJECTS_COUNT}</h3>
                    <p>Objects</p>
                </div>
                <div class="stat-card">
                    <h3>${data.RECORD_TYPES_COUNT || 0}</h3>
                    <p>Record Types</p>
                </div>
                <div class="stat-card">
                    <h3>${data.VALIDATION_RULES_COUNT}</h3>
                    <p>Validation Rules</p>
                </div>
            </div>
            <section>
                <h3>Data Model Diagram</h3>
                <div class="uml-container">
                    <div class="mermaid">
${data.UML_DIAGRAM}
                    </div>
                </div>
            </section>
            <section>
                <h3>Objects Overview</h3>
                ${data.OBJECTS_LIST}
            </section>
        </main>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;
    }
}
