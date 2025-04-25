const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("resultBox");

analyzeBtn.addEventListener("click", async () => {
  const emailText = document.getElementById("emailInput").value.trim();
  if (!emailText) {
    resultBox.innerHTML = `<span style="color:orange">Please paste some text to analyze.</span>`;
    return;
  }

  resultBox.innerHTML = "Analyzing";
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

    // Build up HTML from the JSON fields:
    let html = `
      <p><strong> Risk Assessment:</strong> ${data.risk_assessment}</p>
      <p><strong> Confidence Score:</strong> ${data.confidence_score}%</p>
    `;

    if (data.spoofed_sender) {
      html += `<p> <strong>Spoofed sender detected</strong></p>`;
    }
    if (data.urgency_indicators?.length) {
      html += `<p><strong> Urgency Indicators:</strong> ${data.urgency_indicators.join(", ")}</p>`;
    }
    if (data.threat_indicators?.length) {
      html += `<p><strong> Threat Indicators:</strong> ${data.threat_indicators.join(", ")}</p>`;
    }
    if (data.data_requests?.length) {
      html += `<p><strong> Data Requests:</strong> ${data.data_requests.join(", ")}</p>`;
    }
    if (data.suspicious_links?.length) {
      html += `<p><strong> Suspicious Links:</strong><ul>` +
        data.suspicious_links.map(l => 
          `<li>${l.url} — ${l.issues.join(", ")}</li>`
        ).join("") +
        `</ul></p>`;
    }

    html += `<p><strong> Explanation:</strong> ${data.explanation}</p>`;

    resultBox.innerHTML = html;
  }
  catch (err) {
    resultBox.innerHTML = `<span style="color:red"><strong>Fetch error:</strong> ${err.message}</span>`;
  }
});
