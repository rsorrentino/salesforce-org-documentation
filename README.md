# Salesforce Documentation Portal

A static site generator that transforms Salesforce repository metadata into a comprehensive, searchable, and visually rich technical documentation website.

## Overview

This tool analyzes Salesforce XML metadata and generates interconnected HTML documentation covering security, data models, automation, code, UI components, integrations, architecture, and deployment. The output is a fully static site requiring no backend to serve.

**Typical stats from a large org:**
- 40–200 Profiles / Permission Sets
- 1,000–2,000+ Apex Classes
- 200–1,600+ LWC/Aura Components
- 50–400 Flows

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

### Pointing at a custom Salesforce repo

By default the tool looks for Salesforce metadata in the **parent directory** of this project. You can override this in three equivalent ways:

```bash
# 1. CLI flag (recommended)
node generate.js --source=../my-salesforce-repo

# 2. Environment variable
SOURCE_DIR=../my-salesforce-repo npm run generate

# 3. Legacy positional argument
node generate.js ../my-salesforce-repo
```

The path is resolved to an absolute path, validated, and logged at startup. An error message with usage hints is printed if the directory does not exist.

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
| `SOURCE_DIR`   | `../`   | Path to the Salesforce metadata repository   |
| `PORT`         | `8000`  | Port for the local dev server                |
| `DOCS_BASE_URL`| —       | Base URL used when generating `sitemap.xml`  |
| `PULL_CHANGES` | `true`  | Whether `update.js` pulls git changes        |

---

## What Gets Generated

The portal produces documentation across these sections:

| Section | Description |
|---|---|
| **Security & Access** | Profiles, permission sets, permission matrices, per-profile drilldown |
| **Data Model** | Custom objects, fields, relationships (UML diagrams) |
| **Automation** | Flows with Mermaid diagrams, "Where it is Used" cross-refs, triggers, validation rules |
| **Apex Code** | Classes and triggers with cross-references to objects and flows |
| **UI Layer** | LWC/Aura components, FlexiPages, and which flows each Lightning page embeds |
| **Integrations** | Named credentials and external system connections |
| **Architecture** | Functional dependency maps (UI → Flows → Apex → Objects) |
| **Deployment** | Release notes and change tracking |
| **Maintenance** | What Changed diff report, documentation health, orphaned artifacts |
| **Search** | Full-text search index across all metadata types |
| **Sitemap** | `sitemap.xml` for SEO and navigation |

---

## Architecture

```
documentation-portal/
├── generate.js          # Main entry point — orchestrates all generators
├── analyzer.js          # Parses Salesforce XML metadata into relationship maps
├── init.js              # Sets up directory structure (idempotent)
├── serve.js             # Local HTTP dev server (port 8000)
├── update.js            # Git pull + regenerate
├── cleanup.js           # Removes generated output
├── link-checker.js      # Validates all links in generated pages
├── config.js            # Output format, MkDocs settings, and Pandoc path configuration
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
│   ├── MkDocsGenerator.js   # Generates Markdown pages + mkdocs.yml
│   ├── PandocImporter.js    # Imports pandoc-generated Markdown folders
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

- **Mermaid diagrams (v11)** — Flow charts, architecture views, and UML data models rendered client-side with a **Full Screen** button for mobile/tablet use; loading placeholder shown while rendering
- **Full-text search** — Per-type JSON search indices with a global search bar (Ctrl+K); ESC clears the field and closes results
- **Dark mode** — Client-side toggle with CSS variable theming (Mermaid node colors update automatically)
- **Ask AI panel** — Slide-in drawer with suggestion chips and textarea (backend integration ready)
- **Security matrix** — Object-level access across all profiles in one view
- **Functional dependency maps** — Traces a user action from UI component through Flow to Apex to Object
- **Flow "Where it is Used"** — Shows objects accessed, Apex classes called, and Lightning Pages that embed each flow
- **FlexiPage → Flow relationships** — Detects `flowruntime:interview` components in FlexiPage XML and maps them bidirectionally
- **Profile navigation maps** — Use-case-driven browsing of permissions
- **Safe object links** — Permission drilldown pages only link to objects that have generated pages (no 404s for standard objects)
- **What Changed diff report** — Compares current metadata snapshot to previous build and highlights additions/removals
- **Link validation** — Built-in checker reports broken internal and external links (0 broken links across 3,800+ pages)
- **Mobile-responsive navigation** — Hamburger sidebar with overlay tap-to-close on small screens
- **Accessibility** — Skip links, ARIA labels, semantic HTML, keyboard-navigable sidebar
- **SEO** — Canonical links, robots meta, generated sitemap
- **404 page** — Custom error page with navigation links


---

## MkDocs Integration

The portal can generate a complete **MkDocs-compatible documentation site** from the same Salesforce metadata.

### Quick start

```bash
# 1. Install Python MkDocs dependencies (once)
#    requirements.txt pins mkdocs<2.0 and mkdocs-material<10.0 to avoid the
#    incompatible MkDocs 2.0 fork. See https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/
pip install -r requirements.txt

# 2. Generate Markdown files + mkdocs.yml
npm run generate:markdown

# 3. Preview in the browser
npm run serve:mkdocs        # runs: mkdocs serve

# 4. Build a static site for deployment
npm run build:mkdocs        # runs: mkdocs build  →  outputs to site/
```

### Output structure

```
docs/                        # generated Markdown files
├── index.md                 # dashboard overview
├── apex/
│   ├── index.md             # all Apex classes
│   └── <ClassName>.md       # individual class detail
├── objects/
│   ├── index.md
│   └── <ObjectName>.md
├── automation/index.md
├── profiles/index.md
├── ui/index.md
├── integrations/index.md
├── architecture/index.md    # includes Mermaid architecture diagram
├── deployment/index.md
├── maintenance/index.md
├── custommetadata/index.md
└── functional/              # pandoc-imported pages (if configured)
    └── <section>/
        └── *.md
mkdocs.yml                   # auto-generated MkDocs configuration
```

### Output format options

| Script | `OUTPUT_FORMAT` | Behaviour |
|--------|-----------------|-----------|
| `npm run generate` | `html` (default) | Generates static HTML pages only |
| `npm run generate:markdown` | `markdown` | Generates MkDocs Markdown + mkdocs.yml only |
| `npm run generate:both` | `both` | Generates both HTML pages **and** Markdown |

You can also pass the variable inline:

```bash
OUTPUT_FORMAT=markdown node generate.js --source=../my-salesforce-repo
```

### Customising mkdocs.yml

Edit **`config.js`** in the portal root to change the site name, theme, plugins, or Markdown extensions. A full reference is included as inline comments in that file.

For site-specific overrides that you don't want to commit, copy the file to `docs.config.local.js`—it takes precedence automatically:

```bash
cp config.js docs.config.local.js
# edit docs.config.local.js ...
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `OUTPUT_FORMAT` | `html` | `html`, `markdown`, or `both` |
| `DOCS_OUTPUT_DIR` | `docs` | Output directory for Markdown files |
| `MKDOCS_SITE_NAME` | `Salesforce Technical Documentation` | Site title in mkdocs.yml |
| `MKDOCS_SITE_AUTHOR` | — | Author field in mkdocs.yml |

---

## Pandoc Integration

If your team uses **[Pandoc](https://pandoc.org/)** to convert Word documents, PDFs, or other formats into Markdown (e.g. functional specifications), the portal can automatically include those files in the MkDocs documentation.

### Configuration

In **`config.js`** (or your `docs.config.local.js`), set the `pandocPaths` array:

```js
pandocPaths: [
  {
    path: '/absolute/path/to/functional-specs',   // where pandoc wrote the .md files
    section: 'functional-specs',                   // sub-folder name under docs/functional/
    title: 'Functional Specifications'             // nav label in mkdocs.yml
  },
  {
    path: '../business-requirements',              // relative paths work too
    section: 'business-requirements',
    title: 'Business Requirements'
  }
]
```

### How it works

1. The `PandocImporter` recursively finds all `.md` files in each configured folder.
2. Files are copied to `docs/functional/<section>/` preserving their sub-directory structure.
3. If a file lacks YAML front-matter, one is injected automatically with `tags: [functional, pandoc, <section>]`.
4. The MkDocs navigation (`mkdocs.yml`) is automatically extended with a **Functional Documentation** section.

### Typical pandoc workflow

```bash
# Convert a Word document to Markdown
pandoc -f docx -t markdown -o functional-specs/my-spec.md my-spec.docx

# Now generate the full docs (HTML + MkDocs with pandoc-imported specs)
OUTPUT_FORMAT=both node generate.js --source=../my-salesforce-repo
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `fast-xml-parser` | Parse Salesforce XML metadata files |
| `mermaid` | Diagram generation (flows, architecture) |
| `glob` *(dev)* | File pattern matching during generation |
| `http-server` *(dev)* | Simple local HTTP server for previewing output |

---

## Troubleshooting

### Mermaid diagrams not rendering

- The bundled `js/vendor/mermaid.min.js` (v11) is loaded offline — no CDN required. Verify the file exists after `npm install`.
- Diagrams require `securityLevel: 'loose'` (already set in `js/app.js`). If your Content-Security-Policy blocks inline scripts, diagrams will silently fail.
- Large diagrams (hundreds of nodes) can exceed Mermaid's default depth limit. The functional map caps nodes per type to stay within limits.
- A "Rendering diagram…" loading placeholder is shown while Mermaid processes — this disappears once rendering completes (or is replaced by an error message).
- A fallback error message is displayed in place of each broken diagram — check the browser console for the Mermaid parse error.
- **"Could not find a suitable point"** — This error occurs when a flow element is named `Start` or `End`, colliding with the synthetic terminal nodes. The generator skips definitions for these reserved names automatically.
- **Black node boxes on mobile/tablet** — Fixed in CSS (Mermaid v11 changed rectangle nodes from `<rect>` to `<path class="basic">`). Both selectors are now targeted.
- **Diagram unreadable on small screen** — Use the **Full Screen** button above each diagram to open it in a fullscreen overlay with pan/scroll support.

### Missing or empty sections

- Sections like **Flows**, **Objects**, and **Apex** are only populated when the Salesforce repo contains the relevant metadata folders (`force-app/main/default/flows/`, etc.).
- If a section shows "No data found", verify `--source` points to the correct repository root and that the metadata has been retrieved (`sf project retrieve start`).

### Broken links in generated pages

Run `npm run link-check` to get a full report. Most broken links indicate:
- A metadata file was renamed or removed since the last generation
- An individual detail page was not generated (check for errors in the console during `generate`)

### Slow generation on large orgs

For repos with 1 000+ Apex classes or 100+ profiles:
- Run `npm run generate` once and use `npm run update` for incremental regeneration
- The `DiffGenerator` snapshots metadata between runs and only surfaces changed items in the "What Changed" page

### Source directory not found

```
Error: Source directory not found: /path/to/repo
Usage: node generate.js --source=<path>
```

The path passed via `--source` or `SOURCE_DIR` does not exist or is not accessible. Use an absolute path to avoid working-directory ambiguity.
