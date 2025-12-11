import { githubService } from "../github-service";
import type { ToolCallResult, ToolDefinition } from "./index";

export const githubToolDefinitions: ToolDefinition[] = [
  {
    name: "github_get_user",
    description: "Bağlı GitHub hesabının bilgilerini getirir: kullanıcı adı, takipçi sayısı, repo sayısı vb.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "github_list_repos",
    description: "Kullanıcının GitHub repolarını listeler. Son güncellenen repolar önce gelir.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Kaç repo listelenmeli (varsayılan: 10)" },
      },
      required: [],
    },
  },
  {
    name: "github_get_repo",
    description: "Belirli bir GitHub reposunun detaylarını getirir.",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repo sahibinin kullanıcı adı" },
        repo: { type: "string", description: "Repo adı" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_list_commits",
    description: "Bir reponun son commit'lerini listeler.",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repo sahibinin kullanıcı adı" },
        repo: { type: "string", description: "Repo adı" },
        limit: { type: "number", description: "Kaç commit listelenmeli (varsayılan: 10)" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_search_repos",
    description: "GitHub'da repo arar. Popüler repolar önce gelir.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Arama sorgusu (örn: 'react', 'machine learning')" },
        limit: { type: "number", description: "Kaç sonuç (varsayılan: 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "github_list_issues",
    description: "Bir reponun issue'larını listeler.",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repo sahibinin kullanıcı adı" },
        repo: { type: "string", description: "Repo adı" },
        state: { type: "string", description: "Issue durumu: open, closed, all (varsayılan: open)" },
        limit: { type: "number", description: "Kaç issue listelenmeli (varsayılan: 10)" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_create_repo",
    description: "Yeni bir GitHub reposu oluşturur.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Repo adı" },
        description: { type: "string", description: "Repo açıklaması" },
        isPrivate: { type: "boolean", description: "Özel repo mu? (varsayılan: false)" },
      },
      required: ["name"],
    },
  },
];

export async function executeGitHubTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  switch (toolName) {
    case "github_get_user": {
      try {
        const user = await githubService.getAuthenticatedUser();
        return {
          success: true,
          data: user,
          message: `GitHub kullanıcısı: @${user.login} (${user.publicRepos} repo, ${user.followers} takipçi)`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    case "github_list_repos": {
      try {
        const limit = (args.limit as number) || 10;
        const repos = await githubService.listRepositories(limit);
        return {
          success: true,
          data: {
            count: repos.length,
            repos: repos.map(r => ({
              name: r.name,
              fullName: r.fullName,
              description: r.description,
              stars: r.stars,
              language: r.language,
              isPrivate: r.isPrivate,
              url: r.url,
            })),
          },
          message: `${repos.length} repo listelendi`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    case "github_get_repo": {
      try {
        const { owner, repo } = args;
        if (!owner || !repo) {
          return { success: false, message: "owner ve repo parametreleri gerekli", error: "Missing parameters" };
        }
        const repoData = await githubService.getRepository(owner, repo);
        return {
          success: true,
          data: repoData,
          message: `${repoData.fullName}: ${repoData.stars} yıldız, ${repoData.forks} fork`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    case "github_list_commits": {
      try {
        const { owner, repo } = args;
        const limit = (args.limit as number) || 10;
        if (!owner || !repo) {
          return { success: false, message: "owner ve repo parametreleri gerekli", error: "Missing parameters" };
        }
        const commits = await githubService.listCommits(owner, repo, limit);
        return {
          success: true,
          data: {
            count: commits.length,
            commits,
          },
          message: `${commits.length} commit listelendi`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    case "github_search_repos": {
      try {
        const query = args.query as string;
        const limit = (args.limit as number) || 10;
        if (!query) {
          return { success: false, message: "Arama sorgusu gerekli", error: "Missing query" };
        }
        const repos = await githubService.searchRepositories(query, limit);
        return {
          success: true,
          data: {
            query,
            count: repos.length,
            repos: repos.map(r => ({
              name: r.name,
              fullName: r.fullName,
              description: r.description,
              stars: r.stars,
              language: r.language,
              url: r.url,
            })),
          },
          message: `"${query}" için ${repos.length} repo bulundu`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    case "github_list_issues": {
      try {
        const { owner, repo } = args;
        const state = (args.state as 'open' | 'closed' | 'all') || 'open';
        const limit = (args.limit as number) || 10;
        if (!owner || !repo) {
          return { success: false, message: "owner ve repo parametreleri gerekli", error: "Missing parameters" };
        }
        const issues = await githubService.listIssues(owner, repo, state, limit);
        return {
          success: true,
          data: {
            count: issues.length,
            state,
            issues,
          },
          message: `${issues.length} ${state} issue listelendi`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    case "github_create_repo": {
      try {
        const name = args.name as string;
        const description = args.description as string;
        const isPrivate = (args.isPrivate as boolean) || false;
        if (!name) {
          return { success: false, message: "Repo adı gerekli", error: "Missing name" };
        }
        const repo = await githubService.createRepository(name, description, isPrivate);
        return {
          success: true,
          data: repo,
          message: `Repo oluşturuldu: ${repo.fullName}`,
        };
      } catch (error: any) {
        return { success: false, message: error.message, error: error.message };
      }
    }

    default:
      return { success: false, message: `Bilinmeyen araç: ${toolName}`, error: `Unknown tool: ${toolName}` };
  }
}
