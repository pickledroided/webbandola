function updateTime() {
  var now = new Date().toLocaleString();
  document.querySelector("#timeElement").innerHTML = now;
}
setInterval(updateTime, 1000);
updateTime();


var osContainer = document.getElementById("os");

function fitOsToScreen() {
  if (!osContainer) return;

  var scale = Math.min(
    1,
    window.innerWidth / 1280,
    window.innerHeight / 720
  );

  osContainer.style.transform = "scale(" + scale + ")";
  osContainer.style.left = "0px";
  osContainer.style.top = "0px";
}

function getOsScale() {
  if (!osContainer) return 1;
  var match = osContainer.style.transform.match(/scale\(([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}

window.addEventListener("resize", fitOsToScreen);
fitOsToScreen();

// --- Window management ---

var biggestIndex = 1;
var topBar = document.querySelector("#top");

function handleWindowTap(element) {
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
  deselectIcon(selectedIcon);
}

function initializeWindow(id) {
  var element = document.getElementById(id);

  var inner = document.createElement("div");
  inner.className = "window-inner";
  while (element.firstChild) {
    inner.appendChild(element.firstChild);
  }
  element.appendChild(inner);

  dragElement(element);
  element.addEventListener("mousedown", function () {
    handleWindowTap(element);
  });

  var closeButton = document.querySelector("#" + id + "close");
  closeButton.addEventListener("click", function () {
    closeWindow(element);
  });

  var minButton = document.querySelector("#" + id + "min");
  if (minButton) {
    minButton.addEventListener("click", function () {
      minWindow(element);
    });
  }

  setupResize(element);

  return element;
}

function setupResize(element) {
  var handle = document.createElement("div");
  handle.className = "resize-handle";
  element.appendChild(handle);

  handle.addEventListener("mousedown", function (e) {
    e = e || window.event;
    e.preventDefault();
    e.stopPropagation();

    var s = getOsScale();
    var rect = element.getBoundingClientRect();
    var vx = rect.left / s;
    var vy = rect.top / s;
    var startW = element.offsetWidth;
    var startH = element.offsetHeight;
    var startX = e.clientX;
    var startY = e.clientY;

    function doResize(ev) {
      ev = ev || window.event;
      ev.preventDefault();
      var newW = Math.max(240, startW + (ev.clientX - startX) / s);
      var newH = Math.max(140, startH + (ev.clientY - startY) / s);
      element.style.width = newW + "px";
      element.style.height = newH + "px";
      element.style.left = (vx + newW / 2) + "px";
      element.style.top = (vy + newH / 2) + "px";
    }

    function stopResize() {
      document.onmousemove = null;
      document.onmouseup = null;
    }

    document.onmousemove = doResize;
    document.onmouseup = stopResize;
  });
}

var openApps = {};

function openWindow(element) {
  element.classList.remove("closing");
  element.classList.remove("genie-out");
  element.style.display = "flex";
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
  openApps[element.id] = "open";
  renderDock();
  element.classList.remove("opening");
  void element.offsetWidth;
  element.classList.add("opening");
}

function closeWindow(element) {
  element.classList.remove("opening");
  openApps[element.id] = "closed";
  renderDock();
  element.classList.add("closing");
  element.addEventListener("animationend", function () {
    element.classList.remove("closing");
    element.style.display = "none";
  }, { once: true });
}

function minWindow(element) {
  var dock = document.querySelector("#dock");
  var dockRect = dock.getBoundingClientRect();
  var elRect = element.getBoundingClientRect();
  var scale = getOsScale();
  var dy = ((dockRect.top + dockRect.height / 2) - (elRect.top + elRect.height / 2)) / scale;

  element.style.setProperty("--genie-dy", dy + "px");
  element.classList.add("genie-out");
  element.addEventListener("animationend", function () {
    element.classList.remove("genie-out");
    element.style.display = "none";
    openApps[element.id] = "minimized";
    renderDock();
  }, { once: true });
}

var dockItems = {};

function renderDock(){
  var dock = document.querySelector("#dock");
  var ids = ["welcome", "notes", "contacts", "browser", "calculator", "compendium"];

  var present = {};
  ids.forEach(function (id) {
    if (openApps[id] !== "open" && openApps[id] !== "minimized") return;
    present[id] = true;
  });

  Object.keys(dockItems).forEach(function (id) {
    if (present[id]) return;
    var item = dockItems[id];
    delete dockItems[id];
    item.classList.add("leaving");
    item.addEventListener("animationend", function () {
      item.remove();
      var dock = document.querySelector("#dock");
      dock.classList.toggle("dock-empty", dock.querySelectorAll(".dock-item").length === 0);
    });
  });

  ids.forEach(function (id) {
    if (!present[id]) return;

    if (dockItems[id]) {
      dockItems[id].classList.toggle("minimized", openApps[id] === "minimized");
      return;
    }

    var iconImg = document.querySelector("#" + id + "icon img");
    var src = iconImg ? iconImg.src : "img/avatar-isaac.png";
    var item = document.createElement("div");
    item.className = "dock-item" + (openApps[id] === "minimized" ? " minimized" : "");
    item.innerHTML = '<img src="' + src + '" alt="' + id + '">';

    item.addEventListener("click", function () {
      openWindow(document.getElementById(id));
    });

    dockItems[id] = item;
    dock.appendChild(item);
  });

  dock.classList.toggle("dock-empty", dock.querySelectorAll(".dock-item").length === 0);
}

function dragElement(element) {
  var initialX = 0;
  var initialY = 0;
  var currentX = 0;
  var currentY = 0;

  if (document.getElementById(element.id + "header")) {
    document.getElementById(element.id + "header").onmousedown = startDragging;
  } else {
    element.onmousedown = startDragging;
  }

  function startDragging(e) {
    e = e || window.event;
    e.preventDefault();
    initialX = e.clientX;
    initialY = e.clientY;
    document.onmouseup = stopDragging;
    document.onmousemove = elementDrag;
  }

  function currentScale() {
    return getOsScale();
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    var s = currentScale();
    currentX = (initialX - e.clientX) / s;
    currentY = (initialY - e.clientY) / s;
    initialX = e.clientX;
    initialY = e.clientY;
    element.style.top = (element.offsetTop - currentY) + "px";
    element.style.left = (element.offsetLeft - currentX) + "px";
  }

  function stopDragging() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

var selectedIcon = undefined;

function selectIcon(element) {
  element.classList.add("selected");
  selectedIcon = element;
}

function deselectIcon(element) {
  if (element) {
    element.classList.remove("selected");
  }
  selectedIcon = undefined;
}

function handleIconTap(element) {
  if (element.classList.contains("selected")) {
    deselectIcon(element);
  } else {
    deselectIcon(selectedIcon);
    selectIcon(element);
  }
}

function initializeApp(id) {
  var screen = initializeWindow(id);
  var icon = document.querySelector("#" + id + "icon");

  makeIconDraggable(icon);

  icon.addEventListener("click", function () {
    if (icon._dragged) {
      icon._dragged = false;
      return;
    }
    handleIconTap(icon);
    openWindow(screen);
  });

  return screen;
}

function makeIconDraggable(icon) {
  var dragging = false;
  var moved = false;
  var startX = 0;
  var startY = 0;
  var offsetX = 0;
  var offsetY = 0;

  icon.addEventListener("mousedown", function (e) {
    e = e || window.event;
    e.preventDefault();
    var s = getOsScale();
    startX = e.clientX;
    startY = e.clientY;
    offsetX = (e.clientX / s) - icon.offsetLeft;
    offsetY = (e.clientY / s) - icon.offsetTop;
    dragging = true;
    moved = false;

    document.onmousemove = function (ev) {
      if (!dragging) return;
      ev = ev || window.event;
      ev.preventDefault();
      var s2 = getOsScale();
      var x = (ev.clientX / s2) - offsetX;
      var y = (ev.clientY / s2) - offsetY;
      if (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3) {
        moved = true;
      }
      icon.style.left = Math.max(0, x) + "px";
      icon.style.top = Math.max(0, y) + "px";
    };

    document.onmouseup = function () {
      dragging = false;
      document.onmousemove = null;
      document.onmouseup = null;
      if (moved) {
        icon._dragged = true;
        saveIconPositions();
      }
    };
  });
}

var iconPositionsKey = "isaacos_icon_positions";

function saveIconPositions() {
  try {
    var positions = {};
    document.querySelectorAll(".appicon").forEach(function (icon) {
      if (icon.style.left !== "" && icon.style.top !== "") {
        positions[icon.id] = { left: icon.style.left, top: icon.style.top };
      }
    });
    localStorage.setItem(iconPositionsKey, JSON.stringify(positions));
  } catch (e) {}
}

function loadIconPositions() {
  try {
    var saved = localStorage.getItem(iconPositionsKey);
    if (!saved) return;
    var positions = JSON.parse(saved);
    Object.keys(positions).forEach(function (id) {
      var icon = document.getElementById(id);
      if (icon) {
        icon.style.left = positions[id].left;
        icon.style.top = positions[id].top;
      }
    });
  } catch (e) {}
} 

loadIconPositions();

var welcomeScreen = initializeWindow("welcome");
var welcomeScreenOpen = document.querySelector("#welcomeopen");

openWindow(welcomeScreen);

welcomeScreenOpen.addEventListener("click", function () {
  openWindow(welcomeScreen);
});

var notesScreen = initializeApp("notes");
var contactsScreen = initializeApp("contacts");
var browserScreen = initializeApp("browser");
var calculatorScreen = initializeApp("calculator");
var compendiumScreen = initializeApp("compendium");


var calcDisplay = document.querySelector("#calcDisplay");
var calcState = {
  current: "0",
  previous: null,
  operator: null,
  expr: "",
  reset: false,
  resultShown: false
};

function calcOpSymbol(op) {
  switch (op) {
    case "+": return "+";
    case "-": return "\u2212";
    case "*": return "\u00d7";
    case "/": return "\u00f7";
    default: return "";
  }
}

function calcUpdate() {
  var sym = calcOpSymbol(calcState.operator);
  if (calcState.resultShown) {
    calcDisplay.value = calcState.expr;
  } else if (calcState.operator && calcState.reset) {
    calcDisplay.value = calcState.expr + " " + sym + " ";
  } else if (calcState.operator) {
    calcDisplay.value = calcState.expr + " " + sym + " " + calcState.current;
  } else {
    calcDisplay.value = calcState.expr + calcState.current;
  }
}

function calcInputDigit(d) {
  if (calcState.reset) {
    if (calcState.resultShown) {
      calcState.expr = "";
    }
    calcState.current = "";
    calcState.reset = false;
    calcState.resultShown = false;
  }
  if (calcState.current === "0") {
    calcState.current = d;
  } else {
    calcState.current += d;
  }
  calcUpdate();
}

function calcInputDecimal() {
  if (calcState.reset) {
    if (calcState.resultShown) {
      calcState.expr = "";
    }
    calcState.current = "0";
    calcState.reset = false;
    calcState.resultShown = false;
  }
  if (calcState.current.indexOf(".") === -1) {
    calcState.current += ".";
  }
  calcUpdate();
}

function calcCompute(a, b, op) {
  a = parseFloat(a);
  b = parseFloat(b);
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b === 0 ? "ERR" : a / b;
    default: return b;
  }
}

function calcChooseOperator(op) {
  if (calcState.reset) {
    if (calcState.resultShown) {
      calcState.previous = parseFloat(calcState.current);
      calcState.current = "";
    }
    calcState.operator = op;
    calcState.resultShown = false;
    calcUpdate();
    return;
  }

  var value = parseFloat(calcState.current);
  if (calcState.operator) {
    var result = calcCompute(calcState.previous, value, calcState.operator);
    calcState.expr = calcState.expr + " " + calcOpSymbol(calcState.operator) + " " + calcState.current + " = " + String(result);
    calcState.previous = result;
  } else {
    calcState.expr = calcState.expr + calcState.current;
    calcState.previous = value;
  }
  calcState.operator = op;
  calcState.current = "";
  calcState.reset = true;
  calcUpdate();
}

function calcEquals() {
  if (calcState.operator === null) return;
  var value = parseFloat(calcState.current);
  var result = calcCompute(calcState.previous, value, calcState.operator);
  var sym = calcOpSymbol(calcState.operator);
  calcState.expr = calcState.expr + " " + sym + " " + calcState.current + " = " + String(result);
  calcState.current = String(result);
  calcState.previous = result;
  calcState.operator = null;
  calcState.reset = true;
  calcState.resultShown = true;
  calcUpdate();
}

function calcClear() {
  calcState.current = "0";
  calcState.previous = null;
  calcState.operator = null;
  calcState.expr = "";
  calcState.reset = false;
  calcState.resultShown = false;
  calcUpdate();
}

function calcBackspace() {
  if (calcState.reset) return;
  calcState.current = calcState.current.length > 1
    ? calcState.current.slice(0, -1)
    : "0";
  calcUpdate();
}

function calcSign() {
  if (calcState.reset) return;
  calcState.current = calcState.current.charAt(0) === "-"
    ? calcState.current.slice(1)
    : "-" + calcState.current;
  calcUpdate();
}

function calcPercent() {
  calcState.current = String(parseFloat(calcState.current) / 100);
  calcUpdate();
}

document.querySelectorAll(".calc-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var action = btn.getAttribute("data-action");
    switch (action) {
      case "digit": calcInputDigit(btn.getAttribute("data-value")); break;
      case "op": calcChooseOperator(btn.getAttribute("data-value")); break;
      case "equals": calcEquals(); break;
      case "clear": calcClear(); break;
      case "backspace": calcBackspace(); break;
      case "sign": calcSign(); break;
      case "percent": calcPercent(); break;
      case "decimal": calcInputDecimal(); break;
    }
  });
});

var browserFrame = document.querySelector("#browserFrame");
var browserUrl = document.querySelector("#browserUrl");
var browserHomePage = document.querySelector("#browserHomePage");
var browserError = document.querySelector("#browserError");
var browserHistory = [];
var browserHistoryIndex = -1;
var browserCurrentUrl = "";

function browserShowHome() {
  browserFrame.style.display = "none";
  browserError.style.display = "none";
  browserHomePage.style.display = "flex";
  browserUrl.value = "";
}

function browserShowFrame() {
  browserHomePage.style.display = "none";
  browserError.style.display = "none";
  browserFrame.style.display = "block";
}

function browserResolve(input) {
  input = input.trim();
  if (!input) return null;

  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    input = "https://" + input;
  }

  return input;
}

function browserGo(url) {
  if (!url) return;

  browserFrame.src = url;
  browserCurrentUrl = url;
  browserHistory = browserHistory.slice(0, browserHistoryIndex + 1);
  browserHistory.push(url);
  browserHistoryIndex++;
  browserUrl.value = url;
  browserShowFrame();
}

function browserOpenTab() {
  if (browserCurrentUrl) {
    window.open(browserCurrentUrl, "_blank");
  }
}

browserFrame.addEventListener("load", function () {
  browserError.style.display = "none";
  try {
    var current = browserFrame.contentWindow.location.href;
    if (current) {
      browserUrl.value = current;
    }
  } catch (e) {}
});

browserFrame.addEventListener("error", function () {
  browserError.style.display = "flex";
});

document.querySelector("#browserGo").addEventListener("click", function () {
  browserGo(browserResolve(browserUrl.value));
});

browserUrl.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    browserGo(browserResolve(browserUrl.value));
  }
});

document.querySelector("#browserBack").addEventListener("click", function () {
  if (browserHistoryIndex > 0) {
    browserHistoryIndex--;
    browserFrame.src = browserHistory[browserHistoryIndex];
    browserUrl.value = browserHistory[browserHistoryIndex];
    browserShowFrame();
  }
});

document.querySelector("#browserForward").addEventListener("click", function () {
  if (browserHistoryIndex < browserHistory.length - 1) {
    browserHistoryIndex++;
    browserFrame.src = browserHistory[browserHistoryIndex];
    browserUrl.value = browserHistory[browserHistoryIndex];
    browserShowFrame();
  }
});

document.querySelector("#browserHome").addEventListener("click", browserShowHome);

document.querySelector("#browserReload").addEventListener("click", function () {
  if (browserFrame.src) {
    browserFrame.src = browserFrame.src;
  }
});

document.querySelector("#browserOpenTab").addEventListener("click", browserOpenTab);

document.querySelectorAll(".browser-links a").forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    browserGo(link.getAttribute("data-url"));
  });
});

var defaultContent = [
  {
    title: "isaac's diary",
    date: "31/07/2026",
    content: `
      <h2>isaac's diary</h2>
      <p>
        mom, that one day you locked me in my room... I think I saw a tear rolling down your face.
      </p>
      <blockquote>
        Eeugh.
        ~ Isaac
      </blockquote>
      <p>maybe it's not that bad... maybe i can find a way out.</p>
      <p> and then i became blue baby lol </p>
    `
  }
];

function saveNotes() {
  try {
    localStorage.setItem("isaacos_notes", JSON.stringify(content));
  } catch (e) {}
}

function loadNotes() {
  try {
    var saved = localStorage.getItem("isaacos_notes");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return defaultContent;
}

var content = loadNotes();

var sidebar = document.querySelector("#sidebar");
var noteContent = document.querySelector("#noteContent");
var currentIndex = 0;

function setNotesContent(index) {
  currentIndex = index;
  var note = content[index];
  noteContent.innerHTML = note.content;
}

noteContent.addEventListener("input", function () {
  content[currentIndex].content = noteContent.innerHTML;
  content[currentIndex].date = new Date().toLocaleDateString("it-IT");
  saveNotes();

  var heading = noteContent.querySelector("h2");
  if (heading) {
    var item = sidebar.querySelectorAll(".sidebar-item")[currentIndex];
    var title = item.querySelector(".item-title");
    var date = item.querySelector(".item-date");
    title.innerHTML = heading.textContent;
    date.innerHTML = content[currentIndex].date;
    content[currentIndex].title = heading.textContent;
  }
});

function addToSideBar(index) {
  var note = content[index];

  var newDiv = document.createElement("div");
  newDiv.classList.add("sidebar-item");
  newDiv.innerHTML = `
    <div class="sidebar-item-head">
      <p class="item-title">${note.title}</p>
      <span class="item-trash" title="Elimina nota">🗑</span>
    </div>
    <p class="item-date">${note.date}</p>
  `;

  newDiv.addEventListener("click", function () {
    var items = sidebar.querySelectorAll(".sidebar-item");
    items.forEach(function (item) {
      item.classList.remove("active");
    });
    newDiv.classList.add("active");
    setNotesContent(index);
  });

  newDiv.querySelector(".item-trash").addEventListener("click", function (e) {
    e.stopPropagation();
    deleteNote(index);
  });

  sidebar.appendChild(newDiv);
}

function deleteNote(index) {
  content.splice(index, 1);
  saveNotes();

  var items = sidebar.querySelectorAll(".sidebar-item");
  items[index].remove();

  if (content.length === 0) {
    noteContent.innerHTML = "";
    currentIndex = 0;
    return;
  }

  var newIndex = Math.max(0, Math.min(index, content.length - 1));
  items = sidebar.querySelectorAll(".sidebar-item");
  items.forEach(function (item) {
    item.classList.remove("active");
  });
  items[newIndex].classList.add("active");
  setNotesContent(newIndex);
}

document.querySelector("#newNoteBtn").addEventListener("click", function () {
  var index = content.length;
  content.push({
    title: "New note",
    date: new Date().toLocaleDateString("it-IT"),
    content: "<h2>New note</h2><p></p>"
  });
  saveNotes();
  addToSideBar(index);

  var items = sidebar.querySelectorAll(".sidebar-item");
  items.forEach(function (item) {
    item.classList.remove("active");
  });
  items[items.length - 1].classList.add("active");
  setNotesContent(index);
  noteContent.focus();
});

for (var i = 0; i < content.length; i++) {
  addToSideBar(i);
}

setNotesContent(0);
sidebar.querySelector(".sidebar-item").classList.add("active");

// --- Compendium app ---

var compItems = [];
var compPools = [];
var compQuery = "";
var compSort = "id";
var compFilterType = "all";
var compFilterDlc = "all";
var compFilterQuality = "all";
var compFilterPool = "all";
var compSelectedKey = null;

var compList = document.querySelector("#compendiumList");
var compDetail = document.querySelector("#compendiumDetail");
var compSearch = document.querySelector("#compendiumSearch");
var compSortSel = document.querySelector("#compendiumSort");
var compFiltersEl = document.querySelector("#compendiumFilters");

var DLC_ORDER = ["Rebirth", "Afterbirth", "Afterbirth+", "Repentance", "Repentance+"];
var POOL_MAIN = [
  "Treasure Room", "Boss", "Devil Room", "Angel Room",
  "Shop", "Secret Room", "Ultra Secret Room", "Curse Room"
];

function compSortPools(list) {
  if (!list) return [];
  return list.slice().sort(function (a, b) {
    var ia = POOL_MAIN.indexOf(a);
    var ib = POOL_MAIN.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });
}

function compEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compQualityColor(q) {
  switch (q) {
    case 4: return "#e53935";
    case 3: return "#ef6c00";
    case 2: return "#29b6f6";
    case 1: return "#9e9e9e";
    default: return "#6a6a6a";
  }
}

function compFiltered() {
  var q = compQuery.trim().toLowerCase();
  return compItems.filter(function (item) {
    if (compFilterType === "active" && !item.active) return false;
    if (compFilterType === "passive" && item.active) return false;
    if (compFilterDlc !== "all" && item.introduced !== compFilterDlc) return false;
    if (compFilterPool !== "all" && (!item.pools || item.pools.indexOf(compFilterPool) === -1)) return false;
    if (compFilterQuality !== "all") {
      var ql = item.quality == null ? 0 : item.quality;
      if (ql !== parseInt(compFilterQuality, 10)) return false;
    }
    if (q) {
      var hay = (item.name + " " + item.quote).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function compSortItems(list) {
  return list.slice().sort(function (a, b) {
    if (compSort === "alpha") {
      return a.name.localeCompare(b.name);
    }
    if (compSort === "quality") {
      var qa = a.quality == null ? -1 : a.quality;
      var qb = b.quality == null ? -1 : b.quality;
      if (qb !== qa) return qb - qa;
      return a.id - b.id;
    }
    return a.id - b.id;
  });
}

function compRender() {
  var list = compSortItems(compFiltered());

  if (list.length === 0) {
    compList.innerHTML = '<div class="compendium-empty">No item found.</div>';
  } else {
    compList.innerHTML = list.map(function (item) {
      return '<button class="compendium-card' + (compSelectedKey === item.key ? " selected" : "") + '" data-key="' + compEsc(item.key) + '">' +
        '<img class="compendium-card-img" src="' + compEsc(item.icon) + '" alt="" loading="lazy">' +
        '<span class="compendium-card-name">' + compEsc(item.name) + '</span>' +
        '<span class="compendium-card-q" style="color:' + compQualityColor(item.quality) + '">' +
        (item.quality == null ? "?" : item.quality) + '</span>' +
        '</button>';
    }).join("");
  }

  compRenderDetail();
}

function compRenderDetail() {
  var item = compItems.find(function (i) { return i.key === compSelectedKey; });
  if (!item) {
    compDetail.innerHTML = '<div class="compendium-detail-empty">Select an item</div>';
    return;
  }

  var stars = "";
  for (var s = 0; s < 4; s++) {
    stars += '<span class="comp-star' + (s < (item.quality || 0) ? " on" : "") + '"></span>';
  }

  compDetail.innerHTML =
    '<div class="compendium-detail-head">' +
      '<img class="compendium-detail-img" src="' + compEsc(item.icon) + '" alt="">' +
      '<div class="compendium-detail-titles">' +
        '<h3 class="compendium-detail-name">' + compEsc(item.name) + '</h3>' +
        '<p class="compendium-detail-quote">"' + compEsc(item.quote) + '"</p>' +
      '</div>' +
    '</div>' +
    '<div class="compendium-detail-meta">' +
      '<div class="compendium-detail-chip">' + (item.active ? "Active" : "Passive") + '</div>' +
      '<div class="compendium-detail-chip">' + compEsc(item.introduced) + '</div>' +
      '<div class="compendium-detail-quality" title="Quality">' + stars + '<span class="compendium-quality-num">' + (item.quality == null ? "?" : item.quality) + '/4</span></div>' +
      '<div class="compendium-detail-id">ID ' + item.id + '</div>' +
    '</div>' +
    '<p class="compendium-detail-desc">' + compEsc(item.description) + '</p>' +
    compPoolHtml(item) +
    compUnlockHtml(item) +
    '<a class="compendium-detail-link" href="' + compEsc(item.wiki) + '" target="_blank" rel="noopener">Open in wiki.gg →</a>';
}

function compUnlockIconList(list, kind) {
  if (!list || !list.length) return "";
  return '<div class="compendium-unlock-row">' +
    '<span class="compendium-unlock-kind">' + kind + '</span>' +
    list.map(function (e) {
      var icon = e.icon
        ? '<img class="compendium-unlock-icon" src="' + compEsc(e.icon) + '" alt="">'
        : '<span class="compendium-unlock-noicon">?</span>';
      return '<div class="compendium-unlock-entity" title="' + compEsc(e.name) + '">' +
        icon + '<span class="compendium-unlock-name">' + compEsc(e.name) + '</span>' +
        '</div>';
    }).join("") + '</div>';
}

function compPoolHtml(item) {
  if (!item.pools || !item.pools.length) return "";
  return '<div class="compendium-pool">' +
    '<h4 class="compendium-pool-title">Item Pool</h4>' +
    '<div class="compendium-pool-chips">' +
    compSortPools(item.pools).map(function (p) {
      return '<span class="compendium-pool-chip">' + compEsc(p) + '</span>';
    }).join("") +
    '</div></div>';
}

function compUnlockHtml(item) {
  if (!item.unlock) return "";
  var h = '<div class="compendium-unlock">' +
    '<h4 class="compendium-unlock-title">How to unlock</h4>' +
    '<p class="compendium-unlock-text">' + compEsc(item.unlock.text) + '</p>';
  if (item.unlock.bosses && item.unlock.bosses.length) {
    h += compUnlockIconList(item.unlock.bosses, "Boss");
  }
  if (item.unlock.characters && item.unlock.characters.length) {
    h += compUnlockIconList(item.unlock.characters, "Character");
  }
  h += '</div>';
  return h;
}

function compBuildFilters() {
  var dlcs = DLC_ORDER.filter(function (dlc) {
    return compItems.some(function (i) { return i.introduced === dlc; });
  });

  var typeChips = [
    { value: "all", label: "All" },
    { value: "active", label: "Actives" },
    { value: "passive", label: "Passives" }
  ];
  var dlcChips = [{ value: "all", label: "All DLCs" }].concat(
    dlcs.map(function (d) { return { value: d, label: d }; })
  );
  var qualityChips = [{ value: "all", label: "Quality: all" }].concat(
    [4, 3, 2, 1, 0].map(function (v) {
      var count = compItems.filter(function (i) { return (i.quality == null ? 0 : i.quality) === v; }).length;
      return { value: String(v), label: "Q" + v + " (" + count + ")" };
    })
  );
  var poolMain = compSortPools(compPools).filter(function (p) { return POOL_MAIN.indexOf(p) !== -1; });
  var poolOther = compPools.filter(function (p) { return POOL_MAIN.indexOf(p) === -1; });
  var poolMainChips = poolMain.map(function (p) {
    var count = compItems.filter(function (i) { return i.pools && i.pools.indexOf(p) !== -1; }).length;
    return { value: p, label: p + " (" + count + ")" };
  });
  var poolOtherChips = poolOther.map(function (p) {
    var count = compItems.filter(function (i) { return i.pools && i.pools.indexOf(p) !== -1; }).length;
    return { value: p, label: p + " (" + count + ")" };
  });

  function chipGroup(caption, chips, current, handler) {
    return '<div class="compendium-chipgroup" data-group="' + caption + '"><span class="compendium-chiplabel">' + caption + '</span>' +
      chips.map(function (c) {
        return '<button class="compendium-chip' + (current === c.value ? " active" : "") + '" data-value="' + c.value + '">' + c.label + '</button>';
      }).join("") + '</div>';
  }

  function poolGroup() {
    return '<div class="compendium-chipgroup compendium-poolgroup" data-group="Pool">' +
      '<span class="compendium-chiplabel">Pool</span>' +
      poolMainChips.map(function (c) {
        return '<button class="compendium-chip' + (compFilterPool === c.value ? " active" : "") + '" data-value="' + c.value + '">' + c.label + '</button>';
      }).join("") +
      '<select class="compendium-sort compendium-poolselect" id="compendiumPoolSelect">' +
      '<option value="all">More pools…</option>' +
      poolOtherChips.map(function (c) {
        return '<option value="' + c.value + '"' + (compFilterPool === c.value ? " selected" : "") + '>' + c.label + '</option>';
      }).join("") +
      '</select>' +
      '</div>';
  }

  compFiltersEl.innerHTML =
    chipGroup("Type", typeChips, compFilterType, "type") +
    chipGroup("DLC", dlcChips, compFilterDlc, "dlc") +
    chipGroup("Quality", qualityChips, compFilterQuality, "quality") +
    poolGroup();

  compFiltersEl.querySelectorAll(".compendium-chip").forEach(function (chip) {
    var group = chip.closest(".compendium-chipgroup").getAttribute("data-group");
    chip.addEventListener("click", function () {
      var v = chip.getAttribute("data-value");
      if (group === "Type") compFilterType = v;
      else if (group === "DLC") compFilterDlc = v;
      else if (group === "Quality") compFilterQuality = v;
      else if (group === "Pool") {
        compFilterPool = compFilterPool === v ? "all" : v;
        var sel = document.getElementById("compendiumPoolSelect");
        if (sel) sel.value = compFilterPool === "all" || POOL_MAIN.indexOf(compFilterPool) !== -1 ? "all" : compFilterPool;
      }
      compBuildFilters();
      compRender();
    });
  });

  var poolSel = document.getElementById("compendiumPoolSelect");
  if (poolSel) {
    poolSel.addEventListener("change", function () {
      compFilterPool = poolSel.value;
      compBuildFilters();
      compRender();
    });
  }
}

compSearch.addEventListener("input", function () {
  compQuery = compSearch.value;
  compRender();
});

compSortSel.addEventListener("change", function () {
  compSort = compSortSel.value;
  compRender();
});

compList.addEventListener("click", function (e) {
  var card = e.target.closest(".compendium-card");
  if (!card) return;
  compSelectedKey = card.getAttribute("data-key");
  compRender();
});

function compInit() {
  if (typeof window.ISAAC_ITEMS === "undefined" || !window.ISAAC_ITEMS) {
    compList.innerHTML = '<div class="compendium-empty">Failed to load data.</div>';
    return;
  }
  compItems = window.ISAAC_ITEMS;
  var poolSet = {};
  compItems.forEach(function (i) {
    (i.pools || []).forEach(function (p) { poolSet[p] = true; });
  });
  compPools = Object.keys(poolSet).sort();
  compBuildFilters();
  compRender();
}

compInit();
