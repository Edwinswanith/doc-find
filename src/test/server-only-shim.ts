// vitest doesn't run through Next.js's bundler, which is what normally supplies a virtual
// "server-only" module (and enforces it against client bundles). Outside that bundler the real
// npm package throws unconditionally on import, so vitest.config.ts aliases "server-only" to this
// harmless no-op instead -- it only affects test resolution, not the real Next.js build.
export {}
