/**
 * Pagination Handler
 * 
 * Handles pagination via URL query parameters for static pages
 */

(function() {
    'use strict';
    
    /**
     * Get current page from URL query parameter
     */
    function getCurrentPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = parseInt(urlParams.get('page'), 10);
        return isNaN(page) || page < 1 ? 1 : page;
    }
    
    /**
     * Update pagination links to include current page context
     */
    function updatePaginationLinks() {
        const currentPage = getCurrentPage();
        const pagination = document.querySelector('.pagination');
        
        if (!pagination) return;
        
        // Update all pagination links to preserve hash if present
        const hash = window.location.hash;
        const paginationLinks = pagination.querySelectorAll('a');
        
        paginationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.includes('#')) {
                // Preserve hash in pagination links
                link.setAttribute('href', href + hash);
            }
        });
    }
    
    /**
     * Initialize pagination on page load
     */
    function init() {
        updatePaginationLinks();
        
        // Highlight current page
        const currentPage = getCurrentPage();
        const paginationNumbers = document.querySelectorAll('.pagination-number');
        paginationNumbers.forEach((num, index) => {
            if (num.textContent.trim() === String(currentPage)) {
                num.classList.add('pagination-active');
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
