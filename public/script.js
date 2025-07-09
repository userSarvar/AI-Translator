// === script.js ===
async function doTranslate(direction) {
  const inputText = document.getElementById("inputText").value;
  if (!inputText.trim()) return;

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: inputText, direction })
  });

  const data = await response.json();
  document.getElementById("outputText").value = data.result;
}

function copyOutput() {
  const output = document.getElementById("outputText");
  output.select();
  document.execCommand("copy");
  alert("Copied to clipboard!");
}