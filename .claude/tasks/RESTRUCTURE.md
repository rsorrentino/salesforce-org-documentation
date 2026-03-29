Always read before starting the pan and implementation:

C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\claude-dev-loop.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\instructions.md
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\skills
C:\Users\test\Documents\Workspace\Tools\salesforce-org-documentation\.claude\prompts

Complete Restructuring of Salesforce Technical Documentation Application
You are an expert software architect and documentation specialist. You must perform a complete restructuring of the Salesforce Technical Documentation static site generator. The application is a Node.js tool that reads Salesforce metadata XML files and generates an HTML documentation site.
Architecture Overview
The project has these key files:

generate.js — entry point, orchestrates all generators
analyzer.js — parses XML metadata files using fast-xml-parser
generators/BaseGenerator.js — base class for all generators (~937 lines), contains getLayout(), sidebar, header, table, pagination helpers
generators/index.js — exports 19 generator classes: BaseGenerator, FlowsGenerator, ProfilesGenerator, ApexGenerator, ObjectsGenerator, UIGenerator, AutomationGenerator, IntegrationsGenerator, ArchitectureGenerator, CrossReferenceGenerator, DeploymentGenerator, MaintenanceGenerator, SearchIndexGenerator, FunctionalMapGenerator, SitemapGenerator, DashboardGenerator, PermissionDrilldownGenerator, DiffGenerator, CustomMetadataGenerator
js/app.js — client-side JavaScript (~1433 lines), handles Mermaid, search, tables, pagination, dark mode, fullscreen, mobile
css/styles.css — all styles (~58K), 8 media queries, has print styles


PART 1: NAVIGATION & INFORMATION ARCHITECTURE RESTRUCTURING
1.1 — Top Navigation Bar (COMPLETELY REDESIGN)
Current state (broken): The top bar shows "Salesforce Technical Documentation" | Guides | API Reference | Deployment | [dark mode] | [search] | [Ask AI]". "Guides" links to index.html, "API Reference" links to cross-reference/index.html, "Deployment" links to deployment. These labels are arbitrary and meaningless.
Fix: Redesign the top bar to serve three audiences:
[Logo/Title] | Developer | Security | Operations | [dark mode] | [search]

Developer: dropdown menu → Data Model, Apex Layer, UI Layer (LWC/Aura/FlexiPages/VF), Automation (Flows + Triggers), Integrations, Custom Metadata
Security: dropdown menu → Profiles & Permission Sets, Permission Drilldown, Security Matrix, Profile Navigation Map
Operations: dropdown menu → Architecture Overview, Deployment & Environments, Dashboard (metrics), What Changed (diff), Documentation Health
Remove "Ask AI" button entirely (it's a stub showing "AI integration coming soon" — remove it from BaseGenerator.js header generation and from app.js)
The breadcrumb trail (currently Home / Section / Page) should remain but be placed BELOW the top bar, not inline with it

1.2 — Sidebar Navigation (RESTRUCTURE)
Current state (broken): Each page generates its own contextual sidebar (e.g., "APEX NAVIGATION" with "Overview" + "Home" on the Apex page, "FLOW NAVIGATION" with "Automation Overview" + "All Flows" + "Home" on the Flows page). The main sidebar on the homepage has inconsistent groupings: SECURITY, DATA & CODE, FRONTEND, GOVERNANCE, TOOLS.
Fix: Create a UNIFIED sidebar across ALL pages:
EXPLORE
  Home
  Dashboard

DATA MODEL
  Objects
  Relationships (new)

CODE
  Apex Classes
  Apex Triggers
  Flows
  Validation Rules (new, currently hidden inside objects)

UI COMPONENTS
  Lightning Web Components
  Aura Components
  FlexiPages
  Visualforce Pages

SECURITY
  Profiles
  Permission Sets
  Permission Drilldown
  Security Matrix

ARCHITECTURE
  System Overview
  Functional Map
  Repository Structure

MAINTENANCE
  What Changed
  Documentation Health
  Custom Metadata
Key changes:

Flows MUST be a direct sidebar link, not hidden inside the Automation page
Automation page should be MERGED into Flows (flows are the main content, triggers go under Code)
Cross-Reference page should be ELIMINATED as a standalone page — its data should be absorbed into individual detail pages (each object/class/flow page should show its cross-references inline)
Integrations page has almost no content (0 Named Credentials, 508 Static Resources) — merge Static Resources into a subsection of the Architecture or UI page
Dashboard and Custom Metadata should be direct sidebar links
The sidebar should highlight the current active section AND page
The sidebar must be the SAME structure on every page (currently it changes per page)

1.3 — Homepage Restructure
Current state: Homepage has 9 navigation cards + 4 stat cards + 3 "Key Tools" cards. Too many cards, no clear hierarchy.
Fix:

Show a welcome banner with org name and last-generated timestamp
Show a summary dashboard row: 4-6 key metrics as clickable stat cards (clicking "48 Profiles" navigates to the Profiles page)
Show a "Quick Access" section with the top 6 most-used pages as cards
Remove the duplicated "Key Tools" section (Functional Map, Security Matrix, Documentation Health are already in sidebar)
Stat cards must use consistent number formatting (use locale-formatted numbers everywhere: "2,007" not "2007")


PART 2: CROSS-LINKING & SOURCE FILE LINKS
2.1 — Add Source File Links to Every Detail Page
Current state: No detail page (object, class, flow, profile, LWC, etc.) has a link to the original source file in the repository.
Fix: In generate.js or BaseGenerator.js, accept a --repo-url CLI parameter (e.g., --repo-url=https://github.com/org/repo). Then in every detail page:

Apex class detail (class-{name}.html): Add a "View Source" link → {repoUrl}/blob/main/force-app/main/default/classes/{name}.cls
Flow detail (flow-{name}.html): Add a "View Source" link → {repoUrl}/blob/main/force-app/main/default/flows/{name}.flow-meta.xml
Object detail (object-{name}.html): Add a "View Source" link → {repoUrl}/tree/main/force-app/main/default/objects/{name}
LWC detail: Add a "View Source" link → {repoUrl}/tree/main/force-app/main/default/lwc/{name}
Profile detail: Add a "View Source" link → {repoUrl}/blob/main/releases/R1/metadata/profiles/{name}.profile-meta.xml (adjust path based on actual repository structure from analyzer.js)
Trigger detail: Add a "View Source" link → {repoUrl}/blob/main/force-app/main/default/triggers/{name}.trigger

The link should be displayed as a button/icon next to the page title, e.g.: Apex Class: AccountController [View Source ↗]
If --repo-url is not provided, don't show the link. Store the paths used by analyzer.js so the generator knows the relative path of each source file.
2.2 — Add Cross-Links Between All Pages
Current state: When an Apex class is mentioned in a Profile page, or an Object is mentioned in a class page, there are NO clickable links. The text is plain, unlinked.
Fix in every generator:
ProfilesGenerator.js:

In the Object Permissions table: object names in the OBJECT column must be <a> links to ../objects/object-{objectName}.html
In the Apex Class Access table: class names must be links to ../apex/class-{className}.html
In the Applications table: no link needed (app pages don't exist)

ApexGenerator.js:

In the class list table: class names are already links (✓)
In the class detail page "Where it is Used" section: any referenced flows, objects, or profiles must be links to their respective pages
In the Triggers section: trigger names must link to individual trigger detail pages (generate trigger-{name}.html pages if they don't exist)

ObjectsGenerator.js:

In the object detail page: field names that reference other objects (lookup/master-detail relationships) must link to the referenced object page
In the Relationships section: related object names must be clickable links
In the "Where it is Used" section: referenced apex classes, flows, LWCs, triggers must be links

FlowsGenerator.js:

In the flow detail page: any referenced Apex actions, objects, or variables that map to org components should be links

UIGenerator.js:

In the LWC/Aura/FlexiPage/VF lists: component names must be <a> links to individual detail pages
Generate detail pages for each LWC: lwc-{name}.html with component info, where-it-is-used, and source link
Generate detail pages for each FlexiPage: flexipage-{name}.html

AutomationGenerator.js:

The Workflows table should link object names to object detail pages
Trigger names should link to trigger detail pages

2.3 — Eliminate Cross-Reference Standalone Page
The current cross-reference page (pages/cross-reference/index.html) is a flat table of Profile → Apex Classes relationships. This data is NOT useful as a standalone page.
Fix: Remove CrossReferenceGenerator.js as a standalone page generator. Instead, integrate its data:

On each Profile page: show a "Related Apex Classes" count that links to an inline expandable section
On each Apex Class page: show "Profiles with access" as a list with links
On the Dashboard: show a "Cross-Reference Statistics" summary card


PART 3: TABLE & PAGINATION FIXES
3.1 — Fix Duplicate Pagination
Current state: Tables have TWO conflicting pagination systems:

An inline red "Prev/Next" with "Page 1/4 - Showing 50 of 200"
A separate numbered pagination bar "← Previous 1 2 3 ... 41 Next →"

These show DIFFERENT numbers. On the Apex page: the header says "Showing 1-50 of 59", the inline pagination says "Showing 50 of 200", and the numbered pagination has 41 pages.
Root cause: The BaseGenerator.js generates inline table pagination (the red Prev/Next), and app.js adds its own JS-based pagination on top. The row counts come from different data sources.
Fix:

Remove the inline HTML pagination generated by BaseGenerator.js (the red Prev/Next buttons and "Showing X of Y" inside the table)
Keep ONLY the JavaScript-based pagination from app.js (the numbered ← 1 2 3 ... N → bar)
Fix app.js pagination to count rows correctly: it should count ALL <tbody tr> elements in the table, not use a separate number
The "Showing X-Y of Z" indicator should be generated by JS at runtime based on actual visible/total rows
Rows-per-page selector should be a dropdown with options: 25, 50, 100, All
Table headers must be sticky (position: sticky; top: 0) so they remain visible when scrolling through many rows

3.2 — Fix Stat Card vs Table Count Mismatches
Current state: Multiple pages show conflicting numbers:

Apex Layer: stat card says "2007 Apex Classes" but the table has 800 rows (59 with detail pages)
UI Layer: stat card says "1648 LWC Components" but the table shows "Showing 1-50 of 238"
Security & Access: stat card says "48 Profiles" but the table shows "Showing 1-50 of 66"
Automation: stat card says "7 Workflows" but the table shows "Showing 1-50 of 192"

Root cause: The stat cards count metadata items from the XML (e.g., 2007 = total classes referenced across all profiles). The tables count only items that have generated HTML files (59 classes with source files). These are two different metrics being displayed as if they're the same thing.
Fix:

Each stat card must use the SAME number as its corresponding table's total row count
If a stat card shows "2007 Apex Classes (metadata references)" and the table shows 800 classes with source files, show TWO numbers: "800 Apex Classes documented | 2007 total references across profiles"
In ProfilesGenerator.js, ApexGenerator.js, UIGenerator.js, AutomationGenerator.js: make the stat card value equal to the length of the data array that populates the table
Add a tooltip or subtitle to stat cards explaining what the number represents

3.3 — Fix Table Layout
Current state: Tables have inconsistent column widths, no text wrapping for long names, and the header row scrolls out of view.
Fix in css/styles.css:

Add thead { position: sticky; top: 0; z-index: 10; } to keep headers visible
Add table { table-layout: fixed; } and define column widths
Add td { word-break: break-word; } for long names
For the NAME column: width: 40%, for TYPE/STATUS badges: width: 15%, for numeric columns: width: 10%
Add alternating row colors for readability: tbody tr:nth-child(even) { background: var(--bg-secondary); }


PART 4: DIAGRAM FIXES
4.1 — Fix UML Data Model Diagram (CRITICAL — Currently Broken)
Current state: The erDiagram on pages/objects/index.html renders with viewBox="-8 -8 16 16" — a 16×16px viewport — while the actual content spans 2990×150px. The entities exist in the SVG but are invisible because the viewBox is too small.
Root cause: Mermaid's erDiagram renderer fails to compute the correct viewBox for the generated SVG. The entities render at positions far outside the tiny default viewBox.
Fix in app.js — add a post-render viewBox fix:
javascript// After mermaid.run() completes, fix any erDiagram SVGs
document.querySelectorAll('.mermaid svg').forEach(svg => {
  const bbox = svg.getBBox();
  if (bbox.width > 20 || bbox.height > 20) { // Only fix if content exists outside default viewBox
    const padding = 20;
    svg.setAttribute('viewBox', 
      `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
    );
  }
});
```

Also in `ObjectsGenerator.js`, limit the erDiagram to the top 30-50 most-connected objects (currently it tries to render ALL objects which overwhelms Mermaid). Add pagination or filtering for the diagram: "Show: Top 20 | Top 50 | All objects".

### 4.2 — Add Zoom and Pan to ALL Diagrams

**Current state:** Flow diagrams and functional maps have only a "Full Screen" button. No zoom, no pan, no print. Labels are truncated (e.g., "Get Current Accour" instead of "Get Current Account", "Star" instead of "Start").

**Fix — add a diagram toolbar to ALL Mermaid containers:**

In `app.js`, for every `.diagram-container` or `.uml-container`:
```
[Zoom In +] [Zoom Out -] [Fit to View] [Full Screen] [Print Diagram] [Download SVG]
```

Implementation:
- Wrap every Mermaid SVG in a `<div class="diagram-viewport">` with `overflow: auto; position: relative;`
- Zoom In/Out: apply CSS `transform: scale(N)` to the SVG, incrementing by 0.25x
- Fit to View: calculate the SVG's natural size and scale to fit the container width
- Print Diagram: `window.print()` with a print stylesheet that hides everything except the diagram
- Download SVG: extract the SVG innerHTML and create a downloadable `.svg` file
- Enable mouse wheel zoom: `ctrl+scroll` to zoom in/out
- Enable click-and-drag pan when zoomed in

### 4.3 — Fix Flow Diagram Label Truncation

**Current state in `FlowsGenerator.js`:** Node labels are truncated to ~20 characters, producing unreadable labels like "Check Account Data BE Before Sc...", "Insert Missing Data E", "Star" (should be "Start").

**Fix in `FlowsGenerator.js`:**
- Remove or increase the character limit for Mermaid node labels. Currently labels are cut at ~20 chars — increase to 50 or remove the limit entirely
- For the `Start` and `End` nodes: ensure they're not truncated — use the full word
- Use Mermaid's line-break syntax `<br/>` for labels longer than 30 chars instead of truncating:
```
  node["Check Account Data<br/>BE Before Scoring"]
```

### 4.4 — Fix Functional Map Layout

**Current state:** The Functional Map (`pages/architecture/functional-map.html`) renders as a single vertical column of FlexiPage nodes stacked one below another. The diagram is extremely tall (~5000px) and unusable.

**Fix in `FunctionalMapGenerator.js`:**
- Group nodes by type: FlexiPages, LWC, Apex, Flows, Triggers, Objects
- Use Mermaid's `subgraph` to create visual groupings:
```
  subgraph Presentation["Presentation Layer"]
    FlexiPage1 --> LWC1
    FlexiPage2 --> LWC2
  end
  subgraph Logic["Business Logic"]
    Apex1
    Flow1
  end

Use graph LR (left-to-right) instead of graph TD (top-down) for better horizontal layout
Limit the number of nodes shown (top 50 most-connected) and add a "Show All" toggle
Add a legend explaining the node types and colors


PART 5: REMAINING BUG FIXES
5.1 — Remove # Anchor Symbol from Section Headers
Current state: When collapsible sections are expanded, the header shows a visible # character (e.g., "Profile Access Map #"). This # is the anchor link markup leaking into the visible text.
Fix in BaseGenerator.js: Find where section headers are generated with <a href="#..."> anchors and ensure the # is either hidden with CSS (visibility: hidden or font-size: 0) or wrapped in a <span class="anchor-link"> that's only visible on hover.
5.2 — Fix "-0 Removed Items" on What Changed Page
Current state: The "What Changed" page shows -0 Removed items as a stat card.
Fix in DiffGenerator.js: When removed count is 0, display 0 Removed items (without the minus sign). Only show the minus prefix for non-zero negative values.
5.3 — Fix Search Relevance
Current state: Searching for "Account" returns 467 results including ALL 48 profiles (because every profile has an Account object permission). The search results are overwhelmed with noise.
Fix in SearchIndexGenerator.js and app.js:

Weight search results: exact name match > partial name match > content match
Show top 20 results maximum in the dropdown, grouped by type
Add a "See all N results" link at the bottom that opens a full search results page
Debounce the search input (300ms) to avoid searching on every keystroke
ESC key should clear the search text AND close the dropdown

5.4 — Fix Mobile Responsiveness
Current state: The sidebar does not collapse on mobile. There is no hamburger menu. The top bar wraps/overflows.
Fix in css/styles.css and app.js:

At @media (max-width: 768px): hide sidebar, show hamburger button, make top bar responsive
Hamburger button toggles sidebar as an overlay
Tables should be horizontally scrollable on mobile (overflow-x: auto)
Stat cards should wrap to 2 columns on tablet, 1 column on mobile

5.5 — Remove Non-Functional Features

Remove the "Ask AI" button from the header (it's a stub)
Remove the "Download JSON" button from pages where it doesn't provide value, or make it consistent (currently some pages have it and some don't)
If keeping Download JSON, make it a smaller icon button (not a large red button)

5.6 — Fix Dark Mode for Diagrams
Ensure Mermaid diagrams respect dark mode by re-rendering them when the theme changes. In app.js, after toggling dark mode:
javascript// Re-initialize mermaid with dark theme
mermaid.initialize({ theme: isDarkMode ? 'dark' : 'default', ... });
// Re-render all diagrams
document.querySelectorAll('.mermaid').forEach(el => {
  el.removeAttribute('data-processed');
  // Re-render
});
mermaid.run();

PART 6: PRINT SUPPORT
Add proper print stylesheet in css/styles.css:
css@media print {
  .sidebar, .top-nav, .search-container, .ai-button, .diagram-toolbar,
  .export-btn, .columns-btn, .pagination, .back-to-top { display: none !important; }
  .main-content { margin: 0; width: 100%; }
  .collapsible-content { display: block !important; max-height: none !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  .stat-card { border: 1px solid #ccc; }
  .mermaid svg { max-width: 100%; height: auto; }
}

PART 7: FILES TO MODIFY
In order of priority:

generators/BaseGenerator.js — Top nav redesign, sidebar unification, remove inline pagination, remove Ask AI, fix # anchor visibility, add source link support, add repoUrl config
js/app.js — Fix JS pagination to be the single pagination source, add diagram zoom/pan/print, fix search relevance, fix mobile hamburger, fix erDiagram viewBox, fix dark mode re-rendering of diagrams
css/styles.css — Sticky table headers, table layout fixes, print stylesheet, mobile responsive fixes, stat card number formatting, diagram toolbar styles
generators/ProfilesGenerator.js — Add cross-links for objects and classes, fix stat card counts
generators/ApexGenerator.js — Add cross-links, fix stat card count (table rows = stat card number), add source links, add trigger detail pages
generators/ObjectsGenerator.js — Fix erDiagram (limit entities, fallback if empty), add cross-links for relationships, add source links
generators/FlowsGenerator.js — Fix label truncation, add source links
generators/UIGenerator.js — Generate detail pages for LWC/Aura/FlexiPage/VF components, add source links, fix stat card counts
generators/AutomationGenerator.js — Merge flows section here or redirect, fix Workflows count mismatch (header says "7" but table has 192), add cross-links
generators/FunctionalMapGenerator.js — Fix vertical-only layout, use subgraphs, limit nodes
generators/ArchitectureGenerator.js — Absorb Integrations static resources, fix repository structure counts
generators/DiffGenerator.js — Fix "-0" display
generators/SearchIndexGenerator.js — Improve search relevance scoring
generators/DashboardGenerator.js — Fix trend badges (all showing ↑+N equal to total), link stat cards to pages
generators/CrossReferenceGenerator.js — Remove as standalone page, distribute data to detail pages
generate.js — Add --repo-url CLI parameter, pass it to all generators


VALIDATION CHECKLIST
After implementation, verify:

 Every Apex class name in any table is a clickable link to its detail page
 Every Object name in any table is a clickable link to its detail page
 Every Flow name in any table is a clickable link to its detail page
 Every Profile name in any table is a clickable link to its detail page
 Every detail page has a "View Source" button (when --repo-url is provided)
 The Data Model UML diagram renders with correct viewBox showing all entities
 Flow diagrams show FULL labels (no truncation of "Start", no cutting at 20 chars)
 All diagrams have zoom in/out, fit-to-view, and print buttons
 There is only ONE pagination system per table (the JS-based numbered one)
 Stat card numbers match their corresponding table total row counts
 The top navigation has Developer/Security/Operations dropdowns (not Guides/API Reference/Deployment)
 The sidebar is identical on every page
 Flows are accessible directly from the sidebar, not hidden behind the Automation page
 Cross-reference page is removed; its data appears inline on detail pages
 Mobile viewport shows a working hamburger menu
 Ctrl+P prints a clean page without sidebars/navbars
 Dark mode correctly re-renders Mermaid diagrams
 Search for "Account" returns the Account object as the #1 result, not 467 irrelevant profiles