# Salesforce Documentation Portal

A static site generator that transforms Salesforce repository metadata into a comprehensive, searchable, and visually rich technical documentation website.

## Overview

This tool analyzes Salesforce XML metadata and generates interconnected HTML documentation covering security, data models, automation, code, UI components, integrations, architecture, and deployment. The output is a fully static site requiring no backend to serve.

**Key stats generated from the current repo:**
- 47 Profiles
- 2,000+ Apex Classes
- 1,625 LWC/Aura Components
- 337 Flows

---

## Requirements

- Node.js >= 16.0.0
- npm

---

## Installation

```bash
cd documentation-portal
npm install
```

---

## Usage

### First-time setup

```bash
npm run init       # Initialize directory structure and templates
npm run generate   # Analyze metadata and generate all pages
```

### Daily workflow

```bash
npm run dev        # Generate docs + start local server (combined)
npm run serve      # Serve already-generated docs on http://localhost:8000
npm run update     # Pull latest git changes + regenerate
```

### Maintenance

```bash
npm run cleanup    # Remove all generated files (pages/, index.html, data caches)
npm run reset      # Cleanup + reinitialize from scratch
npm run fresh      # Cleanup + regenerate (full rebuild)
```

### Validation

```bash
npm run link-check       # Validate all internal/external links (fails on broken)
npm run link-check:warn  # Validate links (warnings only, no failure)
npm run ci               # Generate + link-check (for CI/CD pipelines)
```

---

## Environment Variables

| Variable        | Default | Description                                  |
|----------------|---------|----------------------------------------------|
| `PORT`         | `8000`  | Port for the local dev server                |
| `DOCS_BASE_URL`| —       | Base URL used when generating `sitemap.xml`  |
| `PULL_CHANGES` | `true`  | Whether `update.js` pulls git changes        |

---

## What Gets Generated

The portal produces documentation across these sections:

| Section | Description |
|---|---|
| **Security & Access** | Profiles, permission sets, permission matrices |
| **Data Model** | Custom objects, fields, relationships (UML diagrams) |
| **Automation** | Flows with visual diagrams, triggers, validation rules |
| **Apex Code** | Classes and triggers with cross-references |
| **UI Layer** | LWC/Aura components, Flex pages, Lightning layouts |
| **Integrations** | Named credentials and external system connections |
| **Architecture** | Functional dependency maps (UI → Flows → Apex → Objects) |
| **Deployment** | Release notes and change tracking |
| **Maintenance** | Documentation health, coverage gaps, orphaned artifacts |
| **Search** | Full-text search index across all metadata types |
| **Sitemap** | `sitemap.xml` for SEO and navigation |

---

## Architecture

```
documentation-portal/
├── generate.js          # Main entry point — orchestrates all generators
├── analyzers.js         # Parses Salesforce XML metadata into relationship maps
├── init.js              # Sets up directory structure (idempotent)
├── serve.js             # Local HTTP dev server (port 8000)
├── update.js            # Git pull + regenerate
├── cleanup.js           # Removes generated output
├── link-checker.js      # Validates all links in generated pages
├── generators/          # Modular generator classes (one per documentation section)
│   ├── BaseGenerator.js
│   ├── ApexGenerator.js
│   ├── FlowsGenerator.js
│   ├── ObjectsGenerator.js
│   ├── ProfilesGenerator.js
│   ├── UIGenerator.js
│   ├── AutomationGenerator.js
│   ├── IntegrationsGenerator.js
│   ├── ArchitectureGenerator.js
│   ├── CrossReferenceGenerator.js
│   ├── DashboardGenerator.js
│   ├── DeploymentGenerator.js
│   ├── DiffGenerator.js
│   ├── FunctionalMapGenerator.js
│   ├── MaintenanceGenerator.js
│   ├── PermissionDrilldownGenerator.js
│   ├── CustomMetadataGenerator.js
│   ├── SearchIndexGenerator.js
│   ├── SitemapGenerator.js
│   └── index.js
├── css/styles.css       # Amplifon-branded stylesheet with dark mode support
├── js/app.js            # Frontend search and navigation logic
├── js/vendor/           # Bundled libraries (Mermaid.js for diagrams)
├── templates/           # HTML page templates ({{PLACEHOLDER}} syntax)
├── pages/               # Generated HTML output (git-tracked or excluded)
└── data/                # Cached metadata snapshots and search indices
```

### Generator pattern

Every section generator extends `BaseGenerator` and is independently invokable. `generate.js` instantiates all generators and runs them in sequence after the metadata analysis phase completes.

---

## Features

- **Mermaid diagrams** — Flow charts, architecture views, and UML data models rendered client-side
- **Full-text search** — Per-type JSON search indices with a global search bar (Ctrl+K)
- **Dark mode** — Client-side toggle with CSS variable theming
- **Security matrix** — Object-level access across all profiles in one view
- **Functional dependency maps** — Traces a user action from UI component through Flow to Apex to Object
- **Profile navigation maps** — Use-case-driven browsing of permissions
- **Link validation** — Built-in checker reports broken internal and external links
- **Accessibility** — Skip links, ARIA labels, semantic HTML
- **SEO** — Canonical links, robots meta, generated sitemap

---

## Dependencies

| Package | Purpose |
|---|---|
| `fast-xml-parser` | Parse Salesforce XML metadata files |
| `xml2js` | Supplementary XML parsing |
| `mermaid` | Diagram generation (flows, architecture) |
| `glob` *(dev)* | File pattern matching during generation |
| `http-server` *(dev)* | Simple local HTTP server for previewing output |
