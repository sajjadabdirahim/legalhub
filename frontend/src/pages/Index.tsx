import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { ModeProvider, useMode } from "@/contexts/ModeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredAccessToken, postChat } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { ChatHistorySidebar, Conversation } from "@/components/ChatHistorySidebar";
import { AIWarningBanner } from "@/components/AIWarningBanner";
import { LoginReminder } from "@/components/LoginReminder";
import { ChatMessage, ChatMessageData, MessageFeedback, FeedbackType } from "@/components/ChatMessage";
import { ChatInputIsland } from "@/components/ChatInputIsland";
import { LegalResourcesPanel } from "@/components/LegalResourcesPanel";
import { MobileBottomSheet } from "@/components/MobileBottomSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "18rem";

const WELCOME_MESSAGE: ChatMessageData = {
  id: "welcome",
  role: "ai",
  content:
    "Welcome to LegalHub! I can help you understand Kenyan laws in simple terms. Ask me about traffic rules, employment rights, land ownership, or any legal topic. What would you like to know?",
};

const SAMPLE_RESPONSES: ChatMessageData[] = [
  {
    id: "",
    role: "ai",
    content:
      "If you're caught driving without a valid license in Kenya, you could face a fine of up to KES 100,000 or imprisonment for up to one year, or both. The law requires every driver to carry their license while driving.",
    originalLegalText:
      'Section 30(1) of the Traffic Act, Cap. 403: "Any person who drives a motor vehicle on a road without being the holder of a valid driving licence issued to him under this Act authorizing him to drive a motor vehicle of that class or description shall be guilty of an offence and shall be liable to a fine not exceeding one hundred thousand shillings or to imprisonment for a term not exceeding twelve months or to both."',
    citation: "Traffic Act, Cap. 403, Sec. 30(1)",
  },
  {
    id: "",
    role: "ai",
    content:
      "Under Kenyan employment law, an employer must give you written notice before termination. The notice period depends on how often you're paid — at least 28 days for monthly employees. You're also entitled to severance pay if you've been employed for over 12 months.",
    originalLegalText:
      'Section 35(1) of the Employment Act, 2007: "Either party to a contract of service may terminate the contract by giving notice in writing to the other party. The notice period shall not be less than twenty-eight days where the employee is engaged on monthly terms."',
    citation: "Employment Act, 2007, Sec. 35(1)",
  },
];

function loadConversations(email: string): Conversation[] {
  try {
    const data = localStorage.getItem(`legalhub_convos_${email}`);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}
function saveConversations(email: string, convos: Conversation[]) {
  localStorage.setItem(`legalhub_convos_${email}`, JSON.stringify(convos));
}
function loadMessages(email: string, convoId: string): ChatMessageData[] {
  try {
    const data = localStorage.getItem(`legalhub_msgs_${email}_${convoId}`);
    return data ? JSON.parse(data) : [WELCOME_MESSAGE];
  } catch { return [WELCOME_MESSAGE]; }
}
function saveMessages(email: string, convoId: string, msgs: ChatMessageData[]) {
  localStorage.setItem(`legalhub_msgs_${email}_${convoId}`, JSON.stringify(msgs));
}

function titleCasePhrase(input: string): string {
  return input
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      if (["of", "the", "and", "for", "to", "in", "on"].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatConversationTitleFromPrompt(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";

  // 1) Prefer explicit legal instrument names: "Data Protection Act", "Employment Act", etc.
  const actMatch = cleaned.match(
    /\b([A-Za-z][A-Za-z\s&'-]{2,80}?)\s+Act(?:\s*,?\s*\d{4})?\b/i
  );
  if (actMatch?.[0]) {
    return titleCasePhrase(actMatch[0].replace(/\s*,\s*/g, ", ").trim());
  }

  // 2) Topic mapping fallback when Act name is not explicitly present.
  const lower = cleaned.toLowerCase();
  const topicMap: Array<[RegExp, string]> = [
    [/\bdata\s+protection|privacy|personal\s+data\b/i, "Data Protection Act"],
    [/\bemployment|termination|dismissal|redundancy|salary|wages|leave\b/i, "Employment Act"],
    [/\btraffic|driving|licen[cs]e|speeding|road\b/i, "Traffic Act"],
    [/\bland|title\s+deed|property|lease|tenant|rent\b/i, "Land Law"],
    [/\bconstitution|constitutional|bill\s+of\s+rights\b/i, "Constitution of Kenya"],
    [/\bcompany|corporate|director|shareholder|business\s+registration\b/i, "Companies Act"],
  ];
  for (const [pattern, title] of topicMap) {
    if (pattern.test(lower)) return title;
  }

  // 3) Last resort: concise neutral summary.
  const words = cleaned.split(" ").filter(Boolean);
  const summary = words.slice(0, 5).join(" ");
  const sentenceCase = summary.charAt(0).toUpperCase() + summary.slice(1).toLowerCase();
  return words.length > 5 ? `${sentenceCase}...` : sentenceCase;
}

function AppContent() {
  const { isProfessional, isCitizen } = useMode();
  const { isLoggedIn, userEmail, logout } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);

  // Independent message & loading states per mode
  const [citizenMessages, setCitizenMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE]);
  const [professionalMessages, setProfessionalMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE]);
  const [citizenLoading, setCitizenLoading] = useState(false);
  const [professionalLoading, setProfessionalLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, MessageFeedback>>({});

  // Derived: current mode's state
  const messages = isCitizen ? citizenMessages : professionalMessages;
  const isLoading = isCitizen ? citizenLoading : professionalLoading;

  const createNewConversation = useCallback((email?: string, existingConvos?: Conversation[]) => {
    const e = email || userEmail;
    if (!e) return;
    let activeId = "";
    setConversations((prev) => {
      const seed = existingConvos ?? prev;
      const existingNew = seed.find((c) => c.title === "New Chat");
      if (existingNew) {
        activeId = existingNew.id;
        saveConversations(e, seed);
        return seed;
      }

      activeId = Date.now().toString();
      const newConvo: Conversation = { id: activeId, title: "New Chat", createdAt: Date.now() };
      const updated = [newConvo, ...seed];
      saveConversations(e, updated);
      return updated;
    });

    if (!activeId) return;
    setActiveConvoId(activeId);
    const existingMessages = loadMessages(e, activeId);
    const initialMsgs = existingMessages.length > 0 ? existingMessages : [WELCOME_MESSAGE];
    setCitizenMessages(initialMsgs);
    setProfessionalMessages(initialMsgs);
    saveMessages(e, activeId, initialMsgs);
  }, [userEmail]);

  useEffect(() => {
    if (isLoggedIn && userEmail) {
      const convos = loadConversations(userEmail);
      // Keep full history visible, but always start in a fresh chat on each page visit/login.
      createNewConversation(userEmail, convos);
    } else {
      setConversations([]);
      setActiveConvoId(null);
      setCitizenMessages([WELCOME_MESSAGE]);
      setProfessionalMessages([WELCOME_MESSAGE]);
      setSidebarOpen(false);
    }
  }, [isLoggedIn, userEmail, createNewConversation]);

  const selectConversation = useCallback((id: string) => {
    if (!userEmail) return;
    setActiveConvoId(id);
    setCitizenMessages(loadMessages(userEmail, id));
  }, [userEmail]);

  const deleteConversation = useCallback((id: string) => {
    if (!userEmail) return;
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveConversations(userEmail, updated);
      localStorage.removeItem(`legalhub_msgs_${userEmail}_${id}`);
      if (activeConvoId === id) {
        if (updated.length > 0) {
          setActiveConvoId(updated[0].id);
          setCitizenMessages(loadMessages(userEmail, updated[0].id));
        } else {
          createNewConversation();
        }
      }
      return updated;
    });
  }, [userEmail, activeConvoId, createNewConversation]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      if (!isLoggedIn || !getStoredAccessToken()) {
        toast.error("Please log in to send messages.");
        return;
      }

      const modeAtSend: "citizen" | "professional" = isCitizen ? "citizen" : "professional";
      const setModeMessages = modeAtSend === "citizen" ? setCitizenMessages : setProfessionalMessages;
      const setModeLoading = modeAtSend === "citizen" ? setCitizenLoading : setProfessionalLoading;

      const userMsg: ChatMessageData = { id: Date.now().toString(), role: "user", content: trimmedText };

      setModeMessages((prevMessages) => {
        const updatedMsgs = [...prevMessages, userMsg];

        if (isLoggedIn && userEmail && activeConvoId && modeAtSend === "citizen") {
          saveMessages(userEmail, activeConvoId, updatedMsgs);
          setConversations((prevConversations) => {
            const convo = prevConversations.find((c) => c.id === activeConvoId);
            if (convo && convo.title === "New Chat") {
              const title = formatConversationTitleFromPrompt(trimmedText);
              const updated = prevConversations.map((c) =>
                c.id === activeConvoId ? { ...c, title } : c
              );
              saveConversations(userEmail, updated);
              return updated;
            }
            return prevConversations;
          });
        }

        return updatedMsgs;
      });

      setModeLoading(true);

      try {
        await postChat(trimmedText, modeAtSend);
      } catch (err) {
        const e = err as Error & { status?: number };
        setModeMessages((prev) => {
          const next = prev.filter((m) => m.id !== userMsg.id);
          if (isLoggedIn && userEmail && activeConvoId && modeAtSend === "citizen") {
            saveMessages(userEmail, activeConvoId, next);
          }
          return next;
        });
        if (e.status === 401) {
          logout();
          toast.error("Session expired. Please log in again.");
        } else {
          toast.error(e.message || "Could not validate your message. Please try again.");
        }
        setModeLoading(false);
        return;
      }

      setTimeout(() => {
        const sample = SAMPLE_RESPONSES[Math.floor(Math.random() * SAMPLE_RESPONSES.length)];
        const aiMsg: ChatMessageData = { ...sample, id: (Date.now() + 1).toString() };

        setModeMessages((prevMessages) => {
          const finalMsgs = [...prevMessages, aiMsg];
          if (isLoggedIn && userEmail && activeConvoId && modeAtSend === "citizen") {
            saveMessages(userEmail, activeConvoId, finalMsgs);
          }
          return finalMsgs;
        });

        setModeLoading(false);
      }, 2000);
    },
    [isCitizen, isLoggedIn, userEmail, activeConvoId, logout]
  );

  const handleFeedback = useCallback((messageId: string, type: FeedbackType, comment?: string) => {
    setFeedbacks((prev) => {
      if (type === null) {
        const next = { ...prev };
        delete next[messageId];
        return next;
      }
      return {
        ...prev,
        [messageId]: { messageId, type, comment, timestamp: Date.now() },
      };
    });
  }, []);

  const showPushSidebar = isLoggedIn && sidebarOpen && !isMobile;

  // Get latest AI message with citation for the professional side panel
  const latestAiMessage = [...professionalMessages].reverse().find(
    (m) => m.role === "ai" && (m.citation || m.originalLegalText)
  ) || null;

  return (
    <div className="min-h-screen flex flex-col transition-crossfade font-sans">
      <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {isLoggedIn && (
        <ChatHistorySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConvoId}
          onSelectConversation={selectConversation}
          onNewConversation={() => createNewConversation()}
          onDeleteConversation={deleteConversation}
        />
      )}

      <div
        className="flex flex-1 overflow-hidden transition-spring"
        style={{ marginLeft: showPushSidebar ? SIDEBAR_WIDTH : "0" }}
      >
        <main
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-spring",
            isProfessional ? "lg:w-[60%]" : "w-full"
          )}
          role="main"
          aria-label="Legal research conversation"
        >
          <AIWarningBanner />
          {!isLoggedIn && <LoginReminder />}

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-5">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  feedback={feedbacks[msg.id] || null}
                  onFeedback={handleFeedback}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="rounded-2xl border border-border bg-card shadow-card px-5 py-4 flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse-subtle" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse-subtle" style={{ animationDelay: "200ms" }} />
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse-subtle" style={{ animationDelay: "400ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground animate-pulse-subtle">
                      Retrieving exact statutes…
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <ChatInputIsland onSend={handleSend} isLoading={isLoading} />
        </main>

        {isProfessional && (
          <aside
            className="hidden lg:flex lg:w-[40%] border-l border-border bg-card flex-col transition-spring"
            aria-label="Legal resources panel"
          >
            <LegalResourcesPanel onTopicClick={handleSend} latestAiMessage={latestAiMessage} feedbacks={feedbacks} />
          </aside>
        )}
      </div>

      <MobileBottomSheet onTopicClick={handleSend} latestAiMessage={latestAiMessage} feedbacks={feedbacks} />
    </div>
  );
}

export default function Index() {
  return (
    <ModeProvider>
      <AppContent />
    </ModeProvider>
  );
}
