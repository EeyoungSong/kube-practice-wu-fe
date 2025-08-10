"use client";

import React, { useCallback, useEffect, useState, memo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConstellationData {
  nodes: Node[];
  edges: Edge[];
}

interface WordNodeData {
  label: string;
  wordId: number;
  frequency?: number;
  meaning?: string; // 단어 뜻
  language?: "ko" | "en"; // 언어 구분
}

const edgeStyle = {
  stroke: "rgba(255,255,255,0.2)",
  strokeWidth: 1,
};

function nodeStyle(intensity: number = 1, language: "ko" | "en" = "ko") {
  const baseStyle = {
    borderRadius: "50%",
    width: 16,
    height: 16,
    border: "1px solid rgba(255,255,255,0.3)",
    opacity: Math.min(1, intensity / 2),
    boxShadow: `0 0 ${intensity * 10}px ${intensity * 2}px ${
      language === "en" ? "white" : "#fbbf24"
    }`,
  };

  // 영어는 하얀색, 한국어는 노란색 계열
  if (language === "en") {
    return {
      ...baseStyle,
      background: "white",
    };
  } else {
    return {
      ...baseStyle,
      background: "#fbbf24", // amber-400
    };
  }
}

// 커스텀 단어 노드 컴포넌트
const WordNode = memo(({ data, selected }: NodeProps<WordNodeData>) => {
  const hasTooltip = data.meaning && data.language === "en";

  const nodeContent = (
    <div
      className={`
        px-2 py-1 rounded-full text-xs font-medium cursor-pointer
        transition-all duration-200 hover:scale-110
        ${
          data.language === "en"
            ? "bg-white text-black border border-gray-300"
            : "bg-amber-400 text-black border border-amber-500"
        }
        ${selected ? "ring-2 ring-blue-400" : ""}
      `}
    >
      {data.label}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );

  if (hasTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-gray-900 text-white border-gray-700"
          >
            <p className="font-medium">{data.label}</p>
            <p className="text-sm text-gray-300">{data.meaning}</p>
            {data.frequency && (
              <p className="text-xs text-gray-400">빈도: {data.frequency}회</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return nodeContent;
});

WordNode.displayName = "WordNode";

// 노드 타입 정의
const nodeTypes = {
  wordNode: WordNode,
};

// 샘플 데이터 (영어 단어와 뜻 포함)
const sampleData: ConstellationData = {
  nodes: [
    {
      id: "1",
      position: { x: 250, y: 0 },
      data: {
        label: "love",
        wordId: 1,
        frequency: 10,
        meaning: "사랑, 애정",
        language: "en" as const,
      },
      type: "wordNode",
    },
    {
      id: "2",
      position: { x: 100, y: 150 },
      data: {
        label: "emotion",
        wordId: 2,
        frequency: 8,
        meaning: "감정, 정서",
        language: "en" as const,
      },
      type: "wordNode",
    },
    {
      id: "3",
      position: { x: 400, y: 150 },
      data: {
        label: "사랑",
        wordId: 3,
        frequency: 6,
        language: "ko" as const,
      },
      type: "wordNode",
    },
    {
      id: "4",
      position: { x: 250, y: 300 },
      data: {
        label: "happiness",
        wordId: 4,
        frequency: 7,
        meaning: "행복, 기쁨",
        language: "en" as const,
      },
      type: "wordNode",
    },
    {
      id: "5",
      position: { x: 50, y: 300 },
      data: {
        label: "감정",
        wordId: 5,
        frequency: 5,
        language: "ko" as const,
      },
      type: "wordNode",
    },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2", style: edgeStyle },
    { id: "e1-3", source: "1", target: "3", style: edgeStyle },
    { id: "e2-4", source: "2", target: "4", style: edgeStyle },
    { id: "e2-5", source: "2", target: "5", style: edgeStyle },
    { id: "e3-5", source: "3", target: "5", style: edgeStyle },
  ],
};

async function fetchConstellationData(
  useAutoLayout: boolean = true
): Promise<ConstellationData> {
  try {
    const response = await fetch(
      `/api/constellation?limit=50&minWeight=2&autoLayout=${useAutoLayout}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch constellation data");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching constellation data:", error);
    // 개발 중에는 샘플 데이터 사용 (API가 없을 경우)
    if (process.env.NODE_ENV === "development") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return sampleData;
    }
    throw error;
  }
}

export default function ConstellationPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useAutoLayout, setUseAutoLayout] = useState(true);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, style: edgeStyle }, eds)),
    [setEdges]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchConstellationData(useAutoLayout);
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "데이터를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [setNodes, setEdges, useAutoLayout]);

  if (isLoading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "radial-gradient(ellipse at center, #111 0%, #000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Card className="p-6 bg-gray-900 border-gray-700">
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="h-4 w-32 bg-gray-700" />
            <Skeleton className="h-4 w-48 bg-gray-700" />
            <Skeleton className="h-4 w-24 bg-gray-700" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "radial-gradient(ellipse at center, #111 0%, #000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Alert className="max-w-md bg-red-900 border-red-700">
          <AlertDescription className="text-red-100">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(ellipse at center, #111 0%, #000 100%)",
      }}
    >
      {/* 레이아웃 토글 버튼 */}
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => setUseAutoLayout(!useAutoLayout)}
          variant="outline"
          size="sm"
          className="bg-gray-900/80 text-white border-gray-600 hover:bg-gray-800"
        >
          {useAutoLayout ? "자동 레이아웃" : "원형 레이아웃"}
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="word-constellation"
      >
        <Background color="#222" gap={16} size={1} />
        <MiniMap style={{ background: "#111" }} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
