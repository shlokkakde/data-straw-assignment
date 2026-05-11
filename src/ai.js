const POSITIVE_WORDS = new Set([
  "advance",
  "benefit",
  "boost",
  "breakthrough",
  "confident",
  "effective",
  "gain",
  "growth",
  "improve",
  "innovation",
  "launch",
  "leading",
  "opportunity",
  "positive",
  "profit",
  "progress",
  "record",
  "resilient",
  "strong",
  "success",
  "surge",
  "win"
]);

const NEGATIVE_WORDS = new Set([
  "attack",
  "concern",
  "crisis",
  "decline",
  "delay",
  "drop",
  "fall",
  "fear",
  "fraud",
  "loss",
  "negative",
  "probe",
  "risk",
  "slowdown",
  "slump",
  "threat",
  "uncertain",
  "warning",
  "weak"
]);

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "amid",
  "because",
  "been",
  "being",
  "between",
  "could",
  "from",
  "have",
  "into",
  "more",
  "over",
  "said",
  "says",
  "than",
  "that",
  "their",
  "there",
  "these",
  "this",
  "through",
  "under",
  "were",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would"
]);

function articleText(article) {
  return [article.title, article.description, article.content]
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function topKeywords(text, limit = 6) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function summarize(text) {
  const sentences = splitSentences(text);
  if (!sentences.length) {
    return text.slice(0, 260);
  }

  const keywords = new Set(topKeywords(text, 10));
  const scored = sentences.map((sentence, index) => {
    const score =
      tokenize(sentence).filter((word) => keywords.has(word)).length +
      (index === 0 ? 2 : 0) -
      Math.max(0, sentence.length - 240) / 120;
    return { sentence, score, index };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ")
    .slice(0, 420);
}

function sentimentFor(text) {
  let score = 0;
  for (const word of tokenize(text)) {
    if (POSITIVE_WORDS.has(word)) score += 1;
    if (NEGATIVE_WORDS.has(word)) score -= 1;
  }

  const normalized = Math.max(-1, Math.min(1, score / 6));
  if (normalized > 0.12) return { sentiment: "positive", sentimentScore: normalized };
  if (normalized < -0.12) return { sentiment: "negative", sentimentScore: normalized };
  return { sentiment: "neutral", sentimentScore: normalized };
}

function buildInsights(article, summary, keywords) {
  const insights = [];
  const source = article.sourceName || "the source";
  const categories = Array.isArray(article.categories) ? article.categories : [];

  if (keywords.length) {
    insights.push(`Primary themes: ${keywords.slice(0, 4).join(", ")}.`);
  }

  if (categories.length) {
    insights.push(`Category signal: ${categories.slice(0, 3).join(", ")} coverage from ${source}.`);
  } else {
    insights.push(`Source signal: coverage from ${source} centers on the reported development.`);
  }

  if (article.publishedAt) {
    insights.push(`Timing: published ${new Date(article.publishedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    })}.`);
  }

  if (summary) {
    insights.push(`Actionable takeaway: monitor follow-up coverage for impact on ${keywords[0] || "the topic"}.`);
  }

  insights.push("Review the original article before making operational or investment decisions.");

  return insights.slice(0, 5);
}

export function localAnalyzeArticle(article) {
  const text = articleText(article);
  const summary = summarize(text);
  const keywords = topKeywords(text);
  const sentiment = sentimentFor(text);

  return {
    summary,
    sentiment: sentiment.sentiment,
    sentimentScore: Number(sentiment.sentimentScore.toFixed(3)),
    insights: buildInsights(article, summary, keywords),
    model: "local:nlp-v1"
  };
}

function extractJson(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI response did not contain JSON.");
  }
  return JSON.parse(match[0]);
}

function validateInsight(payload, fallback) {
  const sentiment = ["positive", "negative", "neutral"].includes(payload.sentiment)
    ? payload.sentiment
    : fallback.sentiment;

  const insights = Array.isArray(payload.insights)
    ? payload.insights.map(String).filter(Boolean).slice(0, 5)
    : fallback.insights;

  return {
    summary: String(payload.summary || fallback.summary).slice(0, 500),
    sentiment,
    sentimentScore: Number.isFinite(Number(payload.sentimentScore))
      ? Math.max(-1, Math.min(1, Number(payload.sentimentScore)))
      : fallback.sentimentScore,
    insights: insights.length >= 3 ? insights : fallback.insights,
    model: fallback.model
  };
}

export async function openAiAnalyzeArticle(article, config) {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
  }

  const fallback = localAnalyzeArticle(article);
  const baseUrl = config.openAiBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.openAiApiKey}`,
      "content-type": "application/json"
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: config.openAiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You analyze news articles. Return compact, factual JSON only with keys: summary, sentiment, sentimentScore, insights. Sentiment must be positive, negative, or neutral. sentimentScore must be between -1 and 1. insights must contain 3 to 5 short actionable strings."
        },
        {
          role: "user",
          content: JSON.stringify({
            title: article.title,
            source: article.sourceName,
            publishedAt: article.publishedAt,
            description: article.description,
            content: article.content?.slice(0, 5000),
            categories: article.categories,
            keywords: article.keywords
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI-compatible analysis failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);
  return validateInsight(parsed, { ...fallback, model: `openai:${config.openAiModel}` });
}

export async function analyzeArticle(article, config) {
  if (config.provider === "openai") {
    try {
      return await openAiAnalyzeArticle(article, config);
    } catch (error) {
      if (!config.fallbackToLocal) throw error;
      const local = localAnalyzeArticle(article);
      return {
        ...local,
        insights: [
          ...local.insights.slice(0, 4),
          `OpenAI-compatible analysis fell back locally: ${error.message.slice(0, 120)}`
        ]
      };
    }
  }

  return localAnalyzeArticle(article);
}
