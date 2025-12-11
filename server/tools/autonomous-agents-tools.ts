import { autonomousAgents } from "../autonomous-agents-service";
import type { ToolCallResult, ToolDefinition } from "./index";

export const autonomousAgentsToolDefinitions: ToolDefinition[] = [
  {
    name: "list_agents",
    description: "Tüm otonom AI ajanlarını listeler. Her ajanın durumu, son çalışma zamanı ve ayarları gösterilir.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "run_agent",
    description: "Belirtilen ajanı manuel olarak çalıştırır ve sonuçları döndürür. Agent ID gereklidir.",
    parameters: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Çalıştırılacak ajanın ID'si (social_media_watcher, dream_pattern_detector, engagement_analyzer, sentiment_tracker, content_recommender)" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "get_agent_results",
    description: "Belirtilen ajanın son çalışma sonuçlarını getirir.",
    parameters: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Ajanın ID'si" },
        limit: { type: "number", description: "Kaç sonuç gösterilsin (varsayılan: 5)" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "get_all_findings",
    description: "Tüm ajanlardan gelen son bulguları toplu olarak gösterir.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Kaç bulgu gösterilsin (varsayılan: 20)" },
      },
      required: [],
    },
  },
  {
    name: "enable_agent",
    description: "Devre dışı bırakılmış bir ajanı etkinleştirir.",
    parameters: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Etkinleştirilecek ajanın ID'si" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "disable_agent",
    description: "Bir ajanı devre dışı bırakır, otomatik çalışmasını durdurur.",
    parameters: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Devre dışı bırakılacak ajanın ID'si" },
      },
      required: ["agentId"],
    },
  },
  {
    name: "get_agent_stats",
    description: "Tüm ajanların genel istatistiklerini gösterir: aktif ajan sayısı, toplam bulgu, son çalışma zamanı.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export async function executeAutonomousAgentsTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  switch (toolName) {
    case "list_agents": {
      try {
        const agents = autonomousAgents.getAgentList();
        
        return {
          success: true,
          data: {
            agentCount: agents.length,
            agents: agents.map(a => ({
              id: a.id,
              name: a.name,
              description: a.description,
              type: a.type,
              enabled: a.enabled,
              status: a.status,
              interval: `${a.interval} dakika`,
              lastRun: a.lastRun ? a.lastRun.toISOString() : 'Henüz çalışmadı',
              nextRun: a.nextRun ? a.nextRun.toISOString() : 'Planlanmadı',
            })),
          },
          message: `${agents.length} otonom ajan mevcut: ${agents.filter(a => a.enabled).length} aktif, ${agents.filter(a => a.status === 'running').length} çalışıyor`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "run_agent": {
      const agentId = args.agentId as string;
      if (!agentId) {
        return { success: false, message: "Agent ID gerekli", error: "Missing agentId" };
      }
      
      try {
        const result = await autonomousAgents.runAgent(agentId);
        
        return {
          success: result.success,
          data: {
            agentId: result.agentId,
            duration: `${result.duration}ms`,
            findingCount: result.findings.length,
            findings: result.findings.map(f => ({
              type: f.type,
              severity: f.severity,
              title: f.title,
              description: f.description,
              actionable: f.actionable,
              suggestedAction: f.suggestedAction,
            })),
            summary: result.summary,
          },
          message: result.success 
            ? `Ajan çalıştırıldı: ${result.findings.length} bulgu, ${result.duration}ms`
            : `Ajan hatası: ${result.error}`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "get_agent_results": {
      const agentId = args.agentId as string;
      const limit = (args.limit as number) || 5;
      
      if (!agentId) {
        return { success: false, message: "Agent ID gerekli", error: "Missing agentId" };
      }
      
      try {
        const results = autonomousAgents.getAgentResults(agentId, limit);
        
        return {
          success: true,
          data: {
            agentId,
            resultCount: results.length,
            results: results.map(r => ({
              timestamp: r.timestamp.toISOString(),
              success: r.success,
              duration: `${r.duration}ms`,
              findingCount: r.findings.length,
              summary: r.summary,
              findings: r.findings.slice(0, 5),
            })),
          },
          message: `${agentId} için son ${results.length} sonuç getirildi`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "get_all_findings": {
      const limit = (args.limit as number) || 20;
      
      try {
        const allResults = autonomousAgents.getAllResults(limit);
        const allFindings = allResults.flatMap(r => 
          r.findings.map(f => ({
            ...f,
            agentId: r.agentId,
            timestamp: r.timestamp,
          }))
        ).slice(0, limit);
        
        const criticalFindings = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high');
        const alertFindings = allFindings.filter(f => f.type === 'alert');
        
        return {
          success: true,
          data: {
            totalFindings: allFindings.length,
            criticalCount: criticalFindings.length,
            alertCount: alertFindings.length,
            findings: allFindings.map(f => ({
              agentId: f.agentId,
              type: f.type,
              severity: f.severity,
              title: f.title,
              description: f.description,
              actionable: f.actionable,
              suggestedAction: f.suggestedAction,
              timestamp: f.timestamp.toISOString(),
            })),
          },
          message: `${allFindings.length} bulgu: ${criticalFindings.length} kritik, ${alertFindings.length} uyarı`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "enable_agent": {
      const agentId = args.agentId as string;
      if (!agentId) {
        return { success: false, message: "Agent ID gerekli", error: "Missing agentId" };
      }
      
      try {
        const success = autonomousAgents.enableAgent(agentId);
        
        return {
          success,
          data: { agentId, enabled: success },
          message: success 
            ? `${agentId} ajanı etkinleştirildi`
            : `${agentId} ajanı bulunamadı`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "disable_agent": {
      const agentId = args.agentId as string;
      if (!agentId) {
        return { success: false, message: "Agent ID gerekli", error: "Missing agentId" };
      }
      
      try {
        const success = autonomousAgents.disableAgent(agentId);
        
        return {
          success,
          data: { agentId, disabled: success },
          message: success 
            ? `${agentId} ajanı devre dışı bırakıldı`
            : `${agentId} ajanı bulunamadı`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    case "get_agent_stats": {
      try {
        const stats = autonomousAgents.getAgentStats();
        
        return {
          success: true,
          data: {
            totalAgents: stats.total,
            enabledAgents: stats.enabled,
            runningAgents: stats.running,
            totalFindings: stats.totalFindings,
            lastRun: stats.lastRun ? stats.lastRun.toISOString() : 'Hiç çalışmadı',
          },
          message: `Ajan istatistikleri: ${stats.enabled}/${stats.total} aktif, ${stats.totalFindings} toplam bulgu`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }
    
    default:
      return { success: false, message: `Bilinmeyen araç: ${toolName}`, error: `Unknown tool: ${toolName}` };
  }
}
