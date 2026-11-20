# Repository instructions

Commit each completed feature or coherent change to Git after verification. Use Conventional Commit messages with a descriptive scope and an imperative summary, such as `fix(popup): restore focus after navigation`.

## Extension version

Bump the extension version as part of any task that changes its shipped behavior. Use a patch bump for fixes, a minor bump for backward-compatible features, and a major bump for breaking changes. When a task contains several changes, use the highest applicable bump once. Keep the version for docs-only or development-only work that does not affect the bundled extension.

Run `npm version <patch|minor|major> --no-git-tag-version` in `extension/` before building and verifying. Commit the updated `package.json` and `package-lock.json` with the relevant source changes. Generated files in `extension/.output/` stay out of Git.
