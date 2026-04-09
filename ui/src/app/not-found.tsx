import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-6xl font-bold text-[var(--color-text-muted)]">404</h1>
      <p className="mb-6 text-lg text-[var(--color-text-secondary)]">
        This skill doesn&apos;t exist in the marketplace yet.
      </p>
      <Link
        href="/skills"
        className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-base font-medium text-white transition-all hover:brightness-110"
      >
        Browse Skills
      </Link>
    </div>
  );
}
