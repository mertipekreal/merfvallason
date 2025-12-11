import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, 
  Image, 
  Type, 
  Upload, 
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Play
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube, SiX, SiLinkedin } from "react-icons/si";
import type { RunwayTask } from "@shared/schema";

const platformIcons: Record<string, JSX.Element> = {
  tiktok: <SiTiktok className="h-4 w-4" />,
  instagram: <SiInstagram className="h-4 w-4" />,
  youtube: <SiYoutube className="h-4 w-4" />,
  twitter: <SiX className="h-4 w-4" />,
  linkedin: <SiLinkedin className="h-4 w-4" />,
};

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter/X",
  linkedin: "LinkedIn",
};

function TaskStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: JSX.Element }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    processing: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: "outline", icon: <CheckCircle2 className="h-3 w-3 text-green-500" /> },
    failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function TaskCard({ task, onRefresh }: { task: RunwayTask; onRefresh: () => void }) {
  const isProcessing = task.status === "processing" || task.status === "pending";

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.taskType === "text_to_video" && <Video className="h-4 w-4 text-chart-1" />}
            {task.taskType === "image_to_video" && <Play className="h-4 w-4 text-chart-2" />}
            {task.taskType === "text_to_image" && <Image className="h-4 w-4 text-chart-3" />}
            <CardTitle className="text-sm font-medium">
              {task.taskType.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {task.targetPlatform && platformIcons[task.targetPlatform]}
            <TaskStatusBadge status={task.status} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.promptText && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {(task.optimizationSettings as any)?.originalPrompt || task.promptText}
          </p>
        )}
        
        {isProcessing && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing...</span>
              <span>{task.progressPercent || 0}%</span>
            </div>
            <Progress value={task.progressPercent || 0} className="h-1" />
          </div>
        )}
        
        {task.status === "completed" && task.outputUrl && (
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => window.open(task.outputUrl!, '_blank')}
            data-testid={`button-download-${task.id}`}
          >
            <Download className="h-4 w-4" />
            Download Result
          </Button>
        )}
        
        {task.status === "failed" && task.errorMessage && (
          <p className="text-xs text-destructive">{task.errorMessage}</p>
        )}
        
        {isProcessing && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="w-full gap-2"
            onClick={onRefresh}
            data-testid={`button-refresh-${task.id}`}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Status
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground">
          {new Date(task.createdAt!).toLocaleString('tr-TR')}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ContentOptimizer() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("text-to-video");
  const [platform, setPlatform] = useState("tiktok");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [duration, setDuration] = useState(5);

  const { data: tasksResponse, isLoading: tasksLoading, refetch: refetchTasks } = useQuery<{ success: boolean; tasks: RunwayTask[] }>({
    queryKey: ["/api/runway/tasks"],
    refetchInterval: 5000,
  });

  const tasks = tasksResponse?.tasks || [];

  const textToVideoMutation = useMutation({
    mutationFn: async (data: { promptText: string; targetPlatform: string; duration: number }) => {
      return apiRequest("POST", "/api/runway/text-to-video", data);
    },
    onSuccess: () => {
      toast({ title: "Task Created", description: "Your video is being generated. This may take a few minutes." });
      setPrompt("");
      queryClient.invalidateQueries({ queryKey: ["/api/runway/tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const imageToVideoMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; promptText: string; targetPlatform: string; duration: number }) => {
      return apiRequest("POST", "/api/runway/image-to-video", data);
    },
    onSuccess: () => {
      toast({ title: "Task Created", description: "Your video is being generated from the image." });
      setPrompt("");
      setImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/runway/tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const textToImageMutation = useMutation({
    mutationFn: async (data: { promptText: string; targetPlatform: string; referenceImageUrl: string }) => {
      return apiRequest("POST", "/api/runway/text-to-image", data);
    },
    onSuccess: () => {
      toast({ title: "Task Created", description: "Your image is being generated." });
      setPrompt("");
      setReferenceImageUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/runway/tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Please enter a prompt", variant: "destructive" });
      return;
    }

    if (activeTab === "text-to-video") {
      textToVideoMutation.mutate({ promptText: prompt, targetPlatform: platform, duration });
    } else if (activeTab === "image-to-video") {
      if (!imageUrl.trim()) {
        toast({ title: "Error", description: "Please enter an image URL", variant: "destructive" });
        return;
      }
      imageToVideoMutation.mutate({ imageUrl, promptText: prompt, targetPlatform: platform, duration });
    } else if (activeTab === "text-to-image") {
      if (!referenceImageUrl.trim()) {
        toast({ title: "Error", description: "Please enter a reference image URL", variant: "destructive" });
        return;
      }
      textToImageMutation.mutate({ promptText: prompt, targetPlatform: platform, referenceImageUrl });
    }
  };

  const isSubmitting = textToVideoMutation.isPending || imageToVideoMutation.isPending || textToImageMutation.isPending;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Content Optimizer"
        description="Transform your content for maximum algorithm performance with AI"
        showBack
        onRefresh={() => refetchTasks()}
        isRefreshing={tasksLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-chart-4" />
                Create Optimized Content
              </CardTitle>
              <CardDescription>
                Generate algorithm-optimized videos and images for your target platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text-to-video" className="gap-2" data-testid="tab-text-to-video">
                    <Video className="h-4 w-4" />
                    Text to Video
                  </TabsTrigger>
                  <TabsTrigger value="image-to-video" className="gap-2" data-testid="tab-image-to-video">
                    <Play className="h-4 w-4" />
                    Image to Video
                  </TabsTrigger>
                  <TabsTrigger value="text-to-image" className="gap-2" data-testid="tab-text-to-image">
                    <Image className="h-4 w-4" />
                    Text to Image
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Target Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(platformLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key} data-testid={`platform-option-${key}`}>
                            <div className="flex items-center gap-2">
                              {platformIcons[key]}
                              {label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <TabsContent value="text-to-video" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Describe your video</Label>
                      <Textarea 
                        placeholder="A cinematic shot of a sunset over the ocean, with waves gently rolling onto the shore..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px]"
                        data-testid="input-prompt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (seconds): {duration}</Label>
                      <Input
                        type="range"
                        min={2}
                        max={10}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        data-testid="input-duration"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="image-to-video" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Image URL</Label>
                      <Input 
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        data-testid="input-image-url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use publicly accessible URLs (Wikipedia, Imgur, Unsplash). Private CDN links (Midjourney, Discord) may not work.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Describe the animation</Label>
                      <Textarea 
                        placeholder="Add gentle motion, zoom in slowly..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="input-prompt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (seconds): {duration}</Label>
                      <Input
                        type="range"
                        min={2}
                        max={10}
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value))}
                        data-testid="input-duration"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="text-to-image" className="mt-0 space-y-4">
                    <div className="space-y-2">
                      <Label>Reference Image URL (required)</Label>
                      <Input 
                        placeholder="https://example.com/reference-image.jpg"
                        value={referenceImageUrl}
                        onChange={(e) => setReferenceImageUrl(e.target.value)}
                        data-testid="input-reference-image-url"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use publicly accessible URLs (Wikipedia, Imgur, Unsplash). Private CDN links (Midjourney, Discord) may not work.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Describe your image</Label>
                      <Textarea 
                        placeholder="A professional product photo of a modern smartphone on a clean white background..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="input-prompt"
                      />
                    </div>
                  </TabsContent>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="w-full gap-2"
                    data-testid="button-generate"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Optimized Content
                      </>
                    )}
                  </Button>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent Tasks</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetchTasks()}
              data-testid="button-refresh-tasks"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {tasksLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <Card className="py-8 text-center">
              <CardContent>
                <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No tasks yet</p>
                <p className="text-sm text-muted-foreground">Create your first optimized content</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onRefresh={() => refetchTasks()} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
