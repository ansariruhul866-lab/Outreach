const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  is_email_verified?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Sender {
  id: string;
  email: string;
  display_name: string;
  provider: string;
  smtp_host?: string;
  smtp_port?: number;
  status: "VERIFIED" | "PENDING" | "FAILED";
  daily_limit: number;
  sent_today: number;
  created_at?: string;
}

export interface Lead {
  id: string;
  folder_id?: string | null;
  email: string;
  first_name?: string;
  company?: string;
  website?: string;
  source_url?: string;
  spam_score?: number;
  is_verified: boolean;
  status: "PENDING" | "SENT" | "OPENED" | "REPLIED" | "FAILED" | "SKIPPED";
  campaign_id?: string;
  sent_at?: string;
  opened_at?: string;
  created_at?: string;
}

export interface LeadFolder {
  id: string;
  name: string;
  description?: string;
  source: string;
  leads_count: number;
  created_at: string;
}

export interface FolderListResponse {
  total_leads: number;
  unassigned_leads: number;
  folders: LeadFolder[];
}

export interface EmailTemplate {
  id: string;
  title: string;
  category: "PITCH" | "FOLLOW_UP" | "OFFER" | "CUSTOM" | string;
  subject: string;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "STOPPED";
  sender_email?: string;
  sender_email_id?: string;
  subject_template?: string;
  body_template?: string;
  leads_count: number;
  pending_count: number;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  send_delay_seconds: number;
  daily_limit: number;
  send_only_once: boolean;
  total_skipped: number;
  assigned_lead_ids?: string[];
  created_at?: string;
}

export interface StatsSummary {
  total_leads: number;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  open_rate: number;
  reply_rate: number;
  active_senders: number;
  active_campaigns: number;
}

export interface ScrapeJob {
  job_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  target_url: string;
  pages_visited: number;
  emails_found: number;
  emails: string[];
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("outreach_token");
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("outreach_token");
      localStorage.removeItem("outreach_user");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.message || "Request failed");
  }

  return data as T;
}

export const api = {
  auth: {
    firebaseLogin: (idToken: string, name?: string, googleAccessToken?: string | null) =>
      apiFetch<AuthResponse>("/auth/firebase-login", {
        method: "POST",
        body: JSON.stringify({ id_token: idToken, name, google_access_token: googleAccessToken }),
      }),
    login: (email: string, password: string) =>
      apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    signup: (name: string, email: string, password: string) =>
      apiFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      }),
    getMe: () => apiFetch<User>("/auth/me"),
  },
  stats: {
    getSummary: () => apiFetch<StatsSummary>("/stats"),
  },
  senders: {
    list: () => apiFetch<Sender[]>("/senders"),
    connect: (payload: {
      email: string;
      display_name: string;
      provider?: string;
      smtp_host?: string;
      smtp_port?: number;
      smtp_user?: string;
      smtp_password?: string;
      daily_limit?: number;
    }) =>
      apiFetch<{ message: string; sender_id: string }>("/senders", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/senders/${id}`, {
        method: "DELETE",
      }),
  },
  leads: {
    list: async (skip = 0, limit = 200, status?: string, folderId?: string) => {
      let q = `/leads?page=1&limit=${limit}`;
      if (status && status !== "ALL") q += `&status=${status}`;
      if (folderId && folderId !== "ALL") q += `&folder_id=${folderId}`;
      const res = await apiFetch<any>(q);
      if (Array.isArray(res)) return res as Lead[];
      if (res && Array.isArray(res.leads)) return res.leads as Lead[];
      return [] as Lead[];
    },
    create: (lead: { email: string; first_name?: string; company?: string; website?: string; source_url?: string; folder_id?: string }) =>
      apiFetch<Lead>("/leads", {
        method: "POST",
        body: JSON.stringify(lead),
      }),
    selectable: (campaignId?: string, folderId?: string) => {
      let q = "/leads/selectable";
      const params: string[] = [];
      if (campaignId) params.push(`campaign_id=${campaignId}`);
      if (folderId && folderId !== "ALL") params.push(`folder_id=${folderId}`);
      if (params.length) q += `?${params.join("&")}`;
      return apiFetch<{ id: string; email: string; company?: string; status: string; campaign_id?: string; folder_id?: string }[]>(q);
    },
    delete: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/leads/${id}`, {
        method: "DELETE",
      }),
    deleteAll: (folderId?: string) => {
      const q = folderId && folderId !== "ALL" ? `/leads/all?folder_id=${folderId}` : "/leads/all";
      return apiFetch<{ success: boolean; deleted: number }>(q, { method: "DELETE" });
    },
    batchDelete: (leadIds: string[]) =>
      apiFetch<{ success: boolean; deleted: number }>("/leads/batch-delete", {
        method: "POST",
        body: JSON.stringify({ lead_ids: leadIds }),
      }),
    moveToFolder: (leadIds: string[], folderId: string | null) =>
      apiFetch<{ success: boolean; updated: number }>("/leads/move", {
        method: "POST",
        body: JSON.stringify({ lead_ids: leadIds, folder_id: folderId }),
      }),
    importCsv: (leads: Array<{ email: string; first_name?: string; company?: string; website?: string }>, folderId?: string) =>
      apiFetch<{ success: boolean; imported: number; duplicates: number }>("/leads/import-csv", {
        method: "POST",
        body: JSON.stringify({ leads, folder_id: folderId }),
      }),
  },
  folders: {
    list: () => apiFetch<FolderListResponse>("/folders"),
    create: (payload: { name: string; description?: string }) =>
      apiFetch<{ id: string; name: string }>("/folders", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { name: string; description?: string }) =>
      apiFetch<{ success: boolean; id: string; name: string }>(`/folders/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string, deleteLeads: boolean = false) =>
      apiFetch<{ success: boolean }>(`/folders/${id}?delete_leads=${deleteLeads}`, {
        method: "DELETE",
      }),
  },
  templates: {
    list: () => apiFetch<EmailTemplate[]>("/templates"),
    create: (payload: { title: string; category?: string; subject: string; body: string }) =>
      apiFetch<{ id: string; title: string; category: string }>("/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { title?: string; category?: string; subject?: string; body?: string }) =>
      apiFetch<{ success: boolean; id: string }>(`/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch<{ success: boolean }>(`/templates/${id}`, {
        method: "DELETE",
      }),
  },
  scraper: {
    scrape: (targetUrl: string, depth = 2, folderId?: string) =>
      apiFetch<ScrapeJob>("/scraper/crawl", {
        method: "POST",
        body: JSON.stringify({ url: targetUrl, depth, folder_id: folderId }),
      }),
    bulkScrape: (urls: string[], depth = 2, folderId?: string, folderName?: string) =>
      apiFetch<{ message: string; total_jobs: number; job_ids: string[] }>("/scraper/bulk-crawl", {
        method: "POST",
        body: JSON.stringify({ urls, depth, folder_id: folderId, folder_name: folderName }),
      }),
    getJob: (jobId: string) => apiFetch<ScrapeJob>(`/scraper/jobs/${jobId}`),
  },
  campaigns: {
    list: () => apiFetch<Campaign[]>("/campaigns"),
    get: (id: string) => apiFetch<Campaign>(`/campaigns/${id}`),
    create: (campaign: {
      name: string;
      type: string;
      sender_email_id: string;
      subject_template: string;
      body_template: string;
      daily_limit?: number;
      send_delay_seconds?: number;
      send_only_once?: boolean;
      lead_ids?: string[];
    }) =>
      apiFetch<{ success: boolean; id: string; name: string }>("/campaigns", {
        method: "POST",
        body: JSON.stringify(campaign),
      }),
    update: (
      id: string,
      campaign: {
        name?: string;
        type?: string;
        sender_email_id?: string;
        subject_template?: string;
        body_template?: string;
        daily_limit?: number;
        send_delay_seconds?: number;
        send_only_once?: boolean;
        lead_ids?: string[];
      }
    ) =>
      apiFetch<{ success: boolean; id: string; name: string }>(`/campaigns/${id}`, {
        method: "PUT",
        body: JSON.stringify(campaign),
      }),
    delete: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/campaigns/${id}`, {
        method: "DELETE",
      }),
    start: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/campaigns/${id}/start`, {
        method: "POST",
      }),
    pause: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/campaigns/${id}/pause`, {
        method: "POST",
      }),
  },
};
