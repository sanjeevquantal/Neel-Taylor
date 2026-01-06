import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Paperclip,
  X
} from "lucide-react";
import apiClient, { NetworkError, streamChat, fetchUserCredits } from "@/lib/api";
import { writeCache, CACHE_KEYS } from "@/lib/cache";
import { UploadModal } from "@/components/UploadModal";

// Parse metadata from message content
interface ParsedMetadata {
  textContent: string;
  metadata: any | null;
}

const parseMetadata = (content: string): ParsedMetadata => {
  // Find the metadata marker (case-insensitive, handles whitespace variations)
  const metadataMarker = '-%METADATA%-';
  const markerIndex = content.indexOf(metadataMarker);

  if (markerIndex === -1) {
    return { textContent: content, metadata: null };
  }

  // Extract text before metadata (remove trailing newlines/whitespace)
  const textBefore = content.substring(0, markerIndex).trim();

  // Extract JSON after metadata marker (skip the marker and any whitespace/newlines)
  const jsonStart = markerIndex + metadataMarker.length;
  let jsonString = content.substring(jsonStart).trim();

  // Remove any leading newlines or whitespace
  jsonString = jsonString.replace(/^\s*\n\s*/, '');

  if (!jsonString) {
    return { textContent: content, metadata: null };
  }

  try {
    const metadata = JSON.parse(jsonString);
    console.log('Parsed metadata successfully:', metadata);
    return { textContent: textBefore, metadata };
  } catch (e) {
    console.error('Failed to parse metadata:', e, 'JSON string:', jsonString.substring(0, 200));
    // If parsing fails, return original content
    return { textContent: content, metadata: null };
  }
};

// Component to render lead list table
const LeadListTable = ({ data }: { data: any[] }) => {
  console.log('LeadListTable rendering with data:', data);

  if (!Array.isArray(data) || data.length === 0) {
    console.log('LeadListTable: No data or empty array');
    return null;
  }

  // Calculate max height for 5 rows (approximately 48px per row)
  const maxHeight = '240px'; // ~48px per row * 5 rows

  return (
    <div className="mt-4 border-2 border-border rounded-lg overflow-hidden bg-card shadow-md">
      <div className="p-2 bg-muted/50 border-b border-border">
        <h4 className="text-sm font-semibold">Lead List ({data.length} leads)</h4>
      </div>
      <div className="relative overflow-x-auto">
        <div
          className="overflow-y-auto"
          style={{ maxHeight }}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10">
              <TableRow className="bg-muted/30">
                <TableHead className="min-w-[150px] font-semibold">Name</TableHead>
                <TableHead className="min-w-[200px] font-semibold">Title</TableHead>
                <TableHead className="min-w-[180px] font-semibold">Email</TableHead>
                <TableHead className="min-w-[120px] font-semibold">LinkedIn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((lead, index) => (
                <TableRow key={index} className="hover:bg-muted/20">
                  <TableCell className="font-medium min-w-[150px]">{lead.name || '-'}</TableCell>
                  <TableCell className="min-w-[200px]">{lead.title || '-'}</TableCell>
                  <TableCell className="min-w-[180px]">
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-primary hover:underline text-sm break-all"
                      >
                        {lead.email}
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="min-w-[120px]">
                    {lead.linkedin ? (
                      <a
                        href={lead.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        View Profile →
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

// Simple but structured markdown parser for chat messages
const parseMarkdown = (text: string) => {
  // Helpers for inline formatting
  const applyInline = (line: string) =>
    line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = text.split(/\r?\n/);
  const htmlParts: string[] = [];
  // Track open list levels (0 = root ul)
  let openLevel = 0;
  const closeListsTo = (level: number) => {
    while (openLevel > level) {
      htmlParts.push('</ul>');
      openLevel -= 1;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, '');

    // Headers
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      closeListsTo(0);
      htmlParts.push(`<h3 class="text-lg font-semibold mt-2 mb-1">${applyInline(h3[1])}</h3>`);
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      closeListsTo(0);
      htmlParts.push(`<h2 class="text-xl font-semibold mt-3 mb-2">${applyInline(h2[1])}</h2>`);
      continue;
    }
    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      closeListsTo(0);
      htmlParts.push(`<h1 class="text-2xl font-bold mt-4 mb-3">${applyInline(h1[1])}</h1>`);
      continue;
    }

    // List items (support simple nested lists with two-space indent)
    const li = line.match(/^(\s*)-\s+(.*)$/);
    if (li) {
      const spaces = li[1].length;
      const level = spaces >= 2 ? 2 : 1; // 1 => top-level, 2 => nested
      const desiredOpen = level; // we keep level count equal to nesting depth
      if (desiredOpen > openLevel) {
        for (let i = openLevel; i < desiredOpen; i++) {
          const margin = i === 0 ? 'ml-4' : 'ml-8';
          htmlParts.push(`<ul class="list-disc ${margin} my-2">`);
        }
        openLevel = desiredOpen;
      } else if (desiredOpen < openLevel) {
        closeListsTo(desiredOpen);
      }
      htmlParts.push(`<li>${applyInline(li[2])}</li>`);
      continue;
    }

    // Blank line -> close lists and add spacing
    if (!line.trim()) {
      closeListsTo(0);
      htmlParts.push('<div class="h-2"></div>');
      continue;
    }

    // Paragraph
    closeListsTo(0);
    htmlParts.push(`<p class="mb-2">${applyInline(line)}</p>`);
  }

  // Close any remaining lists
  closeListsTo(0);
  return htmlParts.join('');
};

// New interface for API request
// Requests are sent as multipart/form-data with a string field `chat_req`

// New interface for API response
interface APIResponse {
  error: string;
  msg: string;
  total_time: string;
  conversation_id: number;
  knowledge_base_uploaded?: boolean;
}

// Display message interface
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: string;
  hasFile?: boolean;
}

interface PersistedMessage extends Omit<Message, 'timestamp'> {
  timestamp: string;
}

interface ChatInterfaceProps {
  freshLogin?: boolean;
  isSidebarCollapsed?: boolean;
  initialConversationId?: number | null;
  onConversationIdChange?: (id: number | null) => void;
  onNewChat?: () => void;
}

const CHAT_STORAGE_KEY = 'campaigner-chat-cache';
const DRAFT_STORAGE_KEY = 'draft';
const INPUT_STORAGE_KEY = 'campaigner-chat-inputs';

const getConversationStorageKey = (id: number | null) =>
  id ? `conversation-${id}` : DRAFT_STORAGE_KEY;

const getConversationInputKey = (id: number | null) =>
  id ? `conversation-${id}` : DRAFT_STORAGE_KEY;

const readChatStorage = (): Record<string, PersistedMessage[]> => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read chat storage', err);
    return {};
  }
};

const writeChatStorage = (store: Record<string, PersistedMessage[]>) => {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to write chat storage', err);
  }
};

const readInputStorage = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(INPUT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read input storage', err);
    return {};
  }
};

const writeInputStorage = (store: Record<string, string>) => {
  try {
    localStorage.setItem(INPUT_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Failed to write input storage', err);
  }
};

// Move any draft input (typed before a conversation ID exists) onto the
// newly-created conversation key so that URL changes/remounts don't lose it.
const migrateDraftInputToConversationStorage = (newConversationId: number) => {
  try {
    const store = readInputStorage();
    const draftKey = getConversationInputKey(null); // "draft"
    const draftValue = store[draftKey];

    if (typeof draftValue === 'string' && draftValue.trim().length > 0) {
      const newKey = getConversationInputKey(newConversationId);
      store[newKey] = draftValue;
      delete store[draftKey];
      writeInputStorage(store);
    }
  } catch (err) {
    console.error('Failed to migrate draft input to conversation storage', err);
  }
};

const loadMessagesFromStorage = (conversationId: number | null): Message[] => {
  const store = readChatStorage();
  const key = getConversationStorageKey(conversationId);
  const persisted = store[key];
  if (!persisted || !Array.isArray(persisted)) return [];
  return persisted.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
};

const persistMessagesToStorage = (conversationId: number | null, messages: Message[]) => {
  const store = readChatStorage();
  const key = getConversationStorageKey(conversationId);
  store[key] = messages.map((msg) => ({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
  }));
  writeChatStorage(store);
};

const migrateDraftToConversationStorage = (newConversationId: number) => {
  const store = readChatStorage();
  const draftMessages = store[DRAFT_STORAGE_KEY];
  if (draftMessages && draftMessages.length) {
    store[getConversationStorageKey(newConversationId)] = draftMessages;
    delete store[DRAFT_STORAGE_KEY];
    writeChatStorage(store);
  }
};

export const ChatInterface = ({ freshLogin = false, isSidebarCollapsed = false, initialConversationId = null, onConversationIdChange, onNewChat }: ChatInterfaceProps) => {


  // Function to start a new chat
  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setConversationTitle(null);
    setIsInitialTyping(false);
    setConversationHasFile(false); // Reset file upload flag for new chat
    setConversationLeads([]); // Reset leads for new chat
    // Clear stored draft input for the current conversation and draft key
    try {
      const store = readInputStorage();
      delete store[getConversationInputKey(conversationId)];
      delete store[getConversationInputKey(null)];
      writeInputStorage(store);
    } catch (err) {
      console.error('Failed to clear input storage for new chat', err);
    }
    persistMessagesToStorage(null, []);
    onNewChat?.();
  };

  const [messages, setMessages] = useState<Message[]>(() => loadMessagesFromStorage(initialConversationId ?? null));
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [input, setInput] = useState<string>(() => {
    // Initialize input from stored drafts so remounts don't lose text
    const store = readInputStorage();
    const key = getConversationInputKey(initialConversationId ?? null);
    return store[key] ?? '';
  });
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialTyping, setIsInitialTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('cto');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [conversationHasFile, setConversationHasFile] = useState(false);
  const [attachedUrl, setAttachedUrl] = useState<string>('');
  const [showPaperclipTooltip, setShowPaperclipTooltip] = useState(false);
  const [conversationLeads, setConversationLeads] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const skipNextHistoryLoadRef = useRef(false);
  const justCreatedConversationIdRef = useRef<number | null>(null);
  const hasLoadedInputDraftRef = useRef(false);

  // Auto-adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // capped at 160px, min height handled by CSS
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [input]);

  // Scroll to bottom on new messages or typing changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isTyping]);


  // Persist messages whenever they change
  useEffect(() => {
    persistMessagesToStorage(conversationId ?? null, messages);
  }, [conversationId, messages]);

  // Persist input drafts whenever input or conversationId changes
  useEffect(() => {
    try {
      const store = readInputStorage();
      const key = getConversationInputKey(conversationId ?? null);
      if (input && input.trim().length > 0) {
        store[key] = input;
      } else {
        delete store[key];
      }
      writeInputStorage(store);
    } catch (err) {
      console.error('Failed to persist input draft', err);
    }
  }, [input, conversationId]);

  // When conversationId changes (e.g., navigation), load any stored draft for it.
  // But never clobber non-empty input the user is currently typing.
  useEffect(() => {
    try {
      // If we've already loaded a draft once and the user has started typing,
      // don't overwrite their current input when the conversationId updates
      // (this can happen when a new conversation ID is assigned after first message).
      if (hasLoadedInputDraftRef.current && input && input.trim().length > 0) {
        return;
      }

      const store = readInputStorage();
      const key = getConversationInputKey(conversationId ?? null);
      const stored = store[key];
      if (typeof stored === 'string') {
        setInput(stored);
      } else if (!conversationId) {
        // For brand new chat with no stored draft, ensure input is at least empty string
        setInput((prev) => prev ?? '');
      }
      hasLoadedInputDraftRef.current = true;
    } catch (err) {
      console.error('Failed to load input draft for conversation', err);
    }
  }, [conversationId]);

  // Sync external initial conversation id into local state
  useEffect(() => {
    // Only update if the value actually changed to avoid unnecessary re-renders
    // and prevent clearing messages when navigation happens after first message
    if (initialConversationId !== conversationId) {
      // If we're syncing a conversation we just created, skip history load
      if (skipNextHistoryLoadRef.current && initialConversationId) {
        // The skip flag is already set, just update the ID without triggering history load
        setConversationId(initialConversationId);
        skipNextHistoryLoadRef.current = false; // Reset after use
      } else {
        setConversationId(initialConversationId ?? null);
      }
    }
    // Reset title when conversation ID changes externally
    if (!initialConversationId) {
      setConversationTitle(null);
    }
  }, [initialConversationId, conversationId]);

  // Load full conversation history when conversationId changes (from sidebar selection)
  useEffect(() => {
    const loadHistory = async (id: number) => {
      setIsInitialTyping(false);
      setIsTyping(false);
      try {
        const data = await apiClient.get<any>(`/api/conversations/${id}`);
        // Extract conversation title from API response
        // Handle both null and empty string cases, and strip single quotes
        const title = data?.title;
        if (title && title.trim() !== '') {
          // Remove single quotes from the beginning and end of the title
          const cleanedTitle = title.trim().replace(/^'|'$/g, '');
          setConversationTitle(cleanedTitle);
        } else {
          setConversationTitle(null);
        }

        // Normalize possible shapes to Message[]
        // Expect either { messages: [...] } or [...]
        const rawMessages: any[] = Array.isArray(data) ? data : (Array.isArray(data?.messages) ? data.messages : []);
        const mapped: Message[] = rawMessages.map((m: any, idx: number) => ({
          id: String(m?.id ?? idx + 1),
          type: (m?.role === 'assistant' || m?.type === 'assistant') ? 'assistant' : 'user',
          content: String(m?.content ?? m?.text ?? m ?? ''),
          timestamp: new Date(m?.created_at ?? m?.timestamp ?? Date.now()),
          hasFile: m?.has_file || m?.hasFile || false, // Check if backend stores this info
        }));
        // Update messages from server, but preserve existing messages if we already have them
        // This prevents the refresh issue when navigation happens after first message
        setMessages(prev => {
          // If we already have messages and the mapped messages are the same or fewer,
          // it means we're reloading the same conversation - preserve existing messages
          // to prevent the page refresh issue after first message
          if (prev.length > 0 && mapped.length <= prev.length) {
            // Check if the last message content matches - if so, we're reloading the same conversation
            const lastPrev = prev[prev.length - 1];
            const lastMapped = mapped[mapped.length - 1];
            if (lastPrev && lastMapped && lastPrev.content === lastMapped.content) {
              return prev; // Same conversation, preserve existing messages
            }
          }
          return mapped;
        });

        // Extract leads from conversation data
        if (data?.leads && Array.isArray(data.leads) && data.leads.length > 0) {
          // Format leads to match the LeadListTable component format
          const formattedLeads = data.leads.map((lead: any) => ({
            name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unnamed',
            title: lead.job_title || '-',
            email: lead.email || '',
            linkedin: lead.linkedin_url || '',
          }));
          setConversationLeads(formattedLeads);
        } else {
          setConversationLeads([]);
        }

        // Check if this conversation has had any file uploads
        // Look for hasFile property first, then fallback to content patterns
        const hasFileContent = mapped.some(msg => {
          // First check if the message has the hasFile property
          if (msg.hasFile) return true;

          // Fallback to content pattern detection
          const content = msg.content.toLowerCase();
          return content.includes('file_content') ||
            content.includes('uploaded file') ||
            content.includes('file uploaded') ||
            content.includes('analyze the uploaded') ||
            content.includes('based on its content') ||
            content.includes('document you') ||
            content.includes('file you') ||
            (msg.type === 'user' && (
              content.includes('analyze') && content.includes('file') ||
              content.includes('upload') && content.includes('document')
            )) ||
            (msg.type === 'assistant' && (
              content.includes('file') && content.includes('uploaded') ||
              content.includes('document') && content.includes('content')
            ));
        });
        // console.log('Checking conversation for file uploads:', { hasFileContent, messageCount: mapped.length, messages: mapped.map(m => ({ type: m.type, hasFile: m.hasFile, content: m.content.substring(0, 50) })) });
        if (typeof (data as any)?.knowledge_base_uploaded === 'boolean') {
          setConversationHasFile((data as any).knowledge_base_uploaded);
        } else {
          setConversationHasFile(hasFileContent);
        }
      } catch (err) {
        console.error('Failed to load conversation history', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (!conversationId) {
      setMessages(loadMessagesFromStorage(null));
      setConversationTitle(null);
      setConversationLeads([]);
      setIsLoadingHistory(false);
      return;
    }

    if (skipNextHistoryLoadRef.current) {
      skipNextHistoryLoadRef.current = false;
      return;
    }

    // If we're loading history for a conversation we just created and we already have messages,
    // skip the history load to prevent clearing messages after first message
    // But still load the title to ensure it's displayed correctly
    if (justCreatedConversationIdRef.current === conversationId && messages.length > 0) {
      // Still load the title even if we skip loading messages
      void refreshTitle(conversationId);
      return;
    }

    // Don't clear messages if we already have messages - this prevents the refresh issue
    // after first message when navigation happens. We'll still load history to sync
    // but won't clear existing messages if they're already displayed.
    const hasMessages = messages.length > 0;
    
    // Only clear messages and show loader when we don't have any messages yet
    // This prevents clearing messages after first message when navigation occurs
    if (!hasMessages) {
      setMessages([]);
      setIsLoadingHistory(true);
    } else {
      // If we have messages, still load history in background to sync, but don't show loader
      setIsLoadingHistory(false);
    }
    setIsInitialTyping(false);
    setIsTyping(false);

    // Don't load cached messages when switching - show loader instead for better UX
    // Cached messages will be loaded after the API call completes

    void loadHistory(conversationId);
  }, [conversationId]);

  const refreshTitle = async (id: number) => {
    try {
      const data = await apiClient.get<any>(`/api/conversations/${id}`);
      // Handle both null and empty string cases, and strip single quotes
      const title = data?.title;
      if (title && title.trim() !== '') {
        // Remove single quotes from the beginning and end of the title
        const cleanedTitle = title.trim().replace(/^'|'$/g, '');
        setConversationTitle(cleanedTitle);
      } else {
        setConversationTitle(null);
      }
    } catch (err) {
      console.error('Failed to refresh title:', err);
    }
  };

  const personas = [
    { id: 'cto', label: 'Chief Technology Officer', description: 'Tech-focused, efficiency-driven' },
    { id: 'cmo', label: 'Chief Marketing Officer', description: 'Brand-focused, growth-oriented' },
    { id: 'startup', label: 'Startup Founder', description: 'Innovative, resource-conscious' },
    { id: 'enterprise', label: 'Enterprise Executive', description: 'ROI-focused, strategic' }
  ];

  const syncConversationContext = async (candidateId?: number) => {
    let resolvedId = candidateId;

    if (!resolvedId) {
      try {
        const conversations = await apiClient.get<any[]>('/api/conversations');
        if (conversations && conversations.length > 0) {
          resolvedId = conversations[0]?.id;
        }
      } catch (err) {
        console.error('Failed to fetch conversation ID after streaming:', err);
      }
    }

    if (resolvedId) {
      migrateDraftToConversationStorage(resolvedId);
      // Also migrate any in-progress input that was stored under the draft key
      // so that when the URL changes to /conversations/:id and the chat
      // component remounts, the user's partially-typed next message is restored.
      migrateDraftInputToConversationStorage(resolvedId);
      // Set skip flag and track this conversation as just created
      // This prevents history reload when navigation happens after first message
      skipNextHistoryLoadRef.current = true;
      justCreatedConversationIdRef.current = resolvedId;
      setConversationId(resolvedId);
      // Call onConversationIdChange AFTER setting the skip flag
      // This will trigger navigation, but skipNextHistoryLoadRef will prevent history reload
      onConversationIdChange?.(resolvedId);
      // Fetch title for the new conversation
      void refreshTitle(resolvedId);
      // Clear the just-created flag after a short delay to allow navigation to complete
      setTimeout(() => {
        justCreatedConversationIdRef.current = null;
      }, 1000);
    }
  };


  const sendMessageWithContent = async (content: string) => {
    setIsTyping(true);

    // Create assistant message ID but don't add it to messages yet
    const assistantMessageId = (Date.now() + 1).toString();
    let hasReceivedFirstChunk = false;
    let streamedConversationId: number | undefined;

    try {
      const formData = new FormData();
      formData.append('query', content);
      formData.append('conversation_id', String(conversationId || 0));
      if (attachedUrl) {
        formData.append('URL', attachedUrl);
        formData.append('conversation_id', String(conversationId || 0));
      }
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      // Track if this was a new conversation
      const wasNewConversation = !conversationId;

      // Use streaming API
      const streamResult = await streamChat('/api/chat', formData, {
        onChunk: (chunk: string) => {
          // On first chunk, add the message and hide typing indicator
          if (!hasReceivedFirstChunk) {
            hasReceivedFirstChunk = true;
            setIsTyping(false);

            // Add the assistant message with the first chunk
            const aiResponse: Message = {
              id: assistantMessageId,
              type: 'assistant',
              content: chunk,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
          } else {
            // Update the assistant message content as subsequent chunks arrive
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          }
        },
        onComplete: async (fullContent: string) => {
          // If no chunks were received, create the message now with full content
          if (!hasReceivedFirstChunk) {
            setIsTyping(false);
            const aiResponse: Message = {
              id: assistantMessageId,
              type: 'assistant',
              content: fullContent || 'No response generated.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
          } else {
            // Final update with complete content
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent }
                : msg
            ));
          }

          // Check if the response contains lead metadata and update conversationLeads
          const { metadata } = parseMetadata(fullContent);
          if (metadata && metadata.type === 'lead_list' && Array.isArray(metadata.data) && metadata.data.length > 0) {
            setConversationLeads(metadata.data);
          }

          // Fetch credits after chat completes (campaigns/credits may have been updated)
          if (conversationId) {
            fetchUserCredits()
              .then(data => writeCache(CACHE_KEYS.CREDITS, data))
              .catch(err => {
                console.error('Failed to fetch credits after chat:', err);
              });

            // Always refresh title after message is sent to ensure we have the latest title
            // This is especially important for new conversations where title is generated after 2nd/3rd message
            void refreshTitle(conversationId);
          }
        },
        onError: (error: Error) => {
          console.error('Streaming error:', error);
          setIsTyping(false);

          let errorMessage = 'Sorry, I encountered an error while processing your information. Please try again later.';

          if (error instanceof NetworkError) {
            switch (error.type) {
              case 'OFFLINE':
                errorMessage = '🌐 **You appear to be offline.**\n\nPlease check your internet connection and try again.';
                break;
              case 'NETWORK_ERROR':
                errorMessage = '🔌 **Unable to connect to the server.**\n\nThis could be due to:\n• Internet connection issues\n• Server maintenance\n• Network firewall restrictions\n\nPlease check your connection and try again.';
                break;
              case 'TIMEOUT':
                errorMessage = '⏱️ **Request timed out.**\n\nThe server is taking too long to respond. Please try again.';
                break;
              case 'SERVER_ERROR':
                errorMessage = '🚫 **Server error occurred.**\n\nThe server encountered an issue. Please try again in a few moments.';
                break;
              default:
                errorMessage = '❌ **An unexpected error occurred.**\n\nPlease try again later.';
            }
          }

          // Add or update the message with error content
          if (!hasReceivedFirstChunk) {
            const errorResponse: Message = {
              id: assistantMessageId,
              type: 'assistant',
              content: errorMessage,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorResponse]);
          } else {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: errorMessage }
                : msg
            ));
          }
        }
      });

      streamedConversationId = streamResult?.conversationId;

      if (wasNewConversation) {
        await syncConversationContext(streamedConversationId);
      }
    } catch (error) {
      console.error('Error calling streaming API:', error);
      setIsTyping(false);

      let errorMessage = 'Sorry, I encountered an error while processing your information. Please try again later.';

      if (error instanceof NetworkError) {
        switch (error.type) {
          case 'OFFLINE':
            errorMessage = '🌐 **You appear to be offline.**\n\nPlease check your internet connection and try again.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = '🔌 **Unable to connect to the server.**\n\nThis could be due to:\n• Internet connection issues\n• Server maintenance\n• Network firewall restrictions\n\nPlease check your connection and try again.';
            break;
          case 'TIMEOUT':
            errorMessage = '⏱️ **Request timed out.**\n\nThe server is taking too long to respond. Please try again.';
            break;
          case 'SERVER_ERROR':
            errorMessage = '🚫 **Server error occurred.**\n\nThe server encountered an issue. Please try again in a few moments.';
            break;
          default:
            errorMessage = '❌ **An unexpected error occurred.**\n\nPlease try again later.';
        }
      }

      // Add or update the message with error content
      if (!hasReceivedFirstChunk) {
        const errorResponse: Message = {
          id: assistantMessageId,
          type: 'assistant',
          content: errorMessage,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorResponse]);
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorMessage }
            : msg
        ));
      }
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async (overrideContent?: string, overrideFile?: File, overrideUrl?: string) => {
    const finalContent = overrideContent !== undefined ? overrideContent : input;
    const finalFile = overrideFile !== undefined ? overrideFile : uploadedFile;
    const finalUrl = overrideUrl !== undefined ? overrideUrl : attachedUrl;

    if (!finalContent.trim() && !finalFile && !finalUrl) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: finalContent || (finalFile ? `Uploaded file: ${finalFile.name}` : `Attached URL: ${finalUrl}`),
      timestamp: new Date(),
      persona: selectedPersona,
      hasFile: !!finalFile
    };

    setMessages(prev => [...prev, userMessage]);

    // Clear states
    setInput('');
    setUploadedFile(null);
    setAttachedUrl('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (finalFile) {
      setConversationHasFile(true);
    }
    setIsTyping(true);

    // Create assistant message ID but don't add it to messages yet
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessageIdRef = assistantMessageId; // for stable reference

    let hasReceivedFirstChunk = false;
    let streamedConversationId: number | undefined;

    try {
      const formData = new FormData();
      formData.append('query', finalContent || "Please analyze the attached information.");
      formData.append('conversation_id', String(conversationId || 0));
      if (finalUrl) {
        formData.append('URL', finalUrl);
      }
      if (finalFile) {
        formData.append('file', finalFile);
      }

      // Track if this was a new conversation
      const wasNewConversation = !conversationId;

      // Use streaming API
      const streamResult = await streamChat('/api/chat', formData, {
        onChunk: (chunk: string) => {
          // On first chunk, add the message and hide typing indicator
          if (!hasReceivedFirstChunk) {
            hasReceivedFirstChunk = true;
            setIsTyping(false);

            // Add the assistant message with the first chunk
            const aiResponse: Message = {
              id: assistantMessageId,
              type: 'assistant',
              content: chunk,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
          } else {
            // Update the assistant message content as subsequent chunks arrive
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          }
        },
        onComplete: async (fullContent: string) => {
          // If no chunks were received, create the message now with full content
          if (!hasReceivedFirstChunk) {
            setIsTyping(false);
            const aiResponse: Message = {
              id: assistantMessageId,
              type: 'assistant',
              content: fullContent || 'No response generated.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiResponse]);
          } else {
            // Final update with complete content
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullContent }
                : msg
            ));
          }

          if (attachedUrl) {
            setAttachedUrl('');
            setIsUploadingFile(false);
            setConversationHasFile(true);
          }

          // Fetch credits after chat completes (campaigns/credits may have been updated)
          if (conversationId) {
            fetchUserCredits()
              .then(data => writeCache(CACHE_KEYS.CREDITS, data))
              .catch(err => {
                console.error('Failed to fetch credits after chat:', err);
              });

            // Always refresh title after message is sent to ensure we have the latest title
            // This is especially important for new conversations where title is generated after 2nd/3rd message
            void refreshTitle(conversationId);
          }
        },
        onError: (error: Error) => {
          console.error('Streaming error:', error);
          setIsTyping(false);

          let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again later.';

          if (error instanceof NetworkError) {
            switch (error.type) {
              case 'OFFLINE':
                errorMessage = '🌐 **You appear to be offline.**\n\nPlease check your internet connection and try again.';
                break;
              case 'NETWORK_ERROR':
                errorMessage = '🔌 **Unable to connect to the server.**\n\nThis could be due to:\n• Internet connection issues\n• Server maintenance\n• Network firewall restrictions\n\nPlease check your connection and try again.';
                break;
              case 'TIMEOUT':
                errorMessage = '⏱️ **Request timed out.**\n\nThe server is taking too long to respond. Please try again.';
                break;
              case 'SERVER_ERROR':
                errorMessage = '🚫 **Server error occurred.**\n\nThe server encountered an issue. Please try again in a few moments.';
                break;
              default:
                errorMessage = '❌ **An unexpected error occurred.**\n\nPlease try again later.';
            }
          }

          // Add or update the message with error content
          if (!hasReceivedFirstChunk) {
            const errorResponse: Message = {
              id: assistantMessageId,
              type: 'assistant',
              content: errorMessage,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorResponse]);
          } else {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessageId
                ? { ...msg, content: errorMessage }
                : msg
            ));
          }
        }
      });

      streamedConversationId = streamResult?.conversationId;

      if (wasNewConversation) {
        await syncConversationContext(streamedConversationId);
      }

      if (attachedUrl) {
        setAttachedUrl('');
        setIsUploadingFile(false);
        setConversationHasFile(true);
      }
    } catch (error) {
      console.error('Error calling streaming API:', error);

      let errorMessage = 'Sorry, I encountered an error while processing your request. Please try again later.';

      if (error instanceof NetworkError) {
        switch (error.type) {
          case 'OFFLINE':
            errorMessage = '🌐 **You appear to be offline.**\n\nPlease check your internet connection and try again.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = '🔌 **Unable to connect to the server.**\n\nThis could be due to:\n• Internet connection issues\n• Server maintenance\n• Network firewall restrictions\n\nPlease check your connection and try again.';
            break;
          case 'TIMEOUT':
            errorMessage = '⏱️ **Request timed out.**\n\nThe server is taking too long to respond. Please try again.';
            break;
          case 'SERVER_ERROR':
            errorMessage = '🚫 **Server error occurred.**\n\nThe server encountered an issue. Please try again in a few moments.';
            break;
          default:
            errorMessage = '❌ **An unexpected error occurred.**\n\nPlease try again later.';
        }
      }

      // Update the message with error content
      setMessages(prev => prev.map(msg =>
        msg.id === assistantMessageId
          ? { ...msg, content: errorMessage }
          : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    setIsUploadingFile(false);
  };

  return (
    <div className="flex flex-col h-screen relative">


      {/* Chat Header */}
      <div className="border-b border-border/50 p-4 bg-gradient-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{conversationTitle || 'AI Campaign Creator'}</h2>
              {messages.length === 0 && !isLoadingHistory ? (
                <p className="text-sm text-muted-foreground">Welcome! Share your company info or upload a document to get started</p>
              ) : (
                <p className="text-sm text-muted-foreground">Chat with AI to generate marketing campaigns</p>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={startNewChat} className="h-10 px-4">
            <Sparkles className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages - with bottom padding for fixed input; centered like ChatGPT */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Display leads if available */}
          {conversationLeads.length > 0 && (
            <div className="mb-4">
              <LeadListTable data={conversationLeads} />
            </div>
          )}
          
          {/* Empty state when there are no messages */}
          {messages.length === 0 && !isLoadingHistory && !isInitialTyping && !isTyping && (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6 select-none">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow mb-4">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Welcome to CampAIgn AI</h3>
              <p className="text-muted-foreground max-w-xl mb-6">
                Share your company information (About page link) or upload a brief document. Then ask the AI to create a marketing campaign, email sequence, or outreach copy tailored to your brand.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <Button variant="outline" onClick={() => setInput("Create a cold email introducing our product to CTOs at SaaS startups")}>Try: Cold email for CTOs</Button>
                <Button variant="outline" onClick={() => setInput("Draft a 4-step nurture sequence for trial users of our SaaS")}>Try: Nurture sequence</Button>
                <Button variant="outline" onClick={() => setInput("Summarize the key value props from our website and craft a LinkedIn outreach message")}>Try: LinkedIn outreach</Button>
                <Button variant="outline" onClick={() => setInput("Generate a launch announcement email for our new feature with CTA")}>Try: Feature launch email</Button>
              </div>
            </div>
          )}
          {/* Initial typing animation */}
          {isInitialTyping && (
            <div className="flex items-start space-x-3">
              <div className="aspect-square h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <Card className="p-4 shadow-soft bg-gradient-card">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">CampAIgn AI is thinking...</span>
                </div>
              </Card>
            </div>
          )}

          {/* Loading conversation history */}
          {isLoadingHistory && messages.length === 0 && (
            <div className="flex items-start space-x-3">
              <div className="aspect-square h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <Card className="p-4 shadow-soft bg-gradient-card">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Loading conversation...</span>
                </div>
              </Card>
            </div>
          )}


          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
            >
              <div className={`aspect-square h-8 rounded-lg flex items-center justify-center ${message.type === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-gradient-primary text-primary-foreground shadow-glow'
                }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w- h-4" />
                )}
              </div>
              <Card className={`max-w-[85%] sm:max-w-2xl p-4 shadow-soft overflow-hidden break-words rounded-[22px] ${message.type === 'user'
                ? 'bg-primary/5 border-primary/20'
                : 'bg-gradient-card'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {message.type === 'user' ? 'You' : 'CampAIgn AI'}
                    </span>
                    {message.type === 'assistant' && message.persona && (
                      <Badge variant="secondary" className="text-xs">
                        {personas.find(p => p.id === message.persona)?.label}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground ml-4">
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                {(() => {
                  const { textContent, metadata } = parseMetadata(message.content);
                  const hasTextContent = textContent && textContent.trim().length > 0;

                  // Debug logging
                  if (message.type === 'assistant') {
                    if (message.content.includes('-%METADATA%-')) {
                      console.log('Message contains metadata marker');
                      console.log('Full content:', message.content);
                      console.log('Parsed textContent:', textContent);
                      console.log('Parsed metadata:', metadata);
                    }
                  }

                  // Check if we have valid metadata to display
                  const hasValidMetadata = metadata && metadata.type === 'lead_list' && Array.isArray(metadata.data) && metadata.data.length > 0;

                  return (
                    <>
                      {hasTextContent && (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed break-words overflow-hidden" dangerouslySetInnerHTML={{ __html: parseMarkdown(textContent) }} />
                      )}
                      {hasValidMetadata && (
                        <LeadListTable data={metadata.data} />
                      )}
                      {!hasTextContent && !hasValidMetadata && (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed break-words overflow-hidden" dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }} />
                      )}
                    </>
                  );
                })()}
                {message.hasFile && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Paperclip className="w-3 h-3" />
                      <span>File attached</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start space-x-3">
              <div className="aspect-square h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <Card className="p-4 shadow-soft bg-gradient-card">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-sm text-muted-foreground">CampAIgn AI is typing…</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Area at Bottom */}
      <div className={`fixed bottom-0 right-0 border-border/50 p-4 pb-0 mb-4 bg-transparent z-40 transition-all duration-300 ${isSidebarCollapsed ? 'left-16' : 'left-64'}`} id="chat-input-area">
        <div className="max-w-3xl mx-auto">
          {/* Uploaded File Display - Only show current session file */}
          {uploadedFile && !conversationHasFile && (
            <div key={`file-${uploadedFile.name}`} className="mb-3 p-3 bg-muted rounded-lg border border-input">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${uploadedFile.name.toLowerCase().endsWith('.pdf') ? 'bg-red-500' :
                    uploadedFile.name.toLowerCase().endsWith('.docx') ? 'bg-blue-600' :
                      'bg-slate-500'
                    }`}>
                    <span className="text-white text-[10px] font-bold uppercase">
                      {uploadedFile.name.split('.').pop()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ready to analyze
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadedFile(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          {/* Attached URL display */}
          {attachedUrl && (
            <div className="mb-3 p-3 bg-muted rounded-lg border border-input">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">URL</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-xs">
                      {attachedUrl}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Will be sent with your next message
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAttachedUrl('')}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="relative">
            <div className={`flex items-center bg-muted rounded-[32px] border border-input pl-6 pr-2 py-2 min-h-[56px] ${isTyping ? 'opacity-60' : ''}`}>
              {/* Input field */}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isTyping ? "AI is responding, please wait..." : "Ask AI to create a marketing campaign for your company"}
                className="flex-1 border-0 bg-transparent px-2 py-1 min-h-[1.5rem] max-h-[160px] resize-none text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 overflow-y-auto scrollbar-thin"
                style={{
                  lineHeight: '1rem'
                }}
                disabled={isTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isTyping) {
                      sendMessage();
                    }
                  }
                }}
              />

              {/* Right side actions */}
              <div className="flex items-center space-x-2 ml-2">
                <div
                  className="relative"
                  onMouseEnter={() => setShowPaperclipTooltip(true)}
                  onMouseLeave={() => setShowPaperclipTooltip(false)}
                >
                  <UploadModal
                    onFileSelected={(file) => {
                      setUploadedFile(file);
                      setIsUploadingFile(false);
                    }}
                    onLinkSelected={(url) => {
                      setAttachedUrl(url);
                      setIsUploadingFile(false);
                      sendMessage(undefined, undefined, url);
                    }}
                    hasUploadedFile={!!uploadedFile || isUploadingFile || conversationHasFile}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                      disabled={isTyping || isUploadingFile || !!uploadedFile || conversationHasFile}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </UploadModal>
                  {showPaperclipTooltip && (isTyping || conversationHasFile || isUploadingFile) && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md border shadow-md z-[100] whitespace-nowrap">
                      {isTyping
                        ? "Please wait for AI to finish responding"
                        : conversationHasFile
                          ? "A knowledge base is already attached to this conversation"
                          : isUploadingFile
                            ? "Uploading..."
                            : null}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                    </div>
                  )}
                </div>

                <Button
                  variant="default"
                  size="sm"
                  className="h-8 px-3 rounded-full"
                  title={isTyping ? "AI is responding, please wait..." : "Send message"}
                  onClick={() => sendMessage()}
                  disabled={(!input.trim() && !uploadedFile && !attachedUrl) || isTyping}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          {/* <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground">
            <span> Enter to send, Shift + Enter for new line</span>
          </div> */}
        </div>
      </div>
    </div>
  );
};