"""Registry scanner for the GraphRAG pipeline.

Reads marketplace.json and all SKILL.md files, producing a list of
SkillData records ready for entity extraction and relationship analysis.
"""

from __future__ import annotations

import json
import logging
import pathlib
from dataclasses import dataclass

import yaml

logger = logging.getLogger(__name__)


@dataclass
class SkillData:
    """Parsed skill for pipeline processing."""

    skill_id: str
    plugin: str
    name: str
    description: str
    body: str
    raw_content: str


def scan_registry(registry_dir: str) -> list[SkillData]:
    """Read all SKILL.md files from the registry directory.

    Expects ``registry_dir`` to contain a ``marketplace.json`` index
    listing plugins and their source directories.
    """
    root = pathlib.Path(registry_dir)
    mp_path = root / "marketplace.json"
    if not mp_path.exists():
        logger.warning("No marketplace.json at %s", mp_path)
        return []

    mp = json.loads(mp_path.read_text())
    skills: list[SkillData] = []

    for plugin in mp.get("plugins", []):
        plugin_name = plugin["name"]
        plugin_dir = root / plugin.get("source", f"./{plugin_name}").lstrip("./")
        if not plugin_dir.is_dir():
            continue
        for entry in sorted(plugin_dir.iterdir()):
            if not entry.is_dir():
                continue
            skill_file = entry / "SKILL.md"
            if not skill_file.exists():
                continue
            try:
                raw = skill_file.read_text()
                name, desc = parse_frontmatter(raw)
                skills.append(
                    SkillData(
                        skill_id=f"{plugin_name}-{entry.name}",
                        plugin=plugin_name,
                        name=name or entry.name,
                        description=desc,
                        body=extract_body(raw)[:3000],
                        raw_content=raw,
                    )
                )
            except Exception as exc:
                logger.warning("Failed to read %s: %s", skill_file, exc)

    logger.info("Scanned %d skills from %s", len(skills), registry_dir)
    return skills


def parse_frontmatter(content: str) -> tuple[str, str]:
    """Extract name and description from the first YAML frontmatter block.

    Returns ("", "") for content without valid frontmatter instead of raising.
    """
    if not content.startswith("---"):
        return "", ""
    end = content.find("---", 3)
    if end == -1:
        return "", ""
    try:
        fm = yaml.safe_load(content[3:end])
    except yaml.YAMLError:
        return "", ""
    if not isinstance(fm, dict):
        return "", ""
    raw_name = fm.get("name", "")
    name = raw_name.split(":")[-1].strip() if ":" in raw_name else raw_name
    return name, fm.get("description", "")


def extract_body(content: str) -> str:
    """Return the markdown body after stripping frontmatter block(s).

    Uses find() instead of index() to avoid ValueError on malformed content.
    """
    body = content
    if body.startswith("---"):
        idx = body.find("---", 3)
        if idx == -1:
            return body[3:].strip()
        body = body[idx + 3 :].strip()
    if body.startswith("---"):
        idx = body.find("---", 3)
        if idx == -1:
            return body[3:].strip()
        body = body[idx + 3 :].strip()
    return body
