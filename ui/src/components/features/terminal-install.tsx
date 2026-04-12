"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Copy, Check } from "lucide-react";
import type { SkillData } from "@/lib/types";

interface TerminalInstallProps {
  skill: SkillData;
}

export function TerminalInstall({ skill }: TerminalInstallProps) {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<{ text: string; type: "cmd" | "info" | "success" | "done" }[]>([]);
  const [copied, setCopied] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  const cliPkg = process.env.NEXT_PUBLIC_CLI_PACKAGE ?? "skills-marketplace";
  const installCmd = `npx ${cliPkg} install ${skill.name} --platform cursor`;

  const script = [
    { text: `$ ${installCmd}`, type: "cmd" as const, delay: 0 },
    { text: "", type: "info" as const, delay: 300 },
    { text: "  Fetching skill from registry...  ✓", type: "success" as const, delay: 800 },
    { text: "  Parsing SKILL.md...              ✓", type: "success" as const, delay: 600 },
    ...(skill.assets.references.length > 0
      ? [{ text: `  Bundling assets (${skill.assets.references.length} reference${skill.assets.references.length > 1 ? "s" : ""})... ✓`, type: "success" as const, delay: 700 }]
      : []),
    { text: `  Installing to ~/.cursor/skills/${skill.slug}/`, type: "info" as const, delay: 500 },
    { text: `    → SKILL.md                     ✓`, type: "success" as const, delay: 300 },
    ...skill.assets.references.map((a) => ({
      text: `    → references/${a.name}  ✓`,
      type: "success" as const,
      delay: 200,
    })),
    { text: "", type: "info" as const, delay: 400 },
    { text: `  ✨ Successfully installed ${skill.name}`, type: "done" as const, delay: 500 },
    { text: "", type: "info" as const, delay: 100 },
    { text: '  Start a new conversation and mention the skill to activate it.', type: "info" as const, delay: 300 },
  ];

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let delay = 0;

    setLines([]);
    script.forEach((line, i) => {
      delay += line.delay;
      setTimeout(() => {
        if (cancelled) return;
        setLines((prev) => [...prev, { text: line.text, type: line.type }]);
        if (i === script.length - 1) setRunning(false);
        termRef.current?.scrollTo(0, termRef.current.scrollHeight);
      }, delay);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      <div className="flex items-center justify-between bg-[#1a1a2e] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-gray-400">terminal</span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            title="Copy install command"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => { setRunning(true); setLines([]); }}
            disabled={running}
            className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
            title="Run animation"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={termRef}
        className="max-h-72 overflow-y-auto bg-[#0d1117] p-4 font-mono text-sm"
      >
        {lines.length === 0 && !running && (
          <div className="text-gray-500">
            <span className="text-green-400">$</span> {installCmd}
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-gray-400" />
          </div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.type === "cmd"
                ? "text-gray-300"
                : line.type === "success"
                  ? "text-green-400"
                  : line.type === "done"
                    ? "font-bold text-cyan-400"
                    : "text-gray-500"
            }
          >
            {line.text || "\u00A0"}
          </div>
        ))}
        {running && (
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-gray-400" />
        )}
      </div>
    </div>
  );
}
