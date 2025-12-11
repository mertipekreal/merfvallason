import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { 
  Moon, 
  Loader2, 
  Sparkles,
  Eye,
  Palette,
  Tag,
  Zap,
  Heart,
  Target,
  AlertTriangle,
  Star,
  Smile
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const EMOTION_CATEGORIES = [
  { id: 'fear', label: 'Korku', icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { id: 'wonder', label: 'Merak', icon: Eye, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { id: 'peace', label: 'Huzur', icon: Heart, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { id: 'surprise', label: 'Şaşkınlık', icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { id: 'anticipation', label: 'Beklenti', icon: Target, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { id: 'trust', label: 'Güven', icon: Star, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
] as const;

const MOTIFS = [
  { id: 'water', label: 'Su', emoji: '💧' },
  { id: 'mirror', label: 'Ayna', emoji: '🪞' },
  { id: 'flight', label: 'Uçuş', emoji: '🪽' },
  { id: 'darkness', label: 'Karanlık', emoji: '🌑' },
  { id: 'light', label: 'Işık', emoji: '✨' },
  { id: 'door', label: 'Kapı', emoji: '🚪' },
  { id: 'stairs', label: 'Merdiven', emoji: '🪜' },
  { id: 'falling', label: 'Düşüş', emoji: '⬇️' },
  { id: 'chase', label: 'Takip', emoji: '🏃' },
  { id: 'family', label: 'Aile', emoji: '👨‍👩‍👧' },
  { id: 'animal', label: 'Hayvan', emoji: '🐺' },
  { id: 'vehicle', label: 'Araç', emoji: '🚗' },
] as const;

const VISUAL_COLORS = [
  { id: 'dark_blue', label: 'Koyu Mavi', color: '#1a237e' },
  { id: 'cyan', label: 'Camgöbeği', color: '#19b5b5' },
  { id: 'purple', label: 'Mor', color: '#7c3aed' },
  { id: 'gold', label: 'Altın', color: '#fbbf24' },
  { id: 'red', label: 'Kırmızı', color: '#ef4444' },
  { id: 'green', label: 'Yeşil', color: '#22c55e' },
  { id: 'black', label: 'Siyah', color: '#1f2937' },
  { id: 'white', label: 'Beyaz', color: '#f9fafb' },
] as const;

const CLARITY_LEVELS = [
  { value: 'low', label: 'Bulanık', description: 'Detaylar belirsiz' },
  { value: 'medium', label: 'Normal', description: 'Temel detaylar net' },
  { value: 'high', label: 'Kristal', description: 'Her detay net' },
] as const;

const locations = [
  { value: "ev", label: "Ev" },
  { value: "okul", label: "Okul" },
  { value: "is", label: "İş yeri" },
  { value: "dogal", label: "Doğal ortam" },
  { value: "sehir", label: "Şehir" },
  { value: "ulasim", label: "Ulaşım aracı" },
  { value: "bilinmeyen", label: "Bilinmeyen yer" },
  { value: "fantastik", label: "Fantastik mekan" },
  { value: "diger", label: "Diğer" },
];

const enhancedDreamFormSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır"),
  location: z.string().min(1, "Mekan seçiniz"),
  themes: z.string().optional(),
  objects: z.string().optional(),
  intensity: z.number().min(1).max(10).default(5),
  dreamDate: z.string(),
  emotionFear: z.number().min(0).max(100).default(0),
  emotionWonder: z.number().min(0).max(100).default(0),
  emotionPeace: z.number().min(0).max(100).default(0),
  emotionSurprise: z.number().min(0).max(100).default(0),
  emotionAnticipation: z.number().min(0).max(100).default(0),
  emotionTrust: z.number().min(0).max(100).default(0),
  selectedMotifs: z.array(z.string()).default([]),
  visualColor: z.string().optional(),
  clarity: z.enum(['low', 'medium', 'high']).default('medium'),
  mainCharacters: z.string().optional(),
});

type EnhancedDreamFormData = z.infer<typeof enhancedDreamFormSchema>;

interface EnhancedDreamFormProps {
  onSuccess?: () => void;
}

export function EnhancedDreamForm({ onSuccess }: EnhancedDreamFormProps) {
  const { toast } = useToast();
  const [advancedOpen, setAdvancedOpen] = useState(true);

  const form = useForm<EnhancedDreamFormData>({
    resolver: zodResolver(enhancedDreamFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      themes: "",
      objects: "",
      intensity: 5,
      dreamDate: new Date().toISOString().split('T')[0],
      emotionFear: 0,
      emotionWonder: 0,
      emotionPeace: 0,
      emotionSurprise: 0,
      emotionAnticipation: 0,
      emotionTrust: 0,
      selectedMotifs: [],
      visualColor: "",
      clarity: "medium",
      mainCharacters: "",
    },
  });

  const selectedMotifs = form.watch("selectedMotifs");

  const toggleMotif = (motifId: string) => {
    const current = form.getValues("selectedMotifs");
    if (current.includes(motifId)) {
      form.setValue("selectedMotifs", current.filter(m => m !== motifId));
    } else {
      form.setValue("selectedMotifs", [...current, motifId]);
    }
  };

  const createDreamMutation = useMutation({
    mutationFn: async (data: EnhancedDreamFormData) => {
      const themes = data.themes?.split(',').map(t => t.trim()).filter(Boolean) || [];
      const objects = data.objects?.split(',').map(o => o.trim()).filter(Boolean) || [];
      const mainCharacters = data.mainCharacters?.split(',').map(c => c.trim()).filter(Boolean) || [];
      
      const emotionProfile = {
        fear: data.emotionFear,
        wonder: data.emotionWonder,
        peace: data.emotionPeace,
        surprise: data.emotionSurprise,
        anticipation: data.emotionAnticipation,
        trust: data.emotionTrust,
      };

      const dominantEmotion = Object.entries(emotionProfile)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'peace';

      const payload = {
        title: data.title,
        description: data.description,
        location: data.location,
        emotion: dominantEmotion,
        themes,
        objects,
        intensity: data.intensity,
        dreamDate: data.dreamDate,
        emotionProfile,
        motifs: data.selectedMotifs,
        visualColor: data.visualColor,
        clarity: data.clarity,
        mainCharacters,
      };
      
      const res = await apiRequest('POST', '/api/dreams', payload);
      return res.json();
    },
    onSuccess: (data) => {
      const gamificationData = data?.gamification;
      let description = "Rüyanız başarıyla kaydedildi.";
      
      if (gamificationData) {
        description = `+${gamificationData.points} puan kazandınız! Whitelist slot: +${gamificationData.whitelistSlots}`;
        if (gamificationData.achievements?.length > 0) {
          description += ` Yeni rozetler: ${gamificationData.achievements.join(', ')}`;
        }
      }
      
      toast({ title: "Rüya kaydedildi", description });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/dreams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification'] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const emotionTotal = 
    form.watch("emotionFear") + 
    form.watch("emotionWonder") + 
    form.watch("emotionPeace") + 
    form.watch("emotionSurprise") + 
    form.watch("emotionAnticipation") + 
    form.watch("emotionTrust");

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-md shadow-primary/25">
            <Moon className="h-4 w-4 text-primary-foreground" />
          </div>
          Gelişmiş Rüya Kaydı
        </CardTitle>
        <CardDescription>
          Rüyanızın detaylarını ve duygusal profilini girin, AI ile analiz edin
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createDreamMutation.mutate(data))} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rüya Başlığı</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Örn: Uçuş rüyası..." 
                      {...field} 
                      data-testid="input-dream-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rüya Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Rüyanızı detaylı olarak anlatın..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="input-dream-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mekan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-dream-location">
                          <SelectValue placeholder="Mekan seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.value} value={loc.value}>
                            {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dreamDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rüya Tarihi</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        data-testid="input-dream-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 h-auto"
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-medium">Duygu Profili & Gelişmiş Ayarlar</span>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {advancedOpen ? 'Gizle' : 'Göster'}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-primary" />
                      Duygusal Profil
                    </FormLabel>
                    <Badge variant={emotionTotal > 300 ? "destructive" : emotionTotal > 200 ? "default" : "secondary"}>
                      Toplam: {emotionTotal}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {EMOTION_CATEGORIES.map((emotion) => {
                      const fieldName = `emotion${emotion.id.charAt(0).toUpperCase() + emotion.id.slice(1)}` as keyof EnhancedDreamFormData;
                      const IconComponent = emotion.icon;
                      return (
                        <FormField
                          key={emotion.id}
                          control={form.control}
                          name={fieldName}
                          render={({ field }) => (
                            <FormItem className={`p-3 rounded-lg ${emotion.bgColor}`}>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel className={`flex items-center gap-2 ${emotion.color} text-sm`}>
                                  <IconComponent className="h-4 w-4" />
                                  {emotion.label}
                                </FormLabel>
                                <span className="text-xs font-medium">{field.value as number}%</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0}
                                  max={100}
                                  step={5}
                                  value={[field.value as number]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                  className="cursor-pointer"
                                  data-testid={`slider-emotion-${emotion.id}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    Rüya Motifleri
                  </FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {MOTIFS.map((motif) => (
                      <Button
                        key={motif.id}
                        type="button"
                        variant={selectedMotifs.includes(motif.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleMotif(motif.id)}
                        className="gap-1.5"
                        data-testid={`button-motif-${motif.id}`}
                      >
                        <span>{motif.emoji}</span>
                        <span>{motif.label}</span>
                      </Button>
                    ))}
                  </div>
                  {selectedMotifs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Seçilen: {selectedMotifs.length} motif
                    </p>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <FormLabel className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      Görsel Renk
                    </FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {VISUAL_COLORS.map((vc) => {
                        const isSelected = form.watch("visualColor") === vc.id;
                        return (
                          <button
                            key={vc.id}
                            type="button"
                            onClick={() => form.setValue("visualColor", vc.id)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              isSelected ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-muted hover:border-muted-foreground'
                            }`}
                            style={{ backgroundColor: vc.color }}
                            title={vc.label}
                            data-testid={`button-color-${vc.id}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="clarity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-primary" />
                          Berraklık
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-dream-clarity">
                              <SelectValue placeholder="Berraklık seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CLARITY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                <div className="flex flex-col">
                                  <span>{level.label}</span>
                                  <span className="text-xs text-muted-foreground">{level.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mainCharacters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Smile className="h-4 w-4 text-primary" />
                        Ana Karakterler (virgülle ayırın)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Örn: anne, arkadaş, yabancı..."
                          {...field}
                          data-testid="input-dream-characters"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            <FormField
              control={form.control}
              name="intensity"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Genel Yoğunluk
                    </FormLabel>
                    <span className="text-sm font-medium">{field.value}/10</span>
                  </div>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-4"
                      data-testid="slider-dream-intensity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="themes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temalar</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Örn: uçmak, özgürlük..."
                        {...field}
                        data-testid="input-dream-themes"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Virgülle ayırın</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objects"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nesneler</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Örn: kapı, anahtar..."
                        {...field}
                        data-testid="input-dream-objects"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Virgülle ayırın</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createDreamMutation.isPending}
              data-testid="button-save-dream"
            >
              {createDreamMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Rüyayı Kaydet
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
