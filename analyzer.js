import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SalesforceDocGenerator {
    /**
     * Main class for generating Salesforce technical documentation portal.
     * 
     * Analyzes Salesforce metadata from a repository and generates
     * a comprehensive static web documentation portal using templates.
     */
    
    constructor(repoRoot, toolDir) {
        /**
         * Initialize the documentation generator.
         *
         * @param {string} repoRoot  - Root path of the Salesforce repository to analyze
         * @param {string} [toolDir] - Root of the documentation-portal tool itself (where pages/, templates/, css/, js/ live).
         *                             When omitted the tool is assumed to live at <repoRoot>/documentation-portal (legacy behaviour).
         */
        this.repoRoot = path.resolve(repoRoot || path.join(__dirname, '..'));
        this.outputDir = path.resolve(toolDir || path.join(this.repoRoot, 'documentation-portal'));
        this.templatesDir = path.join(this.outputDir, 'templates');
        this.data = {
            profiles: {},
            permissionSets: {},
            permissionSetGroups: {},
            apexClasses: {},
            triggers: {},
            lwcComponents: {},
            auraComponents: {},
            flexiPages: {},
            flows: {},
            objects: {},
            recordTypes: {},
            validationRules: {},
            approvalProcesses: {},
            assignmentRules: {},
            autoResponseRules: {},
            escalationRules: {},
            applications: {},
            namedCredentials: {},
            customMetadata: {},
            packages: {},
            layouts: {},
            visualforcePages: {},
            quickActions: {},
            sharingRules: {},
            globalValueSets: {},
            roles: {},
            queues: {},
            workflows: {},
            staticResources: {},
            relationships: {
                profileToPermissionSets: {},
                profileToPermissionSetGroups: {},
                profileToClasses: {},
                profileToLWC: {},
                profileToFlexiPages: {},
                classToLWC: {},
                classToAura: {},
                classToFlow: {},
                classToTrigger: {},
                classToVisualforce: {},
                lwcToFlexiPages: {},
                auraToFlexiPages: {},
                triggerToObjects: {},
                objectToTriggers: {},
                objectToFlows: {},
                objectToApex: {},
                apexToObjects: {},
                flowToApex: {},
                flexiPageToLWC: {},
                flexiPageToAura: {},
                lwcToLWC: {},
                auraToAura: {},
            }
        };
        
        // Initialize relationship maps
        Object.keys(this.data.relationships).forEach(key => {
            this.data.relationships[key] = {};
        });
        
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseAttributeValue: true,
            trimValues: true
        });
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
                template = template.replace(placeholder, value);
            }
            
            // Replace any remaining placeholders with empty string
            template = template.replace(/\{\{[A-Z_]+\}\}/g, '');
            
            return template;
        } catch (error) {
            console.error(`Error reading template ${templatePath}:`, error);
            throw error;
        }
    }
    
    /**
     * Parse XML file and return parsed object
     * @param {string} filePath - Path to XML file
     * @returns {Object|null} Parsed XML object or null on error
     */
    async parseXML(filePath) {
        try {
            // Check if file exists before trying to read it
            await fs.access(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            return this.parser.parse(content);
        } catch (error) {
            // Only log if it's not a "file not found" error
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
     * Sanitize node name for Mermaid diagram (remove special chars, spaces)
     * @param {string} name - Node name to sanitize
     * @returns {string} Sanitized node name
     */
    sanitizeNodeName(name) {
        if (!name) return 'Node';
        return String(name)
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[0-9]/, 'N$&'); // Mermaid doesn't allow node names starting with numbers
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
            // Convert glob pattern to regex, ensuring exact match at end
            // e.g., '*.cls' becomes /^.*\.cls$/ to match only files ending with .cls
            // Replace * with placeholder first, then escape dots, then restore *
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
            console.error(`Error in findFiles for ${dir}:`, error.message);
        }
        return files;
    }
    
    // ... (keep all existing analysis methods: analyzeProfiles, analyzePermissionSets, etc.)
    // For brevity, I'll include the key methods and note where others should be copied
    
    /**
     * Analyze all Salesforce metadata
     */
    async analyzeAll() {
        console.log('Analyzing Salesforce metadata...');
        
        // Analyze profiles
        console.log('  Analyzing profiles...');
        await this.analyzeProfiles();
        
        // Analyze permission sets
        console.log('  Analyzing permission sets...');
        await this.analyzePermissionSets();
        
        // Analyze Apex classes
        console.log('  Analyzing Apex classes...');
        await this.analyzeApexClasses();
        
        // Analyze triggers
        console.log('  Analyzing triggers...');
        await this.analyzeTriggers();
        
        // Analyze LWC components
        console.log('  Analyzing LWC components...');
        await this.analyzeLWCComponents();
        
        // Analyze FlexiPages
        console.log('  Analyzing FlexiPages...');
        await this.analyzeFlexiPages();
        
        // Analyze flows
        console.log('  Analyzing flows...');
        await this.analyzeFlows();
        
        // Analyze objects
        console.log('  Analyzing objects...');
        await this.analyzeObjects();
        
        // Analyze validation rules
        console.log('  Analyzing validation rules...');
        await this.analyzeValidationRules();
        
        // Analyze approval processes
        console.log('  Analyzing approval processes...');
        await this.analyzeApprovalProcesses();
        
        // Analyze assignment rules
        console.log('  Analyzing assignment rules...');
        await this.analyzeAssignmentRules();
        
        // Analyze auto-response rules
        console.log('  Analyzing auto-response rules...');
        await this.analyzeAutoResponseRules();
        
        // Analyze escalation rules
        console.log('  Analyzing escalation rules...');
        await this.analyzeEscalationRules();
        
        // Analyze permission set groups
        console.log('  Analyzing permission set groups...');
        await this.analyzePermissionSetGroups();
        
        // Analyze packages
        console.log('  Analyzing packages...');
        await this.analyzePackages();
        
        // Analyze Aura components
        console.log('  Analyzing Aura components...');
        await this.analyzeAuraComponents();
        
        // Analyze Custom Metadata
        console.log('  Analyzing Custom Metadata...');
        await this.analyzeCustomMetadata();
        
        // Analyze Layouts
        console.log('  Analyzing Layouts...');
        await this.analyzeLayouts();
        
        // Analyze Visualforce Pages
        console.log('  Analyzing Visualforce Pages...');
        await this.analyzeVisualforcePages();
        
        // Analyze Quick Actions
        console.log('  Analyzing Quick Actions...');
        await this.analyzeQuickActions();
        
        // Analyze Sharing Rules
        console.log('  Analyzing Sharing Rules...');
        await this.analyzeSharingRules();
        
        // Analyze Global Value Sets
        console.log('  Analyzing Global Value Sets...');
        await this.analyzeGlobalValueSets();
        
        // Analyze Roles
        console.log('  Analyzing Roles...');
        await this.analyzeRoles();
        
        // Analyze Queues
        console.log('  Analyzing Queues...');
        await this.analyzeQueues();
        
        // Analyze Workflows
        console.log('  Analyzing Workflows...');
        await this.analyzeWorkflows();
        
        // Analyze Static Resources
        console.log('  Analyzing Static Resources...');
        await this.analyzeStaticResources();
        
        // Analyze Applications
        console.log('  Analyzing Applications...');
        await this.analyzeApplications();
        
        // Build cross-references
        console.log('  Building cross-references...');
        this.buildCrossReferences();
        
        console.log('Analysis complete!');
    }
    
    /**
     * Helper to get text from XML element
     */
    getText(element, defaultValue = '') {
        if (!element && element !== 0) return defaultValue; // Allow 0 as valid value
        if (typeof element === 'string') return element;
        if (typeof element === 'number') return String(element); // Handle numbers
        if (element['#text']) return element['#text'];
        if (Array.isArray(element) && element.length > 0) {
            return this.getText(element[0], defaultValue);
        }
        return defaultValue;
    }
    
    /**
     * Helper to find elements in parsed XML
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
     * Analyze Profiles
     */
    async analyzeProfiles() {
        const profileDirs = [
            path.join(this.repoRoot, 'releases', 'R1', 'metadata', 'profiles'),
            path.join(this.repoRoot, 'force-app', 'main', 'default', 'profiles')
        ];
        
        for (const profileDir of profileDirs) {
            try {
                await fs.access(profileDir);
            } catch {
                continue;
            }
            
            const files = await this.findFiles(profileDir, '*.profile-meta.xml');
            for (const filePath of files) {
                const root = await this.parseXML(filePath);
                if (!root || !root.Profile) continue;
                
                const profile = root.Profile;
                const profileName = this.getText(profile.fullName);
                if (!profileName) continue;
                
                const profileData = {
                    name: profileName,
                    file: path.relative(this.repoRoot, filePath).replace(/\\/g, '/'),
                    applications: [],
                    classes: [],
                    pages: [],
                    tabs: [],
                    permissionSets: [],
                    objectPermissions: {},
                    fieldPermissions: {},
                };
                
                // Extract applications
                const apps = this.findElements(profile, 'applicationVisibilities');
                for (const app of apps) {
                    const appName = this.getText(app.application);
                    if (appName) {
                        profileData.applications.push({
                            name: appName,
                            visible: this.getText(app.visible) === 'true'
                        });
                    }
                }
                
                // Extract class access
                const classes = this.findElements(profile, 'classAccesses');
                for (const cls of classes) {
                    const clsName = this.getText(cls.apexClass);
                    if (clsName) {
                        profileData.classes.push({
                            name: clsName,
                            enabled: this.getText(cls.enabled) === 'true'
                        });
                        if (!this.data.relationships.profileToClasses[profileName]) {
                            this.data.relationships.profileToClasses[profileName] = [];
                        }
                        this.data.relationships.profileToClasses[profileName].push(clsName);
                    }
                }
                
                // Extract page access
                const pages = this.findElements(profile, 'pageAccesses');
                for (const page of pages) {
                    const pageName = this.getText(page.apexPage);
                    if (pageName) {
                        profileData.pages.push({
                            name: pageName,
                            enabled: this.getText(page.enabled) === 'true'
                        });
                    }
                }
                
                // Extract tab visibility
                const tabs = this.findElements(profile, 'tabVisibilities');
                for (const tab of tabs) {
                    const tabName = this.getText(tab.tab);
                    if (tabName) {
                        profileData.tabs.push({
                            name: tabName,
                            visibility: this.getText(tab.visibility, 'Default')
                        });
                    }
                }
                
                // Extract object permissions
                const objPerms = this.findElements(profile, 'objectPermissions');
                for (const objPerm of objPerms) {
                    const objName = this.getText(objPerm.object);
                    if (objName) {
                        profileData.objectPermissions[objName] = {
                            allowRead: this.getText(objPerm.allowRead) === 'true',
                            allowCreate: this.getText(objPerm.allowCreate) === 'true',
                            allowEdit: this.getText(objPerm.allowEdit) === 'true',
                            allowDelete: this.getText(objPerm.allowDelete) === 'true',
                            viewAllRecords: this.getText(objPerm.viewAllRecords) === 'true',
                            modifyAllRecords: this.getText(objPerm.modifyAllRecords) === 'true',
                        };
                    }
                }
                
                // Extract field permissions
                const fieldPerms = this.findElements(profile, 'fieldPermissions');
                for (const fieldPerm of fieldPerms) {
                    const fieldFull = this.getText(fieldPerm.field);
                    if (fieldFull && fieldFull.includes('.')) {
                        const [objName, fieldOnly] = fieldFull.split('.', 2);
                        if (!profileData.fieldPermissions[objName]) {
                            profileData.fieldPermissions[objName] = {};
                        }
                        profileData.fieldPermissions[objName][fieldOnly] = {
                            editable: this.getText(fieldPerm.editable) === 'true',
                            readable: this.getText(fieldPerm.readable) === 'true',
                        };
                    }
                }
                
                this.data.profiles[profileName] = profileData;
            }
        }
    }
    
    /**
     * Analyze Permission Sets
     */
    async analyzePermissionSets() {
        const psDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'permissionsets');
        try {
            await fs.access(psDir);
        } catch {
            return;
        }
        
        const files = await this.findFiles(psDir, '*.permissionset-meta.xml');
        for (const filePath of files) {
            const root = await this.parseXML(filePath);
            if (!root || !root.PermissionSet) continue;
            
            const ps = root.PermissionSet;
            let psName = this.getText(ps.fullName);
            if (!psName) {
                psName = this.getText(ps.label);
                if (!psName) {
                    psName = path.basename(filePath, '.permissionset-meta.xml');
                }
            }
            
            const psData = {
                name: psName,
                file: path.relative(this.repoRoot, filePath).replace(/\\/g, '/'),
                description: this.getText(ps.description, ''),
                classes: [],
                pages: [],
                tabs: [],
                objectPermissions: {},
                fieldPermissions: {},
                customPermissions: [],
            };
            
            // Extract class access
            const classes = this.findElements(ps, 'classAccesses');
            for (const cls of classes) {
                const clsName = this.getText(cls.apexClass);
                if (clsName) {
                    psData.classes.push({
                        name: clsName,
                        enabled: this.getText(cls.enabled) === 'true'
                    });
                }
            }
            
            // Extract object permissions
            const objPerms = this.findElements(ps, 'objectPermissions');
            for (const objPerm of objPerms) {
                const objName = this.getText(objPerm.object);
                if (objName) {
                    psData.objectPermissions[objName] = {
                        allowRead: this.getText(objPerm.allowRead) === 'true',
                        allowCreate: this.getText(objPerm.allowCreate) === 'true',
                        allowEdit: this.getText(objPerm.allowEdit) === 'true',
                        allowDelete: this.getText(objPerm.allowDelete) === 'true',
                    };
                }
            }
            
            // Extract custom permissions
            const customPerms = this.findElements(ps, 'customPermissions');
            for (const cp of customPerms) {
                const cpName = this.getText(cp.name);
                if (cpName && this.getText(cp.enabled) === 'true') {
                    psData.customPermissions.push(cpName);
                }
            }
            
            this.data.permissionSets[psName] = psData;
        }
    }
    
    /**
     * Extract class description from JavaDoc comments
     */
    extractClassDescription(content) {
        const commentPattern = /\/\*\*[\s\S]*?\*\//;
        const match = content.match(commentPattern);
        if (match) {
            let desc = match[0].replace(/\/\*\*|\*\//g, '').trim();
            const lines = desc.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('*'));
            if (lines.length > 0) {
                return lines[0].substring(0, 200);
            }
        }
        return '';
    }
    
    /**
     * Analyze Apex Classes
     */
    async analyzeApexClasses() {
        const classesDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'classes');
        try {
            await fs.access(classesDir);
        } catch {
            return;
        }
        
        const clsFiles = await this.findFiles(classesDir, '*.cls');
        for (const clsFile of clsFiles) {
            const clsName = path.basename(clsFile, '.cls');
            
            let clsContent = '';
            try {
                clsContent = await fs.readFile(clsFile, 'utf-8');
            } catch {
                continue;
            }
            
            // Read meta file
            const metaFile = clsFile.replace('.cls', '.cls-meta.xml');
            let apiVersion = 'Unknown';
            try {
                const metaRoot = await this.parseXML(metaFile);
                if (metaRoot && metaRoot.ApexClass) {
                    apiVersion = this.getText(metaRoot.ApexClass.apiVersion, 'Unknown');
                }
            } catch {
                // Meta file doesn't exist or can't be parsed
            }
            
            const clsData = {
                name: clsName,
                file: path.relative(this.repoRoot, clsFile).replace(/\\/g, '/'),
                metaFile: path.relative(this.repoRoot, metaFile).replace(/\\/g, '/'),
                apiVersion: apiVersion,
                isTest: clsName.includes('Test') || clsName.toLowerCase().includes('test'),
                isWithoutSharing: /without\s+sharing/i.test(clsContent),
                isWithSharing: /with\s+sharing/i.test(clsContent),
                methods: [],
                dependencies: [],
                description: this.extractClassDescription(clsContent),
            };
            
            // Extract method signatures
            const methodPattern = /(public|private|protected|global)\s+(static\s+)?(\w+)\s+(\w+)\s*\(/g;
            let match;
            while ((match = methodPattern.exec(clsContent)) !== null) {
                clsData.methods.push({
                    visibility: match[1],
                    isStatic: !!match[2],
                    returnType: match[3],
                    name: match[4],
                });
            }
            
            // Extract dependencies
            const depPattern = /(\w+)\s*\.\s*\w+\s*\(/g;
            const deps = new Set();
            while ((match = depPattern.exec(clsContent)) !== null) {
                const depName = match[1];
                if (depName && depName[0] === depName[0].toUpperCase() && depName !== clsName) {
                    deps.add(depName);
                }
            }
            clsData.dependencies = Array.from(deps);
            
            this.data.apexClasses[clsName] = clsData;
        }
    }
    
    /**
     * Analyze Triggers
     */
    async analyzeTriggers() {
        const triggersDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'triggers');
        try {
            await fs.access(triggersDir);
        } catch {
            return;
        }
        
        const triggerFiles = await this.findFiles(triggersDir, '*.trigger');
        for (const triggerFile of triggerFiles) {
            const triggerName = path.basename(triggerFile, '.trigger');
            
            let triggerContent = '';
            try {
                triggerContent = await fs.readFile(triggerFile, 'utf-8');
            } catch {
                continue;
            }
            
            // Extract object name
            let objName = null;
            if (triggerName.includes('Trigger')) {
                objName = triggerName.replace(/Trigger/gi, '');
            }
            
            // Extract handler classes
            const handlerPattern = /(\w+Handler)\.\w+/g;
            const handlers = new Set();
            let match;
            while ((match = handlerPattern.exec(triggerContent)) !== null) {
                handlers.add(match[1]);
            }
            
            const triggerData = {
                name: triggerName,
                file: path.relative(this.repoRoot, triggerFile).replace(/\\/g, '/'),
                object: objName,
                handlers: Array.from(handlers),
                events: [],
                description: this.extractClassDescription(triggerContent),
            };
            
            // Determine trigger events
            const eventPatterns = {
                'before insert': /before\s+insert/i,
                'after insert': /after\s+insert/i,
                'before update': /before\s+update/i,
                'after update': /after\s+update/i,
                'before delete': /before\s+delete/i,
                'after delete': /after\s+delete/i,
                'after undelete': /after\s+undelete/i,
            };
            
            for (const [event, pattern] of Object.entries(eventPatterns)) {
                if (pattern.test(triggerContent)) {
                    triggerData.events.push(event);
                }
            }
            
            if (objName) {
                if (!this.data.relationships.triggerToObjects[triggerName]) {
                    this.data.relationships.triggerToObjects[triggerName] = [];
                }
                this.data.relationships.triggerToObjects[triggerName].push(objName);
                
                // Build reverse relationship: objectToTriggers
                if (!this.data.relationships.objectToTriggers[objName]) {
                    this.data.relationships.objectToTriggers[objName] = [];
                }
                if (!this.data.relationships.objectToTriggers[objName].includes(triggerName)) {
                    this.data.relationships.objectToTriggers[objName].push(triggerName);
                }
            }
            
            this.data.triggers[triggerName] = triggerData;
        }
    }
    
    /**
     * Analyze LWC Components
     */
    async analyzeLWCComponents() {
        const lwcDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'lwc');
        try {
            await fs.access(lwcDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(lwcDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const componentName = entry.name;
            const componentDir = path.join(lwcDir, componentName);
            const jsFile = path.join(componentDir, `${componentName}.js`);
            const htmlFile = path.join(componentDir, `${componentName}.html`);
            const metaFile = path.join(componentDir, `${componentName}.js-meta.xml`);
            
            const lwcData = {
                name: componentName,
                folder: path.relative(this.repoRoot, componentDir).replace(/\\/g, '/'),
                hasJS: false,
                hasHTML: false,
                targets: [],
                isExposed: false,
                apiVersion: 'Unknown',
                apexMethods: [],
                description: '',
            };
            
            // Check if files exist
            try {
                await fs.access(jsFile);
                lwcData.hasJS = true;
            } catch {}
            
            try {
                await fs.access(htmlFile);
                lwcData.hasHTML = true;
            } catch {}
            
            // Parse meta file
            try {
                const metaRoot = await this.parseXML(metaFile);
                if (metaRoot && metaRoot.LightningComponentBundle) {
                    const meta = metaRoot.LightningComponentBundle;
                    lwcData.isExposed = this.getText(meta.isExposed) === 'true';
                    lwcData.apiVersion = this.getText(meta.apiVersion, 'Unknown');
                    
                    const targets = this.findElements(meta, 'targets');
                    for (const target of targets) {
                        const targetText = this.getText(target);
                        if (targetText) lwcData.targets.push(targetText);
                    }
                }
            } catch {
                // Meta file doesn't exist or can't be parsed
            }
            
            // Parse JS file for Apex method calls
            if (lwcData.hasJS) {
                try {
                    const jsContent = await fs.readFile(jsFile, 'utf-8');
                    
                    // Extract @wire and imperative Apex calls
                    const wirePattern = /@wire\s*\(\s*(\w+)\s*/g;
                    const apexPattern = /(\w+)\s*\(\s*\{/g;
                    const apexMethods = new Set();
                    
                    while ((match = wirePattern.exec(jsContent)) !== null) {
                        apexMethods.add(match[1]);
                    }
                    
                    while ((match = apexPattern.exec(jsContent)) !== null) {
                        const method = match[1];
                        if (method && method[0] === method[0].toUpperCase()) {
                            apexMethods.add(method);
                        }
                    }
                    
                    lwcData.apexMethods = Array.from(apexMethods);
                } catch {
                    // Can't read JS file
                }
            }
            
            this.data.lwcComponents[componentName] = lwcData;
        }
    }
    
    /**
     * Analyze FlexiPages
     */
    async analyzeFlexiPages() {
        const flexipageDirs = [
            path.join(this.repoRoot, 'force-app', 'main', 'env-dependent', 'flexipages'),
            path.join(this.repoRoot, 'force-app', 'main', 'default', 'flexipages')
        ];
        
        for (const flexipageDir of flexipageDirs) {
            try {
                await fs.access(flexipageDir);
            } catch {
                continue;
            }
            
            const files = await this.findFiles(flexipageDir, '*.flexipage-meta.xml');
            for (const filePath of files) {
                const root = await this.parseXML(filePath);
                if (!root || !root.FlexiPage) continue;
                
                const flexipage = root.FlexiPage;
                const flexipageName = path.basename(filePath, '.flexipage-meta.xml');
                
                const flexipageData = {
                    name: flexipageName,
                    file: path.relative(this.repoRoot, filePath).replace(/\\/g, '/'),
                    type: this.getText(flexipage.type, 'Unknown'),
                    components: [],
                    lwcComponents: [],
                    auraComponents: [],
                };
                
                // Extract component instances
                const components = this.findElements(flexipage, 'componentInstance');
                for (const comp of components) {
                    const compName = this.getText(comp.componentName);
                    if (compName) {
                        flexipageData.components.push(compName);
                        
                        // Identify LWC vs Aura
                        if (compName.includes(':')) {
                            const [namespace, name] = compName.split(':', 2);
                            if (namespace === 'c') {
                                flexipageData.lwcComponents.push(name);
                                if (!this.data.relationships.lwcToFlexiPages[name]) {
                                    this.data.relationships.lwcToFlexiPages[name] = [];
                                }
                                this.data.relationships.lwcToFlexiPages[name].push(flexipageName);
                            } else if (namespace.startsWith('aura')) {
                                flexipageData.auraComponents.push(name);
                                if (!this.data.relationships.auraToFlexiPages[name]) {
                                    this.data.relationships.auraToFlexiPages[name] = [];
                                }
                                this.data.relationships.auraToFlexiPages[name].push(flexipageName);
                            }
                        }
                    }
                }
                
                this.data.flexiPages[flexipageName] = flexipageData;
            }
        }
    }
    
    /**
     * Analyze Flows
     */
    async analyzeFlows() {
        const flowsDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'flows');
        try {
            await fs.access(flowsDir);
        } catch {
            console.log(`    Flows directory not found: ${flowsDir}`);
            return;
        }
        
        const files = await this.findFiles(flowsDir, '*.flow-meta.xml');
        for (const filePath of files) {
            const root = await this.parseXML(filePath);
            if (!root || !root.Flow) continue;
            
            const flow = root.Flow;
            const flowName = path.basename(filePath, '.flow-meta.xml');
            
            // Extract start element
            let startRef = null;
            const start = this.findElements(flow, 'start')[0];
            if (start) {
                const connector = this.findElements(start, 'connector')[0];
                if (connector) {
                    startRef = this.getText(connector.targetReference);
                }
            }
            
            // Extract status - direct element
            const status = this.getText(flow.status, 'Unknown');
            
            // Extract processType - direct element
            const processType = this.getText(flow.processType, 'Unknown');
            
            const flowData = {
                name: flowName,
                label: this.getText(flow.label, flowName),
                file: path.relative(this.repoRoot, filePath).replace(/\\/g, '/'),
                status: status,
                processType: processType,
                apiVersion: this.getText(flow.apiVersion, 'Unknown'),
                start: startRef,
                decisions: [],
                recordLookups: [],
                recordUpdates: [],
                recordCreates: [],
                assignments: [],
                formulas: [],
                loops: [],
                actions: [],
                variables: [],
                screens: [],
            };
            
            // Extract decisions
            const decisions = this.findElements(flow, 'decisions');
            for (const decision of decisions) {
                const decName = this.getText(decision.name);
                const decLabel = this.getText(decision.label);
                const defaultConn = this.findElements(decision, 'defaultConnector')[0];
                const defaultLabel = this.getText(decision.defaultConnectorLabel);
                
                const rules = [];
                const ruleElements = this.findElements(decision, 'rules');
                for (const rule of ruleElements) {
                    const ruleName = this.getText(rule.name);
                    const ruleLabel = this.getText(rule.label);
                    const ruleConn = this.findElements(rule, 'connector')[0];
                    
                    const conditions = [];
                    const condElements = this.findElements(rule, 'conditions');
                    for (const cond of condElements) {
                        const left = this.getText(cond.leftValueReference);
                        const op = this.getText(cond.operator);
                        const right = this.findElements(cond, 'rightValue')[0];
                        let rightVal = '';
                        if (right) {
                            // Try different value types - access properties directly
                            rightVal = this.getText(right.stringValue) ||
                                      this.getText(right.booleanValue) ||
                                      this.getText(right.numberValue) ||
                                      this.getText(right.elementReference) ||
                                      this.getText(right.dateValue) ||
                                      '';
                        }
                        conditions.push({ left, operator: op, right: rightVal });
                    }
                    
                    const ruleTarget = ruleConn ? this.getText(ruleConn.targetReference) : null;
                    rules.push({
                        name: ruleName,
                        label: ruleLabel,
                        target: ruleTarget,
                        conditions
                    });
                }
                
                flowData.decisions.push({
                    name: decName,
                    label: decLabel,
                    defaultTarget: defaultConn ? this.getText(defaultConn.targetReference) : null,
                    defaultLabel,
                    rules
                });
            }
            
            // Extract record lookups
            const lookups = this.findElements(flow, 'recordLookups');
            for (const lookup of lookups) {
                const connector = this.findElements(lookup, 'connector')[0];
                const objectName = this.getText(lookup.object);
                flowData.recordLookups.push({
                    name: this.getText(lookup.name),
                    label: this.getText(lookup.label),
                    object: objectName,
                    target: connector ? this.getText(connector.targetReference) : null
                });
                
                // Build relationship: flow to object
                if (objectName && this.data.objects[objectName]) {
                    if (!this.data.relationships.objectToFlows[objectName]) {
                        this.data.relationships.objectToFlows[objectName] = [];
                    }
                    if (!this.data.relationships.objectToFlows[objectName].includes(flowName)) {
                        this.data.relationships.objectToFlows[objectName].push(flowName);
                    }
                }
            }
            
            // Extract record updates
            const updates = this.findElements(flow, 'recordUpdates');
            for (const update of updates) {
                const connector = this.findElements(update, 'connector')[0];
                const faultConnector = this.findElements(update, 'faultConnector')[0];
                const objectName = this.getText(update.object);
                flowData.recordUpdates.push({
                    name: this.getText(update.name),
                    label: this.getText(update.label),
                    object: objectName,
                    target: connector ? this.getText(connector.targetReference) : null,
                    faultTarget: faultConnector ? this.getText(faultConnector.targetReference) : null
                });
                
                // Build relationship: flow to object
                if (objectName && this.data.objects[objectName]) {
                    if (!this.data.relationships.objectToFlows[objectName]) {
                        this.data.relationships.objectToFlows[objectName] = [];
                    }
                    if (!this.data.relationships.objectToFlows[objectName].includes(flowName)) {
                        this.data.relationships.objectToFlows[objectName].push(flowName);
                    }
                }
            }
            
            // Extract record creates
            const creates = this.findElements(flow, 'recordCreates');
            for (const create of creates) {
                const connector = this.findElements(create, 'connector')[0];
                const objectName = this.getText(create.object);
                flowData.recordCreates.push({
                    name: this.getText(create.name),
                    label: this.getText(create.label),
                    object: objectName,
                    target: connector ? this.getText(connector.targetReference) : null
                });
                
                // Build relationship: flow to object
                if (objectName && this.data.objects[objectName]) {
                    if (!this.data.relationships.objectToFlows[objectName]) {
                        this.data.relationships.objectToFlows[objectName] = [];
                    }
                    if (!this.data.relationships.objectToFlows[objectName].includes(flowName)) {
                        this.data.relationships.objectToFlows[objectName].push(flowName);
                    }
                }
            }
            
            // Extract assignments
            const assignments = this.findElements(flow, 'assignments');
            for (const assignment of assignments) {
                const connector = this.findElements(assignment, 'connector')[0];
                flowData.assignments.push({
                    name: this.getText(assignment.name),
                    label: this.getText(assignment.label),
                    target: connector ? this.getText(connector.targetReference) : null
                });
            }
            
            // Extract formulas
            const formulas = this.findElements(flow, 'formulas');
            for (const formula of formulas) {
                flowData.formulas.push({
                    name: this.getText(formula.name),
                    expression: this.getText(formula.expression)
                });
            }
            
            // Extract variables
            const variables = this.findElements(flow, 'variables');
            for (const variable of variables) {
                flowData.variables.push({
                    name: this.getText(variable.name),
                    type: this.getText(variable.dataType),
                    isInput: this.getText(variable.isInput) === 'true',
                    isOutput: this.getText(variable.isOutput) === 'true',
                    isCollection: this.getText(variable.isCollection) === 'true',
                    apexClass: this.getText(variable.apexClass, '')
                });
            }
            
            // Extract screens (for screen flows)
            const screens = this.findElements(flow, 'screens');
            for (const screen of screens) {
                const screenConn = this.findElements(screen, 'connector')[0];
                flowData.screens = flowData.screens || [];
                flowData.screens.push({
                    name: this.getText(screen.name),
                    label: this.getText(screen.label),
                    target: screenConn ? this.getText(screenConn.targetReference) : null
                });
            }
            
            // Extract loops
            const loops = this.findElements(flow, 'loops');
            for (const loop of loops) {
                const loopConn = this.findElements(loop, 'connector')[0];
                flowData.loops.push({
                    name: this.getText(loop.name),
                    label: this.getText(loop.label),
                    target: loopConn ? this.getText(loopConn.targetReference) : null
                });
            }
            
            // Extract action calls
            const actions = this.findElements(flow, 'actionCalls');
            for (const action of actions) {
                const connector = this.findElements(action, 'connector')[0];
                const faultConnector = this.findElements(action, 'faultConnector')[0];
                const actionType = this.getText(action.actionType);
                const actionName = this.getText(action.actionName);
                
                flowData.actions.push({
                    name: this.getText(action.name),
                    label: this.getText(action.label),
                    type: actionType,
                    actionName: actionName,
                    target: connector ? this.getText(connector.targetReference) : null,
                    faultTarget: faultConnector ? this.getText(faultConnector.targetReference) : null
                });
                
                // Track Apex classes used in flows
                if (actionType === 'apex' && actionName) {
                    // Extract class name from actionName (format: Namespace.ClassName.methodName or ClassName.methodName)
                    const className = actionName.split('.')[0];
                    if (this.data.apexClasses[className]) {
                        if (!this.data.relationships.classToFlow[className]) {
                            this.data.relationships.classToFlow[className] = [];
                        }
                        if (!this.data.relationships.classToFlow[className].includes(flowName)) {
                            this.data.relationships.classToFlow[className].push(flowName);
                        }
                        // Also track reverse relationship
                        if (!this.data.relationships.flowToApex[flowName]) {
                            this.data.relationships.flowToApex[flowName] = [];
                        }
                        if (!this.data.relationships.flowToApex[flowName].includes(className)) {
                            this.data.relationships.flowToApex[flowName].push(className);
                        }
                    }
                }
            }
            
            this.data.flows[flowName] = flowData;
        }
    }
    
    /**
     * Analyze Objects
     */
    async analyzeObjects() {
        const objectsDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'objects');
        try {
            await fs.access(objectsDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(objectsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const objName = entry.name;
            const objDir = path.join(objectsDir, objName);
            const objFile = path.join(objDir, `${objName}.object-meta.xml`);
            
            try {
                await fs.access(objFile);
            } catch {
                continue;
            }
            
            const root = await this.parseXML(objFile);
            if (!root || !root.CustomObject) continue;
            
            const obj = root.CustomObject;
            const objData = {
                name: objName,
                label: this.getText(obj.label, objName),
                pluralLabel: this.getText(obj.pluralLabel, objName),
                description: this.getText(obj.description, ''),
                sharingModel: this.getText(obj.sharingModel, 'Private'),
                fields: [],
                relationships: [],
            };
            
            // Analyze fields
            const fieldsDir = path.join(objDir, 'fields');
            try {
                await fs.access(fieldsDir);
                const fieldFiles = await this.findFiles(fieldsDir, '*.field-meta.xml');
                
                for (const fieldFile of fieldFiles) {
                    const fieldRoot = await this.parseXML(fieldFile);
                    if (!fieldRoot || !fieldRoot.CustomField) continue;
                    
                    const field = fieldRoot.CustomField;
                    const fieldName = this.getText(field.fullName);
                    if (!fieldName) continue;
                    
                    const fieldData = {
                        name: fieldName,
                        label: this.getText(field.label, fieldName),
                        type: this.getText(field.type, 'Unknown'),
                        description: this.getText(field.description, ''),
                    };
                    
                    // Check for relationships
                    const fieldType = this.getText(field.type);
                    if (fieldType === 'Lookup' || fieldType === 'MasterDetail') {
                        const refTo = this.findElements(field, 'referenceTo')[0];
                        if (refTo) {
                            const refName = this.getText(refTo);
                            if (refName) {
                                fieldData.referenceTo = refName;
                                objData.relationships.push({
                                    field: fieldName,
                                    type: fieldType,
                                    relatedObject: refName
                                });
                            }
                        }
                    }
                    
                    objData.fields.push(fieldData);
                }
            } catch {
                // Fields directory doesn't exist
            }
            
            // Analyze validation rules for this object
            const validationRulesDir = path.join(objDir, 'validationRules');
            try {
                await fs.access(validationRulesDir);
                const vrFiles = await this.findFiles(validationRulesDir, '*.validationRule-meta.xml');
                
                for (const vrFile of vrFiles) {
                    const vrRoot = await this.parseXML(vrFile);
                    if (!vrRoot || !vrRoot.ValidationRule) continue;
                    
                    const vr = vrRoot.ValidationRule;
                    const vrName = this.getText(vr.fullName);
                    if (!vrName) continue;
                    
                    const vrData = {
                        name: vrName,
                        object: objName,
                        active: this.getText(vr.active) === 'true',
                        description: this.getText(vr.description, ''),
                        errorConditionFormula: this.getText(vr.errorConditionFormula, ''),
                        errorMessage: this.getText(vr.errorMessage, ''),
                        file: path.relative(this.repoRoot, vrFile).replace(/\\/g, '/'),
                    };
                    
                    if (!this.data.validationRules[objName]) {
                        this.data.validationRules[objName] = [];
                    }
                    this.data.validationRules[objName].push(vrData);
                }
            } catch {
                // Validation rules directory doesn't exist
            }
            
            this.data.objects[objName] = objData;
        }
        
        // Analyze record types from releases folder
        await this.analyzeRecordTypes();
    }
    
    /**
     * Analyze Record Types from releases folder
     */
    async analyzeRecordTypes() {
        const releasesDir = path.join(this.repoRoot, 'releases');
        try {
            await fs.access(releasesDir);
        } catch {
            console.log('    Releases directory not found, skipping record types');
            return;
        }
        
        // Find all release folders
        const releaseEntries = await fs.readdir(releasesDir, { withFileTypes: true });
        for (const releaseEntry of releaseEntries) {
            if (!releaseEntry.isDirectory()) continue;
            
            const releaseName = releaseEntry.name;
            const releaseObjectsDir = path.join(releasesDir, releaseName, 'metadata', 'objects');
            
            try {
                await fs.access(releaseObjectsDir);
            } catch {
                continue;
            }
            
            const objectEntries = await fs.readdir(releaseObjectsDir, { withFileTypes: true });
            for (const objectEntry of objectEntries) {
                if (!objectEntry.isDirectory()) continue;
                
                const objectName = objectEntry.name;
                const recordTypesDir = path.join(releaseObjectsDir, objectName, 'recordTypes');
                
                try {
                    await fs.access(recordTypesDir);
                } catch {
                    continue;
                }
                
                const rtFiles = await this.findFiles(recordTypesDir, '*.recordType-meta.xml');
                
                if (!this.data.recordTypes[objectName]) {
                    this.data.recordTypes[objectName] = [];
                }
                
                for (const rtFile of rtFiles) {
                    const rtRoot = await this.parseXML(rtFile);
                    if (!rtRoot || !rtRoot.RecordType) continue;
                    
                    const rt = rtRoot.RecordType;
                    const rtName = this.getText(rt.fullName);
                    if (!rtName) continue;
                    
                    // Check if record type already exists (avoid duplicates)
                    const existing = this.data.recordTypes[objectName].find(r => r.name === rtName);
                    if (existing) continue;
                    
                    const rtData = {
                        name: rtName,
                        label: this.getText(rt.label, rtName),
                        active: this.getText(rt.active) === 'true',
                        description: this.getText(rt.description, ''),
                        compactLayoutAssignment: this.getText(rt.compactLayoutAssignment, ''),
                        file: path.relative(this.repoRoot, rtFile).replace(/\\/g, '/'),
                        release: releaseName,
                        picklistValues: []
                    };
                    
                    // Extract picklist values
                    const picklistValues = this.findElements(rt, 'picklistValues');
                    for (const pv of picklistValues) {
                        const picklistName = this.getText(pv.picklist);
                        if (!picklistName) continue;
                        
                        const values = this.findElements(pv, 'values');
                        const picklistData = {
                            picklist: picklistName,
                            values: values.map(v => ({
                                fullName: this.getText(v.fullName),
                                default: this.getText(v.default) === 'true'
                            }))
                        };
                        rtData.picklistValues.push(picklistData);
                    }
                    
                    this.data.recordTypes[objectName].push(rtData);
                }
            }
        }
        
        console.log(`  Found record types for ${Object.keys(this.data.recordTypes).length} objects`);
    }
    
    /**
     * Analyze Validation Rules (already extracted in analyzeObjects, but can be standalone)
     */
    async analyzeValidationRules() {
        // Validation rules are analyzed as part of analyzeObjects
        // This method is kept for consistency with sfdx-hardis structure
        console.log(`  Found validation rules for ${Object.keys(this.data.validationRules).length} objects`);
    }
    
    /**
     * Analyze Approval Processes
     */
    async analyzeApprovalProcesses() {
        const approvalDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'approvalProcesses');
        try {
            await fs.access(approvalDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(approvalDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const processName = entry.name;
            const processDir = path.join(approvalDir, processName);
            const processFile = path.join(processDir, `${processName}.approvalProcess-meta.xml`);
            
            try {
                await fs.access(processFile);
            } catch {
                continue;
            }
            
            const root = await this.parseXML(processFile);
            if (!root || !root.ApprovalProcess) continue;
            
            const process = root.ApprovalProcess;
            const processData = {
                name: processName,
                label: this.getText(process.label, processName),
                description: this.getText(process.description, ''),
                object: this.getText(process.object),
                active: this.getText(process.active) === 'true',
                allowRecall: this.getText(process.allowRecall) === 'true',
                file: path.relative(this.repoRoot, processFile).replace(/\\/g, '/'),
            };
            
            this.data.approvalProcesses[processName] = processData;
        }
    }
    
    /**
     * Analyze Assignment Rules
     */
    async analyzeAssignmentRules() {
        const assignmentDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'assignmentRules');
        try {
            await fs.access(assignmentDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(assignmentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const ruleName = entry.name;
            const ruleDir = path.join(assignmentDir, ruleName);
            const ruleFile = path.join(ruleDir, `${ruleName}.assignmentRules-meta.xml`);
            
            try {
                await fs.access(ruleFile);
            } catch {
                continue;
            }
            
            const root = await this.parseXML(ruleFile);
            if (!root || !root.AssignmentRules) continue;
            
            const rules = root.AssignmentRules;
            const ruleData = {
                name: ruleName,
                active: this.getText(rules.active) === 'true',
                file: path.relative(this.repoRoot, ruleFile).replace(/\\/g, '/'),
                rules: [],
            };
            
            const ruleEntries = this.findElements(rules, 'assignmentRule');
            for (const rule of ruleEntries) {
                ruleData.rules.push({
                    name: this.getText(rule.fullName),
                    label: this.getText(rule.label),
                    active: this.getText(rule.active) === 'true',
                });
            }
            
            this.data.assignmentRules[ruleName] = ruleData;
        }
    }
    
    /**
     * Analyze AutoResponse Rules
     */
    async analyzeAutoResponseRules() {
        const autoResponseDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'autoResponseRules');
        try {
            await fs.access(autoResponseDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(autoResponseDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const ruleName = entry.name;
            const ruleDir = path.join(autoResponseDir, ruleName);
            const ruleFile = path.join(ruleDir, `${ruleName}.autoResponseRules-meta.xml`);
            
            try {
                await fs.access(ruleFile);
            } catch {
                continue;
            }
            
            const root = await this.parseXML(ruleFile);
            if (!root || !root.AutoResponseRules) continue;
            
            const rules = root.AutoResponseRules;
            const ruleData = {
                name: ruleName,
                active: this.getText(rules.active) === 'true',
                file: path.relative(this.repoRoot, ruleFile).replace(/\\/g, '/'),
                rules: [],
            };
            
            const ruleEntries = this.findElements(rules, 'autoResponseRule');
            for (const rule of ruleEntries) {
                ruleData.rules.push({
                    name: this.getText(rule.fullName),
                    active: this.getText(rule.active) === 'true',
                });
            }
            
            this.data.autoResponseRules[ruleName] = ruleData;
        }
    }
    
    /**
     * Analyze Escalation Rules
     */
    async analyzeEscalationRules() {
        const escalationDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'escalationRules');
        try {
            await fs.access(escalationDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(escalationDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const ruleName = entry.name;
            const ruleDir = path.join(escalationDir, ruleName);
            const ruleFile = path.join(ruleDir, `${ruleName}.escalationRules-meta.xml`);
            
            try {
                await fs.access(ruleFile);
            } catch {
                continue;
            }
            
            const root = await this.parseXML(ruleFile);
            if (!root || !root.EscalationRules) continue;
            
            const rules = root.EscalationRules;
            const ruleData = {
                name: ruleName,
                active: this.getText(rules.active) === 'true',
                file: path.relative(this.repoRoot, ruleFile).replace(/\\/g, '/'),
                rules: [],
            };
            
            const ruleEntries = this.findElements(rules, 'escalationRule');
            for (const rule of ruleEntries) {
                ruleData.rules.push({
                    name: this.getText(rule.fullName),
                    active: this.getText(rule.active) === 'true',
                });
            }
            
            this.data.escalationRules[ruleName] = ruleData;
        }
    }
    
    /**
     * Analyze Permission Set Groups
     */
    async analyzePermissionSetGroups() {
        const psgDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'permissionsetgroups');
        try {
            await fs.access(psgDir);
        } catch {
            return;
        }
        
        const files = await this.findFiles(psgDir, '*.permissionsetgroup-meta.xml');
        for (const filePath of files) {
            const root = await this.parseXML(filePath);
            if (!root || !root.PermissionSetGroup) continue;
            
            const psg = root.PermissionSetGroup;
            const psgName = this.getText(psg.developerName) || this.getText(psg.masterLabel);
            if (!psgName) continue;
            
            const psgData = {
                name: psgName,
                label: this.getText(psg.masterLabel, psgName),
                description: this.getText(psg.description, ''),
                file: path.relative(this.repoRoot, filePath).replace(/\\/g, '/'),
                permissionSets: [],
            };
            
            // Extract permission sets in the group
            const psRefs = this.findElements(psg, 'permissionSets');
            for (const psRef of psRefs) {
                const psName = this.getText(psRef);
                if (psName) {
                    psgData.permissionSets.push(psName);
                }
            }
            
            this.data.permissionSetGroups[psgName] = psgData;
        }
    }
    
    /**
     * Analyze Packages
     */
    async analyzePackages() {
        const packagesDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'installedPackages');
        try {
            await fs.access(packagesDir);
        } catch {
            return;
        }
        
        const entries = await fs.readdir(packagesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            const packageName = entry.name;
            const packageDir = path.join(packagesDir, packageName);
            const packageFile = path.join(packageDir, `${packageName}.installedPackage-meta.xml`);
            
            try {
                await fs.access(packageFile);
            } catch {
                continue;
            }
            
            const root = await this.parseXML(packageFile);
            if (!root || !root.InstalledPackage) continue;
            
            const pkg = root.InstalledPackage;
            const packageData = {
                name: packageName,
                versionNumber: this.getText(pkg.versionNumber),
                activateRSS: this.getText(pkg.activateRSS) === 'true',
                file: path.relative(this.repoRoot, packageFile).replace(/\\/g, '/'),
            };
            
            this.data.packages[packageName] = packageData;
        }
    }

    /**
     * Analyze Aura Components
     */
    async analyzeAuraComponents() {
        const auraDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'aura');
        try {
            await fs.access(auraDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(auraDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const compName = entry.name;
            const compDir = path.join(auraDir, compName);
            const metaFile = path.join(compDir, `${compName}.cmp-meta.xml`);
            const cmpFile = path.join(compDir, `${compName}.cmp`);
            const jsFile = path.join(compDir, `${compName}Controller.js`);
            const helperFile = path.join(compDir, `${compName}Helper.js`);

            let apiVersion = '';
            let description = '';
            let extendsComponent = '';

            try {
                await fs.access(metaFile);
                const root = await this.parseXML(metaFile);
                if (root && root.AuraDefinitionBundle) {
                    apiVersion = this.getText(root.AuraDefinitionBundle.apiVersion);
                    description = this.getText(root.AuraDefinitionBundle.description);
                }
            } catch { /* no meta file */ }

            try {
                await fs.access(cmpFile);
                const cmpContent = await fs.readFile(cmpFile, 'utf-8');
                const extendsMatch = cmpContent.match(/extends="([^"]+)"/);
                if (extendsMatch) extendsComponent = extendsMatch[1];
            } catch { /* no cmp file */ }

            const hasController = await fs.access(jsFile).then(() => true).catch(() => false);
            const hasHelper = await fs.access(helperFile).then(() => true).catch(() => false);

            this.data.auraComponents[compName] = {
                name: compName,
                apiVersion,
                description,
                extendsComponent,
                hasController,
                hasHelper,
            };
        }
    }

    /**
     * Analyze Custom Metadata records
     */
    async analyzeCustomMetadata() {
        const cmDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'customMetadata');
        try {
            await fs.access(cmDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(cmDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.md-meta.xml')) continue;
            const baseName = entry.name.replace('.md-meta.xml', '');
            const parts = baseName.split('.');
            if (parts.length < 2) continue;
            const typeName = parts[0];
            const recordName = parts.slice(1).join('.');

            const filePath = path.join(cmDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.CustomMetadata) continue;

            const cm = root.CustomMetadata;
            const label = this.getText(cm.label);
            const isProtected = this.getText(cm.protected) === 'true';
            const valuesRaw = cm.values;
            const valuesArr = Array.isArray(valuesRaw) ? valuesRaw : valuesRaw ? [valuesRaw] : [];
            const values = valuesArr.map(v => ({
                field: this.getText(v.field),
                value: v.value !== undefined ? this.getText(v.value) : '',
            }));

            if (!this.data.customMetadata[typeName]) {
                this.data.customMetadata[typeName] = {};
            }
            this.data.customMetadata[typeName][recordName] = { label, protected: isProtected, values };
        }
    }

    /**
     * Analyze Layouts
     */
    async analyzeLayouts() {
        const layoutsDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'layouts');
        try {
            await fs.access(layoutsDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(layoutsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.layout-meta.xml')) continue;
            const baseName = entry.name.replace('.layout-meta.xml', '');
            const dashIdx = baseName.indexOf('-');
            if (dashIdx === -1) continue;
            const objectName = baseName.substring(0, dashIdx);
            const layoutName = baseName.substring(dashIdx + 1);

            const filePath = path.join(layoutsDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.Layout) continue;

            const layout = root.Layout;
            const sectionsRaw = layout.layoutSections;
            const sectionsArr = Array.isArray(sectionsRaw) ? sectionsRaw : sectionsRaw ? [sectionsRaw] : [];
            let fieldCount = 0;
            const sections = sectionsArr.map(s => {
                const sLabel = this.getText(s.label);
                const colsRaw = s.layoutColumns;
                const colsArr = Array.isArray(colsRaw) ? colsRaw : colsRaw ? [colsRaw] : [];
                let sectionFields = 0;
                for (const col of colsArr) {
                    const itemsRaw = col.layoutItems;
                    const itemsArr = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw ? [itemsRaw] : [];
                    sectionFields += itemsArr.length;
                }
                fieldCount += sectionFields;
                return { label: sLabel, fieldCount: sectionFields };
            });

            if (!this.data.layouts[objectName]) {
                this.data.layouts[objectName] = {};
            }
            this.data.layouts[objectName][layoutName] = { sections, fieldCount };
        }
    }

    /**
     * Analyze Visualforce Pages
     */
    async analyzeVisualforcePages() {
        const pagesDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'pages');
        try {
            await fs.access(pagesDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(pagesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.page-meta.xml')) continue;
            const pageName = entry.name.replace('.page-meta.xml', '');
            const filePath = path.join(pagesDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.ApexPage) continue;

            const page = root.ApexPage;
            this.data.visualforcePages[pageName] = {
                name: pageName,
                label: this.getText(page.label),
                apiVersion: this.getText(page.apiVersion),
                availableInTouch: this.getText(page.availableInTouch) === 'true',
                description: this.getText(page.description),
            };
        }
    }

    /**
     * Analyze Quick Actions
     */
    async analyzeQuickActions() {
        const qaDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'quickActions');
        try {
            await fs.access(qaDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(qaDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.quickAction-meta.xml')) continue;
            const baseName = entry.name.replace('.quickAction-meta.xml', '');
            const dotIdx = baseName.indexOf('.');
            let objectName, actionName;
            if (dotIdx !== -1) {
                objectName = baseName.substring(0, dotIdx);
                actionName = baseName.substring(dotIdx + 1);
            } else {
                objectName = 'Global';
                actionName = baseName;
            }

            const filePath = path.join(qaDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.QuickAction) continue;

            const qa = root.QuickAction;
            if (!this.data.quickActions[objectName]) {
                this.data.quickActions[objectName] = {};
            }
            this.data.quickActions[objectName][actionName] = {
                label: this.getText(qa.label),
                type: this.getText(qa.type),
                actionSubtype: this.getText(qa.actionSubtype),
                lwcComponent: this.getText(qa.lightningWebComponent),
                targetObject: this.getText(qa.targetObject),
            };
        }
    }

    /**
     * Analyze Sharing Rules
     */
    async analyzeSharingRules() {
        const srDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'sharingRules');
        try {
            await fs.access(srDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(srDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.sharingRules-meta.xml')) continue;
            const objectName = entry.name.replace('.sharingRules-meta.xml', '');
            const filePath = path.join(srDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.SharingRules) continue;

            const sr = root.SharingRules;
            const ownerRulesRaw = sr.sharingOwnerRules;
            const criteriaRulesRaw = sr.sharingCriteriaRules;
            const ownerRules = (Array.isArray(ownerRulesRaw) ? ownerRulesRaw : ownerRulesRaw ? [ownerRulesRaw] : [])
                .map(r => this.getText(r.fullName) || this.getText(r.label));
            const criteriaRules = (Array.isArray(criteriaRulesRaw) ? criteriaRulesRaw : criteriaRulesRaw ? [criteriaRulesRaw] : [])
                .map(r => this.getText(r.fullName) || this.getText(r.label));

            this.data.sharingRules[objectName] = { ownerRules, criteriaRules };
        }
    }

    /**
     * Analyze Global Value Sets
     */
    async analyzeGlobalValueSets() {
        const gvsDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'globalValueSets');
        try {
            await fs.access(gvsDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(gvsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.globalValueSet-meta.xml')) continue;
            const setName = entry.name.replace('.globalValueSet-meta.xml', '');
            const filePath = path.join(gvsDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.GlobalValueSet) continue;

            const gvs = root.GlobalValueSet;
            const customValuesRaw = gvs.customValue;
            const customValuesArr = Array.isArray(customValuesRaw) ? customValuesRaw : customValuesRaw ? [customValuesRaw] : [];
            const values = customValuesArr.map(v => ({
                fullName: this.getText(v.fullName),
                label: this.getText(v.label),
                isDefault: this.getText(v.default) === 'true',
            }));

            this.data.globalValueSets[setName] = { values };
        }
    }

    /**
     * Analyze Roles
     */
    async analyzeRoles() {
        const rolesDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'roles');
        try {
            await fs.access(rolesDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(rolesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.role-meta.xml')) continue;
            const roleName = entry.name.replace('.role-meta.xml', '');
            const filePath = path.join(rolesDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.Role) continue;

            const role = root.Role;
            this.data.roles[roleName] = {
                name: this.getText(role.name),
                parentRole: this.getText(role.parentRole),
                caseAccessLevel: this.getText(role.caseAccessLevel),
                contactAccessLevel: this.getText(role.contactAccessLevel),
                opportunityAccessLevel: this.getText(role.opportunityAccessLevel),
            };
        }
    }

    /**
     * Analyze Queues
     */
    async analyzeQueues() {
        const queuesDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'queues');
        try {
            await fs.access(queuesDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(queuesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.queue-meta.xml')) continue;
            const queueName = entry.name.replace('.queue-meta.xml', '');
            const filePath = path.join(queuesDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.Queue) continue;

            const queue = root.Queue;
            const sobjectsRaw = queue.queueSobject;
            const sobjectsArr = Array.isArray(sobjectsRaw) ? sobjectsRaw : sobjectsRaw ? [sobjectsRaw] : [];
            const objects = sobjectsArr.map(s => this.getText(s.sobjectType));

            this.data.queues[queueName] = {
                name: this.getText(queue.name),
                emailMembers: this.getText(queue.doesSendEmailToMembers) === 'true',
                objects,
            };
        }
    }

    /**
     * Analyze Workflows
     */
    async analyzeWorkflows() {
        const wfDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'workflows');
        try {
            await fs.access(wfDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(wfDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.workflow-meta.xml')) continue;
            const objectName = entry.name.replace('.workflow-meta.xml', '');
            const filePath = path.join(wfDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.Workflow) continue;

            const wf = root.Workflow;
            const alertsRaw = wf.alerts;
            const fieldUpdatesRaw = wf.fieldUpdates;
            const rulesRaw = wf.rules;

            const toArr = (v) => Array.isArray(v) ? v : v ? [v] : [];
            const alerts = toArr(alertsRaw).map(a => this.getText(a.fullName));
            const fieldUpdates = toArr(fieldUpdatesRaw).map(f => this.getText(f.fullName));
            const rules = toArr(rulesRaw).map(r => this.getText(r.fullName));

            this.data.workflows[objectName] = { alerts, fieldUpdates, rules };
        }
    }

    /**
     * Analyze Static Resources
     */
    async analyzeStaticResources() {
        const srDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'staticresources');
        try {
            await fs.access(srDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(srDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.resource-meta.xml')) continue;
            const resourceName = entry.name.replace('.resource-meta.xml', '');
            const filePath = path.join(srDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.StaticResource) continue;

            const sr = root.StaticResource;
            this.data.staticResources[resourceName] = {
                name: resourceName,
                contentType: this.getText(sr.contentType),
                cacheControl: this.getText(sr.cacheControl),
            };
        }
    }

    /**
     * Analyze Lightning Applications (Aura Apps / Custom Apps)
     */
    async analyzeApplications() {
        const appsDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'applications');
        try {
            await fs.access(appsDir);
        } catch {
            return;
        }

        const entries = await fs.readdir(appsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.app-meta.xml')) continue;
            const appName = entry.name.replace('.app-meta.xml', '');
            const filePath = path.join(appsDir, entry.name);
            const root = await this.parseXML(filePath);
            if (!root || !root.CustomApplication) continue;

            const app = root.CustomApplication;
            const tabsRaw = app.tabs;
            const tabsArr = Array.isArray(tabsRaw) ? tabsRaw : tabsRaw ? [tabsRaw] : [];

            this.data.applications[appName] = {
                name: appName,
                label: this.getText(app.label),
                navType: this.getText(app.navType),
                uiType: this.getText(app.uiType),
                tabCount: tabsArr.length,
            };
        }
    }

    /**
     * Build cross-references
     */
    buildCrossReferences() {
        // Find which LWC components use which Apex classes
        for (const [lwcName, lwcData] of Object.entries(this.data.lwcComponents)) {
            for (const apexMethod of lwcData.apexMethods || []) {
                // Extract class name from method (assuming pattern like ClassName.methodName)
                const className = apexMethod.split('.')[0];
                if (this.data.apexClasses[className]) {
                    if (!this.data.relationships.classToLWC[className]) {
                        this.data.relationships.classToLWC[className] = [];
                    }
                    if (!this.data.relationships.classToLWC[className].includes(lwcName)) {
                        this.data.relationships.classToLWC[className].push(lwcName);
                    }
                }
            }
        }
        
        // Find which triggers use which handler classes
        for (const [triggerName, triggerData] of Object.entries(this.data.triggers)) {
            for (const handler of triggerData.handlers || []) {
                if (this.data.apexClasses[handler]) {
                    if (!this.data.relationships.classToTrigger[handler]) {
                        this.data.relationships.classToTrigger[handler] = [];
                    }
                    if (!this.data.relationships.classToTrigger[handler].includes(triggerName)) {
                        this.data.relationships.classToTrigger[handler].push(triggerName);
                    }
                }
            }
        }
        
        // Build profile to component relationships
        for (const [profileName, profileData] of Object.entries(this.data.profiles)) {
            for (const clsAccess of profileData.classes || []) {
                const clsName = clsAccess.name;
                if (clsName && clsAccess.enabled) {
                    if (!this.data.relationships.profileToClasses[profileName]) {
                        this.data.relationships.profileToClasses[profileName] = [];
                    }
                    if (!this.data.relationships.profileToClasses[profileName].includes(clsName)) {
                        this.data.relationships.profileToClasses[profileName].push(clsName);
                    }
                }
            }
        }
        
        // Build reverse relationships for FlexiPages
        for (const [flexiPageName, flexiPageData] of Object.entries(this.data.flexiPages)) {
            for (const lwcName of flexiPageData.lwcComponents || []) {
                if (!this.data.relationships.flexiPageToLWC[flexiPageName]) {
                    this.data.relationships.flexiPageToLWC[flexiPageName] = [];
                }
                if (!this.data.relationships.flexiPageToLWC[flexiPageName].includes(lwcName)) {
                    this.data.relationships.flexiPageToLWC[flexiPageName].push(lwcName);
                }
            }
            for (const auraName of flexiPageData.auraComponents || []) {
                if (!this.data.relationships.flexiPageToAura[flexiPageName]) {
                    this.data.relationships.flexiPageToAura[flexiPageName] = [];
                }
                if (!this.data.relationships.flexiPageToAura[flexiPageName].includes(auraName)) {
                    this.data.relationships.flexiPageToAura[flexiPageName].push(auraName);
                }
            }
        }
        
        // Build object to apex relationships (from SOQL queries in Apex classes)
        // This would require parsing Apex class bodies, which is complex
        // For now, we'll rely on explicit relationships from other sources
        
        // Build apex to objects relationships (reverse of objectToApex)
        // This will be populated when we analyze Apex class content
    }
    
    /**
     * Generate all documentation pages using templates
     */
    async generateAll() {
        await this.analyzeAll();
        await this.generateWebApp();
    }
    
    /**
     * Generate the complete web application
     */
    async generateWebApp() {
        console.log('Generating web application...');
        
        // Ensure output directories exist
        await fs.mkdir(path.join(this.outputDir, 'pages'), { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'css'), { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'js'), { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'templates'), { recursive: true });
        
        // Generate pages using templates
        await this.generateIndex();
        await this.generateArchitecture();
        await this.generateRepositoryStructure();
        await this.generateSecurityPages();
        await this.generateUIPages();
        await this.generateApexPages();
        // Automation pages are now generated by AutomationGenerator and FlowsGenerator
        // await this.generateAutomationPages();
        await this.generateDataModel();
        await this.generateIntegrations();
        await this.generateDeployment();
        await this.generateMaintenance();
        await this.generateCrossReference();
        
        console.log('Web application generated successfully!');
    }
    
    /**
     * Generate index page using template
     */
    async generateIndex() {
        const profileCount = Object.keys(this.data.profiles).length;
        const apexCount = Object.keys(this.data.apexClasses).length;
        const lwcCount = Object.keys(this.data.lwcComponents).length;
        const flowsCount = Object.keys(this.data.flows).length;
        
        const templatePath = path.join(this.templatesDir, 'index.html');
        const outputPath = path.join(this.outputDir, 'index.html');
        
        // Check if template exists, if not create a basic one
        try {
            await fs.access(templatePath);
        } catch {
            // Template doesn't exist, create it from existing index.html
            const existingIndex = path.join(this.outputDir, 'index.html');
            try {
                await fs.copyFile(existingIndex, templatePath);
            } catch {
                // Create a basic template
                await this.createIndexTemplate(templatePath);
            }
        }
        
        const data = {
            PROFILE_COUNT: profileCount,
            APEX_COUNT: apexCount,
            LWC_COUNT: lwcCount,
            FLOWS_COUNT: flowsCount,
            GENERATED_DATE: new Date().toISOString().split('T')[0]
        };
        
        const html = await this.renderTemplate(templatePath, data);
        await fs.writeFile(outputPath, html, 'utf-8');
    }
    
    /**
     * Create a basic index template if it doesn't exist
     */
        async createIndexTemplate(templatePath) {
        const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salesforce Technical Documentation - MedicalArea APAC</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <a class="skip-link" href="#main">Skip to main content</a>
    <div class="container">
        <header>
            <div class="header-left">
                <h1 class="logo"><a href="index.html">Salesforce Technical Documentation</a></h1>
            </div>
            <nav class="top-nav">
                <a href="index.html" class="active">Guides</a>
                <a href="pages/cross-reference/index.html">API Reference</a>
                <a href="pages/deployment/index.html">Deployment</a>
            </nav>
            <div class="header-breadcrumb">
                <nav class="breadcrumb"></nav>
            </div>
            <button class="theme-toggle" type="button" title="Toggle dark mode" aria-label="Toggle dark mode">
                <span class="theme-icon theme-icon-light" aria-hidden="true">Light</span>
                <span class="theme-icon theme-icon-dark" aria-hidden="true">Dark</span>
            </button>
            <div class="search-container" role="search">
                <input type="text" class="search-box-header" placeholder="Ctrl+K Search" id="globalSearch">
                <button class="ai-button" onclick="openAIChat()">Ask AI</button>
            </div>
        </header>

        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><a href="index.html" class="active">Home</a></li>
                        <li><a href="pages/profiles/navigation-map.html">Profile Navigation</a></li>
                        <li><a href="pages/profiles/index.html">Security &amp; Access</a></li>
                        <li><a href="pages/objects/index.html">Data Model</a></li>
                        <li><a href="pages/ui/index.html">UI Layer</a></li>
                        <li><a href="pages/apex/index.html">Apex Layer</a></li>
                        <li><a href="pages/automation/index.html">Automation</a></li>
                        <li><a href="pages/integrations/index.html">Integrations</a></li>
                        <li><a href="pages/architecture/index.html">Architecture</a></li>
                        <li><a href="pages/deployment/index.html">Deployment</a></li>
                        <li><a href="pages/maintenance/index.html">Maintenance &amp; Support</a></li>
                        <li><a href="pages/cross-reference/index.html">Cross-Reference</a></li>
                    </ul>
                </div>
            </nav>

            <main class="main-content" id="main">
                <div class="hero-section">
                    <h1 class="hero-title">Salesforce Technical Documentation</h1>
                    <p class="hero-subtitle">Comprehensive technical documentation for MedicalArea-Salesforce-APAC. AI-native, beautiful, and built for developers.</p>

                    <div class="hero-cards">
                        <a href="pages/profiles/navigation-map.html" class="hero-card">
                            <div class="hero-icon">Profile Map</div>
                            <h3>Profile Navigation</h3>
                            <p>Use case scenarios starting from profiles</p>
                        </a>
                        <a href="pages/profiles/index.html" class="hero-card">
                            <div class="hero-icon">Security</div>
                            <h3>Security &amp; Access</h3>
                            <p>Profile and permission set documentation</p>
                        </a>
                        <a href="pages/objects/index.html" class="hero-card">
                            <div class="hero-icon">Data Model</div>
                            <h3>Data Model</h3>
                            <p>UML diagram and object relationships</p>
                        </a>
                        <a href="pages/automation/index.html" class="hero-card">
                            <div class="hero-icon">Automation</div>
                            <h3>Automation</h3>
                            <p>Flows and triggers with visual diagrams</p>
                        </a>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>{{PROFILE_COUNT}}</h3>
                            <p>Profiles</p>
                        </div>
                        <div class="stat-card">
                            <h3>{{APEX_COUNT}}</h3>
                            <p>Apex Classes</p>
                        </div>
                        <div class="stat-card">
                            <h3>{{LWC_COUNT}}</h3>
                            <p>LWC Components</p>
                        </div>
                        <div class="stat-card">
                            <h3>{{FLOWS_COUNT}}</h3>
                            <p>Flows</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <footer>
            <p>Salesforce Technical Documentation - Generated automatically from repository metadata</p>
        </footer>
    </div>
    <script src="js/app.js"></script>
</body>
</html>`;
        await fs.writeFile(templatePath, template, 'utf-8');
    }
    
    /**
     * Generate page from template with data
     */
    async generatePageFromTemplate(templateName, data = {}) {
        // Try templates/{type}/overview.html first, then templates/pages/{name}.html
        let templatePath = path.join(this.templatesDir, templateName, 'overview.html');
        let outputPath = path.join(this.outputDir, 'pages', templateName, 'index.html');
        
        try {
            await fs.access(templatePath);
        } catch {
            // Fallback to old path
            templatePath = path.join(this.templatesDir, 'pages', `${templateName}.html`);
            outputPath = path.join(this.outputDir, 'pages', `${templateName}.html`);
        }
        
        try {
            await fs.access(templatePath);
            const html = await this.renderTemplate(templatePath, data);
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            await fs.writeFile(outputPath, html, 'utf-8');
        } catch (error) {
            console.warn(`Template ${templateName} not found, skipping...`);
        }
    }
    
    /**
     * Generate Architecture page
     */
    async generateArchitecture() {
        const data = {
            APEX_COUNT: Object.keys(this.data.apexClasses).length,
            LWC_COUNT: Object.keys(this.data.lwcComponents).length,
            TRIGGERS_COUNT: Object.keys(this.data.triggers).length,
            FLOWS_COUNT: Object.keys(this.data.flows).length,
            FLEXIPAGES_COUNT: Object.keys(this.data.flexiPages).length,
            PROFILES_COUNT: Object.keys(this.data.profiles).length,
            PERMISSIONSETS_COUNT: Object.keys(this.data.permissionSets).length,
            TOTAL_COMPONENTS: Object.keys(this.data.apexClasses).length + 
                             Object.keys(this.data.lwcComponents).length + 
                             Object.keys(this.data.triggers).length + 
                             Object.keys(this.data.flows).length,
        };
        await this.generatePageFromTemplate('architecture', data);
    }
    
    /**
     * Generate Repository Structure page
     */
    async generateRepositoryStructure() {
        const data = {
            APEX_COUNT: Object.keys(this.data.apexClasses).length,
            TRIGGERS_COUNT: Object.keys(this.data.triggers).length,
            LWC_COUNT: Object.keys(this.data.lwcComponents).length,
            PERMISSIONSETS_COUNT: Object.keys(this.data.permissionSets).length,
            FLOWS_COUNT: Object.keys(this.data.flows).length,
            PROFILES_COUNT: Object.keys(this.data.profiles).length,
            FLEXIPAGES_COUNT: Object.keys(this.data.flexiPages).length,
        };
        await this.generatePageFromTemplate('repository-structure', data);
    }
    
    /**
     * Generate Security Pages
     */
    async generateSecurityPages() {
        const profilesList = Object.keys(this.data.profiles).sort();
        const psList = Object.keys(this.data.permissionSets).sort();
        const psgList = Object.keys(this.data.permissionSetGroups).sort();
        
        // Generate security overview
        const overviewData = {
            PROFILES_COUNT: profilesList.length,
            PERMISSIONSETS_COUNT: psList.length,
            PERMISSIONSETGROUPS_COUNT: psgList.length,
        };
        await this.generatePageFromTemplate('security-overview', overviewData);
        
        // Generate individual profile pages (limit to first 20 for performance)
        for (const profileName of profilesList.slice(0, 20)) {
            const profileData = this.data.profiles[profileName];
            const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
            const templatePath = path.join(this.templatesDir, 'pages', `profile-${safeName}.html`);
            const outputPath = path.join(this.outputDir, 'pages', `profile-${safeName}.html`);
            
            try {
                await fs.access(templatePath);
                const data = {
                    PROFILE_NAME: profileName,
                    APPLICATIONS_COUNT: profileData.applications?.length || 0,
                    CLASSES_COUNT: profileData.classes?.length || 0,
                    OBJECTS_COUNT: Object.keys(profileData.objectPermissions || {}).length,
                };
                const html = await this.renderTemplate(templatePath, data);
                await fs.writeFile(outputPath, html, 'utf-8');
            } catch {
                // Template doesn't exist, skip
            }
        }
    }
    
    /**
     * Generate UI Pages
     */
    async generateUIPages() {
        const data = {
            LWC_COUNT: Object.keys(this.data.lwcComponents).length,
            FLEXIPAGES_COUNT: Object.keys(this.data.flexiPages).length,
        };
        await this.generatePageFromTemplate('ui-layer', data);
    }
    
    /**
     * Generate Apex Pages
     */
    async generateApexPages() {
        const data = {
            APEX_COUNT: Object.keys(this.data.apexClasses).length,
            TRIGGERS_COUNT: Object.keys(this.data.triggers).length,
        };
        await this.generatePageFromTemplate('apex-layer', data);
    }
    
    /**
     * Generate Automation Pages
     */
    async generateAutomationPages() {
        // Count validation rules
        const validationRulesCount = Object.values(this.data.validationRules)
            .reduce((sum, rules) => sum + (rules?.length || 0), 0);
        
        const data = {
            TRIGGERS_COUNT: Object.keys(this.data.triggers).length,
            FLOWS_COUNT: Object.keys(this.data.flows).length,
            APPROVAL_PROCESSES_COUNT: Object.keys(this.data.approvalProcesses).length,
            ASSIGNMENT_RULES_COUNT: Object.keys(this.data.assignmentRules).length,
            AUTO_RESPONSE_RULES_COUNT: Object.keys(this.data.autoResponseRules).length,
            ESCALATION_RULES_COUNT: Object.keys(this.data.escalationRules).length,
            VALIDATION_RULES_COUNT: validationRulesCount,
        };
        await this.generatePageFromTemplate('automation', data);
        
        // Generate individual flow pages
        await this.generateFlowPages();
    }
    
    /**
     * Generate individual flow pages with complete data
     */
    async generateFlowPages() {
        console.log('  Generating individual flow pages...');
        
        // Always use the generic template to ensure consistency
        const baseTemplate = await this.createFlowTemplate();
        
        // Generate a page for each flow
        const flowNames = Object.keys(this.data.flows);
        console.log(`    Generating ${flowNames.length} flow pages...`);
        
        let successCount = 0;
        for (const [flowName, flowData] of Object.entries(this.data.flows)) {
            try {
                await this.generateSingleFlowPage(flowName, flowData, baseTemplate);
                successCount++;
            } catch (error) {
                console.error(`    Error generating page for flow ${flowName}:`, error.message);
            }
        }
        
        console.log(`    Generated ${successCount}/${flowNames.length} flow pages successfully.`);
    }
    
    /**
     * Generate a single flow page
     */
    async generateSingleFlowPage(flowName, flowData, baseTemplate) {
        // Generate Mermaid diagram
        const mermaidDiagram = this.generateFlowMermaid(flowName, flowData);
        
        // Generate HTML for component tables
        const decisionsHTML = this.generateDecisionsTable(flowData.decisions || []);
        const recordLookupsHTML = this.generateRecordLookupsTable(flowData.recordLookups || []);
        const recordUpdatesHTML = this.generateRecordUpdatesTable(flowData.recordUpdates || []);
        const recordCreatesHTML = this.generateRecordCreatesTable(flowData.recordCreates || []);
        const assignmentsHTML = this.generateAssignmentsTable(flowData.assignments || []);
        const actionsHTML = this.generateActionsTable(flowData.actions || []);
        const formulasHTML = this.generateFormulasTable(flowData.formulas || []);
        const variablesHTML = this.generateVariablesTable(flowData.variables || []);
        
        const data = {
            FLOW_NAME: flowName,
            FLOW_LABEL: flowData.label || flowName,
            FLOW_STATUS: flowData.status || 'Unknown',
            FLOW_PROCESS_TYPE: flowData.processType || 'Unknown',
            FLOW_API_VERSION: flowData.apiVersion || 'Unknown',
            MERMAID_DIAGRAM: mermaidDiagram,
            DECISIONS_COUNT: (flowData.decisions || []).length,
            DECISIONS_TABLE: decisionsHTML,
            RECORD_LOOKUPS_COUNT: (flowData.recordLookups || []).length,
            RECORD_LOOKUPS_TABLE: recordLookupsHTML,
            RECORD_UPDATES_COUNT: (flowData.recordUpdates || []).length,
            RECORD_UPDATES_TABLE: recordUpdatesHTML,
            RECORD_CREATES_COUNT: (flowData.recordCreates || []).length,
            RECORD_CREATES_TABLE: recordCreatesHTML,
            ASSIGNMENTS_COUNT: (flowData.assignments || []).length,
            ASSIGNMENTS_TABLE: assignmentsHTML,
            ACTIONS_COUNT: (flowData.actions || []).length,
            ACTIONS_TABLE: actionsHTML,
            FORMULAS_COUNT: (flowData.formulas || []).length,
            FORMULAS_TABLE: formulasHTML,
            VARIABLES_COUNT: (flowData.variables || []).length,
            VARIABLES_TABLE: variablesHTML,
        };
        
        // Replace placeholders in template
        let html = baseTemplate;
        for (const [key, value] of Object.entries(data)) {
            // Escape value if it's a string to prevent XSS
            const safeValue = typeof value === 'string' ? value : String(value);
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(placeholder, safeValue);
        }
        
        // Replace old Python-style placeholders (in case templates still have them)
        html = html.replace(/\{len\(flow_data\.get\('recordLookups', \[\]\)\)\}/g, String(data.RECORD_LOOKUPS_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('recordUpdates', \[\]\)\)\}/g, String(data.RECORD_UPDATES_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('recordCreates', \[\]\)\)\}/g, String(data.RECORD_CREATES_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('assignments', \[\]\)\)\}/g, String(data.ASSIGNMENTS_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('actions', \[\]\)\)\}/g, String(data.ACTIONS_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('decisions', \[\]\)\)\}/g, String(data.DECISIONS_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('formulas', \[\]\)\)\}/g, String(data.FORMULAS_COUNT));
        html = html.replace(/\{len\(flow_data\.get\('variables', \[\]\)\)\}/g, String(data.VARIABLES_COUNT));
        
        // Clean up any remaining placeholders
        html = html.replace(/\{\{[A-Z_]+\}\}/g, '');
        
        const outputPath = path.join(this.outputDir, 'pages', `flow-${flowName}.html`);
        await fs.writeFile(outputPath, html, 'utf-8');
    }
    
    /**
     * Generate HTML table for decisions
     */
    generateDecisionsTable(decisions) {
        if (decisions.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const decision of decisions) {
            const rulesCount = (decision.rules || []).length;
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(decision.name || '')}</strong></td>
                            <td>${this.escapeHtml(decision.label || '')}</td>
                            <td>${rulesCount} rule(s)</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for record lookups
     */
    generateRecordLookupsTable(lookups) {
        if (lookups.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const lookup of lookups) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(lookup.name || '')}</strong></td>
                            <td>${this.escapeHtml(lookup.label || '')}</td>
                            <td>${this.escapeHtml(lookup.object || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for record updates
     */
    generateRecordUpdatesTable(updates) {
        if (updates.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const update of updates) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(update.name || '')}</strong></td>
                            <td>${this.escapeHtml(update.label || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for record creates
     */
    generateRecordCreatesTable(creates) {
        if (creates.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const create of creates) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(create.name || '')}</strong></td>
                            <td>${this.escapeHtml(create.label || '')}</td>
                            <td>${this.escapeHtml(create.target || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for assignments
     */
    generateAssignmentsTable(assignments) {
        if (assignments.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const assignment of assignments) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(assignment.name || '')}</strong></td>
                            <td>${this.escapeHtml(assignment.label || '')}</td>
                            <td>${this.escapeHtml(assignment.target || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for actions
     */
    generateActionsTable(actions) {
        if (actions.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const action of actions) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(action.name || '')}</strong></td>
                            <td>${this.escapeHtml(action.label || '')}</td>
                            <td>${this.escapeHtml(action.type || '')}</td>
                            <td>${this.escapeHtml(action.actionName || '')}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for formulas
     */
    generateFormulasTable(formulas) {
        if (formulas.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const formula of formulas) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(formula.name || '')}</strong></td>
                            <td><code>${this.escapeHtml(formula.expression || '')}</code></td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Generate HTML table for variables
     */
    generateVariablesTable(variables) {
        if (variables.length === 0) return '<tbody></tbody>';
        
        let html = '<tbody>\n';
        for (const variable of variables) {
            html += `                        <tr>
                            <td><strong>${this.escapeHtml(variable.name || '')}</strong></td>
                            <td>${this.escapeHtml(variable.type || '')}</td>
                            <td>${variable.isInput ? 'Yes' : 'No'}</td>
                        </tr>\n`;
        }
        html += '                    </tbody>';
        return html;
    }
    
    /**
     * Create a generic flow template
     */
    async createFlowTemplate() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flow: {{FLOW_NAME}} - Salesforce Technical Documentation</title>
    <link rel="stylesheet" href="../../css/styles.css">
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    
</head>
<body>\n    <a class=\\"skip-link\\" href=\\"#main\\">Skip to main content</a>
    <div class="container">
        <header>
            <h1><a href="../../index.html">Salesforce Technical Documentation</a></h1>
            <nav class="breadcrumb">
                <a href="../index.html">Home</a> / <a href="automation.html">Automation</a> / Flow: {{FLOW_NAME}}
            </nav>
        </header>
        
        <div class="content-wrapper">
            <nav class="sidebar">
                <div class="nav-section">
                    <h3>Navigation</h3>
                    <ul>
                        <li><a href="../automation/index.html">Automation Overview</a></li>
                        <li><a href="index.html" class="active">All Flows</a></li>
                    </ul>
                </div>
            </nav>
            
            <main class="main-content">
                <h2>Flow: {{FLOW_NAME}}</h2>
                
                <section>
                    <h3>Flow Information</h3>
                    <div class="info-box">
                        <p><strong>Flow Name:</strong> {{FLOW_NAME}}</p>
                        <p><strong>Label:</strong> {{FLOW_LABEL}}</p>
                        <p><strong>Status:</strong> {{FLOW_STATUS}}</p>
                        <p><strong>Process Type:</strong> {{FLOW_PROCESS_TYPE}}</p>
                        <p><strong>API Version:</strong> {{FLOW_API_VERSION}}</p>
                    </div>
                </section>
                
                <section>
                    <h3>Flow Diagram</h3>
                    <div class="uml-container">
                        <div class="mermaid">
{{MERMAID_DIAGRAM}}
                        </div>
                    </div>
                </section>
                
                <section>
                    <h3>Flow Components</h3>
                    
                    <h4>Decisions ({{DECISIONS_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Label</th>
                                    <th>Rules</th>
                                </tr>
                            </thead>
                            {{DECISIONS_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Record Lookups ({{RECORD_LOOKUPS_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Label</th>
                                    <th>Object</th>
                                </tr>
                            </thead>
                            {{RECORD_LOOKUPS_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Record Updates ({{RECORD_UPDATES_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Label</th>
                                </tr>
                            </thead>
                            {{RECORD_UPDATES_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Record Creates ({{RECORD_CREATES_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Label</th>
                                    <th>Next Element</th>
                                </tr>
                            </thead>
                            {{RECORD_CREATES_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Assignments ({{ASSIGNMENTS_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Label</th>
                                    <th>Next Element</th>
                                </tr>
                            </thead>
                            {{ASSIGNMENTS_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Actions ({{ACTIONS_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Label</th>
                                    <th>Type</th>
                                    <th>Action Name</th>
                                </tr>
                            </thead>
                            {{ACTIONS_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Formulas ({{FORMULAS_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Expression</th>
                                </tr>
                            </thead>
                            {{FORMULAS_TABLE}}
                        </table>
                    </div>
                    
                    <h4>Variables ({{VARIABLES_COUNT}})</h4>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Input</th>
                                </tr>
                            </thead>
                            {{VARIABLES_TABLE}}
                        </table>
                    </div>
                </section>
            </main>
        </div>
        
        <footer>
            <p>Salesforce Technical Documentation</p>
        </footer>
    </div>
    <script src="../../js/app.js"></script>
    <script src="../../js/pagination.js"></script>
</body>
</html>`;
    }
    
    /**
     * Generate Data Model page
     */
    async generateDataModel() {
        // Count validation rules
        const validationRulesCount = Object.values(this.data.validationRules)
            .reduce((sum, rules) => sum + (rules?.length || 0), 0);
        
        const data = {
            OBJECTS_COUNT: Object.keys(this.data.objects).length,
            VALIDATION_RULES_COUNT: validationRulesCount,
        };
        await this.generatePageFromTemplate('data-model', data);
    }
    
    /**
     * Generate Integrations page
     */
    async generateIntegrations() {
        const ncDir = path.join(this.repoRoot, 'force-app', 'main', 'default', 'namedCredentials');
        let ncCount = 0;
        try {
            const files = await this.findFiles(ncDir, '*.xml');
            ncCount = files.length;
        } catch {
            // Directory doesn't exist
        }
        
        const data = {
            NAMED_CREDENTIALS_COUNT: ncCount,
        };
        await this.generatePageFromTemplate('integrations', data);
    }
    
    /**
     * Generate Deployment page
     */
    async generateDeployment() {
        await this.generatePageFromTemplate('deployment', {});
    }
    
    /**
     * Generate Maintenance page
     */
    async generateMaintenance() {
        await this.generatePageFromTemplate('maintenance', {});
    }
    
    /**
     * Generate Cross-Reference page
     */
    async generateCrossReference() {
        await this.generatePageFromTemplate('cross-reference', {});
    }
    
    /**
     * Generate Mermaid flowchart for a Flow
     */
    generateFlowMermaid(flowName, flowData) {
        let mermaid = 'flowchart TD\n';
        const nodes = {};
        const edges = [];
        
        // Start node
        mermaid += '    Start([Start])\n';
        if (flowData.start) {
            edges.push(['Start', flowData.start, '']);
        }
        
        // Record lookups (process first as they're often entry points)
        for (const lookup of flowData.recordLookups || []) {
            const lookupName = this.sanitizeNodeName(lookup.name || `Lookup_${flowData.recordLookups.indexOf(lookup)}`);
            nodes[lookupName] = { type: 'lookup', label: lookup.label || lookup.name || lookupName };
            if (lookup.target) {
                edges.push([lookupName, this.sanitizeNodeName(lookup.target), '']);
            }
        }
        
        // Decisions
        for (const decision of flowData.decisions || []) {
            const decName = this.sanitizeNodeName(decision.name || `Decision_${flowData.decisions.indexOf(decision)}`);
            nodes[decName] = { type: 'decision', label: decision.label || decision.name || decName };
            
            // Add rules as edges
            for (const rule of decision.rules || []) {
                if (rule.target) {
                    edges.push([decName, this.sanitizeNodeName(rule.target), rule.label || rule.name || '']);
                }
            }
            if (decision.defaultTarget) {
                edges.push([decName, this.sanitizeNodeName(decision.defaultTarget), decision.defaultLabel || 'Default']);
            }
        }
        
        // Record updates
        for (const update of flowData.recordUpdates || []) {
            const updateName = this.sanitizeNodeName(update.name || `Update_${flowData.recordUpdates.indexOf(update)}`);
            nodes[updateName] = { type: 'update', label: update.label || update.name || updateName };
            if (update.target) {
                edges.push([updateName, this.sanitizeNodeName(update.target), '']);
            }
            if (update.faultTarget) {
                edges.push([updateName, this.sanitizeNodeName(update.faultTarget), 'Error']);
            }
        }
        
        // Record creates
        for (const create of flowData.recordCreates || []) {
            const createName = this.sanitizeNodeName(create.name || `Create_${flowData.recordCreates.indexOf(create)}`);
            nodes[createName] = { type: 'create', label: create.label || create.name || createName };
            if (create.target) {
                edges.push([createName, this.sanitizeNodeName(create.target), '']);
            }
        }
        
        // Assignments
        for (const assignment of flowData.assignments || []) {
            const assignName = this.sanitizeNodeName(assignment.name || `Assign_${flowData.assignments.indexOf(assignment)}`);
            nodes[assignName] = { type: 'assignment', label: assignment.label || assignment.name || assignName };
            if (assignment.target) {
                edges.push([assignName, this.sanitizeNodeName(assignment.target), '']);
            }
        }
        
        // Screens (for screen flows)
        for (const screen of flowData.screens || []) {
            const screenName = this.sanitizeNodeName(screen.name || `Screen_${flowData.screens.indexOf(screen)}`);
            nodes[screenName] = { type: 'screen', label: screen.label || screen.name || screenName };
            if (screen.target) {
                edges.push([screenName, this.sanitizeNodeName(screen.target), '']);
            }
        }
        
        // Loops
        for (const loop of flowData.loops || []) {
            const loopName = this.sanitizeNodeName(loop.name || `Loop_${flowData.loops.indexOf(loop)}`);
            nodes[loopName] = { type: 'loop', label: loop.label || loop.name || loopName };
            if (loop.target) {
                edges.push([loopName, this.sanitizeNodeName(loop.target), '']);
            }
        }
        
        // Actions
        for (const action of flowData.actions || []) {
            const actionName = this.sanitizeNodeName(action.name || `Action_${flowData.actions.indexOf(action)}`);
            const actionType = action.type || 'action';
            if (actionType === 'apex') {
                nodes[actionName] = { type: 'apex', label: `${action.label || action.name || actionName}\n(${action.actionName || ''})` };
            } else {
                nodes[actionName] = { type: 'action', label: action.label || action.name || actionName };
            }
            if (action.target) {
                edges.push([actionName, this.sanitizeNodeName(action.target), '']);
            }
            if (action.faultTarget) {
                edges.push([actionName, this.sanitizeNodeName(action.faultTarget), 'Error']);
            }
        }
        
        // Generate node definitions
        for (const [nodeName, nodeInfo] of Object.entries(nodes)) {
            const nodeLabel = nodeInfo.label.replace(/\n/g, '<br/>');
            if (nodeInfo.type === 'decision') {
                mermaid += `    ${nodeName}{{${nodeLabel}}}\n`;
            } else if (nodeInfo.type === 'lookup') {
                mermaid += `    ${nodeName}[Lookup ${nodeLabel}]\n`;
            } else if (nodeInfo.type === 'update') {
                mermaid += `    ${nodeName}[Update ${nodeLabel}]\n`;
            } else if (nodeInfo.type === 'create') {
                mermaid += `    ${nodeName}[Create ${nodeLabel}]\n`;
            } else if (nodeInfo.type === 'assignment') {
                mermaid += `    ${nodeName}[Assign ${nodeLabel}]\n`;
            } else if (nodeInfo.type === 'apex') {
                mermaid += `    ${nodeName}[Apex ${nodeLabel}]\n`;
            } else if (nodeInfo.type === 'screen') {
                mermaid += `    ${nodeName}[Screen ${nodeLabel}]\n`;
            } else if (nodeInfo.type === 'loop') {
                mermaid += `    ${nodeName}[Loop ${nodeLabel}]\n`;
            } else {
                mermaid += `    ${nodeName}[${nodeLabel}]\n`;
            }
        }
        
        // Generate edges
        for (const edge of edges) {
            const [source, target, label] = edge;
            if (label) {
                mermaid += `    ${source} -->|${this.escapeHtml(label)}| ${target}\n`;
            } else {
                mermaid += `    ${source} --> ${target}\n`;
            }
        }
        
        // Add end node
        mermaid += '    End([End])\n';
        
        // Style nodes
        mermaid += '    classDef decision fill:#E31E24,stroke:#B8151A,stroke-width:2px,color:#fff\n';
        mermaid += '    classDef action fill:#2C2C2C,stroke:#1a1a1a,stroke-width:2px,color:#fff\n';
        mermaid += '    classDef startEnd fill:#F5F5F5,stroke:#E0E0E0,stroke-width:2px\n';
        
        // Apply styles
        for (const [nodeName, nodeInfo] of Object.entries(nodes)) {
            if (nodeInfo.type === 'decision') {
                mermaid += `    class ${nodeName} decision\n`;
            } else {
                mermaid += `    class ${nodeName} action\n`;
            }
        }
        mermaid += '    class Start,End startEnd\n';
        
        return mermaid;
    }
    
    /**
     * Generate UML diagram for data model
     */
    generateUMLDiagram() {
        const keyObjects = ['Account', 'Contact', 'Order', 'OrderItem', 'Case', 'Opportunity', 
                          'ServiceAppointment', 'Asset'];
        
        // Add custom objects from data
        const customObjects = Object.keys(this.data.objects)
            .filter(obj => obj.includes('__c'))
            .slice(0, 10);
        
        const allObjects = [...keyObjects, ...customObjects];
        
        let uml = 'graph TB\n';
        uml += '    classDef standard fill:#E31E24,stroke:#B8151A,stroke-width:2px,color:#fff\n';
        uml += '    classDef custom fill:#2C2C2C,stroke:#1a1a1a,stroke-width:2px,color:#fff\n\n';
        
        // Add objects
        for (const objName of allObjects) {
            if (this.data.objects[objName]) {
                const obj = this.data.objects[objName];
                const label = obj.label || objName;
                const cleanName = objName.replace(/__c/g, '').replace(/_/g, '');
                uml += `    ${cleanName}["${this.escapeHtml(label)}<br/>${this.escapeHtml(objName)}"]\n`;
                
                if (objName.includes('__c')) {
                    uml += `    class ${cleanName} custom\n`;
                } else {
                    uml += `    class ${cleanName} standard\n`;
                }
            }
        }
        
        // Add relationships
        for (const objName of allObjects) {
            if (this.data.objects[objName]) {
                const obj = this.data.objects[objName];
                const cleanName = objName.replace(/__c/g, '').replace(/_/g, '');
                
                for (const rel of (obj.relationships || []).slice(0, 5)) {
                    const relatedObj = rel.relatedObject;
                    if (relatedObj && allObjects.includes(relatedObj)) {
                        const relatedClean = relatedObj.replace(/__c/g, '').replace(/_/g, '');
                        const relType = rel.type === 'MasterDetail' ? '1' : '*';
                        uml += `    ${cleanName} -->|"${this.escapeHtml(rel.field || '')}" ${relType}| ${relatedClean}\n`;
                    }
                }
            }
        }
        
        return uml;
    }
}

// Export the class for use in other scripts


// Main execution (only if run directly, not when imported)
// Note: This file is typically imported, not run directly
// The main execution is in generate.js

export { SalesforceDocGenerator };


