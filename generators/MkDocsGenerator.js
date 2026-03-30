/**
 * MkDocs Generator
 *
 * Transforms the analyzed Salesforce metadata into a set of Markdown files
 * organised under docs/ and generates the mkdocs.yml configuration file so
 * the output can be served / built directly with MkDocs.
 *
 * Directory layout produced:
 *
 *   docs/
 *   ├── index.md                  ← dashboard overview
 *   ├── apex/
 *   │   ├── index.md              ← table of all Apex classes
 *   │   └── <ClassName>.md        ← individual class detail
 *   ├── objects/
 *   │   ├── index.md
 *   │   └── <ObjectName>.md
 *   ├── automation/
 *   │   └── index.md
 *   ├── profiles/
 *   │   └── index.md
 *   ├── ui/
 *   │   └── index.md
 *   ├── integrations/
 *   │   └── index.md
 *   ├── architecture/
 *   │   └── index.md
 *   ├── deployment/
 *   │   └── index.md
 *   ├── maintenance/
 *   │   └── index.md
 *   ├── custommetadata/
 *   │   └── index.md
 *   └── functional/               ← pandoc-imported pages (if configured)
 *       └── <section>/
 *           └── *.md
 *
 *   mkdocs.yml                    ← generated in tool root directory
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseGenerator } from './BaseGenerator.js';
import { FlowsGenerator } from './FlowsGenerator.js';
import { ObjectsGenerator } from './ObjectsGenerator.js';

export class MkDocsGenerator extends BaseGenerator {
    /**
     * @param {string}  repoRoot         – Salesforce metadata repository root
     * @param {Object}  data             – Shared analysis data produced by analyzer.js
     * @param {string}  toolDir          – Directory where this tool lives (generate.js location)
     * @param {Object}  config           – Merged configuration from config.js
     * @param {Array}   pandocNavEntries – Nav entries returned by PandocImporter (may be empty)
     */
    constructor(repoRoot, data, toolDir, config, pandocNavEntries = []) {
        super(repoRoot, data, toolDir);
        this.config = config;
        this.docsDir = path.join(toolDir, config.docsOutputDir || 'docs');
        this.pandocNavEntries = pandocNavEntries;
        this.type = 'mkdocs';
        // Reuse HTML generators to keep Mermaid and data-model diagram logic consistent.
        this.flowDiagramHelper = new FlowsGenerator(repoRoot, data, toolDir);
        this.objectDiagramHelper = new ObjectsGenerator(repoRoot, data, toolDir);
        // Consistent timestamp for all pages in this generation run
        this.generatedAt = new Date().toISOString();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public entry point
    // ─────────────────────────────────────────────────────────────────────────

    async generate() {
        console.log('  Generating MkDocs documentation...');

        await this._createDocsStructure();

        await this._generateIndexPage();
        await this._generateApexDocs();
        await this._generateObjectsDocs();
        await this._generateFlowDocs();
        await this._generateAutomationDocs();
        await this._generateProfilesDocs();
        await this._generateUIDocs();
        await this._generateIntegrationsDocs();
        await this._generateArchitectureDocs();
        await this._generateDeploymentDocs();
        await this._generateMaintenanceDocs();
        await this._generateCustomMetadataDocs();
        await this._generateCrossReferenceDocs();
        await this._generateSourceDocs();
        await this._generatePortalThemeAssets();

        // AI-agent integration artefacts (generated last so they can reflect all pages)
        await this._generateLlmsTxt();
        await this._generateAiManifest();

        await this._generateMkDocsConfig();

        console.log('    MkDocs documentation generated.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Directory creation
    // ─────────────────────────────────────────────────────────────────────────

    async _createDocsStructure() {
        const sections = [
            'apex', 'objects', 'automation', 'profiles',
            'ui', 'integrations', 'architecture', 'deployment',
            'maintenance', 'custommetadata', 'cross-reference', 'functional', 'source'
        ];
        await fs.mkdir(this.docsDir, { recursive: true });
        for (const s of sections) {
            await fs.mkdir(path.join(this.docsDir, s), { recursive: true });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Page generators – one per documentation section
    // ─────────────────────────────────────────────────────────────────────────

    /** Dashboard / home page */
    async _generateIndexPage() {
        const d = this.data;
        const counts = {
            objects:       Object.keys(d.objects        || {}).length,
            apexClasses:   Object.keys(d.apexClasses    || {}).length,
            flows:         Object.keys(d.flows          || {}).length,
            lwc:           Object.keys(d.lwcComponents  || {}).length,
            aura:          Object.keys(d.auraComponents || {}).length,
            profiles:      Object.keys(d.profiles       || {}).length,
            permSets:      Object.keys(d.permissionSets || {}).length,
            triggers:      Object.keys(d.triggers       || {}).length,
            flexiPages:    Object.keys(d.flexiPages     || {}).length
        };

        const rows = [
            ['Custom Objects',          counts.objects,     'objects/index.md'],
            ['Apex Classes',            counts.apexClasses, 'apex/index.md'],
            ['Flows',                   counts.flows,       'automation/index.md'],
            ['LWC Components',          counts.lwc,         'ui/index.md'],
            ['Aura Components',         counts.aura,        'ui/index.md'],
            ['Profiles',                counts.profiles,    'profiles/index.md'],
            ['Permission Sets',         counts.permSets,    'profiles/index.md'],
            ['Apex Triggers',           counts.triggers,    'automation/index.md'],
            ['Flexible Pages',          counts.flexiPages,  'ui/index.md'],
            ['Cross-Reference',         this._countRelationshipEntries(), 'cross-reference/index.md'],
        ];

        const tableRows = rows
            .map(([label, count, link]) =>
                `| [${label}](${link}) | **${count}** |`)
            .join('\n');

        const statCards = rows
                        .map(([label, count, link]) => `
<a class="portal-stat-card" href="${this._siteHref(link)}">
  <span class="portal-stat-value">${count}</span>
  <span class="portal-stat-label">${label}</span>
</a>`)
            .join('');

        const sectionCards = [
            {
                title: 'Developer',
                subtitle: 'Code, metadata, and implementation assets',
                links: [
                    ['Apex Classes', 'apex/index.md'],
                    ['Custom Objects & Data Model', 'objects/index.md'],
                    ['UI Components', 'ui/index.md'],
                    ['Automation & Flows', 'automation/index.md'],
                    ['Integrations', 'integrations/index.md'],
                    ['Custom Metadata', 'custommetadata/index.md'],
                ],
            },
            {
                title: 'Security',
                subtitle: 'Access model and permission governance',
                links: [
                    ['Profiles & Permission Sets', 'profiles/index.md'],
                ],
            },
            {
                title: 'Operations',
                subtitle: 'Architecture, delivery, and documentation health',
                links: [
                    ['Architecture', 'architecture/index.md'],
                    ['Deployment & Environments', 'deployment/index.md'],
                    ['Documentation Health', 'maintenance/index.md'],
                    ['Cross-Reference', 'cross-reference/index.md'],
                    ['Source Navigator', 'source/index.md'],
                ],
            },
        ].map(section => {
            const links = section.links
                .map(([label, link]) => `<li><a href="${link}">${label}</a></li>`)
                .join('');
            return `
<article class="portal-section-card">
  <h3>${section.title}</h3>
  <p>${section.subtitle}</p>
    <ul>${section.links.map(([label, link]) => `<li><a href="${this._siteHref(link)}">${label}</a></li>`).join('')}</ul>
</article>`;
        }).join('');

        const md = `---
title: Salesforce Org Documentation
description: Auto-generated technical documentation for the Salesforce organisation.
entity_type: overview
generated_at: "${this.generatedAt}"
tags:
  - salesforce
  - overview
---

# Salesforce Technical Documentation

<div class="portal-hero">
    <p class="portal-kicker">Salesforce Technical Documentation</p>
    <h1 class="portal-title">Organization Knowledge Hub</h1>
    <p class="portal-subtitle">Generated on <strong>${this.generatedAt}</strong></p>
</div>

<section class="portal-stats-grid">
${statCards}
</section>

## Organisation Summary

| Section | Count |
|---------|-------|
${tableRows}

## Sections

<section class="portal-sections-grid">
${sectionCards}
</section>

=== "Developer"
    - [Apex Classes](apex/index.md)
    - [Custom Objects & Data Model](objects/index.md)
    - [UI Components (LWC / Aura / FlexiPages)](ui/index.md)
    - [Automation & Flows](automation/index.md)
    - [Integrations](integrations/index.md)
    - [Custom Metadata](custommetadata/index.md)

=== "Security"
    - [Profiles & Permission Sets](profiles/index.md)

=== "Operations"
    - [Architecture](architecture/index.md)
    - [Deployment & Environments](deployment/index.md)
    - [Documentation Health](maintenance/index.md)
    - [Cross-Reference](cross-reference/index.md)
`;

        await this._writeMd('index.md', md);
    }

    /** Apex classes section */
    async _generateApexDocs() {
        const classes = Object.entries(this.data.apexClasses || {});
        const triggers = Object.entries(this.data.triggers || {});
        const rel = this.data.relationships || {};

        // Overview index
        const classRows = classes.map(([name, cls]) => {
            const sourceCell = cls.file ? `[📄 View Source](../source/file-${this._safeName(cls.file)}.md)` : '';
            const usage = [];
            if ((rel.classToLWC?.[name] || []).length > 0) usage.push(`[LWC](${this._linkUiIndexFromSection()})`);
            if ((rel.classToFlow?.[name] || []).length > 0) usage.push(`[Flows](${this._linkAutomationIndexFromSection()})`);
            if ((rel.classToTrigger?.[name] || []).length > 0) usage.push(`[Triggers](${this._linkAutomationIndexFromSection()})`);
            if ((rel.classToAura?.[name] || []).length > 0) usage.push(`[Aura](${this._linkUiIndexFromSection()})`);
            if ((rel.classToVisualforce?.[name] || []).length > 0) usage.push(`[Visualforce](${this._linkUiIndexFromSection()})`);
            const usedIn = usage.length ? usage.join(', ') : '—';

            const referencedObjects = this._uniqueSorted(cls.referencedObjects || []);
            const objectLinks = referencedObjects.length
                ? referencedObjects.slice(0, 4).map(o => this._linkObjectFromSection(o)).join(', ') + (referencedObjects.length > 4 ? ` (+${referencedObjects.length - 4})` : '')
                : '—';

            return `| [${this._esc(name)}](${name}.md) | ${usedIn} | ${objectLinks} | ${sourceCell} |`;
        }).join('\n');

        const triggerRows = triggers.map(([name, t]) => {
            const sourceCell = t.file ? `[📄 View Source](../source/file-${this._safeName(t.file)}.md)` : '';
            return `| ${this._esc(name)} | ${this._esc(t.object || '')} | ${sourceCell} |`;
        }).join('\n');

                const statCards = `
<a class="portal-stat-card" href="#apex-classes">
    <span class="portal-stat-value">${classes.length}</span>
    <span class="portal-stat-label">Apex Classes</span>
</a>
<a class="portal-stat-card" href="#apex-triggers">
    <span class="portal-stat-value">${triggers.length}</span>
    <span class="portal-stat-label">Apex Triggers</span>
</a>
<a class="portal-stat-card" href="${this._siteHref('../automation/index.md')}">
    <span class="portal-stat-value">${Object.keys(rel.classToFlow || {}).length}</span>
    <span class="portal-stat-label">Classes Linked to Flows</span>
</a>
<a class="portal-stat-card" href="${this._siteHref('../ui/index.md')}">
    <span class="portal-stat-value">${Object.keys(rel.classToLWC || {}).length}</span>
    <span class="portal-stat-label">Classes Linked to LWC</span>
</a>`;

        const overviewMd = `---
title: Apex Classes & Triggers
description: All Apex classes and triggers in this Salesforce org.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - apex
  - salesforce
---

# Apex Classes & Triggers

<div class="portal-hero portal-hero--section">
    <p class="portal-kicker">Code Layer</p>
    <h1 class="portal-title">Apex Classes and Trigger Execution</h1>
    <p class="portal-subtitle">Class inventory, trigger mappings, and upstream references.</p>
</div>

<section class="portal-stats-grid portal-stats-grid--compact">
${statCards}
</section>

<h2 id="apex-classes">Apex Classes (${classes.length})</h2>

| Class Name | Used In | Referenced Objects | Source |
|------------|---------|--------------------|--------|
${classRows || '| *(none found)* | | | |'}

<h2 id="apex-triggers">Apex Triggers (${triggers.length})</h2>

| Trigger Name | Object | Source |
|-------------|--------|--------|
${triggerRows || '| *(none found)* | | |'}
`;
        await this._writeMd('apex/index.md', overviewMd);

        // Individual class pages
        for (const [name, cls] of classes) {
            await this._generateApexClassPage(name, cls);
        }
    }

    async _generateApexClassPage(name, cls) {
        const methods = (cls.methods || [])
            .map(m => `| \`${this._esc(m.name || m)}\` | ${this._esc(m.returnType || '')} | ${this._esc(m.modifier || '')} |`)
            .join('\n');

        const referencedObjects = this._uniqueSorted(cls.referencedObjects || [])
            .map(o => `- ${this._linkObjectFromSection(o)}`)
            .join('\n');

        const rel = this.data.relationships || {};
        const lwcUsage = this._uniqueSorted(rel.classToLWC?.[name] || [])
            .map(lwcName => {
                const folder = this.data.lwcComponents?.[lwcName]?.folder;
                return folder
                    ? `- [${this._esc(lwcName)}](../source/folder-${this._safeName(folder)}.md)`
                    : `- [${this._esc(lwcName)}](${this._linkUiIndexFromSection()})`;
            }).join('\n');
        const flowUsage = this._uniqueSorted(rel.classToFlow?.[name] || [])
            .map(flowName => `- ${this._esc(flowName)}`)
            .join('\n');
        const triggerUsage = this._uniqueSorted(rel.classToTrigger?.[name] || [])
            .map(triggerName => `- ${this._esc(triggerName)}`)
            .join('\n');
        const auraUsage = this._uniqueSorted(rel.classToAura?.[name] || [])
            .map(auraName => `- ${this._esc(auraName)}`)
            .join('\n');
        const vfUsage = this._uniqueSorted(rel.classToVisualforce?.[name] || [])
            .map(vfName => `- ${this._esc(vfName)}`)
            .join('\n');

        const sourceLink = cls.file
            ? `| **Source File** | [📄 ${this._esc(cls.file)}](../source/file-${this._safeName(cls.file)}.md) |`
            : '';

        const md = `---
title: "${this._escYaml(name)}"
description: "Apex class documentation for ${this._escYaml(name)}"
entity_type: apex_class
api_name: "${this._escYaml(name)}"
generated_at: "${this.generatedAt}"
is_test: ${cls.isTest ? 'true' : 'false'}
method_count: ${(cls.methods || []).length}
sharing_model: "${this._escYaml(cls.sharingModel || 'Inherited')}"${(cls.referencedObjects || []).length > 0 ? `
referenced_objects:${this._yamlList(cls.referencedObjects)}` : ''}${cls.file ? `
source_file: "${this._escYaml(cls.file)}"` : ''}
tags:
  - apex
  - class
---

# ${this._esc(name)}

${cls.description ? `> ${this._esc(cls.description)}\n` : ''}
| Property | Value |
|----------|-------|
| **Sharing Model** | ${this._esc(cls.sharingModel || 'Inherited')} |
| **Is Test Class** | ${cls.isTest ? 'Yes ✅' : 'No'} |
| **Method Count** | ${(cls.methods || []).length} |
${sourceLink}

${methods ? `## Methods\n\n| Method | Return Type | Modifier |\n|--------|-------------|----------|\n${methods}\n` : ''}
## Where This Class Is Used

### LWC Components (${(rel.classToLWC?.[name] || []).length})

${lwcUsage || '_No LWC references found._'}

### Flows (${(rel.classToFlow?.[name] || []).length})

${flowUsage || `_No Flow references found. See [Automation](${this._linkAutomationIndexFromSection()})._`}

### Triggers (${(rel.classToTrigger?.[name] || []).length})

${triggerUsage || `_No Trigger references found. See [Automation](${this._linkAutomationIndexFromSection()})._`}

### Aura Components (${(rel.classToAura?.[name] || []).length})

${auraUsage || `_No Aura references found. See [UI Components](${this._linkUiIndexFromSection()})._`}

### Visualforce Pages (${(rel.classToVisualforce?.[name] || []).length})

${vfUsage || `_No Visualforce references found. See [UI Components](${this._linkUiIndexFromSection()})._`}

${referencedObjects ? `## Referenced Objects\n\n${referencedObjects}\n` : ''}
`;
        await this._writeMd(`apex/${name}.md`, md);
    }

    /** Custom objects / data model section */
    async _generateObjectsDocs() {
        const objects = Object.entries(this.data.objects || {});
        const objectToApex = this._deriveObjectToApexMap();
        const dataModelMermaid = this.objectDiagramHelper.generateUMLDiagram();
        const totalFields = objects.reduce((sum, [, obj]) => sum + ((obj.fields || []).length), 0);
        const totalRelationships = objects.reduce((sum, [, obj]) => sum + ((obj.relationships || []).length), 0);

        const overviewRows = objects.map(([name, obj]) => {
            const fieldCount = (obj.fields || []).length;
            const validationCount = (this.data.validationRules?.[name] || []).length;
            const recordTypeCount = (this.data.recordTypes?.[name] || []).length;
            const apexUsageCount = (objectToApex[name] || []).length;
            return `| [${this._esc(name)}](${name}.md) | ${this._esc(obj.label || '')} | ${fieldCount} | ${recordTypeCount} | ${validationCount} | ${apexUsageCount} |`;
        }).join('\n');

        const overviewMd = `---
title: Custom Objects & Data Model
description: All custom objects and their fields in this Salesforce org.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - objects
  - data-model
  - salesforce
---

# Custom Objects & Data Model

<div class="portal-hero portal-hero--section">
    <p class="portal-kicker">Data Layer</p>
    <h1 class="portal-title">Object Catalog and Relationships</h1>
    <p class="portal-subtitle">Schema inventory with fields, validation rules, and cross-object relationships.</p>
</div>

<section class="portal-stats-grid portal-stats-grid--compact">
    <a class="portal-stat-card" href="#custom-objects">
        <span class="portal-stat-value">${objects.length}</span>
        <span class="portal-stat-label">Objects</span>
    </a>
    <a class="portal-stat-card" href="#custom-objects">
        <span class="portal-stat-value">${totalFields}</span>
        <span class="portal-stat-label">Fields</span>
    </a>
    <a class="portal-stat-card" href="#custom-objects">
        <span class="portal-stat-value">${totalRelationships}</span>
        <span class="portal-stat-label">Relationships</span>
    </a>
    <a class="portal-stat-card" href="#data-model-diagram">
        <span class="portal-stat-value">${Object.keys(objectToApex).length}</span>
        <span class="portal-stat-label">Objects Used by Apex</span>
    </a>
</section>

<h2 id="custom-objects">Custom Objects (${objects.length})</h2>

| API Name | Label | Fields | Record Types | Validation Rules | Used By Apex |
|----------|-------|--------|--------------|------------------|--------------|
${overviewRows || '| *(none found)* | | | | | |'}

<h2 id="data-model-diagram">Data Model Diagram</h2>

\`\`\`mermaid
${dataModelMermaid}
\`\`\`
`;
        await this._writeMd('objects/index.md', overviewMd);

        for (const [name, obj] of objects) {
            await this._generateObjectPage(name, obj);
        }
    }

    async _generateObjectPage(name, obj) {
        const fields = (obj.fields || []).map(f =>
            `| \`${this._esc(f.fullName || f.name || '')}\` | ${this._esc(f.label || '')} | ${this._esc(f.type || '')} | ${f.required ? 'Yes' : 'No'} | ${this._esc(f.description || '')} |`
        ).join('\n');

        const relationships = (obj.relationships || []).map(r =>
            `| ${this._esc(r.name || r.field || '')} | ${this._linkObjectFromObjectSection(r.relatedObject || '')} | ${this._esc(r.type || '')} |`
        ).join('\n');

        const relatedObjectNames = (obj.relationships || [])
            .map(r => r.relatedObject)
            .filter(Boolean);

        const recordTypes = this.data.recordTypes?.[name] || [];
        const recordTypeRows = recordTypes.map(rt =>
            `| ${this._esc(rt.name || '')} | ${this._esc(rt.label || '')} | ${rt.active ? 'Yes' : 'No'} | ${this._esc(rt.description || '')} |`
        ).join('\n');

        const validationRules = this.data.validationRules?.[name] || [];
        const validationRows = validationRules.map(vr =>
            `| ${this._esc(vr.fullName || vr.name || '')} | ${vr.active ? 'Yes' : 'No'} | ${this._esc(vr.errorMessage || '')} | ${this._esc(vr.description || '')} |`
        ).join('\n');

        const rel = this.data.relationships || {};
        const objectToApex = this._deriveObjectToApexMap();
        const usedByApex = this._uniqueSorted(objectToApex[name] || [])
            .map(className => `- ${this._linkApexFromObjectSection(className)}`)
            .join('\n');
        const usedByTriggers = this._uniqueSorted(rel.objectToTriggers?.[name] || [])
            .map(triggerName => `- ${this._esc(triggerName)}`)
            .join('\n');
        const usedByFlows = this._uniqueSorted(rel.objectToFlows?.[name] || [])
            .map(flowName => `- ${this._esc(flowName)}`)
            .join('\n');

        const md = `---
title: "${this._escYaml(name)}"
description: "Object documentation for ${this._escYaml(name)}"
entity_type: custom_object
api_name: "${this._escYaml(name)}"
label: "${this._escYaml(obj.label || '')}"
generated_at: "${this.generatedAt}"
field_count: ${(obj.fields || []).length}
relationship_count: ${(obj.relationships || []).length}${relatedObjectNames.length > 0 ? `
related_objects:${this._yamlList(relatedObjectNames)}` : ''}
tags:
  - objects
  - data-model
---

# ${this._esc(obj.label || name)}

| Property | Value |
|----------|-------|
| **API Name** | \`${this._esc(name)}\` |
| **Label** | ${this._esc(obj.label || '')} |
| **Plural Label** | ${this._esc(obj.pluralLabel || '')} |
| **Sharing Model** | ${this._esc(obj.sharingModel || '')} |
| **Field Count** | ${(obj.fields || []).length} |
| **Record Type Count** | ${recordTypes.length} |
| **Validation Rule Count** | ${validationRules.length} |

${fields ? `## Fields\n\n| API Name | Label | Type | Required | Description |\n|----------|-------|------|----------|-------------|\n${fields}\n` : '## Fields\n\n*(no fields found)*\n'}
${recordTypeRows ? `## Record Types\n\n| Name | Label | Active | Description |\n|------|-------|--------|-------------|\n${recordTypeRows}\n` : ''}
${validationRows ? `## Validation Rules\n\n| Rule Name | Active | Error Message | Description |\n|-----------|--------|---------------|-------------|\n${validationRows}\n` : ''}
${relationships ? `## Relationships\n\n| Relationship Name | Related Object | Type |\n|-------------------|----------------|------|\n${relationships}\n` : ''}

## Where This Object Is Used

### Apex Classes (${(objectToApex[name] || []).length})

${usedByApex || '_No Apex references found._'}

### Flows (${(rel.objectToFlows?.[name] || []).length})

${usedByFlows || '_No Flow references found._'}

### Triggers (${(rel.objectToTriggers?.[name] || []).length})

${usedByTriggers || '_No Trigger references found._'}
`;
        await this._writeMd(`objects/${name}.md`, md);
    }

    /** Cross-reference section */
    async _generateCrossReferenceDocs() {
        const rel = this.data.relationships || {};
        const rows = [];

        const pushRows = (sourceType, targetType, map, sourceLinker = null, targetLinker = null) => {
            for (const [sourceName, targets] of Object.entries(map || {})) {
                const uniqueTargets = this._uniqueSorted(targets || []);
                if (!uniqueTargets.length) continue;
                const linkedSource = sourceLinker ? sourceLinker(sourceName) : this._esc(sourceName);
                const targetSample = uniqueTargets.slice(0, 8)
                    .map(t => targetLinker ? targetLinker(t) : this._esc(t))
                    .join(', ');
                rows.push(`| ${this._esc(sourceType)} | ${linkedSource} | ${this._esc(targetType)} | ${uniqueTargets.length} | ${targetSample}${uniqueTargets.length > 8 ? ' ...' : ''} |`);
            }
        };

        pushRows('Apex Class', 'LWC Components', rel.classToLWC, c => this._linkApexFromSection(c), l => this._linkLwcOrUiFromSection(l));
        pushRows('Apex Class', 'Flows', rel.classToFlow, c => this._linkApexFromSection(c), f => this._linkFlowFromAutomationSection(f));
        pushRows('Apex Class', 'Triggers', rel.classToTrigger, c => this._linkApexFromSection(c));
        pushRows('Apex Class', 'Aura Components', rel.classToAura);
        pushRows('Object', 'Flows', rel.objectToFlows, o => this._linkObjectFromSection(o), f => this._linkFlowFromAutomationSection(f));
        pushRows('Object', 'Triggers', rel.objectToTriggers, o => this._linkObjectFromSection(o));
        pushRows('LWC Component', 'FlexiPages', rel.lwcToFlexiPages);
        pushRows('FlexiPage', 'LWC Components', rel.flexiPageToLWC, null, l => this._linkLwcOrUiFromSection(l));
        pushRows('FlexiPage', 'Flows', rel.flexiPageToFlows, null, f => this._linkFlowFromAutomationSection(f));
        pushRows('Profile', 'Apex Classes', rel.profileToClasses, null, c => this._linkApexFromSection(c));

        const md = `---
title: Cross-Reference
description: Relationship index between Salesforce metadata components.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - cross-reference
  - relationships
  - salesforce
---

# Cross-Reference

This page summarizes discovered relationships between metadata types.

## Relationship Summary

| Metric | Count |
|--------|-------|
| Relationship Buckets | ${Object.keys(rel).length} |
| Non-empty Relationship Entries | ${this._countRelationshipEntries()} |

## Relationship Matrix

| Source Type | Source Name | Target Type | Target Count | Targets (sample) |
|-------------|-------------|-------------|--------------|------------------|
${rows.length ? rows.join('\n') : '| *(none found)* | | | | |'}
`;

        await this._writeMd('cross-reference/index.md', md);
    }

    /** Individual flow pages with Mermaid diagrams */
    async _generateFlowDocs() {
        const flows = Object.entries(this.data.flows || {});
        for (const [flowName, flowData] of flows) {
            await this._generateFlowPage(flowName, flowData);
        }
    }

    async _generateFlowPage(flowName, flowData) {
        const safeFlowName = this.sanitizeNodeName(flowName);
        const diagram = this.flowDiagramHelper.generateFlowMermaid(flowName, flowData)
            || 'flowchart TD\n    Start([Start])\n    End([End])\n    Start --> End';

        const rel = this.data.relationships || {};
        const flowToApex = this._uniqueSorted(rel.flowToApex?.[flowName] || []);
        const flowToFlexiPages = this._uniqueSorted(rel.flowToFlexiPages?.[flowName] || []);
        const touchedObjects = this._flowTouchedObjects(flowData);

        const decisions = flowData.decisions || [];
        const decisionRows = decisions.map(d =>
            `| ${this._esc(d.name || '')} | ${this._esc(d.label || '')} | ${(d.rules || []).length} | ${this._esc(d.defaultTarget || '')} |`
        ).join('\n');

        const recordLookups = flowData.recordLookups || [];
        const lookupRows = recordLookups.map(r =>
            `| ${this._esc(r.name || '')} | ${this._esc(r.label || '')} | ${this._linkObjectFromAutomationSection(r.object || '')} |`
        ).join('\n');

        const recordUpdates = flowData.recordUpdates || [];
        const updateRows = recordUpdates.map(r =>
            `| ${this._esc(r.name || '')} | ${this._esc(r.label || '')} | ${this._linkObjectFromAutomationSection(r.object || '')} |`
        ).join('\n');

        const recordCreates = flowData.recordCreates || [];
        const createRows = recordCreates.map(r =>
            `| ${this._esc(r.name || '')} | ${this._esc(r.label || '')} | ${this._linkObjectFromAutomationSection(r.object || '')} |`
        ).join('\n');

        const actions = flowData.actions || [];
        const actionRows = actions.map(a =>
            `| ${this._esc(a.name || '')} | ${this._esc(a.label || '')} | ${this._esc(a.type || '')} | ${this._esc(a.actionName || '')} |`
        ).join('\n');

        const variables = flowData.variables || [];
        const variableRows = variables.map(v =>
            `| ${this._esc(v.name || '')} | ${this._esc(v.type || '')} | ${v.isInput ? 'Yes' : 'No'} | ${v.isOutput ? 'Yes' : 'No'} | ${v.isCollection ? 'Yes' : 'No'} | ${this._esc(v.apexClass || '')} |`
        ).join('\n');

        const sourceLink = flowData.file
            ? `[File](../source/file-${this._safeName(flowData.file)}.md)`
            : '';

        const usedByFlexiPages = flowToFlexiPages.map(p => `- ${this._esc(p)}`).join('\n');
        const usesApex = flowToApex.map(c => `- ${this._linkApexFromAutomationSection(c)}`).join('\n');
        const usesObjects = touchedObjects.map(o => `- ${this._linkObjectFromAutomationSection(o)}`).join('\n');

        const md = `---
title: "${this._escYaml(flowName)}"
description: "Flow documentation for ${this._escYaml(flowName)}"
entity_type: flow
api_name: "${this._escYaml(flowName)}"
generated_at: "${this.generatedAt}"
process_type: "${this._escYaml(flowData.processType || flowData.type || '')}"
status: "${this._escYaml(flowData.status || '')}"
---

# ${this._esc(flowData.label || flowName)}

| Property | Value |
|----------|-------|
| **API Name** | \`${this._esc(flowName)}\` |
| **Process Type** | ${this._esc(flowData.processType || flowData.type || '')} |
| **Status** | ${this._esc(flowData.status || '')} |
| **Source** | ${sourceLink || '—'} |

## Flow Diagram

\`\`\`mermaid
${diagram}
\`\`\`

## Flow Dependencies

### Uses Apex Classes (${flowToApex.length})

${usesApex || '_No Apex actions detected._'}

### Uses Objects (${touchedObjects.length})

${usesObjects || '_No object interactions detected._'}

### Used In FlexiPages (${flowToFlexiPages.length})

${usedByFlexiPages || '_No FlexiPage references detected._'}

${decisionRows ? `## Decisions\n\n| Name | Label | Rules | Default Target |\n|------|-------|-------|----------------|\n${decisionRows}\n` : ''}
${lookupRows ? `## Record Lookups\n\n| Name | Label | Object |\n|------|-------|--------|\n${lookupRows}\n` : ''}
${updateRows ? `## Record Updates\n\n| Name | Label | Object |\n|------|-------|--------|\n${updateRows}\n` : ''}
${createRows ? `## Record Creates\n\n| Name | Label | Object |\n|------|-------|--------|\n${createRows}\n` : ''}
${actionRows ? `## Actions\n\n| Name | Label | Type | Action Name |\n|------|-------|------|-------------|\n${actionRows}\n` : ''}
${variableRows ? `## Variables\n\n| Name | Type | Input | Output | Collection | Apex Class |\n|------|------|-------|--------|------------|------------|\n${variableRows}\n` : ''}
`;

        await this._writeMd(`automation/flow-${safeFlowName}.md`, md);
    }

    /** Automation section – flows, triggers, validation rules */
    async _generateAutomationDocs() {
        const flows = Object.entries(this.data.flows || {});
        const triggers = Object.entries(this.data.triggers || {});
        const validationRules = this.data.validationRules || {};

        const flowRows = flows.map(([name, f]) => {
            const sourceCell = f.file ? `[📄 View Flow XML](../source/file-${this._safeName(f.file)}.md)` : '';
            return `| [${this._esc(name)}](flow-${this.sanitizeNodeName(name)}.md) | ${this._esc(f.processType || f.type || '')} | ${this._esc(f.status || '')} | ${sourceCell} |`;
        }).join('\n');

        const triggerRows = triggers.map(([name, t]) => {
            const sourceCell = t.file ? `[📄 View Source](../source/file-${this._safeName(t.file)}.md)` : '';
            return `| ${this._esc(name)} | ${this._esc(t.object || '')} | ${this._esc((t.events || []).join(', '))} | ${sourceCell} |`;
        }).join('\n');

        let vrTotal = 0;
        const vrRows = Object.entries(validationRules).flatMap(([objName, rules]) => {
            if (!Array.isArray(rules)) return [];
            vrTotal += rules.length;
            return rules.map(r =>
                `| ${this._esc(objName)} | ${this._esc(r.fullName || r.name || '')} | ${this._esc(r.description || '')} |`
            );
        }).join('\n');

        // Build a simple Mermaid diagram of the automation landscape
        const mermaidFlows = flows.slice(0, 20).map(([name]) =>
            `    ${this.sanitizeNodeName(name)}["${this._esc(name)}"]`
        ).join('\n');

        const md = `---
title: Automation & Flows
description: Flows, Apex triggers, and validation rules.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - automation
  - flows
  - triggers
  - salesforce
---

# Automation & Flows

<div class="portal-hero portal-hero--section">
    <p class="portal-kicker">Automation Layer</p>
    <h1 class="portal-title">Flow Execution and Declarative Rules</h1>
    <p class="portal-subtitle">Operational view of automation assets, validation rules, and trigger execution points.</p>
</div>

<section class="portal-stats-grid portal-stats-grid--compact">
    <a class="portal-stat-card" href="#flows">
        <span class="portal-stat-value">${flows.length}</span>
        <span class="portal-stat-label">Flows</span>
    </a>
    <a class="portal-stat-card" href="#apex-triggers">
        <span class="portal-stat-value">${triggers.length}</span>
        <span class="portal-stat-label">Apex Triggers</span>
    </a>
    <a class="portal-stat-card" href="#validation-rules">
        <span class="portal-stat-value">${vrTotal}</span>
        <span class="portal-stat-label">Validation Rules</span>
    </a>
    <a class="portal-stat-card" href="#flow-landscape-first-20">
        <span class="portal-stat-value">${Math.min(flows.length, 20)}</span>
        <span class="portal-stat-label">Flows in Diagram</span>
    </a>
</section>

<h2 id="flows">Flows (${flows.length})</h2>

| Flow Name | Type | Status | Source |
|-----------|------|--------|--------|
${flowRows || '| *(none found)* | | | |'}

<h2 id="apex-triggers">Apex Triggers (${triggers.length})</h2>

| Trigger Name | Object | Events | Source |
|-------------|--------|--------|--------|
${triggerRows || '| *(none found)* | | | |'}

<h2 id="validation-rules">Validation Rules (${vrTotal})</h2>

| Object | Rule Name | Description |
|--------|-----------|-------------|
${vrRows || '| *(none found)* | | |'}

${mermaidFlows ? `<h3 id="flow-landscape-first-20">Flow Landscape (first 20)</h3>

\`\`\`mermaid
graph LR
${mermaidFlows}
\`\`\`
` : ''}`;

        await this._writeMd('automation/index.md', md);
    }

    /** Profiles & permission sets section */
    async _generateProfilesDocs() {
        const profiles = Object.entries(this.data.profiles || {});
        const permSets = Object.entries(this.data.permissionSets || {});

        const profileRows = profiles.map(([name, p]) =>
            `| ${this._esc(name)} | ${this._esc(p.userLicense || p.license || '')} |`
        ).join('\n');

        const psRows = permSets.map(([name, ps]) =>
            `| ${this._esc(name)} | ${this._esc(ps.label || '')} |`
        ).join('\n');

        const md = `---
title: Profiles & Permission Sets
description: All profiles and permission sets defined in this Salesforce org.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - profiles
  - permissions
  - security
  - salesforce
---

# Profiles & Permission Sets

## Profiles (${profiles.length})

| Profile Name | License |
|-------------|---------|
${profileRows || '| *(none found)* | |'}

## Permission Sets (${permSets.length})

| Permission Set Name | Label |
|---------------------|-------|
${psRows || '| *(none found)* | |'}
`;
        await this._writeMd('profiles/index.md', md);
    }

    /** UI components section */
    async _generateUIDocs() {
        const lwc = Object.entries(this.data.lwcComponents || {});
        const aura = Object.keys(this.data.auraComponents || {});
        const flexi = Object.keys(this.data.flexiPages || {});
        const vf = Object.keys(this.data.visualforcePages || {});

        const lwcRows = lwc.map(([n, l]) => {
            const sourceCell = l.folder ? `[📁 Browse Source](../source/folder-${this._safeName(l.folder)}.md)` : '';
            return `| ${this._esc(n)} | ${sourceCell} |`;
        }).join('\n');
        const auraRows = aura.map(n => `| ${this._esc(n)} |`).join('\n');
        const flexiRows = flexi.map(n => `| ${this._esc(n)} |`).join('\n');
        const vfRows = vf.map(n => `| ${this._esc(n)} |`).join('\n');

        const md = `---
title: UI Components
description: LWC, Aura, FlexiPage, and Visualforce components.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - ui
  - lwc
  - aura
  - flexipage
  - salesforce
---

# UI Components

<div class="portal-hero portal-hero--section">
    <p class="portal-kicker">Presentation Layer</p>
    <h1 class="portal-title">User Interface Components</h1>
    <p class="portal-subtitle">Lightning, Aura, FlexiPage and Visualforce assets with source navigation.</p>
</div>

<section class="portal-stats-grid portal-stats-grid--compact">
    <a class="portal-stat-card" href="#ui-lwc">
        <span class="portal-stat-value">${lwc.length}</span>
        <span class="portal-stat-label">LWC Components</span>
    </a>
    <a class="portal-stat-card" href="#ui-aura">
        <span class="portal-stat-value">${aura.length}</span>
        <span class="portal-stat-label">Aura Components</span>
    </a>
    <a class="portal-stat-card" href="#ui-flexi">
        <span class="portal-stat-value">${flexi.length}</span>
        <span class="portal-stat-label">FlexiPages</span>
    </a>
    <a class="portal-stat-card" href="#ui-vf">
        <span class="portal-stat-value">${vf.length}</span>
        <span class="portal-stat-label">Visualforce Pages</span>
    </a>
</section>

<h2 id="ui-lwc">Lightning Web Components – LWC (${lwc.length})</h2>

| Component Name | Source |
|----------------|--------|
${lwcRows || '| *(none found)* | |'}

<h2 id="ui-aura">Aura Components (${aura.length})</h2>

| Component Name |
|----------------|
${auraRows || '| *(none found)* |'}

<h2 id="ui-flexi">Flexible Pages – FlexiPages (${flexi.length})</h2>

| Page Name |
|-----------|
${flexiRows || '| *(none found)* |'}

<h2 id="ui-vf">Visualforce Pages (${vf.length})</h2>

| Page Name |
|-----------|
${vfRows || '| *(none found)* |'}
`;
        await this._writeMd('ui/index.md', md);
    }

    /** Integrations section */
    async _generateIntegrationsDocs() {
        const creds = Object.entries(this.data.namedCredentials || {});

        const credRows = creds.map(([name, c]) =>
            `| ${this._esc(name)} | ${this._esc(c.endpoint || c.url || '')} | ${this._esc(c.authType || '')} |`
        ).join('\n');

        const md = `---
title: Integrations
description: Named credentials and external system connections.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - integrations
  - named-credentials
  - salesforce
---

# Integrations

## Named Credentials (${creds.length})

| Credential Name | Endpoint | Auth Type |
|----------------|----------|-----------|
${credRows || '| *(none found)* | | |'}
`;
        await this._writeMd('integrations/index.md', md);
    }

    /** Architecture overview section */
    async _generateArchitectureDocs() {
        const apex = Object.keys(this.data.apexClasses || {}).length;
        const objects = Object.keys(this.data.objects || {}).length;
        const flows = Object.keys(this.data.flows || {}).length;
        const lwc = Object.keys(this.data.lwcComponents || {}).length;

        // Build top-level architecture diagram
        const mermaidDiagram = `graph TD
    UI["UI Layer\\n${lwc} LWC / Aura Components"]
    FLOW["Automation Layer\\n${flows} Flows"]
    APEX["Apex Layer\\n${apex} Classes"]
    DATA["Data Layer\\n${objects} Objects"]

    UI --> FLOW
    UI --> APEX
    FLOW --> APEX
    APEX --> DATA
    FLOW --> DATA`;

        const md = `---
title: Architecture Overview
description: High-level architecture of the Salesforce org.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - architecture
  - salesforce
---

# Architecture Overview

The diagram below shows the layered architecture of this Salesforce organisation.

\`\`\`mermaid
${mermaidDiagram}
\`\`\`

## Layer Summary

| Layer | Technology | Count |
|-------|------------|-------|
| UI | LWC / Aura | ${lwc} |
| Automation | Flows | ${flows} |
| Business Logic | Apex Classes | ${apex} |
| Data | Custom Objects | ${objects} |

!!! info "How to read this diagram"
    - **UI Layer** – Lightning Web Components and Aura Components that users interact with.
    - **Automation Layer** – Declarative flows triggered by user actions or platform events.
    - **Apex Layer** – Programmatic business logic called from flows or UI components.
    - **Data Layer** – Custom objects and fields that persist org data.
`;
        await this._writeMd('architecture/index.md', md);
    }

    /** Deployment section */
    async _generateDeploymentDocs() {
        const md = `---
title: Deployment & Environments
description: Deployment tracking and environment information.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - deployment
  - environments
  - salesforce
---

# Deployment & Environments

!!! note
    This page is populated with information discovered from the repository metadata.
    For full deployment history, refer to your CI/CD pipeline logs.

## Repository Information

| Property | Value |
|----------|-------|
| **Documentation Generated** | ${this.generatedAt} |
| **Source Directory** | configured via \`SOURCE_DIR\` environment variable |

## Deployment Checklist

- [ ] Review changed Apex classes for test coverage
- [ ] Validate flows in a sandbox before production deploy
- [ ] Check profile / permission set changes with security team
- [ ] Run all Apex tests before production deployment
`;
        await this._writeMd('deployment/index.md', md);
    }

    /** Maintenance / doc health section */
    async _generateMaintenanceDocs() {
        const totalApex   = Object.keys(this.data.apexClasses    || {}).length;
        const totalFlows  = Object.keys(this.data.flows          || {}).length;
        const totalObj    = Object.keys(this.data.objects        || {}).length;
        const totalProf   = Object.keys(this.data.profiles       || {}).length;
        const totalPs     = Object.keys(this.data.permissionSets || {}).length;

        const md = `---
title: Documentation Health
description: Documentation coverage and health metrics for this Salesforce org.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - maintenance
  - health
  - salesforce
---

# Documentation Health

## Coverage Summary

| Section | Documented Items |
|---------|----------------|
| Apex Classes | ${totalApex} |
| Flows | ${totalFlows} |
| Custom Objects | ${totalObj} |
| Profiles | ${totalProf} |
| Permission Sets | ${totalPs} |

!!! tip "Improving documentation coverage"
    - Add JSDoc-style comments to Apex classes so they appear in the generated docs.
    - Use descriptive names and descriptions in Flow builder.
    - Keep field-level Help Text up to date on all custom objects.
`;
        await this._writeMd('maintenance/index.md', md);
    }

    /** Custom metadata section */
    async _generateCustomMetadataDocs() {
        const types = Object.entries(this.data.customMetadata || {});

        const typeRows = types.map(([typeName, records]) => {
            const count = typeof records === 'object' ? Object.keys(records).length : 0;
            return `| ${this._esc(typeName)} | ${count} |`;
        }).join('\n');

        const md = `---
title: Custom Metadata
description: Custom metadata types and records.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - custom-metadata
  - salesforce
---

# Custom Metadata

## Custom Metadata Types (${types.length})

| Type Name | Record Count |
|-----------|-------------|
${typeRows || '| *(none found)* | |'}
`;
        await this._writeMd('custommetadata/index.md', md);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Source viewer docs (Markdown equivalents of SourceViewerGenerator pages)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate docs/source/file-<safe>.md and docs/source/folder-<safe>.md
     * for every source path referenced by links in the other doc sections.
     * This prevents MkDocs from emitting "target not found" warnings.
     */
    async _generateSourceDocs() {
        let count = 0;

        // Apex classes – file viewer pages
        for (const [name, cls] of Object.entries(this.data.apexClasses || {})) {
            if (cls.file) {
                await this._writeSourceFileMd(cls.file, name);
                count++;
            }
        }

        // Apex triggers – file viewer pages
        for (const [name, trig] of Object.entries(this.data.triggers || {})) {
            if (trig.file) {
                await this._writeSourceFileMd(trig.file, name);
                count++;
            }
        }

        // LWC components – folder browser pages
        for (const [name, lwc] of Object.entries(this.data.lwcComponents || {})) {
            if (lwc.folder) {
                await this._writeSourceFolderMd(lwc.folder, name);
                count++;
            }
        }

        // Flows – file viewer pages
        for (const [name, flow] of Object.entries(this.data.flows || {})) {
            if (flow.file) {
                await this._writeSourceFileMd(flow.file, name);
                count++;
            }
        }

        await this._writeSourceIndexMd();
        console.log(`    Generated ${count} source viewer markdown pages.`);
    }

    /** Write a markdown source-file viewer page. */
    async _writeSourceFileMd(relativeFilePath, name) {
        // Normalize to forward slashes for consistent cross-platform behaviour
        relativeFilePath = relativeFilePath.replace(/\\/g, '/');
        const safeName = this._safeName(relativeFilePath);
        const fileName = path.basename(relativeFilePath);
        const ext      = path.extname(fileName).toLowerCase();
        const langMap  = {
            '.cls': 'apex', '.trigger': 'apex', '.js': 'javascript',
            '.html': 'html', '.css': 'css', '.xml': 'xml',
            '.json': 'json', '.md': 'markdown', '.yaml': 'yaml', '.yml': 'yaml',
        };
        const lang = langMap[ext] || 'text';

        let content = '';
        try {
            content = await fs.readFile(path.join(this.repoRoot, relativeFilePath), 'utf-8');
        } catch {
            content = `// Source file not found: ${relativeFilePath}`;
        }

        // Truncate very large files to avoid slow MkDocs / Pygments processing.
        // Embedding thousands of lines per file multiplied across hundreds of
        // components is the primary driver of multi-minute `mkdocs build` times.
        const mkdocsCfg = this.config.mkdocs || {};
        const maxLines = mkdocsCfg.max_source_lines;
        let truncated = false;
        if (maxLines && maxLines > 0) {
            const lines = content.split('\n');
            if (lines.length > maxLines) {
                content = lines.slice(0, maxLines).join('\n');
                truncated = true;
            }
        }

        const truncationNote = truncated
            ? `\n> **Note:** Output truncated to first ${maxLines} lines. View the full file in the source repository.\n`
            : '';

        const md = `---
title: "${this._escYaml(name)} – Source"
description: "Source code for ${this._escYaml(name)}"
---

# 📄 ${this._esc(fileName)}

**Path:** \`${relativeFilePath}\`
${truncationNote}
\`\`\`${lang}
${content}
\`\`\`
`;
        await this._writeMd(`source/file-${safeName}.md`, md);
    }

    /** Write a markdown source-folder browser page. */
    async _writeSourceFolderMd(relativeFolderPath, name) {
        // Normalize to forward slashes for consistent cross-platform behaviour
        relativeFolderPath = relativeFolderPath.replace(/\\/g, '/');
        const safeName   = this._safeName(relativeFolderPath);
        const absPath    = path.join(this.repoRoot, relativeFolderPath);

        let files = [];
        try {
            const entries = await fs.readdir(absPath, { withFileTypes: true });
            files = entries
                .filter(e => e.isFile())
                .map(e => ({
                    name: e.name,
                    relPath: `${relativeFolderPath}/${e.name}`.replace(/\\/g, '/'),
                }));
        } catch {
            // Folder not accessible – generate an empty page
        }

        // Also generate individual file pages for each file in the folder
        for (const f of files) {
            await this._writeSourceFileMd(f.relPath, `${name}/${f.name}`);
        }

        const fileRows = files.length
            ? files.map(f => {
                const safeFilePath = this._safeName(f.relPath);
                return `| [📄 ${this._esc(f.name)}](file-${safeFilePath}.md) | \`${f.relPath}\` |`;
            }).join('\n')
            : '| *(no files found)* | |';

        const md = `---
title: "${this._escYaml(name)} – Source Folder"
description: "Source folder browser for ${this._escYaml(name)}"
---

# 📁 ${this._esc(name)}

**Folder:** \`${relativeFolderPath}\`

## Files (${files.length})

| File | Path |
|------|------|
${fileRows}
`;
        await this._writeMd(`source/folder-${safeName}.md`, md);
    }

    /** Write the source section index page. */
    async _writeSourceIndexMd() {
        const apexItems = Object.entries(this.data.apexClasses || {})
            .filter(([, c]) => c.file)
            .map(([name, c]) => ({ name, path: c.file, isFolder: false }));

        const triggerItems = Object.entries(this.data.triggers || {})
            .filter(([, t]) => t.file)
            .map(([name, t]) => ({ name, path: t.file, isFolder: false }));

        const lwcItems = Object.entries(this.data.lwcComponents || {})
            .filter(([, l]) => l.folder)
            .map(([name, l]) => ({ name, path: l.folder, isFolder: true }));

        const flowItems = Object.entries(this.data.flows || {})
            .filter(([, f]) => f.file)
            .map(([name, f]) => ({ name, path: f.file, isFolder: false }));

        const buildSection = (title, items) => {
            if (!items.length) return '';
            const rows = items
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(item => {
                    const safe = this._safeName(item.path);
                    const icon = item.isFolder ? '📁' : '📄';
                    const href = item.isFolder ? `folder-${safe}.md` : `file-${safe}.md`;
                    return `| [${icon} ${this._esc(item.name)}](${href}) | \`${item.path}\` |`;
                }).join('\n');
            return `## ${title} (${items.length})\n\n| Name | Path |\n|------|------|\n${rows}\n`;
        };

        const total = apexItems.length + triggerItems.length + lwcItems.length + flowItems.length;

        const sections = [
            buildSection('Apex Classes',   apexItems),
            buildSection('Apex Triggers',  triggerItems),
            buildSection('LWC Components', lwcItems),
            buildSection('Flows',          flowItems),
        ].filter(Boolean).join('\n');

        const md = `---
title: Source Navigator
description: Browse and read the source files for all analyzed Salesforce components.
entity_type: section_index
generated_at: "${this.generatedAt}"
tags:
  - source
  - salesforce
---

# Source Navigator

Browse and read the source files for all ${total} analyzed Salesforce components.

${sections || '*No source files found.*'}
`;
        await this._writeMd('source/index.md', md);
    }

        /**
         * Generate CSS assets that make MkDocs visually align with the HTML portal.
         * Written under docs/assets so mkdocs can serve them via extra_css.
         */
    async _generatePortalThemeAssets() {
        const css = `/* MkDocs visual alignment with Salesforce HTML portal */
:root {
    --portal-bg-primary: #ffffff;
    --portal-bg-secondary: #f8f9fa;
    --portal-bg-tertiary: #f1f3f5;
    --portal-text-primary: #1a1a1a;
    --portal-text-secondary: #4a5568;
    --portal-text-tertiary: #718096;
    --portal-border: #e2e8f0;
    --portal-accent: #e31e24;
    --portal-accent-hover: #b8151a;
    --portal-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --portal-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

[data-md-color-scheme="default"] {
    --md-primary-fg-color: #e31e24;
    --md-primary-fg-color--light: #f04a50;
    --md-primary-fg-color--dark: #b8151a;
    --md-accent-fg-color: #e31e24;
    --md-default-bg-color: #ffffff;
    --md-default-fg-color: #1a1a1a;
    --md-typeset-a-color: #e31e24;
}

/* Keep dark mode readable but preserve brand accent */
[data-md-color-scheme="slate"] {
    --md-primary-fg-color: #e31e24;
    --md-primary-fg-color--light: #f04a50;
    --md-primary-fg-color--dark: #b8151a;
    --md-accent-fg-color: #f04a50;
}

body,
.md-typeset {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.md-header {
    background: #ffffff;
    color: var(--portal-text-primary);
    border-bottom: 1px solid var(--portal-border);
    box-shadow: var(--portal-shadow-sm);
}

.md-header__title,
.md-header__button,
.md-header__topic,
.md-tabs__link {
    color: var(--portal-text-primary);
}

.md-tabs {
    background: #ffffff;
    border-bottom: 1px solid var(--portal-border);
}

.md-tabs__link--active,
.md-tabs__link:hover {
    color: var(--portal-accent);
}

.md-main {
    background: var(--portal-bg-primary);
}

.md-main__inner {
    margin-top: 0.5rem;
    max-width: 1700px;
}

.md-content {
    max-width: 1200px;
}

.md-content__inner {
    margin: 1.2rem auto 3rem;
}

.md-content__inner > h1:first-of-type {
    display: none;
}

.md-sidebar__scrollwrap,
.md-nav {
    background: var(--portal-bg-secondary);
}

.md-nav__title,
.md-nav__link {
    color: var(--portal-text-primary);
}

.md-nav__link:hover,
.md-nav__link--active {
    color: var(--portal-accent);
}

.md-typeset h1,
.md-typeset h2,
.md-typeset h3,
.md-typeset h4 {
    color: var(--portal-text-primary);
    font-weight: 600;
}

.md-typeset a {
    color: var(--portal-accent);
}

.md-typeset a:hover {
    color: var(--portal-accent-hover);
}

.md-typeset table:not([class]) {
    border: 1px solid var(--portal-border);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: var(--portal-shadow-sm);
    font-size: 0.9rem;
}

.md-typeset table:not([class]) th {
    background: var(--portal-bg-tertiary);
    color: var(--portal-text-primary);
    border-bottom: 1px solid var(--portal-border);
}

.md-typeset table:not([class]) td {
    border-top: 1px solid var(--portal-border);
}

.md-typeset code {
    border-radius: 4px;
}

.md-typeset .admonition,
.md-typeset details {
    border-radius: 10px;
    box-shadow: var(--portal-shadow-sm);
}

.md-search__form {
    border-radius: 8px;
}

.md-typeset hr {
    border-bottom-color: var(--portal-border);
}

.md-typeset {
    font-size: 0.86rem;
}

.portal-hero {
    background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
    border: 1px solid var(--portal-border);
    border-radius: 14px;
    padding: 1.2rem 1.4rem;
    margin: 0.4rem 0 1rem;
    box-shadow: var(--portal-shadow-sm);
}

.portal-kicker {
    margin: 0;
    color: var(--portal-text-secondary);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.portal-title {
    margin: 0.3rem 0 0;
    font-size: 1.55rem;
    line-height: 1.22;
}

.portal-subtitle {
    margin: 0.45rem 0 0;
    color: var(--portal-text-secondary);
}

.portal-hero--section {
    margin-top: 0;
    padding: 1rem 1.15rem;
}

.portal-hero--section .portal-title {
    font-size: 1.35rem;
}

.portal-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.65rem;
    margin: 0 0 1.4rem;
}

.portal-stats-grid--compact {
    margin: 0 0 1rem;
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
}

.portal-stat-card {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    text-decoration: none;
    border: 1px solid var(--portal-border);
    border-left: 4px solid var(--portal-accent);
    border-radius: 10px;
    padding: 0.65rem 0.75rem;
    background: #ffffff;
    box-shadow: var(--portal-shadow-sm);
    transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.portal-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--portal-shadow-md);
    border-color: #d6dce8;
}

.portal-stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--portal-text-primary);
}

.portal-stat-label {
    font-size: 0.76rem;
    color: var(--portal-text-secondary);
    line-height: 1.32;
}

.portal-sections-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.85rem;
    margin: 0.35rem 0 1.4rem;
}

.portal-section-card {
    border: 1px solid var(--portal-border);
    border-radius: 12px;
    padding: 0.8rem 0.9rem;
    background: #ffffff;
    box-shadow: var(--portal-shadow-sm);
}

.portal-section-card h3 {
    margin: 0;
    font-size: 0.98rem;
}

.portal-section-card p {
    margin: 0.35rem 0 0.55rem;
    color: var(--portal-text-secondary);
    font-size: 0.76rem;
}

.portal-section-card ul {
    margin: 0;
    padding-left: 1rem;
}

.portal-section-card li {
    margin: 0.25rem 0;
    font-size: 0.82rem;
}

.md-typeset h2[id],
.md-typeset h3[id] {
    scroll-margin-top: 5rem;
}

@media (max-width: 900px) {
    .md-main__inner {
        margin-top: 0.25rem;
    }

    .portal-title {
        font-size: 1.25rem;
    }

    .portal-stats-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
`;

        await this._writeMd('assets/portal-theme.css', css);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // mkdocs.yml generation
    // ─────────────────────────────────────────────────────────────────────────

    async _generateMkDocsConfig() {
        const mkdocsCfg = this.config.mkdocs || {};
        const docsDir = path.basename(this.docsDir);
        const userExtraCss = Array.isArray(mkdocsCfg.extra_css) ? mkdocsCfg.extra_css : [];
        const mergedExtraCss = [...new Set(['assets/portal-theme.css', ...userExtraCss])];

        const nav = this._buildNav();

        // Pages generated by _generateSourceDocs and individual apex/object pages are
        // intentionally not in the nav (they are reachable via their section index pages
        // and via links within the docs).  Declaring them in not_in_nav suppresses the
        // MkDocs INFO/WARNING messages that would otherwise appear for every generated
        // source-viewer file and every individual Apex-class or object page.
        //
        // The __yaml_raw sentinel tells _renderYaml to emit the value verbatim (without
        // additional quoting or escaping), which is required for YAML block-scalar syntax
        // such as the literal-block scalar (`|`) used here.  It is the same mechanism
        // used for the `!!python/name:` tags in the pymdownx.superfences config below.
        //
        // The pattern uses MkDocs' gitignore-style globs.  At top level (indent 0) the
        // expected YAML shape is:
        //   not_in_nav: |
        //     source/*.md
        //     apex/*.md
        //     objects/*.md
        // The leading `|` starts the literal block scalar; each subsequent indented line
        // is one glob pattern.  Callers may override via config.mkdocs.not_in_nav_pattern.
        const notInNavPatterns = mkdocsCfg.not_in_nav_patterns || [
            'source/*.md',
            'apex/*.md',
            'objects/*.md',
            'automation/flow-*.md',
        ];
        // Render as a YAML literal block scalar: `| \n  pattern1\n  pattern2\n  ...`
        const notInNavRaw = '|\n' + notInNavPatterns.map(p => `  ${p}`).join('\n');

        const yml = this._renderYaml({
            site_name:        mkdocsCfg.site_name        || 'Salesforce Technical Documentation',
            site_description: mkdocsCfg.site_description || 'Auto-generated Salesforce Org Documentation Portal',
            ...(mkdocsCfg.site_author ? { site_author: mkdocsCfg.site_author } : {}),
            docs_dir: docsDir,
            // dev_addr configures the address/port used by `mkdocs serve`.
            // Defaults to 127.0.0.1:8001 instead of MkDocs' built-in 127.0.0.1:8000
            // because port 8000 is frequently blocked on Windows (WinError 10013) when
            // Hyper-V, Docker Desktop, or WSL2 is active.
            dev_addr: mkdocsCfg.dev_addr || '127.0.0.1:8001',
            not_in_nav: { __yaml_raw: notInNavRaw },
            theme: mkdocsCfg.theme || { name: 'material' },
            nav,
            plugins: mkdocsCfg.plugins || ['search'],
            markdown_extensions: mkdocsCfg.markdown_extensions || [
                'admonition',
                'tables',
                'toc',
                'pymdownx.details',
                {
                    'pymdownx.superfences': {
                        custom_fences: [
                            {
                                name: 'mermaid',
                                class: 'mermaid',
                                format: { __yaml_raw: '!!python/name:pymdownx.superfences.fence_code_format' }
                            }
                        ]
                    }
                },
                { 'pymdownx.tabbed': { alternate_style: true } },
                'pymdownx.highlight'
            ],
            extra_css: mergedExtraCss,
            ...(mkdocsCfg.extra_javascript && mkdocsCfg.extra_javascript.length ? { extra_javascript: mkdocsCfg.extra_javascript } : {})
        });

        const mkdocsPath = path.join(this.outputDir, 'mkdocs.yml');
        await fs.writeFile(mkdocsPath, yml, 'utf-8');
        console.log(`    mkdocs.yml written to: ${mkdocsPath}`);
    }

    /**
     * Build the full nav structure as a plain JS value (will be YAML-serialised).
     */
    _buildNav() {
        // Build Source sub-section: start with the index, then one entry per LWC folder.
        // Apex and Object per-entity pages are reachable from their section index and are
        // declared in not_in_nav, so they do not need individual nav entries.
        const lwcNavEntries = Object.entries(this.data.lwcComponents || {})
            .filter(([, l]) => l.folder)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, l]) => ({
                [name]: `source/folder-${this._safeName(l.folder)}.md`
            }));

        const sourceSection = [
            { 'Source Navigator': 'source/index.md' },
            ...(lwcNavEntries.length > 0
                ? [{ 'LWC Components': lwcNavEntries }]
                : [])
        ];

        const nav = [
            { Home: 'index.md' },
            {
                Developer: [
                    { 'Apex Classes':              'apex/index.md' },
                    { 'Data Model':                'objects/index.md' },
                    { 'UI Components':             'ui/index.md' },
                    { 'Automation & Flows':        'automation/index.md' },
                    { 'Integrations':              'integrations/index.md' },
                    { 'Custom Metadata':           'custommetadata/index.md' }
                ]
            },
            {
                Security: [
                    { 'Profiles & Permission Sets': 'profiles/index.md' }
                ]
            },
            {
                Operations: [
                    { 'Architecture':        'architecture/index.md' },
                    { 'Deployment':          'deployment/index.md' },
                    { 'Documentation Health':'maintenance/index.md' },
                    { 'Cross-Reference':     'cross-reference/index.md' }
                ]
            },
            { Source: sourceSection }
        ];

        if (this.pandocNavEntries.length > 0) {
            nav.push({ 'Functional Documentation': this.pandocNavEntries });
        }

        return nav;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AI-agent integration: llms.txt + ai-manifest.json
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generate docs/llms.txt – a plain-text file following the llmstxt.org
     * convention that describes the documentation structure for LLM / AI agents.
     * Agents that receive a docs root URL can fetch <root>/llms.txt first to
     * understand which pages exist and how they relate, before fetching
     * individual .md files.
     */
    async _generateLlmsTxt() {
        const d = this.data;
        const counts = {
            apexClasses:  Object.keys(d.apexClasses    || {}).length,
            objects:      Object.keys(d.objects        || {}).length,
            flows:        Object.keys(d.flows          || {}).length,
            lwc:          Object.keys(d.lwcComponents  || {}).length,
            aura:         Object.keys(d.auraComponents || {}).length,
            profiles:     Object.keys(d.profiles       || {}).length,
            permSets:     Object.keys(d.permissionSets || {}).length,
            triggers:     Object.keys(d.triggers       || {}).length,
        };

        const siteName = (this.config.mkdocs || {}).site_name || 'Salesforce Technical Documentation';

        const apexLinks = Object.keys(d.apexClasses || {})
            .sort()
            .map(name => `- [${name}](apex/${name}.md)`)
            .join('\n');

        const objectLinks = Object.keys(d.objects || {})
            .sort()
            .map(name => `- [${name}](objects/${name}.md)`)
            .join('\n');

        const flowLinks = Object.keys(d.flows || {})
            .sort()
            .map(name => `- [${name}](automation/flow-${this.sanitizeNodeName(name)}.md)`)
            .join('\n');

        const lwcSourceLinks = Object.entries(d.lwcComponents || {})
            .filter(([, l]) => l.folder)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, l]) => `- [${name}](source/folder-${this._safeName(l.folder)}.md)`)
            .join('\n');

        const txt =
`# ${siteName}

> Auto-generated technical documentation for a Salesforce organisation.
> Generated at: ${this.generatedAt}
> Machine-readable index: [ai-manifest.json](ai-manifest.json)

## Summary

This documentation covers all metadata components of a Salesforce org:

- Apex Classes: ${counts.apexClasses}
- Custom Objects: ${counts.objects}
- Flows: ${counts.flows}
- LWC Components: ${counts.lwc}
- Aura Components: ${counts.aura}
- Profiles: ${counts.profiles}
- Permission Sets: ${counts.permSets}
- Apex Triggers: ${counts.triggers}

## Section Index Pages

- [Home](index.md): Dashboard overview with all entity counts and navigation.
- [Apex Classes & Triggers](apex/index.md): All Apex classes and triggers with methods and object references.
- [Custom Objects & Data Model](objects/index.md): All custom objects with fields and relationships.
- [Automation & Flows](automation/index.md): Flows, Apex triggers, and validation rules.
- [Profiles & Permission Sets](profiles/index.md): All security profiles and permission sets.
- [UI Components](ui/index.md): LWC, Aura, FlexiPage, and Visualforce components.
- [Integrations](integrations/index.md): Named credentials and external system connections.
- [Architecture](architecture/index.md): High-level architecture diagram and layer summary.
- [Deployment](deployment/index.md): Deployment checklist and environment information.
- [Documentation Health](maintenance/index.md): Documentation coverage metrics.
- [Cross-Reference](cross-reference/index.md): Relationship matrix between metadata components.
- [Custom Metadata](custommetadata/index.md): Custom metadata types and records.
- [Source Navigator](source/index.md): Browse source files for all components.

## Individual Apex Class Pages

${apexLinks || '*(none)*'}

## Individual Object Pages

${objectLinks || '*(none)*'}

## Individual Flow Pages

${flowLinks || '*(none)*'}

## LWC Component Source Pages

${lwcSourceLinks || '*(none)*'}
`;
        await this._writeMd('llms.txt', txt);
        console.log('    llms.txt generated.');
    }

    /**
     * Generate docs/ai-manifest.json – a machine-readable JSON index of every
     * generated documentation page.  External apps can fetch this single file
     * to discover all pages, their types, API names, and relationships without
     * reading each .md file individually.
     *
     * Schema:
     *   generated_at   – ISO-8601 timestamp
     *   entity_counts  – total count per Salesforce metadata type
     *   sections       – per-section { index, pages[] }
     *   all_pages      – flat array of { path, title, entity_type, api_name? }
     */
    async _generateAiManifest() {
        const d = this.data;

        const apexPages = Object.entries(d.apexClasses || {}).map(([name, cls]) => ({
            path:        `apex/${name}.md`,
            title:       name,
            entity_type: 'apex_class',
            api_name:    name,
            section:     'apex',
            ...(cls.isTest !== undefined ? { is_test: Boolean(cls.isTest) } : {}),
            method_count: (cls.methods || []).length,
        }));

        const objectPages = Object.entries(d.objects || {}).map(([name, obj]) => ({
            path:        `objects/${name}.md`,
            title:       obj.label || name,
            entity_type: 'custom_object',
            api_name:    name,
            section:     'objects',
            field_count: (obj.fields || []).length,
        }));

        const flowPages = Object.entries(d.flows || {}).map(([name, flow]) => ({
            path:         `automation/flow-${this.sanitizeNodeName(name)}.md`,
            title:        flow.label || name,
            entity_type:  'flow',
            api_name:     name,
            section:      'automation',
            process_type: flow.processType || flow.type || '',
            status:       flow.status || '',
        }));

        // Source viewer pages for LWC components (folder browser pages)
        const sourcePages = Object.entries(d.lwcComponents || {})
            .filter(([, l]) => l.folder)
            .map(([name, l]) => ({
                path:        `source/folder-${this._safeName(l.folder)}.md`,
                title:       `${name} – Source Folder`,
                entity_type: 'lwc_source_folder',
                api_name:    name,
                section:     'source',
            }));

        const sectionIndexPages = [
            { path: 'index.md',               title: 'Salesforce Org Documentation',  entity_type: 'overview',       section: 'root' },
            { path: 'apex/index.md',           title: 'Apex Classes & Triggers',       entity_type: 'section_index',  section: 'apex' },
            { path: 'objects/index.md',        title: 'Custom Objects & Data Model',   entity_type: 'section_index',  section: 'objects' },
            { path: 'automation/index.md',     title: 'Automation & Flows',            entity_type: 'section_index',  section: 'automation' },
            { path: 'profiles/index.md',       title: 'Profiles & Permission Sets',    entity_type: 'section_index',  section: 'profiles' },
            { path: 'ui/index.md',             title: 'UI Components',                 entity_type: 'section_index',  section: 'ui' },
            { path: 'integrations/index.md',   title: 'Integrations',                  entity_type: 'section_index',  section: 'integrations' },
            { path: 'architecture/index.md',   title: 'Architecture Overview',         entity_type: 'section_index',  section: 'architecture' },
            { path: 'deployment/index.md',     title: 'Deployment & Environments',     entity_type: 'section_index',  section: 'deployment' },
            { path: 'maintenance/index.md',    title: 'Documentation Health',          entity_type: 'section_index',  section: 'maintenance' },
            { path: 'custommetadata/index.md', title: 'Custom Metadata',               entity_type: 'section_index',  section: 'custommetadata' },
            { path: 'cross-reference/index.md', title: 'Cross-Reference',              entity_type: 'section_index',  section: 'cross-reference' },
            { path: 'source/index.md',         title: 'Source Navigator',              entity_type: 'section_index',  section: 'source' },
        ];

        const manifest = {
            generated_at: this.generatedAt,
            entity_counts: {
                apex_classes:    Object.keys(d.apexClasses    || {}).length,
                custom_objects:  Object.keys(d.objects        || {}).length,
                flows:           Object.keys(d.flows          || {}).length,
                lwc_components:  Object.keys(d.lwcComponents  || {}).length,
                aura_components: Object.keys(d.auraComponents || {}).length,
                profiles:        Object.keys(d.profiles       || {}).length,
                permission_sets: Object.keys(d.permissionSets || {}).length,
                apex_triggers:   Object.keys(d.triggers       || {}).length,
                flexipages:      Object.keys(d.flexiPages     || {}).length,
            },
            sections: {
                apex:          { index: 'apex/index.md',           pages: apexPages.map(p => p.path) },
                objects:       { index: 'objects/index.md',        pages: objectPages.map(p => p.path) },
                automation:    { index: 'automation/index.md',     pages: flowPages.map(p => p.path) },
                profiles:      { index: 'profiles/index.md',       pages: [] },
                ui:            { index: 'ui/index.md',             pages: [] },
                integrations:  { index: 'integrations/index.md',  pages: [] },
                architecture:  { index: 'architecture/index.md',   pages: [] },
                deployment:    { index: 'deployment/index.md',     pages: [] },
                maintenance:   { index: 'maintenance/index.md',    pages: [] },
                custommetadata:{ index: 'custommetadata/index.md', pages: [] },
                'cross-reference': { index: 'cross-reference/index.md', pages: [] },
                source:        { index: 'source/index.md',         pages: sourcePages.map(p => p.path) },
            },
            all_pages: [...sectionIndexPages, ...apexPages, ...objectPages, ...flowPages, ...sourcePages],
        };

        const manifestPath = path.join(this.docsDir, 'ai-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('    ai-manifest.json generated.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // File I/O helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Write a markdown file to the docs directory. */
    async _writeMd(relativePath, content) {
        // Normalise to forward slashes so the path is valid on all platforms
        const normalisedRelPath = relativePath.replace(/\\/g, '/');
        const fullPath = path.join(this.docsDir, normalisedRelPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Minimal YAML serialiser (avoids external dependencies)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convert a plain JavaScript value into a YAML string.
     * Handles strings, numbers, booleans, arrays, and plain objects.
     * Not intended to be a full YAML library – only covers the subset
     * needed for mkdocs.yml.
     */
    _renderYaml(value, indent = 0) {
        const pad = '  '.repeat(indent);

        if (value === null || value === undefined) {
            return 'null';
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (typeof value === 'number') {
            return String(value);
        }
        if (typeof value === 'string') {
            // Use single-quoted scalar when the string contains special YAML characters
            if (/[:{}\[\],&*#?|<>=!%@`]/.test(value) || value.includes('\n')) {
                return `'${value.replace(/'/g, "''")}'`; // escape single quotes
            }
            return value;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return '[]';
            return value.map(item => {
                const rendered = this._renderYaml(item, indent + 1);
                // Inline scalars on the same dash line; objects go on next line
                if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                    const inner = this._renderYaml(item, indent + 1);
                    // inner already has its own padding – strip the leading pad then re-apply
                    return `${pad}- ${inner.trimStart()}`;
                }
                return `${pad}- ${rendered}`;
            }).join('\n');
        }
        if (typeof value === 'object') {
            // Special marker: emit a raw YAML scalar verbatim (e.g. !!python/name: tags).
            if ('__yaml_raw' in value) {
                return String(value.__yaml_raw);
            }
            const keys = Object.keys(value);
            if (keys.length === 0) return '{}';
            return keys.map((k, i) => {
                const v = value[k];
                const keyStr = /[:{}\[\],&*#?|<>=!%@` ]/.test(k) ? `"${k}"` : k;
                // Raw YAML scalar – emit inline on the same line as the key
                if (typeof v === 'object' && v !== null && !Array.isArray(v) && '__yaml_raw' in v) {
                    return `${pad}${keyStr}: ${v.__yaml_raw}`;
                }
                if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                    return `${pad}${keyStr}:\n${this._renderYaml(v, indent + 1)}`;
                }
                if (Array.isArray(v)) {
                    if (v.length === 0) return `${pad}${keyStr}: []`;
                    return `${pad}${keyStr}:\n${this._renderYaml(v, indent + 1)}`;
                }
                return `${pad}${keyStr}: ${this._renderYaml(v, indent)}`;
            }).join('\n');
        }
        return String(value);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Markdown escaping
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Escape characters that have special meaning in Markdown tables / inline text.
     * Does NOT escape backtick-wrapped code spans.
     */
    _esc(text) {
        if (!text && text !== 0) return '';
        return String(text)
            .replace(/\\/g, '\\\\')
            .replace(/\|/g, '\\|')
            .replace(/\n/g, ' ');
    }

    /**
     * Convert a relative file/folder path into a safe filename fragment,
     * matching the convention used by SourceViewerGenerator.
     * e.g. "force-app/main/default/classes/MyClass.cls" → "force_app_main_default_classes_MyClass_cls"
     */
    _safeName(p) {
        return String(p).replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Escape characters that have special meaning inside a YAML double-quoted
     * scalar: backslashes, double-quotes, and control characters.
     * Used when interpolating values into front-matter `"..."` strings.
     */
    _escYaml(text) {
        if (!text && text !== 0) return '';
        return String(text)
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, ' ');
    }

    /**
     * Render an array as a YAML block sequence suitable for embedding
     * directly after a mapping key in front-matter.
     *
     * Returns " []" for empty arrays, or a multi-line string starting with
     * a newline for non-empty arrays so callers can write:
     *
     *   referenced_objects:${this._yamlList(items)}
     *
     * producing valid YAML whether the list is empty or not.
     */
    _yamlList(items) {
        if (!items || items.length === 0) return ' []';
        return items.map(i => `\n  - "${this._escYaml(String(i))}"`).join('');
    }

    _uniqueSorted(items) {
        return [...new Set((items || []).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }

    _countRelationshipEntries() {
        const rel = this.data.relationships || {};
        return Object.values(rel).reduce((sum, mapObj) => {
            if (!mapObj || typeof mapObj !== 'object') return sum;
            return sum + Object.keys(mapObj).length;
        }, 0);
    }

    _deriveObjectToApexMap() {
        const derived = {};
        const existing = this.data.relationships?.objectToApex || {};

        for (const [objName, classNames] of Object.entries(existing)) {
            derived[objName] = this._uniqueSorted(classNames || []);
        }

        for (const [className, classData] of Object.entries(this.data.apexClasses || {})) {
            for (const objName of (classData.referencedObjects || [])) {
                if (!objName) continue;
                if (!derived[objName]) derived[objName] = [];
                if (!derived[objName].includes(className)) {
                    derived[objName].push(className);
                }
            }
        }

        for (const key of Object.keys(derived)) {
            derived[key] = this._uniqueSorted(derived[key]);
        }

        return derived;
    }

    _linkAutomationIndexFromSection() {
        return '../automation/index.md';
    }

    _linkUiIndexFromSection() {
        return '../ui/index.md';
    }

    _linkObjectFromSection(objName) {
        if (!objName) return '';
        if ((this.data.objects || {})[objName]) {
            return `[${this._esc(objName)}](../objects/${objName}.md)`;
        }
        return this._esc(objName);
    }

    _linkObjectFromObjectSection(objName) {
        if (!objName) return '';
        if ((this.data.objects || {})[objName]) {
            return `[${this._esc(objName)}](${objName}.md)`;
        }
        return this._esc(objName);
    }

    _linkApexFromObjectSection(className) {
        if (!className) return '';
        if ((this.data.apexClasses || {})[className]) {
            return `[${this._esc(className)}](../apex/${className}.md)`;
        }
        return this._esc(className);
    }

    _linkApexFromSection(className) {
        if (!className) return '';
        if ((this.data.apexClasses || {})[className]) {
            return `[${this._esc(className)}](../apex/${className}.md)`;
        }
        return this._esc(className);
    }

    _linkObjectFromAutomationSection(objName) {
        if (!objName) return '';
        if ((this.data.objects || {})[objName]) {
            return `[${this._esc(objName)}](../objects/${objName}.md)`;
        }
        return this._esc(objName);
    }

    _linkFlowFromAutomationSection(flowName) {
        if (!flowName) return '';
        if ((this.data.flows || {})[flowName]) {
            return `[${this._esc(flowName)}](../automation/flow-${this.sanitizeNodeName(flowName)}.md)`;
        }
        return this._esc(flowName);
    }

    _linkLwcOrUiFromSection(lwcName) {
        if (!lwcName) return '';
        const folder = this.data.lwcComponents?.[lwcName]?.folder;
        if (folder) {
            return `[${this._esc(lwcName)}](../source/folder-${this._safeName(folder)}.md)`;
        }
        return `[${this._esc(lwcName)}](../ui/index.md)`;
    }

    _flowTouchedObjects(flowData) {
        const objects = new Set();
        for (const item of flowData.recordLookups || []) {
            if (item.object) objects.add(item.object);
        }
        for (const item of flowData.recordUpdates || []) {
            if (item.object) objects.add(item.object);
        }
        for (const item of flowData.recordCreates || []) {
            if (item.object) objects.add(item.object);
        }
        return this._uniqueSorted(Array.from(objects));
    }

    _siteHref(docPath) {
        if (!docPath) return '';
        if (docPath.startsWith('#')) return docPath;

        const normalized = String(docPath).replace(/\\/g, '/');
        const withoutIndex = normalized.replace(/(^|\/)index\.md$/, '$1');
        const route = withoutIndex.endsWith('.md')
            ? withoutIndex.slice(0, -3) + '/'
            : withoutIndex;

        return route || './';
    }
}
