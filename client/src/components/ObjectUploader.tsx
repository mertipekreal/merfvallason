import { useState, useRef } from "react";
import type { ReactNode, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Check, AlertCircle } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: { name: string; uploadURL: string }[] }) => void;
  buttonClassName?: string;
  children: ReactNode;
  acceptedTypes?: string;
}

interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  uploadURL?: string;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
  acceptedTypes = "*/*",
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles
      .slice(0, maxNumberOfFiles - files.length)
      .filter(file => file.size <= maxFileSize)
      .map(file => ({
        file,
        progress: 0,
        status: "pending" as const,
      }));

    setFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const successful: { name: string; uploadURL: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileUpload = files[i];
      if (fileUpload.status === "completed") continue;

      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "uploading" as const } : f
      ));

      try {
        const { url } = await onGetUploadParameters();
        
        const xhr = new XMLHttpRequest();
        
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, progress } : f
              ));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, status: "completed" as const, progress: 100, uploadURL: url } : f
              ));
              successful.push({ name: fileUpload.file.name, uploadURL: url });
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));

          xhr.open("PUT", url);
          xhr.setRequestHeader("Content-Type", fileUpload.file.type);
          xhr.send(fileUpload.file);
        });
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: "error" as const, error: error instanceof Error ? error.message : "Upload failed" } : f
        ));
      }
    }

    setIsUploading(false);
    
    if (successful.length > 0) {
      onComplete?.({ successful });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const canAddMore = files.length < maxNumberOfFiles;
  const pendingFiles = files.filter(f => f.status === "pending" || f.status === "error");

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogTrigger asChild>
        <Button className={buttonClassName} data-testid="button-upload-trigger">
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dosya Yükle</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {canAddMore && (
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-area"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Dosya seçmek için tıklayın
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maks. {formatFileSize(maxFileSize)} | {maxNumberOfFiles} dosya
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={acceptedTypes}
                multiple={maxNumberOfFiles > 1}
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
            </div>
          )}

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((fileUpload, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  data-testid={`file-item-${index}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileUpload.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileUpload.file.size)}
                    </p>
                    {fileUpload.status === "uploading" && (
                      <Progress value={fileUpload.progress} className="h-1 mt-2" />
                    )}
                    {fileUpload.error && (
                      <p className="text-xs text-red-500 mt-1">{fileUpload.error}</p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {fileUpload.status === "pending" && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => removeFile(index)}
                        data-testid={`button-remove-file-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {fileUpload.status === "completed" && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                    {fileUpload.status === "error" && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowModal(false);
                setFiles([]);
              }}
              data-testid="button-cancel-upload"
            >
              İptal
            </Button>
            <Button 
              onClick={uploadFiles}
              disabled={pendingFiles.length === 0 || isUploading}
              data-testid="button-start-upload"
            >
              {isUploading ? "Yükleniyor..." : "Yükle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
