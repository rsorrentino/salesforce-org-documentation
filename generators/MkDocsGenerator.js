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
        await this._generateAutomationDocs();
        await this._generateProfilesDocs();
        await this._generateUIDocs();
        await this._generateIntegrationsDocs();
        await this._generateArchitectureDocs();
        await this._generateDeploymentDocs();
        await this._generateMaintenanceDocs();
        await this._generateCustomMetadataDocs();
        await this._generateSourceDocs();

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
            'maintenance', 'custommetadata', 'functional', 'source'
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
        ];

        const tableRows = rows
            .map(([label, count, link]) =>
                `| [${label}](${link}) | **${count}** |`)
            .join('\n');

        const md = `---
title: Salesforce Org Documentation
description: Auto-generated technical documentation for the Salesforce organisation.
tags:
  - salesforce
  - overview
---

# Salesforce Technical Documentation

> Generated on **${new Date().toUTCString()}**

## Organisation Summary

| Section | Count |
|---------|-------|
${tableRows}

## Sections

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
`;

        await this._writeMd('index.md', md);
    }

    /** Apex classes section */
    async _generateApexDocs() {
        const classes = Object.entries(this.data.apexClasses || {});
        const triggers = Object.entries(this.data.triggers || {});

        // Overview index
        const classRows = classes.map(([name, cls]) => {
            const sourceCell = cls.file ? `[📄 View Source](../source/file-${this._safeName(cls.file)}.md)` : '';
            return `| [${this._esc(name)}](${name}.md) | ${sourceCell} |`;
        }).join('\n');

        const triggerRows = triggers.map(([name, t]) => {
            const sourceCell = t.file ? `[📄 View Source](../source/file-${this._safeName(t.file)}.md)` : '';
            return `| ${this._esc(name)} | ${this._esc(t.object || '')} | ${sourceCell} |`;
        }).join('\n');

        const overviewMd = `---
title: Apex Classes & Triggers
description: All Apex classes and triggers in this Salesforce org.
tags:
  - apex
  - salesforce
---

# Apex Classes & Triggers

## Apex Classes (${classes.length})

| Class Name | Source |
|------------|--------|
${classRows || '| *(none found)* | |'}

## Apex Triggers (${triggers.length})

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

        const referencedObjects = (cls.referencedObjects || [])
            .map(o => `- \`${this._esc(o)}\``)
            .join('\n');

        const sourceLink = cls.file
            ? `| **Source File** | [📄 ${this._esc(cls.file)}](../source/file-${this._safeName(cls.file)}.md) |`
            : '';

        const md = `---
title: "${this._esc(name)}"
description: "Apex class documentation for ${this._esc(name)}"
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
${referencedObjects ? `## Referenced Objects\n\n${referencedObjects}\n` : ''}
`;
        await this._writeMd(`apex/${name}.md`, md);
    }

    /** Custom objects / data model section */
    async _generateObjectsDocs() {
        const objects = Object.entries(this.data.objects || {});

        const overviewRows = objects.map(([name, obj]) => {
            const fieldCount = (obj.fields || []).length;
            return `| [${this._esc(name)}](${name}.md) | ${this._esc(obj.label || '')} | ${fieldCount} |`;
        }).join('\n');

        const overviewMd = `---
title: Custom Objects & Data Model
description: All custom objects and their fields in this Salesforce org.
tags:
  - objects
  - data-model
  - salesforce
---

# Custom Objects & Data Model

## Custom Objects (${objects.length})

| API Name | Label | Fields |
|----------|-------|--------|
${overviewRows || '| *(none found)* | | |'}
`;
        await this._writeMd('objects/index.md', overviewMd);

        for (const [name, obj] of objects) {
            await this._generateObjectPage(name, obj);
        }
    }

    async _generateObjectPage(name, obj) {
        const fields = (obj.fields || []).map(f =>
            `| \`${this._esc(f.fullName || f.name || '')}\` | ${this._esc(f.label || '')} | ${this._esc(f.type || '')} | ${f.required ? 'Yes' : 'No'} |`
        ).join('\n');

        const relationships = (obj.relationships || []).map(r =>
            `| ${this._esc(r.name || '')} | ${this._esc(r.relatedObject || '')} | ${this._esc(r.type || '')} |`
        ).join('\n');

        const md = `---
title: "${this._esc(name)}"
description: "Object documentation for ${this._esc(name)}"
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

${fields ? `## Fields\n\n| API Name | Label | Type | Required |\n|----------|-------|------|----------|\n${fields}\n` : '## Fields\n\n*(no fields found)*\n'}
${relationships ? `## Relationships\n\n| Relationship Name | Related Object | Type |\n|-------------------|----------------|------|\n${relationships}\n` : ''}
`;
        await this._writeMd(`objects/${name}.md`, md);
    }

    /** Automation section – flows, triggers, validation rules */
    async _generateAutomationDocs() {
        const flows = Object.entries(this.data.flows || {});
        const triggers = Object.entries(this.data.triggers || {});
        const validationRules = this.data.validationRules || {};

        const flowRows = flows.map(([name, f]) => {
            const sourceCell = f.file ? `[📄 View Flow XML](../source/file-${this._safeName(f.file)}.md)` : '';
            return `| ${this._esc(name)} | ${this._esc(f.processType || f.type || '')} | ${this._esc(f.status || '')} | ${sourceCell} |`;
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
tags:
  - automation
  - flows
  - triggers
  - salesforce
---

# Automation & Flows

## Flows (${flows.length})

| Flow Name | Type | Status | Source |
|-----------|------|--------|--------|
${flowRows || '| *(none found)* | | | |'}

## Apex Triggers (${triggers.length})

| Trigger Name | Object | Events | Source |
|-------------|--------|--------|--------|
${triggerRows || '| *(none found)* | | | |'}

## Validation Rules (${vrTotal})

| Object | Rule Name | Description |
|--------|-----------|-------------|
${vrRows || '| *(none found)* | | |'}

${mermaidFlows ? `## Flow Landscape (first 20)

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
tags:
  - ui
  - lwc
  - aura
  - flexipage
  - salesforce
---

# UI Components

## Lightning Web Components – LWC (${lwc.length})

| Component Name | Source |
|----------------|--------|
${lwcRows || '| *(none found)* | |'}

## Aura Components (${aura.length})

| Component Name |
|----------------|
${auraRows || '| *(none found)* |'}

## Flexible Pages – FlexiPages (${flexi.length})

| Page Name |
|-----------|
${flexiRows || '| *(none found)* |'}

## Visualforce Pages (${vf.length})

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
| **Documentation Generated** | ${new Date().toUTCString()} |
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

        const md = `---
title: "${this._esc(name)} – Source"
description: "Source code for ${this._esc(name)}"
---

# 📄 ${this._esc(fileName)}

**Path:** \`${relativeFilePath}\`

\`\`\`${lang}
${content}
\`\`\`
`;
        await this._writeMd(`source/file-${safeName}.md`, md);
    }

    /** Write a markdown source-folder browser page. */
    async _writeSourceFolderMd(relativeFolderPath, name) {
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
title: "${this._esc(name)} – Source Folder"
description: "Source folder browser for ${this._esc(name)}"
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

    // ─────────────────────────────────────────────────────────────────────────
    // mkdocs.yml generation
    // ─────────────────────────────────────────────────────────────────────────

    async _generateMkDocsConfig() {
        const mkdocsCfg = this.config.mkdocs || {};
        const docsDir = path.basename(this.docsDir);

        const nav = this._buildNav();

        const yml = this._renderYaml({
            site_name:        mkdocsCfg.site_name        || 'Salesforce Technical Documentation',
            site_description: mkdocsCfg.site_description || 'Auto-generated Salesforce Org Documentation Portal',
            ...(mkdocsCfg.site_author ? { site_author: mkdocsCfg.site_author } : {}),
            docs_dir: docsDir,
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
            ...(mkdocsCfg.extra_css  && mkdocsCfg.extra_css.length  ? { extra_css:        mkdocsCfg.extra_css        } : {}),
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
                    { 'Documentation Health':'maintenance/index.md' }
                ]
            },
            {
                Source: [
                    { 'Source Navigator': 'source/index.md' }
                ]
            }
        ];

        if (this.pandocNavEntries.length > 0) {
            nav.push({ 'Functional Documentation': this.pandocNavEntries });
        }

        return nav;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // File I/O helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Write a markdown file to the docs directory. */
    async _writeMd(relativePath, content) {
        const fullPath = path.join(this.docsDir, relativePath);
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
}
