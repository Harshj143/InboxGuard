// Enhanced popup.js with settings and tabs
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resultBox = document.getElementById("resultBox");
  const emailInput = document.getElementById("emailInput");
  const platformInfo = document.getElementById("platform-info");
  
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding content
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
  
  // Settings toggles
  const autoScanToggle = document.getElementById('autoScanToggle');
  const floatingIconToggle = document.getElementById('floatingIconToggle');
  const notificationsToggle = document.getElementById('notificationsToggle');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  // Load settings from storage
  loadSettings();
  
  // Save settings when button is clicked
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Email platforms we recognize
  const EMAIL_PLATFORMS = {
    'mail.google.com': 'Gmail',
    'outlook.live.com': 'Outlook',
    'outlook.office.com': 'Outlook',
    'mail.yahoo.com': 'Yahoo Mail'
  };
  
  // Check if current tab is an email platform
  checkCurrentTab();
  
  // Handle the analyze button click
  analyzeBtn.addEventListener("click", async () => {
    const emailText = emailInput.value.trim();
    if (!emailText) {
      resultBox.innerHTML = `<span style="color:orange">Please paste some text to analyze.</span>`;
      return;
    }
  
    resultBox.innerHTML = "Analyzing...";
    try {
      const res = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_text: emailText })
      });
      const data = await res.json();
  
      // If your API returns an { error: "..." } field:
      if (data.error) {
        resultBox.innerHTML = `<span style="color:red"><strong>Error:</strong> ${data.error}</span>`;
        return;
      }
  
      // Determine color based on risk
      let riskColor = '#4caf50'; // Default green (low risk)
      if (data.risk_assessment === 'Medium') {
        riskColor = '#ff9800'; // Orange
      } else if (data.risk_assessment === 'High') {
        riskColor = '#f44336'; // Red
      } else if (data.risk_assessment === 'Critical') {
        riskColor = '#b71c1c'; // Dark red
      }
  
      // Build HTML for the results
      let html = `
        <div style="border-left: 4px solid ${riskColor}; padding: 10px; margin-top: 15px; background-color: #f8f9fa;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <h3 style="margin: 0; color: ${riskColor};">InboxGuard Analysis</h3>
            <span style="font-weight: bold; color: ${riskColor};">${data.risk_assessment} Risk (${data.confidence_score}%)</span>
          </div>
      `;
  
      // Short explanation
      html += `<p>${data.explanation}</p>`;
  
      // Add key findings
      if (data.spoofed_sender) {
        html += `<p>⚠️ <strong>Spoofed sender detected</strong></p>`;
      }
      
      if (data.urgency_indicators?.length) {
        html += `<p><strong>Urgency Indicators:</strong> ${data.urgency_indicators.join(", ")}</p>`;
      }
      
      if (data.threat_indicators?.length) {
        html += `<p><strong>Threat Indicators:</strong> ${data.threat_indicators.join(", ")}</p>`;
      }
      
      if (data.data_requests?.length) {
        html += `<p><strong>Data Requests:</strong> ${data.data_requests.join(", ")}</p>`;
      }
      
      if (data.suspicious_links?.length) {
        html += `<p><strong>Suspicious Links:</strong><ul>` +
          data.suspicious_links.map(l => 
            `<li>${l.url} — ${l.issues.join(", ")}</li>`
          ).join("") +
          `</ul></p>`;
      }
  
      html += `</div>`;
      resultBox.innerHTML = html;
    }
    catch (err) {
      resultBox.innerHTML = `<span style="color:red"><strong>Fetch error:</strong> ${err.message}<br>
      <small>Make sure the InboxGuard server is running at http://127.0.0.1:5000</small></span>`;
    }
  });
  
  async function checkCurrentTab() {
    try {
      // Get the active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab || !currentTab.url) return false;
      
      // Parse the URL to get hostname
      const url = new URL(currentTab.url);
      const hostname = url.hostname;
      
      // Check if it's a known email platform
      const platform = EMAIL_PLATFORMS[hostname];
      
      if (platform) {
        // Show info about auto-scanning
        platformInfo.innerHTML = `
          <div class="email-platform-notice">
            <strong>${platform} detected!</strong>
            <p>The floating icon should be visible in your email view.</p>
            <p>You can still analyze any text pasted below manually.</p>
          </div>
        `;
        
        return true;
      }
      
      platformInfo.innerHTML = `
        <div class="email-platform-notice" style="background-color: #fff3cd; color: #856404;">
          <strong>No email platform detected</strong>
          <p>Visit Gmail, Outlook, or Yahoo Mail to use the automatic scanning feature.</p>
        </div>
      `;
      
      return false;
    } catch (error) {
      console.error("Error checking current tab:", error);
      return false;
    }
  }
  
  // Load settings from Chrome storage
  function loadSettings() {
    chrome.storage.local.get(['autoScan', 'showFloatingIcon', 'notificationsEnabled'], (result) => {
      autoScanToggle.checked = result.autoScan !== false; // Default to true
      floatingIconToggle.checked = result.showFloatingIcon !== false; // Default to true
      notificationsToggle.checked = result.notificationsEnabled !== false; // Default to true
    });
  }
  
  // Save settings to Chrome storage
  function saveSettings() {
    // Save to storage
    chrome.storage.local.set({
      autoScan: autoScanToggle.checked,
      showFloatingIcon: floatingIconToggle.checked,
      notificationsEnabled: notificationsToggle.checked,
      lastUpdated: new Date().toISOString()
    }, () => {
      // Show saved confirmation
      saveSettingsBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveSettingsBtn.textContent = 'Save Settings';
      }, 1500);
      
      // Update content script with new settings
      sendSettingsToActiveTab();
    });
  }
  
  // Send settings to active tab's content script
  async function sendSettingsToActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateSettings',
          settings: {
            autoScan: autoScanToggle.checked,
            showFloatingIcon: floatingIconToggle.checked,
            notificationsEnabled: notificationsToggle.checked
          }
        });
      }
    } catch (err) {
      console.error('Error sending settings to tab:', err);
    }
  }
});