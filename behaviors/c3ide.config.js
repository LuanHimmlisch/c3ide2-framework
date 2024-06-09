/** @type {import('./c3ide.types').BuildConfig} */
export default {
    minify: false,
    host: 'https://localhost',
    port: 3000,
    runtimeScript: 'src/runtime.ts',
    langPath: 'src/lang',
    libPath: 'src/libs',
    editorScripts: [
        'src/editor.ts'
    ],
}