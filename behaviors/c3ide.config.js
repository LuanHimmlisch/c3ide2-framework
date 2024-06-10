/** @type {import('./c3ide.types').BuildConfig} */
export default {
    minify: false,
    host: 'https://localhost',
    port: 3000,
    sourcePath: 'src/',
    addonScript: 'addon.ts',
    runtimeScript: 'runtime.ts',
    langPath: 'src/lang',
    libPath: 'src/libs',
    // TODO: Add export, examples, dist paths...
}