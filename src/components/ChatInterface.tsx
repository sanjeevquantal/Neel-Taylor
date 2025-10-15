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
  Paperclip
} from "lucide-react";
import apiClient from "@/lib/api";
import { UploadModal } from "@/components/UploadModal";

// Simple markdown parser for basic formatting
const parseMarkdown = (text: string) => {
  return text
    // Bold text: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text: *text* -> <em>text</em>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code: `text` -> <code>text</code>
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
    // Links: [text](url) -> <a href="url">text</a>
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    // Line breaks: \n -> <br>
    .replace(/\n/g, '<br>')
    // Headers: # text -> <h3>text</h3>
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-2 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-3 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
    // Lists: - item -> <li>item</li>
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    // Wrap lists in <ul> tags
    .replace(/(<li.*<\/li>)/g, '<ul class="list-disc ml-4 my-2">$1</ul>');
};

// New interface for API request
interface APIRequest {
  query: string;
  conversation_id?: number | null;
}

// New interface for API response
interface APIResponse {
  error: string;
  msg: string;
  total_time: string;
  conversation_id: number;
}

// Display message interface
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: string;
}

interface ChatInterfaceProps {
  freshLogin?: boolean;
  isSidebarCollapsed?: boolean;
  initialConversationId?: number | null;
  onConversationIdChange?: (id: number | null) => void;
}

export const ChatInterface = ({ freshLogin = false, isSidebarCollapsed = false, initialConversationId = null, onConversationIdChange }: ChatInterfaceProps) => {
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
    localStorage.removeItem('neel-taylor-conversation-history');
    localStorage.removeItem('campaigner-chat-display');
    localStorage.removeItem('neel-taylor-conversation-id');
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialTyping, setIsInitialTyping] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('cto');
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
        }));
        setMessages(mapped);
      } catch (err) {
        console.error('Failed to load conversation history', err);
      }
    };

    if (conversationId) {
      void loadHistory(conversationId);
    } else {
      setMessages([]);
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
      // Prepare the API request - backend will load history from DB
      const apiRequest: APIRequest = { query: content };
      if (conversationId) {
        apiRequest.conversation_id = conversationId;
      }

      console.log('Sending API request:', apiRequest);

      // Call the API via client to backend /api/chat
      const data = await apiClient.post<APIResponse>('/chat', apiRequest);
      console.log('Received API response:', data);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.msg || 'I received your information but couldn\'t process it properly. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);

      // Persist conversation id from response if present
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
        onConversationIdChange?.(data.conversation_id);
        try { localStorage.setItem('neel-taylor-conversation-id', String(data.conversation_id)); } catch {}
      }
    } catch (error) {
      console.error('Error calling API:', error);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your information. Please try again later.',
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
      persona: selectedPersona
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Prepare the API request - backend will load history from DB
      const apiRequest: APIRequest = { query: input };
      if (conversationId) {
        apiRequest.conversation_id = conversationId;
      }

      console.log('Sending API request:', apiRequest);

      // Call the API via client to backend /api/chat
      const data = await apiClient.post<APIResponse>('/chat', apiRequest);
      console.log('Received API response:', data);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.msg || 'I received your message but couldn\'t process it properly. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);

      // Persist conversation id from response if present
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
        onConversationIdChange?.(data.conversation_id);
        try { localStorage.setItem('neel-taylor-conversation-id', String(data.conversation_id)); } catch {}
      }
    } catch (error) {
      console.error('Error calling API:', error);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again later.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleUploadSuccess = (content: string) => {
    // Create a user message that mirrors ChatGPT's behavior of showing the raw content
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
      persona: selectedPersona
    };
    setMessages(prev => [...prev, userMessage]);
    // Immediately send to backend using helper that accepts provided content
    void sendMessageWithContent(content);
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
              <p className="text-sm text-muted-foreground">Chat with AI to generate marketing campaigns</p>
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
                <div className={`flex items-center ${message.type === 'user' && message.content.length < 10 ? 'space-x-8' : 'space-x-6'}`}>
                  <span className="font-medium">
                    {message.type === 'user' ? 'You' : 'CampAIgn AI'}
                  </span>
                  {message.type === 'assistant' && message.persona && (
                    <Badge variant="secondary" className="text-xs">
                      {personas.find(p => p.id === message.persona)?.label}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }} />
              {/* Upload UI removed */}
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
      <div className={`fixed bottom-0 right-0 border-border/50 p-4 bg-transparent z-40 transition-all duration-300 ${
        isSidebarCollapsed ? 'left-16' : 'left-64'
      }`}>
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="flex items-center bg-muted rounded-full border border-input pl-4 pr-2 py-2 min-h-12 max-h-20">
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
                <UploadModal onUploadSuccess={handleUploadSuccess}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-muted-foreground/10"
                    title="Upload file or link"
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
          {/*<div className="flex items-center justify-center mt-3 text-xs text-muted-foreground">
            <span> Enter to send, Shift + Enter for new line</span>
          </div>*/}
        </div>
      </div>
    </div>
  );
};