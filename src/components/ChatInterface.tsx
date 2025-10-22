import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Paperclip,
  X
} from "lucide-react";
import apiClient, { NetworkError } from "@/lib/api";
import { UploadModal } from "@/components/UploadModal";

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

interface ChatInterfaceProps {
  freshLogin?: boolean;
  isSidebarCollapsed?: boolean;
  initialConversationId?: number | null;
  onConversationIdChange?: (id: number | null) => void;
  onNewChat?: () => void;
}

export const ChatInterface = ({ freshLogin = false, isSidebarCollapsed = false, initialConversationId = null, onConversationIdChange, onNewChat }: ChatInterfaceProps) => {
  // Array of welcome messages to randomly select from
  // const welcomeMessages = [
  //   "Welcome, glad to have you here. I'll help you create a marketing campaign that truly fits your brand.\nTo get started, please share your company's **About page link** or **upload a short document** describing your company.",
  //   "Hello and welcome. I'm here to guide you step by step in building your marketing campaign.\nLet's begin with the essentials—please provide your company's **About page** or **upload a profile document** so I can understand your brand better.",
  //   "Welcome aboard. Before we dive into your campaign, I'd like to learn a bit about your company.\nPlease share your **About page link** or **upload a brief company overview document** to help me get started.",
  //   "It's great to have you here. Together, we'll create a campaign designed around your brand's story and goals.\nFirst, could you share your **About page** or **upload a company document** so we can begin shaping your campaign strategy?"
  // ];

  // Function to get a random welcome message
  // const getRandomWelcomeMessage = () => {
  //   const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  //   return welcomeMessages[randomIndex];
  // };


  // Function to save display messages to localStorage
  // const saveDisplayMessagesToStorage = (displayMessages: Message[]) => {
  //   try {
  //     localStorage.setItem('campaigner-chat-display', JSON.stringify(displayMessages));
  //   } catch (error) {
  //     console.error('Error saving display messages to localStorage:', error);
  //   }
  // };

  // Function to load display messages from localStorage
  // const loadDisplayMessagesFromStorage = (): Message[] => {
  //   try {
  //     const savedMessages = localStorage.getItem('campaigner-chat-display');
  //     if (savedMessages) {
  //       const parsedMessages = JSON.parse(savedMessages);
  //       // Convert timestamp strings back to Date objects
  //       return parsedMessages.map((msg: any) => ({
  //         ...msg,
  //         timestamp: new Date(msg.timestamp)
  //       }));
  //     }
  //   } catch (error) {
  //     console.error('Error loading display messages from localStorage:', error);
  //   }
  //   return [];
  // };

  // Function to start a new chat
  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setIsInitialTyping(false);
    setConversationHasFile(false); // Reset file upload flag for new chat
    onNewChat?.();
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialTyping, setIsInitialTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('cto');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [conversationHasFile, setConversationHasFile] = useState(false);
  const [attachedUrl, setAttachedUrl] = useState<string>('');

  // Debug state changes
  useEffect(() => {
    console.log('Uploaded file state changed:', uploadedFile);
  }, [uploadedFile]);

  useEffect(() => {
    console.log('Is uploading file state changed:', isUploadingFile);
  }, [isUploadingFile]);

  useEffect(() => {
    console.log('Conversation has file state changed:', conversationHasFile);
  }, [conversationHasFile]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new messages or typing changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Load chat from localStorage on component mount
  useEffect(() => {
    if (freshLogin) {
      startNewChat();
    } else {
      // const savedMessages = loadDisplayMessagesFromStorage();
      
      // if (savedMessages.length > 0) {
      //   setMessages(savedMessages);
      //   setIsInitialTyping(false);
      // } else {
      //   // Show initial typing animation for new users
      //   setIsInitialTyping(false);
      // }
    }
  }, [freshLogin]);

  // Sync external initial conversation id into local state
  useEffect(() => {
    setConversationId(initialConversationId ?? null);
  }, [initialConversationId]);

  // Load full conversation history when conversationId changes (from sidebar selection)
  useEffect(() => {
    const loadHistory = async (id: number) => {
      setIsLoadingHistory(true);
      setIsInitialTyping(false);
      setIsTyping(false);
      // Clear existing messages immediately so previous conversation disappears
      setMessages([]);
      try {
        const data = await apiClient.get<any>(`/conversations/${id}`);
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
        setMessages(mapped);
        
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
        console.log('Checking conversation for file uploads:', { hasFileContent, messageCount: mapped.length, messages: mapped.map(m => ({ type: m.type, hasFile: m.hasFile, content: m.content.substring(0, 50) })) });
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

    if (conversationId) {
      void loadHistory(conversationId);
    } else {
      setMessages([]);
      setIsLoadingHistory(false);
    }
  }, [conversationId]);

  // useEffect(() => {
  //   if (messages.length > 0) {
  //     saveDisplayMessagesToStorage(messages);
  //   }
  // }, [messages]);

  // useEffect(() => {
  //   try {
  //     if (conversationId) {
  //       localStorage.setItem('neel-taylor-conversation-id', String(conversationId));
  //     } else {
  //       localStorage.removeItem('neel-taylor-conversation-id');
  //     }
  //   } catch {}
  // }, [conversationId]);

  const personas = [
    { id: 'cto', label: 'Chief Technology Officer', description: 'Tech-focused, efficiency-driven' },
    { id: 'cmo', label: 'Chief Marketing Officer', description: 'Brand-focused, growth-oriented' },
    { id: 'startup', label: 'Startup Founder', description: 'Innovative, resource-conscious' },
    { id: 'enterprise', label: 'Enterprise Executive', description: 'ROI-focused, strategic' }
  ];


  const sendMessageWithContent = async (content: string) => {
    setIsTyping(true);

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

      // Debug: log exact multipart payload
      const debugEntries1: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        debugEntries1[key] = value instanceof File 
          ? { kind: 'file', name: value.name, size: value.size, type: value.type }
          : value;
      });
      console.log('POST /chat payload', debugEntries1);

      const data = await apiClient.post<APIResponse>('/chat', formData);
      console.log('Received API response:', data);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.msg || 'I received your information but couldn\'t process it properly. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);

      // Persist conversation id from response if present
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        onConversationIdChange?.(data.conversation_id);
      }
      if (typeof data.knowledge_base_uploaded === 'boolean') {
        setConversationHasFile(data.knowledge_base_uploaded);
        if (data.knowledge_base_uploaded) {
          setAttachedUrl('');
          setIsUploadingFile(false);
        }
      }
    } catch (error) {
      console.error('Error calling API:', error);
      
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
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
      persona: selectedPersona,
      hasFile: !!uploadedFile
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    console.log('Clearing uploaded file before sending');
    setUploadedFile(null); // Clear file immediately when sending
    if (uploadedFile) {
      setConversationHasFile(true); // Mark conversation as having had a file
    }
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('query', input);
      formData.append('conversation_id', String(conversationId || 0));
      if (attachedUrl) {
        formData.append('URL', attachedUrl);
        formData.append('conversation_id', String(conversationId || 0));
      }
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      // Debug: log exact multipart payload
      const debugEntries2: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        debugEntries2[key] = value instanceof File 
          ? { kind: 'file', name: value.name, size: value.size, type: value.type }
          : value;
      });
      console.log('POST /chat payload', debugEntries2);

      const data = await apiClient.post<APIResponse>('/chat', formData);
      console.log('Received API response:', data);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.msg || 'I received your message but couldn\'t process it properly. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);

      // Persist conversation id from response if present
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
        onConversationIdChange?.(data.conversation_id);
      }
      if (typeof data.knowledge_base_uploaded === 'boolean') {
        setConversationHasFile(data.knowledge_base_uploaded);
        if (data.knowledge_base_uploaded) {
          setAttachedUrl('');
          setIsUploadingFile(false);
        }
      }
    } catch (error) {
      console.error('Error calling API:', error);
      
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
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
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
              <h2 className="text-xl font-semibold">AI Campaign Creator</h2>
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
        <div className="max-w-2xl mx-auto space-y-4">
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
        {isLoadingHistory && (
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
            className={`flex items-start space-x-3 ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`aspect-square h-8 rounded-lg flex items-center justify-center ${
              message.type === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-gradient-primary text-primary-foreground shadow-glow'
            }`}>
              {message.type === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w- h-4" />
              )}
            </div>
            <Card className={`max-w-2xl p-4 shadow-soft ${
              message.type === 'user' 
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
              <div className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }} />
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
                  <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">PDF</span>
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
            <div className="flex items-center bg-muted rounded-full border border-input pl-4 pr-2 py-2 min-h-12 max-h-20 ">
              {/* Input field */}
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask AI to create a marketing campaign for your company"
                className="flex-1 border-0 bg-transparent px-2 py-0 min-h-6 max-h-16 resize-none text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 overflow-hidden"
                style={{ 
                  height: '1.5rem',
                  lineHeight: '1.5rem'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '1.5rem';
                  const newHeight = Math.min(target.scrollHeight, 64); // 64px = 4 lines
                  target.style.height = newHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              
              {/* Right side actions */}
              <div className="flex items-center space-x-2 ml-3">
                <UploadModal 
                  onFileSelected={(file) => { setIsUploadingFile(true); handleFileSelected(file); }}
                  onLinkSelected={(url) => { setAttachedUrl(url); setIsUploadingFile(false); }}
                  hasUploadedFile={!!uploadedFile || isUploadingFile || conversationHasFile}
                >
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                    title={
                      conversationHasFile
                        ? "A knowledge base is already attached to this conversation"
                        : (isUploadingFile || uploadedFile)
                        ? "Uploading..."
                        : "Upload file or link"
                    }
                    disabled={isUploadingFile || !!uploadedFile || conversationHasFile}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </UploadModal>

                <Button 
                  variant="default" 
                  size="sm"
                  className="h-8 px-3 rounded-full"
                  title="Send message"
                  onClick={sendMessage}
                  disabled={!input.trim() || isTyping}
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