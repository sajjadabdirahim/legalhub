import { useState } from "react";
import { Plus, MessageSquare, X, LogOut, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function ChatHistorySidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatHistorySidebarProps) {
  const { logout, userEmail } = useAuth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay only */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-72 bg-card border-r border-border overflow-hidden flex flex-col transition-spring",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="navigation"
        aria-label="Chat history"
      >
        {/* New chat button */}
        <div className="p-3 border-b border-border">
          <button
            onClick={() => { onNewConversation(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            aria-label="Start a new conversation"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Chat
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No conversations yet. Start chatting!
            </p>
          ) : (
            <nav className="space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => { onSelectConversation(conv.id); onClose(); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors",
                      activeConversationId === conv.id
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-foreground hover:bg-secondary"
                    )}
                    aria-current={activeConversationId === conv.id ? "page" : undefined}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate flex-1">{conv.title}</span>
                  </button>
                  {hoveredId === conv.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Delete conversation: ${conv.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </nav>
          )}
        </div>

        {/* User footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground/80 truncate max-w-[180px]">
              {userEmail}
            </span>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <button
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out of LegalHub?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You can sign in again anytime to restore your chat history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      logout();
                      setConfirmOpen(false);
                    }}
                  >
                    Log out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </aside>
    </>
  );
}
