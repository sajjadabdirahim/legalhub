import { useState, useCallback } from "react";
import { useMode } from "@/contexts/ModeContext";
import { ChevronDown, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedbackType = "positive" | "negative" | null;

export interface MessageFeedback {
  messageId: string;
  type: FeedbackType;
  comment?: string;
  timestamp: number;
}

export interface ChatMessageData {
  id: string;
  role: "user" | "ai";
  content: string;
  originalLegalText?: string;
  citation?: string;
}

interface ChatMessageProps {
  message: ChatMessageData;
  feedback?: MessageFeedback | null;
  onFeedback?: (messageId: string, type: FeedbackType, comment?: string) => void;
}

export function ChatMessage({ message, feedback, onFeedback }: ChatMessageProps) {
  const { isCitizen } = useMode();
  const [showOriginal, setShowOriginal] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState("");

  const handleFeedback = useCallback((type: FeedbackType) => {
    if (feedback?.type === type) {
      // Toggle off
      onFeedback?.(message.id, null);
      setShowFeedbackForm(false);
    } else {
      onFeedback?.(message.id, type);
      if (type === "negative") {
        setShowFeedbackForm(true);
      } else {
        setShowFeedbackForm(false);
      }
    }
  }, [feedback, message.id, onFeedback]);

  const submitComment = useCallback(() => {
    if (feedbackComment.trim()) {
      onFeedback?.(message.id, feedback?.type || "negative", feedbackComment.trim());
      setFeedbackComment("");
      setShowFeedbackForm(false);
    }
  }, [feedbackComment, feedback, message.id, onFeedback]);

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent/10 text-primary px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const isWelcome = message.id === "welcome";

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="max-w-[85%] rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
        {/* Mode badge */}
        {isCitizen && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            AI-Simplified
          </span>
        )}

        {/* Content */}
        <div
          className={cn(
            "text-sm leading-relaxed transition-crossfade",
            !isCitizen && "font-serif-legal"
          )}
        >
          {isCitizen ? message.content : (message.originalLegalText || message.content)}
        </div>

        {/* Citizen mode accordion */}
        {isCitizen && message.originalLegalText && (
          <div className="pt-2">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded={showOriginal}
              aria-controls={`original-${message.id}`}
            >
              <span aria-hidden="true">⚖️</span>
              View Original Legal Text
              <ChevronDown
                className={cn("h-3 w-3 transition-mode", showOriginal && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            <div
              id={`original-${message.id}`}
              className={cn(
                "overflow-hidden transition-mode",
                showOriginal ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
              )}
            >
              <div className="text-xs leading-relaxed text-muted-foreground bg-secondary/60 rounded-lg p-3 font-serif-legal border border-border/50">
                {message.originalLegalText}
              </div>
            </div>
          </div>
        )}

        {/* Citation footer */}
        {message.citation && (
          <>
            <div className="border-t border-border/50" />
            <p className="text-xs text-muted-foreground font-medium">
              Source: {message.citation}
            </p>
          </>
        )}

        {/* RLHF Feedback Controls */}
        {!isWelcome && (
          <div className="pt-1">
            <div className="border-t border-border/30 pt-2.5 flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Was this helpful?</span>
              <button
                onClick={() => handleFeedback("positive")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  feedback?.type === "positive"
                    ? "bg-accent/15 text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                aria-label="This response was helpful"
                aria-pressed={feedback?.type === "positive"}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleFeedback("negative")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  feedback?.type === "negative"
                    ? "bg-destructive/15 text-destructive"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                aria-label="This response was not helpful"
                aria-pressed={feedback?.type === "negative"}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
              {feedback?.type && !showFeedbackForm && !feedback.comment && (
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label="Add a comment"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </button>
              )}
              {feedback?.comment && (
                <span className="text-xs text-muted-foreground ml-2 italic truncate max-w-[150px]">
                  "{feedback.comment}"
                </span>
              )}
            </div>

            {/* Feedback comment form */}
            {showFeedbackForm && (
              <div className="mt-2 flex items-center gap-2 animate-fade-in">
                <input
                  type="text"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  placeholder="What could be improved?"
                  className="flex-1 h-8 px-3 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
                  autoFocus
                />
                <button
                  onClick={submitComment}
                  disabled={!feedbackComment.trim()}
                  className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-colors"
                  aria-label="Submit feedback"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowFeedbackForm(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
