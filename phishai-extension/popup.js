// Enhanced popup.js with email platform detection
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");
const emailInput = document.getElementById("emailInput");

// Email platforms we recognize
const EMAIL_PLATFORMS = {
  'mail.google.com': 'Gmail',
  'outlook.live.com': 'Outlook',
  'outlook.office.com': 'Outlook',
  'mail.yahoo.com': 'Yahoo Mail'
};

// Check if current tab is an email platform
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
      const infoBox = document.createElement('div');
      infoBox.innerHTML = `
        <div style="margin: 10px 0; padding: 10px; background-color: #e8f0fe; border-radius: 4px;">
          <strong>${platform} detected!</strong>
          <p>Look for the "Scan for Phishing" button directly in your email view.</p>
          <p>For better results, this popup can analyze any text you paste manually.</p>
        </div>
      `;
      
      // Insert before the textarea
      document.body.insertBefore(infoBox, emailInput.parentNode);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking current tab:", error);
    return false;
  }
}

// Run the check when popup opens
document.addEventListener('DOMContentLoaded', checkCurrentTab);

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
          <h3 style="margin: 0; color: ${riskColor};">PhishAI Analysis</h3>
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
    <small>Make sure the PhishAI server is running at http://127.0.0.1:5000</small></span>`;
  }
});