/* Interaktywna mapa GTA 6 – Leaflet + kafelki i dane gtadb.org (CC BY 4.0) */
(function () {
  var root = document.getElementById("gmap-root");
  if (!root || !window.L) return;
  var T = window.GMAP_I18N || {};
  var COLORS = {
    landmark: "#ffd36b", hotel: "#ff4fa3", food: "#ff8a5b", shop: "#c77dff", transport: "#38e1ff",
    nature: "#5be37d", leisure: "#ff9a3c", public: "#7aa2ff", industry: "#b0a48c", home: "#e8c5ff", other: "#9a8fbf"
  };
  var ORDER = ["landmark", "hotel", "food", "shop", "leisure", "transport", "nature", "public", "industry", "home", "other"];

  // Układ współrzędnych gry: metry, -16384..16384. Poziom 0 = 1024 px (32 m/px).
  var CRS = L.extend({}, L.CRS.Simple, { transformation: new L.Transformation(1 / 32, 512, -1 / 32, 512) });
  var map = L.map("gmap", {
    crs: CRS, minZoom: 0, maxZoom: 5.5, zoomSnap: 0.5, attributionControl: true,
    maxBounds: [[-11500, -12500], [11500, 6500]], maxBoundsViscosity: 0.8, zoomControl: true
  });
  L.tileLayer("/static/map/tiles/{z}/{z},{y},{x}.jpg", {
    tileSize: 256, minZoom: 0, maxZoom: 5.5, maxNativeZoom: 4, noWrap: true,
    bounds: [[-16384, -16384], [16384, 16384]],
    attribution: T.attribution || ""
  }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com" rel="nofollow noopener" target="_blank">Leaflet</a>');
  map.setView([400, -3200], 1);
  if (window.innerWidth <= 700) { var fl = document.getElementById("gm-filters"); if (fl) fl.open = false; }

  var icons = {};
  ORDER.forEach(function (c) {
    icons[c] = L.divIcon({ className: "gm-dot", html: '<span style="background:' + COLORS[c] + '"></span>', iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -6] });
  });

  var cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 42, disableClusteringAtZoom: 5, chunkedLoading: true });
  map.addLayer(cluster);
  var labelsLayer = L.layerGroup().addTo(map);

  var all = [], active = {}, counts = {};
  ORDER.forEach(function (c) { active[c] = true; counts[c] = 0; });

  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }

  function popup(p, i) {
    var h = '<div class="gm-pop"><strong>' + esc(p[0]) + "</strong>";
    if (p[1]) h += '<div class="gm-area">' + esc(p[1]) + "</div>";
    h += '<div class="gm-cat"><span style="background:' + COLORS[p[4]] + '"></span>' + esc((T.cats || {})[p[4]] || p[4]) + "</div>";
    if (p[5]) h += '<div class="gm-real"><b>' + esc(T.real || "") + ":</b> " + esc(p[5]) + "</div>";
    var badges = [];
    if (p[7]) badges.push(T.enterable);
    if (p[6]) badges.push(T.unconfirmed);
    if (badges.length) h += '<div class="gm-badges">' + badges.map(function (b) { return "<em>" + esc(b) + "</em>"; }).join("") + "</div>";
    h += '<a class="gm-link" href="#p=' + i + '">' + esc(T.link || "#") + "</a></div>";
    return h;
  }

  function refresh() {
    cluster.clearLayers();
    var vis = all.filter(function (o) { return active[o.p[4]]; }).map(function (o) { return o.m; });
    cluster.addLayers(vis);
    document.getElementById("gm-count").textContent = (T.visible || "") + " " + vis.length + " / " + all.length;
  }

  function focus(i) {
    var o = all[i];
    if (!o) return;
    if (!active[o.p[4]]) { active[o.p[4]] = true; var cb = document.querySelector('[data-cat="' + o.p[4] + '"]'); if (cb) cb.checked = true; refresh(); }
    map.setView(o.m.getLatLng(), 5);
    setTimeout(function () { cluster.zoomToShowLayer(o.m, function () { o.m.openPopup(); }); }, 250);
  }

  fetch("/static/map/miejsca.json").then(function (r) { return r.json(); }).then(function (d) {
    d.points.forEach(function (p, i) {
      if (!COLORS[p[4]]) p[4] = "other";
      counts[p[4]]++;
      var m = L.marker([p[3], p[2]], { icon: icons[p[4]], title: p[0] }).bindPopup(popup(p, i));
      all.push({ p: p, m: m, s: (p[0] + " " + p[1] + " " + p[5]).toLowerCase() });
    });
    d.labels.forEach(function (l) {
      var big = l[3] > 150;
      L.marker([l[2], l[1]], { interactive: false, icon: L.divIcon({ className: "gm-label" + (big ? " big" : ""), html: "<span>" + esc(l[0]) + "</span>", iconSize: null }) }).addTo(labelsLayer);
    });
    // filtry
    var box = document.getElementById("gm-cats");
    ORDER.forEach(function (c) {
      if (!counts[c]) return;
      var lab = document.createElement("label");
      lab.innerHTML = '<input type="checkbox" checked data-cat="' + c + '"><span class="sw" style="background:' + COLORS[c] + '"></span>' + esc((T.cats || {})[c] || c) + " <small>" + counts[c] + "</small>";
      box.appendChild(lab);
    });
    box.addEventListener("change", function (e) { var c = e.target.getAttribute("data-cat"); if (c) { active[c] = e.target.checked; refresh(); } });
    document.getElementById("gm-all").onclick = function () { ORDER.forEach(function (c) { active[c] = true; }); box.querySelectorAll("input").forEach(function (i) { i.checked = true; }); refresh(); };
    document.getElementById("gm-none").onclick = function () { ORDER.forEach(function (c) { active[c] = false; }); box.querySelectorAll("input").forEach(function (i) { i.checked = false; }); refresh(); };
    refresh();
    var hm = location.hash.match(/p=(\d+)/);
    if (hm) focus(+hm[1]);
  }).catch(function () { document.getElementById("gm-count").textContent = T.error || "Error"; });

  // wyszukiwarka
  var q = document.getElementById("gm-q"), res = document.getElementById("gm-res");
  q.addEventListener("input", function () {
    var v = q.value.trim().toLowerCase();
    res.innerHTML = "";
    if (v.length < 2) { res.hidden = true; return; }
    var hits = [];
    for (var i = 0; i < all.length && hits.length < 12; i++) if (all[i].s.indexOf(v) !== -1) hits.push(i);
    res.hidden = false;
    if (!hits.length) { res.innerHTML = '<li class="none">' + esc(T.noresults || "-") + "</li>"; return; }
    hits.forEach(function (i) {
      var p = all[i].p, li = document.createElement("li");
      li.innerHTML = '<span class="sw" style="background:' + COLORS[p[4]] + '"></span><b>' + esc(p[0]) + "</b> <small>" + esc(p[1]) + "</small>";
      li.onclick = function () { res.hidden = true; q.value = p[0]; focus(i); };
      res.appendChild(li);
    });
  });
  window.addEventListener("hashchange", function () { var hm = location.hash.match(/p=(\d+)/); if (hm) focus(+hm[1]); });

  // pełny ekran
  document.getElementById("gm-full").onclick = function () {
    var on = root.classList.toggle("gm-fs");
    document.body.classList.toggle("gm-lock", on);
    this.textContent = on ? (T.exitfull || "×") : (T.full || "⛶");
    setTimeout(function () { map.invalidateSize(); }, 50);
  };
  document.getElementById("gm-reset").onclick = function () { map.setView([400, -3200], 1); };
})();
