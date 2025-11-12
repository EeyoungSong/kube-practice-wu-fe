"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FC, JSX } from "react";
import type { NodeObject, LinkObject } from "force-graph";
import type { ForceGraphMethods, ForceGraphProps } from "react-force-graph-2d";
import dynamic from "next/dynamic";
import * as d3 from "d3";

import { apiClient } from "@/services/api-client";

type GraphNode = {
  id: string;
  label: string;
  type: "word" | "sentence";
  review_count?: number | null;
  meaning?: string | null;
  color?: string | null;
};

type GraphEdge = {
  from: string;
  to: string;
};

type ForceNode = GraphNode & NodeObject;

type ForceLink = LinkObject & {
  id: string;
  source: string;
  target: string;
};

type ForceGraphComponent = React.ForwardRefExoticComponent<
  ForceGraphProps<ForceNode, ForceLink> & React.RefAttributes<any>
>;

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] w-full items-center justify-center text-[#c8b9ff]">
      별자리를 준비하는 중...
    </div>
  ),
}) as ForceGraphComponent;

const INITIAL_BATCH = 120;
const BATCH_SIZE = 120;

const makeEdgeId = (edge: GraphEdge) => `${edge.from}->${edge.to}`;

// 연결성을 고려한 노드 선택 함수
const selectConnectedNodes = (
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  targetCount: number
): GraphNode[] => {
  if (allNodes.length === 0) return [];
  if (targetCount >= allNodes.length) return allNodes;

  // 인접 리스트 생성
  const adjacencyMap = new Map<string, Set<string>>();
  allEdges.forEach((edge) => {
    if (!adjacencyMap.has(edge.from)) adjacencyMap.set(edge.from, new Set());
    if (!adjacencyMap.has(edge.to)) adjacencyMap.set(edge.to, new Set());
    adjacencyMap.get(edge.from)?.add(edge.to);
    adjacencyMap.get(edge.to)?.add(edge.from);
  });

  // 연결도가 높은 노드부터 시작점으로 선택
  const nodesByConnections = allNodes
    .map((node) => ({
      node,
      connections: adjacencyMap.get(node.id)?.size ?? 0,
    }))
    .sort((a, b) => b.connections - a.connections);

  const selectedNodes = new Set<string>();
  const result: GraphNode[] = [];

  // BFS로 연결된 노드들을 우선 선택
  for (const { node: startNode } of nodesByConnections) {
    if (selectedNodes.has(startNode.id) || result.length >= targetCount) break;

    const queue = [startNode.id];
    const visited = new Set<string>();

    while (queue.length > 0 && result.length < targetCount) {
      const currentId = queue.shift()!;
      if (visited.has(currentId) || selectedNodes.has(currentId)) continue;

      visited.add(currentId);
      selectedNodes.add(currentId);

      const currentNode = allNodes.find((n) => n.id === currentId);
      if (currentNode) {
        result.push(currentNode);
      }

      // 연결된 노드들을 큐에 추가
      const neighbors = adjacencyMap.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId) && !selectedNodes.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
    }
  }

  // 목표 개수에 못 미치면 나머지 노드들 추가
  if (result.length < targetCount) {
    for (const node of allNodes) {
      if (!selectedNodes.has(node.id) && result.length < targetCount) {
        result.push(node);
      }
    }
  }

  return result.slice(0, targetCount);
};

// 뷰포트 내의 노드들을 찾는 함수
const getNodesInViewport = (
  nodes: GraphNode[],
  viewport: { x: number; y: number; k: number },
  viewportSize: { width: number; height: number },
  padding: number = 200
): GraphNode[] => {
  const viewWidth = viewportSize.width / viewport.k;
  const viewHeight = viewportSize.height / viewport.k;

  const minX = viewport.x - viewWidth / 2 - padding;
  const maxX = viewport.x + viewWidth / 2 + padding;
  const minY = viewport.y - viewHeight / 2 - padding;
  const maxY = viewport.y + viewHeight / 2 + padding;

  return nodes.filter((node) => {
    // 노드 위치는 force simulation에 의해 결정되므로
    // 초기에는 모든 노드를 포함하고, 시뮬레이션 후 필터링
    return true; // 일단 모든 노드 포함, 나중에 위치 기반 필터링 구현
  });
};

// 초기 클러스터 선택 함수
const getInitialCluster = (
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  clusterSize: number = 50
): GraphNode[] => {
  if (allNodes.length === 0) return [];

  // 연결도가 가장 높은 노드를 중심으로 클러스터 생성
  const adjacencyMap = new Map<string, Set<string>>();
  allEdges.forEach((edge) => {
    if (!adjacencyMap.has(edge.from)) adjacencyMap.set(edge.from, new Set());
    if (!adjacencyMap.has(edge.to)) adjacencyMap.set(edge.to, new Set());
    adjacencyMap.get(edge.from)?.add(edge.to);
    adjacencyMap.get(edge.to)?.add(edge.from);
  });

  // 가장 연결도가 높은 노드 찾기
  const centerNode = allNodes.reduce((best, node) => {
    const connections = adjacencyMap.get(node.id)?.size ?? 0;
    const bestConnections = adjacencyMap.get(best.id)?.size ?? 0;
    return connections > bestConnections ? node : best;
  });

  // BFS로 클러스터 생성
  const cluster = new Set<string>();
  const queue = [centerNode.id];
  const visited = new Set<string>();

  while (queue.length > 0 && cluster.size < clusterSize) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    cluster.add(currentId);

    const neighbors = adjacencyMap.get(currentId);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId) && cluster.size < clusterSize) {
          queue.push(neighborId);
        }
      }
    }
  }

  return allNodes.filter((node) => cluster.has(node.id));
};

// 연결된 컴포넌트들을 찾는 함수
const findConnectedComponents = (
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphNode[][] => {
  const adjacencyMap = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!adjacencyMap.has(edge.from)) adjacencyMap.set(edge.from, new Set());
    if (!adjacencyMap.has(edge.to)) adjacencyMap.set(edge.to, new Set());
    adjacencyMap.get(edge.from)?.add(edge.to);
    adjacencyMap.get(edge.to)?.add(edge.from);
  });

  const visited = new Set<string>();
  const components: GraphNode[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: GraphNode[] = [];
    const queue = [node.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      const currentNode = nodes.find((n) => n.id === currentId);
      if (currentNode) {
        component.push(currentNode);
      }

      const neighbors = adjacencyMap.get(currentId);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            queue.push(neighborId);
          }
        }
      }
    }

    if (component.length > 0) {
      components.push(component);
    }
  }

  // 고립된 노드들도 추가
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      components.push([node]);
    }
  }

  return components.sort((a, b) => b.length - a.length); // 큰 컴포넌트부터
};

// 단일 컴포넌트를 원형으로 배치하는 함수
const layoutComponent = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  centerX: number,
  centerY: number
): ForceNode[] => {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    return [
      {
        ...nodes[0],
        x: centerX,
        y: centerY,
        fx: centerX,
        fy: centerY,
      } as ForceNode,
    ];
  }

  // 인접 리스트 생성
  const adjacencyMap = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!adjacencyMap.has(edge.from)) adjacencyMap.set(edge.from, new Set());
    if (!adjacencyMap.has(edge.to)) adjacencyMap.set(edge.to, new Set());
    adjacencyMap.get(edge.from)?.add(edge.to);
    adjacencyMap.get(edge.to)?.add(edge.from);
  });

  const result: ForceNode[] = [];
  const baseRadius = Math.max(40, nodes.length * 8);

  // 연결도가 높은 노드부터 중심에 배치
  const nodesByConnections = nodes
    .map((node) => ({
      node,
      connections: adjacencyMap.get(node.id)?.size ?? 0,
    }))
    .sort((a, b) => b.connections - a.connections);

  // 첫 번째 노드는 중심에
  const centerNode = nodesByConnections[0].node;
  result.push({
    ...centerNode,
    x: centerX,
    y: centerY,
    fx: centerX,
    fy: centerY,
  } as ForceNode);

  // 나머지 노드들을 원형으로 배치
  for (let i = 1; i < nodesByConnections.length; i++) {
    const node = nodesByConnections[i].node;
    const angle = ((i - 1) / (nodesByConnections.length - 1)) * 2 * Math.PI;
    const x = centerX + baseRadius * Math.cos(angle);
    const y = centerY + baseRadius * Math.sin(angle);

    result.push({
      ...node,
      x,
      y,
      fx: x,
      fy: y,
    } as ForceNode);
  }

  return result;
};

// 노드들에 고정 위치를 할당하는 함수 (컴포넌트별로 분리)
const assignFixedPositions = (
  nodes: GraphNode[],
  edges: GraphEdge[]
): ForceNode[] => {
  if (nodes.length === 0) return [];

  const components = findConnectedComponents(nodes, edges);
  const result: ForceNode[] = [];

  // 컴포넌트들을 격자 형태로 배치
  const gridSize = Math.ceil(Math.sqrt(components.length));
  const componentSpacing = 300; // 컴포넌트 간 거리

  components.forEach((component, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    // 격자 중심을 (0, 0)으로 맞추기
    const offsetX = ((gridSize - 1) * componentSpacing) / 2;
    const offsetY = ((gridSize - 1) * componentSpacing) / 2;

    const centerX = col * componentSpacing - offsetX;
    const centerY = row * componentSpacing - offsetY;

    const componentNodes = layoutComponent(component, edges, centerX, centerY);
    result.push(...componentNodes);
  });

  return result;
};

const GraphView: FC = () => {
  const graphRef = useRef<any>(null);
  const fitViewOnceRef = useRef(true);

  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allEdges, setAllEdges] = useState<GraphEdge[]>([]);
  const [graphData, setGraphData] = useState<{
    nodes: ForceNode[];
    links: ForceLink[];
  }>({ nodes: [], links: [] });
  const [loadedNodes, setLoadedNodes] = useState<Set<string>>(new Set());

  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(
    () => new Set()
  );
  const [highlightedLinkIds, setHighlightedLinkIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    console.log({ allNodes, allEdges });
  }, [allNodes, allEdges]);

  useEffect(() => {
    if (!graphRef.current) return;
    const g = graphRef.current;
    g.d3Force("center", d3.forceCenter(0, 0));
    g.d3Force("attract", d3.forceRadial(0.004, 0, 0));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadGraph = async () => {
      setIsFetching(true);
      try {
        const payload = await apiClient.get<{
          nodes?: GraphNode[];
          edges?: GraphEdge[];
        }>("/graph/");

        if (cancelled) return;

        const fetchedNodes = payload.nodes ?? [];
        const fetchedEdges = payload.edges ?? [];

        setAllNodes(fetchedNodes);
        setAllEdges(fetchedEdges);

        // 모든 노드를 한 번에 로드
        const allNodeIds = new Set(fetchedNodes.map((node) => node.id));
        setLoadedNodes(allNodeIds);

        setError(null);
        fitViewOnceRef.current = true;
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unknown error fetching graph data"
        );
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };

    loadGraph();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadedNodes.size === 0) {
      setGraphData({ nodes: [], links: [] });
      return;
    }

    console.log({ loadedNodesCount: loadedNodes.size });
    console.log({ allNodes });

    // 연결성을 고려한 노드 선택
    const selectedNodes = selectConnectedNodes(
      allNodes,
      allEdges,
      loadedNodes.size
    );
    const visibleNodes = selectedNodes.map((node) => ({
      ...node,
      name: node.label,
    }));

    const nodeIdSet = new Set(visibleNodes.map((node) => node.id));

    console.log({ nodeIdSet, visibleNodesCount: visibleNodes.length });

    const links = allEdges
      .filter((edge) => nodeIdSet.has(edge.from) && nodeIdSet.has(edge.to))
      .map((edge) => ({
        id: makeEdgeId(edge),
        source: edge.from,
        target: edge.to,
      }));

    console.log({ nodes: visibleNodes, links, linksCount: links.length });

    setGraphData({ nodes: visibleNodes, links });
  }, [allNodes, allEdges, loadedNodes]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    allEdges.forEach((edge) => {
      if (!map.has(edge.from)) map.set(edge.from, new Set());
      if (!map.has(edge.to)) map.set(edge.to, new Set());
      map.get(edge.from)?.add(edge.to);
      map.get(edge.to)?.add(edge.from);
    });
    return map;
  }, [allEdges]);

  useEffect(() => {
    if (!graphData.nodes.length) return;

    // ForceGraph2D가 마운트될 때까지 기다린 후 실행
    const checkAndStop = () => {
      console.log("🪐 Checking graph ref:", { current: graphRef.current });

      console.log({
        allNodesLength: allNodes.length,
        allEdgesLength: allEdges.length,
      });

      const time = (allNodes.length + allEdges.length) * 100;
      console.log("🪐 Time:", time);

      if (graphRef.current) {
        console.log("🪐 Force stopped manually");
        const g = graphRef.current;

        // 2.5초 뒤 시뮬레이션 멈춤
        setTimeout(() => {
          console.log("🪐 Stopping forces now");
          g.d3Force("charge", null);
          g.d3Force("link", null);
          g.d3Force("center", null);
        }, time);
      } else {
        // ref가 아직 null이면 100ms 후 다시 시도
        setTimeout(checkAndStop, 100);
      }
    };

    // 컴포넌트 마운트 후 바로 시작
    setTimeout(checkAndStop, 100);
  }, [graphData.nodes.length]);

  useEffect(() => {
    if (!activeNodeId) {
      setHighlightedNodeIds(new Set());
      setHighlightedLinkIds(new Set());
      return;
    }

    const connected = adjacency.get(activeNodeId) ?? new Set<string>();
    const nodeSet = new Set<string>([activeNodeId]);
    connected.forEach((id) => nodeSet.add(id));
    setHighlightedNodeIds(new Set(nodeSet));

    const linkSet = new Set<string>();
    graphData.links.forEach((link) => {
      const source =
        typeof link.source === "string"
          ? link.source
          : (link.source as ForceNode)?.id;
      const target =
        typeof link.target === "string"
          ? link.target
          : (link.target as ForceNode)?.id;
      if (!source || !target) return;
      if (source === activeNodeId || target === activeNodeId) {
        linkSet.add(link.id);
      }
    });
    setHighlightedLinkIds(new Set(linkSet));

    const timeout = window.setTimeout(() => {
      setActiveNodeId(null);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [activeNodeId, adjacency, graphData.links]);

  // 지연 로딩 제거됨

  useEffect(() => {
    if (!graphData.nodes.length) {
      return;
    }

    if (fitViewOnceRef.current) {
      fitViewOnceRef.current = false;
      // 모든 노드가 화면에 맞도록 자동 줌 조정
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit?.(400, 50); // 400ms 애니메이션, 50px 패딩
        }
      }, 1500); // 물리 시뮬레이션이 어느 정도 안정화된 후
    }
  }, [graphData.nodes.length]);

  // 반짝임 애니메이션을 위한 리렌더링
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render for sparkle animation
      setGraphData((prev) => ({ ...prev }));
    }, 100); // 100ms마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = useCallback((node: NodeObject) => {
    const forceNode = node as ForceNode;
    const nodeId = String(forceNode.id ?? "");
    if (!nodeId) return;
    console.log({
      id: nodeId,
      label: forceNode.label ?? "",
      type: forceNode.type,
    });
    setActiveNodeId(nodeId);
  }, []);

  const handleNodeHover = useCallback((node: NodeObject | null) => {
    if (node) {
      const forceNode = node as ForceNode;
      const nodeId = String(forceNode.id ?? "");
      setHoveredNodeId(nodeId);
    } else {
      setHoveredNodeId(null);
    }
  }, []);

  const getNodeVisuals = useCallback((node: ForceNode) => {
    const brightness = Math.min(1, 0.3 + (node.review_count ?? 0) * 0.25);
    const sparkle = Math.max(
      0.6,
      Math.min(
        1,
        0.8 + 0.2 * Math.sin(Date.now() * 0.003 + (node.id.length || 1) * 0.1)
      )
    ); // 반짝임 효과 (0.6-1.0 범위로 제한)

    const coreAlpha = Math.max(0, Math.min(1, 0.95 * sparkle));
    const glowAlpha = Math.max(0, Math.min(1, 0.6 * sparkle));
    const highlightAlpha = Math.max(0, Math.min(1, 0.98 * sparkle));

    const coreColor =
      node.type === "word"
        ? `rgba(255,255,255,${coreAlpha})`
        : `rgba(177,156,217,${Math.max(
            0,
            Math.min(1, (0.8 + 0.2 * brightness) * sparkle)
          )})`;
    const glowColor =
      node.type === "word"
        ? `rgba(255,255,255,${glowAlpha})`
        : `rgba(177,156,217,${Math.max(
            0,
            Math.min(1, (0.6 + 0.3 * brightness) * sparkle)
          )})`;
    const highlightGlow =
      node.type === "word"
        ? `rgba(255,255,255,${highlightAlpha})`
        : `rgba(177,156,217,${Math.max(
            0,
            Math.min(1, (brightness + 0.5) * sparkle)
          )})`;
    const baseRadius = node.type === "word" ? 4 : 4;
    return { coreColor, glowColor, highlightGlow, baseRadius };
  }, []);

  const nodeCanvasObject = useCallback<
    NonNullable<ForceGraphProps<ForceNode, ForceLink>["nodeCanvasObject"]>
  >(
    (nodeObj, ctx, globalScale) => {
      const node = nodeObj as ForceNode & { x?: number; y?: number };
      if (typeof node.x !== "number" || typeof node.y !== "number") {
        return;
      }

      const { coreColor, glowColor, highlightGlow, baseRadius } =
        getNodeVisuals(node);

      const isHighlighted = highlightedNodeIds.has(String(node.id));
      const radius = baseRadius * (isHighlighted ? 1.35 : 1);
      const scaledRadius = radius / Math.sqrt(globalScale);

      // 외부 글로우 효과 (더 큰 반지름)
      const outerGlowRadius = scaledRadius * 2.5;
      const outerGradient = ctx.createRadialGradient(
        node.x,
        node.y,
        0,
        node.x,
        node.y,
        outerGlowRadius
      );
      outerGradient.addColorStop(0, glowColor);
      const fadedGlow = glowColor.replace(/,\s*[\d\.]+\)$/, ", 0.3)");
      outerGradient.addColorStop(0.3, fadedGlow);
      outerGradient.addColorStop(1, "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.fillStyle = outerGradient;
      ctx.arc(node.x, node.y, outerGlowRadius, 0, 2 * Math.PI, false);
      ctx.fill();

      // 메인 노드
      const gradient = ctx.createRadialGradient(
        node.x,
        node.y,
        0,
        node.x,
        node.y,
        scaledRadius
      );
      gradient.addColorStop(0, coreColor);
      gradient.addColorStop(0.4, isHighlighted ? highlightGlow : coreColor);
      gradient.addColorStop(0.8, isHighlighted ? highlightGlow : glowColor);
      gradient.addColorStop(1, glowColor);

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(node.x, node.y, scaledRadius, 0, 2 * Math.PI, false);
      ctx.fill();

      // 단어 노드는 확대 시 라벨 표시, 문장 노드는 hover 시에만 표시
      if (node.type === "word" && globalScale > 0.8 && node.label) {
        const fontSize = Math.max(3, Math.min(12, 5 / Math.sqrt(globalScale)));
        ctx.font = `${fontSize}px 'Inter', sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(255, 251, 244, 0.92)";
        ctx.fillText(
          node.label,
          node.x,
          node.y + scaledRadius + 2 / globalScale
        );
      }
    },
    [getNodeVisuals, highlightedNodeIds]
  );

  const nodePointerAreaPaint = useCallback<
    NonNullable<ForceGraphProps<ForceNode, ForceLink>["nodePointerAreaPaint"]>
  >((nodeObj, color, ctx) => {
    const node = nodeObj as ForceNode & { x?: number; y?: number };
    if (typeof node.x !== "number" || typeof node.y !== "number") {
      return;
    }

    const radius = (node.type === "word" ? 5 : 5) * 1.4;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fill();
  }, []);

  const linkColor = useCallback(
    (linkObj: LinkObject) => {
      const link = linkObj as ForceLink;
      const sparkle = Math.max(
        0.5,
        Math.min(
          1,
          0.7 + 0.3 * Math.sin(Date.now() * 0.002 + (link.id.length || 1) * 0.1)
        )
      );
      const highlightAlpha = Math.max(0, Math.min(1, 0.6 * sparkle));
      const normalAlpha = Math.max(0, Math.min(1, 0.15 * sparkle));

      return highlightedLinkIds.has(link.id)
        ? `rgba(255, 255, 255, ${highlightAlpha})`
        : `rgba(255,255,255,${normalAlpha})`;
    },
    [highlightedLinkIds]
  );

  const linkWidth = useCallback(
    (linkObj: LinkObject) => {
      const link = linkObj as ForceLink;
      return highlightedLinkIds.has(link.id) ? 1.8 : 0.6;
    },
    [highlightedLinkIds]
  );

  // 더 이상 필요하지 않음 - 뷰포트 기반 자동 로딩으로 대체

  if (error) {
    return (
      <section className="flex min-h-screen w-full flex-col items-center justify-center bg-black text-center text-[#f8e7c5]">
        <p className="text-lg">We lost sight of the stars.</p>
        <p className="text-sm text-[#d18fff]">{error}</p>
      </section>
    );
  }

  if (isFetching) {
    return (
      <section className="flex min-h-screen w-full flex-col items-center justify-center bg-transparent text-center text-[#f8e7c5]">
        <p className="text-lg tracking-wide">Spooling the night sky...</p>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col gap-6 bg-transparent px-1 pb-10 pt-1 text-[#f8e7c5]">
      <div className="overflow-hidden rounded-3xl border border-[#1f1f3d] bg-transparent shadow-2xl">
        <div className="relative h-[80vh] w-full">
          {ForceGraph2D ? (
            <ForceGraph2D
              ref={graphRef as any}
              graphData={graphData}
              nodeId="id"
              linkSource="source"
              linkTarget="target"
              backgroundColor="#000000"
              enableNodeDrag={false}
              // 🌌 vis-network forceAtlas2Based 세팅 재현
              cooldownTicks={100} // 100 ticks 후 자동으로 멈춤
              cooldownTime={6000}
              d3AlphaDecay={0.1} // 감쇠 속도
              d3VelocityDecay={0.9} // 마찰력 (0.9이면 금방 멈춤)
              nodeRelSize={6}
              minZoom={0.2}
              maxZoom={4}
              linkColor={linkColor}
              linkWidth={linkWidth}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={nodePointerAreaPaint}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#c8b9ff]">
              Igniting the starfield...
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 text-sm text-[#c8b9ff]">
        <p className="text-xs text-[#9b8fff] opacity-75">
          마우스로 드래그하여 이동하고 휠로 줌인/줌아웃할 수 있습니다
        </p>
      </div>
    </section>
  );
};

export default GraphView;
