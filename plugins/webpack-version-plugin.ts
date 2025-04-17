import { Compiler, Plugin } from 'webpack';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface WebpackVersionPluginOptions {
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
  hashFunction?: (compilation: any) => string;
}

export class WebpackVersionPlugin implements Plugin {
  private options: WebpackVersionPluginOptions;

  constructor(options: WebpackVersionPluginOptions = {}) {
    this.options = {
      outputPath: 'dist/version.json',
      includeTimestamp: true,
      includeHash: true,
      versionInfo: {},
      ...options,
    };
  }

  apply(compiler: Compiler): void {
    compiler.hooks.afterEmit.tapAsync('WebpackVersionPlugin', (compilation, callback) => {
      try {
        const versionData: Record<string, any> = {
          version: this.options.versionInfo?.version || process.env.npm_package_version || '1.0.0',
          ...this.options.versionInfo,
        };

        if (this.options.includeTimestamp) {
          versionData.timestamp = new Date().toISOString();
        }

        if (this.options.includeHash) {
          versionData.hash = this.options.hashFunction 
            ? this.options.hashFunction(compilation) 
            : this.generateHashFromAssets(compilation);
        }

        const outputPath = this.options.outputPath || 'dist/version.json';
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

        console.log(`[WebpackVersionPlugin] Generated version.json at ${outputPath}`);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    });
  }

  private generateHashFromAssets(compilation: any): string {
    const hash = createHash('md5');
    
    // Add all asset filenames and their sizes to the hash
    Object.keys(compilation.assets).forEach(filename => {
      const asset = compilation.assets[filename];
      hash.update(`${filename}:${asset.size()}`);
    });
    
    return hash.digest('hex');
  }
} 