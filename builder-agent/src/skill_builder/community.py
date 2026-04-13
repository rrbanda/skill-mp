"""Community detection for the skill knowledge graph.

Uses Louvain algorithm via networkx to detect natural clusters
of related skills, without requiring Neo4j GDS (enterprise feature).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import networkx as nx

logger = logging.getLogger(__name__)


@dataclass
class CommunityAssignment:
    """Maps each skill to its detected community."""

    partition: dict[str, int]
    num_communities: int
    modularity: float


def detect_communities(
    nodes: list[str],
    edges: list[tuple[str, str, float]],
    resolution: float = 1.0,
) -> CommunityAssignment:
    """Run Louvain community detection on the skill graph.

    Args:
        nodes: List of skill IDs.
        edges: List of (source_id, target_id, weight) tuples.
        resolution: Louvain resolution parameter. Higher values produce
            more communities. Default 1.0.

    Returns:
        CommunityAssignment with partition mapping and metadata.
    """
    try:
        import community as community_louvain
    except ImportError:
        logger.warning("python-louvain not installed, falling back to networkx greedy_modularity")
        return _fallback_detection(nodes, edges)

    graph = _build_graph(nodes, edges)
    if graph.number_of_nodes() == 0:
        return CommunityAssignment(partition={}, num_communities=0, modularity=0.0)

    partition = community_louvain.best_partition(graph, resolution=resolution)
    modularity = community_louvain.modularity(partition, graph)

    num_communities = len(set(partition.values()))
    logger.info(
        "Louvain detected %d communities (modularity=%.3f) from %d nodes, %d edges",
        num_communities,
        modularity,
        graph.number_of_nodes(),
        graph.number_of_edges(),
    )
    return CommunityAssignment(
        partition=partition,
        num_communities=num_communities,
        modularity=modularity,
    )


def _fallback_detection(nodes: list[str], edges: list[tuple[str, str, float]]) -> CommunityAssignment:
    """Fallback using networkx's built-in greedy modularity communities."""
    graph = _build_graph(nodes, edges)
    if graph.number_of_nodes() == 0:
        return CommunityAssignment(partition={}, num_communities=0, modularity=0.0)

    communities = nx.community.greedy_modularity_communities(graph)
    partition: dict[str, int] = {}
    for idx, comm in enumerate(communities):
        for node in comm:
            partition[node] = idx

    for node in nodes:
        if node not in partition:
            partition[node] = len(communities)

    modularity = nx.community.modularity(graph, communities)
    num_communities = len(communities)

    logger.info(
        "Greedy modularity detected %d communities (modularity=%.3f)",
        num_communities,
        modularity,
    )
    return CommunityAssignment(
        partition=partition,
        num_communities=num_communities,
        modularity=modularity,
    )


def get_community_members(
    partition: dict[str, int],
) -> dict[int, list[str]]:
    """Invert the partition map: community_id -> list of skill IDs."""
    members: dict[int, list[str]] = {}
    for skill_id, comm_id in partition.items():
        members.setdefault(comm_id, []).append(skill_id)
    return members


def _build_graph(nodes: list[str], edges: list[tuple[str, str, float]]) -> nx.Graph:
    """Build an undirected weighted networkx graph."""
    graph = nx.Graph()
    graph.add_nodes_from(nodes)
    for src, tgt, weight in edges:
        if src in graph and tgt in graph:
            graph.add_edge(src, tgt, weight=weight)
    return graph
