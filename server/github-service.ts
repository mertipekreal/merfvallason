import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  isPrivate: boolean;
  updatedAt: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

class GitHubService {
  async getAuthenticatedUser(): Promise<GitHubUser> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.users.getAuthenticated();
    
    return {
      id: data.id,
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
      bio: data.bio,
      publicRepos: data.public_repos,
      followers: data.followers,
      following: data.following,
    };
  }

  async listRepositories(perPage = 30, page = 1): Promise<GitHubRepo[]> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: perPage,
      page,
      sort: 'updated',
      direction: 'desc',
    });

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language,
      isPrivate: repo.private,
      updatedAt: repo.updated_at || '',
    }));
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.repos.get({ owner, repo });

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      language: data.language,
      isPrivate: data.private,
      updatedAt: data.updated_at || '',
    };
  }

  async listCommits(owner: string, repo: string, perPage = 10): Promise<GitHubCommit[]> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: perPage,
    });

    return data.map(commit => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message.split('\n')[0],
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || '',
      url: commit.html_url,
    }));
  }

  async createRepository(name: string, description?: string, isPrivate = false): Promise<GitHubRepo> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    });

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      url: data.html_url,
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      language: data.language,
      isPrivate: data.private,
      updatedAt: data.updated_at || '',
    };
  }

  async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ('content' in data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    throw new Error('File content not found');
  }

  async searchRepositories(query: string, perPage = 10): Promise<GitHubRepo[]> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.search.repos({
      q: query,
      per_page: perPage,
      sort: 'stars',
      order: 'desc',
    });

    return data.items.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      language: repo.language,
      isPrivate: repo.private,
      updatedAt: repo.updated_at || '',
    }));
  }

  async listIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open', perPage = 10): Promise<any[]> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: perPage,
    });

    return data.map(issue => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.user?.login || 'Unknown',
      labels: issue.labels.map((l: any) => typeof l === 'string' ? l : l.name),
      createdAt: issue.created_at,
      url: issue.html_url,
    }));
  }

  async createIssue(owner: string, repo: string, title: string, body?: string): Promise<any> {
    const octokit = await getUncachableGitHubClient();
    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      url: data.html_url,
    };
  }
}

export const githubService = new GitHubService();
