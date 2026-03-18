/**
 * Permission Drilldown Generator
 *
 * For every Profile and Permission Set generates a dedicated drilldown page:
 *   pages/profiles/perm-drilldown-<safeName>.html
 *
 * Each page shows:
 *  1. Object-level permissions matrix  (read/create/edit/delete/view-all/modify-all)
 *  2. Field-level security per object  (readable / editable)
 *
 * A summary index is also written to:
 *   pages/profiles/permission-drilldown.html
 */

import { BaseGenerator } from './BaseGenerator.js';

export class PermissionDrilldownGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'profiles';
    }

    async generate() {
        console.log('  Generating permission drilldown pages...');

        const profileNames   = Object.keys(this.data.profiles || {});
        const psNames        = Object.keys(this.data.permissionSets || {});

        let indexRows = '';

        for (const name of profileNames) {
            const item = this.data.profiles[name];
            const safeName = this._safe(name);
            const fileName = `perm-drilldown-${safeName}.html`;
            await this._writeDrilldown(name, 'Profile', item, fileName);
            indexRows += this._indexRow(name, 'Profile', fileName, item);
        }

        for (const name of psNames) {
            const item = this.data.permissionSets[name];
            const safeName = this._safe(name);
            const fileName = `perm-drilldown-ps-${safeName}.html`;
            await this._writeDrilldown(name, 'Permission Set', item, fileName);
            indexRows += this._indexRow(name, 'Permission Set', fileName, item);
        }

        await this._writeIndex(indexRows, profileNames.length, psNames.length);

        console.log(`    Permission drilldown: ${profileNames.length} profiles, ${psNames.length} permission sets.`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Per-item drilldown page
    // ─────────────────────────────────────────────────────────────────────────

    async _writeDrilldown(name, type, item, fileName) {
        if (!item) return;

        const objectPerms   = this._buildObjectPermsTable(item);
        const flsSection    = this._buildFLSSection(item);
        const classAccess   = this._buildClassAccessTable(item);
        const pageAccess    = this._buildPageAccessTable(item);

        const objectPermCount = Object.keys(item.objectPermissions || {}).length;
        const fieldPermCount  = Object.values(item.fieldPermissions || {})
            .reduce((s, arr) => s + (arr?.length || 0), 0);

        const flexiPageSection = this._buildFlexiPageSection(item);
        const flowSection      = this._buildFlowAccessSection(item);

        const fpCount   = this._accessibleFlexiPageNames(item).length;
        const flowCount = this._accessibleFlowNames(item).length;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${type}: ${this.escapeHtml(name)} - Permission Drilldown</title>
    <link rel="stylesheet" href="../../css/styles.css">
    <style>
        .perm-matrix th, .perm-matrix td { text-align: center; min-width: 48px; }
        .perm-matrix td:first-child { text-align: left; font-weight: 600; }
        .tick  { color: #28a745; font-weight: 700; }
        .cross { color: #ccc; }
        .fls-object-name { font-weight: 600; margin: 1rem 0 0.25rem; font-size: 0.95rem; }
    </style>
</head>
<body>
<div class="container">
    <header>
        <div class="header-left">
            <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </div>
        <nav class="breadcrumb">
            <a href="../../index.html">Home</a> /
            <a href="index.html">Security &amp; Access</a> /
            <a href="permission-drilldown.html">Permission Drilldown</a> /
            ${this.escapeHtml(name)}
        </nav>
    </header>

    <div class="content-wrapper">
        <nav class="sidebar">
        </nav>

        <main class="main-content">
            <h2>${this.escapeHtml(type)}: ${this.escapeHtml(name)}</h2>

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>${objectPermCount}</h3>
                    <p>Object Permissions</p>
                </div>
                <div class="stat-card">
                    <h3>${fieldPermCount}</h3>
                    <p>Field Permissions</p>
                </div>
                <div class="stat-card">
                    <h3>${fpCount}</h3>
                    <p>FlexiPages</p>
                </div>
                <div class="stat-card">
                    <h3>${flowCount}</h3>
                    <p>Accessible Flows</p>
                </div>
            </div>

            <section>
                <h3>Object-Level Permissions</h3>
                ${objectPerms}
            </section>

            <section>
                <h3>Field-Level Security</h3>
                ${flsSection}
            </section>

            <section>
                <h3>Apex Class Access</h3>
                ${classAccess}
            </section>

            <section>
                <h3>Visualforce / Page Access</h3>
                ${pageAccess}
            </section>

            <section>
                <h3>FlexiPage &amp; UI Component Visibility</h3>
                <p class="muted">FlexiPages that reference objects this ${type.toLowerCase()} can access, plus their embedded LWC/Aura components.</p>
                ${flexiPageSection}
            </section>

            <section>
                <h3>Flow Accessibility</h3>
                <p class="muted">Flows that operate on objects this ${type.toLowerCase()} can access (read or edit).</p>
                ${flowSection}
            </section>
        </main>
    </div>
    <footer><p>Salesforce Technical Documentation</p></footer>
</div>
<script src="../../js/app.js"></script>
</body>
</html>`;

        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Security &amp; Access</h3>
                <ul>
                    <li><a href="index.html">Overview</a></li>
                    <li><a href="navigation-map.html">Profile Navigation</a></li>
                    <li><a href="permissions-matrix.html">Permissions Matrix</a></li>
                    <li><a href="permission-drilldown.html">Permission Drilldown</a></li>
                </ul>
            </div>`;
        await this.writePage(this.type, fileName, html, {
            standardizeLayout: true,
            currentPage: 'profiles',
            currentSubPage: 'permission-drilldown',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Object permissions matrix
    // ─────────────────────────────────────────────────────────────────────────

    _buildObjectPermsTable(item) {
        // objectPermissions is stored as { "ObjectName": { allowRead, allowCreate, ... } }
        const permsObj = item.objectPermissions || {};
        const objNames = Object.keys(permsObj).sort();
        if (objNames.length === 0) {
            return '<p><em>No object permissions defined.</em></p>';
        }

        const yes = (v) => (v === true || v === 'true') ? '<span class="tick">&#10003;</span>' : '<span class="cross">&#8211;</span>';
        const rows = objNames.map(objName => {
            const p = permsObj[objName];
            return `<tr>
                <td>${this._objCell(objName)}</td>
                <td>${yes(p.allowRead    ?? p.readable)}</td>
                <td>${yes(p.allowCreate  ?? p.creatable)}</td>
                <td>${yes(p.allowEdit    ?? p.editable)}</td>
                <td>${yes(p.allowDelete  ?? p.deletable)}</td>
                <td>${yes(p.viewAllRecords ?? p.viewAll)}</td>
                <td>${yes(p.modifyAllRecords ?? p.modifyAll)}</td>
            </tr>`;
        }).join('\n');

        return `<div class="table-container">
            <table class="data-table perm-matrix">
                <thead>
                    <tr>
                        <th>Object</th>
                        <th title="Read">R</th>
                        <th title="Create">C</th>
                        <th title="Edit">E</th>
                        <th title="Delete">D</th>
                        <th title="View All">VA</th>
                        <th title="Modify All">MA</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Field-level security
    // ─────────────────────────────────────────────────────────────────────────

    _buildFLSSection(item) {
        const fieldPerms = item.fieldPermissions || {};

        // fieldPermissions can be:
        //   { "Object__c.Field__c": { readable, editable } }  (object keyed)
        // or an array: [ { field: "Object.Field", readable, editable } ]
        let byObject = {};

        if (Array.isArray(fieldPerms)) {
            for (const fp of fieldPerms) {
                const parts = (fp.field || fp.name || '').split('.');
                const obj = parts[0] || 'Unknown';
                const fld = parts.slice(1).join('.') || parts[0];
                if (!byObject[obj]) byObject[obj] = [];
                byObject[obj].push({ field: fld, readable: fp.readable, editable: fp.editable });
            }
        } else {
            for (const [key, val] of Object.entries(fieldPerms)) {
                // key = "ObjectName.FieldName" OR just object name mapping to array
                if (Array.isArray(val)) {
                    byObject[key] = val.map(v => ({
                        field: v.field || v.name || v,
                        readable: v.readable,
                        editable: v.editable
                    }));
                } else {
                    const parts = key.split('.');
                    const obj = parts[0];
                    const fld = parts.slice(1).join('.') || key;
                    if (!byObject[obj]) byObject[obj] = [];
                    byObject[obj].push({ field: fld, readable: val.readable, editable: val.editable });
                }
            }
        }

        const objNames = Object.keys(byObject).sort();
        if (objNames.length === 0) {
            return '<p><em>No field-level security defined.</em></p>';
        }

        return objNames.map(obj => {
            const fields = byObject[obj];
            const rows = fields.map(fp => {
                const yes = (v) => (v === true || v === 'true') ? '<span class="tick">&#10003;</span>' : '<span class="cross">&#8211;</span>';
                return `<tr>
                    <td>${this.escapeHtml(fp.field || '')}</td>
                    <td>${yes(fp.readable)}</td>
                    <td>${yes(fp.editable)}</td>
                </tr>`;
            }).join('');

            return `<div>
                <p class="fls-object-name">
                    ${this._objCell(obj)}
                    <small>(${fields.length} field${fields.length !== 1 ? 's' : ''})</small>
                </p>
                <div class="table-container">
                    <table class="data-table perm-matrix">
                        <thead><tr><th>Field</th><th title="Readable">R</th><th title="Editable">E</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
        }).join('\n');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Apex class access
    // ─────────────────────────────────────────────────────────────────────────

    _buildClassAccessTable(item) {
        // Analyzer stores class access as item.classes: [{ name, enabled }]
        const accesses = item.classes || item.classAccesses || item.apexClassAccesses || [];
        if (!accesses || accesses.length === 0) {
            return '<p><em>No Apex class access defined.</em></p>';
        }
        const list = Array.isArray(accesses) ? accesses : [accesses];
        const rows = list.map(ca => {
            const cls = ca.name || ca.apexClass || ca;
            const enabled = ca.enabled === true || ca.enabled === 'true';
            const safeCls = String(cls).replace(/[^a-zA-Z0-9]/g, '_');
            return `<tr>
                <td><a href="../apex/class-${safeCls}.html">${this.escapeHtml(String(cls))}</a></td>
                <td>${enabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-secondary">Disabled</span>'}</td>
            </tr>`;
        }).join('');

        return `<div class="table-container">
            <table class="data-table">
                <thead><tr><th>Apex Class</th><th>Access</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Page (VF / App) access
    // ─────────────────────────────────────────────────────────────────────────

    _buildPageAccessTable(item) {
        // Analyzer stores page access as item.pages: [{ name, enabled }]
        const accesses = item.pages || item.pageAccesses || item.visualforcePageAccesses || [];
        if (!accesses || accesses.length === 0) {
            return '<p><em>No page access defined.</em></p>';
        }
        const list = Array.isArray(accesses) ? accesses : [accesses];
        const rows = list.map(pa => {
            const pg = pa.name || pa.apexPage || pa;
            const enabled = pa.enabled === true || pa.enabled === 'true';
            return `<tr>
                <td>${this.escapeHtml(String(pg))}</td>
                <td>${enabled ? '<span class="badge badge-success">Enabled</span>' : '<span class="badge badge-secondary">Disabled</span>'}</td>
            </tr>`;
        }).join('');

        return `<div class="table-container">
            <table class="data-table">
                <thead><tr><th>Page</th><th>Access</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FlexiPage visibility (inferred from accessible objects)
    // ─────────────────────────────────────────────────────────────────────────

    _accessibleFlexiPageNames(item) {
        const accessibleObjects = new Set(Object.keys(item.objectPermissions || {}));
        const rel = this.data.relationships || {};
        const flexiPages = this.data.flexiPages || {};
        const result = [];

        for (const fp of Object.keys(flexiPages)) {
            const lwcs = (rel.flexiPageToLWC && rel.flexiPageToLWC[fp]) || [];
            const hasLinkedObject = lwcs.some(lwcName => {
                const lwcData = this.data.lwcComponents && this.data.lwcComponents[lwcName];
                if (!lwcData) return false;
                const methods = lwcData.apexMethods || [];
                return methods.some(m => {
                    const cls = m.split('.')[0];
                    const objs = (rel.apexToObjects && rel.apexToObjects[cls]) || [];
                    return objs.some(o => accessibleObjects.has(o));
                });
            });
            if (hasLinkedObject) result.push(fp);
        }

        // Also include FlexiPages directly linked to accessible objects via flows
        for (const fp of Object.keys(flexiPages)) {
            if (!result.includes(fp)) {
                const flows = (rel.flexiPageToFlows && rel.flexiPageToFlows[fp]) || [];
                const linked = flows.some(f => {
                    const objs = (rel.flowToObjects && rel.flowToObjects[f]) || [];
                    return objs.some(o => accessibleObjects.has(o));
                });
                if (linked) result.push(fp);
            }
        }

        return result;
    }

    _buildFlexiPageSection(item) {
        const fpNames = this._accessibleFlexiPageNames(item);
        if (fpNames.length === 0) {
            return '<p><em>No FlexiPages inferred from accessible objects. This may indicate no LWC-to-Apex-to-Object relationships were detected, or that access is controlled at the app level.</em></p>';
        }

        const rel = this.data.relationships || {};
        const rows = fpNames.map(fp => {
            const lwcs = (rel.flexiPageToLWC && rel.flexiPageToLWC[fp]) || [];
            const lwcLinks = lwcs.map(l => {
                const safe = l.replace(/[^a-zA-Z0-9]/g, '_');
                return `<a href="../ui/lwc-${safe}.html">${this.escapeHtml(l)}</a>`;
            }).join(', ') || '<em>none detected</em>';
            const safeFp = fp.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_');
            return `<tr>
                <td><a href="../ui/index.html#flexiPagesTable">${this.escapeHtml(fp)}</a></td>
                <td>${lwcLinks}</td>
            </tr>`;
        }).join('');

        return `<div class="table-container">
            <table class="data-table">
                <thead><tr><th>FlexiPage</th><th>Embedded LWC Components</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Flow accessibility (inferred from accessible objects)
    // ─────────────────────────────────────────────────────────────────────────

    _accessibleFlowNames(item) {
        const accessibleObjects = new Set(Object.keys(item.objectPermissions || {}).filter(o => {
            const p = item.objectPermissions[o];
            return p.allowRead === true || p.allowRead === 'true' || p.readable === true || p.readable === 'true';
        }));
        const rel = this.data.relationships || {};
        const flows = this.data.flows || {};
        const result = [];

        for (const flowName of Object.keys(flows)) {
            // Check objectToFlows reverse map
            const linked = Array.from(accessibleObjects).some(obj => {
                const flowsForObj = (rel.objectToFlows && rel.objectToFlows[obj]) || [];
                return flowsForObj.includes(flowName);
            });
            if (linked) result.push(flowName);
        }

        return result;
    }

    _buildFlowAccessSection(item) {
        const flowNames = this._accessibleFlowNames(item);
        if (flowNames.length === 0) {
            return '<p><em>No flows detected for the objects this profile can access. Flow access may also be controlled via Process Builder or scheduled triggers not tracked in metadata.</em></p>';
        }

        const flows = this.data.flows || {};
        const rows = flowNames.map(f => {
            const flow = flows[f] || {};
            const safeF = this.sanitizeNodeName(f);
            const flowType = flow.processType || flow.type || 'Unknown';
            const status = flow.status || 'Unknown';
            return `<tr>
                <td><a href="../flows/flow-${safeF}.html">${this.escapeHtml(f)}</a></td>
                <td>${this.escapeHtml(flowType)}</td>
                <td>${this.escapeHtml(status)}</td>
            </tr>`;
        }).join('');

        return `<div class="table-container">
            <table class="data-table">
                <thead><tr><th>Flow</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Summary index page
    // ─────────────────────────────────────────────────────────────────────────

    _indexRow(name, type, fileName, item) {
        const objCount = Object.keys(item?.objectPermissions || {}).length;
        const fieldCount = Array.isArray(item?.fieldPermissions)
            ? item.fieldPermissions.length
            : Object.values(item?.fieldPermissions || {}).reduce((s, v) => s + (Array.isArray(v) ? v.length : 1), 0);
        const typeBadge = type === 'Profile'
            ? '<span class="badge badge-info">Profile</span>'
            : '<span class="badge badge-secondary">Perm Set</span>';
        return `<tr>
            <td>${typeBadge}</td>
            <td><a href="${fileName}">${this.escapeHtml(name)}</a></td>
            <td>${objCount}</td>
            <td>${fieldCount}</td>
        </tr>`;
    }

    async _writeIndex(rows, profileCount, psCount) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permission Drilldown - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
<div class="container">
    <header>
        <div class="header-left">
            <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </div>
        <nav class="breadcrumb">
            <a href="../../index.html">Home</a> /
            <a href="index.html">Security &amp; Access</a> /
            Permission Drilldown
        </nav>
    </header>
    <div class="content-wrapper">
        <nav class="sidebar"></nav>
        <main class="main-content">
            <h2>Permission Report Drilldown</h2>
            <p>Per-profile and per-permission-set view of object CRUD access and field-level security.</p>

            <div class="stats-grid">
                <div class="stat-card"><h3>${profileCount}</h3><p>Profiles</p></div>
                <div class="stat-card"><h3>${psCount}</h3><p>Permission Sets</p></div>
            </div>

            <section>
                <h3>All Profiles &amp; Permission Sets</h3>
                <div class="table-container">
                    <table class="data-table" id="drilldownTable">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Name</th>
                                <th>Object Permissions</th>
                                <th>Field Permissions</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>
    <footer><p>Salesforce Technical Documentation</p></footer>
</div>
<script src="../../js/app.js"></script>
</body>
</html>`;

        const sectionNavHtml = `
            <div class="nav-section">
                <h3>Security &amp; Access</h3>
                <ul>
                    <li><a href="index.html">Overview</a></li>
                    <li><a href="navigation-map.html">Profile Navigation</a></li>
                    <li><a href="permissions-matrix.html">Permissions Matrix</a></li>
                    <li><a href="permission-drilldown.html" class="active">Permission Drilldown</a></li>
                </ul>
            </div>`;
        await this.writePage(this.type, 'permission-drilldown.html', html, {
            standardizeLayout: true,
            currentPage: 'profiles',
            currentSubPage: 'permission-drilldown',
            depthToRoot: 2,
            sectionNavHtml,
            activeTop: 'guides'
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    _safe(name) {
        return String(name).replace(/[^a-zA-Z0-9]/g, '_');
    }

    _objLink(objName) {
        return String(objName).replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_');
    }

    /** Returns an object name as a link if we have a generated page for it, otherwise plain text */
    _objCell(objName) {
        const knownObjects = this.data.objects || {};
        if (knownObjects[objName]) {
            return `<a href="../objects/object-${this._objLink(objName)}.html">${this.escapeHtml(objName)}</a>`;
        }
        return this.escapeHtml(objName);
    }
}
