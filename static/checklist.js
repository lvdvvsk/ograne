/* Lista misji do odhaczania: listy pod nagłówkami H3 w treści zamieniają się w checkboxy. Postęp w localStorage. */
(function () {
  var C = window.CL_CFG; if (!C) return;
  var prose = document.querySelector(".prose"); if (!prose) return;
  var state = {};
  try { state = JSON.parse(localStorage.getItem(C.key) || "{}"); } catch (e) {}
  var boxes = [];
  prose.querySelectorAll("h3 + ul").forEach(function (ul) {
    ul.classList.add("checklist");
    ul.querySelectorAll(":scope > li").forEach(function (li) {
      var id = li.textContent.trim().split(" – ")[0].slice(0, 60);
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!state[id];
      cb.setAttribute("aria-label", id);
      li.prepend(cb); if (cb.checked) li.classList.add("done");
      cb.addEventListener("change", function () {
        if (cb.checked) state[id] = 1; else delete state[id];
        li.classList.toggle("done", cb.checked);
        try { localStorage.setItem(C.key, JSON.stringify(state)); } catch (e) {}
        upd();
      });
      li.addEventListener("click", function (e) { if (e.target !== cb && e.target.tagName !== "A") { cb.checked = !cb.checked; cb.dispatchEvent(new Event("change")); } });
      boxes.push(cb);
    });
  });
  if (!boxes.length) return;
  var bar = document.getElementById("cl-bar"); bar.hidden = false;
  function upd() {
    var n = boxes.filter(function (b) { return b.checked; }).length;
    document.getElementById("cl-count").textContent = C.progress + ": " + n + " / " + boxes.length;
    document.getElementById("cl-fill").style.width = (100 * n / boxes.length) + "%";
  }
  document.getElementById("cl-reset").onclick = function () {
    state = {}; try { localStorage.removeItem(C.key); } catch (e) {}
    boxes.forEach(function (b) { b.checked = false; b.closest("li").classList.remove("done"); }); upd();
  };
  upd();
})();
