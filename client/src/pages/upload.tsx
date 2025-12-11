import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileUp, Trash2, BarChart3, Loader2 } from "lucide-react";
import { SiTiktok, SiInstagram, SiLinkedin, SiSpotify } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

const uploadSchema = z.object({
  name: z.string().min(1, "Dataset name is required"),
  platform: z.enum(["tiktok", "instagram", "linkedin", "spotify", "phone_conversations"], {
    required_error: "Platform is required",
  }),
});

type UploadFormData = z.infer<typeof uploadSchema>;

const platformInfo = {
  tiktok: {
    icon: SiTiktok,
    label: "TikTok",
    color: "bg-black text-white",
    formats: "JSON or CSV",
    tips: "Export your TikTok data from Settings > Privacy > Download your data",
  },
  instagram: {
    icon: SiInstagram,
    label: "Instagram",
    color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    formats: "JSON",
    tips: "Request your data from Instagram Settings > Privacy and Security > Data Download",
  },
  linkedin: {
    icon: SiLinkedin,
    label: "LinkedIn",
    color: "bg-blue-600 text-white",
    formats: "CSV or ZIP",
    tips: "Go to Settings > Data Privacy > Get a copy of your data",
  },
  spotify: {
    icon: SiSpotify,
    label: "Spotify",
    color: "bg-green-500 text-white",
    formats: "JSON",
    tips: "Request your data from Spotify Account > Privacy Settings > Download your data",
  },
  phone_conversations: {
    icon: null,
    label: "Phone Conversations",
    color: "bg-gray-600 text-white",
    formats: "JSON",
    tips: "Upload conversation transcripts with sentiment data",
  },
};

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      name: "",
      platform: undefined,
    },
  });

  const selectedPlatform = form.watch("platform");

  const { data: uploadedDatasets, isLoading: datasetsLoading } = useQuery<{
    success: boolean;
    datasets: Array<{
      name: string;
      displayName: string;
      platform: string;
      recordCount: number;
    }>;
  }>({
    queryKey: ["/api/uploads"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", data.name);
      formData.append("platform", data.platform);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Upload Successful",
        description: `Dataset "${result.name}" uploaded with ${result.recordCount} records.`,
      });
      form.reset();
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (datasetName: string) => {
      const response = await fetch(`/api/upload/${datasetName}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dataset Removed",
        description: "Dataset has been successfully removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const onSubmit = (data: UploadFormData) => {
    uploadMutation.mutate(data);
  };

  const getPlatformIcon = (platform: string) => {
    const info = platformInfo[platform as keyof typeof platformInfo];
    if (!info || !info.icon) return null;
    const Icon = info.icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Upload Data
        </h1>
        <p className="text-muted-foreground">
          Upload your social media data exports for analysis. Supported platforms: TikTok, Instagram, LinkedIn, Spotify
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Dataset
            </CardTitle>
            <CardDescription>
              Select your platform and upload your data file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dataset Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="My TikTok Export"
                          {...field}
                          data-testid="input-dataset-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-platform">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tiktok" data-testid="option-tiktok">
                            <div className="flex items-center gap-2">
                              <SiTiktok className="h-4 w-4" />
                              TikTok
                            </div>
                          </SelectItem>
                          <SelectItem value="instagram" data-testid="option-instagram">
                            <div className="flex items-center gap-2">
                              <SiInstagram className="h-4 w-4" />
                              Instagram
                            </div>
                          </SelectItem>
                          <SelectItem value="linkedin" data-testid="option-linkedin">
                            <div className="flex items-center gap-2">
                              <SiLinkedin className="h-4 w-4" />
                              LinkedIn
                            </div>
                          </SelectItem>
                          <SelectItem value="spotify" data-testid="option-spotify">
                            <div className="flex items-center gap-2">
                              <SiSpotify className="h-4 w-4" />
                              Spotify
                            </div>
                          </SelectItem>
                          <SelectItem value="phone_conversations" data-testid="option-phone">
                            Phone Conversations
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPlatform && (
                  <div className="rounded-lg border p-3 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      <strong>Formats:</strong> {platformInfo[selectedPlatform]?.formats}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>Tip:</strong> {platformInfo[selectedPlatform]?.tips}
                    </p>
                  </div>
                )}

                <div>
                  <FormLabel>Data File</FormLabel>
                  <div className="mt-2">
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-8 h-8 mb-2 text-muted-foreground" />
                        {selectedFile ? (
                          <p className="text-sm font-medium" data-testid="text-selected-file">
                            {selectedFile.name}
                          </p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                              JSON, CSV, or ZIP (max 50MB)
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".json,.csv,.zip"
                        onChange={handleFileChange}
                        data-testid="input-file"
                      />
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedFile || uploadMutation.isPending}
                  data-testid="button-upload"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Dataset
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploaded Datasets</CardTitle>
            <CardDescription>
              Your uploaded datasets ready for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {datasetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : uploadedDatasets?.datasets?.length ? (
              <div className="space-y-3">
                {uploadedDatasets.datasets.map((dataset) => (
                  <div
                    key={dataset.name}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    data-testid={`dataset-${dataset.name}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        {getPlatformIcon(dataset.platform) || (
                          <BarChart3 className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{dataset.displayName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {dataset.recordCount} records
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {dataset.platform}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/analytics?dataset=${dataset.name}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-analyze-${dataset.name}`}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(dataset.name)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${dataset.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No datasets uploaded yet</p>
                <p className="text-sm">Upload your first dataset to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
