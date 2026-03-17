#!/usr/bin/env node
/**
 * Initialize Documentation Portal
 * 
 * Sets up the documentation portal structure:
 * - Creates template files from existing HTML (if they don't exist)
 * - Ensures all necessary directories exist
 * - Sets up the initial structure
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initialize() {
    console.log('Initializing Documentation Portal...\n');
    
    const outputDir = path.join(__dirname);
    const templatesDir = path.join(outputDir, 'templates');
    const pagesDir = path.join(outputDir, 'pages');
    const templatesPagesDir = path.join(templatesDir, 'pages');
    
    // Create directories
    console.log('Creating directories...');
    await fs.mkdir(templatesDir, { recursive: true });
    await fs.mkdir(templatesPagesDir, { recursive: true });
    await fs.mkdir(path.join(outputDir, 'css'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'js'), { recursive: true });
    await fs.mkdir(path.join(outputDir, 'data'), { recursive: true });
    console.log('✓ Directories created\n');
    
    // Check if templates already exist
    const indexTemplatePath = path.join(templatesDir, 'index.html');
    try {
        await fs.access(indexTemplatePath);
        console.log('Templates already exist. Skipping template creation.');
        console.log('If you want to recreate templates, delete the templates/ directory first.\n');
    } catch {
        // Templates don't exist, create them from existing HTML files
        console.log('Creating templates from existing HTML files...');
        
        // Convert index.html
        const indexPath = path.join(outputDir, 'index.html');
        try {
            let indexContent = await fs.readFile(indexPath, 'utf-8');
            // Replace hardcoded stats with placeholders
            indexContent = indexContent.replace(/<h3>\d+<\/h3>\s*<p>Profiles<\/p>/g, '<h3>{{PROFILE_COUNT}}</h3>\n                            <p>Profiles</p>');
            indexContent = indexContent.replace(/<h3>\d+<\/h3>\s*<p>Apex Classes<\/p>/g, '<h3>{{APEX_COUNT}}</h3>\n                            <p>Apex Classes</p>');
            indexContent = indexContent.replace(/<h3>\d+<\/h3>\s*<p>LWC Components<\/p>/g, '<h3>{{LWC_COUNT}}</h3>\n                            <p>LWC Components</p>');
            indexContent = indexContent.replace(/<h3>\d+<\/h3>\s*<p>Flows<\/p>/g, '<h3>{{FLOWS_COUNT}}</h3>\n                            <p>Flows</p>');
            
            await fs.writeFile(indexTemplatePath, indexContent, 'utf-8');
            console.log('✓ Created template: index.html');
        } catch (error) {
            console.warn('⚠ Could not create index.html template:', error.message);
        }
        
        // Convert pages/*.html files
        try {
            const files = await fs.readdir(pagesDir);
            let count = 0;
            for (const file of files) {
                if (file.endsWith('.html')) {
                    const filePath = path.join(pagesDir, file);
                    try {
                        const content = await fs.readFile(filePath, 'utf-8');
                        await fs.writeFile(path.join(templatesPagesDir, file), content, 'utf-8');
                        count++;
                    } catch (error) {
                        console.warn(`⚠ Could not create template for ${file}:`, error.message);
                    }
                }
            }
            console.log(`✓ Created ${count} page templates`);
        } catch (error) {
            console.warn('⚠ Could not create page templates:', error.message);
        }
        
        console.log('\nTemplates created successfully!');
    }
    
    console.log('\n✓ Documentation portal initialized!');
    console.log('\nNext steps:');
    console.log('  1. Run "npm run generate" to generate documentation from current repository');
    console.log('  2. Run "npm run update" to fetch latest changes from git and regenerate');
    console.log('  3. Run "npm run serve" to view the documentation locally\n');
}

initialize().catch(error => {
    console.error('Error initializing documentation portal:', error);
    process.exit(1);
});
