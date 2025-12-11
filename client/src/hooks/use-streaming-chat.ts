import { useState, useCallback, useRef } from 'react';

interface StreamChunk {
  type: 'token' | 'done' | 'error' | 'tool_result' | 'content' | 'final' | 'insights' | 'actions' | 'emotionalState';
  data: any;
}

interface AIResponse {
  message: string;
  insights: string[];
  actions: string[];
  followUpQuestions: string[];
  emotionalFeedback: {
    sentiment: number;
    energy: number;
    stress: number;
    clarity: number;
  };
  confidence: number;
  sources: string[];
  toolResults?: any[];
}

interface UseStreamingChatOptions {
  userId: string;
  onToken?: (token: string) => void;
  onToolResult?: (result: any) => void;
  onComplete?: (response: AIResponse) => void;
  onError?: (error: string) => void;
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [currentResponse, setCurrentResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toolResults, setToolResults] = useState<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendStreamingMessage = useCallback(async (message: string) => {
    setIsStreaming(true);
    setStreamedText('');
    setError(null);
    setCurrentResponse(null);
    setToolResults([]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: options.userId,
          message,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }

            try {
              const chunk: StreamChunk = JSON.parse(data);

              switch (chunk.type) {
                case 'token':
                  setStreamedText(prev => prev + chunk.data);
                  options.onToken?.(chunk.data);
                  break;
                case 'content':
                  // Claude sends full content at once
                  setStreamedText(chunk.data);
                  options.onToken?.(chunk.data);
                  break;
                case 'tool_result':
                  setToolResults(prev => [...prev, chunk.data]);
                  options.onToolResult?.(chunk.data);
                  break;
                case 'done':
                  setCurrentResponse(chunk.data);
                  options.onComplete?.(chunk.data);
                  break;
                case 'final':
                  // Claude sends final response with all data
                  const finalData = {
                    message: chunk.data.message,
                    insights: chunk.data.insights || [],
                    actions: chunk.data.actions || [],
                    followUpQuestions: [],
                    emotionalFeedback: chunk.data.emotionalState || { sentiment: 0, energy: 0.5, stress: 0.2, clarity: 0.8 },
                    confidence: chunk.data.confidence || 0.9,
                    sources: [],
                    toolResults: [],
                  };
                  setCurrentResponse(finalData);
                  options.onComplete?.(finalData);
                  break;
                case 'insights':
                case 'actions':
                case 'emotionalState':
                  // These are intermediate chunks, ignore for now
                  break;
                case 'error':
                  setError(chunk.data);
                  options.onError?.(chunk.data);
                  break;
              }
            } catch (e) {
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMessage = err.message || 'Streaming hatası oluştu';
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [options]);

  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setStreamedText('');
    setCurrentResponse(null);
    setError(null);
    setToolResults([]);
  }, []);

  return {
    isStreaming,
    streamedText,
    currentResponse,
    error,
    toolResults,
    sendStreamingMessage,
    cancelStream,
    reset,
  };
}
