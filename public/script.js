
    let direction = "to_genz";

    document.getElementById("switchBtn").onclick = () => {
      direction = direction === "to_genz" ? "to_normal" : "to_genz";
      const left = document.getElementById("label-left");
      const right = document.getElementById("label-right");
      [left.textContent, right.textContent] = [right.textContent, left.textContent];

      const input = document.getElementById("inputText");
      const output = document.getElementById("outputText");
      [input.value, output.value] = [output.value, input.value];
    };
    document.getElementById("copyBtn").onclick = () => {
      const output = document.getElementById("outputText").value;
      if (output.trim()) {
        navigator.clipboard.writeText(output);
        showAlert('Copied to clipboard!', 'primary');
      } else {
        showAlert("Nothing to copy.",'warning');
      }
    };

    document.getElementById("translateBtn").onclick = async () => {
      const text = document.getElementById("inputText").value;
      const out = document.getElementById("outputText");
      const model = document.getElementById("modelSelect").value;
      out.value = "Translating...";

      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction, model })
      });

const data = await res.json();

if (!res.ok) {
  out.value = '';
  showAlert(data.result || 'Translation failed.', 'danger');
  document.getElementById("model-info").textContent = `Model: N/A`;
  return;
}

out.value = data.result;
document.getElementById("model-info").textContent = `Model: ${data.model}`;

    };





  document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("theme-toggle");

  // Apply saved theme or system preference
  const storedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = storedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);

  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
});



document.getElementById("shareBtn").onclick = async () => {
  const box = document.querySelector(".translator-box");

  // 1. Add caption to bottom
  const caption = document.createElement("div");
  caption.textContent = "Translated using https://genz-translator.xyz ✨";
  caption.style.cssText = `
    margin-top: 12px;
    font-size: 0.9rem;
    color: gray;
    text-align: center;
  `;
  box.appendChild(caption);

  // 2. Temporarily expand labels for long text
  const labels = document.querySelectorAll(".labels span");
  labels.forEach(label => {
    label.dataset.originalStyle = label.getAttribute("style") || "";
    label.style.display = "inline-block";
    label.style.whiteSpace = "normal";
    label.style.overflow = "visible";
    label.style.textOverflow = "unset";
    label.style.maxWidth = "45%";
    label.style.wordBreak = "break-word";
    label.style.lineHeight = "1.2";
    label.offsetHeight; // Force reflow
  });

  // 3. Short delay to ensure styles applied before rendering
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(box, { scale: 2, useCORS: true });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], "genz_translation.png", { type: "image/png" });

    // 4. Clean up styles and caption
    caption.remove();
    labels.forEach(label => {
      label.setAttribute("style", label.dataset.originalStyle);
    });

    // 5. Share or download fallback
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Gen Z Translator",
        text: "Check out the translation I made with https://genz-translator.xyz!",
        files: [file],
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "genz_translation.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    showAlert("Sharing failed. Try again.", "warning");
    console.error(err);
  }
};




function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} d-flex align-items-center slide-alert`;
  alert.setAttribute('role', 'alert');
  alert.innerHTML = `
    <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="${type}">
      <use xlink:href="#${type === 'success' ? 'check-circle-fill' : type === 'danger' ? 'exclamation-triangle-fill' : type === 'warning' ? 'exclamation-triangle-fill' : 'info-fill'}"/>
    </svg>
    <div>${message}</div>
  `;

  const container = document.getElementById('alertContainer');
  container.insertBefore(alert, container.firstChild);


  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 700); // after fade
  }, 4000);
  setTimeout(() => alert.classList.add('show'), 10); // for animation

}



