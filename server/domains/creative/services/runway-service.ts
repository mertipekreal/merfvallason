import { storage } from "../../../storage";
import { 
  type RunwayTask, 
  type InsertRunwayTask,
  type TargetPlatform,
  PLATFORM_PRESETS 
} from "@shared/schema";

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_API_VERSION = "2024-11-06";

interface RunwayApiResponse {
  id: string;
  status: string;
  progress?: number;
  output?: string[];
  failure?: string;
  failureCode?: string;
}

class RunwayService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.RUNWAY_API_KEY;
  }

  private getHeaders() {
    if (!this.apiKey) {
      throw new Error("RUNWAY_API_KEY environment variable is not set");
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
      "X-Runway-Version": RUNWAY_API_VERSION,
    };
  }

  private getOptimizedPrompt(originalPrompt: string, platform: TargetPlatform): string {
    const preset = PLATFORM_PRESETS[platform];
    const platformHints = {
      tiktok: "viral, trendy, eye-catching, fast transitions, vertical format optimized for mobile",
      instagram: "aesthetic, visually appealing, clean composition, perfect for feed or reels",
      youtube: "cinematic quality, professional look, engaging thumbnails, wide format",
      twitter: "attention-grabbing, shareable, impactful first frame",
      linkedin: "professional, business-appropriate, polished presentation"
    };
    
    return `${originalPrompt}. Style: ${preset.style}. Optimized for ${platform}: ${platformHints[platform]}`;
  }

  async createTextToVideo(
    promptText: string, 
    platform: TargetPlatform = 'tiktok',
    duration: number = 5
  ): Promise<RunwayTask> {
    const optimizedPrompt = this.getOptimizedPrompt(promptText, platform);
    
    const ratioMap: Record<TargetPlatform, string> = {
      tiktok: '1080:1920',
      instagram: '1080:1920',
      youtube: '1920:1080',
      twitter: '1280:720',
      linkedin: '1920:1080',
    };
    const validDurations = [4, 6, 8];
    const closestDuration = validDurations.reduce((prev, curr) => 
      Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
    );
    
    const task = await storage.createRunwayTask({
      taskType: "text_to_video",
      status: "pending",
      promptText: optimizedPrompt,
      targetPlatform: platform,
      optimizationSettings: { duration: closestDuration, ratio: ratioMap[platform], originalPrompt: promptText },
    });

    try {
      const response = await fetch(`${RUNWAY_API_BASE}/text_to_video`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          promptText: optimizedPrompt,
          ratio: ratioMap[platform],
          duration: closestDuration,
          model: "veo3.1",
          audio: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runway API error: ${response.status} - ${errorText}`);
      }

      const data: RunwayApiResponse = await response.json();
      
      await storage.updateRunwayTask(task.id, {
        runwayTaskId: data.id,
        status: "processing",
      });

      return { ...task, runwayTaskId: data.id, status: "processing" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await storage.updateRunwayTask(task.id, {
        status: "failed",
        errorMessage,
      });
      throw error;
    }
  }

  async createImageToVideo(
    imageUrl: string,
    promptText: string,
    platform: TargetPlatform = 'tiktok',
    duration: number = 5
  ): Promise<RunwayTask> {
    const optimizedPrompt = this.getOptimizedPrompt(promptText, platform);

    // Runway image_to_video only accepts these ratios: 1280:720, 720:1280, 1104:832, 832:1104, 960:960, 1584:672
    const ratioMap: Record<TargetPlatform, string> = {
      tiktok: '720:1280',
      instagram: '960:960',
      youtube: '1280:720',
      twitter: '1280:720',
      linkedin: '1280:720',
    };
    const validDuration = Math.max(2, Math.min(10, duration));

    const task = await storage.createRunwayTask({
      taskType: "image_to_video",
      status: "pending",
      promptText: optimizedPrompt,
      inputImageUrl: imageUrl,
      targetPlatform: platform,
      optimizationSettings: { duration: validDuration, ratio: ratioMap[platform], originalPrompt: promptText },
    });

    try {
      const requestBody = {
        promptImage: imageUrl,
        promptText: optimizedPrompt,
        ratio: ratioMap[platform],
        duration: validDuration,
        model: "gen4_turbo",
      };
      
      console.log("Image to Video request:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runway API error: ${response.status} - ${errorText}`);
      }

      const data: RunwayApiResponse = await response.json();
      
      await storage.updateRunwayTask(task.id, {
        runwayTaskId: data.id,
        status: "processing",
      });

      return { ...task, runwayTaskId: data.id, status: "processing" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await storage.updateRunwayTask(task.id, {
        status: "failed",
        errorMessage,
      });
      throw error;
    }
  }

  async createTextToImage(
    promptText: string,
    platform: TargetPlatform = 'instagram',
    referenceImageUrl?: string
  ): Promise<RunwayTask> {
    const ratioMap: Record<TargetPlatform, string> = {
      tiktok: '1080:1920',
      instagram: '1080:1080',
      youtube: '1920:1080',
      twitter: '1280:720',
      linkedin: '1920:1080',
    };

    const task = await storage.createRunwayTask({
      taskType: "text_to_image",
      status: "pending",
      promptText: promptText,
      inputImageUrl: referenceImageUrl || null,
      targetPlatform: platform,
      optimizationSettings: { ratio: ratioMap[platform] },
    });

    try {
      const requestBody: any = {
        promptText: promptText,
        ratio: ratioMap[platform],
        model: "gen4_image",
      };
      
      if (referenceImageUrl) {
        requestBody.referenceImages = [{ uri: referenceImageUrl }];
      }
      
      console.log("Runway Text to Image request:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${RUNWAY_API_BASE}/text_to_image`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runway API error: ${response.status} - ${errorText}`);
      }

      const data: RunwayApiResponse = await response.json();
      
      await storage.updateRunwayTask(task.id, {
        runwayTaskId: data.id,
        status: "processing",
      });

      return { ...task, runwayTaskId: data.id, status: "processing" };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await storage.updateRunwayTask(task.id, {
        status: "failed",
        errorMessage,
      });
      throw error;
    }
  }

  async generateImageDirect(promptText: string, ratio: string = '1024:1024'): Promise<string> {
    console.log("Runway generateImageDirect - Prompt:", promptText.substring(0, 200) + "...");
    
    const requestBody = {
      promptText: promptText,
      ratio: ratio,
      model: "gen4_image",
    };

    const response = await fetch(`${RUNWAY_API_BASE}/text_to_image`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Runway API error: ${response.status} - ${errorText}`);
    }

    const data: RunwayApiResponse = await response.json();
    const taskId = data.id;
    
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check task status: ${statusResponse.status}`);
      }

      const statusData: RunwayApiResponse = await statusResponse.json();
      
      if (statusData.status === "SUCCEEDED" && statusData.output && statusData.output.length > 0) {
        console.log("Runway image generated successfully:", statusData.output[0]);
        return statusData.output[0];
      }
      
      if (statusData.status === "FAILED") {
        throw new Error(`Runway task failed: ${statusData.failure || statusData.failureCode}`);
      }
      
      attempts++;
    }
    
    throw new Error("Runway task timed out after 2 minutes");
  }

  async checkTaskStatus(taskId: string): Promise<RunwayTask | undefined> {
    const task = await storage.getRunwayTask(taskId);
    if (!task || !task.runwayTaskId) return task;
    
    if (task.status === "completed" || task.status === "failed") {
      return task;
    }

    try {
      const response = await fetch(`${RUNWAY_API_BASE}/tasks/${task.runwayTaskId}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error checking task status: ${errorText}`);
        return task;
      }

      const data: RunwayApiResponse = await response.json();
      
      let updates: Partial<InsertRunwayTask> = {
        progressPercent: data.progress ? Math.round(data.progress * 100) : task.progressPercent,
      };

      if (data.status === "SUCCEEDED" && data.output && data.output.length > 0) {
        updates = {
          ...updates,
          status: "completed",
          outputUrl: data.output[0],
        };
      } else if (data.status === "FAILED") {
        updates = {
          ...updates,
          status: "failed",
          errorMessage: data.failure || data.failureCode || "Task failed",
        };
      } else if (data.status === "RUNNING") {
        updates.status = "processing";
      }

      const updatedTask = await storage.updateRunwayTask(taskId, updates);
      return updatedTask;
    } catch (error) {
      console.error("Error checking Runway task status:", error);
      return task;
    }
  }

  async getTaskHistory(limit = 20): Promise<RunwayTask[]> {
    return storage.getRunwayTasks(limit);
  }

  async uploadAsset(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const response = await fetch(`${RUNWAY_API_BASE}/uploads`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload asset: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.url || data.uri;
  }
}

export const runwayService = new RunwayService();
