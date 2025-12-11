/**
 * SAM (Segment Anything Model) Service for Merf.ai
 * 
 * Manages the Python SAM microservice and provides API for image segmentation.
 * Uses MobileSAM (~40MB) and FastSAM (~24MB) models optimized for CPU inference.
 */

import { spawn, ChildProcess } from 'child_process';
import http from 'http';

const SAM_PORT = parseInt(process.env.SAM_PORT || '8081');
const SAM_HOST = process.env.SAM_HOST || 'localhost';
const SAM_URL = `http://${SAM_HOST}:${SAM_PORT}`;

let pythonProcess: ChildProcess | null = null;
let isServiceReady = false;
let startupAttempts = 0;
const MAX_STARTUP_ATTEMPTS = 3;

/**
 * Make HTTP request with timeout
 */
function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
    timeout?: number;
  } = {}
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: options.method || 'GET',
        headers: options.headers,
        timeout: options.timeout || 30000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 200, data: parsed });
          } catch {
            resolve({ status: res.statusCode || 200, data });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Send multipart form data
 */
function sendMultipartForm(
  url: string,
  fields: Record<string, string>,
  file: { name: string; data: Buffer; contentType: string },
  timeout: number = 120000
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
    
    // Build multipart body
    let body = '';
    
    // Add fields
    for (const [key, value] of Object.entries(fields)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    
    // Add file header
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
    body += `Content-Type: ${file.contentType}\r\n\r\n`;
    
    // Combine text and binary parts
    const textPart = Buffer.from(body, 'utf8');
    const filePart = file.data;
    const endPart = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const fullBody = Buffer.concat([textPart, filePart, endPart]);
    
    const urlObj = new URL(url);
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBody.length,
        },
        timeout,
      },
      (res) => {
        let data = Buffer.alloc(0);
        res.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data.toString());
            resolve({ status: res.statusCode || 200, data: parsed });
          } catch {
            resolve({ status: res.statusCode || 200, data: data.toString() });
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(fullBody);
    req.end();
  });
}

/**
 * Start the Python SAM microservice
 */
export async function startSamService(): Promise<boolean> {
  if (pythonProcess && isServiceReady) {
    console.log('[SAM] Service already running');
    return true;
  }

  if (startupAttempts >= MAX_STARTUP_ATTEMPTS) {
    console.error('[SAM] Max startup attempts reached. Service disabled.');
    return false;
  }

  startupAttempts++;
  console.log(`[SAM] Starting SAM microservice (attempt ${startupAttempts}/${MAX_STARTUP_ATTEMPTS})...`);

  return new Promise((resolve) => {
    try {
      // Start Python process
      pythonProcess = spawn('python3', ['script/sam_service.py'], {
        env: {
          ...process.env,
          SAM_PORT: String(SAM_PORT),
          PRELOAD_MODELS: '0', // Lazy load to save memory
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      pythonProcess.stdout?.on('data', (data) => {
        console.log(`[SAM] ${data.toString().trim()}`);
      });

      pythonProcess.stderr?.on('data', (data) => {
        console.error(`[SAM] Error: ${data.toString().trim()}`);
      });

      pythonProcess.on('error', (err) => {
        console.error('[SAM] Failed to start process:', err.message);
        pythonProcess = null;
        isServiceReady = false;
        resolve(false);
      });

      pythonProcess.on('exit', (code) => {
        console.log(`[SAM] Process exited with code ${code}`);
        pythonProcess = null;
        isServiceReady = false;
      });

      // Wait for service to be ready with health checks
      checkServiceReady(10, 1000)
        .then((ready) => {
          isServiceReady = ready;
          if (ready) {
            console.log('[SAM] Microservice is ready!');
            startupAttempts = 0; // Reset on success
          }
          resolve(ready);
        })
        .catch(() => {
          isServiceReady = false;
          resolve(false);
        });

    } catch (error) {
      console.error('[SAM] Failed to spawn process:', error);
      resolve(false);
    }
  });
}

/**
 * Check if SAM service is ready by polling health endpoint
 */
async function checkServiceReady(maxAttempts: number, interval: number): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest(`${SAM_URL}/health`, { timeout: 2000 });
      if (response.status === 200) {
        return true;
      }
    } catch {
      // Service not ready yet
    }
    
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Stop the Python SAM microservice
 */
export function stopSamService(): void {
  if (pythonProcess) {
    console.log('[SAM] Stopping microservice...');
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
    isServiceReady = false;
  }
}

/**
 * Check if SAM service is available
 */
export function isSamServiceReady(): boolean {
  return isServiceReady;
}

/**
 * Get SAM service health status
 */
export async function getSamHealth(): Promise<{
  status: string;
  serviceReady: boolean;
  modelsLoaded: boolean;
}> {
  if (!isServiceReady) {
    return {
      status: 'not_running',
      serviceReady: false,
      modelsLoaded: false,
    };
  }

  try {
    const response = await makeRequest(`${SAM_URL}/health`, { timeout: 5000 });
    
    if (response.status === 200) {
      return {
        status: 'healthy',
        serviceReady: true,
        modelsLoaded: response.data?.models_loaded || false,
      };
    }
  } catch {
    // Health check failed
  }

  return {
    status: 'unhealthy',
    serviceReady: false,
    modelsLoaded: false,
  };
}

/**
 * Pre-load SAM models
 */
export async function preloadSamModels(): Promise<boolean> {
  if (!isServiceReady) {
    console.error('[SAM] Service not ready, cannot preload models');
    return false;
  }

  try {
    const response = await makeRequest(`${SAM_URL}/load`, {
      method: 'POST',
      timeout: 60000, // Models take time to load
    });
    
    if (response.status === 200) {
      return response.data?.success || false;
    }
  } catch (error) {
    console.error('[SAM] Failed to preload models:', error);
  }

  return false;
}

export interface SegmentationOptions {
  model?: 'mobilesam' | 'fastsam';
  points?: number[][];
  labels?: number[];
  bboxes?: number[][];
  imgsz?: number;
}

export interface SegmentationResult {
  success: boolean;
  image?: string; // Base64 data URL
  metadata?: {
    model: string;
    num_masks: number;
    image_size: { width: number; height: number };
    mask_areas?: number[];
  };
  error?: string;
}

/**
 * Segment an image using SAM
 * 
 * @param imageBuffer - Image data as Buffer
 * @param filename - Original filename
 * @param options - Segmentation options
 * @returns Segmentation result with base64 image
 */
export async function segmentImage(
  imageBuffer: Buffer,
  filename: string,
  options: SegmentationOptions = {}
): Promise<SegmentationResult> {
  // Ensure service is running
  if (!isServiceReady) {
    const started = await startSamService();
    if (!started) {
      return {
        success: false,
        error: 'SAM servisi başlatılamadı. Lütfen daha sonra tekrar deneyin.',
      };
    }
  }

  try {
    // Build form fields
    const fields: Record<string, string> = {
      model: options.model || 'mobilesam',
      imgsz: String(options.imgsz || 640),
    };

    if (options.points && options.points.length > 0) {
      fields.points = JSON.stringify(options.points);
    }

    if (options.labels && options.labels.length > 0) {
      fields.labels = JSON.stringify(options.labels);
    }

    if (options.bboxes && options.bboxes.length > 0) {
      fields.bboxes = JSON.stringify(options.bboxes);
    }

    // Send to Python service
    const response = await sendMultipartForm(
      `${SAM_URL}/segment-json`,
      fields,
      {
        name: filename,
        data: imageBuffer,
        contentType: getContentType(filename),
      },
      120000 // 2 minutes for processing
    );

    if (response.status !== 200) {
      return {
        success: false,
        error: response.data?.error || `HTTP ${response.status}`,
      };
    }

    return response.data as SegmentationResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SAM] Segmentation error:', errorMessage);
    
    return {
      success: false,
      error: `Segmentasyon hatası: ${errorMessage}`,
    };
  }
}

/**
 * Get content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
  };
  return types[ext || 'jpg'] || 'image/jpeg';
}

// Auto-cleanup on process exit
process.on('exit', () => {
  stopSamService();
});

process.on('SIGINT', () => {
  stopSamService();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopSamService();
  process.exit(0);
});
