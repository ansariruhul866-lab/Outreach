// OutreachBot SaaS Dashboard Logic
const token = localStorage.getItem('outreach_token');
const userStr = localStorage.getItem('outreach_user');

if (!token) {
  if (window.location.search.includes('verified=1')) {
    window.location.href = '/static/index.html?verified=1';
  } else {
    window.location.href = '/static/index.html';
  }
}

const user = userStr ? JSON.parse(userStr) : { name: 'User', email: 'user@domain.com' };

// Initialize User UI
document.getElementById('userName').innerText = user.name || 'User';
document.getElementById('userEmail').innerText = user.email || '';
document.getElementById('userAvatar').innerText = (user.name || 'U').charAt(0).toUpperCase();

// Templates Presets
const PRESETS = {
  BACKLINK: {
    subject: "Quick collaboration idea for {{company}}",
    body: `<p>Hi {{firstName}},</p>
<p>I came across your site <a href="{{website}}">{{company}}</a> and really enjoyed your recent coverage.</p>
<p>I run growth at our firm and noticed several overlapping topics where our readers would find value. I'd love to propose a mutual backlink exchange or contribute a guest editorial piece tailored specifically for your audience.</p>
<p>Would you be open to a quick 5-minute chat or exchanging ideas over email?</p>
<p>Best regards,<br><strong>{{senderName}}</strong></p>`
  },
  SERVICE_PITCH: {
    subject: "Accelerating digital growth for {{company}}",
    body: `<p>Hi {{firstName}},</p>
<p>I noticed what you're building at <strong>{{company}}</strong> and wanted to reach out directly.</p>
<p>We specialize in organic search optimization, custom web systems, and inbound growth pipelines that help brands drive qualified leads consistently.</p>
<p>We recently put together 3 quick ideas that could help boost your organic reach this quarter. Happy to share them with no strings attached if you're interested?</p>
<p>Best,<br><strong>{{senderName}}</strong></p>`
  },
  PARTNERSHIP: {
    subject: "Strategic partnership idea with {{company}}",
    body: `<p>Hi {{firstName}},</p>
<p>I've been following <strong>{{company}}</strong> and believe there's a strong synergistic opportunity between our two businesses.</p>
<p>We could cross-refer clients, co-market high-intent content, and build long-term value together.</p>
<p>Let me know if you might be open to a brief introductory call this week or next.</p>
<p>Warmly,<br><strong>{{senderName}}</strong></p>`
  },
  CUSTOM: {
    subject: "Hello {{firstName}}",
    body: `<p>Hi {{firstName}},</p>
<p>Write your custom proposal message here...</p>
<p>Best,<br><strong>{{senderName}}</strong></p>`
  }
};

function logout() {
  localStorage.removeItem('outreach_token');
  localStorage.removeItem('outreach_user');
  window.location.href = '/static/index.html';
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');

  // Update Nav highlighting
  document.querySelectorAll('aside nav button').forEach(btn => {
    btn.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors text-slate-400 hover:bg-slate-800 hover:text-white";
  });
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors bg-orange-500/10 text-orange-400 border border-orange-500/20";
  }

  if (tabId === 'dashboard') loadStats();
  if (tabId === 'senders') loadSenders();
  if (tabId === 'leads') loadLeads();
  if (tabId === 'campaigns') loadCampaigns();
}

const API_BASE = window.location.hostname.includes('vercel.app')
  ? 'https://outreach-359l.onrender.com'
  : '';

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const res = await fetch(`${API_BASE}/api${cleanEndpoint}`, { ...options, headers });
  if (res.status === 401) {
    logout();
    return;
  }
  return res;
}

// ----------------- DASHBOARD -----------------
async function loadStats() {
  try {
    const res = await apiFetch('/stats');
    if (!res || !res.ok) return;
    const data = await res.json();
    document.getElementById('statLeads').innerText = data.total_leads;
    document.getElementById('statSent').innerText = data.total_sent;
    document.getElementById('statOpenRate').innerText = `${data.open_rate}%`;
    document.getElementById('statOpened').innerText = `${data.total_opened} opens tracked`;
    document.getElementById('statSenders').innerText = data.active_senders;
  } catch (err) {
    console.error('Failed to load stats', err);
  }
}

// ----------------- SENDERS -----------------
function toggleSenderForm() {
  const card = document.getElementById('senderFormCard');
  card.classList.toggle('hidden');
}

function handleProviderChange(val) {
  const customFields = document.getElementById('customSmtpFields');
  const smtpFields = document.getElementById('smtpFields');
  const cloudRelayFields = document.getElementById('cloudRelayFields');
  const host = document.getElementById('sHost');
  const banner = document.getElementById('senderGuideBanner');

  if (val === 'HYBRID' || val === 'BREVO' || val === 'RESEND') {
    if (cloudRelayFields) cloudRelayFields.classList.remove('hidden');
    if (smtpFields) smtpFields.classList.add('hidden');
    if (customFields) customFields.classList.add('hidden');
    if (banner) {
      banner.innerHTML = `<strong class="text-orange-400">Cloud Relay Mode (Recommended for Render):</strong> Uses secure <strong>HTTPS Port 443</strong> (never blocked by Render or firewalls).
      Combines <strong>Brevo (300 free emails/day)</strong> + <strong>Resend (3,000 free emails/month)</strong>. When one's credits are exhausted, OutreachBot switches to the other automatically!`;
    }
  } else if (val === 'CUSTOM') {
    if (cloudRelayFields) cloudRelayFields.classList.add('hidden');
    if (smtpFields) smtpFields.classList.remove('hidden');
    if (customFields) customFields.classList.remove('hidden');
    if (banner) {
      banner.innerHTML = `<strong class="text-amber-400">Custom SMTP:</strong> Requires outbound SMTP ports (587/465). Note: Render Free blocks these ports; use Cloud Relay on Render or run locally via <code class="text-white">run.bat</code>.`;
    }
  } else {
    // GMAIL or OUTLOOK
    if (cloudRelayFields) cloudRelayFields.classList.add('hidden');
    if (smtpFields) smtpFields.classList.remove('hidden');
    if (customFields) customFields.classList.add('hidden');
    if (host) host.value = val === 'GMAIL' ? 'smtp.gmail.com' : 'smtp.office365.com';
    if (banner) {
      banner.innerHTML = `<strong class="text-orange-400">${val === 'GMAIL' ? 'Gmail' : 'Outlook'} SMTP:</strong> Generate an App Password in your account security settings. Note: Port 587 is blocked on Render Free; if deploying on Render, select <strong>Cloud Relay (Brevo + Resend)</strong> above.`;
    }
  }
}

async function loadSenders() {
  try {
    const res = await apiFetch('/senders');
    if (!res || !res.ok) return;
    const senders = await res.json();
    const container = document.getElementById('sendersList');

    if (senders.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-500">
          <p class="font-bold text-white text-base">No mailboxes connected</p>
          <p class="text-xs text-slate-400 mt-1">Connect your Brevo, Resend, or Gmail account to start sending campaigns.</p>
        </div>`;
      return;
    }

    container.innerHTML = senders.map(s => {
      let provBadge = s.provider;
      let provClass = "bg-slate-800 text-slate-300";
      if (s.provider === 'HYBRID') {
        provBadge = '⚡ Cloud Relay (Brevo + Resend)';
        provClass = 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      } else if (s.provider === 'BREVO') {
        provBadge = 'Brevo API (300/day)';
        provClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      } else if (s.provider === 'RESEND') {
        provBadge = 'Resend API (3k/mo)';
        provClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      }

      const relayInfo = s.last_used_relay ? `<span class="text-[10px] text-orange-400 font-mono ml-2">Active: ${s.last_used_relay.toUpperCase()}</span>` : '';

      return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">${s.display_name}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${provClass}">${provBadge}</span>
            ${relayInfo}
          </div>
          <p class="text-xs text-slate-400 mt-0.5">${s.email}</p>
          <p class="text-[11px] text-slate-500 mt-1">Daily quota: ${s.daily_limit} | Sent today: ${s.sent_today}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${
            s.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            s.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }">
            ${s.status === 'VERIFIED' ? '✓ Verified' : s.status === 'PENDING' ? '⏳ Verification Pending' : '✕ Failed'}
          </span>
          <button onclick="deleteSender('${s.id}')" class="text-xs text-red-400 hover:text-red-300 border border-red-500/20 px-2.5 py-1 rounded-lg">
            Disconnect
          </button>
        </div>
      </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

async function handleConnectSender(e) {
  e.preventDefault();
  const btn = document.getElementById('sSubmitBtn');
  btn.disabled = true;
  btn.innerText = 'Testing Connection...';

  const provider = document.getElementById('sProvider').value;
  const payload = {
    email: document.getElementById('sEmail').value.trim(),
    display_name: document.getElementById('sName').value.trim(),
    provider: provider,
    smtp_host: document.getElementById('sHost') ? document.getElementById('sHost').value.trim() : 'smtp.gmail.com',
    smtp_port: document.getElementById('sPort') ? parseInt(document.getElementById('sPort').value) : 587,
    smtp_user: document.getElementById('sEmail').value.trim(),
    smtp_password: document.getElementById('sPassword') ? document.getElementById('sPassword').value.trim() : '',
    brevo_api_key: document.getElementById('sBrevoKey') ? document.getElementById('sBrevoKey').value.trim() : '',
    resend_api_key: document.getElementById('sResendKey') ? document.getElementById('sResendKey').value.trim() : ''
  };

  try {
    const res = await apiFetch('/senders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Failed to authenticate mailbox');
      return;
    }

    alert(data.message || 'Connected & verified successfully!');
    toggleSenderForm();
    loadSenders();
  } catch (err) {
    alert('Connection error occurred');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Test & Connect Mailbox';
  }
}

async function deleteSender(id) {
  if (!confirm('Disconnect this mailbox?')) return;
  await apiFetch(`/senders/${id}`, { method: 'DELETE' });
  loadSenders();
}

// ----------------- SCRAPER -----------------
let currentBatchResults = [];

function setScraperMode(mode) {
  const bulkBtn = document.getElementById('btnModeBulk');
  const singleBtn = document.getElementById('btnModeSingle');
  const bulkCard = document.getElementById('bulkScrapeCard');
  const singleCard = document.getElementById('singleScrapeCard');

  if (mode === 'bulk') {
    bulkBtn.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all bg-orange-500 text-white shadow-md';
    singleBtn.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white';
    bulkCard.classList.remove('hidden');
    singleCard.classList.add('hidden');
  } else {
    singleBtn.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all bg-orange-500 text-white shadow-md';
    bulkBtn.className = 'px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white';
    singleCard.classList.remove('hidden');
    bulkCard.classList.add('hidden');
  }
}

function loadSampleDomains() {
  const sampleDomains = [
    'stripe.com',
    'vercel.com',
    'supabase.com',
    'github.com',
    'linear.app',
    'shopify.com',
    'airbnb.com',
    'notion.so',
    'webflow.com',
    'canva.com'
  ];
  document.getElementById('bulkUrls').value = sampleDomains.join('\n');
}

function clearBulkDomains() {
  document.getElementById('bulkUrls').value = '';
}

function updateDepth(val) {
  document.getElementById('depthVal').innerText = val;
  const hints = ['Homepage only', 'Up to ~25 pages', 'Up to ~50 pages', 'Deep crawl'];
  document.getElementById('depthHint').innerText = hints[val - 1];
}

async function handleStartBulkScrape(e) {
  e.preventDefault();
  const rawText = document.getElementById('bulkUrls').value.trim();
  if (!rawText) {
    alert('Please enter at least 1 website URL or domain.');
    return;
  }

  const urls = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const scope = document.getElementById('bulkCrawlScope').value;
  const depth = scope === 'fast' ? 2 : 3;
  const maxPages = scope === 'fast' ? 18 : 35;

  const btn = document.getElementById('bulkScrapeBtn');
  const progressBox = document.getElementById('scrapeProgressBox');
  const resultBox = document.getElementById('bulkResultBox');

  btn.disabled = true;
  btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Extracting Emails from ${urls.length} Sites...`;
  progressBox.classList.remove('hidden');
  resultBox.classList.add('hidden');
  document.getElementById('scrapeProgressTitle').innerText = `Crawling ${urls.length} websites in parallel...`;

  try {
    const res = await apiFetch('/scraper/bulk-crawl', {
      method: 'POST',
      body: JSON.stringify({
        urls,
        depth,
        max_pages_per_site: maxPages
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Bulk scraping failed');
      return;
    }

    currentBatchResults = data.sites || [];

    // Populate Metrics
    document.getElementById('bTotalSites').innerText = data.total_sites;
    document.getElementById('bSuccessSites').innerText = data.successful_sites;
    document.getElementById('bPagesVisited').innerText = data.total_pages_visited;
    document.getElementById('bCleanEmails').innerText = data.total_clean_emails;
    document.getElementById('bSavedLeads').innerText = data.total_saved_leads;

    // Populate Breakdown Table
    const tableContainer = document.getElementById('siteResultsTable');
    if (!data.sites || data.sites.length === 0) {
      tableContainer.innerHTML = '<div class="p-6 text-center text-slate-500">No websites processed</div>';
    } else {
      tableContainer.innerHTML = data.sites.map(site => {
        const isSuccess = site.emails && site.emails.length > 0;
        const statusBadge = isSuccess
          ? `<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">✓ ${site.emails.length} Found</span>`
          : site.status === 'FAILED'
            ? `<span class="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[11px]">Failed</span>`
            : `<span class="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[11px]">0 Emails</span>`;

        const emailBadges = isSuccess
          ? site.emails.map(email => `
              <span onclick="copyEmail(this, '${email}')" title="Click to copy" class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-orange-500/30 hover:border-orange-500 text-orange-300 font-mono text-[11px] transition-all">
                ✉️ ${email}
              </span>
            `).join(' ')
          : `<span class="text-slate-500 italic">No public email found on crawled pages</span>`;

        return `
          <div class="p-4 hover:bg-slate-900/60 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm">${site.company || site.domain}</span>
                <a href="${site.url}" target="_blank" class="text-slate-500 hover:text-slate-300 text-[11px]">(${site.domain}) ↗</a>
                ${statusBadge}
                <span class="text-[10px] text-slate-500">${site.pages_visited} pages</span>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-0.5">
                ${emailBadges}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    resultBox.classList.remove('hidden');
    // Reload dashboard numbers in background
    loadStats();
  } catch (err) {
    console.error('Bulk scrape error:', err);
    alert('Scraper error: ' + (err.message || 'Network request failed. Make sure server is running.'));
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span>🚀</span> Extract Clean Emails from All Websites`;
    progressBox.classList.add('hidden');
  }
}

async function handleStartSingleScrape(e) {
  e.preventDefault();
  const btn = document.getElementById('singleScrapeBtn');
  const url = document.getElementById('scrapeUrl').value.trim();
  const depth = parseInt(document.getElementById('scrapeDepth').value);

  if (!url) {
    alert('Please enter a target URL');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div> Crawling site...`;

  try {
    const res = await apiFetch('/scraper/crawl', {
      method: 'POST',
      body: JSON.stringify({ url, depth })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Scraping failed');
      return;
    }

    // Switch to bulk view and display the single result cleanly
    setScraperMode('bulk');
    document.getElementById('bTotalSites').innerText = '1';
    document.getElementById('bSuccessSites').innerText = data.emails_clean > 0 ? '1' : '0';
    document.getElementById('bPagesVisited').innerText = data.pages_visited;
    document.getElementById('bCleanEmails').innerText = data.emails_clean;
    document.getElementById('bSavedLeads').innerText = data.saved_to_db;

    const emailBadges = data.emails && data.emails.length > 0
      ? data.emails.map(email => `
          <span onclick="copyEmail(this, '${email}')" title="Click to copy" class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-orange-500/30 hover:border-orange-500 text-orange-300 font-mono text-[11px] transition-all">
            ✉️ ${email}
          </span>
        `).join(' ')
      : `<span class="text-slate-500 italic">No public email found</span>`;

    document.getElementById('siteResultsTable').innerHTML = `
      <div class="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-sm">${data.target_url}</span>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]">✓ ${data.emails_clean} Found</span>
            <span class="text-[10px] text-slate-500">${data.pages_visited} pages</span>
          </div>
          <div class="flex flex-wrap gap-1.5 pt-0.5">${emailBadges}</div>
        </div>
      </div>
    `;

    document.getElementById('bulkResultBox').classList.remove('hidden');
    loadStats();
  } catch (err) {
    console.error('Single scrape error:', err);
    alert('Scraper error: ' + (err.message || 'Network request failed.'));
  } finally {
    btn.disabled = false;
    btn.innerText = '🕷️ Crawl & Extract Clean Emails';
  }
}

function copyEmail(el, email) {
  navigator.clipboard.writeText(email);
  const orig = el.innerHTML;
  el.innerHTML = '✓ Copied!';
  el.classList.add('bg-emerald-500/20', 'text-emerald-300');
  setTimeout(() => {
    el.innerHTML = orig;
    el.classList.remove('bg-emerald-500/20', 'text-emerald-300');
  }, 1500);
}

function exportBatchCsv() {
  if (!currentBatchResults || currentBatchResults.length === 0) {
    alert('No batch results to export yet. Run a scrape first.');
    return;
  }

  let rows = [["Email", "Company", "Website", "Status"]];
  for (const site of currentBatchResults) {
    if (site.emails && site.emails.length > 0) {
      for (const email of site.emails) {
        rows.push([email, site.company || '', site.url || '', site.status || '']);
      }
    } else {
      rows.push(["", site.company || '', site.url || '', site.status || '']);
    }
  }

  const csvString = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `outreachbot_batch_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

async function exportAllLeadsCsv() {
  const t = localStorage.getItem('outreach_token');
  if (!t) {
    alert('Please log in first.');
    return;
  }
  try {
    const res = await apiFetch('/leads/export');
    if (!res || !res.ok) {
      window.open(`${API_BASE}/api/leads/export?token=${encodeURIComponent(t)}`, '_blank');
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outreachbot_all_leads_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    window.open(`/api/leads/export?token=${encodeURIComponent(t)}`, '_blank');
  }
}

// ----------------- LEADS -----------------
async function loadLeads() {
  const search = document.getElementById('leadSearchInput') ? document.getElementById('leadSearchInput').value : '';
  const tbody = document.getElementById('leadsTableBody');

  try {
    const res = await apiFetch(`/leads?search=${encodeURIComponent(search)}`);
    if (!res || !res.ok) return;
    const data = await res.json();

    if (data.leads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">No leads extracted yet. Scrape websites to populate leads.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.leads.map(l => `
      <tr class="hover:bg-slate-800/40 transition-colors">
        <td class="px-5 py-3.5 font-bold text-white">${l.email}</td>
        <td class="px-5 py-3.5 text-xs text-slate-400">${l.company || '—'}</td>
        <td class="px-5 py-3.5">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            MX OK
          </span>
        </td>
        <td class="px-5 py-3.5">
          ${l.status === 'SENT' ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SENT</span>' :
            l.status === 'SKIPPED' ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">SKIPPED (Duplicate)</span>' :
            l.status === 'FAILED' ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">FAILED</span>' :
            `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">${l.status}</span>`}
        </td>
        <td class="px-5 py-3.5 text-right">
          <button onclick="deleteLead('${l.id}')" class="text-xs text-red-400 hover:text-red-300">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function deleteLead(id) {
  await apiFetch(`/leads/${id}`, { method: 'DELETE' });
  loadLeads();
}

// ----------------- CAMPAIGNS -----------------
let selectableLeadsCache = [];
let campaignPollInterval = null;

function toggleCampaignForm(isEdit = false) {
  const card = document.getElementById('campaignFormCard');
  if (!isEdit && !card.classList.contains('hidden')) {
    card.classList.add('hidden');
    return;
  }

  card.classList.remove('hidden');

  if (!isEdit) {
    document.getElementById('cId').value = '';
    document.getElementById('cFormTitle').innerText = 'Create Cold Outreach Campaign';
    document.getElementById('cSubmitBtn').innerText = 'Save Campaign';
    document.getElementById('cName').value = '';
    applyPresetTemplate('BACKLINK');
    populateSenderDropdown();
    loadSelectableLeads([]);
  }
}

function applyPresetTemplate(type) {
  const preset = PRESETS[type] || PRESETS.CUSTOM;
  document.getElementById('cSubject').value = preset.subject;
  document.getElementById('cBody').value = preset.body;
}

async function populateSenderDropdown(selectedId = '') {
  const select = document.getElementById('cSenderSelect');
  try {
    const res = await apiFetch('/senders');
    if (!res || !res.ok) return;
    const senders = await res.json();
    const verified = senders.filter(s => s.status === 'VERIFIED');

    if (verified.length === 0) {
      select.innerHTML = '<option value="">⚠️ No verified senders. Connect a mailbox first!</option>';
      return;
    }

    select.innerHTML = verified.map(s => `
      <option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${s.display_name} (${s.email})</option>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadSelectableLeads(preselectedIds = []) {
  const listEl = document.getElementById('cLeadList');
  try {
    const res = await apiFetch('/leads/selectable');
    if (!res || !res.ok) {
      listEl.innerHTML = '<div class="p-3 text-center text-xs text-slate-500">Could not fetch prospects.</div>';
      return;
    }
    selectableLeadsCache = await res.json();

    if (selectableLeadsCache.length === 0) {
      listEl.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">No prospects available. Scrape websites first to extract emails!</div>';
      updateSelectedCount();
      return;
    }

    renderLeadCheckboxes(preselectedIds);
  } catch (err) {
    listEl.innerHTML = '<div class="p-3 text-center text-xs text-red-400">Failed to load prospects.</div>';
  }
}

function renderLeadCheckboxes(preselectedIds = []) {
  const listEl = document.getElementById('cLeadList');
  const preselectedSet = new Set(preselectedIds);

  listEl.innerHTML = selectableLeadsCache.map(lead => {
    const isChecked = preselectedIds.length > 0
      ? preselectedSet.has(lead.id)
      : (!lead.campaign_id && lead.status === 'PENDING');

    const statusBadge = lead.status === 'SENT'
      ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SENT</span>'
      : lead.status === 'SKIPPED'
      ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">SKIPPED</span>'
      : `<span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">${lead.status}</span>`;

    const assignedTag = lead.campaign_id ? '<span class="text-[9px] text-slate-500 italic">(assigned)</span>' : '';

    return `
      <label class="lead-checkbox-row flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors" data-email="${lead.email.toLowerCase()}" data-company="${(lead.company || '').toLowerCase()}" data-unassigned="${!lead.campaign_id}">
        <div class="flex items-center gap-2.5 overflow-hidden">
          <input type="checkbox" value="${lead.id}" ${isChecked ? 'checked' : ''} onchange="updateSelectedCount()" class="cLeadCheckbox h-4 w-4 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-0">
          <div class="truncate">
            <span class="font-bold text-white text-xs">${lead.email}</span>
            <span class="text-slate-400 text-[11px] ml-1.5">${lead.company || ''}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 ml-2">
          ${assignedTag}
          ${statusBadge}
        </div>
      </label>
    `;
  }).join('');

  updateSelectedCount();
}

function filterLeadCheckboxes(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.lead-checkbox-row').forEach(row => {
    const email = row.getAttribute('data-email') || '';
    const company = row.getAttribute('data-company') || '';
    if (!q || email.includes(q) || company.includes(q)) {
      row.style.display = 'flex';
    } else {
      row.style.display = 'none';
    }
  });
}

function toggleAllLeadCheckboxes(selectAll) {
  document.querySelectorAll('.lead-checkbox-row').forEach(row => {
    if (row.style.display !== 'none') {
      const cb = row.querySelector('.cLeadCheckbox');
      if (cb) cb.checked = selectAll;
    }
  });
  updateSelectedCount();
}

function selectUnassignedLeadCheckboxes() {
  document.querySelectorAll('.lead-checkbox-row').forEach(row => {
    const isUnassigned = row.getAttribute('data-unassigned') === 'true';
    const cb = row.querySelector('.cLeadCheckbox');
    if (cb) {
      cb.checked = isUnassigned;
    }
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  const checked = document.querySelectorAll('.cLeadCheckbox:checked').length;
  const countEl = document.getElementById('cSelectedCount');
  if (countEl) countEl.innerText = checked;
}

function getSelectedLeadIds() {
  const checkboxes = document.querySelectorAll('.cLeadCheckbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

async function openEditCampaign(campaignId) {
  try {
    const res = await apiFetch(`/campaigns/${campaignId}`);
    if (!res || !res.ok) {
      alert('Failed to load campaign details');
      return;
    }
    const c = await res.json();

    document.getElementById('cId').value = c.id;
    document.getElementById('cFormTitle').innerText = `Edit Campaign: ${c.name}`;
    document.getElementById('cSubmitBtn').innerText = 'Update Campaign';
    document.getElementById('cName').value = c.name;
    document.getElementById('cType').value = c.type;
    document.getElementById('cSubject').value = c.subject_template;
    document.getElementById('cBody').value = c.body_template;
    document.getElementById('cDailyLimit').value = c.daily_limit;
    document.getElementById('cDelay').value = c.send_delay_seconds;
    document.getElementById('cSendOnlyOnce').checked = c.send_only_once;

    await populateSenderDropdown(c.sender_email_id);
    toggleCampaignForm(true);
    await loadSelectableLeads(c.assigned_lead_ids || []);
    
    document.getElementById('campaignFormCard').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    alert('Error fetching campaign details');
  }
}

async function handleSaveCampaign(e) {
  e.preventDefault();
  const cId = document.getElementById('cId').value;
  const selectedLeadIds = getSelectedLeadIds();

  const payload = {
    name: document.getElementById('cName').value,
    type: document.getElementById('cType').value,
    sender_email_id: document.getElementById('cSenderSelect').value,
    subject_template: document.getElementById('cSubject').value,
    body_template: document.getElementById('cBody').value,
    daily_limit: parseInt(document.getElementById('cDailyLimit').value),
    send_delay_seconds: parseInt(document.getElementById('cDelay').value),
    send_only_once: document.getElementById('cSendOnlyOnce').checked,
    lead_ids: selectedLeadIds
  };

  try {
    const isEdit = Boolean(cId);
    const endpoint = isEdit ? `/campaigns/${cId}` : '/campaigns';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Failed to save campaign');
      return;
    }

    alert(isEdit ? 'Campaign updated successfully!' : 'Campaign created and leads assigned!');
    document.getElementById('campaignFormCard').classList.add('hidden');
    loadCampaigns();
  } catch (err) {
    alert('Error saving campaign');
  }
}

async function startCampaign(campaignId) {
  try {
    const res = await apiFetch(`/campaigns/${campaignId}/start`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Failed to start campaign');
      return;
    }
    loadCampaigns();
  } catch (err) {
    alert('Error starting campaign');
  }
}

async function pauseCampaign(campaignId) {
  try {
    const res = await apiFetch(`/campaigns/${campaignId}/pause`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Failed to pause campaign');
      return;
    }
    loadCampaigns();
  } catch (err) {
    alert('Error pausing campaign');
  }
}

async function deleteCampaign(campaignId) {
  if (!confirm('Are you sure you want to delete this campaign? All assigned prospects will remain safely preserved in your leads database.')) {
    return;
  }
  try {
    const res = await apiFetch(`/campaigns/${campaignId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || 'Failed to delete campaign');
      return;
    }
    loadCampaigns();
  } catch (err) {
    alert('Error deleting campaign');
  }
}

async function loadCampaigns() {
  const container = document.getElementById('campaignsContainer');
  try {
    const res = await apiFetch('/campaigns');
    if (!res || !res.ok) return;
    const campaigns = await res.json();

    if (campaigns.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-500 rounded-2xl border border-slate-800 bg-slate-900">
          <p class="font-bold text-white text-base">No campaigns yet</p>
          <p class="text-xs text-slate-400 mt-1">Create your first outreach campaign to pitch to your extracted leads.</p>
        </div>`;
      if (campaignPollInterval) {
        clearInterval(campaignPollInterval);
        campaignPollInterval = null;
      }
      return;
    }

    let hasRunningCampaign = false;

    container.innerHTML = campaigns.map(c => {
      const isRunning = c.status === 'RUNNING';
      if (isRunning) hasRunningCampaign = true;

      const statusBadge = isRunning
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span> RUNNING</span>`
        : c.status === 'PAUSED'
        ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">⏸ PAUSED</span>`
        : c.status === 'COMPLETED'
        ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">✓ COMPLETED</span>`
        : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">${c.status}</span>`;

      const primaryActionBtn = isRunning
        ? `<button onclick="pauseCampaign('${c.id}')" class="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-xs transition-all flex items-center gap-1.5">⏸ Pause / Stop</button>`
        : `<button onclick="startCampaign('${c.id}')" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5">▶ ${c.status === 'PAUSED' ? 'Resume Campaign' : 'Start Campaign'}</button>`;

      return `
        <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-5 transition-all hover:border-slate-700">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="font-bold text-white text-base">${c.name}</h4>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">${c.type}</span>
              ${statusBadge}
              ${c.send_only_once ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🛡️ Send Once Active</span>' : ''}
            </div>
            
            <p class="text-xs text-slate-400">
              Sender: <span class="text-white font-medium">${c.sender_email}</span> · 
              Total Leads: <span class="text-white font-medium">${c.leads_count}</span> · 
              Queue: <span class="text-orange-400 font-medium">${c.pending_count} pending</span>
            </p>

            <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span>Sent: <strong class="text-orange-400">${c.total_sent}</strong></span>
              <span>Skipped (Deduplicated): <strong class="text-amber-400">${c.total_skipped || 0}</strong></span>
              <span>Opened: <strong class="text-emerald-400">${c.total_opened}</strong></span>
              <span>Delay: <strong class="text-slate-300 font-mono">${c.send_delay_seconds}s + [0-120s jitter]</strong></span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            ${primaryActionBtn}
            <button onclick="openEditCampaign('${c.id}')" title="Edit campaign settings or leads" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all">
              ✏️ Edit
            </button>
            <button onclick="deleteCampaign('${c.id}')" title="Delete campaign" class="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition-all">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Poll automatically every 4s if any campaign is actively running
    if (hasRunningCampaign && !campaignPollInterval) {
      campaignPollInterval = setInterval(loadCampaigns, 4000);
    } else if (!hasRunningCampaign && campaignPollInterval) {
      clearInterval(campaignPollInterval);
      campaignPollInterval = null;
    }
  } catch (err) {
    console.error(err);
  }
}

// Check URL params for verification confirmation
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('verified') === '1') {
  switchTab('senders');
  const notice = document.getElementById('senderNotice');
  if (notice) {
    notice.className = 'p-4 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 block';
    notice.innerHTML = '🎉 <strong>Mailbox Verified Successfully!</strong> Your email account is verified and ready to send cold campaigns.';
    notice.classList.remove('hidden');
  }
  window.history.replaceState({}, document.title, window.location.pathname);
} else {
  loadStats();
}
