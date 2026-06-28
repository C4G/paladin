#!/bin/bash
# Pre-render mermaid code blocks in a markdown file to PNG images.
# Usage: render-mermaid.sh <input.md>
# Replaces ```mermaid ... ``` blocks with ![diagram](path-to-png) inline.
# Names PNGs based on the nearest preceding markdown heading.

set -euo pipefail

INPUT="$1"
OUTDIR="documentation/2026_diagrams/seq_diagrams"
THEME_CONFIG="scripts/mermaid-theme.json"
mkdir -p "$OUTDIR"
TMPDIR=$(mktemp -d)
COUNT=0
INMERMAID=0
BLOCK=""
LAST_HEADING=""

# Process the file line by line
while IFS= read -r line || [[ -n "$line" ]]; do
  # Track the most recent heading for naming
  if [[ "$line" =~ ^#{1,6}\ (.+)$ ]]; then
    LAST_HEADING="${BASH_REMATCH[1]}"
  fi

  if [[ "$line" == '```mermaid' ]]; then
    INMERMAID=1
    BLOCK=""
    # Slugify the heading for filename: lowercase, spaces/special chars to underscores
    SLUG=$(echo "$LAST_HEADING" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//;s/_$//')
    if [[ -z "$SLUG" ]]; then
      COUNT=$((COUNT + 1))
      SLUG="diagram_${COUNT}"
    fi
    # Store slug and heading for this block
    CURRENT_SLUG="$SLUG"
    CURRENT_HEADING="$LAST_HEADING"
    continue
  fi

  if [[ $INMERMAID -eq 1 && "$line" == '```' ]]; then
    INMERMAID=0
    COUNT=$((COUNT + 1))
    echo "$BLOCK" > "$TMPDIR/${CURRENT_SLUG}.mmd"
    echo "MERMAID_PLACEHOLDER_${COUNT}|${CURRENT_SLUG}|${CURRENT_HEADING}" >> "$TMPDIR/manifest.txt"
    echo "MERMAID_PLACEHOLDER_${COUNT}" >> "$TMPDIR/processed.md"
    continue
  fi

  if [[ $INMERMAID -eq 1 ]]; then
    BLOCK="${BLOCK}${line}
"
    continue
  fi

  echo "$line" >> "$TMPDIR/processed.md"
done < "$INPUT"

if [ "$COUNT" = "0" ]; then
  rm -rf "$TMPDIR"
  exit 0
fi

echo "Rendering $COUNT mermaid diagram(s)..."

MAX_JOBS=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)
RUNNING=0

# Render all diagrams in parallel
while IFS='|' read -r placeholder slug heading; do
  mmd="$TMPDIR/${slug}.mmd"
  PNG="$OUTDIR/${slug}.png"
  npx mmdc -i "$mmd" -o "$PNG" -c "$THEME_CONFIG" -b white --scale 2 2>/dev/null &
  RUNNING=$((RUNNING + 1))
  if [ "$RUNNING" -ge "$MAX_JOBS" ]; then
    wait
    RUNNING=0
  fi
done < "$TMPDIR/manifest.txt"
wait

# Replace placeholders in reverse order to avoid PLACEHOLDER_1 matching inside PLACEHOLDER_10
tail -r "$TMPDIR/manifest.txt" | while IFS='|' read -r placeholder slug heading; do
  PNG="$OUTDIR/${slug}.png"
  escaped_heading=$(echo "$heading" | sed 's/[&/\\]/\\&/g')
  escaped_png=$(echo "$PNG" | sed 's/[&/\\]/\\&/g')
  sed -i '' "s|${placeholder}|![${escaped_heading}](${escaped_png})|" "$TMPDIR/processed.md"
done

cp "$TMPDIR/processed.md" "$INPUT"
rm -rf "$TMPDIR"
echo "Rendered $COUNT mermaid diagram(s) to PNG."
