import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Send,
  Bot,
  User,
  Loader2,
  Plus,
  MessageSquare,
  Settings,
  Sparkles,
  Image as ImageIcon,
  Moon,
  TrendingUp,
  Music,
  Play,
  Trash2,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "model";
  content: string;
  createdAt: Date | null;
  insights?: string[];
  actions?: string[];
  emotionalState?: {
    sentiment: number;
    energy: number;
    stress: number;
    clarity: number;
  };
  confidence?: number;
  imageUrl?: string;
  metadata?: {
    imageUrl?: string;
    imageUrls?: string[];
    [key: string]: any;
  };
}

const DEFAULT_USER_ID = "duygu-motor-user-1";

const extractImageUrls = (content: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)(\?[^\s]*)?)/gi;
  const cloudFrontRegex = /(https?:\/\/[a-z0-9]+\.cloudfront\.net\/[^\s]+)/gi;
  const dataUrlRegex = /(data:image\/(png|jpg|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+)/gi;
  
  const matches: string[] = [];
  let match;
  while ((match = urlRegex.exec(content)) !== null) matches.push(match[1]);
  while ((match = cloudFrontRegex.exec(content)) !== null) {
    if (!matches.includes(match[1])) matches.push(match[1]);
  }
  while ((match = dataUrlRegex.exec(content)) !== null) {
    if (!matches.includes(match[1])) matches.push(match[1]);
  }
  return matches;
};

export default function AIChatPage() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const fallbackChatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const res = await apiRequest("POST", "/api/chat/message", {
        userId: DEFAULT_USER_ID,
        message: userMessage,
      });
      return res.json();
    },
    onSuccess: async () => {
      setPendingMessage(null);
      await queryClient.refetchQueries({ queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`] });
      toast({
        title: "Yanit alindi",
        description: "Mesaj basariyla iletildi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Chat Hatasi",
        description: error.message || "Mesaj gonderilemedi",
        variant: "destructive",
      });
      setPendingMessage(null);
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const sendMessage = async (userMessage: string) => {
    setIsLoading(true);
    setStreamedText("");
    
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEFAULT_USER_ID, message: userMessage }),
      });
      
      if (!response.ok) throw new Error('API error');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      
      const decoder = new TextDecoder();
      let fullText = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content') {
                fullText = data.data;
                setStreamedText(fullText);
              } else if (data.type === 'final') {
                fullText = data.data?.message || fullText;
                setStreamedText(fullText);
              }
            } catch (e) {}
          }
        }
      }
      
      // Keep response visible (don't clear)
      // await queryClient.refetchQueries({ queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`] });
      // Don't clear streamedText - let user see the response!
      setPendingMessage(null);
      
      toast({
        title: "✅ Cevap alindi!",
        description: "AI yanit verdi",
      });
      
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Mesaj gonderilemedi",
        variant: "destructive",
      });
      // Try fallback
      fallbackChatMutation.mutate(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const { data: historyData, isLoading: historyLoading } = useQuery<{
    status: string;
    history: ChatMessage[];
    count: number;
  }>({
    queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`],
  });

  const commandMutation = useMutation({
    mutationFn: async ({ command, query }: { command: string; query?: string }) => {
      const res = await apiRequest("POST", "/api/chat/command", {
        userId: DEFAULT_USER_ID,
        command,
        query,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`] });
      toast({
        title: `@${data.command} Sonuclari`,
        description: `${data.count || 0} sonuc bulundu`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Komut Hatasi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action }: { action: string }) => {
      const res = await apiRequest("POST", "/api/chat/action", {
        userId: DEFAULT_USER_ID,
        action,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`] });
      toast({
        title: "Aksiyon Yurutuldu",
        description: data.message || "Islem tamamlandi",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Aksiyon Hatasi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyData?.history, isLoading, streamedText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || isLoading || commandMutation.isPending || fallbackChatMutation.isPending) return;
    
    const trimmedMessage = message.trim();
    
    if (trimmedMessage.startsWith('@')) {
      const parts = trimmedMessage.split(' ');
      const command = parts[0];
      const query = parts.slice(1).join(' ');
      commandMutation.mutate({ command, query });
      setMessage("");
      return;
    }
    
    setPendingMessage(trimmedMessage);
    sendMessage(trimmedMessage);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const newSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/new-session", {
        userId: DEFAULT_USER_ID,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`] });
      toast({ title: "Yeni sohbet baslatildi" });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/history/${DEFAULT_USER_ID}?activeSession=true`] });
      toast({ title: "Yeni sohbet baslatildi" });
    },
  });

  const handleNewChat = () => {
    newSessionMutation.mutate();
  };

  const handleSuggestion = (text: string) => {
    setMessage(text);
    textareaRef.current?.focus();
  };

  const handleAction = (action: string | any) => {
    let actionPayload: string;
    
    if (typeof action === 'object') {
      if (action.tool || action.toolName) {
        actionPayload = JSON.stringify({
          tool: action.tool || action.toolName,
          args: action.args || action.parameters || {}
        });
      } else {
        actionPayload = JSON.stringify(action);
      }
    } else {
      actionPayload = action;
    }
    
    actionMutation.mutate({ action: actionPayload });
  };

  const handleCommand = (cmd: string) => {
    setMessage(cmd + " ");
    textareaRef.current?.focus();
  };

  const getImageFromMessage = (msg: ChatMessage): string[] => {
    const images: string[] = [];
    
    const metadataImage = msg.imageUrl || msg.metadata?.imageUrl;
    if (metadataImage) images.push(metadataImage);
    
    const metadataImages = msg.metadata?.imageUrls;
    if (Array.isArray(metadataImages)) {
      metadataImages.forEach(url => {
        if (!images.includes(url)) images.push(url);
      });
    }
    
    const contentImages = extractImageUrls(msg.content);
    contentImages.forEach(url => {
      if (!images.includes(url)) images.push(url);
    });
    
    return images;
  };

  return (
    <div className="flex h-full bg-[#212121]" data-testid="page-ai-chat">
      {/* Left Sidebar */}
      {sidebarOpen && (
        <div className="w-64 flex flex-col border-r bg-[#171717] border-[#2f2f2f]">
          {/* New Chat Button */}
          <div className="p-3">
            <Button
              onClick={handleNewChat}
              variant="outline"
              className="w-full justify-start gap-2 text-sm font-normal bg-transparent border-[#4e4e4e] text-[#ececf1] hover:bg-[#2f2f2f]"
              data-testid="btn-new-chat"
            >
              <Plus className="h-4 w-4" />
              Yeni Sohbet
            </Button>
          </div>

          {/* Quick Commands */}
          <div className="px-3 py-2">
            <p className="text-xs text-[#8e8ea0] mb-2 px-2">Hizli Komutlar</p>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececf1]"
                onClick={() => handleCommand("@ruya")}
                data-testid="btn-cmd-dream"
              >
                <Moon className="h-3 w-3" />
                @ruya - Ruya ara
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececf1]"
                onClick={() => handleCommand("@trend")}
                data-testid="btn-cmd-trend"
              >
                <TrendingUp className="h-3 w-3" />
                @trend - Trendler
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececf1]"
                onClick={() => handleCommand("@spotify")}
                data-testid="btn-cmd-spotify"
              >
                <Music className="h-3 w-3" />
                @spotify - Muzik
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececf1]"
                onClick={() => handleCommand("@gorsel")}
                data-testid="btn-cmd-image"
              >
                <ImageIcon className="h-3 w-3" />
                @gorsel - Görsel Üret
              </Button>
            </div>
          </div>

          {/* Chat History */}
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-1 py-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer bg-[#2f2f2f]">
                <MessageSquare className="h-4 w-4 text-[#ececf1]" />
                <span className="text-sm truncate text-[#ececf1]">
                  Mevcut Sohbet
                </span>
              </div>
            </div>
          </ScrollArea>

          {/* Settings */}
          <div className="p-3 border-t border-[#2f2f2f]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm font-normal text-[#b4b4b4] hover:bg-[#2f2f2f]"
                  data-testid="btn-settings"
                >
                  <Settings className="h-4 w-4" />
                  Ayarlar
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-64 bg-[#2f2f2f] border-[#444654] text-[#ececf1]"
                side="top"
                align="start"
              >
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Ayarlar</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clear-history" className="text-xs text-[#b4b4b4]">
                      Gecmisi Temizle
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        newSessionMutation.mutate();
                      }}
                      disabled={newSessionMutation.isPending}
                      className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      data-testid="btn-clear-history"
                    >
                      {newSessionMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-[10px] text-[#6b6b6b] pt-2 border-t border-[#444654]">
                    Merf.ai v3.2
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#212121]">
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-[#2f2f2f]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-[#b4b4b4] hover:bg-[#2f2f2f]"
              data-testid="btn-toggle-sidebar"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <span className="text-sm font-medium text-[#ececf1]">
              Merf.ai
            </span>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto py-6 px-4">
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#10a37f]" />
              </div>
            ) : historyData?.history && historyData.history.length > 0 ? (
              <div className="space-y-6">
                {historyData.history.map((msg, idx) => {
                  const images = getImageFromMessage(msg);
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex gap-4"
                      data-testid={`chat-message-${idx}`}
                    >
                      {/* Avatar */}
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === "model" ? "bg-[#10a37f]" : "bg-[#5436da]"
                        }`}
                      >
                        {msg.role === "model" ? (
                          <Bot className="h-5 w-5 text-white" />
                        ) : (
                          <User className="h-5 w-5 text-white" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm mb-1 text-[#ececf1]">
                          {msg.role === "model" ? "Merf" : "Sen"}
                        </div>
                        <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-[#d1d5db]">
                          {msg.content}
                        </div>

                        {/* Images */}
                        {images.length > 0 && (
                          <div className="mt-4 space-y-3">
                            {images.map((url, imgIdx) => (
                              <div 
                                key={imgIdx} 
                                className="relative rounded-xl overflow-hidden max-w-md bg-[#2f2f2f]"
                              >
                                <img 
                                  src={url} 
                                  alt={`Gorsel ${imgIdx + 1}`}
                                  className="w-full object-contain max-h-[400px]"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                {url.startsWith('data:') && (
                                  <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs px-2 py-1 rounded bg-black/60 text-white">
                                    <ImageIcon className="h-3 w-3" />
                                    AI Uretimi
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        {msg.role === "model" && msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {msg.actions.slice(0, 3).map((action, i) => {
                              const displayText = typeof action === 'string' 
                                ? (action.length > 30 ? action.substring(0, 30) + "..." : action)
                                : (action as any)?.tool || (action as any)?.toolName
                                  ? `${(action as any).tool || (action as any).toolName}`
                                  : "Calistir";
                              return (
                                <Button
                                  key={i}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 bg-transparent border-[#3f3f3f] text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececf1]"
                                  onClick={() => handleAction(action)}
                                  disabled={actionMutation.isPending}
                                  data-testid={`btn-action-${idx}-${i}`}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  {displayText}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-[#10a37f]">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-[#ececf1]">
                  Merhaba!
                </h2>
                <p className="text-center max-w-md mb-8 text-[#8e8ea0]">
                  Sosyal medya analitiği, müzik trendleri, ruya yorumu veya gorsel uretimi icin bana soru sorabilirsin.
                </p>
                
                {/* Suggestions */}
                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                  {[
                    { text: "Bana guzel bir bulut resmi olustur", icon: ImageIcon },
                    { text: "TikTok'ta bu hafta neler trend?", icon: Sparkles },
                    { text: "Dun gece garip bir ruya gordum", icon: MessageSquare },
                    { text: "Spotify'da hangi turler populer?", icon: MessageSquare },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestion(item.text)}
                      className="flex items-start gap-3 p-4 rounded-xl text-left transition-colors bg-[#2f2f2f] text-[#ececf1] border border-[#3f3f3f] hover:bg-[#3f3f3f]"
                      data-testid={`btn-suggestion-${idx}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#8e8ea0]" />
                      <span className="text-sm">{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback Loading */}
            {fallbackChatMutation.isPending && (
              <div className="flex gap-4 mt-6" data-testid="fallback-loading">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#10a37f]">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1 text-[#ececf1]">
                    DuyguMotor
                  </div>
                  <div className="text-[15px] leading-relaxed text-[#8e8ea0] flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Alternatif yontemle yanit aliniyor...
                  </div>
                </div>
              </div>
            )}

            {/* Streaming Response */}
            {isLoading && (
              <div className="flex gap-4 mt-6" data-testid="streaming-response">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#10a37f]">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1 text-[#ececf1]">
                    DuyguMotor
                  </div>
                  <div className="text-[15px] leading-relaxed text-[#d1d5db]">
                    {streamedText || (
                      <span className="flex items-center gap-2 text-[#8e8ea0]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dusunuyorum...
                      </span>
                    )}
                    {streamedText && (
                      <span className="inline-block w-2 h-5 ml-1 animate-pulse bg-[#10a37f]" />
                    )}
                  </div>

                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 bg-[#212121]">
          <div className="max-w-3xl mx-auto relative rounded-2xl bg-[#2f2f2f] border border-[#3f3f3f]">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesaj yaz..."
              className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-[15px] focus:outline-none text-[#ececf1] placeholder:text-[#6b6b6b]"
              style={{ minHeight: '52px', maxHeight: '200px' }}
              rows={1}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading || commandMutation.isPending || fallbackChatMutation.isPending}
              size="icon"
              className={`absolute right-2 bottom-2 rounded-lg transition-colors ${
                message.trim() ? "bg-[#10a37f] hover:bg-[#0d8c6d]" : "bg-[#3f3f3f]"
              } text-white`}
              data-testid="btn-send-message"
            >
              {isLoading || commandMutation.isPending || fallbackChatMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-center text-xs mt-3 text-[#6b6b6b]">
            DuyguMotor v3.2 - Claude AI ile guclendirilmis
          </p>
        </div>
      </div>
    </div>
  );
}
