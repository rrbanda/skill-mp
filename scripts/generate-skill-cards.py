#!/usr/bin/env python3
"""Generate docsclaw-compatible skill.yaml cards from SKILL.md frontmatter.

Walks registry/**/SKILL.md, parses YAML frontmatter, and writes a skill.yaml
card alongside each SKILL.md for OCI packaging with `docsclaw skill pack`.

Usage:
    python scripts/generate-skill-cards.py [--registry registry/] [--oci-prefix ghcr.io/org/repo/skills]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml

DEFAULT_OCI_PREFIX = "ghcr.io/rrbanda/skill-mp/skills"
DEFAULT_REGISTRY = "registry"
DEFAULT_AUTHOR = "Skills Marketplace"

CARD_NAME_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$")


def parse_frontmatter(content: str) -> dict[str, str]:
    """Extract the first YAML frontmatter block from markdown content."""
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}

    end = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = i
            break
    if end is None:
        return {}

    fm_text = "\n".join(lines[1:end])
    try:
        return yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        return {}


def skill_name_to_card_name(name: str) -> str:
    """Convert 'plugin:skill-id' to 'plugin-skill-id' for docsclaw validation."""
    return name.replace(":", "-")


def extract_namespace(name: str) -> str:
    """Extract plugin/namespace from 'plugin:skill-id' format."""
    if ":" in name:
        return name.split(":")[0]
    return "default"


def build_skill_card(fm: dict[str, str], oci_prefix: str) -> dict:
    """Build a docsclaw-compatible skill.yaml card from frontmatter fields."""
    raw_name = fm.get("name", "")
    card_name = skill_name_to_card_name(raw_name)
    namespace = extract_namespace(raw_name)
    version = fm.get("version", "1.0.0")
    description = fm.get("description", "")

    if len(description) > 1024:
        description = description[:1021] + "..."

    return {
        "apiVersion": "docsclaw.io/v1alpha1",
        "kind": "SkillCard",
        "metadata": {
            "name": card_name,
            "namespace": namespace,
            "ref": f"{oci_prefix}/{card_name}",
            "version": version,
            "description": description,
            "author": DEFAULT_AUTHOR,
            "license": "Apache-2.0",
        },
        "spec": {
            "tools": {
                "required": ["read_file"],
                "optional": ["exec", "web_fetch", "write_file"],
            },
            "dependencies": {
                "skills": [],
                "toolPacks": [],
            },
        },
    }


def validate_card_name(name: str) -> bool:
    """Validate name against docsclaw's regex."""
    return bool(CARD_NAME_RE.match(name)) and "--" not in name


def generate_cards(registry_dir: Path, oci_prefix: str) -> tuple[int, int]:
    """Generate skill.yaml for all SKILL.md files. Returns (generated, skipped)."""
    generated = 0
    skipped = 0

    for skill_md in sorted(registry_dir.rglob("SKILL.md")):
        skill_dir = skill_md.parent
        content = skill_md.read_text()
        fm = parse_frontmatter(content)

        if not fm.get("name"):
            print(f"  SKIP {skill_md}: no 'name' in frontmatter")
            skipped += 1
            continue

        card = build_skill_card(fm, oci_prefix)
        card_name = card["metadata"]["name"]

        if not validate_card_name(card_name):
            print(f"  SKIP {skill_md}: invalid card name '{card_name}'")
            skipped += 1
            continue

        card_path = skill_dir / "skill.yaml"
        with open(card_path, "w") as f:
            yaml.dump(card, f, default_flow_style=False, sort_keys=False)

        print(f"  OK   {card_path}")
        generated += 1

    return generated, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--registry",
        default=DEFAULT_REGISTRY,
        help=f"Path to registry directory (default: {DEFAULT_REGISTRY})",
    )
    parser.add_argument(
        "--oci-prefix",
        default=DEFAULT_OCI_PREFIX,
        help=f"OCI registry prefix for skill refs (default: {DEFAULT_OCI_PREFIX})",
    )
    args = parser.parse_args()

    registry_dir = Path(args.registry)
    if not registry_dir.is_dir():
        print(f"Error: {registry_dir} is not a directory", file=sys.stderr)
        return 1

    print(f"Generating skill cards from {registry_dir}/ ...")
    generated, skipped = generate_cards(registry_dir, args.oci_prefix)
    print(f"\nDone: {generated} generated, {skipped} skipped")
    return 0 if skipped == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
