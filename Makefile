SHELL := /bin/bash
export PATH := /usr/bin:/usr/local/bin:/opt/homebrew/bin:/bin:$(PATH)

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------

OUT_DIR        := documentation
DOC_TITLE      := Paladin Farm & Ranch
DOC_DATE       := $(shell date '+%B %d, %Y')
SITE_URL       := https://paladinfarmandranch.com

# Source directories
USER_DOCS_DIR  := content/docs
DEV_DOCS_DIR   := content/dev-docs
DIAGRAM_DIR    := documentation/2026_diagrams/seq_diagrams
MERMAID_THEME  := scripts/mermaid-theme.json

# Output file stems
USER_STEM      := paladin_user_manual
DEV_STEM       := paladin_developer_docs

# Compiled markdown intermediates
USER_MD        := $(OUT_DIR)/$(USER_STEM).md
DEV_MD         := $(OUT_DIR)/$(DEV_STEM).md

.PHONY: setup user_docs _user_docs user_docs_clean dev_docs _dev_docs dev_docs_clean diagrams diagrams_clean docs clean

# ----------------------------------------------------------------------------
# Shared helpers
# ----------------------------------------------------------------------------

# Strip YAML frontmatter (lines between --- delimiters)
define strip_frontmatter
sed -n '/^---$$/,/^---$$/!p' $(1)
endef

# Common pandoc flags for PDF output
PANDOC_PDF = pandoc $< -o $@ --pdf-engine=xelatex \
	--number-sections --toc \
	-V colorlinks=true -V linkcolor=blue -V urlcolor=blue \
	-V toc-title="Table of Contents" \
	--include-in-header=scripts/title-style.tex

# ----------------------------------------------------------------------------
# Prerequisites check
# ----------------------------------------------------------------------------

.PHONY: setup
setup:
	@echo "Checking doc generation dependencies..."
	@command -v brew    >/dev/null 2>&1 || { echo "Error: Homebrew required — https://brew.sh"; exit 1; }
	@command -v pandoc  >/dev/null 2>&1 || { echo "Installing pandoc...";    brew install pandoc; }
	@command -v jq      >/dev/null 2>&1 || { echo "Installing jq...";       brew install jq; }
	@command -v xelatex >/dev/null 2>&1 || { echo "Installing basictex..."; brew install --cask basictex && eval "$$(/usr/libexec/path_helper)"; }
	@echo "All dependencies ready."

# ----------------------------------------------------------------------------
# User Manual
# ----------------------------------------------------------------------------

$(USER_MD): $(shell find $(USER_DOCS_DIR) -name '*.mdx' -o -name 'meta.json')
	@echo "Compiling user manual..."
	@echo "" > $@
	@for section in $$(jq -r '.pages[]' $(USER_DOCS_DIR)/meta.json); do \
		[ "$$section" = "index" ] && continue; \
		[ ! -d "$(USER_DOCS_DIR)/$$section" ] && continue; \
		printf '\n\n' >> $@; \
		title=$$(jq -r '.title' "$(USER_DOCS_DIR)/$$section/meta.json"); \
		echo "# $$title" >> $@; \
		echo "" >> $@; \
		for page in $$(jq -r '.pages[]' "$(USER_DOCS_DIR)/$$section/meta.json"); do \
			mdx="$(USER_DOCS_DIR)/$$section/$$page.mdx"; \
			[ -f "$$mdx" ] && { $(call strip_frontmatter,$$mdx) >> $@; echo "" >> $@; }; \
		done; \
	done
	@bash scripts/rewrite-doc-links.sh $@ $(USER_DOCS_DIR)
	@echo "Done: $@"

$(OUT_DIR)/$(USER_STEM).pdf: $(USER_MD)
	$(PANDOC_PDF) --metadata title="$(DOC_TITLE)" \
		--metadata subtitle="User Manual" --metadata date="$(DOC_DATE)"
	@echo "Done: $@"

$(OUT_DIR)/$(USER_STEM).docx: $(USER_MD)
	pandoc $< -o $@ --toc --metadata title="$(DOC_TITLE)" \
		--metadata subtitle="User Manual" --metadata date="$(DOC_DATE)" \
		--lua-filter=scripts/word-heading-space.lua
	@echo "Done: $@"

user_docs: setup user_docs_clean _user_docs
_user_docs: $(OUT_DIR)/$(USER_STEM).pdf $(USER_MD) $(OUT_DIR)/$(USER_STEM).docx

user_docs_clean:
	rm -f $(USER_MD) $(OUT_DIR)/$(USER_STEM).pdf $(OUT_DIR)/$(USER_STEM).docx

# ----------------------------------------------------------------------------
# Developer Documentation
# ----------------------------------------------------------------------------

$(DEV_MD): $(shell find $(DEV_DOCS_DIR) -name '*.mdx' -o -name 'meta.json')
	@echo "Compiling developer docs..."
	@echo "" > $@
	@for page in $$(jq -r '.pages[]' "$(DEV_DOCS_DIR)/meta.json"); do \
		[ "$$page" = "index" ] && continue; \
		mdx="$(DEV_DOCS_DIR)/$$page.mdx"; \
		[ -f "$$mdx" ] && { $(call strip_frontmatter,$$mdx) >> $@; echo "" >> $@; }; \
	done
	@bash scripts/rewrite-doc-links.sh $@ $(USER_DOCS_DIR)
	@sed -i '' 's/^##/#/' $@
	@bash scripts/render-mermaid.sh $@
	@echo "Done: $@"

$(OUT_DIR)/$(DEV_STEM).pdf: $(DEV_MD)
	$(PANDOC_PDF) --metadata title="$(DOC_TITLE)" \
		--metadata subtitle="Developer Documentation" --metadata date="$(DOC_DATE)"
	@echo "Done: $@"

dev_docs: setup dev_docs_clean _dev_docs
_dev_docs: $(OUT_DIR)/$(DEV_STEM).pdf

dev_docs_clean:
	rm -f $(DEV_MD) $(OUT_DIR)/$(DEV_STEM).pdf

# ----------------------------------------------------------------------------
# Mermaid Diagrams (standalone .mmd → .png)
# ----------------------------------------------------------------------------

MMD_FILES := $(shell find $(DIAGRAM_DIR) -name '*.mmd')
PNG_FILES := $(MMD_FILES:.mmd=.png)

$(DIAGRAM_DIR)/%.png: $(DIAGRAM_DIR)/%.mmd $(MERMAID_THEME)
	@echo "Rendering $<..."
	@npx mmdc -i $< -o $@ -c $(MERMAID_THEME) -b white --scale 2 -w 1200

diagrams: $(PNG_FILES)
	@echo "All diagrams rendered."

diagrams_clean:
	find $(DIAGRAM_DIR) -name '*.png' -delete

# ----------------------------------------------------------------------------
# Convenience
# ----------------------------------------------------------------------------

docs: setup clean
	$(MAKE) -j3 _user_docs _dev_docs diagrams

clean: user_docs_clean dev_docs_clean diagrams_clean
