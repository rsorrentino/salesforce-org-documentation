/**
 * Base Generator Class
 * 
 * Provides common utilities and methods for all documentation generators.
 * All specific generators should extend this class.
 */

import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

export class BaseGenerator {
    /**
     * Initialize the base generator
     * @param {string} repoRoot - Root path of the Salesforce repository
     * @param {Object} data - Shared data object containing all analyzed metadata
     */
    constructor(repoRoot, data, toolDir) {
        this.repoRoot = path.resolve(repoRoot);
        this.outputDir = toolDir ? path.resolve(toolDir) : path.join(this.repoRoot, 'documentation-portal');
        this.templatesDir = path.join(this.outputDir, 'templates');
        this.pagesDir = path.join(this.outputDir, 'pages');
        this.data = data;
        
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseAttributeValue: true,
            trimValues: true
        });
    }
    
    /**
     * Get the template directory for a specific type
     * @param {string} type - Type of generator (e.g., 'flows', 'profiles')
     * @returns {string} Path to template directory
     */
    getTemplateDir(type) {
        return path.join(this.templatesDir, type);
    }
    
    /**
     * Get the pages directory for a specific type
     * @param {string} type - Type of generator (e.g., 'flows', 'profiles')
     * @returns {string} Path to pages directory
     */
    getPagesDir(type) {
        const pagesTypeDir = path.join(this.pagesDir, type);
        // Ensure directory exists
        return pagesTypeDir;
    }
    
    /**
     * Read a template file and replace placeholders with data
     * @param {string} templatePath - Path to template file
     * @param {Object} data - Data object with placeholder values
     * @returns {string} Rendered HTML
     */
    async renderTemplate(templatePath, data = {}) {
        try {
            let template = await fs.readFile(templatePath, 'utf-8');
            
            // Replace all placeholders {{KEY}} with values from data object
            for (const [key, value] of Object.entries(data)) {
                const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                const safeValue = typeof value === 'string' ? value : String(value);
                template = template.replace(placeholder, safeValue);
            }
            
            // Replace any remaining placeholders with empty string or 0 for counts
            template = template.replace(/\{\{([A-Z_]+)_COUNT\}\}/g, '0');
            template = template.replace(/\{\{[A-Z_]+\}\}/g, '');
            
            return template;
        } catch (error) {
            console.error(`Error reading template ${templatePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Write a page to the output directory
     * @param {string} type - Type of page (e.g., 'flows', 'profiles')
     * @param {string} filename - Filename for the page
     * @param {string} content - HTML content
     */
    async writePage(type, filename, content) {
        // Backward-compatible signature:
        // writePage(type, filename, content, options?)
        // If a 4th argument is passed, it will be used to standardize layout/navigation.
        const options = arguments.length >= 4 ? arguments[3] : {};
        const pagesDir = this.getPagesDir(type);
        await fs.mkdir(pagesDir, { recursive: true });

        let finalContent = content;
        if (options && options.standardizeLayout) {
            finalContent = this.standardizePageLayout(finalContent, options);
        }

        const outputPath = path.join(pagesDir, filename);
        await fs.writeFile(outputPath, finalContent, 'utf-8');
    }

    /**
     * Build a consistent header (logo, top nav, breadcrumb, global search).
     * @param {Object} opts
     * @param {number} opts.depthToRoot
     * @param {string} opts.breadcrumbHtml - Full <nav class="breadcrumb">...</nav>
     * @param {string} opts.activeTop - 'guides' | 'api' | 'deployment'
     */
    buildStandardHeader({ depthToRoot = 2, breadcrumbHtml = '', activeTop = 'guides' } = {}) {
        const rootPrefix = '../'.repeat(Math.max(0, depthToRoot));
        const guidesHref = `${rootPrefix}index.html`;
        const apiHref = `${rootPrefix}pages/cross-reference/index.html`;
        const deploymentHref = `${rootPrefix}pages/deployment/index.html`;
        const activeClass = (key) => (key === activeTop ? ' class="active"' : '');
        const breadcrumb = breadcrumbHtml || '<nav class="breadcrumb"></nav>';
        return `
<header>
    <div class="header-left">
        <h1 class="logo"><a href="${guidesHref}">Salesforce Technical Documentation</a></h1>
    </div>
    <nav class="top-nav">
        <a href="${guidesHref}"${activeClass('guides')}>Guides</a>
        <a href="${apiHref}"${activeClass('api')}>API Reference</a>
        <a href="${deploymentHref}"${activeClass('deployment')}>Deployment</a>
    </nav>
    <div class="header-breadcrumb">
        ${breadcrumb}
    </div>
    <button class="theme-toggle" type="button" title="Toggle dark mode" aria-label="Toggle dark mode">
        <span class="theme-icon theme-icon-light" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
                <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"></path>
            </svg>
        </span>
        <span class="theme-icon theme-icon-dark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" fill="currentColor"></path>
            </svg>
        </span>
    </button>
    <div class="search-container" role="search">
        <label for="globalSearch" class="visually-hidden">Search documentation</label>
        <input type="text" class="search-box-header" placeholder="Ctrl+K Search" id="globalSearch" autocomplete="off" aria-label="Search documentation">
        <button class="ai-button" type="button" onclick="openAIChat()" aria-label="Ask AI">Ask AI</button>
    </div>
</header>
        `.trim();
    }

    standardizePageLayout(html, options = {}) {
        const {
            currentPage = '',
            currentSubPage = '',
            depthToRoot = 2,
            sectionNavHtml = '',
            activeTop = 'guides'
        } = options;
        const rootPrefix = '../'.repeat(Math.max(0, depthToRoot));

        // Extract breadcrumb (keep page-specific breadcrumb content)
        const breadcrumbMatch = html.match(/<nav class="breadcrumb">[\s\S]*?<\/nav>/);
        const breadcrumbHtml = breadcrumbMatch ? breadcrumbMatch[0] : '<nav class="breadcrumb"></nav>';

        // Replace header
        const standardHeader = this.buildStandardHeader({ depthToRoot, breadcrumbHtml, activeTop });
        let out = html.replace(/<header>[\s\S]*?<\/header>/, standardHeader);

        // Replace sidebar (inject optional section nav + standard navigation)
        const sidebarInner =
            `${sectionNavHtml ? sectionNavHtml.trim() + '\n' : ''}` +
            this.generateStandardNavigation(currentPage, currentSubPage, depthToRoot);

        out = out.replace(/<nav class="sidebar">[\s\S]*?<\/nav>/, `<nav class="sidebar">\n${sidebarInner}\n</nav>`);

        // Prefer offline Mermaid (no CDN)
        out = out.replace(
            /https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid\/dist\/mermaid\.min\.js/g,
            `${rootPrefix}js/vendor/mermaid.min.js`
        );

        return out;
    }
    
    /**
     * Generate pagination HTML
     * @param {number} currentPage - Current page number (1-based)
     * @param {number} totalPages - Total number of pages
     * @param {string} baseUrl - Base URL for pagination links (e.g., 'index.html' or hash anchor)
     * @returns {string} HTML for pagination controls
     */
    generatePagination(currentPage, totalPages, baseUrl = 'index.html') {
        if (totalPages <= 1) return '';
        
        // Extract hash from baseUrl if present
        const hashMatch = baseUrl.match(/#(.+)$/);
        const hash = hashMatch ? hashMatch[1] : '';
        const base = baseUrl.replace(/#.+$/, '');
        
        // Use query parameter for pagination (client-side JS will handle it)
        let html = '<div class="pagination">\n';
        
        // Previous button
        if (currentPage > 1) {
            const prevPage = currentPage - 1;
            const prevUrl = prevPage === 1 
                ? base + (hash ? `#${hash}` : '')
                : `${base}?page=${prevPage}${hash ? `#${hash}` : ''}`;
            html += `    <a href="${prevUrl}" class="pagination-btn pagination-prev">&larr; Previous</a>\n`;
        } else {
            html += '    <span class="pagination-btn pagination-prev pagination-disabled">&larr; Previous</span>\n';
        }
        
        // Page numbers
        html += '    <div class="pagination-numbers">\n';
        
        // Show first page
        if (currentPage > 3) {
            const firstUrl = base + (hash ? `#${hash}` : '');
            html += `        <a href="${firstUrl}" class="pagination-number">1</a>\n`;
            if (currentPage > 4) {
                html += '        <span class="pagination-ellipsis">...</span>\n';
            }
        }
        
        // Show pages around current
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, currentPage + 2);
        
        for (let i = start; i <= end; i++) {
            if (i === currentPage) {
                html += `        <span class="pagination-number pagination-active">${i}</span>\n`;
            } else {
                const pageUrl = i === 1 
                    ? base + (hash ? `#${hash}` : '')
                    : `${base}?page=${i}${hash ? `#${hash}` : ''}`;
                html += `        <a href="${pageUrl}" class="pagination-number">${i}</a>\n`;
            }
        }
        
        // Show last page
        if (currentPage < totalPages - 2) {
            if (currentPage < totalPages - 3) {
                html += '        <span class="pagination-ellipsis">...</span>\n';
            }
            const lastUrl = `${base}?page=${totalPages}${hash ? `#${hash}` : ''}`;
            html += `        <a href="${lastUrl}" class="pagination-number">${totalPages}</a>\n`;
        }
        
        html += '    </div>\n';
        
        // Next button
        if (currentPage < totalPages) {
            const nextUrl = `${base}?page=${currentPage + 1}${hash ? `#${hash}` : ''}`;
            html += `    <a href="${nextUrl}" class="pagination-btn pagination-next">Next &rarr;</a>\n`;
        } else {
            html += '    <span class="pagination-btn pagination-next pagination-disabled">Next &rarr;</span>\n';
        }
        
        html += '</div>\n';
        return html;
    }
    
    /**
     * Paginate an array of items
     * @param {Array} items - Array of items to paginate
     * @param {number} itemsPerPage - Number of items per page
     * @param {number} currentPage - Current page number (1-based)
     * @returns {Object} Object with paginated items and pagination info
     */
    paginateItems(items, itemsPerPage = 50, currentPage = 1) {
        const totalItems = items.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = items.slice(startIndex, endIndex);
        
        return {
            items: paginatedItems,
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            startIndex: startIndex + 1,
            endIndex: Math.min(endIndex, totalItems)
        };
    }
    
    /**
     * Parse XML file and return parsed object
     * @param {string} filePath - Path to XML file
     * @returns {Object|null} Parsed XML object or null on error
     */
    async parseXML(filePath) {
        try {
            await fs.access(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            return this.parser.parse(content);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Error parsing XML ${filePath}:`, error.message);
            }
            return null;
        }
    }
    
    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    /**
     * Sanitize node name for Mermaid diagram
     * @param {string} name - Node name to sanitize
     * @returns {string} Sanitized node name
     */
    sanitizeNodeName(name) {
        if (!name) return 'Node';
        return String(name)
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[0-9]/, 'N$&');
    }
    
    /**
     * Find files matching pattern recursively
     * @param {string} dir - Directory to search
     * @param {string} pattern - Glob pattern (e.g., '*.xml')
     * @returns {Promise<string[]>} Array of file paths
     */
    async findFiles(dir, pattern) {
        const files = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const regexPattern = '^' + pattern.replace(/\*/g, '__STAR__').replace(/\./g, '\\.').replace(/__STAR__/g, '.*') + '$';
            const regex = new RegExp(regexPattern);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const subFiles = await this.findFiles(fullPath, pattern);
                    files.push(...subFiles);
                } else if (entry.isFile()) {
                    if (entry.name.match(regex)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            // Directory doesn't exist, return empty array
        }
        return files;
    }
    
    /**
     * Helper to get text from XML element
     * @param {*} element - XML element
     * @param {string} defaultValue - Default value if element is empty
     * @returns {string} Text value
     */
    getText(element, defaultValue = '') {
        if (!element && element !== 0) return defaultValue;
        if (typeof element === 'string') return element;
        if (typeof element === 'number') return String(element);
        if (element['#text']) return element['#text'];
        if (Array.isArray(element) && element.length > 0) {
            return this.getText(element[0], defaultValue);
        }
        return defaultValue;
    }
    
    /**
     * Helper to find elements in parsed XML
     * @param {Object} root - Root XML object
     * @param {string} path - Dot-separated path (e.g., 'connector.targetReference')
     * @returns {Array} Array of matching elements
     */
    findElements(root, path) {
        if (!root) return [];
        const parts = path.split('.');
        let current = root;
        for (const part of parts) {
            if (Array.isArray(current)) {
                return current.flatMap(item => this.findElements(item, path));
            }
            if (current && typeof current === 'object') {
                current = current[part];
            } else {
                return [];
            }
        }
        if (current === undefined || current === null) return [];
        return Array.isArray(current) ? current : [current];
    }
    
    /**
     * Calculate relative path from a page to another resource
     * @param {string} fromType - Source page type
     * @param {string} toType - Target page type
     * @param {string} toFile - Target filename (optional)
     * @returns {string} Relative path
     */
    getRelativePath(fromType, toType, toFile = '') {
        if (fromType === toType && !toFile) {
            return './';
        }
        
        // Calculate depth difference
        const fromDepth = fromType.split('/').length;
        const toDepth = toType.split('/').length;
        
        // If same depth, use sibling path
        if (fromDepth === toDepth) {
            return `../${toType}/${toFile}`;
        }
        
        // Build path based on depth
        const upLevels = '../'.repeat(fromDepth);
        return `${upLevels}${toType}/${toFile}`;
    }
    
    /**
     * Generate breadcrumb navigation HTML
     * @param {Array} breadcrumbs - Array of {label, href} objects
     * @returns {string} HTML for breadcrumb
     */
    generateBreadcrumb(breadcrumbs) {
        const items = breadcrumbs.map((crumb, index) => {
            if (index === breadcrumbs.length - 1) {
                return `<span>${this.escapeHtml(crumb.label)}</span>`;
            }
            return `<a href="${crumb.href}">${this.escapeHtml(crumb.label)}</a>`;
        });
        return `<nav class="breadcrumb">${items.join(' / ')}</nav>`;
    }
    
    /**
     * Generate standard navigation menu HTML for sidebar.
     *
     * NOTE: This app is generated as static HTML under `documentation-portal/`.
     * Files live either at:
     * - `index.html` (depthToRoot = 0)
     * - `pages/<section>/index.html` (depthToRoot = 2)
     * - `pages/<section>/<detail>.html` (depthToRoot = 2)
     *
     * @param {string} currentPage - Current page identifier (e.g., 'profiles', 'apex', 'ui')
     * @param {string} currentSubPage - Current sub-page (e.g., 'index', 'navigation-map')
     * @param {number} depthToRoot - How many folders to go up to reach `documentation-portal/` root
     * @returns {string} HTML for navigation sidebar
     */
    generateStandardNavigation(currentPage = '', currentSubPage = '', depthToRoot = 2) {
        const rootPrefix = '../'.repeat(Math.max(0, depthToRoot));
        const pagesPrefix = `${rootPrefix}pages/`;
        const homePath = `${rootPrefix}index.html`;
        
        // Determine active section
        const isActive = (section) => {
            if (currentPage === section) return ' class="active"';
            return '';
        };
        
        let html = '<div class="nav-section">\n';
        html += '    <h3>Navigation</h3>\n';
        html += '    <ul>\n';
        html += `        <li><a href="${homePath}"${currentPage === '' ? ' class="active"' : ''}>Home</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}profiles/navigation-map.html"${currentPage === 'profiles' && currentSubPage === 'navigation-map' ? ' class="active"' : ''}>Profile Navigation</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}profiles/index.html"${currentPage === 'profiles' && currentSubPage !== 'navigation-map' ? ' class="active"' : ''}>Security & Access</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}objects/index.html"${isActive('objects')}>Data Model</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}ui/index.html"${isActive('ui')}>UI Layer</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}apex/index.html"${isActive('apex')}>Apex Layer</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}automation/index.html"${isActive('automation')}>Automation</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}integrations/index.html"${isActive('integrations')}>Integrations</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}architecture/index.html"${isActive('architecture')}>Architecture</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}deployment/index.html"${isActive('deployment')}>Deployment</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}maintenance/index.html"${isActive('maintenance')}>Maintenance & Support</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}cross-reference/index.html"${isActive('cross-reference')}>Cross-Reference</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}dashboard/index.html"${isActive('dashboard')}>Dashboard</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}custommetadata/index.html"${isActive('custommetadata')}>Custom Metadata</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}profiles/permission-drilldown.html"${currentPage === 'profiles' && currentSubPage === 'permission-drilldown' ? ' class="active"' : ''}>Permission Drilldown</a></li>\n`;
        html += `        <li><a href="${pagesPrefix}maintenance/changes.html"${currentPage === 'maintenance' && currentSubPage === 'changes' ? ' class="active"' : ''}>What Changed</a></li>\n`;
        html += '    </ul>\n';
        html += '</div>\n';
        
        return html;
    }
    
    /**
     * Generate "Where it is used" section HTML for Apex classes
     * @param {string} className - Name of the Apex class
     * @returns {string} HTML for whereUsed section
     */
    generateApexWhereUsed(className) {
        const relationships = this.data.relationships || {};
        const usedIn = [];
        
        // Used in LWC components
        if (relationships.classToLWC && relationships.classToLWC[className]) {
            const lwcList = relationships.classToLWC[className].map(lwc => {
                const safeName = lwc.replace(/[^a-zA-Z0-9]/g, '_');
                return `<a href="../ui/lwc-${safeName}.html" title="View LWC Component">${this.escapeHtml(lwc)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>LWC Components:</strong> ${lwcList}`);
        }
        
        // Used in Flows
        if (relationships.classToFlow && relationships.classToFlow[className]) {
            const flowList = relationships.classToFlow[className].map(flow => {
                return `<a href="../flows/flow-${this.sanitizeNodeName(flow)}.html" title="View Flow">${this.escapeHtml(flow)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Flows:</strong> ${flowList}`);
        }
        
        // Used in Triggers
        if (relationships.classToTrigger && relationships.classToTrigger[className]) {
            const triggerList = relationships.classToTrigger[className].map(trigger => {
                return `<a href="../automation/index.html" title="View Trigger">${this.escapeHtml(trigger)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Triggers:</strong> ${triggerList}`);
        }
        
        // Used in Aura Components
        if (relationships.classToAura && relationships.classToAura[className]) {
            const auraList = relationships.classToAura[className].map(aura => {
                return `<a href="../ui/index.html" title="View Aura Component">${this.escapeHtml(aura)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Aura Components:</strong> ${auraList}`);
        }
        
        // Used in Visualforce Pages
        if (relationships.classToVisualforce && relationships.classToVisualforce[className]) {
            const vfList = relationships.classToVisualforce[className].map(vf => {
                return `<a href="../ui/index.html" title="View Visualforce Page">${this.escapeHtml(vf)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Visualforce Pages:</strong> ${vfList}`);
        }
        
        if (usedIn.length === 0) {
            return '<p><em>This Apex class is not referenced by any other components.</em></p>';
        }
        
        return '<ul>' + usedIn.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
    
    /**
     * Generate "Where it is used" section HTML for LWC components
     * @param {string} lwcName - Name of the LWC component
     * @returns {string} HTML for whereUsed section
     */
    generateLWCWhereUsed(lwcName) {
        const relationships = this.data.relationships || {};
        const usedIn = [];
        
        // Used in FlexiPages
        if (relationships.lwcToFlexiPages && relationships.lwcToFlexiPages[lwcName]) {
            const pageList = relationships.lwcToFlexiPages[lwcName].map(page => {
                return `<a href="../ui/index.html#flexiPagesTable" title="View FlexiPages">${this.escapeHtml(page)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>FlexiPages:</strong> ${pageList}`);
        }
        
        // Used in other LWC components (if component references another LWC)
        if (relationships.lwcToLWC && relationships.lwcToLWC[lwcName]) {
            const lwcList = relationships.lwcToLWC[lwcName].map(lwc => {
                const safeLwc = lwc.replace(/[^a-zA-Z0-9]/g, '_');
                return `<a href="lwc-${safeLwc}.html" title="View LWC Component">${this.escapeHtml(lwc)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>LWC Components:</strong> ${lwcList}`);
        }
        
        if (usedIn.length === 0) {
            return '<p><em>This LWC component is not used in any FlexiPages or other components.</em></p>';
        }
        
        return '<ul>' + usedIn.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
    
    /**
     * Generate "What uses this" section HTML for LWC components (reverse relationships)
     * @param {string} lwcName - Name of the LWC component
     * @returns {string} HTML for whatUsesThis section
     */
    generateLWCWhatUsesThis(lwcName) {
        const relationships = this.data.relationships || {};
        const uses = [];
        
        // Apex classes used by this LWC
        const lwcData = this.data.lwcComponents[lwcName];
        if (lwcData && lwcData.apexMethods) {
            const apexClasses = new Set();
            for (const method of lwcData.apexMethods) {
                const className = method.split('.')[0];
                if (this.data.apexClasses[className]) {
                    apexClasses.add(className);
                }
            }
            if (apexClasses.size > 0) {
                const apexList = Array.from(apexClasses).map(cls => {
                    const safeName = cls.replace(/[^a-zA-Z0-9]/g, '_');
                    return `<a href="../apex/class-${safeName}.html" title="View Apex Class">${this.escapeHtml(cls)}</a>`;
                }).join(', ');
                uses.push(`<strong>Apex Classes:</strong> ${apexList}`);
            }
        }
        
        if (uses.length === 0) {
            return '<p><em>This LWC component does not use any Apex classes.</em></p>';
        }
        
        return '<ul>' + uses.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
    
    /**
     * Generate "Where it is used" section HTML for Objects
     * @param {string} objName - Name of the Object
     * @returns {string} HTML for whereUsed section
     */
    generateObjectWhereUsed(objName) {
        const relationships = this.data.relationships || {};
        const usedIn = [];
        
        // Used in Triggers
        if (relationships.objectToTriggers && relationships.objectToTriggers[objName]) {
            const triggerList = relationships.objectToTriggers[objName].map(trigger => {
                return `<a href="../automation/index.html" title="View Trigger">${this.escapeHtml(trigger)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Triggers:</strong> ${triggerList}`);
        }
        
        // Used in Flows (record lookups, updates, creates)
        if (relationships.objectToFlows && relationships.objectToFlows[objName]) {
            const flowList = relationships.objectToFlows[objName].map(flow => {
                return `<a href="../flows/flow-${this.sanitizeNodeName(flow)}.html" title="View Flow">${this.escapeHtml(flow)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Flows:</strong> ${flowList}`);
        }
        
        // Used in Apex Classes (SOQL queries, DML operations)
        if (relationships.objectToApex && relationships.objectToApex[objName]) {
            const apexList = relationships.objectToApex[objName].map(cls => {
                const safeName = cls.replace(/[^a-zA-Z0-9]/g, '_');
                return `<a href="../apex/class-${safeName}.html" title="View Apex Class">${this.escapeHtml(cls)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Apex Classes:</strong> ${apexList}`);
        }
        
        // Relationships to other objects
        const objData = this.data.objects[objName];
        if (objData && objData.relationships && objData.relationships.length > 0) {
            const relList = objData.relationships.map(rel => {
                const safeName = rel.relatedObject.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_');
                return `<a href="object-${safeName}.html" title="View Object">${this.escapeHtml(rel.relatedObject)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Related Objects:</strong> ${relList}`);
        }
        
        if (usedIn.length === 0) {
            return '<p><em>This object is not referenced by any other components.</em></p>';
        }
        
        return '<ul>' + usedIn.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
    
    /**
     * Generate "Where it is used" section HTML for Aura components
     * @param {string} auraName - Name of the Aura component
     * @returns {string} HTML for whereUsed section
     */
    generateAuraWhereUsed(auraName) {
        const relationships = this.data.relationships || {};
        const usedIn = [];
        
        // Used in FlexiPages
        if (relationships.auraToFlexiPages && relationships.auraToFlexiPages[auraName]) {
            const pageList = relationships.auraToFlexiPages[auraName].map(page => {
                return `<a href="../ui/index.html#flexiPagesTable" title="View FlexiPages">${this.escapeHtml(page)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>FlexiPages:</strong> ${pageList}`);
        }
        
        // Used in other Aura components
        if (relationships.auraToAura && relationships.auraToAura[auraName]) {
            const auraList = relationships.auraToAura[auraName].map(aura => {
                return `<a href="../ui/index.html" title="View UI Layer">${this.escapeHtml(aura)}</a>`;
            }).join(', ');
            usedIn.push(`<strong>Aura Components:</strong> ${auraList}`);
        }
        
        if (usedIn.length === 0) {
            return '<p><em>This Aura component is not used in any FlexiPages or other components.</em></p>';
        }
        
        return '<ul>' + usedIn.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
    
    /**
     * Generate relationship map HTML showing bidirectional relationships
     * @param {string} itemName - Name of the item
     * @param {string} itemType - Type of item (apex, lwc, object, aura, flow)
     * @returns {string} HTML for relationship map
     */
    generateRelationshipMap(itemName, itemType) {
        const relationships = this.data.relationships || {};
        let html = '<div class="relationship-map">\n';
        html += '<h4>Relationship Map</h4>\n';
        html += '<div class="relationship-map-content">\n';
        
        // What this item uses
        html += '<div class="relationship-section">\n';
        html += '<h5>Uses</h5>\n';
        html += '<ul class="relationship-list">\n';
        
        if (itemType === 'apex') {
            // Apex class uses: objects (SOQL), other classes
            const objList = relationships.apexToObjects && relationships.apexToObjects[itemName] 
                ? relationships.apexToObjects[itemName].map(obj => {
                    const safeName = obj.replace(/__c/g, '_c').replace(/[^a-zA-Z0-9_]/g, '_');
                    return `<li><a href="../objects/object-${safeName}.html">${this.escapeHtml(obj)}</a> <span class="relationship-type">(Object)</span></li>`;
                }).join('\n')
                : '';
            if (objList) html += objList;
        } else if (itemType === 'lwc') {
            // LWC uses: Apex classes
            const lwcData = this.data.lwcComponents[itemName];
            if (lwcData && lwcData.apexMethods) {
                const apexClasses = new Set();
                for (const method of lwcData.apexMethods) {
                    const className = method.split('.')[0];
                    if (this.data.apexClasses[className]) {
                        apexClasses.add(className);
                    }
                }
                if (apexClasses.size > 0) {
                    html += Array.from(apexClasses).map(cls => {
                        const safeName = cls.replace(/[^a-zA-Z0-9]/g, '_');
                        return `<li><a href="../apex/class-${safeName}.html">${this.escapeHtml(cls)}</a> <span class="relationship-type">(Apex Class)</span></li>`;
                    }).join('\n');
                }
            }
        } else if (itemType === 'flow') {
            // Flow uses: Apex classes, Objects
            if (relationships.flowToApex && relationships.flowToApex[itemName]) {
                html += relationships.flowToApex[itemName].map(cls => {
                    const safeName = cls.replace(/[^a-zA-Z0-9]/g, '_');
                    return `<li><a href="../apex/class-${safeName}.html">${this.escapeHtml(cls)}</a> <span class="relationship-type">(Apex Class)</span></li>`;
                }).join('\n');
            }
        }
        
        if (!html.includes('<li>')) {
            html += '<li><em>None</em></li>';
        }
        html += '</ul>\n</div>\n';
        
        // What uses this item
        html += '<div class="relationship-section">\n';
        html += '<h5>Used By</h5>\n';
        html += '<ul class="relationship-list">\n';
        
        if (itemType === 'apex') {
            // Used by: LWC, Flows, Triggers, Aura
            const usedBy = [];
            if (relationships.classToLWC && relationships.classToLWC[itemName]) {
                usedBy.push(...relationships.classToLWC[itemName].map(lwc => {
                    const safeName = lwc.replace(/[^a-zA-Z0-9]/g, '_');
                    return `<li><a href="../ui/lwc-${safeName}.html">${this.escapeHtml(lwc)}</a> <span class="relationship-type">(LWC)</span></li>`;
                }));
            }
            if (relationships.classToFlow && relationships.classToFlow[itemName]) {
                usedBy.push(...relationships.classToFlow[itemName].map(flow => {
                    return `<li><a href="../flows/flow-${flow}.html">${this.escapeHtml(flow)}</a> <span class="relationship-type">(Flow)</span></li>`;
                }));
            }
            if (relationships.classToTrigger && relationships.classToTrigger[itemName]) {
                usedBy.push(...relationships.classToTrigger[itemName].map(trigger => {
                    return `<li><a href="../automation/index.html">${this.escapeHtml(trigger)}</a> <span class="relationship-type">(Trigger)</span></li>`;
                }));
            }
            html += usedBy.join('\n');
        } else if (itemType === 'lwc') {
            // Used by: FlexiPages, other LWC
            const usedBy = [];
            if (relationships.lwcToFlexiPages && relationships.lwcToFlexiPages[itemName]) {
                usedBy.push(...relationships.lwcToFlexiPages[itemName].map(page => {
                    return `<li><a href="../ui/index.html#flexiPagesTable">${this.escapeHtml(page)}</a> <span class="relationship-type">(FlexiPage)</span></li>`;
                }));
            }
            html += usedBy.join('\n');
        } else if (itemType === 'object') {
            // Used by: Triggers, Flows, Apex
            const usedBy = [];
            if (relationships.objectToTriggers && relationships.objectToTriggers[itemName]) {
                usedBy.push(...relationships.objectToTriggers[itemName].map(trigger => {
                    return `<li><a href="../automation/index.html">${this.escapeHtml(trigger)}</a> <span class="relationship-type">(Trigger)</span></li>`;
                }));
            }
            if (relationships.objectToFlows && relationships.objectToFlows[itemName]) {
                usedBy.push(...relationships.objectToFlows[itemName].map(flow => {
                    return `<li><a href="../flows/flow-${flow}.html">${this.escapeHtml(flow)}</a> <span class="relationship-type">(Flow)</span></li>`;
                }));
            }
            html += usedBy.join('\n');
        }
        
        if (!html.includes('<li>')) {
            html += '<li><em>None</em></li>';
        }
        html += '</ul>\n</div>\n';
        
        html += '</div>\n</div>\n';
        return html;
    }
    
    /**
     * Generate "Where it is used" section HTML for Flows
     * @param {string} flowName - Name of the Flow
     * @returns {string} HTML for whereUsed section
     */
    generateFlowWhereUsed(flowName) {
        const relationships = this.data.relationships || {};
        const usedIn = [];
        
        // Apex classes used in this flow
        if (relationships.flowToApex && relationships.flowToApex[flowName]) {
            const apexList = relationships.flowToApex[flowName].map(cls =>
                `<a href="../apex/class-${cls.replace(/[^a-zA-Z0-9]/g, '_')}.html">${this.escapeHtml(cls)}</a>`
            ).join(', ');
            usedIn.push(`<strong>Apex Classes:</strong> ${apexList}`);
        }
        
        if (usedIn.length === 0) {
            return '<p><em>This Flow does not use any Apex classes.</em></p>';
        }
        
        return '<ul>' + usedIn.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
    
    /**
     * Generate "Where it is used" section HTML for Triggers
     * @param {string} triggerName - Name of the Trigger
     * @returns {string} HTML for whereUsed section
     */
    generateTriggerWhereUsed(triggerName) {
        const triggerData = this.data.triggers[triggerName];
        const usedIn = [];
        
        // Apex handler classes
        if (triggerData && triggerData.handlers && triggerData.handlers.length > 0) {
            const handlerList = triggerData.handlers.map(handler =>
                `<a href="../apex/class-${handler.replace(/[^a-zA-Z0-9]/g, '_')}.html">${this.escapeHtml(handler)}</a>`
            ).join(', ');
            usedIn.push(`<strong>Handler Classes:</strong> ${handlerList}`);
        }
        
        // Object this trigger is on
        if (triggerData && triggerData.object) {
            usedIn.push(`<strong>Object:</strong> ${this.escapeHtml(triggerData.object)}`);
        }
        
        if (usedIn.length === 0) {
            return '<p><em>No usage information available for this trigger.</em></p>';
        }
        
        return '<ul>' + usedIn.map(item => `<li>${item}</li>`).join('\n') + '</ul>';
    }
}









