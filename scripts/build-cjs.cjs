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
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      format: 'cjs',
      sourcemap: true,
      outfile: 'dist/index.cjs',
      target: ['es2020'],
      banner: {
        js: banner,
      },
    });

    console.log('✓ CJS bundle built successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
