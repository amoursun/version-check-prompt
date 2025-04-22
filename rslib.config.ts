/**
 * https://lib.rsbuild.dev/zh/config/lib/banner
 * https://lib.rsbuild.dev/zh/config/rsbuild/output#outputcopy
 * https://rspack.dev/zh/plugins/rspack/copy-rspack-plugin
 */
import { defineConfig, LibConfig, RslibConfig } from '@rslib/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {pluginDts} from 'rsbuild-plugin-dts';
import pkg from './package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bannerContent = `/*!
  * ${pkg.name} v${pkg.version}
  * anthor: gyl
  * @license MIT
  */`;


// const syntax = 'es2020';
// 头部注入代码
const banner = {
  js: bannerContent,
};

const source = {
  entry: {
    index: './src/index.ts',
  },
};

function output(config: {
  minify?: boolean,
  type: 'esm' | 'cjs' | 'umd'
}): LibConfig['output'] {
  const { minify = false, type = 'esm' } = config;
  return {
    target: 'web',
    minify,
    filename: {
      js: `[name]${minify ? '.min' : ''}.js`,
    },
    distPath: {
      root: `./dist/${type}`
    },
  };
}

/**
 * 设置产物兼容性
 * 即使项目下有`.browserslistrc` 文件，也不会生效，可能是因为 `lib.syntax` 的默认值为 esnext 的缘故。使用 overrideBrowserslist 来解决。
 * ```js
 * const syntax = 'es2020'; // lib.syntax
 * https://github.com/web-infra-dev/rslib/blob/8d65f3728d60254bcf1a8e24d72902ad79dae959/packages/core/src/utils/syntax.ts#L42-L153
 */
export default defineConfig({
  lib: [
    {
      format: 'esm',
      banner,
      // source,
      output: output({
        type: 'esm',
      }),
      // 配置d.ts 声明生成文件，
      /**
       * 配置d.ts 声明生成文件
       * 如果 plugins 中配置了 rsbuild-plugin-dts 插件，则不需要在 lib 配置中配置 dts。
       * https://lib.rsbuild.dev/zh/config/lib/dts
       */
      // dts: true, // 在esm下生成
      // dts: {
      //   distPath: './dist/types',
      //   // bundle: false, // 声明文件打包到指定目录文件, true 打包到 .rslib 文件
      // },
    },
    {
      format: 'cjs',
      banner,
      // source,
      output: output({
        type: 'cjs',
      }),
      dts: false,
    },
    // {
    //   format: 'umd',
    //   banner,
    //   // source,
    //   umdName: 'VersionCheckPrompt',
    //   autoExtension: false,
    //   output: {
    //     minify: true,
    //     filename: {
    //       js: `${pkg.name}.min.js`,
    //     },
    //   },
    // },
    {
      format: 'umd',
      banner,
      // source,
      umdName: 'VersionCheckPrompt',
      output: output({
        minify: true,
        type: 'umd',
      }),
    },
    {
      format: 'umd',
      banner,
      // source,
      umdName: 'VersionCheckPrompt',
      autoExtension: false,
      output: output({
        type: 'umd',
      }),
    },
    // custom-version
    {
      format: 'cjs',
      source: {
        entry: {
          index: path.resolve(__dirname, 'scripts/custom-version.js'),
        },
      },
      output: {
        target: 'node',
        minify: false,
        filename: {
          js: 'custom-version.cjs',
        },
        distPath: {
          root: `./dist/scripts`
        },
      },
    },
    // {
    //   format: 'esm',
    //   source: {
    //     entry: {
    //       index: path.resolve(__dirname, 'scripts/custom-version.js'),
    //     },
    //   },
    //   output: {
    //     target: 'node',
    //     minify: false,
    //     filename: {
    //       js: 'custom-version.js',
    //     },
    //     distPath: {
    //       root: `./dist/scripts`
    //     },
    //   },
    // },
  ],
  plugins: [
    // 在 lib 配置中，dts 配置为 true 时，会自动使用, 但是生成文件路径
    // rsbuild-plugin-dts 插件，用于生成声明文件指定文件
    pluginDts({
      distPath: './dist/types',
      dtsExtension: '.d.ts',
      bundle: false,
      redirect: {
        path: true,     // 启用路径重定向
        extension: true // 修正扩展名
      }
    }),
  ],
  source,
  output: {
    target: 'web', // 默认值web
    /**
     * usage: 仅注入被使用的 API 的 polyfill
     * entry: 全量注入 polyfill
     * off: 不注入任何 polyfill
     */
    // polyfill: 'usage', // 仅注入被使用的 API 的 polyfill
    // 指定输出目录与源码目录分离
    distPath: {
      root: './dist',
    },
    copy: {
      patterns: [
        {
          from: path.resolve(__dirname, 'src'),
          to: path.resolve(__dirname, 'dist/src'),
        },
      ],
    },
    overrideBrowserslist: [
      'chrome >= 87',
      'edge >= 88',
      'firefox >= 78',
      'safari >= 14',
    ],
  },
});
