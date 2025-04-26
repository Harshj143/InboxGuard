// background.js - Service worker for the InboxGuard extension

// Email platforms we recognize
const EMAIL_PLATFORMS = {
  'mail.google.com': 'Gmail',
  'outlook.live.com': 'Outlook',
  'outlook.office.com': 'Outlook',
  'mail.yahoo.com': 'Yahoo Mail'
};

// Update the extension icon when on email platforms
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      // Check if we're on an email platform
      const url = new URL(tab.url);
      const hostname = url.hostname;
      
      if (EMAIL_PLATFORMS[hostname]) {
        // On an email platform - update icon to active state
        chrome.action.setIcon({
          path: {
            "16": "icon-active-16.png",
            "48": "icon-active-48.png",
            "128": "icon-active-128.png"
          },
          tabId: tabId
        });
        
        // Optionally set a badge to indicate active status
        chrome.action.setBadgeText({
          text: "ON",
          tabId: tabId
        });
        
        chrome.action.setBadgeBackgroundColor({
          color: "#4CAF50",
          tabId: tabId
        });
      } else {
        // Not on an email platform - reset to default icon
        chrome.action.setIcon({
          path: {
            "16": "icon.png",
            "48": "icon.png",
            "128": "icon.png"
          },
          tabId: tabId
        });
        
        // Clear any badge
        chrome.action.setBadgeText({
          text: "",
          tabId: tabId
        });
      }
    } catch (e) {
      // Invalid URL or other error - reset to default icon
      chrome.action.setIcon({
        path: {
          "16": "icon.png",
          "48": "icon.png",
          "128": "icon.png"
        },
        tabId: tabId
      });
      
      chrome.action.setBadgeText({
        text: "",
        tabId: tabId
      });
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "emailPlatformDetected") {
    // Content script detected an email platform
    console.log(`Email platform detected: ${message.platform}`);
    
    // We could perform additional actions here if needed
    // For example, store statistics or send analytics
    
    sendResponse({ status: "acknowledged" });
  }
  
  // Return true to indicate we'll send a response asynchronously
  return true;
});

// Optional: Handle installation and updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First installation
    console.log("InboxGuard installed!");
    
    // Could open an onboarding page
    chrome.tabs.create({
      url: "onboarding.html"
    });
    
    // Save default settings
    chrome.storage.local.set({
      autoScan: true,
      notificationsEnabled: true,
      lastUpdated: new Date().toISOString()
    });
  } else if (details.reason === "update") {
    // Extension updated
    console.log(`InboxGuard updated to version ${chrome.runtime.getManifest().version}`);
    
    // Could show update notes
  }
});