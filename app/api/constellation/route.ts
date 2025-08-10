import { NextRequest } from "next/server";

interface ConstellationData {
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
    data: {
      label: string;
      wordId: number;
      frequency?: number;
      meaning?: string; // 영어 단어의 뜻
      language?: "ko" | "en"; // 언어 구분
    };
    type: string;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    style: Record<string, any>;
    data?: {
      weight?: number;
    };
  }>;
}

interface WordConnection {
  word1_id: number;
  word1: string;
  word2_id: number;
  word2: string;
  connection_weight: number;
}

interface WordFrequency {
  word_id: number;
  word: string;
  frequency: number;
  meaning?: string; // 영어 단어의 뜻
  language: "ko" | "en"; // 언어 구분
}

const edgeStyle = {
  stroke: "rgba(255,255,255,0.2)",
  strokeWidth: 1,
};

// 언어 감지 함수
function detectLanguage(word: string): "ko" | "en" {
  // 한글이 포함되어 있으면 한국어, 아니면 영어로 판단
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  return koreanRegex.test(word) ? "ko" : "en";
}

function calculateNodePosition(
  index: number,
  total: number
): { x: number; y: number } {
  // 원형으로 배치
  const radius = Math.min(300, total * 20);
  const angle = (index / total) * 2 * Math.PI;

  return {
    x: 400 + radius * Math.cos(angle),
    y: 300 + radius * Math.sin(angle),
  };
}

function createNodes(
  wordFrequencies: WordFrequency[],
  useAutoLayout: boolean = true
) {
  return wordFrequencies.map((word, index) => {
    const node: any = {
      id: word.word_id.toString(),
      data: {
        label: word.word,
        wordId: word.word_id,
        frequency: word.frequency,
        meaning: word.meaning,
        language: word.language,
      },
      type: "wordNode",
      // ReactFlow는 position이 항상 필요하므로 기본값 제공
      position: useAutoLayout
        ? { x: Math.random() * 800, y: Math.random() * 600 } // 자동 레이아웃용 임시 위치
        : calculateNodePosition(index, wordFrequencies.length),
    };

    return node;
  });
}

function createEdges(connections: WordConnection[]) {
  return connections.map((conn) => ({
    id: `e${conn.word1_id}-${conn.word2_id}`,
    source: conn.word1_id.toString(),
    target: conn.word2_id.toString(),
    style: {
      ...edgeStyle,
      strokeWidth: Math.min(5, conn.connection_weight / 2), // 연결 강도에 따라 두께 조절
    },
    data: {
      weight: conn.connection_weight,
    },
  }));
}

// 임시 샘플 데이터 (언어 구분과 뜻 포함)
const mockWordFrequencies: WordFrequency[] = [
  {
    word_id: 1,
    word: "love",
    frequency: 10,
    meaning: "사랑, 애정",
    language: "en",
  },
  {
    word_id: 2,
    word: "emotion",
    frequency: 8,
    meaning: "감정, 정서",
    language: "en",
  },
  {
    word_id: 3,
    word: "happiness",
    frequency: 7,
    meaning: "행복, 기쁨",
    language: "en",
  },
  {
    word_id: 4,
    word: "freedom",
    frequency: 6,
    meaning: "자유",
    language: "en",
  },
  {
    word_id: 5,
    word: "beautiful",
    frequency: 9,
    meaning: "아름다운",
    language: "en",
  },
  {
    word_id: 6,
    word: "사랑",
    frequency: 12,
    language: "ko",
  },
  {
    word_id: 7,
    word: "감정",
    frequency: 8,
    language: "ko",
  },
  {
    word_id: 8,
    word: "행복",
    frequency: 10,
    language: "ko",
  },
  {
    word_id: 9,
    word: "자유",
    frequency: 7,
    language: "ko",
  },
  {
    word_id: 10,
    word: "아름다움",
    frequency: 6,
    language: "ko",
  },
];

const mockWordConnections: WordConnection[] = [
  {
    word1_id: 1,
    word1: "love",
    word2_id: 6,
    word2: "사랑",
    connection_weight: 8,
  }, // love - 사랑
  {
    word1_id: 2,
    word1: "emotion",
    word2_id: 7,
    word2: "감정",
    connection_weight: 7,
  }, // emotion - 감정
  {
    word1_id: 3,
    word1: "happiness",
    word2_id: 8,
    word2: "행복",
    connection_weight: 9,
  }, // happiness - 행복
  {
    word1_id: 4,
    word1: "freedom",
    word2_id: 9,
    word2: "자유",
    connection_weight: 6,
  }, // freedom - 자유
  {
    word1_id: 5,
    word1: "beautiful",
    word2_id: 10,
    word2: "아름다움",
    connection_weight: 5,
  }, // beautiful - 아름다움
  {
    word1_id: 1,
    word1: "love",
    word2_id: 2,
    word2: "emotion",
    connection_weight: 6,
  }, // love - emotion
  {
    word1_id: 1,
    word1: "love",
    word2_id: 3,
    word2: "happiness",
    connection_weight: 7,
  }, // love - happiness
  {
    word1_id: 6,
    word1: "사랑",
    word2_id: 7,
    word2: "감정",
    connection_weight: 5,
  }, // 사랑 - 감정
  {
    word1_id: 6,
    word1: "사랑",
    word2_id: 8,
    word2: "행복",
    connection_weight: 8,
  }, // 사랑 - 행복
  {
    word1_id: 8,
    word1: "행복",
    word2_id: 9,
    word2: "자유",
    connection_weight: 4,
  }, // 행복 - 자유
];

async function generateConstellationData(options: {
  limit: number;
  minWeight: number;
  useAutoLayout?: boolean;
}): Promise<ConstellationData> {
  try {
    // TODO: 실제 DB 쿼리로 교체
    // const wordConnections = await db.query(`
    //   WITH word_connections AS (
    //     SELECT
    //       w1.id as word1_id,
    //       w1.word as word1,
    //       w2.id as word2_id,
    //       w2.word as word2,
    //       COUNT(*) as connection_weight
    //     FROM word_sentence ws1
    //     JOIN word_sentence ws2 ON ws1.sentence_id = ws2.sentence_id
    //       AND ws1.word_id < ws2.word_id
    //     JOIN word w1 ON ws1.word_id = w1.id
    //     JOIN word w2 ON ws2.word_id = w2.id
    //     GROUP BY w1.id, w1.word, w2.id, w2.word
    //     HAVING COUNT(*) >= $1
    //     ORDER BY connection_weight DESC
    //     LIMIT $2
    //   )
    //   SELECT * FROM word_connections
    // `, [options.minWeight, options.limit]);

    // const wordFrequencies = await db.query(`
    //   SELECT
    //     w.id as word_id,
    //     w.word,
    //     w.meaning, -- 영어 단어의 뜻
    //     COUNT(ws.sentence_id) as frequency
    //   FROM word w
    //   JOIN word_sentence ws ON w.id = ws.word_id
    //   WHERE w.id IN (
    //     SELECT DISTINCT word1_id FROM word_connections
    //     UNION
    //     SELECT DISTINCT word2_id FROM word_connections
    //   )
    //   GROUP BY w.id, w.word, w.meaning
    // `);

    // 필터링된 연결 관계
    const filteredConnections = mockWordConnections
      .filter((conn) => conn.connection_weight >= options.minWeight)
      .slice(0, options.limit);

    // 연결된 단어들의 빈도수
    const connectedWordIds = new Set([
      ...filteredConnections.map((c) => c.word1_id),
      ...filteredConnections.map((c) => c.word2_id),
    ]);

    const filteredWordFreqs = mockWordFrequencies.filter((word) =>
      connectedWordIds.has(word.word_id)
    );

    const nodes = createNodes(filteredWordFreqs, options.useAutoLayout ?? true);
    const edges = createEdges(filteredConnections);

    return { nodes, edges };
  } catch (error) {
    console.error("Error generating constellation data:", error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const minWeight = parseInt(searchParams.get("minWeight") || "2");
    const useAutoLayout = searchParams.get("autoLayout") !== "false"; // 기본값은 true

    const constellationData = await generateConstellationData({
      limit,
      minWeight,
      useAutoLayout,
    });

    return Response.json(constellationData);
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "데이터를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
