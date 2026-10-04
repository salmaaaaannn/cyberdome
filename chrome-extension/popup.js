/**
 * CYBERDOME Chrome Extension — Popup Controller
 * Renders real-time website security assessment, score, baseline,
 * severity findings, and detailed inspected evidence.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const targetDomainEl = document.getElementById('targetDomain');
  const targetUrlEl = document.getElementById('targetUrl');
  const loadingStateEl = document.getElementById('loadingState');
  const unavailableBannerEl = document.getElementById('unavailableBanner');
  const unavailableReasonEl = document.getElementById('unavailableReason');
  const internalPageBannerEl = document.getElementById('internalPageBanner');
  const assessmentContainerEl = document.getElementById('assessmentContainer');

  const scoreValueEl = document.getElementById('scoreValue');
  const baselineBadgeEl = document.getElementById('baselineBadge');

  const countCriticalEl = document.getElementById('countCritical');
  const countHighEl = document.getElementById('countHigh');
  const countMediumEl = document.getElementById('countMedium');
  const countLowEl = document.getElementById('countLow');

  const protocolValEl = document.getElementById('protocolVal');
  const verdictValEl = document.getElementById('verdictVal');
  const modeValEl = document.getElementById('modeVal');
  const sourceValEl = document.getElementById('sourceVal');

  const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
  const toggleDetailsLabel = document.getElementById('toggleDetailsLabel');
  const toggleDetailsArrow = document.getElementById('toggleDetailsArrow');
  const findingsDrawer = document.getElementById('findingsDrawer');
  const findingsList = document.getElementById('findingsList');

  const rescanBtn = document.getElementById('rescanBtn');
  const authToggleBtn = document.getElementById('authToggleBtn');
  const authDrawer = document.getElementById('authDrawer');
  const jwtTokenInput = document.getElementById('jwtTokenInput');
  const saveTokenBtn = document.getElementById('saveTokenBtn');
  const clearTokenBtn = document.getElementById('clearTokenBtn');
  const authStatusMsg = document.getElementById('authStatusMsg');

  const footerTimestamp = document.getElementById('footerTimestamp');
  const cacheIndicator = document.getElementById('cacheIndicator');

  let currentTab = null;
  let detailsExpanded = false;

  // Initialize Auth UI
  chrome.storage.local.get(['cyberdome_token'], (items) => {
    if (items.cyberdome_token) {
      jwtTokenInput.value = items.cyberdome_token;
    }
  });

  authToggleBtn.addEventListener('click', () => {
    authDrawer.classList.toggle('hidden');
  });

  saveTokenBtn.addEventListener('click', () => {
    const token = jwtTokenInput.value.trim();
    chrome.storage.local.set({ cyberdome_token: token }, () => {
      authStatusMsg.innerText = 'Token saved.';
      authStatusMsg.style.color = 'var(--color-good)';
      setTimeout(() => {
        authStatusMsg.innerText = '';
        authDrawer.classList.add('hidden');
      }, 1200);
      if (currentTab && currentTab.url) {
        triggerReassessment(true);
      }
    });
  });

  clearTokenBtn.addEventListener('click', () => {
    jwtTokenInput.value = '';
    chrome.storage.local.remove(['cyberdome_token'], () => {
      authStatusMsg.innerText = 'Token cleared.';
      authStatusMsg.style.color = 'var(--text-muted)';
      setTimeout(() => { authStatusMsg.innerText = ''; }, 1200);
    });
  });

  // Toggle Details Drawer
  toggleDetailsBtn.addEventListener('click', () => {
    detailsExpanded = !detailsExpanded;
    if (detailsExpanded) {
      findingsDrawer.classList.remove('hidden');
      toggleDetailsLabel.innerText = 'HIDE DETAILS';
      toggleDetailsArrow.innerText = '▲';
    } else {
      findingsDrawer.classList.add('hidden');
      toggleDetailsLabel.innerText = 'VIEW DETAILS';
      toggleDetailsArrow.innerText = '▼';
    }
  });

  // Query Active Tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || !tabs[0] || !tabs[0].url) {
    targetDomainEl.innerText = 'No Active Webpage';
    loadingStateEl.classList.add('hidden');
    return;
  }

  currentTab = tabs[0];
  const url = currentTab.url;

  // Check scheme
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    targetDomainEl.innerText = 'Internal Page';
    targetUrlEl.innerText = url;
    loadingStateEl.classList.add('hidden');
    internalPageBannerEl.classList.remove('hidden');
    return;
  }

  try {
    const parsed = new URL(url);
    targetDomainEl.innerText = parsed.hostname;
    targetUrlEl.innerText = url;
  } catch (e) {
    targetDomainEl.innerText = url;
  }

  // Load Assessment from storage or request background worker
  chrome.storage.local.get([`cyberdome_tab_${currentTab.id}`], (result) => {
    const assessment = result[`cyberdome_tab_${currentTab.id}`];
    if (assessment) {
      renderAssessment(assessment);
    } else {
      // Trigger assessment via background worker
      triggerReassessment(false);
    }
  });

  rescanBtn.addEventListener('click', () => {
    triggerReassessment(true);
  });

  function triggerReassessment(force) {
    loadingStateEl.classList.remove('hidden');
    assessmentContainerEl.classList.add('hidden');
    unavailableBannerEl.classList.add('hidden');

    chrome.runtime.sendMessage(
      {
        type: 'REASSESS_URL',
        url: currentTab.url,
        tabId: currentTab.id,
        forceRefresh: force
      },
      (response) => {
        if (chrome.runtime.lastError) {
          showUnavailable('Background service worker error: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response) {
          renderAssessment(response);
        } else {
          showUnavailable('No response received from assessment engine.');
        }
      }
    );
  }

  function showUnavailable(reason) {
    loadingStateEl.classList.add('hidden');
    assessmentContainerEl.classList.add('hidden');
    unavailableBannerEl.classList.remove('hidden');
    if (reason) {
      unavailableReasonEl.innerText = reason;
    }
    footerTimestamp.innerText = 'Assessment Unavailable';
  }

  function renderAssessment(data) {
    loadingStateEl.classList.add('hidden');

    if (data.isUnavailable || data.status === 'UNAVAILABLE') {
      showUnavailable(data.error || 'CyberDome backend service is currently unreachable at http://localhost:8000.');
      return;
    }

    unavailableBannerEl.classList.add('hidden');
    assessmentContainerEl.classList.remove('hidden');

    // Score & Baseline
    const score = data.score != null ? data.score : '--';
    scoreValueEl.innerText = score;

    const baseline = (data.baseline || 'UNKNOWN / INSUFFICIENT DATA').toUpperCase();
    baselineBadgeEl.innerText = baseline;

    baselineBadgeEl.className = 'baseline-badge';
    if (baseline.includes('GOOD')) {
      baselineBadgeEl.classList.add('good');
      scoreValueEl.style.color = 'var(--color-good)';
    } else if (baseline.includes('ELEVATED')) {
      baselineBadgeEl.classList.add('elevated');
      scoreValueEl.style.color = 'var(--color-elevated)';
    } else if (baseline.includes('HIGH')) {
      baselineBadgeEl.classList.add('high');
      scoreValueEl.style.color = 'var(--color-high)';
    } else {
      baselineBadgeEl.classList.add('unknown');
      scoreValueEl.style.color = 'var(--color-unknown)';
    }

    // Severity Counters
    const counts = data.findingsCount || data.findings_count || {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    countCriticalEl.innerText = counts.CRITICAL || 0;
    countHighEl.innerText = counts.HIGH || 0;
    countMediumEl.innerText = counts.MEDIUM || 0;
    countLowEl.innerText = counts.LOW || 0;

    // Telemetry Values
    const isHttps = (data.url || currentTab.url).startsWith('https://');
    protocolValEl.innerText = isHttps ? 'HTTPS (TLS)' : 'HTTP (Plaintext)';
    protocolValEl.style.color = isHttps ? 'var(--color-good)' : 'var(--color-high)';

    verdictValEl.innerText = (data.verdict || (data.isSafe ? 'SAFE' : 'DANGEROUS')).toUpperCase();
    if (verdictValEl.innerText === 'SAFE') {
      verdictValEl.style.color = 'var(--color-good)';
    } else if (verdictValEl.innerText === 'SUSPICIOUS') {
      verdictValEl.style.color = 'var(--color-elevated)';
    } else {
      verdictValEl.style.color = 'var(--color-high)';
    }

    modeValEl.innerText = 'AUTOMATIC';
    sourceValEl.innerText = 'EXTENSION';

    // Detailed Findings Render
    renderFindings(data.findings || []);

    // Cache Tag & Timestamp
    if (data.isCached) {
      cacheIndicator.classList.remove('hidden');
    } else {
      cacheIndicator.classList.add('hidden');
    }
    footerTimestamp.innerText = 'Assessed: ' + new Date(data.assessedAt || Date.now()).toLocaleTimeString();
  }

  function renderFindings(findings) {
    findingsList.innerHTML = '';
    if (!findings || findings.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'no-findings-msg';
      emptyDiv.innerText = '✓ No security anomalies or policy violations detected.';
      findingsList.appendChild(emptyDiv);
      return;
    }

    findings.forEach((f) => {
      const card = document.createElement('div');
      card.className = 'finding-card';

      const sev = (f.severity || 'LOW').toUpperCase();

      card.innerHTML = `
        <div class="finding-header">
          <span class="finding-sev-badge ${sev}">${sev}</span>
          <span class="finding-title">${escapeHtml(f.title || 'Security Notice')}</span>
        </div>
        ${f.evidence ? `
          <div class="finding-section">
            <span class="finding-sec-label">Evidence: </span>
            <span class="finding-sec-text">${escapeHtml(f.evidence)}</span>
          </div>` : ''}
        ${f.impact ? `
          <div class="finding-section">
            <span class="finding-sec-label">Impact: </span>
            <span class="finding-sec-text">${escapeHtml(f.impact)}</span>
          </div>` : ''}
        ${f.recommendation ? `
          <div class="finding-section">
            <span class="finding-sec-label">Recommendation: </span>
            <span class="finding-sec-text">${escapeHtml(f.recommendation)}</span>
          </div>` : ''}
      `;
      findingsList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
