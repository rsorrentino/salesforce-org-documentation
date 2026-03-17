/**
 * Profiles Generator
 * 
 * Generates documentation pages for Salesforce Profiles and Security:
 * - Security overview page
 * - Individual profile pages
 * - Profile navigation map
 */

import { BaseGenerator } from './BaseGenerator.js';
import path from 'path';
import fs from 'fs/promises';

export class ProfilesGenerator extends BaseGenerator {
    constructor(repoRoot, data, toolDir) {
        super(repoRoot, data, toolDir);
        this.type = 'profiles';
    }
    
    /**
     * Generate all profile pages
     */
    async generate() {
        console.log('  Generating profile pages...');
        
        // Generate security overview
        await this.generateOverviewPage();
        
        // Generate profile navigation map
        await this.generateNavigationMap();

        // Generate permissions matrix
        await this.generatePermissionsMatrixPage();
        
        // Generate individual permission set pages
        await this.generatePermissionSetPages();

        // Generate individual profile pages
        await this.generateIndividualPages();
        
        console.log(`    Generated profile documentation successfully.`);
    }

    /**
     * Generate security permissions matrix page
     */
    async generatePermissionsMatrixPage() {
        const profiles = this.data.profiles || {};
        const permissionSets = this.data.permissionSets || {};

        const objectNames = new Set();
        Object.values(profiles).forEach(profile => {
            Object.keys(profile.objectPermissions || {}).forEach(obj => objectNames.add(obj));
        });
        Object.values(permissionSets).forEach(ps => {
            Object.keys(ps.objectPermissions || {}).forEach(obj => objectNames.add(obj));
        });

        const objects = Array.from(objectNames).sort();

        const data = {
            PROFILES_COUNT: Object.keys(profiles).length,
            PERMISSIONSETS_COUNT: Object.keys(permissionSets).length,
            OBJECTS_COUNT: objects.length,
            OBJECT_ACCESS_ROWS: this.buildObjectAccessRows(objects, profiles, permissionSets),
            PROFILE_ACCESS_ROWS: this.buildProfileAccessRows(profiles),
            PERMISSIONSET_ACCESS_ROWS: this.buildPermissionSetAccessRows(permissionSets)
        };

        const templatePath = path.join(this.getTemplateDir(this.type), 'permissions-matrix.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Security Navigation</h3>
                    <ul>
                        <li><a href="index.html">Security Overview</a></li>
                        <li><a href="navigation-map.html">Profile Map</a></li>
                        <li><a href="permissions-matrix.html" class="active">Security Matrix</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'permissions-matrix.html', html, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'permissions-matrix',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            console.warn('    Permissions matrix template not found, creating basic page');
            const basicHtml = this.createBasicPermissionsMatrixPage(data);
            await this.writePage(this.type, 'permissions-matrix.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'permissions-matrix',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }

    /**
     * Generate individual permission set detail pages
     */
    async generatePermissionSetPages() {
        const permissionSets = Object.entries(this.data.permissionSets || {})
            .sort(([a], [b]) => a.localeCompare(b));

        if (permissionSets.length === 0) return;

        const templatePath = path.join(this.getTemplateDir(this.type), 'permissionset.html');
        let templateExists = true;
        try {
            await fs.access(templatePath);
        } catch {
            templateExists = false;
        }

        for (const [psName, psData] of permissionSets) {
            const safeName = psName.replace(/[^a-zA-Z0-9]/g, '_');

            const data = {
                PERMISSIONSET_NAME: psName,
                PERMISSIONSET_DESCRIPTION: psData.description || '',
                PERMISSIONSET_FILE: psData.file || '',
                CLASSES_COUNT: psData.classes?.length || 0,
                CLASSES_LIST: this.generateClassesList(psData.classes || []),
                OBJECTS_COUNT: Object.keys(psData.objectPermissions || {}).length,
                OBJECTS_LIST: this.generateObjectsList(psData.objectPermissions || {}),
                CUSTOM_PERMISSIONS_COUNT: psData.customPermissions?.length || 0,
                CUSTOM_PERMISSIONS_LIST: this.generateSimpleList(psData.customPermissions || []),
            };

            let html;
            if (templateExists) {
                html = await this.renderTemplate(templatePath, data);
            } else {
                html = this.createBasicPermissionSetPage(data);
            }

            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Security Navigation</h3>
                    <ul>
                        <li><a href="index.html">Security Overview</a></li>
                        <li><a href="navigation-map.html">Profile Map</a></li>
                        <li><a href="permissions-matrix.html">Security Matrix</a></li>
                    </ul>
                </div>
            `;

            await this.writePage(this.type, `permissionset-${safeName}.html`, html, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'permissionset',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Generate security overview page
     */
    /**
     * Generate Roles list HTML
     */
    generateRolesList() {
        const roles = this.data.roles || {};
        const names = Object.keys(roles).sort();
        if (names.length === 0) return '<p>No roles found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Roles</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="rolesTable">\n';
        html += '<thead><tr><th>Role API Name</th><th>Label</th><th>Parent Role</th><th>Case Access</th><th>Contact Access</th><th>Opp Access</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const key of names) {
            const d = roles[key] || {};
            html += `<tr>
                <td><strong>${this.escapeHtml(key)}</strong></td>
                <td>${this.escapeHtml(d.name || '')}</td>
                <td>${this.escapeHtml(d.parentRole || '')}</td>
                <td>${this.escapeHtml(d.caseAccessLevel || '')}</td>
                <td>${this.escapeHtml(d.contactAccessLevel || '')}</td>
                <td>${this.escapeHtml(d.opportunityAccessLevel || '')}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#rolesTable');
        }
        return html;
    }

    /**
     * Generate Queues list HTML
     */
    generateQueuesList() {
        const queues = this.data.queues || {};
        const names = Object.keys(queues).sort();
        if (names.length === 0) return '<p>No queues found.</p>';

        let html = `<div class="pagination-info">Showing 1-${Math.min(50, names.length)} of ${names.length} Queues</div>\n`;
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="queuesTable">\n';
        html += '<thead><tr><th>Queue API Name</th><th>Label</th><th>Objects Serviced</th><th>Email Members</th></tr></thead>\n';
        html += '<tbody>\n';
        for (const key of names) {
            const d = queues[key] || {};
            const objects = (d.objects || []).join(', ');
            html += `<tr>
                <td><strong>${this.escapeHtml(key)}</strong></td>
                <td>${this.escapeHtml(d.name || '')}</td>
                <td>${this.escapeHtml(objects)}</td>
                <td>${d.emailMembers ? 'Yes' : 'No'}</td>
            </tr>\n`;
        }
        html += '</tbody></table></div>\n';
        if (names.length > 50) {
            html += this.generatePagination(1, Math.ceil(names.length / 50), 'index.html#queuesTable');
        }
        return html;
    }

    async generateOverviewPage() {
        const profilesList = Object.keys(this.data.profiles || {}).sort();
        const psList = Object.keys(this.data.permissionSets || {}).sort();
        const psgList = Object.keys(this.data.permissionSetGroups || {}).sort();

        const data = {
            PROFILES_COUNT: profilesList.length,
            PERMISSIONSETS_COUNT: psList.length,
            PERMISSIONSETGROUPS_COUNT: psgList.length,
            ROLES_COUNT: Object.keys(this.data.roles || {}).length,
            QUEUES_COUNT: Object.keys(this.data.queues || {}).length,
            PROFILES_LIST: this.generateProfilesList(profilesList),
            PERMISSIONSETS_LIST: this.generatePermissionSetsList(psList),
            ROLES_LIST: this.generateRolesList(),
            QUEUES_LIST: this.generateQueuesList(),
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'overview.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Security Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Security Overview</a></li>
                        <li><a href="navigation-map.html">Profile Map</a></li>
                        <li><a href="permissions-matrix.html">Security Matrix</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'index.html', html, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'index',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            console.warn(`    Template not found, creating basic overview page`);
            const basicHtml = this.createBasicOverview(data);
            await this.writePage(this.type, 'index.html', basicHtml, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'index',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Generate profile navigation map
     */
    async generateNavigationMap() {
        const profiles = Object.entries(this.data.profiles || {})
            .sort(([a], [b]) => a.localeCompare(b));
        
        const data = {
            PROFILE_MAP: this.generateProfileMapMermaid(profiles),
        };
        
        const templatePath = path.join(this.getTemplateDir(this.type), 'navigation-map.html');
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Security Navigation</h3>
                    <ul>
                        <li><a href="index.html">Security Overview</a></li>
                        <li><a href="navigation-map.html" class="active">Profile Map</a></li>
                        <li><a href="permissions-matrix.html">Security Matrix</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, 'navigation-map.html', html, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'navigation-map',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });

            // Backward-compatible alias (older links used this filename)
            await this.writePage(this.type, 'profile-navigation-map.html', html, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'navigation-map',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // Skip if template doesn't exist
            console.warn(`    Navigation map template not found, skipping...`);
        }
    }
    
    /**
     * Generate individual profile pages
     */
    async generateIndividualPages() {
        const profiles = Object.entries(this.data.profiles || {});
        const templatePath = path.join(this.getTemplateDir(this.type), 'profile.html');
        
        // Verify template exists
        try {
            await fs.access(templatePath);
        } catch (error) {
            console.error(`    Template not found: ${templatePath}`);
            console.error(`    Available templates in ${this.getTemplateDir(this.type)}:`);
            try {
                const files = await fs.readdir(this.getTemplateDir(this.type));
                console.error(`    ${files.join(', ')}`);
            } catch (e) {
                console.error(`    Directory does not exist`);
            }
        }
        
        let successCount = 0;
        for (const [profileName, profileData] of profiles) {
            try {
                await this.generateProfilePage(profileName, profileData, templatePath);
                successCount++;
            } catch (error) {
                console.error(`    Error generating page for profile ${profileName}:`, error.message);
            }
        }
        
        console.log(`    Generated ${successCount}/${profiles.length} profile pages.`);
    }
    
    /**
     * Generate a single profile page
     */
    async generateProfilePage(profileName, profileData, templatePath) {
        const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
        
        const data = {
            PROFILE_NAME: profileName,
            APPLICATIONS_COUNT: profileData.applications?.length || 0,
            APPLICATIONS_LIST: this.generateApplicationsList(profileData.applications || []),
            CLASSES_COUNT: profileData.classes?.length || 0,
            CLASSES_LIST: this.generateClassesList(profileData.classes || []),
            OBJECTS_COUNT: Object.keys(profileData.objectPermissions || {}).length,
            OBJECTS_LIST: this.generateObjectsList(profileData.objectPermissions || {}),
            PAGES_COUNT: profileData.pages?.length || 0,
            PAGES_LIST: this.generatePagesList(profileData.pages || []),
        };
        
        try {
            const html = await this.renderTemplate(templatePath, data);
            const sectionNavHtml = `
                <div class="nav-section">
                    <h3>Security Navigation</h3>
                    <ul>
                        <li><a href="index.html">Security Overview</a></li>
                        <li><a href="navigation-map.html">Profile Map</a></li>
                        <li><a href="permissions-matrix.html">Security Matrix</a></li>
                    </ul>
                </div>
            `;
            await this.writePage(this.type, `profile-${safeName}.html`, html, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'profile',
                depthToRoot: 2,
                sectionNavHtml,
                activeTop: 'guides'
            });
        } catch (error) {
            // If template doesn't exist, create a basic one
            const basicHtml = this.createBasicProfilePage(profileName, profileData, data);
            await this.writePage(this.type, `profile-${safeName}.html`, basicHtml, {
                standardizeLayout: true,
                currentPage: 'profiles',
                currentSubPage: 'profile',
                depthToRoot: 2,
                activeTop: 'guides'
            });
        }
    }
    
    /**
     * Generate profiles list HTML with pagination
     */
    generateProfilesList(profilesList, currentPage = 1, itemsPerPage = 50) {
        if (profilesList.length === 0) return '<p>No profiles found.</p>';
        
        // Sort profiles
        const sorted = profilesList.sort();
        
        // Paginate
        const pagination = this.paginateItems(sorted, itemsPerPage, currentPage);
        const paginatedProfiles = pagination.items;
        
        let html = '';
        
        // Pagination info
        html += `<div class="pagination-info">Showing ${pagination.startIndex}-${pagination.endIndex} of ${pagination.totalItems} Profiles</div>\n`;
        
        // Table format
        html += '<div class="table-container">\n';
        html += '<table class="data-table">\n';
        html += '<thead><tr><th>Profile Name</th><th>Applications</th><th>Classes</th><th>Objects</th></tr></thead>\n';
        html += '<tbody>\n';
        
        for (const profileName of paginatedProfiles) {
            const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
            const profileData = this.data.profiles[profileName] || {};
            const appsCount = profileData.applications?.length || 0;
            const classesCount = profileData.classes?.length || 0;
            const objectsCount = Object.keys(profileData.objectPermissions || {}).length;
            
            html += `            <tr>
                <td><a href="profile-${safeName}.html">${this.escapeHtml(profileName)}</a></td>
                <td>${appsCount}</td>
                <td>${classesCount}</td>
                <td>${objectsCount}</td>
            </tr>\n`;
        }
        
        html += '        </tbody></table></div>\n';
        
        // Pagination controls - always generate if more than one page
        if (pagination.totalPages > 1) {
            html += this.generatePagination(currentPage, pagination.totalPages, 'index.html#profiles');
        }
        
        return html;
    }
    
    /**
     * Generate permission sets list HTML with pagination
     */
    generatePermissionSetsList(psList, currentPage = 1, itemsPerPage = 50) {
        if (psList.length === 0) return '<p>No permission sets found.</p>';
        
        // Sort permission sets
        const sorted = psList.sort();
        
        // Calculate pagination info
        const totalPages = Math.ceil(sorted.length / itemsPerPage);
        
        let html = '';
        
        // Pagination info (will be updated by JS)
        html += `<div class="pagination-info">Showing 1-${Math.min(itemsPerPage, sorted.length)} of ${sorted.length} Permission Sets</div>\n`;
        
        // Table format with ALL items (client-side JS will paginate)
        html += '<div class="table-container">\n';
        html += '<table class="data-table" id="permissionsetsTable">\n';
        html += '<thead><tr><th>Permission Set Name</th></tr></thead>\n';
        html += '<tbody>\n';
        
        for (const psName of sorted) {
            const safeName = psName.replace(/[^a-zA-Z0-9]/g, '_');
            html += `            <tr><td><a href="permissionset-${safeName}.html"><strong>${this.escapeHtml(psName)}</strong></a></td></tr>\n`;
        }
        
        html += '        </tbody></table></div>\n';
        
        // Pagination controls - always generate if more than one page
        if (totalPages > 1) {
            html += this.generatePagination(1, totalPages, 'index.html#permissionsets');
        }
        
        return html;
    }

    buildObjectAccessRows(objects, profiles, permissionSets) {
        if (!objects.length) return '<tr><td colspan="10"><em>No object permissions found.</em></td></tr>';

        const profileList = Object.values(profiles || {});
        const permissionSetList = Object.values(permissionSets || {});
        let rows = '';

        for (const objName of objects) {
            let pRead = 0, pCreate = 0, pEdit = 0, pDelete = 0, pFull = 0;
            let psRead = 0, psCreate = 0, psEdit = 0, psDelete = 0;

            for (const profile of profileList) {
                const perm = profile.objectPermissions?.[objName];
                if (!perm) continue;
                if (perm.allowRead || perm.read) pRead++;
                if (perm.allowCreate || perm.create) pCreate++;
                if (perm.allowEdit || perm.edit) pEdit++;
                if (perm.allowDelete || perm.delete) pDelete++;
                if (perm.viewAllRecords || perm.modifyAllRecords) pFull++;
            }

            for (const ps of permissionSetList) {
                const perm = ps.objectPermissions?.[objName];
                if (!perm) continue;
                if (perm.allowRead || perm.read) psRead++;
                if (perm.allowCreate || perm.create) psCreate++;
                if (perm.allowEdit || perm.edit) psEdit++;
                if (perm.allowDelete || perm.delete) psDelete++;
            }

            rows += `<tr>
                <td><strong>${this.escapeHtml(objName)}</strong></td>
                <td>${pRead}</td>
                <td>${pCreate}</td>
                <td>${pEdit}</td>
                <td>${pDelete}</td>
                <td>${pFull}</td>
                <td>${psRead}</td>
                <td>${psCreate}</td>
                <td>${psEdit}</td>
                <td>${psDelete}</td>
            </tr>`;
        }

        return rows;
    }

    buildProfileAccessRows(profiles) {
        const profileNames = Object.keys(profiles || {}).sort();
        if (!profileNames.length) return '<tr><td colspan="6"><em>No profiles found.</em></td></tr>';

        let rows = '';
        for (const profileName of profileNames) {
            const profile = profiles[profileName];
            const perms = Object.values(profile.objectPermissions || {});
            let read = 0, create = 0, edit = 0, del = 0, full = 0;
            for (const perm of perms) {
                if (perm.allowRead || perm.read) read++;
                if (perm.allowCreate || perm.create) create++;
                if (perm.allowEdit || perm.edit) edit++;
                if (perm.allowDelete || perm.delete) del++;
                if (perm.viewAllRecords || perm.modifyAllRecords) full++;
            }
            const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
            rows += `<tr>
                <td><a href="profile-${safeName}.html">${this.escapeHtml(profileName)}</a></td>
                <td>${read}</td>
                <td>${create}</td>
                <td>${edit}</td>
                <td>${del}</td>
                <td>${full}</td>
            </tr>`;
        }
        return rows;
    }

    buildPermissionSetAccessRows(permissionSets) {
        const psNames = Object.keys(permissionSets || {}).sort();
        if (!psNames.length) return '<tr><td colspan="5"><em>No permission sets found.</em></td></tr>';

        let rows = '';
        for (const psName of psNames) {
            const ps = permissionSets[psName];
            const perms = Object.values(ps.objectPermissions || {});
            let read = 0, create = 0, edit = 0, del = 0;
            for (const perm of perms) {
                if (perm.allowRead || perm.read) read++;
                if (perm.allowCreate || perm.create) create++;
                if (perm.allowEdit || perm.edit) edit++;
                if (perm.allowDelete || perm.delete) del++;
            }
            const safeName = psName.replace(/[^a-zA-Z0-9]/g, '_');
            rows += `<tr>
                <td><a href="permissionset-${safeName}.html">${this.escapeHtml(psName)}</a></td>
                <td>${read}</td>
                <td>${create}</td>
                <td>${edit}</td>
                <td>${del}</td>
            </tr>`;
        }
        return rows;
    }

    createBasicPermissionsMatrixPage(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Matrix - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Security Matrix</h2>
            <section>
                <h3>Object Access Summary</h3>
                <div class="table-container">
                    <table class="data-table compact">
                        <thead>
                            <tr>
                                <th>Object</th>
                                <th>Profiles Read</th>
                                <th>Profiles Create</th>
                                <th>Profiles Edit</th>
                                <th>Profiles Delete</th>
                                <th>Profiles Full Access</th>
                                <th>PS Read</th>
                                <th>PS Create</th>
                                <th>PS Edit</th>
                                <th>PS Delete</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.OBJECT_ACCESS_ROWS}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>
</body>
</html>`;
    }

    generateSimpleList(items) {
        if (!items || items.length === 0) return '<p><em>None</em></p>';
        return `<ul>${items.slice(0, 200).map(i => `<li>${this.escapeHtml(String(i))}</li>`).join('')}</ul>`;
    }

    createBasicPermissionSetPage(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Permission Set: ${this.escapeHtml(data.PERMISSIONSET_NAME)} - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / <a href="index.html">Security</a> / Permission Set: ${this.escapeHtml(data.PERMISSIONSET_NAME)}
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar"></nav>
            <main class="main-content">
                <h2>Permission Set: ${this.escapeHtml(data.PERMISSIONSET_NAME)}</h2>
                <section>
                    <h3>Summary</h3>
                    <div class="info-box">
                        ${data.PERMISSIONSET_DESCRIPTION ? `<p><strong>Description:</strong> ${this.escapeHtml(data.PERMISSIONSET_DESCRIPTION)}</p>` : ''}
                        ${data.PERMISSIONSET_FILE ? `<p><strong>Source:</strong> <code>${this.escapeHtml(data.PERMISSIONSET_FILE)}</code></p>` : ''}
                    </div>
                </section>
                <section>
                    <h3>Apex Classes (${data.CLASSES_COUNT})</h3>
                    ${data.CLASSES_LIST}
                </section>
                <section>
                    <h3>Object Permissions (${data.OBJECTS_COUNT})</h3>
                    ${data.OBJECTS_LIST}
                </section>
                <section>
                    <h3>Custom Permissions (${data.CUSTOM_PERMISSIONS_COUNT})</h3>
                    ${data.CUSTOM_PERMISSIONS_LIST}
                </section>
            </main>
        </div>
        <footer>
            <p>Salesforce Technical Documentation</p>
        </footer>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;
    }
    
    /**
     * Generate applications list HTML
     */
    generateApplicationsList(applications) {
        if (!applications || applications.length === 0) return '<p>No applications assigned.</p>';
        
        let html = '<div class="table-container">\n';
        html += '            <table class="data-table">\n';
        html += '                <thead>\n';
        html += '                    <tr><th>Application Name</th><th>Visibility</th></tr>\n';
        html += '                </thead>\n';
        html += '                <tbody>\n';
        
        for (const app of applications) {
            // Handle both object and string formats
            const appName = typeof app === 'string' ? app : (app?.name || app?.application || String(app));
            const isVisible = typeof app === 'object' && app !== null ? (app.visible !== false) : true;
            
            html += `                    <tr>
                        <td>${this.escapeHtml(appName)}</td>
                        <td><span class="badge ${isVisible ? 'badge-success' : 'badge-secondary'}">${isVisible ? 'Visible' : 'Hidden'}</span></td>
                    </tr>\n`;
        }
        
        html += '                </tbody>\n';
        html += '            </table>\n';
        html += '        </div>';
        return html;
    }
    
    /**
     * Generate classes list HTML
     */
    generateClassesList(classes) {
        if (!classes || classes.length === 0) return '<p>No classes assigned.</p>';
        
        let html = '<div class="table-container">\n';
        html += '            <table class="data-table">\n';
        html += '                <thead>\n';
        html += '                    <tr><th>Apex Class</th><th>Status</th></tr>\n';
        html += '                </thead>\n';
        html += '                <tbody>\n';
        
        for (const cls of classes) {
            // Handle both object and string formats
            const className = typeof cls === 'string' ? cls : (cls?.name || cls?.apexClass || String(cls));
            const isEnabled = typeof cls === 'object' && cls !== null ? (cls.enabled !== false) : true;
            
            html += `                    <tr>
                        <td>${this.escapeHtml(className)}</td>
                        <td><span class="badge ${isEnabled ? 'badge-success' : 'badge-secondary'}">${isEnabled ? 'Enabled' : 'Disabled'}</span></td>
                    </tr>\n`;
        }
        
        html += '                </tbody>\n';
        html += '            </table>\n';
        html += '        </div>';
        return html;
    }
    
    /**
     * Generate objects list HTML
     */
    generateObjectsList(objectPermissions) {
        if (!objectPermissions || typeof objectPermissions !== 'object') {
            return '<p>No object permissions configured.</p>';
        }
        
        const objects = Object.keys(objectPermissions);
        if (objects.length === 0) return '<p>No object permissions configured.</p>';
        
        let html = '<div class="table-container">\n';
        html += '            <table class="data-table">\n';
        html += '                <thead>\n';
        html += '                    <tr><th>Object</th><th>Read</th><th>Create</th><th>Edit</th><th>Delete</th></tr>\n';
        html += '                </thead>\n';
        html += '                <tbody>\n';
        
        for (const objName of objects.slice(0, 100)) {
            const perm = objectPermissions[objName] || {};
            const read = perm.read || perm.allowRead || 'No';
            const create = perm.create || perm.allowCreate || 'No';
            const edit = perm.edit || perm.allowEdit || 'No';
            const del = perm.delete || perm.allowDelete || 'No';
            
            html += `                    <tr>
                        <td><strong>${this.escapeHtml(objName)}</strong></td>
                        <td>${this.escapeHtml(String(read))}</td>
                        <td>${this.escapeHtml(String(create))}</td>
                        <td>${this.escapeHtml(String(edit))}</td>
                        <td>${this.escapeHtml(String(del))}</td>
                    </tr>\n`;
        }
        
        html += '                </tbody>\n';
        html += '            </table>\n';
        html += '        </div>';
        return html;
    }
    
    /**
     * Generate pages list HTML
     */
    generatePagesList(pages) {
        if (!pages || pages.length === 0) return '<p>No pages assigned.</p>';
        
        let html = '<div class="table-container">\n';
        html += '            <table class="data-table">\n';
        html += '                <thead>\n';
        html += '                    <tr><th>Visualforce Page</th></tr>\n';
        html += '                </thead>\n';
        html += '                <tbody>\n';
        
        for (const page of pages) {
            const pageName = typeof page === 'string' ? page : (page?.name || page?.page || String(page));
            html += `                    <tr><td>${this.escapeHtml(pageName)}</td></tr>\n`;
        }
        
        html += '                </tbody>\n';
        html += '            </table>\n';
        html += '        </div>';
        return html;
    }
    
    /**
     * Generate profile map Mermaid diagram
     */
    generateProfileMapMermaid(profiles) {
        // Instead of a large Mermaid diagram, create an interactive HTML table-based map
        let html = '<div class="profile-map-interactive">\n';
        html += '    <div class="profile-map-controls">\n';
        html += '        <input type="text" id="profileSearch" class="search-box" placeholder="Search profiles..." />\n';
        html += '        <div class="profile-map-stats">\n';
        html += `            <span>Total Profiles: <strong>${profiles.length}</strong></span>\n`;
        html += '        </div>\n';
        html += '    </div>\n';
        html += '    <div class="profile-map-grid">\n';
        
        for (const [profileName, profileData] of profiles) {
            const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
            const appsCount = profileData.applications?.length || 0;
            const classesCount = profileData.classes?.length || 0;
            const pagesCount = profileData.pages?.length || 0;
            const objectsCount = Object.keys(profileData.objectPermissions || {}).length;
            const lwcCount = this.countLWCForProfile(profileName);
            
            html += `        <div class="profile-card" data-profile="${this.escapeHtml(profileName.toLowerCase())}">\n`;
            html += `            <div class="profile-card-header">\n`;
            html += `                <h4><a href="profile-${safeName}.html">${this.escapeHtml(profileName)}</a></h4>\n`;
            html += `            </div>\n`;
            html += `            <div class="profile-card-body">\n`;
            html += `                <div class="profile-stat">\n`;
            html += `                    <span class="stat-label">Applications:</span>\n`;
            html += `                    <span class="stat-value">${appsCount}</span>\n`;
            html += `                </div>\n`;
            html += `                <div class="profile-stat">\n`;
            html += `                    <span class="stat-label">Pages:</span>\n`;
            html += `                    <span class="stat-value">${pagesCount}</span>\n`;
            html += `                </div>\n`;
            html += `                <div class="profile-stat">\n`;
            html += `                    <span class="stat-label">LWC Components:</span>\n`;
            html += `                    <span class="stat-value">${lwcCount}</span>\n`;
            html += `                </div>\n`;
            html += `                <div class="profile-stat">\n`;
            html += `                    <span class="stat-label">Apex Classes:</span>\n`;
            html += `                    <span class="stat-value">${classesCount}</span>\n`;
            html += `                </div>\n`;
            html += `                <div class="profile-stat">\n`;
            html += `                    <span class="stat-label">Objects:</span>\n`;
            html += `                    <span class="stat-value">${objectsCount}</span>\n`;
            html += `                </div>\n`;
            html += `            </div>\n`;
            html += `            <div class="profile-card-footer">\n`;
            html += `                <a href="profile-${safeName}.html" class="btn-view-profile">View Details ></a>\n`;
            html += `            </div>\n`;
            html += `        </div>\n`;
        }
        
        html += '    </div>\n';
        html += '</div>\n';
        
        return html;
    }
    
    /**
     * Count LWC components accessible by a profile
     */
    countLWCForProfile(profileName) {
        // Count LWC components used in FlexiPages accessible by this profile
        let count = 0;
        const profileData = this.data.profiles[profileName] || {};
        const pages = profileData.pages || [];
        
        // Check each page for LWC components
        for (const pageName of pages) {
            const pageData = this.data.flexiPages[pageName];
            if (pageData?.lwcComponents) {
                count += pageData.lwcComponents.length;
            }
        }
        
        return count;
    }
    
    /**
     * Create basic overview page
     */
    createBasicOverview(data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security & Access - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            <nav class="breadcrumb">
                <a href="../../index.html">Home</a> / Security & Access Model
            </nav>
        </header>
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Security Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Overview</a></li>
                        <li><a href="navigation-map.html">Profile Navigation Map</a></li>
                    </ul>
                    <h3>Main Navigation</h3>
                    <ul>
                        <li><a href="../../index.html">Home</a></li>
                        <li><a href="../architecture/index.html">Architecture</a></li>
                        <li><a href="../ui/index.html">UI Layer</a></li>
                        <li><a href="../apex/index.html">Apex Layer</a></li>
                    </ul>
                </div>
            </nav>
            <main class="main-content">
                <h2>Security & Access Model</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${data.PROFILES_COUNT}</h3>
                        <p>Profiles</p>
                    </div>
                    <div class="stat-card">
                        <h3>${data.PERMISSIONSETS_COUNT}</h3>
                        <p>Permission Sets</p>
                    </div>
                    <div class="stat-card">
                        <h3>${data.PERMISSIONSETGROUPS_COUNT}</h3>
                        <p>Permission Set Groups</p>
                    </div>
                </div>
                <section>
                    <h3>Profiles</h3>
                    ${data.PROFILES_LIST}
                </section>
            </main>
        </div>
        <footer>
            <p>Salesforce Technical Documentation</p>
        </footer>
    </div>
    <script src="../../js/app.js"></script>
</body>
</html>`;
    }
    
    /**
     * Create basic profile page
     */
    createBasicProfilePage(profileName, profileData, data) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile: ${this.escapeHtml(profileName)} - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
        </header>
        <main class="main-content">
            <h2>Profile: ${this.escapeHtml(profileName)}</h2>
            <section>
                <h3>Applications (${data.APPLICATIONS_COUNT})</h3>
                ${data.APPLICATIONS_LIST}
            </section>
            <section>
                <h3>Classes (${data.CLASSES_COUNT})</h3>
                ${data.CLASSES_LIST}
            </section>
            <section>
                <h3>Objects (${data.OBJECTS_COUNT})</h3>
                ${data.OBJECTS_LIST}
            </section>
        </main>
    </div>
</body>
</html>`;
    }
}


