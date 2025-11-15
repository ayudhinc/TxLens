.PHONY: release-patch release-minor release-major publish help clean build install test check pre-release

help:
	@echo "Available targets:"
	@echo ""
	@echo "Release:"
	@echo "  make release-patch  - Bump patch version, publish to npm, and push to git"
	@echo "  make release-minor  - Bump minor version, publish to npm, and push to git"
	@echo "  make release-major  - Bump major version, publish to npm, and push to git"
	@echo ""
	@echo "Development:"
	@echo "  make build          - Build the project"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make install        - Install dependencies"
	@echo "  make test           - Run tests (when available)"
	@echo "  make check          - Run pre-release checks"

# Development targets
install:
	pnpm install

build:
	pnpm run build

clean:
	rm -rf dist

test:
	@echo "No tests configured yet"

# Pre-release checks
check:
	@echo "Running pre-release checks..."
	@git diff-index --quiet HEAD || (echo "Error: Working directory is not clean. Commit or stash changes first." && exit 1)
	@git rev-parse --abbrev-ref HEAD | grep -q "^master$$\|^main$$" || (echo "Warning: Not on master/main branch")
	@echo "✓ Git working directory is clean"
	@pnpm run build
	@echo "✓ Build successful"
	@echo "All checks passed!"

# Release targets with pre-checks
release-patch: check
	npm version patch
	npm publish
	git push --follow-tags

release-minor: check
	npm version minor
	npm publish
	git push --follow-tags

release-major: check
	npm version major
	npm publish
	git push --follow-tags

publish:
	npm publish
	git push --follow-tags
