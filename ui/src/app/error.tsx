"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-2 text-4xl font-bold text-[var(--color-error)]">Something went wrong</h1>
      <p className="mb-6 text-[var(--color-text-secondary)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-base font-medium text-white transition-all hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
