#!/usr/bin/env node
/**
 * Update Documentation Portal
 * 
 * Fetches latest changes from git and regenerates documentation.
 * This script:
 * 1. Fetches latest changes from git (if in a git repository)
 * 2. Pulls latest changes
 * 3. Regenerates all documentation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateDocumentation() {
    console.log('Updating Documentation Portal...\n');
    
    const repoRoot = process.argv[2] || path.join(__dirname, '..');
    const repoRootPath = path.resolve(repoRoot);
    
    // Check if we're in a git repository
    try {
        await fs.access(path.join(repoRootPath, '.git'));
        console.log('Git repository detected. Fetching latest changes...\n');
        
        // Fetch latest changes
        try {
            console.log('Fetching from remote...');
            const { stdout: fetchOutput } = await execAsync('git fetch', { cwd: repoRootPath });
            if (fetchOutput) console.log(fetchOutput);
            console.log('✓ Fetched latest changes\n');
        } catch (error) {
            console.warn('⚠ Could not fetch from remote:', error.message);
            console.log('Continuing with local repository state...\n');
        }
        
        // Pull latest changes (optional - user might want to control this)
        const shouldPull = process.env.PULL_CHANGES !== 'false';
        if (shouldPull) {
            try {
                console.log('Pulling latest changes...');
                const { stdout: pullOutput } = await execAsync('git pull', { cwd: repoRootPath });
                if (pullOutput) console.log(pullOutput);
                console.log('✓ Pulled latest changes\n');
            } catch (error) {
                console.warn('⚠ Could not pull changes:', error.message);
                console.log('Continuing with current repository state...\n');
            }
        }
    } catch (error) {
        console.log('Not a git repository or .git directory not found.');
        console.log('Continuing with current repository state...\n');
    }
    
    // Generate documentation
    console.log('Generating documentation...\n');
    try {
        // Import and run the generator
        const { ModularDocGenerator } = await import('./generate.js');
        const generator = new ModularDocGenerator(repoRootPath);
        await generator.generateAll();
        
        console.log('\n✓ Documentation updated successfully!');
    } catch (error) {
        console.error('Error generating documentation:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

updateDocumentation().catch(error => {
    console.error('Error updating documentation:', error);
    process.exit(1);
});
