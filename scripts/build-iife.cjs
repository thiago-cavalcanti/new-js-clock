const esbuild = require('esbuild');
const { readFileSync } = require('fs');
const { join } = require('path');

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
);

const banner = `/**
 * ${packageJson.name} v${packageJson.version}
 * ${packageJson.description}
 * 
 * @author ${packageJson.author}
 * @license ${packageJson.license}
 * @repository ${packageJson.repository?.url || ''}
 */`;

async function build() {
  try {
    // Build minified IIFE
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      minify: true,
      sourcemap: true,
      format: 'iife',
      globalName: 'NewJSClock',
      outfile: 'dist/new-js-clock.min.js',
      target: ['es2020'],
      banner: {
        js: banner,
      },
    });

    // Build unminified IIFE (for debugging)
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      minify: false,
      sourcemap: true,
      format: 'iife',
      globalName: 'NewJSClock',
      outfile: 'dist/new-js-clock.js',
      target: ['es2020'],
      banner: {
        js: banner,
      },
    });

    console.log('✓ IIFE bundles built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
