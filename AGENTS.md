# Repository instructions

Commit each completed feature or coherent change to Git after verification. Use Conventional Commit messages with a descriptive scope and an imperative summary, such as `fix(popup): restore focus after navigation`.

## Extension version

Bump the extension version once per release that changes shipped behavior. Use a patch bump for fixes, refinements, and small additions. Reserve minor bumps for substantial backward-compatible features and major bumps for breaking changes. Group small changes into patch releases when practical. Keep the version for docs-only or development-only work that does not affect the bundled extension.

Keep published version numbers in order so installed extensions can recognize updates. Check that the Chrome and Firefox ZIP manifests match the release tag.

Run `npm version <patch|minor|major> --no-git-tag-version` in `extension/` before building and verifying. Commit the updated `package.json` and `package-lock.json` with the relevant source changes. Generated files in `extension/.output/` stay out of Git.
