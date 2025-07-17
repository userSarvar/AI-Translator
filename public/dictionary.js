const searchInput = document.getElementById("search");
const checkboxes = document.querySelectorAll("input[type='checkbox']");
const entries = document.querySelectorAll(".entry");

function filterDictionary() {
  const query = searchInput.value.toLowerCase();
  const activeTags = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);

  entries.forEach(entry => {
    const word = entry.querySelector("h2").textContent.toLowerCase();
    const tags = entry.dataset.tags.split(",");
    const match = word.includes(query) && tags.some(tag => activeTags.includes(tag));
    entry.style.display = match ? "block" : "none";
  });
}

searchInput.addEventListener("input", filterDictionary);
checkboxes.forEach(cb => cb.addEventListener("change", filterDictionary));
