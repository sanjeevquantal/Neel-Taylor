import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UploadModal } from "@/components/UploadModal";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Upload
} from "lucide-react";

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

// New interface for API messages
interface APIMessage {
  role: 'user' | 'system';
  content: string;
}

// New interface for API request
interface APIRequest {
  query: string;
  history: APIMessage[];
}

// New interface for API response
interface APIResponse {
  msg?: string;
  response?: string;
  message?: string;
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
}

export const ChatInterface = ({ freshLogin = false }: ChatInterfaceProps) => {
  // Array of welcome messages to randomly select from
  const welcomeMessages = [
    "Welcome, glad to have you here. I'll help you create a marketing campaign that truly fits your brand.\nTo get started, please share your company's **About page link** or **upload a short document** describing your company.",
    "Hello and welcome. I'm here to guide you step by step in building your marketing campaign.\nLet's begin with the essentials—please provide your company's **About page** or **upload a profile document** so I can understand your brand better.",
    "Welcome aboard. Before we dive into your campaign, I'd like to learn a bit about your company.\nPlease share your **About page link** or **upload a brief company overview document** to help me get started.",
    "It's great to have you here. Together, we'll create a campaign designed around your brand's story and goals.\nFirst, could you share your **About page** or **upload a company document** so we can begin shaping your campaign strategy?"
  ];

  // Function to get a random welcome message
  const getRandomWelcomeMessage = () => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    return welcomeMessages[randomIndex];
  };

  // Function to save chat history to localStorage in the required JSON format
  const saveChatHistoryToStorage = (history: APIMessage[]) => {
    try {
      localStorage.setItem('neel-taylor-conversation-history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving chat history to localStorage:', error);
    }
  };

  // Function to load chat history from localStorage
  const loadChatHistoryFromStorage = (): APIMessage[] => {
    try {
      const savedHistory = localStorage.getItem('neel-taylor-conversation-history');
      if (savedHistory) {
        return JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error('Error loading chat history from localStorage:', error);
    }
    return [];
  };

  // Function to save display messages to localStorage
  const saveDisplayMessagesToStorage = (displayMessages: Message[]) => {
    try {
      localStorage.setItem('campaigner-chat-display', JSON.stringify(displayMessages));
    } catch (error) {
      console.error('Error saving display messages to localStorage:', error);
    }
  };

  // Function to load display messages from localStorage
  const loadDisplayMessagesFromStorage = (): Message[] => {
    try {
      const savedMessages = localStorage.getItem('campaigner-chat-display');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert timestamp strings back to Date objects
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading display messages from localStorage:', error);
    }
    return [];
  };

  // Function to start a new chat
  const startNewChat = () => {
    setMessages([]);
    setChatHistory([]);
    setIsInitialTyping(true);
    localStorage.removeItem('neel-taylor-conversation-history');
    localStorage.removeItem('campaigner-chat-display');
    
    // Show typing animation for new chat
    const timer = setTimeout(() => {
      setIsInitialTyping(false);
      const newWelcomeMessage = {
        id: Date.now().toString(),
        type: 'assistant' as const,
        content: getRandomWelcomeMessage(),
        timestamp: new Date()
      };
      setMessages([newWelcomeMessage]);
      saveDisplayMessagesToStorage([newWelcomeMessage]);
    }, 2000);
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<APIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialTyping, setIsInitialTyping] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('cto');

  // Load chat from localStorage on component mount
  useEffect(() => {
    if (freshLogin) {
      startNewChat();
    } else {
      const savedHistory = loadChatHistoryFromStorage();
      const savedMessages = loadDisplayMessagesFromStorage();
      
      if (savedHistory.length > 0 && savedMessages.length > 0) {
        setChatHistory(savedHistory);
        setMessages(savedMessages);
        setIsInitialTyping(false);
      } else {
        // Show initial typing animation for new users
        setIsInitialTyping(true);
        const timer = setTimeout(() => {
          setIsInitialTyping(false);
          const welcomeMessage = {
            id: Date.now().toString(),
            type: 'assistant' as const,
            content: getRandomWelcomeMessage(),
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
          saveDisplayMessagesToStorage([welcomeMessage]);
        }, 2000);
      }
    }
  }, [freshLogin]);

  // Save chat history and display messages to localStorage whenever they change
  useEffect(() => {
    if (chatHistory.length > 0) {
      saveChatHistoryToStorage(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    if (messages.length > 0) {
      saveDisplayMessagesToStorage(messages);
    }
  }, [messages]);

  const personas = [
    { id: 'cto', label: 'Chief Technology Officer', description: 'Tech-focused, efficiency-driven' },
    { id: 'cmo', label: 'Chief Marketing Officer', description: 'Brand-focused, growth-oriented' },
    { id: 'startup', label: 'Startup Founder', description: 'Innovative, resource-conscious' },
    { id: 'enterprise', label: 'Enterprise Executive', description: 'ROI-focused, strategic' }
  ];

  const handleUploadSuccess = (message: string) => {
    // The message now contains the actual file content or URL content
    console.log('Upload success - Content received:', message);
    
    // Add the content to chat
    const uploadMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      persona: selectedPersona
    };
    
    setMessages(prev => [...prev, uploadMessage]);
    
    // Update chat history for API
    const newHistoryEntry: APIMessage = {
      role: 'user',
      content: message
    };
    setChatHistory(prev => [...prev, newHistoryEntry]);
    
    // Trigger AI response
    setTimeout(() => {
      sendMessageWithContent(message);
    }, 500);
  };

  const sendMessageWithContent = async (content: string) => {
    setIsTyping(true);

    try {
      // Prepare the API request with current history
      const apiRequest: APIRequest = {
        query: content,
        history: chatHistory
      };

      console.log('Sending API request:', apiRequest);

      // Call the API with the new structure
      const response = await fetch('https://neeltaylor.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      console.log('Received API response:', data);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.msg || data.response || data.message || 'I received your information but couldn\'t process it properly. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Update chat history with the AI response
      const aiHistoryEntry: APIMessage = {
        role: 'system',
        content: data.msg || data.response || data.message || ''
      };
      setChatHistory(prev => [...prev, aiHistoryEntry]);
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
    
    // Update chat history for API
    const newHistoryEntry: APIMessage = {
      role: 'user',
      content: input
    };
    setChatHistory(prev => [...prev, newHistoryEntry]);
    
    setInput('');
    setIsTyping(true);

    try {
      // Prepare the API request with current history
      const apiRequest: APIRequest = {
        query: input,
        history: chatHistory
      };

      console.log('Sending API request:', apiRequest);

      // Call the API with the new structure
      const response = await fetch('https://neeltaylor.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: APIResponse = await response.json();
      console.log('Received API response:', data);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.msg || data.response || data.message || 'I received your message but couldn\'t process it properly. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Update chat history with the AI response
      const aiHistoryEntry: APIMessage = {
        role: 'system',
        content: data.msg || data.response || data.message || ''
      };
      setChatHistory(prev => [...prev, aiHistoryEntry]);
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

      {/* Messages - with bottom padding for fixed input */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* Initial typing animation */}
        {isInitialTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              message.type === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-gradient-primary text-primary-foreground shadow-glow'
            }`}>
              {message.type === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
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
              {message.type === 'assistant' && (
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-border/50">
                  {messages.findIndex(m => m.type === 'assistant') === messages.indexOf(message) && (
                    <>
                      <UploadModal onUploadSuccess={handleUploadSuccess}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex items-center space-x-2"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Document</span>
                        </Button>
                      </UploadModal>
                      
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
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
      </div>

      {/* Fixed Input Area at Bottom */}
      <div className="fixed bottom-0 left-64 right-0 border-t border-border/50 p-4 bg-gradient-card backdrop-blur-sm z-40 transition-all duration-300">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your marketing campaign needs... (e.g., 'Create an email campaign for SaaS product targeting CTOs')"
              className="min-h-[60px] resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>
          <Button 
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            className="h-[60px] px-6"
            variant="default"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>Press Enter to send, Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
};