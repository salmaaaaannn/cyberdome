/**
 * CYBERDOME Chrome Extension — Background Service Worker
 * Automatic Website Security Assessment Engine
 * 
 * Automatically detects navigation on supported HTTP/HTTPS websites,
 * checks client-side 5-minute TTL cache, invokes CyberDome backend
 * scanner passively without blocking page rendering, and caches results.
 */

const API_BASE_URL = 'http://localhost:8000/api/v1/browser/check-url';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

// Helper to determine if URL is supported for scanning
function isSupportedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

// Generate canonical cache key for a URL (origin + pathname)
function getCacheKey(url) {
  try {
    const parsed = new URL(url);
    return 'cyberdome_cache_' + parsed.origin + parsed.pathname;
  } catch (e) {
    return 'cyberdome_cache_' + encodeURIComponent(url.slice(0, 100));
  }
}

// Update Chrome extension badge based on assessment verdict & score
function updateBadge(tabId, data) {
  if (!chrome.action) return;

  if (!data || data.status === 'UNAVAILABLE' || data.status === 'ERROR') {
    chrome.action.setBadgeText({ tabId, text: '?' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6B7280' });
    return;
  }

  const verdict = (data.verdict || (data.isSafe ? 'SAFE' : 'DANGEROUS')).toUpperCase();
  const baseline = data.baseline || '';

  if (verdict === 'DANGEROUS' || baseline === 'HIGH RISK') {
    chrome.action.setBadgeText({ tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#DC2626' }); // Red
  } else if (verdict === 'SUSPICIOUS' || baseline === 'ELEVATED RISK') {
    chrome.action.setBadgeText({ tabId, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#F59E0B' }); // Amber/Orange
  } else if (verdict === 'SAFE' || baseline === 'GOOD BASELINE') {
    const scoreText = data.score != null ? String(data.score) : '✓';
    chrome.action.setBadgeText({ tabId, text: scoreText });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#10B981' }); // Green
  } else {
    chrome.action.setBadgeText({ tabId, text: '--' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6B7280' }); // Gray
  }
}

// Perform passive URL security assessment
async function assessUrl(url, tabId, forceRefresh = false) {
  if (!isSupportedUrl(url)) return;

  const cacheKey = getCacheKey(url);
  const tabAssessmentKey = `cyberdome_tab_${tabId}`;

  // 1. Check local cache if not forcing refresh
  if (!forceRefresh) {
    const cachedItems = await chrome.storage.local.get([cacheKey]);
    const cached = cachedItems[cacheKey];
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      const assessment = { ...cached.data, isCached: true };
      await chrome.storage.local.set({ [tabAssessmentKey]: assessment });
      updateBadge(tabId, assessment);
      return assessment;
    }
  }

  // 2. Retrieve saved auth token
  const tokenData = await chrome.storage.local.get(['cyberdome_token']);
  const token = tokenData.cyberdome_token;

  // 3. Invoke CyberDome backend URL safety check
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = {
      url: url,
      mode: 'AUTOMATIC',
      source: 'browser_extension',
      environment: 'REAL',
      record_detection: true
    };

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      const assessmentData = {
        ...json.data,
        isCached: false,
        assessedAt: Date.now()
      };

      // Cache result for 5 minutes
      const cachePayload = {};
      cachePayload[cacheKey] = {
        data: assessmentData,
        timestamp: Date.now()
      };
      cachePayload[tabAssessmentKey] = assessmentData;
      await chrome.storage.local.set(cachePayload);

      updateBadge(tabId, assessmentData);
      return assessmentData;
    } else {
      throw new Error(json.message || 'Invalid response format');
    }
  } catch (err) {
    console.warn(`[CyberDome Extension] Assessment failed for ${url}:`, err);
    const unavailableAssessment = {
      url: url,
      domain: new URL(url).hostname,
      status: 'UNAVAILABLE',
      verdict: 'UNAVAILABLE',
      baseline: 'UNKNOWN / INSUFFICIENT DATA',
      score: null,
      findingsCount: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
      findings: [],
      error: err.message || 'Scanner unavailable',
      isUnavailable: true,
      assessedAt: Date.now()
    };
    await chrome.storage.local.set({ [tabAssessmentKey]: unavailableAssessment });
    updateBadge(tabId, unavailableAssessment);
    return unavailableAssessment;
  }
}

// Listen for tab navigation completion
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only trigger on navigation completion and if URL is valid
  if (changeInfo.status === 'complete' && tab && tab.url && isSupportedUrl(tab.url)) {
    assessUrl(tab.url, tabId, false);
  }
});

// Clean up tab assessment storage on tab closure
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove([`cyberdome_tab_${tabId}`]);
});

// Handle messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REASSESS_URL') {
    assessUrl(request.url, request.tabId, true).then(sendResponse);
    return true; // Keep message channel open for async response
  }
  if (request.type === 'GET_TAB_ASSESSMENT') {
    chrome.storage.local.get([`cyberdome_tab_${request.tabId}`], (result) => {
      sendResponse(result[`cyberdome_tab_${request.tabId}`] || null);
    });
    return true;
  }
});
