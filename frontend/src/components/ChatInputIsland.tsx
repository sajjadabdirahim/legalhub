import { useState, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CHARS = 500;

interface ChatInputIslandProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  loadingText?: string;
}

export function ChatInputIsland({ onSend, isLoading = false, loadingText = "Retrieving exact statutes..." }: ChatInputIslandProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const isAtLimit = charCount >= MAX_CHARS;

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_CHARS) {
      setValue(newValue);
    }
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-input-island sticky bottom-0 px-4 pb-5 pt-2 bg-gradient-to-t from-background via-background to-transparent">
      <div className="max-w-3xl mx-auto">
        <div className="shadow-island rounded-2xl border border-border bg-card p-3 transition-spring focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-border">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Kenyan law…"
            disabled={isLoading}
            rows={1}
            className="chat-input-textarea w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
            aria-label="Type your legal question"
          />
          <div className="flex items-center justify-between mt-2">
            <span
              className={cn(
                "text-xs transition-colors",
                isAtLimit ? "text-destructive font-medium" : "text-foreground/70"
              )}
              aria-live="polite"
            >
              {charCount}/{MAX_CHARS}
            </span>

            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin-slow text-accent" aria-hidden="true" />
                <span className="text-xs text-foreground/75 animate-pulse-subtle">
                  {loadingText}
                </span>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!value.trim()}
                className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
