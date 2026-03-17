#!/usr/bin/env node
/**
 * Serve Documentation Portal
 * 
 * Starts a local web server to view the documentation.
 * Handles port conflicts by trying alternative ports.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        server.on('error', () => resolve(false));
    });
}

async function findAvailablePort(startPort = 8000) {
    for (let port = startPort; port < startPort + 100; port++) {
        const available = await checkPort(port);
        if (available) {
            return port;
        }
    }
    throw new Error('Could not find an available port');
}

async function serve() {
    const requestedPort = process.env.PORT || process.argv[2] || 8000;
    const port = parseInt(requestedPort, 10);
    
    console.log(`Starting documentation server...\n`);
    
    // Check if port is available
    const available = await checkPort(port);
    
    if (!available) {
        console.log(`Port ${port} is already in use. Finding alternative port...`);
        const altPort = await findAvailablePort(port + 1);
        console.log(`Using port ${altPort} instead.\n`);
        await startServer(altPort);
    } else {
        await startServer(port);
    }
}

async function startServer(port) {
    try {
        console.log(`Server starting on http://localhost:${port}`);
        console.log(`Press Ctrl+C to stop the server\n`);
        
        const { stdout, stderr } = await execAsync(
            `npx http-server . -p ${port} -a localhost -o`,
            { 
                cwd: __dirname,
                maxBuffer: 10 * 1024 * 1024
            }
        );
        
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
    } catch (error) {
        // If the process is killed (Ctrl+C), that's expected
        if (error.code === 'SIGTERM' || error.signal === 'SIGTERM') {
            console.log('\nServer stopped.');
            process.exit(0);
        } else {
            console.error('Error starting server:', error.message);
            process.exit(1);
        }
    }
}

serve().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});

