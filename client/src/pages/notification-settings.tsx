import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Trash2, TestTube, Check, X, MessageSquare, Globe, Plus, RefreshCw, Loader2 } from "lucide-react";
import { SiTelegram, SiDiscord } from "react-icons/si";

interface NotificationTarget {
  id: string;
  userId: string | null;
  targetType: string;
  targetId: string;
  isActive: number;
  filters: {
    symbols?: string[];
    minConfidence?: number;
    signalTypes?: string[];
  } | null;
  createdAt: string;
}

interface TelegramBotInfo {
  configured: boolean;
  valid?: boolean;
  botName?: string;
  botId?: number;
  error?: string;
}

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [newTargetType, setNewTargetType] = useState<string>("telegram");
  const [newTargetId, setNewTargetId] = useState("");
  const [testTargetType, setTestTargetType] = useState<string>("telegram");
  const [testTargetId, setTestTargetId] = useState("");
  const [filterSymbols, setFilterSymbols] = useState("");
  const [filterMinConfidence, setFilterMinConfidence] = useState<string>("50");
  const [filterSignalTypes, setFilterSignalTypes] = useState<string[]>([]);

  const { data: targetsData, isLoading: targetsLoading } = useQuery<{ success: boolean; targets: NotificationTarget[]; count: number }>({
    queryKey: ["/api/notifications/targets"],
  });

  const { data: telegramInfo, isLoading: telegramLoading } = useQuery<TelegramBotInfo & { success: boolean }>({
    queryKey: ["/api/notifications/telegram/info"],
  });

  const addTargetMutation = useMutation({
    mutationFn: async (data: { targetType: string; targetId: string; filters?: any }) => {
      const res = await apiRequest("POST", "/api/notifications/targets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/targets"] });
      setNewTargetId("");
      toast({ title: "Bildirim hedefi eklendi", description: "Yeni bildirim kanalı başarıyla yapılandırıldı." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteTargetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/notifications/targets/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/targets"] });
      toast({ title: "Silindi", description: "Bildirim hedefi devre dışı bırakıldı." });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async (data: { targetType: string; targetId: string }) => {
      const res = await apiRequest("POST", "/api/notifications/test", data);
      return res.json();
    },
    onSuccess: (result: any) => {
      if (result.success) {
        toast({ title: "Test Başarılı", description: "Test bildirimi gönderildi!" });
      } else {
        toast({ title: "Test Başarısız", description: result.result?.error || "Bildirim gönderilemedi", variant: "destructive" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const handleAddTarget = () => {
    if (!newTargetId.trim()) {
      toast({ title: "Hata", description: "Hedef ID gerekli", variant: "destructive" });
      return;
    }

    const filters: any = {};
    if (filterSymbols.trim()) {
      filters.symbols = filterSymbols.split(",").map(s => s.trim().toUpperCase());
    }
    if (filterMinConfidence) {
      filters.minConfidence = parseInt(filterMinConfidence);
    }
    if (filterSignalTypes.length > 0) {
      filters.signalTypes = filterSignalTypes;
    }

    addTargetMutation.mutate({
      targetType: newTargetType,
      targetId: newTargetId.trim(),
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
  };

  const handleTestNotification = () => {
    if (!testTargetId.trim()) {
      toast({ title: "Hata", description: "Test hedef ID gerekli", variant: "destructive" });
      return;
    }
    testNotificationMutation.mutate({
      targetType: testTargetType,
      targetId: testTargetId.trim(),
    });
  };

  const getTargetIcon = (type: string) => {
    switch (type) {
      case "telegram": return <SiTelegram className="w-4 h-4" />;
      case "discord": return <SiDiscord className="w-4 h-4" />;
      case "webhook": return <Globe className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTargetLabel = (type: string) => {
    switch (type) {
      case "telegram": return "Telegram";
      case "discord": return "Discord";
      case "webhook": return "Webhook";
      case "email": return "E-posta";
      default: return type;
    }
  };

  const targets = targetsData?.targets || [];

  return (
    <div className="p-6 space-y-6" data-testid="page-notification-settings">
      <div className="flex items-center gap-3">
        <Bell className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Bildirim Ayarları</h1>
          <p className="text-muted-foreground">Telegram ve Discord üzerinden sinyal bildirimleri alın</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SiTelegram className="w-5 h-5 text-[#0088cc]" />
              Telegram Durumu
            </CardTitle>
            <CardDescription>Telegram bot bağlantısı</CardDescription>
          </CardHeader>
          <CardContent>
            {telegramLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Kontrol ediliyor...
              </div>
            ) : telegramInfo?.configured ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {telegramInfo.valid ? (
                    <Badge variant="default" className="bg-green-600" data-testid="badge-telegram-status">
                      <Check className="w-3 h-3 mr-1" />
                      Bağlı
                    </Badge>
                  ) : (
                    <Badge variant="destructive" data-testid="badge-telegram-status">
                      <X className="w-3 h-3 mr-1" />
                      Geçersiz Token
                    </Badge>
                  )}
                </div>
                {telegramInfo.botName && (
                  <p className="text-sm text-muted-foreground">
                    Bot: <span className="font-medium">@{telegramInfo.botName}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="secondary" data-testid="badge-telegram-status">
                  <X className="w-3 h-3 mr-1" />
                  Yapılandırılmamış
                </Badge>
                <p className="text-sm text-muted-foreground">
                  TELEGRAM_BOT_TOKEN ortam değişkenini ayarlayın
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5 text-primary" />
              Bildirim Testi
            </CardTitle>
            <CardDescription>Bildirimleri kaydetmeden test edin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={testTargetType} onValueChange={setTestTargetType}>
                  <SelectTrigger data-testid="select-test-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {testTargetType === "telegram" ? "Chat ID" : 
                   testTargetType === "discord" ? "Webhook URL" : "Webhook URL"}
                </Label>
                <Input 
                  value={testTargetId} 
                  onChange={(e) => setTestTargetId(e.target.value)}
                  placeholder={testTargetType === "telegram" ? "123456789" : "https://..."}
                  data-testid="input-test-target-id"
                />
              </div>
            </div>
            <Button 
              onClick={handleTestNotification} 
              disabled={testNotificationMutation.isPending}
              className="w-full"
              data-testid="button-test-notification"
            >
              {testNotificationMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Test Bildirimi Gönder
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Yeni Bildirim Hedefi Ekle
          </CardTitle>
          <CardDescription>Sinyal bildirimleri için yeni bir kanal ekleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={newTargetType} onValueChange={setNewTargetType}>
                <SelectTrigger data-testid="select-new-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {newTargetType === "telegram" ? "Chat ID" : 
                 newTargetType === "discord" ? "Webhook URL" : "Webhook URL"}
              </Label>
              <Input 
                value={newTargetId} 
                onChange={(e) => setNewTargetId(e.target.value)}
                placeholder={newTargetType === "telegram" ? "123456789" : "https://..."}
                data-testid="input-new-target-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Semboller (opsiyonel)</Label>
              <Input 
                value={filterSymbols} 
                onChange={(e) => setFilterSymbols(e.target.value)}
                placeholder="AAPL, MSFT, TSLA"
                data-testid="input-filter-symbols"
              />
            </div>
            <div className="space-y-2">
              <Label>Min. Güven %</Label>
              <Input 
                type="number" 
                min="0" 
                max="100"
                value={filterMinConfidence} 
                onChange={(e) => setFilterMinConfidence(e.target.value)}
                placeholder="50"
                data-testid="input-filter-confidence"
              />
            </div>
          </div>
          <Button 
            onClick={handleAddTarget} 
            disabled={addTargetMutation.isPending}
            data-testid="button-add-target"
          >
            {addTargetMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Hedef Ekle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Aktif Bildirim Hedefleri
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/notifications/targets"] })}
              data-testid="button-refresh-targets"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
          <CardDescription>Yapılandırılmış bildirim kanalları</CardDescription>
        </CardHeader>
        <CardContent>
          {targetsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-targets">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Henüz bildirim hedefi eklenmemiş</p>
              <p className="text-sm">Yukarıdan yeni bir hedef ekleyin</p>
            </div>
          ) : (
            <div className="space-y-3">
              {targets.map((target) => (
                <div 
                  key={target.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border"
                  data-testid={`notification-target-${target.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      {getTargetIcon(target.targetType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getTargetLabel(target.targetType)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {target.targetType === "telegram" ? "Chat" : "Webhook"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono truncate max-w-[300px]">
                        {target.targetId.length > 40 ? `${target.targetId.substring(0, 40)}...` : target.targetId}
                      </p>
                      {target.filters && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {target.filters.symbols && (
                            <Badge variant="outline" className="text-xs">
                              Semboller: {target.filters.symbols.join(", ")}
                            </Badge>
                          )}
                          {target.filters.minConfidence && (
                            <Badge variant="outline" className="text-xs">
                              Min: {target.filters.minConfidence}%
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteTargetMutation.mutate(target.id)}
                    disabled={deleteTargetMutation.isPending}
                    data-testid={`button-delete-target-${target.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kurulum Kılavuzu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <SiTelegram className="w-4 h-4 text-[#0088cc]" />
              Telegram Kurulumu
            </h3>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Telegram'da @BotFather'a mesaj gönderin</li>
              <li>/newbot komutuyla yeni bir bot oluşturun</li>
              <li>Bot token'ını TELEGRAM_BOT_TOKEN olarak kaydedin</li>
              <li>Bota /start mesajı gönderin</li>
              <li>@userinfobot'tan Chat ID'nizi öğrenin</li>
              <li>Chat ID'yi yukarıdaki forma ekleyin</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <SiDiscord className="w-4 h-4 text-[#5865F2]" />
              Discord Kurulumu
            </h3>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Discord sunucunuzda bir kanal seçin</li>
              <li>Kanal ayarlarından "Entegrasyonlar" bölümüne gidin</li>
              <li>"Webhook Oluştur" butonuna tıklayın</li>
              <li>Webhook URL'sini kopyalayın</li>
              <li>URL'yi yukarıdaki forma yapıştırın</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
