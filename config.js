/**
 * Salesforce Documentation Portal - Configuration
 *
 * Controls output format, MkDocs settings, and Pandoc path ingestion.
 *
 * Quick-start overrides (two options):
 *   1. Set environment variables:
 *        OUTPUT_FORMAT=markdown node generate.js
 *   2. Copy this file to docs.config.local.js, edit it there, and the
 *      local file will automatically take precedence.
 */

export const config = {
    // ─── Source Repository (optional) ────────────────────────────────────────
    // When set, documentation pages will show an additional "Open in repository"
    // link that points directly to the file in the remote source repository
    // (e.g. GitHub or GitLab).
    //
    // Example:
    //   sourceRepoUrl: 'https://github.com/myorg/myrepo/blob/main'
    //   (do NOT include a trailing slash)
    //
    // Leave empty (default) to rely solely on the built-in embedded viewer.
    sourceRepoUrl: process.env.SOURCE_REPO_URL || '',

    // ─── Output Format ────────────────────────────────────────────────────────
    // 'html'     – generate static HTML pages (original behaviour, default)
    // 'markdown' – generate Markdown files suitable for MkDocs
    // 'both'     – generate both HTML pages AND Markdown/MkDocs output
    outputFormat: process.env.OUTPUT_FORMAT || 'html',

    // Directory (relative to this tool's location) where Markdown docs are written.
    // MkDocs expects this to be named 'docs' by default.
    docsOutputDir: process.env.DOCS_OUTPUT_DIR || 'docs',

    // ─── MkDocs Configuration ─────────────────────────────────────────────────
    // These values are used to generate mkdocs.yml.
    // Install dependencies with:
    //   pip install -r requirements.txt
    mkdocs: {
        site_name: process.env.MKDOCS_SITE_NAME || 'Salesforce Technical Documentation',
        site_description: 'Auto-generated Salesforce Org Documentation Portal',
        site_author: process.env.MKDOCS_SITE_AUTHOR || '',

        // MkDocs theme. Recommended: 'material' (requires mkdocs-material).
        // Alternatives: 'readthedocs', 'mkdocs' (built-in, no extra install).
        theme: {
            name: 'material',
            palette: [
                {
                    scheme: 'default',
                    primary: 'red',
                    accent: 'red',
                    toggle: {
                        icon: 'material/brightness-7',
                        name: 'Switch to dark mode'
                    }
                },
                {
                    scheme: 'slate',
                    primary: 'red',
                    accent: 'red',
                    toggle: {
                        icon: 'material/brightness-4',
                        name: 'Switch to light mode'
                    }
                }
            ],
            features: [
                'navigation.tabs',
                'navigation.sections',
                'navigation.expand',
                'search.suggest',
                'search.highlight',
                'content.code.copy'
            ]
        },

        // MkDocs plugins (must be installed separately via pip).
        plugins: ['search'],

        // Python-Markdown extensions to enable.
        // pymdownx.superfences is required for Mermaid diagram code blocks.
        // pymdownx.tabbed requires alternate_style: true for Material for MkDocs.
        markdown_extensions: [
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
                            // Raw YAML tag – emitted verbatim in mkdocs.yml
                            format: { __yaml_raw: '!!python/name:pymdownx.superfences.fence_code_format' }
                        }
                    ]
                }
            },
            { 'pymdownx.tabbed': { alternate_style: true } },
            'pymdownx.highlight'
        ],

        // Extra CSS / JS files placed inside the docs directory.
        extra_css: [],
        extra_javascript: [],

        // Glob patterns for documentation pages that are intentionally not included
        // in the nav sidebar.  MkDocs 1.5+ uses these patterns to suppress INFO/WARNING
        // messages about "orphaned" pages that exist in docs/ but are reachable only via
        // links (e.g. individual source-viewer, Apex-class, and Object pages).
        // Defaults: ['source/*.md', 'apex/*.md', 'objects/*.md']
        // not_in_nav_patterns: ['source/*.md', 'apex/*.md', 'objects/*.md']

        // Development server address used by `mkdocs serve`.
        // MkDocs defaults to 127.0.0.1:8000, but port 8000 is sometimes blocked on
        // Windows (WinError 10013) when Hyper-V, Docker Desktop, or WSL2 is active and
        // has placed port 8000 in the excluded ephemeral-port range.  Using port 8001
        // avoids this problem while remaining easy to remember.
        // Override via the MKDOCS_DEV_ADDR environment variable.
        dev_addr: process.env.MKDOCS_DEV_ADDR || '127.0.0.1:8001',

        // Maximum number of lines to embed from a source file in the source-viewer
        // Markdown pages generated under docs/source/.  Limiting this prevents very
        // large Apex classes, Flow XML files, or LWC bundles from creating enormous
        // Markdown pages that cause MkDocs / Pygments to spend minutes on syntax-
        // highlighting, which is the main driver of slow `mkdocs build` times on orgs
        // with hundreds of components.
        // Set to 0 (or remove) to embed the full file with no limit.
        max_source_lines: parseInt(process.env.MKDOCS_MAX_SOURCE_LINES || '500', 10),
    },

    // ─── Pandoc-Generated Folder Ingestion ────────────────────────────────────
    // List folders whose Markdown files (produced by pandoc) should be copied
    // into the docs/functional/<section>/ tree and added to the MkDocs nav.
    //
    // Each entry:
    //   path    – absolute path OR path relative to this config file's directory
    //   section – slug used as the sub-folder name under docs/functional/
    //   title   – human-readable nav label shown in mkdocs.yml
    //
    // Example:
    //   pandocPaths: [
    //     {
    //       path: '/absolute/path/to/functional-specs',
    //       section: 'functional-specs',
    //       title: 'Functional Specifications'
    //     },
    //     {
    //       path: '../business-requirements',
    //       section: 'business-requirements',
    //       title: 'Business Requirements'
    //     }
    //   ]
    pandocPaths: []
};
