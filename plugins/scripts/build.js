#!/usr/bin/env node

/**
 * This script integrates with the build process to generate version.json files.
 * It can be used with webpack and vite to automatically generate version.json files
 * during the build process.
 * 
 * Usage:
 *   node scripts/build.js <command> [options]
 * 
 * Commands:
 *   webpack <config>  Build with webpack and generate version.json
 *   vite <config>     Build with vite and generate version.json
 * 
 * Examples:
 *   node scripts/build.js webpack webpack.config.js
 *   node scripts/build.js vite vite.config.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the command from command line arguments
const command = process.argv[2];
const configFile = process.argv[3];

if (!command) {
  console.error('Error: No command provided');
  console.error('Usage: node scripts/build.js <command> [options]');
  console.error('Commands:');
  console.error('  webpack <config>  Build with webpack and generate version.json');
  console.error('  vite <config>     Build with vite and generate version.json');
  process.exit(1);
}

// Execute the appropriate command
if (command === 'webpack') {
  // Build with webpack
  const configPath = configFile ? `--config ${configFile}` : '';
  execSync(`webpack ${configPath}`, { stdio: 'inherit' });
  
  // Generate version.json
  execSync(`node ${path.join(__dirname, 'generate-version.js')} dist/version.json`, { stdio: 'inherit' });
} else if (command === 'vite') {
  // Build with vite
  const configPath = configFile ? `--config ${configFile}` : '';
  execSync(`vite build ${configPath}`, { stdio: 'inherit' });
  
  // Generate version.json
  execSync(`node ${path.join(__dirname, 'generate-version.js')} dist/version.json`, { stdio: 'inherit' });
} else {
  console.error(`Error: Unknown command "${command}"`);
  console.error('Usage: node scripts/build.js <command> [options]');
  console.error('Commands:');
  console.error('  webpack <config>  Build with webpack and generate version.json');
  console.error('  vite <config>     Build with vite and generate version.json');
  process.exit(1);
} 