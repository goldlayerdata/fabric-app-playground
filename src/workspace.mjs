// The Universal App is an npm workspace: npm links each member package by name. The playground maps those names
// to the package's src, for the editor, the checker and the preview (rayfin-guide: project-structure.md).
export const WORKSPACE_MODULES = {
  '@rayfin-app/shared': 'packages/shared/src/index.ts',
  '@rayfin-app/data': 'packages/data/src/index.ts',
};
