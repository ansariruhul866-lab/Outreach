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
  email?: string;
  phone?: string;
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
  ai_pitch_subject?: string;
  ai_pitch_body?: string;
  ai_pitch_whatsapp?: string;
  ai_pitch_strategy?: string;
  ai_pitch_generated_at?: string;
}

export interface WhatsAppSender {
  id: string;
  phone_number: string;
  display_name: string;
  is_default: boolean;
  created_at: string;
}

export interface WhatsAppMessageLog {
  id: string;
  recipient_phone: string;
  recipient_name: string;
  message: string;
  status: string;
  created_at: string;
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

export interface AttachmentItem {
  filename: string;
  content_base64: string;
  mime_type?: string;
  size?: number;
}

export interface EmailTemplate {
  id: string;
  title: string;
  category: "PITCH" | "FOLLOW_UP" | "OFFER" | "CUSTOM" | string;
  subject: string;
  body: string;
  attachments?: AttachmentItem[];
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
  attachments_count?: number;
  attachments?: AttachmentItem[];
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

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    if (hostname === "127.0.0.1") {
      return `${protocol}//127.0.0.1:8000/api`;
    }
    if (hostname === "localhost") {
      return `${protocol}//localhost:8000/api`;
    }
  }
  return "http://localhost:8000/api";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("outreach_token");
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = getApiBase();

  let res: Response;
  try {
    res = await fetch(`${base}${cleanEndpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // Quick retry after 800ms in case backend was briefly restarting
    try {
      await new Promise((r) => setTimeout(r, 800));
      res = await fetch(`${base}${cleanEndpoint}`, {
        ...options,
        headers,
      });
    } catch (retryErr: any) {
      console.error("apiFetch network failure:", retryErr);
      throw new Error(
        `Unable to connect to backend server at ${base}. Please ensure the FastAPI backend is running on port 8000.`
      );
    }
  }

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("outreach_token");
      localStorage.removeItem("outreach_user");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned invalid response (${res.status} ${res.statusText})`);
  }

  if (!res.ok) {
    const msg =
      typeof data.detail === "string"
        ? data.detail
        : Array.isArray(data.detail)
        ? data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ")
        : data.message || "Request failed";
    throw new Error(msg);
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
    list: async (
      skip = 0,
      limit = 200,
      status?: string,
      folderId?: string,
      segment?: string,
      sortBy?: string,
      sortOrder?: string
    ) => {
      let q = `/leads?page=1&limit=${limit}`;
      if (status && status !== "ALL") q += `&status=${status}`;
      if (folderId && folderId !== "ALL") q += `&folder_id=${folderId}`;
      if (segment && segment !== "ALL") q += `&segment=${segment}`;
      if (sortBy) q += `&sort_by=${sortBy}`;
      if (sortOrder) q += `&sort_order=${sortOrder}`;
      const res = await apiFetch<any>(q);
      if (Array.isArray(res)) return res as Lead[];
      if (res && Array.isArray(res.leads)) return res.leads as Lead[];
      return [] as Lead[];
    },
    generatePitch: (
      leadId: string,
      payload?: { sender_name?: string; agency_or_service?: string; api_key?: string }
    ) =>
      apiFetch<{
        success: boolean;
        lead_id: string;
        strategy: string;
        subject: string;
        problem: string;
        solution: string;
        why_choose_me: string;
        email_body: string;
        whatsapp_message: string;
        model_used?: string;
      }>(`/leads/${leadId}/generate-pitch`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      }),
    batchGeneratePitches: (payload: {
      lead_ids: string[];
      sender_name?: string;
      agency_or_service?: string;
      api_key?: string;
    }) =>
      apiFetch<{
        success: boolean;
        total: number;
        generated: number;
        errors: Array<{ lead_id: string; company?: string; error: string }>;
        message: string;
      }>("/leads/batch-generate-pitches", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    create: (lead: { email?: string; phone?: string; first_name?: string; company?: string; website?: string; source_url?: string; folder_id?: string }) =>
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
      return apiFetch<{ id: string; email: string; phone?: string; company?: string; status: string; campaign_id?: string; folder_id?: string }[]>(q);
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
    importCsv: (leads: Array<{ email?: string; phone?: string; first_name?: string; company?: string; website?: string }>, folderId?: string) =>
      apiFetch<{ success: boolean; imported: number; duplicates: number }>("/leads/import-csv", {
        method: "POST",
        body: JSON.stringify({ leads, folder_id: folderId }),
      }),
    uploadExtract: (file: File, folderName?: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (folderName) formData.append("folder_name", folderName);
      return apiFetch<{
        success: boolean;
        folder_id: string;
        folder_name: string;
        total_extracted: number;
        emails_count: number;
        phones_count: number;
        imported: number;
        duplicates: number;
        message: string;
      }>("/leads/upload-extract", {
        method: "POST",
        body: formData,
      });
    },
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
    create: (payload: { title: string; category?: string; subject: string; body: string; attachments?: AttachmentItem[] }) =>
      apiFetch<{ id: string; title: string; category: string }>("/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: { title?: string; category?: string; subject?: string; body?: string; attachments?: AttachmentItem[] }) =>
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
      attachments?: AttachmentItem[];
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
        attachments?: AttachmentItem[];
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
  whatsapp: {
    listSenders: () => apiFetch<WhatsAppSender[]>("/whatsapp/senders"),
    addSender: (payload: { phone_number: string; display_name: string; is_default?: boolean }) =>
      apiFetch<{ id: string; phone_number: string; display_name: string }>("/whatsapp/senders", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    deleteSender: (senderId: string) =>
      apiFetch<{ success: boolean }>(`/whatsapp/senders/${senderId}`, {
        method: "DELETE",
      }),
    generateLink: (payload: {
      sender_id?: string;
      lead_id?: string;
      recipient_phone: string;
      recipient_name?: string;
      message: string;
    }) =>
      apiFetch<{
        success: boolean;
        recipient_phone: string;
        wa_link: string;
        web_link: string;
        message_id: string;
      }>("/whatsapp/generate-link", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    bulkGenerateLinks: (payload: {
      sender_id?: string;
      message_template: string;
      lead_ids: string[];
    }) =>
      apiFetch<{
        total: number;
        items: Array<{
          lead_id: string;
          recipient_name: string;
          recipient_phone: string;
          message: string;
          wa_link: string;
          web_link: string;
        }>;
      }>("/whatsapp/bulk-generate-links", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    logSent: (payload: {
      lead_id?: string;
      recipient_phone: string;
      recipient_name?: string;
      message: string;
      sender_id?: string;
    }) =>
      apiFetch<{ success: boolean; message_id: string }>("/whatsapp/log-sent", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    batchLogSent: (items: Array<{
      lead_id?: string;
      recipient_phone: string;
      recipient_name?: string;
      message: string;
      sender_id?: string;
    }>) =>
      apiFetch<{ success: boolean; count: number }>("/whatsapp/batch-log-sent", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
    getHistory: () => apiFetch<WhatsAppMessageLog[]>("/whatsapp/history"),
  },
  discovery: {
    getSerp: (payload: { query: string; purpose?: string; region?: string; num_results?: number }) =>
      apiFetch<{
        query: string;
        purpose: string;
        region?: string;
        total: number;
        results: Array<{
          rank: number;
          title: string;
          url: string;
          domain: string;
          snippet: string;
          site_name?: string;
          keywords?: string[];
          headings_outline?: Array<{ level: number; text: string }>;
          word_count?: number;
          reading_time?: string;
          schemas_detected?: string[];
        }>;
      }>("/discovery/serp", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    extractAndOrganize: (payload: {
      query: string;
      purpose: string;
      region?: string;
      selected_items: Array<{
        rank: number;
        title: string;
        url: string;
        domain: string;
        snippet: string;
      }>;
      use_ai_personalization?: boolean;
      sender_email_id?: string;
      custom_template_id?: string;
      auto_create_campaign?: boolean;
      follow_up_enabled?: boolean;
      follow_up_delay_days?: number;
    }) =>
      apiFetch<{
        folder_id: string;
        folder_name: string;
        total_extracted: number;
        campaign_id?: string;
        message: string;
      }>("/discovery/extract-and-organize", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getReplies: () =>
      apiFetch<
        Array<{
          id: string;
          company: string;
          email: string;
          website: string;
          serp_rank?: number;
          search_purpose?: string;
          reply_received_at?: string;
          reply_body?: string;
          ai_draft_reply?: string;
          status: string;
        }>
      >("/discovery/replies"),
    simulateReply: (payload: { lead_id: string; reply_text: string }) =>
      apiFetch<{
        success: boolean;
        message: string;
        ai_draft_reply: string;
      }>("/discovery/simulate-reply", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    draftBlog: (payload: {
      query: string;
      purpose?: string;
      selected_blogs?: any[];
      target_tone?: string;
    }) =>
      apiFetch<{
        title: string;
        meta_title?: string;
        meta_description?: string;
        primary_keyword?: string;
        secondary_keywords?: string[];
        reading_time_minutes?: number;
        outline?: Array<{ level: number; heading: string }>;
        humanized_blog_markdown: string;
        clean_html?: string;
        schema_json_ld?: string;
        humanization_score?: number;
        copywriter_insights?: string;
        model_used?: string;
      }>("/discovery/draft-blog", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getKeywordPlan: (payload: { query: string; region?: string; top_sites?: any[] }) =>
      apiFetch<{
        total_analyzed_sites: number;
        core_common_keywords: Array<{
          keyword: string;
          search_intent: string;
          difficulty: string;
          opportunity_score: number;
          competitors_using: string[];
          recommended_structure: string;
        }>;
        high_opportunity_keywords: Array<{
          keyword: string;
          search_intent: string;
          difficulty: string;
          opportunity_score: number;
          why_high_rank_chance: string;
          recommended_structure: string;
        }>;
        lsi_semantic_keywords: string[];
        content_architecture_plan: string;
        model_used?: string;
      }>("/discovery/keyword-plan", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    getCompetitorStrategy: (payload: { query: string; region?: string; selected_competitors?: any[] }) =>
      apiFetch<{
        niche_overview: string;
        competitor_landscape: Array<{
          competitor: string;
          business_model: string;
          core_offering: string;
          strengths: string;
          vulnerabilities: string;
          gap_to_exploit: string;
        }>;
        top_market_gaps: Array<{
          gap_title: string;
          description: string;
          opportunity_level: string;
        }>;
        battle_plan_summary: string;
        model_used?: string;
      }>("/discovery/competitor-strategy", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
