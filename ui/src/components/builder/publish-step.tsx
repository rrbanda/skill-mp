"use client";

import { useCallback, useState } from "react";
import {
  ArrowLeft,
  Check,
  FolderPlus,
  Loader2,
  AlertCircle,
  GitCommitHorizontal,
  Cloud,
  CloudOff,
  Brain,
} from "lucide-react";

interface GitInfo {
  committed: boolean;
  pushed: boolean;
  commit_sha?: string;
  commit_message?: string;
  error?: string;
}

interface EmbedInfo {
  embedded: boolean;
  error?: string;
}

interface SaveResult {
  path: string;
  git: GitInfo;
  embedding: EmbedInfo;
}

interface PublishStepProps {
  skillContent: string;
  onComplete: () => void;
  onBack: () => void;
}

const PLUGIN_OPTIONS = [
  { value: "docs", label: "docs", desc: "Documentation and code quality" },
  { value: "devops", label: "devops", desc: "Infrastructure and operations" },
  { value: "api", label: "api", desc: "API design and documentation" },
  { value: "testing", label: "testing", desc: "Test generation and QA" },
  { value: "security", label: "security", desc: "Security auditing" },
];

export function PublishStep({
  skillContent,
  onComplete,
  onBack,
}: PublishStepProps) {
  const [plugin, setPlugin] = useState("");
  const [skillName, setSkillName] = useState(() => extractName(skillContent));
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);

  const handlePublish = useCallback(async () => {
    if (!plugin || !skillName.trim()) return;

    setIsPublishing(true);
    setError(null);

    try {
      const response = await fetch("/api/builder?action=save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill_content: skillContent,
          plugin,
          skill_name: skillName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Failed to save skill");
        return;
      }

      setResult({
        path: data.path,
        git: data.git ?? { committed: false, pushed: false },
        embedding: data.embedding ?? { embedded: false },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsPublishing(false);
    }
  }, [plugin, skillName, skillContent]);

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold">Skill published</h2>
          <p className="text-[var(--color-text-secondary)]">
            Saved to{" "}
            <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-sm">
              registry/{result.path}
            </code>
          </p>
        </div>

        <div className="mb-8 space-y-3">
          <StatusRow
            icon={<GitCommitHorizontal className="h-4 w-4" />}
            label="Git commit"
            ok={result.git.committed}
            detail={
              result.git.committed
                ? result.git.commit_sha ?? "committed"
                : result.git.error ?? "Git not available"
            }
          />
          <StatusRow
            icon={
              result.git.pushed ? (
                <Cloud className="h-4 w-4" />
              ) : (
                <CloudOff className="h-4 w-4" />
              )
            }
            label="Pushed to remote"
            ok={result.git.pushed}
            detail={
              result.git.pushed
                ? "Pushed to origin"
                : result.git.committed
                  ? "Committed locally, push pending"
                  : "No commit to push"
            }
          />
          <StatusRow
            icon={<Brain className="h-4 w-4" />}
            label="Vector embedding"
            ok={result.embedding.embedded}
            detail={
              result.embedding.embedded
                ? "Indexed for semantic search"
                : result.embedding.error ?? "Will embed on next sync"
            }
          />
        </div>

        <div className="text-center">
          <button
            onClick={onComplete}
            className="rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Create another skill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h2 className="mb-2 text-xl font-bold">Publish to registry</h2>
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Choose where to save the generated SKILL.md in the registry.
      </p>

      <div className="space-y-6">
        {/* Plugin selection */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Plugin category
          </label>
          <div className="grid gap-2">
            {PLUGIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPlugin(opt.value)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                  plugin === opt.value
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-[var(--color-border)] hover:border-[var(--color-text-muted)]"
                }`}
              >
                <FolderPlus
                  className={`h-4 w-4 ${
                    plugin === opt.value
                      ? "text-blue-500"
                      : "text-[var(--color-text-muted)]"
                  }`}
                />
                <div>
                  <span className="font-medium">{opt.label}</span>
                  <span className="ml-2 text-[var(--color-text-muted)]">
                    {opt.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Skill name */}
        <div>
          <label className="mb-2 block text-sm font-medium">Skill name</label>
          <input
            type="text"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value.toLowerCase())}
            placeholder="my-skill-name"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-mono placeholder:text-[var(--color-text-muted)] focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Lowercase letters, numbers, and hyphens only. Will be saved to{" "}
            <code>
              registry/{plugin || "..."}/{skillName || "..."}/SKILL.md
            </code>
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to review
          </button>
          <button
            onClick={handlePublish}
            disabled={!plugin || !skillName.trim() || isPublishing}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4" />
                Save to Registry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  ok,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
        ok
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-[var(--color-border)] bg-[var(--color-surface)]"
      }`}
    >
      <span className={ok ? "text-emerald-500" : "text-[var(--color-text-muted)]"}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-xs text-[var(--color-text-muted)]">
        {ok && <Check className="mr-1 inline h-3 w-3 text-emerald-500" />}
        {detail}
      </span>
    </div>
  );
}

function extractName(content: string): string {
  const match = content.match(/^name:\s*(?:[\w-]+:)?(.+)$/m);
  if (match?.[1]) {
    return match[1].trim();
  }
  return "";
}
