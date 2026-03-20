
// Salesforce Technical Documentation - JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initSearch();
    initGlobalSearch();
    initTableSorting();
    initNavigation();
    initPagination();
    initProfileMap();
    initCollapsibleSections();
    initAutoCollapseSections();
    initMermaidDiagrams();
    initTableEnhancements();
    initHeadingAnchors();
    initTheme();
    initBackToTop();
    initTableControls();
    addSectionDownloadLink();
    attachProfileJsonDownload();
    initObjectsEnhancements();
    initMobileSidebar();
    initBreadcrumbTooltip();
});

// BUG-13: Add title tooltip to breadcrumb for truncated text
function initBreadcrumbTooltip() {
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) breadcrumb.setAttribute('title', breadcrumb.textContent.trim());
}

function initSearch() {
    const searchInputs = document.querySelectorAll('.search-box');

    searchInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const table = resolveSearchTable(e.target);
            if (table) {
                filterTable(table, searchTerm);
                updateSearchInfo(e.target, table, searchTerm);
            }
        });
    });

    const objectSearch = document.getElementById('objectSearch');
    if (objectSearch) {
        objectSearch.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const table = document.getElementById('objectsTable');
            if (table) {
                filterTable(table, searchTerm);
                updateSearchInfo(e.target, table, searchTerm, 'Objects');
            }
        });
    }
}

function resolveSearchTable(input) {
    const targetId = input.getAttribute('data-target-table');
    if (targetId) {
        return document.getElementById(targetId);
    }

    const section = input.closest('section');
    if (section) {
        const table = section.querySelector('table');
        if (table) return table;
    }

    return input.closest('.main-content')?.querySelector('table');
}

function updateSearchInfo(input, table, searchTerm, labelOverride) {
    const infoId = input.getAttribute('data-target-info');
    const info = infoId ? document.getElementById(infoId) : null;
    if (!info && input.id !== 'objectSearch') return;

    const infoElement = info || document.getElementById('objectsPaginationInfo');
    if (!infoElement) return;

    const totalRows = table.querySelectorAll('tbody tr').length;
    const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none').length;
    const label = labelOverride || (table.id === 'objectsTable' ? 'Objects' : 'items');

    if (searchTerm) {
        infoElement.textContent = `Found ${visibleRows} ${label.toLowerCase()} matching "${input.value}"`;
    } else {
        infoElement.textContent = `Showing 1-${Math.min(50, totalRows)} of ${totalRows} ${label}`;
    }
}

function filterTable(table, searchTerm) {
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function initTableSorting() {
    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
        const headers = table.querySelectorAll('thead th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTable(table, index);
            });
        });
    });
}

function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    const isAscending = table.dataset.sortDirection !== 'asc';
    table.dataset.sortDirection = isAscending ? 'asc' : 'desc';

    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        const aNum = parseFloat(aText);
        const bNum = parseFloat(bText);

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAscending ? aNum - bNum : bNum - aNum;
        }

        return isAscending ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });

    rows.forEach(row => tbody.removeChild(row));
    rows.forEach(row => tbody.appendChild(row));
}
function initMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const btn = document.createElement('button');
    btn.className = 'sidebar-toggle-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'sidebar-nav');
    btn.innerHTML = '&#9776;&nbsp; Navigation';
    sidebar.id = 'sidebar-nav';
    sidebar.parentNode.insertBefore(btn, sidebar);

    btn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('sidebar-open');
        document.body.classList.toggle('sidebar-overlay-active', isOpen); // BUG-04
        btn.setAttribute('aria-expanded', String(isOpen));
        btn.innerHTML = isOpen ? '&#10005;&nbsp; Close Navigation' : '&#9776;&nbsp; Navigation';
    });

    // Close sidebar when a link inside it is tapped on mobile
    sidebar.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && window.innerWidth <= 768) {
            sidebar.classList.remove('sidebar-open');
            document.body.classList.remove('sidebar-overlay-active');
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = '&#9776;&nbsp; Navigation';
        }
    });

    // Close sidebar when overlay is clicked (BUG-04)
    document.body.addEventListener('click', (e) => {
        if (document.body.classList.contains('sidebar-overlay-active')) {
            const clickedInsideSidebar = sidebar.contains(e.target) || btn.contains(e.target);
            if (!clickedInsideSidebar) {
                sidebar.classList.remove('sidebar-open');
                document.body.classList.remove('sidebar-overlay-active');
                btn.setAttribute('aria-expanded', 'false');
                btn.innerHTML = '&#9776;&nbsp; Navigation';
            }
        }
    });
}

function initNavigation() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-section a, .main-nav a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        if (href === currentPath.split('/').pop() || currentPath.includes(href)) {
            link.classList.add('active');
        }
    });

    const navSections = document.querySelectorAll('.nav-section h3');
    navSections.forEach(header => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', function() {
            const ul = this.nextElementSibling;
            if (ul) {
                ul.style.display = ul.style.display === 'none' ? 'block' : 'none';
            }
        });
    });
}

let metadata = null;
async function loadMetadata() {
    try {
        const response = await fetch('data/metadata.json');
        metadata = await response.json();
        return metadata;
    } catch (error) {
        console.error('Error loading metadata:', error);
        return null;
    }
}

function initGlobalSearch() {
    const globalSearchInput = document.getElementById('globalSearch');
    if (!globalSearchInput) return;

    document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            globalSearchInput.focus();
            globalSearchInput.select();
        }
    });

    let searchTimeout;
    globalSearchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.trim();
        if (!searchTerm) {
            hideSearchResults();
            return;
        }
        searchTimeout = setTimeout(() => {
            performGlobalSearch(searchTerm);
        }, 250);
    });

    globalSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            performGlobalSearch(e.target.value.trim());
        } else if (e.key === 'Escape') {
            e.target.value = '';      // BUG-07: clear the field on Escape
            hideSearchResults();
            e.target.blur();
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.search-container') && !e.target.closest('.search-results')) {
            hideSearchResults();
        }
    });
}

let searchIndexCache = null;

function getRootPrefix() {
    const currentPath = window.location.pathname || '';
    if (currentPath.includes('/pages/')) return '../../';
    if (currentPath.includes('/pages')) return '../';
    return './';
}

async function loadSearchIndex() {
    if (searchIndexCache) return searchIndexCache;
    const rootPrefix = getRootPrefix();

    try {
        const manifestRes = await fetch(`${rootPrefix}data/search/manifest.json`, { cache: 'no-store' });
        if (manifestRes.ok) {
            const manifest = await manifestRes.json();
            const shards = manifest.shards || [];
            const results = [];
            let index = 0;
            const concurrency = 3;

            async function worker() {
                while (index < shards.length) {
                    const idx = index++;
                    const shard = shards[idx];
                    try {
                        const response = await fetch(`${rootPrefix}${shard.url}`, { cache: 'no-store' });
                        if (response.ok) {
                            const data = await response.json();
                            if (data && Array.isArray(data.items)) {
                                results.push(...data.items);
                            }
                        }
                    } catch (error) {
                        // Ignore shard errors
                    }
                }
            }

            await Promise.all(new Array(Math.min(concurrency, shards.length)).fill(0).map(worker));
            searchIndexCache = { version: manifest.version, generatedAt: manifest.generatedAt, items: results };
            return searchIndexCache;
        }
    } catch (error) {
        console.warn('Could not load search index manifest:', error);
    }

    try {
        const response = await fetch(`${rootPrefix}data/search-index.json`, { cache: 'no-store' });
        if (response.ok) {
            searchIndexCache = await response.json();
            return searchIndexCache;
        }
    } catch (error) {
        console.warn('Could not load search index:', error);
    }

    return null;
}
async function performGlobalSearch(term) {
    const raw = term.trim();
    const match = raw.match(/^(apex|obj|object|flow|lwc|profile|ps|perm|flexi|page):\s*(.*)$/i);
    let typeFilter = null;
    let query = raw;

    if (match) {
        const map = {
            apex: 'Apex Class',
            obj: 'Object',
            object: 'Object',
            flow: 'Flow',
            lwc: 'LWC Component',
            profile: 'Profile',
            ps: 'Permission Set',
            perm: 'Permission Set',
            flexi: 'FlexiPage',
            page: 'FlexiPage'
        };
        typeFilter = map[match[1].toLowerCase()] || null;
        query = match[2];
    }

    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) {
        hideSearchResults();
        return;
    }

    const results = [];
    const index = await loadSearchIndex();
    if (index && Array.isArray(index.items)) {
        const rootPrefix = getRootPrefix();
        for (const item of index.items) {
            if (typeFilter && item.type !== typeFilter) continue;
            const nameHit = (item.name || '').toLowerCase().includes(searchTerm);
            const keywordHit = (item.keywords || []).some(kw => (kw || '').toLowerCase().includes(searchTerm));
            if (nameHit || keywordHit) {
                results.push({
                    type: item.type,
                    name: item.name,
                    url: rootPrefix + item.url
                });
            }
        }
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent && !typeFilter) {
        mainContent.querySelectorAll('h2, h3, h4, h5, h6').forEach(heading => {
            const text = heading.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                const headingId = heading.id || text.replace(/[^a-z0-9]+/g, '-');
                results.push({
                    type: 'Heading',
                    name: heading.textContent.trim(),
                    url: '#' + headingId
                });
            }
        });

        mainContent.querySelectorAll('a[href]').forEach(link => {
            const text = link.textContent.toLowerCase();
            const href = link.getAttribute('href');
            if (text.includes(searchTerm) && href && !href.startsWith('javascript:')) {
                results.push({
                    type: 'Link',
                    name: link.textContent.trim() || href,
                    url: href
                });
            }
        });
    }

    const unique = [];
    const seen = new Set();
    for (const result of results) {
        const key = `${result.type}|${result.name}|${result.url}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(result);
        }
    }

    unique.sort((a, b) => {
        const exactA = a.name.toLowerCase() === query.toLowerCase();
        const exactB = b.name.toLowerCase() === query.toLowerCase();
        if (exactA && !exactB) return -1;
        if (!exactA && exactB) return 1;
        const priority = { Profile: 1, 'Apex Class': 2, Object: 3, Flow: 4, 'LWC Component': 5, 'Permission Set': 6, FlexiPage: 7, Link: 90, Heading: 99 };
        return (priority[a.type] || 50) - (priority[b.type] || 50);
    });

    displaySearchResults(unique, raw);
}

function displaySearchResults(results, searchTerm) {
    const existingResults = document.querySelector('.search-results');
    if (existingResults) existingResults.remove();

    if (!results.length) {
        showNoResults(searchTerm);
        return;
    }

    const container = document.createElement('div');
    container.className = 'search-results';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Search results');

    const slice = results.slice(0, 20);
    container.innerHTML = `
        <div class="search-results-header">
            <span>Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${escapeHtml(searchTerm)}"</span>
            <button class="search-close" onclick="this.closest('.search-results').remove()">x</button>
        </div>
        <div class="search-results-list">
            ${slice.map((result, index) => `
                <a href="${result.url}" class="search-result-item" data-index="${index}">
                    <span class="search-result-type">${escapeHtml(result.type)}</span>
                    <span class="search-result-name">${escapeHtml(result.name)}</span>
                </a>
            `).join('')}
        </div>
        ${results.length > 20 ? `<div class="search-results-footer">Showing first 20 of ${results.length} results</div>` : ''}
    `;

    const host = document.querySelector('.search-container') || document.querySelector('header');
    if (!host) return;
    if (getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
    }

    host.querySelector('.search-results')?.remove();
    host.appendChild(container);

    const input = document.getElementById('globalSearch');
    const items = Array.from(container.querySelectorAll('.search-result-item'));
    let selectedIndex = -1;

    function updateSelection(next) {
        if (!items.length) return;
        if (items[selectedIndex]) items[selectedIndex].classList.remove('active');
        selectedIndex = (next + items.length) % items.length;
        items[selectedIndex].classList.add('active');
        items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }

    function openSelection() {
        if (items[selectedIndex]) {
            window.location.href = items[selectedIndex].getAttribute('href');
        }
    }

    if (input) {
        const handler = function(e) {
            if (!document.body.contains(container)) {
                input.removeEventListener('keydown', handler);
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateSelection(selectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateSelection(selectedIndex === -1 ? 0 : selectedIndex - 1);
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                openSelection();
            }
        };
        input.addEventListener('keydown', handler);
    }
}

function showNoResults(searchTerm) {
    const existingResults = document.querySelector('.search-results');
    if (existingResults) existingResults.remove();

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';
    resultsContainer.setAttribute('role', 'region');
    resultsContainer.setAttribute('aria-live', 'polite');
    resultsContainer.setAttribute('aria-label', 'Search results');
    resultsContainer.innerHTML = `
        <div class="search-results-header">
            <span>No results for "${escapeHtml(searchTerm)}"</span>
            <button class="search-close" onclick="this.closest('.search-results').remove()">x</button>
        </div>
        <div class="search-results-empty">
            <p>Try a type prefix:</p>
            <ul>
                <li><strong>apex:</strong> Apex classes</li>
                <li><strong>obj:</strong> Objects</li>
                <li><strong>flow:</strong> Flows</li>
                <li><strong>lwc:</strong> LWC components</li>
                <li><strong>profile:</strong> Profiles</li>
                <li><strong>ps:</strong> Permission sets</li>
            </ul>
        </div>
    `;

    const host = document.querySelector('.search-container') || document.querySelector('header');
    if (!host) return;
    if (getComputedStyle(host).position === 'static') {
        host.style.position = 'relative';
    }

    host.querySelector('.search-results')?.remove();
    host.appendChild(resultsContainer);
}

function hideSearchResults() {
    const results = document.querySelector('.search-results');
    if (results) {
        results.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
async function initMermaidDiagrams() {
    const mermaidBlocks = document.querySelectorAll('.mermaid');
    if (!mermaidBlocks.length) return;

    // UX-G: Show loading placeholder while Mermaid renders
    mermaidBlocks.forEach(block => {
        const container = block.closest('.uml-container') || block.parentElement;
        if (container && !container.querySelector('.diagram-loading')) {
            const loader = document.createElement('div');
            loader.className = 'diagram-loading';
            loader.textContent = 'Rendering diagram…';
            container.insertBefore(loader, block);
            block.style.visibility = 'hidden';
        }
    });

    if (!window.mermaid) {
        const rootPrefix = getRootPrefix();
        await new Promise(resolve => {
            const script = document.createElement('script');
            script.src = `${rootPrefix}js/vendor/mermaid.min.js`;
            script.async = true;
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
        });
    }

    if (!window.mermaid) return;

    try {
        window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: 'base',
            themeVariables: {
                primaryColor: '#E31E24',
                primaryBorderColor: '#B8151A',
                primaryTextColor: '#1a1a1a',
                lineColor: '#cbd5e0',
                secondaryColor: '#f8f9fa',
                tertiaryColor: '#f1f3f5',
                nodeBorder: '#e2e8f0',
                nodeTextColor: '#1a1a1a',
                clusterBkg: '#f8f9fa',
                clusterBorder: '#e2e8f0',
                edgeLabelBackground: '#ffffff',
                fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
            }
        });

        if (typeof window.mermaid.run === 'function') {
            await window.mermaid.run({ querySelector: '.mermaid' });
        } else if (typeof window.mermaid.init === 'function') {
            window.mermaid.init(undefined, mermaidBlocks);
        }

        mermaidBlocks.forEach(block => {
            const container = block.closest('.uml-container') || block.parentElement;
            if (container) {
                container.style.maxWidth = '100%';
                // UX-G: Remove loading placeholder, restore diagram visibility
                container.querySelector('.diagram-loading')?.remove();
                block.style.visibility = '';
                addDiagramToolbar(container);
            }
        });
    } catch (e) {
        console.warn('Mermaid render error:', e);
        mermaidBlocks.forEach(block => {
            const container = block.closest('.uml-container') || block.parentElement;
            container?.querySelector('.diagram-loading')?.remove();
            block.style.visibility = '';
            const msg = e && e.message ? e.message : 'Unable to render diagram';
            block.innerHTML = `<div class="info-box"><p><strong>Diagram Error:</strong> ${escapeHtml(msg)}</p><p>Use the lists below to navigate instead.</p></div>`;
        });
    }
}

function addDiagramToolbar(container) {
    // Don't add toolbar twice
    if (container.querySelector('.diagram-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'diagram-toolbar';

    // Fullscreen button
    const fsBtn = document.createElement('button');
    fsBtn.type = 'button';
    fsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> Full Screen';
    fsBtn.setAttribute('aria-label', 'View diagram full screen');
    fsBtn.addEventListener('click', () => openDiagramFullscreen(container));
    toolbar.appendChild(fsBtn);

    // Insert toolbar before the mermaid div
    container.insertBefore(toolbar, container.firstChild);
}

function openDiagramFullscreen(container) {
    // Remove existing overlay if any
    document.querySelector('.diagram-fullscreen-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'diagram-fullscreen-overlay active';

    // Toolbar inside overlay
    const toolbar = document.createElement('div');
    toolbar.className = 'diagram-toolbar';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Close';
    closeBtn.addEventListener('click', () => overlay.remove());
    toolbar.appendChild(closeBtn);
    overlay.appendChild(toolbar);

    // Clone the mermaid SVG into the overlay
    const body = document.createElement('div');
    body.className = 'diagram-fullscreen-body';
    const mermaidEl = container.querySelector('.mermaid');
    if (mermaidEl) {
        const clone = mermaidEl.cloneNode(true);
        // Make SVG fill the space
        const svg = clone.querySelector('svg');
        if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
        }
        body.appendChild(clone);
    }
    overlay.appendChild(body);

    // Close on Escape
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escHandler); }
    });

    document.body.appendChild(overlay);
}

function initPagination() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = parseInt(urlParams.get('page'), 10) || 1;
    const itemsPerPage = 50;

    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const totalItems = rows.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        let pagination = null;
        const tableContainer = table.closest('.table-container') || table.parentElement;
        const mainContent = table.closest('.main-content') || table.closest('section') || document.body;

        if (tableContainer) {
            pagination = tableContainer.nextElementSibling?.classList?.contains('pagination')
                ? tableContainer.nextElementSibling
                : tableContainer.parentElement?.querySelector('.pagination');
        }
        if (!pagination) {
            pagination = mainContent.querySelector('.pagination');
        }
        if (!pagination) {
            const tableSection = table.closest('section');
            if (tableSection) {
                pagination = tableSection.querySelector('.pagination');
            }
        }

        if (totalPages <= 1) {
            if (pagination) {
                pagination.style.display = 'none';
            }
            const paginationInfo = mainContent.querySelector('.pagination-info') ||
                tableContainer?.querySelector('.pagination-info') ||
                document.getElementById('objectsPaginationInfo');
            if (paginationInfo && totalItems > 0) {
                paginationInfo.textContent = `Showing 1-${totalItems} of ${totalItems}`;
                paginationInfo.style.display = 'block';
            }
            return;
        }

        if (pagination) {
            pagination.style.display = 'flex';
            pagination.style.visibility = 'visible';
            pagination.style.opacity = '1';
        } else {
            const baseUrl = window.location.pathname.split('/').pop() || 'index.html';
            const hash = window.location.hash || '';
            const paginationHtml = generatePaginationHTML(currentPage, totalPages, baseUrl, hash);
            if (tableContainer && tableContainer.parentElement) {
                const paginationDiv = document.createElement('div');
                paginationDiv.className = 'pagination';
                paginationDiv.innerHTML = paginationHtml;
                tableContainer.parentElement.insertBefore(paginationDiv, tableContainer.nextSibling);
            }
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        rows.forEach((row, index) => {
            row.style.display = index >= startIndex && index < endIndex ? '' : 'none';
        });

        const paginationInfo = mainContent.querySelector('.pagination-info') ||
            tableContainer?.querySelector('.pagination-info') ||
            document.getElementById('objectsPaginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}`;
            paginationInfo.style.display = 'block';
        }
    });
}

function generatePaginationHTML(currentPage, totalPages, baseUrl, hash) {
    if (totalPages <= 1) return '';

    let html = '';

    if (currentPage > 1) {
        const prevUrl = currentPage === 2 ? `${baseUrl}${hash}` : `${baseUrl}?page=${currentPage - 1}${hash}`;
        html += `<a href="${prevUrl}" class="pagination-btn pagination-prev">Prev</a>`;
    } else {
        html += '<span class="pagination-btn pagination-prev pagination-disabled">Prev</span>';
    }

    html += '<div class="pagination-numbers">';

    if (currentPage > 3) {
        html += `<a href="${baseUrl}${hash}" class="pagination-number">1</a>`;
        if (currentPage > 4) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }

    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) {
        if (i === currentPage) {
            html += `<span class="pagination-number pagination-active">${i}</span>`;
        } else {
            const pageUrl = i === 1 ? `${baseUrl}${hash}` : `${baseUrl}?page=${i}${hash}`;
            html += `<a href="${pageUrl}" class="pagination-number">${i}</a>`;
        }
    }

    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        html += `<a href="${baseUrl}?page=${totalPages}${hash}" class="pagination-number">${totalPages}</a>`;
    }

    html += '</div>';

    if (currentPage < totalPages) {
        const nextUrl = `${baseUrl}?page=${currentPage + 1}${hash}`;
        html += `<a href="${nextUrl}" class="pagination-btn pagination-next">Next</a>`;
    } else {
        html += '<span class="pagination-btn pagination-next pagination-disabled">Next</span>';
    }

    return html;
}
function initProfileMap() {
    const profileCards = document.querySelectorAll('.profile-card');
    profileCards.forEach(card => {
        const link = card.querySelector('a[href*="profile-"]');
        if (!link) return;

        card.style.cursor = 'pointer';
        card.addEventListener('click', function(e) {
            if (e.target.tagName !== 'A' && !e.target.closest('a')) {
                window.location.href = link.href;
            }
        });

        card.addEventListener('mouseenter', function() {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        });

        card.addEventListener('mouseleave', function() {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '';
        });
    });

    const profileSearch = document.getElementById('profileSearch');
    if (!profileSearch) return;

    profileSearch.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.profile-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const profileName = (card.getAttribute('data-profile') || '').toLowerCase();
            const cardText = card.textContent.toLowerCase();
            if (!searchTerm || profileName.includes(searchTerm) || cardText.includes(searchTerm)) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        const statsElement = document.querySelector('.profile-map-stats');
        if (statsElement) {
            const totalProfiles = cards.length;
            if (searchTerm) {
                statsElement.innerHTML = `<span>Showing <strong>${visibleCount}</strong> of <strong>${totalProfiles}</strong> profiles</span>`;
            } else {
                statsElement.innerHTML = `<span>Total Profiles: <strong>${totalProfiles}</strong></span>`;
            }
        }
    });
}

function initCollapsibleSections() {
    const sections = document.querySelectorAll('.collapsible-section');
    sections.forEach(section => {
        const header = section.querySelector('.collapsible-header');
        const content = section.querySelector('.collapsible-content');
        if (!header || !content) return;

        if (!header.querySelector('.collapsible-toggle')) {
            const toggle = document.createElement('span');
            toggle.className = 'collapsible-toggle';
            toggle.textContent = '>';
            header.appendChild(toggle);
        }

        header.addEventListener('click', function() {
            const isExpanded = content.classList.contains('expanded');
            if (isExpanded) {
                content.classList.remove('expanded');
                header.classList.remove('active');
            } else {
                content.classList.add('expanded');
                header.classList.add('active');
            }
        });
    });
}

function initAutoCollapseSections() {
    const sections = document.querySelectorAll('.main-content section');
    sections.forEach((section, index) => {
        if (index > 0) {
            section.classList.add('collapsed');
        }
        // Add click-to-toggle on the h3 heading only
        const heading = section.querySelector(':scope > h3');
        if (heading) {
            heading.addEventListener('click', (e) => {
                // Anchor "#" links navigate – don't toggle collapse
                if (e.target.closest('.anchor-link')) return;
                section.classList.toggle('collapsed');
            });
        }
    });

    // When the page loads with a URL hash, expand the target section
    function expandSectionForHash(hash) {
        if (!hash) return;
        const target = document.getElementById(hash.replace(/^#/, ''));
        if (!target) return;
        const parentSection = target.closest('.main-content section');
        if (parentSection) parentSection.classList.remove('collapsed');
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }

    expandSectionForHash(location.hash);
    window.addEventListener('hashchange', () => expandSectionForHash(location.hash));
}
function initTableEnhancements() {
    document.querySelectorAll('.table-container .data-table').forEach(table => {
        if (table.closest('.table-container')?.querySelector('.table-toolbar')) {
            return;
        }

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (rows.length > 800) {
            const wrap = table.closest('.table-container') || table.parentElement;
            wrap.style.maxHeight = '70vh';
            wrap.style.overflowY = 'auto';
            const tbody = table.querySelector('tbody');
            const chunk = 200;
            let rendered = 0;
            tbody.innerHTML = '';
            const renderMore = () => {
                rows.slice(rendered, rendered + chunk).forEach(row => tbody.appendChild(row));
                rendered = Math.min(rows.length, rendered + chunk);
            };
            renderMore();
            wrap.addEventListener('scroll', () => {
                if (wrap.scrollTop + wrap.clientHeight + 200 >= wrap.scrollHeight && rendered < rows.length) {
                    renderMore();
                }
            });
        }

        const toolbar = document.createElement('div');
        toolbar.className = 'table-toolbar';
        const button = document.createElement('button');
        button.className = 'btn btn-secondary';
        button.textContent = 'Export CSV';
        button.addEventListener('click', () => exportTableCSV(table));
        toolbar.appendChild(button);
        table.parentElement.insertBefore(toolbar, table);
    });
}

function exportTableCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows.map(tr => Array.from(tr.children).map(td => '"' + (td.textContent || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = (table.id || 'table') + '.csv';
    anchor.click();
}

function initHeadingAnchors() {
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.querySelectorAll('h2, h3').forEach(heading => {
        const id = heading.id || heading.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        heading.id = id;
        if (!heading.querySelector('.anchor-link')) {
            const anchor = document.createElement('a');
            anchor.href = '#' + id;
            anchor.className = 'anchor-link';
            anchor.title = 'Copy link to section';
            anchor.textContent = '#';
            // Ensure the parent section expands before navigating,
            // and stop the click from triggering the heading's collapse toggle.
            anchor.addEventListener('click', (e) => {
                e.stopPropagation();
                const parentSection = heading.closest('.main-content section');
                if (parentSection) parentSection.classList.remove('collapsed');
            });
            heading.appendChild(anchor);
        }
    });
}

function initTheme() {
    const key = 'docs-theme';
    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        try { localStorage.setItem(key, theme); } catch (e) { }
        setMermaidTheme(theme);
    }

    const saved = (localStorage.getItem(key) || '').toLowerCase();
    if (saved === 'dark' || saved === 'light') {
        applyTheme(saved);
    }

    const button = document.querySelector('.theme-toggle');
    if (button) {
        button.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(current);
        });
    }
}

function setMermaidTheme(theme) {
    if (!window.mermaid) return;
    const dark = theme === 'dark';
    window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: dark ? {
            primaryColor: '#f87171',
            primaryBorderColor: '#be123c',
            primaryTextColor: '#e5e7eb',
            lineColor: '#30363d',
            secondaryColor: '#1e2432',
            tertiaryColor: '#111827',
            nodeBorder: '#30363d',
            nodeTextColor: '#e5e7eb',
            clusterBkg: '#161b22',
            edgeLabelBackground: '#0d1117'
        } : {
            primaryColor: '#E31E24',
            primaryBorderColor: '#B8151A',
            primaryTextColor: '#1a1a1a',
            lineColor: '#cbd5e0',
            secondaryColor: '#f8f9fa',
            tertiaryColor: '#f1f3f5',
            nodeBorder: '#e2e8f0',
            nodeTextColor: '#1a1a1a',
            clusterBkg: '#f8f9fa',
            edgeLabelBackground: '#ffffff'
        }
    });

    try {
        if (typeof window.mermaid.run === 'function') {
            window.mermaid.run({ querySelector: '.mermaid' });
        }
    } catch (error) {
        console.warn('Mermaid theme update failed:', error);
    }
}

function initBackToTop() {
    const button = document.createElement('button');
    button.className = 'back-to-top';
    button.textContent = '↑ Top';
    button.title = 'Back to top';
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(button);

    // BUG-D: show only after scrolling 300px, using CSS class for pointer-events
    window.addEventListener('scroll', () => {
        button.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
}

function addSectionDownloadLink() {
    const main = document.querySelector('.main-content');
    if (!main) return;
    const h2 = main.querySelector('h2');
    if (!h2) return;

    const path = window.location.pathname;
    let key = null;
    if (path.includes('/pages/apex/')) key = 'apexclass';
    else if (path.includes('/pages/objects/')) key = 'object';
    else if (path.includes('/pages/flows/')) key = 'flow';
    else if (path.includes('/pages/ui/')) key = 'lwccomponent';
    // BUG-02: Profile pages use attachProfileJsonDownload() for per-profile JSON — skip generic link
    // else if (path.includes('/pages/profiles/')) key = 'profile';

    if (!key) return;
    const anchor = document.createElement('a');
    anchor.href = getRootPrefix() + `data/search/${key}.json`;
    anchor.textContent = 'Download JSON';
    anchor.className = 'btn';
    anchor.style.marginLeft = '0.75rem';
    anchor.setAttribute('download', '');
    h2.appendChild(anchor);
}
function initTableControls() {
    document.querySelectorAll('.table-container .data-table').forEach((table, tableIndex) => {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (!rows.length || rows.length > 800) return;

        const headers = Array.from(table.querySelectorAll('thead th'));
        const container = table.closest('.table-container') || table.parentElement;
        if (!container || container.querySelector('.table-controls')) return;

        const controls = document.createElement('div');
        controls.className = 'table-controls';

        const sizeLabel = document.createElement('label');
        sizeLabel.textContent = 'Rows:';
        sizeLabel.className = 'table-control-label';
        const sizeSelect = document.createElement('select');
        sizeSelect.className = 'table-page-size';
        [25, 50, 100, 200, 'All'].forEach(value => {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = String(value);
            sizeSelect.appendChild(option);
        });
        sizeSelect.value = rows.length > 200 ? '100' : '50';

        const columnWrap = document.createElement('div');
        columnWrap.className = 'table-columns';
        const columnButton = document.createElement('button');
        columnButton.type = 'button';
        columnButton.className = 'btn btn-secondary';
        columnButton.textContent = 'Columns';
        const columnPanel = document.createElement('div');
        columnPanel.className = 'table-columns-panel';

        headers.forEach((th, index) => {
            const id = `t${tableIndex}-col-${index}`;
            const row = document.createElement('label');
            row.className = 'col-toggle';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = id;
            checkbox.checked = true;
            checkbox.dataset.colIndex = String(index);
            const span = document.createElement('span');
            span.textContent = th.textContent.trim() || `Col ${index + 1}`;
            row.appendChild(checkbox);
            row.appendChild(span);
            columnPanel.appendChild(row);
        });

        columnButton.addEventListener('click', () => columnPanel.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (!columnWrap.contains(e.target)) {
                columnPanel.classList.remove('open');
            }
        });

        columnWrap.appendChild(columnButton);
        columnWrap.appendChild(columnPanel);

        controls.appendChild(sizeLabel);
        controls.appendChild(sizeSelect);
        controls.appendChild(columnWrap);

        const pager = document.createElement('div');
        pager.className = 'table-pager';
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'btn';
        prev.textContent = 'Prev';
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'btn';
        next.textContent = 'Next';
        const info = document.createElement('span');
        info.className = 'pager-info';
        pager.appendChild(prev);
        pager.appendChild(info);
        pager.appendChild(next);

        container.insertBefore(controls, table);
        container.insertBefore(pager, table.nextSibling);

        let page = 1;
        const total = rows.length;
        function totalPages() {
            const value = sizeSelect.value === 'All' ? total : parseInt(sizeSelect.value, 10) || total;
            return Math.max(1, Math.ceil(total / value));
        }
        function pageSize() {
            return sizeSelect.value === 'All' ? total : parseInt(sizeSelect.value, 10) || total;
        }
        function render() {
            const size = pageSize();
            const pages = totalPages();
            page = Math.min(Math.max(1, page), pages);
            rows.forEach((row, index) => {
                const inPage = size === total || (index >= (page - 1) * size && index < page * size);
                row.style.display = inPage ? '' : 'none';
            });
            info.textContent = `Page ${page} / ${pages} - Showing ${size === total ? total : Math.min(total, page * size)} of ${total}`;
            prev.disabled = page <= 1;
            next.disabled = page >= pages;
        }

        prev.addEventListener('click', () => { page -= 1; render(); });
        next.addEventListener('click', () => { page += 1; render(); });
        sizeSelect.addEventListener('change', () => { page = 1; render(); });

        columnPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', e => {
                const idx = parseInt(e.target.dataset.colIndex, 10);
                if (headers[idx]) headers[idx].style.display = e.target.checked ? '' : 'none';
                rows.forEach(tr => {
                    const cell = tr.children[idx];
                    if (cell) cell.style.display = e.target.checked ? '' : 'none';
                });
            });
        });

        render();
    });
}
function attachProfileJsonDownload() {
    if (!/\/pages\/profiles\/profile-/.test(window.location.pathname)) return;

    const h2 = document.querySelector('.main-content h2');
    if (!h2 || h2.querySelector('.download-json-btn')) return;

    const button = document.createElement('button');
    button.className = 'btn download-json-btn';
    button.textContent = 'Download JSON';
    button.style.marginLeft = '0.75rem';

    button.addEventListener('click', async () => {
        try {
            const root = getRootPrefix();
            const response = await fetch(`${root}data/search/profile.json`, { cache: 'no-store' });
            if (!response.ok) return;
            const json = await response.json();
            const nameMatch = h2.textContent.match(/Profile:\s*(.*)$/);
            const profileName = nameMatch ? nameMatch[1].trim() : h2.textContent.trim();
            const items = (json.items || []).filter(item => (item.name || '') === profileName);
            const blob = new Blob([JSON.stringify({ items }, null, 2)], { type: 'application/json' });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = `profile-${(profileName || 'profile').replace(/[^a-z0-9_-]+/gi, '_')}.json`;
            anchor.click();
        } catch (error) {
            console.warn('Profile JSON download failed:', error);
        }
    });

    h2.appendChild(button);
}

function initObjectsEnhancements() {
    if (onObjectsPage()) {
        buildAlphaFilter();
    }
    makeStickyHeaders();
    enableColumnResize();
}

function onObjectsPage() {
    return /\/pages\/objects\/(index\.html)?$/.test(window.location.pathname);
}

function buildAlphaFilter() {
    const table = document.getElementById('objectsTable');
    if (!table) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'alpha-filter';
    const letters = ['All', '#'].concat(Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'));

    letters.forEach(letter => {
        const button = document.createElement('button');
        button.className = 'chip';
        button.textContent = letter;
        if (letter === 'All') button.classList.add('active');
        button.addEventListener('click', () => applyAlphaFilter(letter, table, toolbar));
        toolbar.appendChild(button);
    });

    table.parentElement.parentElement.insertBefore(toolbar, table.parentElement);
}

function applyAlphaFilter(letter, table, toolbar) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    rows.forEach(row => {
        const text = (row.cells[0]?.innerText || '').trim();
        const first = text.charAt(0).toUpperCase();
        const isNumber = /[0-9]/.test(first);
        const match = letter === 'All' || (letter === '#' && isNumber) || first === letter;
        row.style.display = match ? '' : 'none';
    });

    // BUG-12: Remove all active states, then set only the clicked button
    toolbar.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
    const activeChip = Array.from(toolbar.querySelectorAll('.chip')).find(c => c.textContent === letter);
    if (activeChip) activeChip.classList.add('active');

    const info = document.getElementById('objectsPaginationInfo');
    if (info) {
        const total = table.querySelectorAll('tbody tr').length;
        const visible = rows.filter(row => row.style.display !== 'none').length;
        info.textContent = letter === 'All'
            ? `Showing 1-${Math.min(50, total)} of ${total} Objects`
            : `Filtered: ${visible} of ${total} Objects`;
    }
}

function makeStickyHeaders() {
    document.querySelectorAll('.data-table').forEach(table => table.classList.add('sticky'));
}

function enableColumnResize() {
    document.querySelectorAll('.data-table thead th').forEach(th => {
        if (th.querySelector('.col-resizer')) return;
        const handle = document.createElement('span');
        handle.className = 'col-resizer';
        th.appendChild(handle);
        th.style.position = 'relative';

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.pageX;
            const startWidth = th.offsetWidth;
            function onMove(event) {
                const width = Math.max(60, startWidth + (event.pageX - startX));
                th.style.width = width + 'px';
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    });
}

// BUG-03: Ask AI drawer panel
(function initAIPanel() {
    const SUGGESTIONS = [
        'What profiles have access to Account?',
        'List all Apex classes related to Opportunity',
        'Which flows modify Contact records?',
        'What LWC components use the wire service?',
        'Show me objects with more than 50 custom fields',
    ];

    function buildPanel() {
        const panel = document.createElement('aside');
        panel.className = 'ai-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Ask AI');
        panel.innerHTML = `
            <div class="ai-panel-header">
                <span class="ai-panel-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                    </svg>
                    Ask AI
                </span>
                <button class="ai-panel-close" aria-label="Close AI panel">&#10005;</button>
            </div>
            <div class="ai-panel-body">
                <div class="ai-panel-chips">
                    ${SUGGESTIONS.map(s => `<button class="ai-chip">${s}</button>`).join('')}
                </div>
                <textarea class="ai-panel-textarea" placeholder="Ask anything about this Salesforce org…" rows="4"></textarea>
            </div>
            <div class="ai-panel-footer">
                <button class="ai-panel-ask-btn" disabled title="Coming soon — backend not yet connected">
                    Ask
                </button>
                <div class="ai-coming-soon">AI integration coming soon</div>
            </div>
        `;
        document.body.appendChild(panel);

        // Close button
        panel.querySelector('.ai-panel-close').addEventListener('click', closeAIPanel);

        // Suggestion chips
        panel.querySelectorAll('.ai-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                panel.querySelector('.ai-panel-textarea').value = chip.textContent;
                panel.querySelector('.ai-panel-textarea').focus();
            });
        });

        // Close on Escape or overlay click
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panel.classList.contains('open')) closeAIPanel();
        });
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('open') && !panel.contains(e.target)) {
                // Check if clicked the Ask AI button (don't close)
                if (!e.target.closest('[onclick*="openAIChat"], .ask-ai-btn')) closeAIPanel();
            }
        });

        return panel;
    }

    let _panel = null;
    function getPanel() {
        if (!_panel) _panel = buildPanel();
        return _panel;
    }

    function closeAIPanel() {
        const panel = getPanel();
        panel.classList.remove('open');
        document.body.classList.remove('ai-panel-overlay-active');
    }

    window.openAIChat = function() {
        const panel = getPanel();
        panel.classList.add('open');
        document.body.classList.add('ai-panel-overlay-active');
        setTimeout(() => panel.querySelector('.ai-panel-textarea').focus(), 300);
    };
})();
