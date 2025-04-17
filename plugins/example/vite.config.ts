// vite.config.ts
import { defineConfig } from 'vite';
import { viteVersionPlugin } from '../vite-version-plugin';

export default defineConfig({
    plugins: [
        viteVersionPlugin({
            outputPath: 'dist/meta/version.json',
            versionInfo: {
                name: 'vite-example',
                version: new Date().toISOString().slice(0, 10),
                description: 'Example of using the viteVersionPlugin',
            },
            includeTimestamp: true,
            includeHash: true,
        })
    ]
});