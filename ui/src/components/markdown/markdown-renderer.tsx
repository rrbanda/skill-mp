"use client";

import { useMemo } from "react";

export function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-[var(--color-border)] prose-h2:pb-2 prose-h3:text-base prose-code:rounded prose-code:bg-[var(--color-surface)] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[var(--color-primary)] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-[var(--color-border)] prose-table:text-sm prose-th:bg-[var(--color-surface)] prose-td:border-[var(--color-border)] prose-th:border-[var(--color-border)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderMarkdown(md: string): string {
  let html = md;

  html = html.replace(/^### (.+)$/gm, '<h3 id="$1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 id="$1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*CRITICAL RULES\*\*/g,
    '<div class="not-prose my-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3"><span class="font-semibold text-amber-600 dark:text-amber-400">CRITICAL RULES</span></div>'
  );

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-[var(--color-primary)] hover:underline">$1</a>'
  );

  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, lang, code) =>
      `<pre class="overflow-x-auto"><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`
  );

  html = html.replace(/^\|(.+)\|$/gm, (row: string) => {
    const cells = row.split("|").filter(Boolean).map((c: string) => c.trim());
    const isHeader = cells.every((c: string) => /^-+$/.test(c));
    if (isHeader) return "";
    const tag = "td";
    return `<tr>${cells.map((c: string) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
  });
  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, (match: string) => {
    if (!match.includes("<table>")) return `<table>${match}</table>`;
    return match;
  });

  html = html.replace(/^(\d+)\.\s+(.+)$/gm, "<li>$2</li>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");

  html = html.replace(/\n{2,}/g, "</p><p>");
  html = `<p>${html}</p>`;

  html = html.replace(/<p>\s*(<h[123])/g, "$1");
  html = html.replace(/(<\/h[123]>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<pre)/g, "$1");
  html = html.replace(/(<\/pre>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<div)/g, "$1");
  html = html.replace(/(<\/div>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<table)/g, "$1");
  html = html.replace(/(<\/table>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
