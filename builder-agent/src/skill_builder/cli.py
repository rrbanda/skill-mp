"""CLI for generating skills from the command line.

Usage:
    skill-builder-cli generate "Create a Terraform security review skill"
    skill-builder-cli generate --description "..." --output ./my-skill/SKILL.md
    skill-builder-cli health --url http://localhost:8001
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


def _generate(args: argparse.Namespace) -> int:
    """Generate a skill by sending a request to the builder agent."""
    url = f"{args.url}/generate"
    payload = json.dumps({
        "description": args.description,
        "context_id": f"cli-{id(args)}",
    }).encode()

    headers = {"Content-Type": "application/json"}
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=args.timeout) as resp:
            skill_content = ""
            current_event = ""
            data_buffer = ""

            for raw_line in resp:
                line = raw_line.decode().rstrip("\n").rstrip("\r")

                if line == "":
                    if data_buffer:
                        try:
                            data = json.loads(data_buffer)
                            if current_event == "error" or "error" in data:
                                print(f"Error: {data.get('error', data)}", file=sys.stderr)
                                return 1
                            elif "skill_content" in data:
                                skill_content = data["skill_content"]
                            elif data.get("agent"):
                                agent = data["agent"]
                                text = data.get("text", "")
                                if text:
                                    print(f"[{agent}] {text[:120]}...", file=sys.stderr)
                                else:
                                    print(f"[{agent}] started", file=sys.stderr)
                        except json.JSONDecodeError:
                            pass
                    current_event = ""
                    data_buffer = ""
                    continue

                if line.startswith("event:"):
                    current_event = line[6:].strip()
                elif line.startswith("data:"):
                    payload = line[5:].strip()
                    data_buffer = payload if not data_buffer else data_buffer + payload

            if not skill_content:
                print("No skill content generated", file=sys.stderr)
                return 1

            if args.output:
                with open(args.output, "w") as f:
                    f.write(skill_content)
                print(f"Written to {args.output}", file=sys.stderr)
            else:
                print(skill_content)
            return 0

    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode()}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Connection error: {exc.reason}", file=sys.stderr)
        print(f"Is the builder agent running at {args.url}?", file=sys.stderr)
        return 1


def _health(args: argparse.Namespace) -> int:
    """Check builder agent health."""
    url = f"{args.url}/health"
    if args.deep:
        url += "?deep=true"

    headers = {}
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"

    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            print(json.dumps(data, indent=2))
            return 0 if data.get("status") == "ok" else 1
    except urllib.error.HTTPError as exc:
        print(f"HTTP {exc.code}: {exc.read().decode()}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Connection error: {exc.reason}", file=sys.stderr)
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="skill-builder",
        description="CLI for the Skill Builder agent pipeline",
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8001",
        help="Builder agent URL (default: http://localhost:8001)",
    )
    parser.add_argument(
        "--api-key",
        default="",
        help="API key for authentication",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    gen_parser = subparsers.add_parser("generate", help="Generate a new skill")
    gen_parser.add_argument(
        "description",
        help="Natural language description of the skill to generate",
    )
    gen_parser.add_argument(
        "--output", "-o",
        help="Output file path (default: stdout)",
    )
    gen_parser.add_argument(
        "--timeout", "-t",
        type=int,
        default=180,
        help="Request timeout in seconds (default: 180)",
    )

    health_parser = subparsers.add_parser("health", help="Check agent health")
    health_parser.add_argument(
        "--deep",
        action="store_true",
        help="Run deep health check (verifies Neo4j + LLM)",
    )

    args = parser.parse_args()

    if args.command == "generate":
        sys.exit(_generate(args))
    elif args.command == "health":
        sys.exit(_health(args))


if __name__ == "__main__":
    main()
