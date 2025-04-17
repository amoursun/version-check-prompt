import { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface ViteVersionPluginOptions {
  /**
   * Output path for the version.json file
   * @default 'dist/version.json'
   */
  outputPath?: string;
  
  /**
   * Custom version information to include in the version.json file
   */
  versionInfo?: {
    name?: string;
    version?: string;
    timestamp?: string;
    description?: string;
    hash?: string;
  };
  
  /**
   * Whether to include build timestamp in the version.json file
   * @default true
   */
  includeTimestamp?: boolean;
  
  /**
   * Whether to include build hash in the version.json file
   * @default true
   */
  includeHash?: boolean;
  
  /**
   * Custom hash function to generate the version hash
   * If not provided, a hash of all assets will be used
   */
  hashFunction?: (bundle: Record<string, any>) => string;
}

export function viteVersionPlugin(options: ViteVersionPluginOptions = {}): Plugin {
  const pluginOptions = {
    outputPath: 'dist/version.json',
    includeTimestamp: true,
    includeHash: true,
    versionInfo: {},
    ...options,
  };

  return {
    name: 'vite-plugin-version',
    apply: 'build',
    closeBundle: async () => {
      try {
        const versionData: Record<string, any> = {
          version: pluginOptions.versionInfo?.version || process.env.npm_package_version || '1.0.0',
          ...pluginOptions.versionInfo,
        };

        if (pluginOptions.includeTimestamp) {
          versionData.timestamp = new Date().toISOString();
        }

        if (pluginOptions.includeHash) {
          // We'll generate the hash in the generateBundle hook
          versionData.hash = 'pending';
        }

        const outputPath = pluginOptions.outputPath || 'dist/version.json';
        const outputDir = path.dirname(outputPath);
        
        // Ensure the output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write the version.json file
        fs.writeFileSync(
          outputPath,
          JSON.stringify(versionData, null, 2),
          'utf8'
        );

        console.log(`[ViteVersionPlugin] Generated version.json at ${outputPath}`);
      } catch (error) {
        console.error('[ViteVersionPlugin] Error generating version.json:', error);
      }
    },
    generateBundle: (_, bundle) => {
      if (pluginOptions.includeHash && pluginOptions.hashFunction) {
        const hash = pluginOptions.hashFunction(bundle);
        
        // Update the version.json file with the hash
        const outputPath = pluginOptions.outputPath || 'dist/version.json';
        if (fs.existsSync(outputPath)) {
          const versionData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
          versionData.hash = hash;
          fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2), 'utf8');
        }
      }
    },
  };
}