#!/bin/bash
# Build a flat skills directory from the nested registry layout.
# DocsClaw expects: skills/<name>/SKILL.md (one level deep)
# Our registry is: registry/<plugin>/<skill>/SKILL.md (two levels deep)
#
# This script creates symlinks in a target directory pointing to each
# skill directory, using the <plugin>-<skill> naming convention that
# matches our skill.yaml card names.
#
# Usage: ./scripts/build-skills-dir.sh [registry_dir] [output_dir]

set -euo pipefail

REGISTRY_DIR="${1:-registry}"
OUTPUT_DIR="${2:-k8s/docsclaw-local/skills}"

# Clean previous output
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

count=0
for plugin_dir in "$REGISTRY_DIR"/*/; do
    plugin_name="$(basename "$plugin_dir")"
    for skill_dir in "$plugin_dir"*/; do
        if [ -f "$skill_dir/SKILL.md" ]; then
            skill_name="$(basename "$skill_dir")"
            flat_name="${plugin_name}-${skill_name}"
            dest="$OUTPUT_DIR/$flat_name"
            mkdir -p "$dest"
            cp "$skill_dir/SKILL.md" "$dest/"
            [ -f "$skill_dir/skill.yaml" ] && cp "$skill_dir/skill.yaml" "$dest/"
            echo "  $flat_name"
            count=$((count + 1))
        fi
    done
done

echo "Copied $count skills into $OUTPUT_DIR/"
