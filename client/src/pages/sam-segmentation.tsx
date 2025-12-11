import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Wand2, 
  Loader2, 
  ImageIcon, 
  MousePointerClick,
  Square,
  Trash2,
  Download,
  Info,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react";

interface SegmentationResult {
  success: boolean;
  image?: string;
  metadata?: {
    model: string;
    num_masks: number;
    image_size: { width: number; height: number };
    mask_areas?: number[];
  };
  error?: string;
}

interface HealthStatus {
  status: string;
  serviceReady: boolean;
  modelsLoaded: boolean;
}

interface Point {
  x: number;
  y: number;
  label: number;
}

interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export default function SamSegmentation() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [model, setModel] = useState<"mobilesam" | "fastsam">("mobilesam");
  const [imageSize, setImageSize] = useState<number>(640);
  const [promptMode, setPromptMode] = useState<"auto" | "point" | "box">("auto");
  const [points, setPoints] = useState<Point[]>([]);
  const [currentBox, setCurrentBox] = useState<BBox | null>(null);
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [resultMetadata, setResultMetadata] = useState<SegmentationResult["metadata"] | null>(null);

  const healthQuery = useQuery<HealthStatus>({
    queryKey: ["/api/sam/health"],
    refetchInterval: 30000,
  });

  const startServiceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sam/start", { method: "POST" });
      return res.json();
    },
    onSuccess: () => {
      healthQuery.refetch();
      toast({
        title: "SAM servisi başlatıldı",
        description: "Görüntü segmentasyonu kullanıma hazır.",
      });
    },
  });

  const preloadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sam/preload", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      healthQuery.refetch();
      if (data.success) {
        toast({
          title: "Modeller yüklendi",
          description: "SAM modelleri belleğe yüklendi, daha hızlı işlem yapılacak.",
        });
      }
    },
  });

  const segmentMutation = useMutation<SegmentationResult>({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Dosya seçilmedi");

      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("model", model);
      formData.append("imgsz", String(imageSize));

      if (promptMode === "point" && points.length > 0) {
        formData.append("points", JSON.stringify(points.map(p => [p.x, p.y])));
        formData.append("labels", JSON.stringify(points.map(p => p.label)));
      }

      if (promptMode === "box" && currentBox) {
        formData.append("bboxes", JSON.stringify([[
          currentBox.x1, currentBox.y1, currentBox.x2, currentBox.y2
        ]]));
      }

      const res = await fetch("/api/sam/segment", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Segmentasyon başarısız");
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.image) {
        setResultImage(data.image);
        setResultMetadata(data.metadata || null);
        toast({
          title: "Segmentasyon tamamlandı",
          description: `${data.metadata?.num_masks || 0} maske bulundu`,
        });
      } else {
        toast({
          title: "Hata",
          description: data.error || "Bilinmeyen hata",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Segmentasyon hatası",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResultImage(null);
    setResultMetadata(null);
    setPoints([]);
    setCurrentBox(null);
    
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (promptMode !== "point" || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    const label = e.shiftKey ? 0 : 1;
    setPoints(prev => [...prev, { x, y, label }]);
  }, [promptMode]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (promptMode !== "box" || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    setIsDrawingBox(true);
    setBoxStart({ x, y });
    setCurrentBox(null);
  }, [promptMode]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingBox || !boxStart || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    setCurrentBox({
      x1: Math.min(boxStart.x, x),
      y1: Math.min(boxStart.y, y),
      x2: Math.max(boxStart.x, x),
      y2: Math.max(boxStart.y, y),
    });
  }, [isDrawingBox, boxStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawingBox(false);
    setBoxStart(null);
  }, []);

  const clearPrompts = useCallback(() => {
    setPoints([]);
    setCurrentBox(null);
  }, []);

  const downloadResult = useCallback(() => {
    if (!resultImage) return;
    
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `segmented_${selectedFile?.name || "image"}.jpg`;
    link.click();
  }, [resultImage, selectedFile]);

  const serviceReady = healthQuery.data?.serviceReady || false;
  const modelsLoaded = healthQuery.data?.modelsLoaded || false;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
            Görüntü Segmentasyonu (SAM)
          </h1>
          <p className="text-muted-foreground mt-1">
            Segment Anything Model ile görüntüleri otomatik veya manuel olarak segmentlere ayırın
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {serviceReady ? (
            <Badge variant="secondary" className="flex items-center gap-1.5" data-testid="badge-service-status">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Servis Aktif
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1.5" data-testid="badge-service-status">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              Servis Kapalı
            </Badge>
          )}
          
          {modelsLoaded && (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-500" />
              Modeller Hazır
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Görüntü
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!previewUrl ? (
              <div
                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 text-center cursor-pointer hover-elevate transition-all"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-upload"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Görüntü yükleyin</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sürükle bırak veya tıklayarak seçin
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  JPEG, PNG, WebP, GIF, BMP (Maks. 20MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Preview"
                    className="hidden"
                    onLoad={() => {
                      if (canvasRef.current && imageRef.current) {
                        const canvas = canvasRef.current;
                        canvas.width = imageRef.current.naturalWidth;
                        canvas.height = imageRef.current.naturalHeight;
                      }
                    }}
                  />
                  
                  <div className="relative border rounded-xl overflow-hidden bg-black/20">
                    <img
                      src={resultImage || previewUrl}
                      alt="Segmentation"
                      className="w-full h-auto max-h-[500px] object-contain"
                      data-testid="img-preview"
                    />
                    
                    {!resultImage && promptMode !== "auto" && (
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full cursor-crosshair"
                        onClick={handleCanvasClick}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        data-testid="canvas-prompt"
                      />
                    )}
                    
                    {promptMode === "point" && points.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {points.map((point, i) => (
                          <div
                            key={i}
                            className={`absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white ${
                              point.label === 1 ? "bg-green-500" : "bg-red-500"
                            }`}
                            style={{
                              left: `${(point.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                              top: `${(point.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    
                    {promptMode === "box" && currentBox && (
                      <div
                        className="absolute border-2 border-cyan-500 bg-cyan-500/20 pointer-events-none"
                        style={{
                          left: `${(currentBox.x1 / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                          top: `${(currentBox.y1 / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                          width: `${((currentBox.x2 - currentBox.x1) / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                          height: `${((currentBox.y2 - currentBox.y1) / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      setResultImage(null);
                      setResultMetadata(null);
                      clearPrompts();
                    }}
                    data-testid="button-clear"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Temizle
                  </Button>
                  
                  {resultImage && (
                    <Button variant="outline" onClick={downloadResult} data-testid="button-download">
                      <Download className="w-4 h-4 mr-2" />
                      İndir
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              data-testid="input-file"
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Ayarlar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Model</Label>
                <RadioGroup
                  value={model}
                  onValueChange={(v) => setModel(v as "mobilesam" | "fastsam")}
                  className="grid grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="mobilesam"
                    className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer hover-elevate ${
                      model === "mobilesam" ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <RadioGroupItem value="mobilesam" id="mobilesam" className="sr-only" />
                    <span className="font-medium">MobileSAM</span>
                    <span className="text-xs text-muted-foreground">40MB, Hassas</span>
                  </Label>
                  <Label
                    htmlFor="fastsam"
                    className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer hover-elevate ${
                      model === "fastsam" ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <RadioGroupItem value="fastsam" id="fastsam" className="sr-only" />
                    <span className="font-medium">FastSAM</span>
                    <span className="text-xs text-muted-foreground">24MB, Hızlı</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Prompt Modu</Label>
                <RadioGroup
                  value={promptMode}
                  onValueChange={(v) => {
                    setPromptMode(v as "auto" | "point" | "box");
                    clearPrompts();
                  }}
                  className="space-y-2"
                >
                  <Label
                    htmlFor="auto"
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${
                      promptMode === "auto" ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <RadioGroupItem value="auto" id="auto" />
                    <div>
                      <span className="font-medium">Otomatik</span>
                      <p className="text-xs text-muted-foreground">Tüm nesneleri algıla</p>
                    </div>
                  </Label>
                  <Label
                    htmlFor="point"
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${
                      promptMode === "point" ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <RadioGroupItem value="point" id="point" />
                    <MousePointerClick className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Nokta Seçimi</span>
                      <p className="text-xs text-muted-foreground">Tıklayarak seçin (Shift: hariç tut)</p>
                    </div>
                  </Label>
                  <Label
                    htmlFor="box"
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate ${
                      promptMode === "box" ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <RadioGroupItem value="box" id="box" />
                    <Square className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Kutu Seçimi</span>
                      <p className="text-xs text-muted-foreground">Dikdörtgen çizerek seçin</p>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Görüntü Boyutu</Label>
                  <span className="text-sm text-muted-foreground">{imageSize}px</span>
                </div>
                <Slider
                  value={[imageSize]}
                  onValueChange={([v]) => setImageSize(v)}
                  min={256}
                  max={1024}
                  step={64}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Büyük boyut daha hassas ama daha yavaş
                </p>
              </div>

              {promptMode !== "auto" && (points.length > 0 || currentBox) && (
                <Button variant="outline" className="w-full" onClick={clearPrompts}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Seçimleri Temizle
                </Button>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedFile || segmentMutation.isPending}
                onClick={() => segmentMutation.mutate()}
                data-testid="button-segment"
              >
                {segmentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Segmentasyonu Başlat
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {resultMetadata && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4" />
                  Sonuç
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Model</span>
                  <Badge variant="secondary">{resultMetadata.model}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Maske Sayısı</span>
                  <span className="font-medium">{resultMetadata.num_masks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Görüntü Boyutu</span>
                  <span className="font-medium">
                    {resultMetadata.image_size.width}x{resultMetadata.image_size.height}
                  </span>
                </div>
                {resultMetadata.mask_areas && resultMetadata.mask_areas.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Maske Alanları (px)</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {resultMetadata.mask_areas.slice(0, 10).map((area, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {area.toLocaleString()}
                        </Badge>
                      ))}
                      {resultMetadata.mask_areas.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{resultMetadata.mask_areas.length - 10} daha
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!serviceReady && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4" />
                  Servis Kontrolü
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  SAM servisi kapalı. Segmentasyon yapmak için servisi başlatın.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={startServiceMutation.isPending}
                  onClick={() => startServiceMutation.mutate()}
                  data-testid="button-start-service"
                >
                  {startServiceMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Servisi Başlat
                </Button>
              </CardContent>
            </Card>
          )}

          {serviceReady && !modelsLoaded && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4" />
                  Model Ön Yükleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Modelleri önceden yükleyerek ilk segmentasyonu hızlandırın.
                </p>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={preloadMutation.isPending}
                  onClick={() => preloadMutation.mutate()}
                >
                  {preloadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Yükleniyor...
                    </>
                  ) : (
                    "Modelleri Yükle"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
