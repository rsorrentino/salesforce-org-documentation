#!/usr/bin/env node
/**
 * Salesforce Technical Documentation Generator (Modular)
 * 
 * Modular documentation generator with separate generators for each metadata type.
 * 
 * Structure:
 * - generators/ - Individual generator modules
 * - templates/{type}/ - Templates organized by type
 * - pages/{type}/ - Generated pages organized by type
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    FlowsGenerator,
    ProfilesGenerator,
    ApexGenerator,
    ObjectsGenerator,
    UIGenerator,
    AutomationGenerator,
    IntegrationsGenerator,
    ArchitectureGenerator,
    CrossReferenceGenerator,
    DeploymentGenerator,
    MaintenanceGenerator,
    SearchIndexGenerator,
    FunctionalMapGenerator,
    SitemapGenerator,
    DashboardGenerator,
    PermissionDrilldownGenerator,
    DiffGenerator,
    CustomMetadataGenerator
} from './generators/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { SalesforceDocGenerator } from './analyzer.js';

class ModularDocGenerator {
    constructor(repoRoot) {
        this.repoRoot = path.resolve(repoRoot || path.join(__dirname, '..'));
        this.outputDir = path.join(this.repoRoot, 'documentation-portal');
        this.data = {};
        
        // Use the existing analyzer for now
        this.analyzer = new SalesforceDocGenerator(repoRoot);
    }
    
    /**
     * Analyze all metadata (delegates to existing analyzer)
     */
    async analyzeAll() {
        await this.analyzer.analyzeAll();
        this.data = this.analyzer.data;
    }
    
    /**
     * Generate all documentation using modular generators
     */
    async generate() {
        console.log('Generating documentation with modular generators...\n');
        
        // Ensure directories exist
        await fs.mkdir(path.join(this.outputDir, 'pages'), { recursive: true });
        await fs.mkdir(path.join(this.outputDir, 'templates'), { recursive: true });
        
        // ── Diff: snapshot old metadata BEFORE generating pages ──────────────
        try {
            const diffGen = new DiffGenerator(this.repoRoot, this.data);
            await diffGen.generate();
        } catch (error) {
            console.error('Error in DiffGenerator:', error.message);
        }

        // Initialize content generators
        const generators = [
            new FlowsGenerator(this.repoRoot, this.data),
            new ProfilesGenerator(this.repoRoot, this.data),
            new ApexGenerator(this.repoRoot, this.data),
            new ObjectsGenerator(this.repoRoot, this.data),
            new UIGenerator(this.repoRoot, this.data),
            new AutomationGenerator(this.repoRoot, this.data),
            new IntegrationsGenerator(this.repoRoot, this.data),
            new ArchitectureGenerator(this.repoRoot, this.data),
            new CrossReferenceGenerator(this.repoRoot, this.data),
            new DeploymentGenerator(this.repoRoot, this.data),
            new MaintenanceGenerator(this.repoRoot, this.data),
            new FunctionalMapGenerator(this.repoRoot, this.data),
            new DashboardGenerator(this.repoRoot, this.data),
            new PermissionDrilldownGenerator(this.repoRoot, this.data),
            new CustomMetadataGenerator(this.repoRoot, this.data),
        ];

        // Generate pages
        for (const generator of generators) {
            try {
                await generator.generate();
            } catch (error) {
                console.error(`Error in ${generator.constructor.name}:`, error.message);
            }
        }

        // Generate index page (using existing method for now)
        await this.analyzer.generateIndex();

        // Generate search index (after all pages are created)
        try {
            const searchIndexGenerator = new SearchIndexGenerator(this.repoRoot, this.data);
            await searchIndexGenerator.generate();
        } catch (error) {
            console.error('Error generating search index:', error.message);
        }

        // ── Sitemap + canonical links (post-processing: all pages must exist) ─
        try {
            const siteBaseUrl = process.env.DOCS_BASE_URL || '';
            const sitemapGen = new SitemapGenerator(this.repoRoot, this.data, siteBaseUrl);
            await sitemapGen.generate();
        } catch (error) {
            console.error('Error in SitemapGenerator:', error.message);
        }

        console.log('\nDocumentation generation complete!');
    }
    
    /**
     * Main entry point
     */
    async generateAll() {
        await this.analyzeAll();
        
        console.log('\nGenerating web application...');
        await this.generate();
    }
}

// Main execution
// Check if this file is being run directly (not imported as a module)
const isMainModule = process.argv[1] && (
    process.argv[1].endsWith('generate.js') ||
    process.argv[1].endsWith('generate') ||
    process.argv[1].endsWith('generate-docs.js') ||
    process.argv[1].endsWith('generate-docs')
);

/**
 * Resolve the Salesforce source directory from CLI args or environment.
 * Priority:
 *   1. --source=<path>  (CLI flag)
 *   2. SOURCE_DIR env var
 *   3. positional argv[2]
 *   4. parent of this script (default: treats salesforce repo as the parent folder)
 */
function resolveSourceDir() {
    // 1. --source=<path>
    const sourceFlag = process.argv.find(a => a.startsWith('--source='));
    if (sourceFlag) return sourceFlag.slice('--source='.length);

    // 2. SOURCE_DIR env var
    if (process.env.SOURCE_DIR) return process.env.SOURCE_DIR;

    // 3. positional arg (legacy)
    const positional = process.argv.slice(2).find(a => !a.startsWith('--'));
    if (positional) return positional;

    // 4. default: parent directory of this script
    return path.join(__dirname, '..');
}

if (isMainModule) {
    const repoRoot = resolveSourceDir();
    const resolvedRoot = path.resolve(repoRoot);

    // Validate path exists
    fs.access(resolvedRoot).then(() => {
        console.log(`Analyzing Salesforce metadata at: ${resolvedRoot}\n`);
        const generator = new ModularDocGenerator(resolvedRoot);
        return generator.generateAll();
    }).catch(error => {
        if (error.code === 'ENOENT') {
            console.error(`Error: Source directory not found: ${resolvedRoot}`);
            console.error('Usage: node generate.js --source=<path>');
            console.error('   or: SOURCE_DIR=<path> node generate.js');
        } else {
            console.error('Error generating documentation:', error);
        }
        process.exit(1);
    });
}

export { ModularDocGenerator };








