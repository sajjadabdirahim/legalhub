import { useMemo } from "react";
import { useMode } from "@/contexts/ModeContext";
import {
  ScrollText, Info, Tag, Brain, BarChart3, ArrowRight,
  Scale, FileText, Hash, Sparkles, TrendingUp, AlertCircle,
  ThumbsUp, ThumbsDown, Activity
} from "lucide-react";
import { ChatMessageData, MessageFeedback } from "./ChatMessage";
import { cn } from "@/lib/utils";

// ── NLP helpers (mock extraction, simulating real NLP pipeline outputs) ──

interface NLPAnalysis {
  entities: { text: string; type: "statute" | "section" | "penalty" | "organization" | "duration" | "amount" }[];
  topics: string[];
  sentiment: { label: string; score: number; color: string };
  relatedQueries: { label: string; query: string }[];
  relatedStatutes: { title: string; relevance: number }[];
  keywords: string[];
}

function extractEntities(text: string) {
  const entities: NLPAnalysis["entities"] = [];
  const statutePatterns = [
    /(?:the\s+)?([\w\s]+Act(?:,\s*(?:Cap\.\s*\d+|No\.\s*\d+))?(?:,\s*\d{4})?)/gi,
  ];
  const sectionPatterns = [/(?:Section|Sec\.?)\s+\d+(?:\(\d+\))?/gi];
  const penaltyPatterns = [/(?:fine|imprisonment|penalty)[\w\s]*?(?:KES\s*[\d,]+|[\d,]+\s*shillings|\d+\s*(?:months?|years?))/gi];
  const amountPatterns = [/KES\s*[\d,]+|[\d,]+\s*shillings/gi];
  const durationPatterns = [/\d+\s*(?:days?|months?|years?)/gi];
  const orgPatterns = [/NTSA|Kenya\s*Law|Parliament|National\s*Assembly/gi];

  for (const p of statutePatterns) {
    for (const m of text.matchAll(p)) entities.push({ text: m[0].trim(), type: "statute" });
  }
  for (const p of sectionPatterns) {
    for (const m of text.matchAll(p)) entities.push({ text: m[0], type: "section" });
  }
  for (const p of penaltyPatterns) {
    for (const m of text.matchAll(p)) entities.push({ text: m[0].trim(), type: "penalty" });
  }
  for (const p of amountPatterns) {
    for (const m of text.matchAll(p)) entities.push({ text: m[0], type: "amount" });
  }
  for (const p of durationPatterns) {
    for (const m of text.matchAll(p)) entities.push({ text: m[0], type: "duration" });
  }
  for (const p of orgPatterns) {
    for (const m of text.matchAll(p)) entities.push({ text: m[0], type: "organization" });
  }

  // Deduplicate
  const seen = new Set<string>();
  return entities.filter((e) => {
    const key = e.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractTopics(text: string, citation?: string): string[] {
  const topics: string[] = [];
  const lower = text.toLowerCase() + " " + (citation || "").toLowerCase();

  const topicMap: Record<string, string[]> = {
    "Traffic & Transport": ["traffic", "driving", "licence", "motor vehicle", "road", "ntsa"],
    "Criminal Law": ["offence", "guilty", "imprisonment", "criminal", "penalty", "convicted"],
    "Employment & Labour": ["employment", "employer", "employee", "termination", "notice period", "severance"],
    "Land & Property": ["land", "property", "title deed", "registration", "ownership"],
    "Constitutional Rights": ["constitution", "fundamental", "rights", "freedom", "bill of rights"],
    "Business & Commercial": ["company", "business", "registration", "director", "shareholders"],
    "Family Law": ["marriage", "divorce", "custody", "children", "succession"],
    "Financial Penalties": ["fine", "shillings", "kes", "compensation", "damages"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some((kw) => lower.includes(kw))) topics.push(topic);
  }
  return topics.length > 0 ? topics : ["General Legal"];
}

function analyzeSentiment(text: string): NLPAnalysis["sentiment"] {
  const lower = text.toLowerCase();
  const negative = ["offence", "guilty", "imprisonment", "penalty", "fine", "liable", "prohibited", "unlawful"];
  const positive = ["entitled", "right", "protection", "benefit", "compensation", "permitted", "authorized"];
  const neutral = ["shall", "may", "provision", "section", "act"];

  const negCount = negative.filter((w) => lower.includes(w)).length;
  const posCount = positive.filter((w) => lower.includes(w)).length;

  if (negCount > posCount + 1) return { label: "Restrictive / Punitive", score: 0.2, color: "text-destructive" };
  if (posCount > negCount + 1) return { label: "Protective / Enabling", score: 0.8, color: "text-accent" };
  return { label: "Neutral / Informational", score: 0.5, color: "text-muted-foreground" };
}

function generateRelatedQueries(topics: string[], citation?: string): NLPAnalysis["relatedQueries"] {
  const queries: NLPAnalysis["relatedQueries"] = [];
  const citationLower = (citation || "").toLowerCase();

  if (topics.includes("Traffic & Transport")) {
    queries.push(
      { label: "Penalties for drunk driving", query: "What are the penalties for drunk driving in Kenya?" },
      { label: "Road accident liability", query: "Who is liable in a road accident in Kenya?" },
      { label: "Vehicle insurance requirements", query: "What insurance is required for vehicles in Kenya?" },
    );
  }
  if (topics.includes("Employment & Labour")) {
    queries.push(
      { label: "Unfair dismissal remedies", query: "What remedies exist for unfair dismissal in Kenya?" },
      { label: "Minimum wage regulations", query: "What is the minimum wage in Kenya?" },
      { label: "Leave entitlements", query: "What leave entitlements do Kenyan employees have?" },
    );
  }
  if (topics.includes("Criminal Law")) {
    queries.push(
      { label: "Bail and bond conditions", query: "How does bail and bond work in Kenya?" },
      { label: "Appeal process", query: "How do you appeal a criminal conviction in Kenya?" },
    );
  }
  if (topics.includes("Financial Penalties")) {
    queries.push(
      { label: "How fines are determined", query: "How are fines determined in Kenyan courts?" },
      { label: "Payment of court fines", query: "How do you pay court fines in Kenya?" },
    );
  }
  if (topics.includes("Land & Property")) {
    queries.push(
      { label: "Land title transfer process", query: "How do you transfer land title in Kenya?" },
      { label: "Land disputes resolution", query: "How are land disputes resolved in Kenya?" },
    );
  }

  // Add a generic related query based on citation
  if (citationLower.includes("cap.")) {
    const capMatch = citation?.match(/Cap\.\s*\d+/i);
    if (capMatch) {
      queries.push({ label: `More from ${capMatch[0]}`, query: `What other provisions are in ${capMatch[0]}?` });
    }
  }

  return queries.slice(0, 4);
}

function findRelatedStatutes(topics: string[], currentCitation?: string): NLPAnalysis["relatedStatutes"] {
  const all: Record<string, { title: string; topics: string[] }> = {
    "constitution": { title: "Constitution of Kenya, 2010", topics: ["Constitutional Rights"] },
    "traffic": { title: "Traffic Act, Cap. 403", topics: ["Traffic & Transport"] },
    "ntsa": { title: "NTSA Act, No. 33 of 2012", topics: ["Traffic & Transport"] },
    "employment": { title: "Employment Act, 2007", topics: ["Employment & Labour"] },
    "labour_relations": { title: "Labour Relations Act, 2007", topics: ["Employment & Labour"] },
    "land_reg": { title: "Land Registration Act, 2012", topics: ["Land & Property"] },
    "land": { title: "Land Act, 2012", topics: ["Land & Property"] },
    "companies": { title: "Companies Act, 2015", topics: ["Business & Commercial"] },
    "penal": { title: "Penal Code, Cap. 63", topics: ["Criminal Law"] },
    "cpc": { title: "Criminal Procedure Code, Cap. 75", topics: ["Criminal Law"] },
    "marriage": { title: "Marriage Act, 2014", topics: ["Family Law"] },
    "succession": { title: "Law of Succession Act, Cap. 160", topics: ["Family Law"] },
  };

  return Object.values(all)
    .filter((s) => {
      if (currentCitation && s.title.toLowerCase().includes(currentCitation.split(",")[0].toLowerCase())) return false;
      return s.topics.some((t) => topics.includes(t));
    })
    .map((s) => ({
      title: s.title,
      relevance: s.topics.filter((t) => topics.includes(t)).length,
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 4);
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "shall", "should", "may", "might", "can", "could", "would", "of", "in", "to", "for", "with", "on", "at", "from", "by", "or", "and", "not", "no", "any", "who", "that", "this", "it", "as", "if", "than", "but", "its", "his", "her", "their", "him", "them", "such", "under", "which", "he", "she", "they", "we", "you", "your", "our", "all", "more", "other", "up", "out", "so", "about"]);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

function analyzeMessage(msg: ChatMessageData | null | undefined): NLPAnalysis | null {
  if (!msg || (!msg.citation && !msg.originalLegalText)) return null;
  const fullText = [msg.content, msg.originalLegalText || "", msg.citation || ""].join(" ");

  const entities = extractEntities(fullText);
  const topics = extractTopics(fullText, msg.citation);
  const sentiment = analyzeSentiment(fullText);
  const relatedQueries = generateRelatedQueries(topics, msg.citation);
  const relatedStatutes = findRelatedStatutes(topics, msg.citation);
  const keywords = extractKeywords(fullText);

  return { entities, topics, sentiment, relatedQueries, relatedStatutes, keywords };
}

// ── Entity type styling ──

const ENTITY_STYLES: Record<string, string> = {
  statute: "bg-accent/10 text-accent border-accent/20",
  section: "bg-primary/10 text-primary border-primary/20",
  penalty: "bg-destructive/10 text-destructive border-destructive/20",
  amount: "bg-warning/10 text-warning-foreground border-warning/20",
  duration: "bg-secondary text-secondary-foreground border-border",
  organization: "bg-accent/10 text-accent border-accent/20",
};

// ── Component ──

interface LegalResourcesPanelProps {
  onTopicClick?: (query: string) => void;
  latestAiMessage?: ChatMessageData | null;
  feedbacks?: Record<string, MessageFeedback>;
}

export function LegalResourcesPanel({ onTopicClick, latestAiMessage, feedbacks = {} }: LegalResourcesPanelProps) {
  const { isProfessional } = useMode();
  const analysis = useMemo(() => analyzeMessage(latestAiMessage), [latestAiMessage]);

  // Compute RLHF metrics
  const rlhfMetrics = useMemo(() => {
    const entries = Object.values(feedbacks);
    const positive = entries.filter((f) => f.type === "positive").length;
    const negative = entries.filter((f) => f.type === "negative").length;
    const total = positive + negative;
    const withComments = entries.filter((f) => f.comment).length;
    return { positive, negative, total, withComments };
  }, [feedbacks]);

  if (!isProfessional) return null;

  const hasContext = !!analysis;

  return (
    <div className="h-full flex flex-col gap-4 p-4 sm:p-5 overflow-y-auto animate-fade-in">
      {hasContext && analysis ? (
        <>
          {/* ── Source Citation ── */}
          {latestAiMessage?.citation && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ScrollText className="h-3.5 w-3.5" /> Source Citation
              </p>
              <p className="text-sm font-medium text-foreground leading-relaxed">{latestAiMessage.citation}</p>
            </div>
          )}

          {/* ── NLP: Topic Modeling ── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Topic Classification
            </p>
            <div className="flex flex-wrap gap-2">
              {analysis.topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-full border border-accent/15"
                >
                  <Tag className="h-2.5 w-2.5" /> {topic}
                </span>
              ))}
            </div>
          </div>


          {/* ── Original Statute ── */}
          {latestAiMessage?.originalLegalText && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Original Statute Text
              </p>
              <p className="text-sm text-foreground leading-relaxed font-serif-legal">{latestAiMessage.originalLegalText}</p>
            </div>
          )}

          {/* ── Knowledge Graph ── */}
          {analysis.entities.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Knowledge Graph
              </p>
              <div className="relative w-full overflow-hidden">
                <svg viewBox="0 0 100 62.5" className="w-full h-auto max-h-[250px] sm:max-h-[300px]" preserveAspectRatio="xMidYMid meet" aria-label="Knowledge graph visualization">
                  {(() => {
                    const cx = 50, cy = 31.25;
                    const nodes: { id: string; label: string; type: string; x: number; y: number }[] = [];
                    const edges: { from: number; to: number }[] = [];
                    const mainTopic = analysis.topics[0] || "Legal Query";
                    nodes.push({ id: "center", label: mainTopic, type: "topic", x: cx, y: cy });
                    analysis.topics.slice(0, 4).forEach((t, i) => {
                      const angle = (i / Math.min(analysis.topics.length, 4)) * Math.PI * 2 - Math.PI / 2;
                      nodes.push({ id: `topic-${i}`, label: t, type: "topic", x: cx + Math.cos(angle) * 17, y: cy + Math.sin(angle) * 14 });
                      edges.push({ from: 0, to: nodes.length - 1 });
                    });
                    const uniqueEntities = analysis.entities.slice(0, 6);
                    uniqueEntities.forEach((e, i) => {
                      const angle = (i / uniqueEntities.length) * Math.PI * 2 - Math.PI / 4;
                      nodes.push({ id: `ent-${i}`, label: e.text.length > 18 ? e.text.slice(0, 16) + "…" : e.text, type: e.type, x: cx + Math.cos(angle) * 28, y: cy + Math.sin(angle) * 23 });
                      const topicIdx = (i % Math.max(analysis.topics.slice(0, 4).length, 1)) + 1;
                      if (topicIdx < nodes.length) edges.push({ from: topicIdx, to: nodes.length - 1 });
                    });
                    analysis.relatedStatutes.slice(0, 3).forEach((s, i) => {
                      const angle = Math.PI + (i / 3) * Math.PI - Math.PI / 3;
                      nodes.push({ id: `stat-${i}`, label: s.title.length > 20 ? s.title.slice(0, 18) + "…" : s.title, type: "statute", x: cx + Math.cos(angle) * 26, y: cy + Math.sin(angle) * 22 });
                      edges.push({ from: 0, to: nodes.length - 1 });
                    });
                    const nodeColors: Record<string, string> = {
                      topic: "hsl(var(--accent))", statute: "hsl(var(--primary))", section: "hsl(var(--primary))",
                      penalty: "hsl(var(--destructive))", amount: "hsl(var(--accent))", duration: "hsl(var(--muted-foreground))", organization: "hsl(var(--accent))",
                    };
                    return (
                      <>
                        {edges.map((edge, i) => (
                          <line key={`edge-${i}`} x1={nodes[edge.from]?.x} y1={nodes[edge.from]?.y} x2={nodes[edge.to]?.x} y2={nodes[edge.to]?.y} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.6" />
                        ))}
                        {nodes.map((node, i) => (
                          <g key={node.id}>
                            <circle cx={node.x} cy={node.y} r={i === 0 ? 3 : 2} fill={nodeColors[node.type] || "hsl(var(--accent))"} opacity={i === 0 ? 1 : 0.7} />
                            <text x={node.x} y={node.y + (i === 0 ? 5.5 : 4.5)} textAnchor="middle" className="fill-foreground" fontSize={i === 0 ? "2.5" : "1.8"} fontWeight={i === 0 ? "600" : "400"}>{node.label}</text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> Topics</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Statutes</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Penalties</span>
              </div>
            </div>
          )}

          <div className="h-px bg-border" />

          {/* ── Related Statutes ── */}
          {analysis.relatedStatutes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" /> Related Statutes
              </p>
              <div className="space-y-1.5">
                {analysis.relatedStatutes.map((s) => (
                  <div
                    key={s.title}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            i < s.relevance ? "bg-accent" : "bg-border"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Related Queries (dynamic, based on detected topics) ── */}
          {analysis.relatedQueries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Related Questions
              </p>
              <div className="space-y-1.5">
                {analysis.relatedQueries.map((rq) => (
                  <button
                    key={rq.label}
                    onClick={() => onTopicClick?.(rq.query)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-card text-left text-sm font-medium text-foreground hover:bg-secondary hover:border-accent/30 transition-colors group"
                  >
                    <ArrowRight className="h-3 w-3 text-accent shrink-0" aria-hidden="true" />
                    <span className="flex-1">{rq.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── RLHF Feedback Metrics ── */}
          {rlhfMetrics.total > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Feedback Summary
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-accent/5 border border-accent/15 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ThumbsUp className="h-3 w-3 text-accent" />
                    <span className="text-lg font-bold text-accent">{rlhfMetrics.positive}</span>
                  </div>
                   <p className="text-xs text-muted-foreground">Helpful</p>
                </div>
                <div className="rounded-lg bg-destructive/5 border border-destructive/15 p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <ThumbsDown className="h-3 w-3 text-destructive" />
                    <span className="text-lg font-bold text-destructive">{rlhfMetrics.negative}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Needs Improvement</p>
                </div>
              </div>
              {/* Approval rate bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Approval Rate</span>
                  <span className="font-medium text-foreground">
                    {rlhfMetrics.total > 0 ? Math.round((rlhfMetrics.positive / rlhfMetrics.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden flex">
                  {rlhfMetrics.positive > 0 && (
                    <div
                      className="h-full bg-accent rounded-l-full"
                      style={{ width: `${(rlhfMetrics.positive / rlhfMetrics.total) * 100}%` }}
                    />
                  )}
                  {rlhfMetrics.negative > 0 && (
                    <div
                      className="h-full bg-destructive rounded-r-full"
                      style={{ width: `${(rlhfMetrics.negative / rlhfMetrics.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              {rlhfMetrics.withComments > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {rlhfMetrics.withComments} response{rlhfMetrics.withComments > 1 ? "s" : ""} with detailed feedback
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        /* ── Empty state before any query ── */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-accent" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Legal Insights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
            Ask a legal question to see topic analysis, entity extraction, sentiment analysis, and related statutes here.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-auto rounded-xl bg-accent/5 border border-accent/15 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Professional Mode:</strong> AI-generated analysis. Verify with{" "}
            <a href="http://kenyalaw.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              kenyalaw.org
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
