/**
 * https://lib.rsbuild.dev/zh/config/lib/banner
 */
import { defineConfig, LibConfig } from '@rslib/core';
// import {pluginDts} from 'rsbuild-plugin-dts';
import pkg from './package.json';

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
      dts: {
        distPath: './dist/types',
        bundle: false, // 声明文件打包到指定目录文件, true 打包到 .rslib 文件
      },
    },
    {
      format: 'cjs',
      banner,
      output: output({
        type: 'cjs',
      }),
      dts: false,
    },
    // {
    //   format: 'umd',
    //   banner,
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
      umdName: 'VersionCheckPrompt',
      output: output({
        minify: true,
        type: 'umd',
      }),
    },
    {
      format: 'umd',
      banner,
      umdName: 'VersionCheckPrompt',
      autoExtension: false,
      output: output({
        type: 'umd',
      }),
    },
  ],
  plugins: [
    // 在 lib 配置中，dts 配置为 true 时，会自动使用, 但是生成文件路径
    // rsbuild-plugin-dts 插件，用于生成声明文件指定文件
    // pluginDts({
    //   distPath: './dist/types',
    //   dtsExtension: '.d.ts',
    //   bundle: false,
    //   redirect: {
    //     path: true,     // 启用路径重定向
    //     extension: true // 修正扩展名
    //   }
    // }),
  ],
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  output: {
    target: 'web',
    distPath: {
      root: './dist',
    },
    overrideBrowserslist: [
      'chrome >= 87',
      'edge >= 88',
      'firefox >= 78',
      'safari >= 14',
    ],
  },
});
