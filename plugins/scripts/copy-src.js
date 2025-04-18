#!/usr/bin/env node

/**
 * This script copies the src directory to the dist directory.
 * It can be used to preserve the src directory in the build output.
 * 
 * Usage:
 *   node scripts/copy-src.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define paths
const srcDir = path.resolve(__dirname, '..', 'src');
const distDir = path.resolve(__dirname, '..', 'dist');
const distSrcDir = path.join(distDir, 'src');

// Check if src directory exists
if (!fs.existsSync(srcDir)) {
  console.error('Error: src directory not found');
  process.exit(1);
}

// Create dist/src directory if it doesn't exist
if (!fs.existsSync(distSrcDir)) {
  fs.mkdirSync(distSrcDir, { recursive: true });
}

// Function to copy a directory recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read the source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      copyDir(srcPath, destPath);
    } else {
      // Skip TypeScript files
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        continue;
      }
      
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Copy src directory to dist/src
console.log('Copying src directory to dist/src...');
copyDir(srcDir, distSrcDir);
console.log('Copy completed successfully.'); 