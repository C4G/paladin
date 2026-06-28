#!/bin/bash
# Rewrites /docs/section/page links in the compiled markdown to internal #anchor links.
# Usage: ./scripts/rewrite-doc-links.sh <compiled.md> <docs-dir>

set -euo pipefail

COMPILED="$1"
DOCS_DIR="$2"
SED_FILE=$(mktemp)
trap "rm -f $SED_FILE" EXIT

# Convert heading text to pandoc-style anchor:
# lowercase, strip non-alphanumeric (keep spaces/hyphens), spaces to hyphens
to_anchor() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 -]//g' | sed 's/  */ /g' | sed 's/ /-/g'
}

# Build sed commands for each page
for section_dir in "$DOCS_DIR"/*/; do
  section=$(basename "$section_dir")
  meta="$section_dir/meta.json"
  [ -f "$meta" ] || continue

  for page in $(jq -r '.pages[]' "$meta"); do
    mdx="$section_dir/$page.mdx"
    [ -f "$mdx" ] || continue

    # Get first ## heading after frontmatter
    heading=$(sed -n '/^---$/,/^---$/!p' "$mdx" | grep -m1 '^## ' | sed 's/^## //' || true)
    [ -z "$heading" ] && continue

    anchor=$(to_anchor "$heading")
    # Replace links with optional fragment: /docs/section/page#fragment -> #fragment
    echo "s|](/docs/${section}/${page}#\\([^)]*\\))|](#\\1)|g" >> "$SED_FILE"
    # Plain: /docs/section/page -> #anchor
    echo "s|](/docs/${section}/${page})|](#${anchor})|g" >> "$SED_FILE"
  done
done

# Apply all replacements
if [ -s "$SED_FILE" ]; then
  sed -i '' -f "$SED_FILE" "$COMPILED"
fi

# Also rewrite /dev-docs/page links to internal anchors
DEV_DOCS_DIR="content/dev-docs"
if [ -f "$DEV_DOCS_DIR/meta.json" ]; then
  DEV_SED=$(mktemp)
  trap "rm -f $DEV_SED" EXIT

  for page in $(jq -r '.pages[]' "$DEV_DOCS_DIR/meta.json"); do
    [ "$page" = "index" ] && continue
    mdx="$DEV_DOCS_DIR/$page.mdx"
    [ -f "$mdx" ] || continue

    heading=$(sed -n '/^---$/,/^---$/!p' "$mdx" | grep -m1 '^## ' | sed 's/^## //' || true)
    if [ -z "$heading" ]; then
      heading=$(grep -m1 '^title: ' "$mdx" | sed 's/^title: //')
    fi
    [ -z "$heading" ] && continue

    anchor=$(to_anchor "$heading")
    echo "s|](/dev-docs/${page}#\\([^)]*\\))|](#\\1)|g" >> "$DEV_SED"
    echo "s|](/dev-docs/${page})|](#${anchor})|g" >> "$DEV_SED"
  done

  if [ -s "$DEV_SED" ]; then
    sed -i '' -f "$DEV_SED" "$COMPILED"
  fi
  rm -f "$DEV_SED"
fi
