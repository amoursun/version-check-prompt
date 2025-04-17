#!/usr/bin/env node

/**
 * This script generates a version.json file with version information.
 * It can be used with @changesets/cli to automatically update version information
 * during the release process.
 * 
 * Usage:
 *   node scripts/generate-version.js <output-path>
 * 
 * Example:
 *   node scripts/generate-version.js dist/version.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get the output path from command line arguments
const outputPath = process.argv[2];

if (!outputPath) {
  console.error('Error: No output path provided');
  console.error('Usage: node scripts/generate-version.js <output-path>');
  process.exit(1);
}

// Read package.json to get version information
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

// Generate a hash based on the current timestamp and a random value
const hash = crypto.createHash('md5')
  .update(`${Date.now()}-${Math.random()}`)
  .digest('hex');

// Create version data
const versionData = {
  version,
  timestamp: new Date().toISOString(),
  hash,
  buildInfo: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
};

// Ensure the output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the version.json file
fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2), 'utf8');

console.log(`Generated version.json at ${outputPath}`);
console.log(`Version: ${version}`);
console.log(`Timestamp: ${versionData.timestamp}`);
console.log(`Hash: ${hash}`); 