# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Kathaa MVP release with onboarding, voice, stop-capture, reading mode, journal.
- MIT License.
- GitHub Actions CI workflow.
- Dockerfile and docker-compose.yml.
- Enhanced README with badges and quick start.
- `.nojekyll` for GitHub Pages deployment.
- `vercel.yml` for Vercel one-click deployment.
- `netlify.toml` for Netlify one-click deployment.
- ESLint + Prettier config aligned (eslint-config-prettier).
- Package.json scripts: lint, format, test, build.

### Changed
- Fixed linebreak-style to LF across all JS/JSON/MD files.
- Resolved ESLint/Prettier conflicts by extending `prettier` config.
- Removed unused `blobToDataURL` utility (prefixed with `_`).
- Fixed `pick` function scope in `content.js` narrationLines.

### Fixed
- Journal.js quote style for HTML entity map.
- Storage.js indentation consistency.
