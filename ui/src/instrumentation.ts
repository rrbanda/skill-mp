export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.GRAPH_BACKEND !== "neo4j") {
    return;
  }

  const { syncRegistryToNeo4j } = await import("@/lib/graph/sync");

  // Auto-sync on startup
  try {
    const result = await syncRegistryToNeo4j();
    if (result.nodes > 0) {
      console.log(
        `[auto-sync] Synced ${result.nodes} nodes, ${result.edges} edges to Neo4j (${result.durationMs}ms)`
      );
    }
  } catch (err) {
    console.warn("[auto-sync] Failed to sync on startup:", err);
  }

  // File watcher in dev mode
  if (process.env.NODE_ENV === "development") {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const registryDir = path.resolve(process.cwd(), "..", "registry");

      if (fs.existsSync(registryDir)) {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        fs.watch(registryDir, { recursive: true }, (_event, filename) => {
          if (!filename?.endsWith(".md")) return;

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            try {
              const result = await syncRegistryToNeo4j(registryDir);
              if (result.nodes > 0) {
                console.log(
                  `[auto-sync] File changed → resynced ${result.nodes} nodes, ${result.edges} edges (${result.durationMs}ms)`
                );
              }
            } catch (err) {
              console.warn("[auto-sync] Watch sync failed:", err);
            }
          }, 1000);
        });

        console.log(`[auto-sync] Watching ${registryDir} for changes`);
      }
    } catch {
      // fs.watch not available
    }
  }
}
