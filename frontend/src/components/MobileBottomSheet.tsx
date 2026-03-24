import { useState } from "react";
import { useMode } from "@/contexts/ModeContext";
import { LegalResourcesPanel } from "./LegalResourcesPanel";
import { ChatMessageData, MessageFeedback } from "./ChatMessage";
import { ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomSheetProps {
  onTopicClick?: (query: string) => void;
  latestAiMessage?: ChatMessageData | null;
  feedbacks?: Record<string, MessageFeedback>;
}

export function MobileBottomSheet({ onTopicClick, latestAiMessage, feedbacks }: MobileBottomSheetProps) {
  const { isProfessional } = useMode();
  const [isOpen, setIsOpen] = useState(false);

  if (!isProfessional) return null;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-30 lg:hidden flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-island transition-spring hover:scale-105"
        aria-label="Open legal insights"
      >
        <ChevronUp className="h-5 w-5" />
        <span className="text-sm font-semibold">Legal Insights</span>
      </button>

      {/* Bottom sheet */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background rounded-t-2xl border-t border-border max-h-[85dvh] overflow-y-auto animate-slide-up font-sans"
            )}
            role="dialog"
            aria-label="Legal resources panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background">
              <h2 className="text-base font-semibold text-foreground">Legal Insights</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <LegalResourcesPanel onTopicClick={onTopicClick} latestAiMessage={latestAiMessage} feedbacks={feedbacks} />
          </div>
        </>
      )}
    </>
  );
}
