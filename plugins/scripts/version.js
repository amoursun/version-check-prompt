#!/usr/bin/env node

/**
 * This script integrates with @changesets/cli to manage versions.
 * It can be used to generate version.json files during the release process.
 * 
 * Usage:
 *   node scripts/version.js <command> [options]
 * 
 * Commands:
 *   generate <path>  Generate a version.json file at the specified path
 *   update           Update version.json files in all examples
 * 
 * Examples:
 *   node scripts/version.js generate dist/version.json
 *   node scripts/version.js update
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the command from command line arguments
const command = process.argv[2];

if (!command) {
  console.error('Error: No command provided');
  console.error('Usage: node scripts/version.js <command> [options]');
  console.error('Commands:');
  console.error('  generate <path>  Generate a version.json file at the specified path');
  console.error('  update           Update version.json files in all examples');
  process.exit(1);
}

// Execute the appropriate command
if (command === 'generate') {
  const outputPath = process.argv[3];
  
  if (!outputPath) {
    console.error('Error: No output path provided');
    console.error('Usage: node scripts/version.js generate <path>');
    process.exit(1);
  }
  
  // Execute the generate-version.js script
  execSync(`node ${path.join(__dirname, 'generate-version.js')} ${outputPath}`, { stdio: 'inherit' });
} else if (command === 'update') {
  // Find all examples directories
  const examplesDir = path.join(__dirname, '..', 'examples');
  const examples = fs.readdirSync(examplesDir)
    .filter(file => fs.statSync(path.join(examplesDir, file)).isDirectory());
  
  // Update version.json files in all examples
  for (const example of examples) {
    const examplePath = path.join(examplesDir, example);
    const versionJsonPath = path.join(examplePath, 'version.json');
    
    // Check if the example has a version.json file
    if (fs.existsSync(versionJsonPath)) {
      console.log(`Updating version.json in ${example}...`);
      execSync(`node ${path.join(__dirname, 'generate-version.js')} ${versionJsonPath}`, { stdio: 'inherit' });
    }
  }
} else {
  console.error(`Error: Unknown command "${command}"`);
  console.error('Usage: node scripts/version.js <command> [options]');
  console.error('Commands:');
  console.error('  generate <path>  Generate a version.json file at the specified path');
  console.error('  update           Update version.json files in all examples');
  process.exit(1);
} 