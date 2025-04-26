// content.js - This script runs when matching an email platform
console.log("InboxGuard Content Script Loaded");

// Configuration for supported email platforms
const EMAIL_PLATFORMS = {
  'mail.google.com': {
    name: 'Gmail',
    emailSelector: '.a3s.aiL', // Gmail email content
    containerSelector: '.AO', // Gmail main container
    actionBarSelector: '.ade' // Gmail action bar for inserting our button
  },
  'outlook.live.com': {
    name: 'Outlook',
    emailSelector: '.x_ReadMsgBody, .ReadMsgBody', // Outlook email content
    containerSelector: '.ms-Panel-main', // Outlook main panel
    actionBarSelector: '.ms-CommandBar' // Outlook command bar
  },
  'outlook.office.com': {
    name: 'Outlook',
    emailSelector: '.x_ReadMsgBody, .ReadMsgBody', // Outlook email content
    containerSelector: '.ms-Panel-main', // Outlook main panel 
    actionBarSelector: '.ms-CommandBar' // Outlook command bar
  },
  'mail.yahoo.com': {
    name: 'Yahoo Mail',
    emailSelector: '.msg-body', // Yahoo email content
    containerSelector: '.message-body-container', // Yahoo container
    actionBarSelector: '.message-actions' // Yahoo actions bar
  }
};

// Determine if we're on a supported email platform
function getCurrentPlatform() {
  const hostname = window.location.hostname;
  return EMAIL_PLATFORMS[hostname];
}

// Create and insert the floating InboxGuard icon
function createFloatingIcon(platform) {
  // Check if our icon already exists
  if (document.getElementById('inboxguard-floating-icon')) {
    return;
  }

  // Create the floating icon wrapper
  const iconWrapper = document.createElement('div');
  iconWrapper.id = 'inboxguard-floating-icon';
  iconWrapper.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: move;
    z-index: 9999;
    transition: transform 0.2s, box-shadow 0.2s;
  `;
  
  // Create the icon
  const iconInner = document.createElement('div');
  iconInner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
  
  // Create the status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'inboxguard-status';
  statusIndicator.style.cssText = `
    position: absolute;
    top: -5px;
    right: -5px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #9e9e9e;
    border: 2px solid white;
    display: none;
  `;
  
  // Create the results display container
  const resultContainer = document.createElement('div');
  resultContainer.id = 'inboxguard-result-container';
  resultContainer.style.cssText = `
    position: fixed;
    right: 75px;
    top: 100px;
    width: 320px;
    background-color: #ffffff;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9998;
    display: none;
    font-size: 14px;
    max-width: 90%;
  `;
  
  // Create the scan button inside the container
  const scanButton = document.createElement('button');
  scanButton.id = 'inboxguard-scan-btn';
  scanButton.innerText = 'Scan Now';
  scanButton.style.cssText = `
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    margin-top: 8px;
    cursor: pointer;
    display: block;
  `;
  
  // Add event listener for scan button
  scanButton.addEventListener('click', () => scanCurrentEmail(true));
  
  // Add the button to the container
  resultContainer.appendChild(scanButton);
  
  // Add elements to the icon wrapper
  iconWrapper.appendChild(iconInner);
  iconWrapper.appendChild(statusIndicator);
  
  // Add the icon to the page
  document.body.appendChild(iconWrapper);
  document.body.appendChild(resultContainer);
  
  // Make the icon draggable
  makeDraggable(iconWrapper, resultContainer);
  
  // Add event listener to toggle result container when icon is clicked
  iconWrapper.addEventListener('click', toggleResultContainer);
  
  // Initially try to scan the email
  setTimeout(() => {
    scanCurrentEmail(false);
  }, 1500);
}

// Make an element draggable
function makeDraggable(element, linkedElement) {
  let offsetX = 0, offsetY = 0;
  let isDragging = false;
  
  // Mouse down event - start dragging
  element.addEventListener('mousedown', (e) => {
    // Only initiate drag if it's not a click on a child element
    if (e.target === element || e.target.parentNode === element) {
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      
      // Add a class to indicate dragging
      element.classList.add('dragging');
      
      // Prevent default to avoid text selection during drag
      e.preventDefault();
    }
  });
  
  // Mouse move event - move element
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const left = e.clientX - offsetX;
    const top = e.clientY - offsetY;
    
    // Ensure the icon stays within the viewport
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;
    
    element.style.left = `${Math.max(0, Math.min(left, maxX))}px`;
    element.style.top = `${Math.max(0, Math.min(top, maxY))}px`;
    
    // If linked element is visible, update its position too
    if (linkedElement && linkedElement.style.display !== 'none') {
      linkedElement.style.top = `${element.offsetTop}px`;
      linkedElement.style.left = `${element.offsetLeft + element.offsetWidth + 10}px`;
    }
  });
  
  // Mouse up event - stop dragging
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('dragging');
    }
  });
}

// Toggle the result container
function toggleResultContainer(e) {
  // Only toggle if it's a click (not a drag end)
  if (e.target.classList.contains('dragging')) return;
  
  const resultContainer = document.getElementById('inboxguard-result-container');
  const icon = document.getElementById('inboxguard-floating-icon');
  
  if (resultContainer.style.display === 'none') {
    resultContainer.style.display = 'block';
    resultContainer.style.top = `${icon.offsetTop}px`;
    resultContainer.style.left = `${icon.offsetLeft + icon.offsetWidth + 10}px`;
  } else {
    resultContainer.style.display = 'none';
  }
}

// Extract email content based on the platform
function extractEmailContent(platform) {
  const emailElement = document.querySelector(platform.emailSelector);
  if (!emailElement) {
    return null;
  }
  
  // Extract all relevant email metadata if possible
  let subject = "";
  const subjectElement = document.querySelector('h1, .hP, .subject-line');
  if (subjectElement) {
    subject = `Subject: ${subjectElement.textContent.trim()}\n`;
  }
  
  let sender = "";
  const senderElement = document.querySelector('.gD, .sender, .from-name');
  if (senderElement) {
    sender = `From: ${senderElement.textContent.trim()}\n`;
  }
  
  // Get the actual message content
  const messageContent = emailElement.innerText || emailElement.textContent;
  
  return subject + sender + messageContent;
}

// Scan the current email
async function scanCurrentEmail(isManualScan = false) {
  const platform = getCurrentPlatform();
  if (!platform) {
    if (isManualScan) {
      alert('InboxGuard: Not able to detect email platform.');
    }
    return;
  }
  
  // Get the button, result container, and status indicator
  const scanButton = document.getElementById('inboxguard-scan-btn');
  const resultContainer = document.getElementById('inboxguard-result-container');
  const statusIndicator = document.getElementById('inboxguard-status');
  
  if (!scanButton || !resultContainer || !statusIndicator) {
    return;
  }
  
  // Update UI state
  scanButton.disabled = true;
  scanButton.innerText = 'Analyzing...';
  statusIndicator.style.display = 'block';
  statusIndicator.style.backgroundColor = '#FFC107'; // Yellow during analysis
  
  if (isManualScan) {
    resultContainer.style.display = 'block';
    resultContainer.innerHTML = '<div style="text-align: center;">Analyzing email for phishing indicators...</div>';
    
    // Add back the scan button
    const newScanButton = document.createElement('button');
    newScanButton.id = 'phishai-scan-btn';
    newScanButton.innerText = 'Analyzing...';
    newScanButton.disabled = true;
    newScanButton.style.cssText = `
      background-color: #9fc1fa;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      margin-top: 8px;
      cursor: not-allowed;
      display: block;
    `;
    resultContainer.appendChild(newScanButton);
  }
  
  // Extract email content
  const emailContent = extractEmailContent(platform);
  if (!emailContent) {
    showScanError("Unable to extract email content.");
    return;
  }
  
  try {
    // Send to backend
    const response = await fetch("http://127.0.0.1:5000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_text: emailContent })
    });
    
    const data = await response.json();
    if (data.error) {
      showScanError(data.error);
      return;
    }
    
    // Update the icon status based on risk
    updateStatusIndicator(data.risk_assessment);
    
    // Display results if manually scanned or if risk is medium or higher
    if (isManualScan || 
        data.risk_assessment === 'Medium' || 
        data.risk_assessment === 'High' || 
        data.risk_assessment === 'Critical') {
      resultContainer.style.display = 'block';
      displayResults(data, resultContainer);
    }
  } catch (error) {
    showScanError(error.message);
  }
}

// Update the status indicator based on risk assessment
function updateStatusIndicator(riskLevel) {
  const statusIndicator = document.getElementById('inboxguard-status');
  if (!statusIndicator) return;
  
  statusIndicator.style.display = 'block';
  
  // Set color based on risk
  switch (riskLevel) {
    case 'Low':
      statusIndicator.style.backgroundColor = '#4caf50'; // Green
      break;
    case 'Medium':
      statusIndicator.style.backgroundColor = '#ff9800'; // Orange
      break;
    case 'High':
      statusIndicator.style.backgroundColor = '#f44336'; // Red
      break;
    case 'Critical':
      statusIndicator.style.backgroundColor = '#b71c1c'; // Dark red
      break;
    default:
      statusIndicator.style.backgroundColor = '#9e9e9e'; // Grey
  }
}

// Display error message
function showScanError(errorMessage) {
  const scanButton = document.getElementById('inboxguard-scan-btn');
  const resultContainer = document.getElementById('inboxguard-result-container');
  const statusIndicator = document.getElementById('inboxguard-status');
  
  if (resultContainer) {
    resultContainer.innerHTML = `
      <div style="color: red;">
        <strong>Error:</strong> ${errorMessage}<br>
        <small>Make sure the InboxGuard server is running at http://127.0.0.1:5000</small>
      </div>
    `;
    
    // Add back the scan button
    const newScanButton = document.createElement('button');
    newScanButton.id = 'inboxguard-scan-btn';
    newScanButton.innerText = 'Scan Again';
    newScanButton.style.cssText = `
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      margin-top: 8px;
      cursor: pointer;
      display: block;
    `;
    newScanButton.addEventListener('click', () => scanCurrentEmail(true));
    resultContainer.appendChild(newScanButton);
  }
  
  if (statusIndicator) {
    statusIndicator.style.backgroundColor = '#9e9e9e'; // Grey to indicate error
  }
}

// Display the phishing analysis results
function displayResults(data, container) {
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
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <h3 style="margin: 0; color: ${riskColor};">InboxGuard Analysis</h3>
      <span style="font-weight: bold; color: ${riskColor};">${data.risk_assessment} Risk (${data.confidence_score}%)</span>
    </div>
  `;
  
  // Short explanation
  html += `<p>${data.explanation}</p>`;
  
  // Show detailed information in a collapsible section
  html += `<details>
    <summary style="cursor: pointer; margin: 10px 0; color: #4285f4;">Show details</summary>
    <div style="margin-left: 10px;">`;
  
  if (data.spoofed_sender) {
    html += `<p>⚠️ <strong>Spoofed sender detected</strong></p>`;
  }
  
  if (data.sender_analysis) {
    html += `<p><strong>Sender analysis:</strong> ${data.sender_analysis}</p>`;
  }
  
  if (data.urgency_indicators?.length) {
    html += `<p><strong>Urgency indicators:</strong> ${data.urgency_indicators.join(", ")}</p>`;
  }
  
  if (data.threat_indicators?.length) {
    html += `<p><strong>Threat indicators:</strong> ${data.threat_indicators.join(", ")}</p>`;
  }
  
  if (data.data_requests?.length) {
    html += `<p><strong>Sensitive data requests:</strong> ${data.data_requests.join(", ")}</p>`;
  }
  
  if (data.suspicious_links?.length) {
    html += `<p><strong>Suspicious links:</strong><ul>` +
      data.suspicious_links.map(l => 
        `<li>${l.url} — ${l.issues.join(", ")}</li>`
      ).join("") +
      `</ul></p>`;
  }
  
  if (data.linguistic_manipulation?.length) {
    html += `<p><strong>Manipulation tactics:</strong> ${data.linguistic_manipulation.join(", ")}</p>`;
  }
  
  html += `</div></details>`;
  
  // Add scan again button
  html += `<button id="inboxguard-scan-btn" style="
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    margin-top: 8px;
    cursor: pointer;
    display: block;
  ">Scan Again</button>`;
  
  container.innerHTML = html;
  
  // Add event listener to new button
  const newScanButton = document.getElementById('inboxguard-scan-btn');
  if (newScanButton) {
    newScanButton.addEventListener('click', () => scanCurrentEmail(true));
  }
}

// Observer to detect when email view changes (for SPA email clients)
function setupObserver() {
  const platform = getCurrentPlatform();
  if (!platform) return;
  
  // Find the main container to observe
  const container = document.querySelector(platform.containerSelector);
  if (!container) return;
  
  // Create a mutation observer to detect when a new email is opened
  const observer = new MutationObserver(function(mutations) {
    // Check if our floating icon exists, if not, create it
    if (!document.getElementById('inboxguard-floating-icon')) {
      createFloatingIcon(platform);
    } else {
      // If it exists, check if we need to re-scan (new email opened)
      setTimeout(() => {
        scanCurrentEmail(false);
      }, 1000);
    }
  });
  
  // Start observing
  observer.observe(container, { 
    childList: true,
    subtree: true 
  });
}

// Main initialization
function init() {
  const platform = getCurrentPlatform();
  if (platform) {
    console.log(`PhishAI detected: ${platform.name}`);
    
    // Initial floating icon creation
    createFloatingIcon(platform);
    
    // Setup observer for dynamic content changes
    setupObserver();
  }
}

// Start the extension
init();

// Re-check periodically (email clients are SPAs that load content dynamically)
setInterval(() => {
  if (!document.getElementById('inboxguard-floating-icon')) {
    init();
  }
}, 3000);