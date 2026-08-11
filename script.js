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
  var ids = ["welcome", "notes", "contacts", "browser", "calculator", "compendium", "gallery", "themes"];

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
      var win = document.getElementById(id);
      if (openApps[id] === "open" && win) {
        minWindow(win);
      } else {
        openWindow(win);
      }
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
var galleryScreen = initializeApp("gallery");
var themesScreen = initializeApp("themes");


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

var compSection = "items";
var compItems = [];
var compPools = [];
var compQuery = "";
var compSort = "id";
var compFilterType = "all";
var compFilterDlc = "all";
var compFilterQuality = "all";
var compFilterPool = "all";
var compSelectedKey = null;
var compUnlockCat = null; // null | "characters" | "challenges" | "items" per la tab Unlocks

var compList = document.querySelector("#compendiumList");
var compDetail = document.querySelector("#compendiumDetail");
var compSearch = document.querySelector("#compendiumSearch");
var compSortSel = document.querySelector("#compendiumSort");
var compFiltersEl = document.querySelector("#compendiumFilters");
var compTabs = document.querySelector("#compendiumTabs");

var DLC_ORDER = ["Rebirth", "Afterbirth", "Afterbirth+", "Repentance", "Repentance+"];
var POOL_MAIN = [
  "Treasure Room", "Boss", "Devil Room", "Angel Room",
  "Shop", "Secret Room", "Ultra Secret Room", "Curse Room"
];

function compSectionCfg() {
  if (compSection === "trinkets") {
    return { label: "Trinkets", hasType: false, hasQuality: false, hasDLC: true, search: ["name", "quote"] };
  }
  if (compSection === "bosses") {
    return { label: "Bosses", hasType: false, hasQuality: false, hasDLC: true, search: ["name", "location"] };
  }
  if (compSection === "unlocks") {
    if (compUnlockCat === "characters") {
      return { label: "Characters", hasType: false, hasQuality: false, hasDLC: true, search: ["name", "unlock", "unlockName"] };
    }
    if (compUnlockCat === "challenges") {
      return { label: "Challenges", hasType: false, hasQuality: false, hasDLC: true, search: ["name", "goal", "reward", "requirements"] };
    }
    if (compUnlockCat === "items") {
      return { label: "Items", hasType: true, hasQuality: true, hasDLC: true, hasPools: true, search: ["name", "quote"] };
    }
    return { label: "Unlocks", hasType: false, hasQuality: false, hasDLC: false, search: [] };
  }
  return { label: "Items", hasType: true, hasQuality: true, hasDLC: true, hasPools: true, search: ["name", "quote"] };
}

function compIsUnlocksHub() {
  return compSection === "unlocks" && (compUnlockCat === null || compUnlockCat === "");
}

function compUnlockCatData(cat) {
  if (cat === "characters") return window.ISAAC_CHARACTERS || [];
  if (cat === "challenges") return window.ISAAC_CHALLENGES || [];
  if (cat === "items") return (window.ISAAC_ITEMS || []).filter(function (i) { return !!i.unlock; });
  return [];
}

function compUnlockCatConfig() {
  return [
    { key: "characters", label: "Characters", icon: "img/avatar-isaac.png" },
    { key: "challenges", label: "Challenges", icon: "img/compendiumicon.png" },
    { key: "items", label: "Items", icon: "https://bindingofisaacrebirth.wiki.gg/images/Collectible_Transcendence_icon.png?5ad625" }
  ];
}

function compOpenUnlockCat(cat) {
  compUnlockCat = cat;
  compItems = compUnlockCatData(cat);
  compQuery = "";
  compSearch.value = "";
  compSort = "id";
  compSortSel.value = "id";
  compFilterType = "all";
  compFilterDlc = "all";
  compFilterQuality = "all";
  compFilterPool = "all";
  compSelectedKey = null;
  var back = document.getElementById("compendiumBack");
  if (back) back.style.display = "";
  compBuildFilters();
  compRender();
}

function compOpenUnlocksHub() {
  compUnlockCat = null;
  compSelectedKey = null;
  var back = document.getElementById("compendiumBack");
  if (back) back.style.display = "none";
  compBuildFilters();
  compRender();
}

function compSectionData() {
  if (compSection === "bosses") return window.ISAAC_BOSSES || [];
  if (compSection === "trinkets") return window.ISAAC_TRINKETS || [];
  if (compSection === "unlocks") return compUnlockCat ? compUnlockCatData(compUnlockCat) : [];
  return window.ISAAC_ITEMS || [];
}

function compSetSection(name) {
  compSection = name;
  compUnlockCat = null;
  var back = document.getElementById("compendiumBack");
  if (back) back.style.display = "none";
  compItems = compSectionData();
  var poolSet = {};
  compItems.forEach(function (i) {
    (i.pools || []).forEach(function (p) { poolSet[p] = true; });
  });
  compPools = Object.keys(poolSet).sort();
  compQuery = "";
  compSearch.value = "";
  compSort = "id";
  compSortSel.value = "id";
  compFilterType = "all";
  compFilterDlc = "all";
  compFilterQuality = "all";
  compFilterPool = "all";
  compSelectedKey = null;
  compRenderTabs();
  compBuildFilters();
  compRender();
}

function compRenderTabs() {
  compTabs.innerHTML = [["items", "Items"], ["trinkets", "Trinkets"], ["unlocks", "Unlocks"], ["bosses", "Bosses"]].map(function (t) {
    return '<button class="compendium-tab' + (compSection === t[0] ? " active" : "") + '" data-section="' + t[0] + '">' + t[1] + '</button>';
  }).join("");
}

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

var compWikiMap = null;
function compItemWiki(name) {
  if (!compWikiMap) {
    compWikiMap = {};
    [window.ISAAC_UNLOCKS, window.ISAAC_ITEMS, window.ISAAC_TRINKETS, window.ISAAC_CHARACTERS, window.ISAAC_CHALLENGES]
      .forEach(function (arr) {
        (arr || []).forEach(function (e) {
          if (e.wiki) {
            compWikiMap[e.name] = e.wiki;
            if (e.key) compWikiMap[e.key] = e.wiki;
          }
        });
      });
  }
  return compWikiMap[name] ||
    "https://bindingofisaacrebirth.wiki.gg/wiki/" + encodeURIComponent(String(name).replace(/ /g, "_"));
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
  var cfg = compSectionCfg();
  return compItems.filter(function (item) {
    if (cfg.hasType) {
      if (compFilterType === "active" && !item.active) return false;
      if (compFilterType === "passive" && item.active) return false;
    }
    if (cfg.hasDLC && compFilterDlc !== "all" && item.introduced !== compFilterDlc) return false;
    if (cfg.hasPools && compFilterPool !== "all" && (!item.pools || item.pools.indexOf(compFilterPool) === -1)) return false;
    if (cfg.hasQuality && compFilterQuality !== "all") {
      var ql = item.quality == null ? 0 : item.quality;
      if (ql !== parseInt(compFilterQuality, 10)) return false;
    }
    if (q) {
      var hay = cfg.search.map(function (k) { return item[k]; }).join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function compSortItems(list) {
  if (compSection === "bosses") {
    return list.slice().sort(function (a, b) {
      var ak = (a.kills && a.kills.length) || 0;
      var bk = (b.kills && b.kills.length) || 0;
      if (ak !== bk) return bk - ak;
      if (compSort === "alpha") return a.name.localeCompare(b.name);
      return (a.dlc || 0) - (b.dlc || 0);
    });
  }
  if (compSection === "unlocks" && compUnlockCat === "characters") {
    return list.slice().sort(function (a, b) {
      var at = isTaintedChar(a);
      var bt = isTaintedChar(b);
      if (at !== bt) return at ? 1 : -1;
      if (compSort === "alpha") return a.name.localeCompare(b.name);
      return 0;
    });
  }
  return list.slice().sort(function (a, b) {
    if (compSort === "alpha") {
      return a.name.localeCompare(b.name);
    }
    if (compSort === "quality") {
      var qa = (a.quality == null ? -1 : a.quality);
      var qb = (b.quality == null ? -1 : b.quality);
      if (qb !== qa) return qb - qa;
      return (a.id == null ? 0 : a.id) - (b.id == null ? 0 : b.id);
    }
    if (a.number != null && b.number != null) {
      return a.number - b.number;
    }
    return (a.id == null ? 0 : a.id) - (b.id == null ? 0 : b.id);
  });
}

function isTaintedChar(c) {
  return /^Tainted\b/i.test(c.name || "");
}

function compRender() {
  if (compIsUnlocksHub()) {
    compRenderHub();
    return;
  }
  var list = compSortItems(compFiltered());

  var isChars = compSection === "unlocks" && compUnlockCat === "characters";
  var isBosses = compSection === "bosses";
  compList.classList.toggle("compendium-list-big", isChars);
  compList.classList.toggle("compendium-list-boss", isBosses);

  if (list.length === 0) {
    compList.innerHTML = '<div class="compendium-empty">No ' + compSectionCfg().label.toLowerCase() + ' found.</div>';
  } else {
    compList.innerHTML = list.map(function (item) {
      if (isBosses) {
        var kills = item.kills && item.kills.length ? '<span class="compendium-card-bosses">' + item.kills.length + ' unlock</span>' : "";
        var loc = item.location
          ? '<span class="compendium-card-bossloc">' + compEsc(item.location) + '</span>'
          : "";
        var photo = item.photo
          ? '<img class="compendium-boss-photo" src="' + compEsc(item.photo) + '" alt="" loading="lazy">'
          : '<span class="compendium-card-noimg compendium-boss-noimg">?</span>';
        var icon = item.icon
          ? '<img class="compendium-boss-mini" src="' + compEsc(item.icon) + '" alt="" loading="lazy">'
          : "";
        return '<button class="compendium-card compendium-card-boss' + (compSelectedKey === item.key ? " selected" : "") + '" data-key="' + compEsc(item.key) + '">' +
          '<span class="compendium-boss-photowrap">' + photo + '</span>' +
          '<span class="compendium-boss-cardfoot">' +
            icon +
            '<span class="compendium-boss-cardinfo">' +
              '<span class="compendium-card-name">' + compEsc(item.name) + '</span>' +
              loc +
            '</span>' +
          '</span>' +
          kills +
          '</button>';
      }
      var q = item.quality == null
        ? ""
        : '<span class="compendium-card-q" style="color:' + compQualityColor(item.quality) + '">' + item.quality + '</span>';
      var num = item.number != null
        ? '<span class="compendium-card-num">#' + item.number + '</span>'
        : "";
      var img = item.icon
        ? '<img class="compendium-card-img" src="' + compEsc(item.icon) + '" alt="" loading="lazy">'
        : '<span class="compendium-card-noimg">' + (item.number != null ? '#' + item.number : '?') + '</span>';
      var extra = isChars && item.bossUnlocks && item.bossUnlocks.length
        ? '<span class="compendium-card-bosses">' + item.bossUnlocks.length + ' boss</span>'
        : "";
      return '<button class="compendium-card' + (isChars ? " compendium-card-big" : "") + (compSelectedKey === item.key ? " selected" : "") + '" data-key="' + compEsc(item.key) + '">' +
        img +
        '<span class="compendium-card-name">' + compEsc(item.name) + '</span>' +
        q + num + extra +
        '</button>';
    }).join("");
  }

  compRenderDetail();
}

function compRenderHub() {
  compList.innerHTML = '<div class="compendium-hub">' +
    compUnlockCatConfig().map(function (c) {
      var count = compUnlockCatData(c.key).length;
      return '<button class="compendium-hub-tile" data-cat="' + c.key + '">' +
        '<img class="compendium-hub-img" src="' + compEsc(c.icon) + '" alt="">' +
        '<span class="compendium-hub-name">' + c.label + '</span>' +
        '<span class="compendium-hub-count">' + count + '</span>' +
        '</button>';
    }).join("") + '</div>';
  compDetail.innerHTML = '<div class="compendium-detail-empty">Pick a category to browse its unlocks.</div>';
}

function compRenderDetail() {
  var item = compItems.find(function (i) { return i.key === compSelectedKey; });
  if (!item) {
    compDetail.innerHTML = '<div class="compendium-detail-empty">Select an ' + compSectionCfg().label.toLowerCase() + '</div>';
    return;
  }

  if (compSection === "bosses") {
    var killRows = (item.kills || []).map(function (k) {
      var charWiki = compItemWiki(k.char);
      var cIcon = k.charIcon
        ? '<img class="compendium-boss-icon" src="' + compEsc(k.charIcon) + '" alt="">'
        : '<span class="compendium-unlock-noicon">?</span>';
      var cName = /^Tainted\b/i.test(k.char || "") ? k.char : k.char;
      var itemIcon = k.itemIcon
        ? '<img class="compendium-boss-item-icon" src="' + compEsc(k.itemIcon) + '" alt="">'
        : '<span class="compendium-unlock-noicon">?</span>';
      return '<div class="compendium-boss-row">' +
        '<a class="compendium-boss-side" href="' + compEsc(charWiki) + '" target="_blank" rel="noopener" title="Apri su wiki.gg: ' + compEsc(k.char) + '">' +
        cIcon + '<span class="compendium-boss-name">' + compEsc(cName) + '</span></a>' +
        '<span class="compendium-boss-arrow">\u2192</span>' +
        '<a class="compendium-boss-item" href="' + compEsc(compItemWiki(k.item)) + '" target="_blank" rel="noopener" title="Apri su wiki.gg: ' + compEsc(k.item) + '">' +
        itemIcon + '<span class="compendium-boss-item-name">' + compEsc(k.item) + '</span></a>' +
        '</div>';
    }).join("");

    var photo = item.photo
      ? '<img class="compendium-boss-detailimg" src="' + compEsc(item.photo) + '" alt="">'
      : "";
    var icon = item.icon
      ? '<img class="compendium-detail-img" src="' + compEsc(item.icon) + '" alt="">'
      : "";
    var dlcChip = item.introduced
      ? '<div class="compendium-detail-chip">' + compEsc(item.introduced) + '</div>'
      : "";
    compDetail.innerHTML =
      '<div class="compendium-detail-head">' + icon +
        '<div class="compendium-detail-titles">' +
          '<h3 class="compendium-detail-name">' + compEsc(item.name) + '</h3>' +
        '</div>' +
      '</div>' +
      '<div class="compendium-detail-meta">' + dlcChip + '</div>' +
      photo +
      (item.location ? '<div class="compendium-unlock"><h4 class="compendium-unlock-title">How to reach</h4>' +
        '<p class="compendium-unlock-text">' + compEsc(item.location) + '</p></div>' : '') +
      (killRows ? '<div class="compendium-unlock"><h4 class="compendium-unlock-title">Class unlocks</h4>' +
        '<div class="compendium-boss-list">' + killRows + '</div></div>' : '') +
      '<a class="compendium-detail-link" href="' + compEsc(item.wiki) + '" target="_blank" rel="noopener">Open in wiki.gg \u2192</a>';
    return;
  }

  var cfg = compSectionCfg();
  var stars = "";
  if (cfg.hasQuality && item.quality != null) {
    for (var s = 0; s < 4; s++) {
      stars += '<span class="comp-star' + (s < (item.quality || 0) ? " on" : "") + '"></span>';
    }
  }

  var meta = "";
  if (cfg.hasType) {
    meta += '<div class="compendium-detail-chip">' + (item.active ? "Active" : "Passive") + '</div>';
  }
  if (cfg.hasDLC) {
    meta += '<div class="compendium-detail-chip">' + compEsc(item.introduced) + '</div>';
  }
  if (stars) {
    meta += '<div class="compendium-detail-quality" title="Quality">' + stars + '<span class="compendium-quality-num">' + item.quality + '/4</span></div>';
  }
  if (item.id != null) {
    meta += '<div class="compendium-detail-id">ID ' + item.id + '</div>';
  }
  if (item.number != null) {
    meta += '<div class="compendium-detail-id">Challenge #' + item.number + '</div>';
  }

  var body = compPoolHtml(item) + compUnlockHtml(item);

  compDetail.innerHTML =
    '<div class="compendium-detail-head">' +
      '<img class="compendium-detail-img" src="' + compEsc(item.icon) + '" alt="">' +
      '<div class="compendium-detail-titles">' +
        '<h3 class="compendium-detail-name">' + compEsc(item.name) + '</h3>' +
        (item.quote ? '<p class="compendium-detail-quote">"' + compEsc(item.quote) + '"</p>' : '') +
      '</div>' +
    '</div>' +
    '<div class="compendium-detail-meta">' + meta + '</div>' +
    (compSection === "unlocks" && compUnlockCat !== "items"
      ? ''
      : '<p class="compendium-detail-desc">' + compEsc(item.description) + '</p>') +
    body +
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
  if (compSection !== "items") return "";
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
  if (compSection === "unlocks") {
    var h = "";
    if (compUnlockCat === "characters") {
      if (item.unlock) {
        h += '<div class="compendium-unlock">' +
          '<h4 class="compendium-unlock-title">How to unlock</h4>' +
          '<p class="compendium-unlock-text">' + compEsc(item.unlock) + '</p></div>';
      }
      if (item.unlockName) {
        h += '<div class="compendium-unlock">' +
          '<h4 class="compendium-unlock-title">Unlock</h4>' +
          '<p class="compendium-unlock-text">' + compEsc(item.unlockName) + '</p></div>';
      }
      if (item.bossUnlocks && item.bossUnlocks.length) {
        h += '<div class="compendium-unlock">' +
          '<h4 class="compendium-unlock-title">Boss unlocks</h4>' +
          '<div class="compendium-boss-list">' +
          item.bossUnlocks.map(function (bu) {
            var bossIcon = bu.boss && bu.boss.icon
              ? '<img class="compendium-boss-icon" src="' + compEsc(bu.boss.icon) + '" alt="">'
              : '<span class="compendium-unlock-noicon">?</span>';
            var itemIcon = bu.itemIcon
              ? '<img class="compendium-boss-item-icon" src="' + compEsc(bu.itemIcon) + '" alt="">'
              : '<span class="compendium-unlock-noicon">?</span>';
            var bossWiki = "https://bindingofisaacrebirth.wiki.gg/wiki/" +
              encodeURIComponent(String(bu.boss.name || "").replace(/ /g, "_"));
            return '<div class="compendium-boss-row">' +
              '<a class="compendium-boss-side" href="' + compEsc(bossWiki) + '" target="_blank" rel="noopener" title="Apri su wiki.gg: ' + compEsc(bu.boss.name) + '">' +
              bossIcon + '<span class="compendium-boss-name">' + compEsc(bu.boss.name) + '</span>' +
              '</a>' +
              '<span class="compendium-boss-arrow">\u2192</span>' +
              '<a class="compendium-boss-item" href="' + compEsc(compItemWiki(bu.item)) + '" target="_blank" rel="noopener" title="Apri su wiki.gg: ' + compEsc(bu.item) + '">' +
              itemIcon + '<span class="compendium-boss-item-name">' + compEsc(bu.item) + '</span>' +
              '</a>' +
              '</div>';
          }).join("") +
          '</div></div>';
      }
      return h;
    }
    if (compUnlockCat === "challenges") {
      if (item.goal) {
        h += '<div class="compendium-unlock">' +
          '<h4 class="compendium-unlock-title">Goal</h4>' +
          '<p class="compendium-unlock-text">' + compEsc(item.goal) + '</p></div>';
      }
      if (item.reward) {
        h += '<div class="compendium-unlock">' +
          '<h4 class="compendium-unlock-title">Reward</h4>' +
          '<p class="compendium-unlock-text">' + compEsc(item.reward) + '</p></div>';
      }
      if (item.requirements) {
        h += '<div class="compendium-unlock">' +
          '<h4 class="compendium-unlock-title">How to unlock</h4>' +
          '<p class="compendium-unlock-text">' + compEsc(item.requirements) + '</p></div>';
      }
      return h;
    }
    if (compUnlockCat === "items") {
      if (!item.unlock) return "";
      var hi = '<div class="compendium-unlock">' +
        '<h4 class="compendium-unlock-title">How to unlock</h4>' +
        '<p class="compendium-unlock-text">' + compEsc(item.unlock.text) + '</p>';
      if (item.unlock.bosses && item.unlock.bosses.length) {
        hi += compUnlockIconList(item.unlock.bosses, "Boss");
      }
      if (item.unlock.characters && item.unlock.characters.length) {
        hi += compUnlockIconList(item.unlock.characters, "Character");
      }
      hi += '</div>';
      return hi;
    }
    return '<div class="compendium-unlock">' +
      '<h4 class="compendium-unlock-title">Requirements</h4>' +
      '<p class="compendium-unlock-text">' + compEsc(item.requirements || item.description) + '</p></div>';
  }
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
  var cfg = compSectionCfg();
  if (compIsUnlocksHub()) {
    compFiltersEl.innerHTML = "";
    compSortSel.innerHTML = '<option value="id">Sort by ID</option><option value="alpha">Alphabetical</option>';
    compSortSel.value = compSort;
    return;
  }

  var typeChips = [
    { value: "all", label: "All" },
    { value: "active", label: "Actives" },
    { value: "passive", label: "Passives" }
  ];
  var dlcs = DLC_ORDER.filter(function (dlc) {
    return compItems.some(function (i) { return i.introduced === dlc; });
  });
  var dlcChips = [{ value: "all", label: "All DLCs" }].concat(
    dlcs.map(function (d) { return { value: d, label: d }; })
  );
  var qualityChips = [{ value: "all", label: "Quality: all" }].concat(
    [4, 3, 2, 1, 0].map(function (v) {
      var count = compItems.filter(function (i) { return (i.quality == null ? 0 : i.quality) === v; }).length;
      return { value: String(v), label: "Q" + v + " (" + count + ")" };
    })
  );
  var poolAll = compSortPools(compPools).map(function (p) {
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
      '<select class="compendium-sort compendium-poolselect" id="compendiumPoolSelect">' +
      '<option value="all">All pools</option>' +
      poolAll.map(function (c) {
        return '<option value="' + c.value + '"' + (compFilterPool === c.value ? " selected" : "") + '>' + c.label + '</option>';
      }).join("") +
      '</select>' +
      '</div>';
  }

  var html = "";
  if (cfg.hasType) html += chipGroup("Type", typeChips, compFilterType, "type");
  if (cfg.hasDLC) html += chipGroup("DLC", dlcChips, compFilterDlc, "dlc");
  if (cfg.hasQuality) html += chipGroup("Quality", qualityChips, compFilterQuality, "quality");
  if (cfg.hasPools) html += poolGroup();
  compFiltersEl.innerHTML = html || '<div class="compendium-chipgroup"></div>';

  compFiltersEl.querySelectorAll(".compendium-chip").forEach(function (chip) {
    var group = chip.closest(".compendium-chipgroup").getAttribute("data-group");
    chip.addEventListener("click", function () {
      var v = chip.getAttribute("data-value");
      if (group === "Type") compFilterType = v;
      else if (group === "DLC") compFilterDlc = v;
      else if (group === "Quality") compFilterQuality = v;
      else if (group === "Pool") compFilterPool = compFilterPool === v ? "all" : v;
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

  var sortHtml = '';
  if (cfg.hasQuality) sortHtml = '<option value="id">Sort by ID</option><option value="alpha">Alphabetical</option><option value="quality">Quality (4 → 0)</option>';
  else if (compSection === "bosses") sortHtml = '<option value="order">Sort by unlock count</option><option value="alpha">Alphabetical</option>';
  else sortHtml = '<option value="id">Sort by ID</option><option value="alpha">Alphabetical</option>';
  compSortSel.innerHTML = sortHtml;
  if (compSortSel.querySelector('option[value="' + compSort + '"]')) {
    compSortSel.value = compSort;
  } else {
    compSortSel.value = compSection === "bosses" ? "order" : "id";
    compSort = compSortSel.value;
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

compTabs.addEventListener("click", function (e) {
  var tab = e.target.closest(".compendium-tab");
  if (!tab) return;
  compSetSection(tab.getAttribute("data-section"));
});

var compBackBtn = document.getElementById("compendiumBack");
if (compBackBtn) {
  compBackBtn.addEventListener("click", function () {
    compOpenUnlocksHub();
  });
}

compList.addEventListener("click", function (e) {
  var tile = e.target.closest(".compendium-hub-tile");
  if (tile) {
    compOpenUnlockCat(tile.getAttribute("data-cat"));
    return;
  }
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
  compRenderTabs();
  compBuildFilters();
  compRender();
}

compInit();

// --- Gallery app ---

var galleryGrid = document.querySelector("#galleryGrid");
var galleryPhotos = typeof window.ISAAC_PHOTOS !== "undefined" && window.ISAAC_PHOTOS
  ? window.ISAAC_PHOTOS
  : [];

function galleryPhotoSrc(file) {
  return "photos/" + encodeURIComponent(file);
}

function galleryRender() {
  if (!galleryGrid) return;
  if (galleryPhotos.length === 0) {
    galleryGrid.innerHTML = '<div class="gallery-empty">No photos yet.\n  Put images in the photos/ folder and run:\n  node tools/build-photos.mjs</div>';
    return;
  }
  galleryGrid.innerHTML = galleryPhotos.map(function (p, i) {
    return '<button class="gallery-tile" data-index="' + i + '" title="' + p.name + '">' +
      '<img class="gallery-tile-img" src="' + galleryPhotoSrc(p.file) + '" alt="' + galleryEsc(p.name) + '" loading="lazy">' +
      '</button>';
  }).join("");
}

function galleryEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

var galleryViewer = null;
var galleryViewerIndex = 0;

function galleryOpenViewer(index) {
  if (!galleryPhotos.length) return;
  galleryViewerIndex = (index + galleryPhotos.length) % galleryPhotos.length;
  if (!galleryViewer) {
    galleryViewer = document.createElement("div");
    galleryViewer.className = "gallery-viewer";
    galleryViewer.innerHTML =
      '<button class="gallery-viewer-back" title="Torna alla griglia">' +
        '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" stroke="none"/></svg>' +
      '</button>' +
      '<button class="gallery-viewer-arrow prev" title="Precedente">' +
        '<svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" stroke="none"/></svg>' +
      '</button>' +
      '<img class="gallery-viewer-img" alt="">' +
      '<button class="gallery-viewer-arrow next" title="Successiva">' +
        '<svg viewBox="0 0 24 24"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" stroke="none"/></svg>' +
      '</button>';
    galleryGrid.closest(".window").appendChild(galleryViewer);
    galleryViewer.querySelector(".gallery-viewer-back").addEventListener("click", function () {
      galleryViewer.classList.remove("open");
    });
    galleryViewer.querySelector(".gallery-viewer-arrow.prev").addEventListener("click", function () {
      galleryOpenViewer(galleryViewerIndex - 1);
    });
    galleryViewer.querySelector(".gallery-viewer-arrow.next").addEventListener("click", function () {
      galleryOpenViewer(galleryViewerIndex + 1);
    });
  }
  galleryViewer.querySelector(".gallery-viewer-img").src = galleryPhotoSrc(galleryPhotos[galleryViewerIndex].file);
  galleryViewer.classList.add("open");
}

galleryGrid.addEventListener("dblclick", function (e) {
  var tile = e.target.closest(".gallery-tile");
  if (!tile) return;
  galleryOpenViewer(parseInt(tile.getAttribute("data-index"), 10));
});

galleryRender();

// --- Themes app ---

var themesKey = "isaacos_theme";
var themesCustomKey = "isaacos_custom_theme";
var wallpaperKey = "isaacos_wallpaper";
var savedThemesKey = "isaacos_saved_themes";

var themesList = typeof window.ISAAC_THEMES !== "undefined" && window.ISAAC_THEMES
  ? window.ISAAC_THEMES
  : [];
var wallpaperList = typeof window.ISAAC_WALLPAPERS !== "undefined" && window.ISAAC_WALLPAPERS
  ? window.ISAAC_WALLPAPERS
  : [];

var themesColors = document.querySelector("#themesColors");
var themesWallpaper = document.querySelector("#themesWallpaper");
var themesTabs = document.querySelectorAll(".themes-tab");
var themesPresetChips = document.querySelector("#themesPresetChips");
var themesSavedChips = document.querySelector("#themesSavedChips");
var themesSliders = document.querySelector("#themesSliders");
var themesBgSliders = document.querySelector("#themesBgSliders");
var themesSaveBtn = document.querySelector("#themesSaveBtn");
var themesSaveBox = document.querySelector("#themesSaveBox");
var themesName = document.querySelector("#themesName");
var themesConfirmSave = document.querySelector("#themesConfirmSave");
var themesRandom = document.querySelector("#themesRandom");
var themesReset = document.querySelector("#themesReset");
var themesWallpaperGrid = document.querySelector("#themesWallpaperGrid");

var currentColors = null;
var currentSource = "";
var customBgKey = "isaacos_custom_bg";
var currentBg = null;

function themesWallpaperSrc(file) {
  return "wallpapers/" + encodeURIComponent(file);
}

function applyThemeVars(colors) {
  if (!colors) return;
  Object.keys(colors).forEach(function (name) {
    document.documentElement.style.setProperty(name, colors[name]);
  });
}

function applyWallpaper(file) {
  if (!file) {
    document.documentElement.style.removeProperty("--wallpaper");
    return;
  }
  document.documentElement.style.setProperty("--wallpaper", 'url("' + themesWallpaperSrc(file).replace(/"/g, "%22") + '")');
}

function hexToRgb(hex) {
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
  if (!m) return { r: 105, g: 14, b: 14 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgbToHsl(color) {
  var r = color.r / 255, g = color.g / 255, b = color.b / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max === min) {
    h = 0;
    s = 0;
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      default: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function hslToRgb(h, s, l) {
  s = s / 100;
  l = l / 100;
  var c = (1 - Math.abs(2 * l - 1)) * s;
  var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  var m = l - c / 2;
  var r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  function ch(v) { return Math.round((v + m) * 255); }
  return { r: ch(r), g: ch(g), b: ch(b) };
}

function rgbToHex(color) {
  function pad(v) { return ("0" + v.toString(16)).slice(-2); }
  return "#" + pad(color.r) + pad(color.g) + pad(color.b);
}

function accentColorsFromHsl(h, s, l) {
  return {
    "--blood": rgbToHex(hslToRgb(h, s, l)),
    "--blood-hover": rgbToHex(hslToRgb(h, Math.min(100, s + 10), Math.min(100, l + 8))),
    "--blood-deep": rgbToHex(hslToRgb(h, Math.max(0, s - 4), Math.max(0, l - 10))),
    "--blood-dark": rgbToHex(hslToRgb(h, Math.max(0, s - 8), Math.max(0, l - 16)))
  };
}

function bgColorsFromHsl(h, s, l) {
  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  return {
    "--ui-bg": rgbToHex(hslToRgb(h, clamp(s), clamp(l))),
    "--ui-panel": rgbToHex(hslToRgb(h, clamp(s * 0.7), clamp(l * 0.62))),
    "--ui-card": rgbToHex(hslToRgb(h, clamp(s * 1.2), clamp(l * 1.4))),
    "--ui-card-hover": rgbToHex(hslToRgb(h, clamp(s * 1.4), clamp(l * 1.9)))
  };
}

function setSliderValue(name, value) {
  var input = themesSliders.querySelector('input[data-slider="' + name + '"]');
  if (!input) return;
  input.value = value;
  var label = themesSliders.querySelector('[data-slider-val="' + name + '"]');
  if (label) label.textContent = value;
}

function sliderFromColors(colors) {
  var hsl = rgbToHsl(hexToRgb(colors["--blood"]));
  setSliderValue("hue", hsl.h);
  setSliderValue("sat", hsl.s);
  setSliderValue("light", hsl.l);
}

function themesBuildSliders() {
  themesSliders.innerHTML =
    '<div class="slider-row">' +
      '<span class="slider-label">Tonalità</span>' +
      '<input type="range" min="0" max="360" value="0" data-slider="hue">' +
      '<span class="slider-value" data-slider-val="hue">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Saturazione</span>' +
      '<input type="range" min="0" max="100" value="0" data-slider="sat">' +
      '<span class="slider-value" data-slider-val="sat">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Luminosità</span>' +
      '<input type="range" min="0" max="100" value="0" data-slider="light">' +
      '<span class="slider-value" data-slider-val="light">0</span>' +
    '</div>';

  themesSliders.querySelectorAll("input[data-slider]").forEach(function (input) {
    input.addEventListener("input", function () {
      var h = parseInt(themesSliders.querySelector('input[data-slider="hue"]').value, 10);
      var s = parseInt(themesSliders.querySelector('input[data-slider="sat"]').value, 10);
      var l = parseInt(themesSliders.querySelector('input[data-slider="light"]').value, 10);
      setSliderValue("hue", h);
      setSliderValue("sat", s);
      setSliderValue("light", l);
      currentColors = accentColorsFromHsl(h, s, l);
      currentSource = "custom";
      applyThemeVars(currentColors);
      localStorage.setItem(themesKey, "custom");
      localStorage.setItem(themesCustomKey, JSON.stringify(currentColors));
      themeRenderChips();
    });
  });
}

function themesBuildBgSliders() {
  if (!themesBgSliders) return;
  themesBgSliders.innerHTML =
    '<div class="slider-row">' +
      '<span class="slider-label">Tonalità</span>' +
      '<input type="range" min="0" max="360" value="0" data-bgslider="hue">' +
      '<span class="slider-value" data-bgslider-val="hue">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Saturazione</span>' +
      '<input type="range" min="0" max="100" value="0" data-bgslider="sat">' +
      '<span class="slider-value" data-bgslider-val="sat">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Luminosità</span>' +
      '<input type="range" min="0" max="100" value="0" data-bgslider="light">' +
      '<span class="slider-value" data-bgslider-val="light">0</span>' +
    '</div>';

  function setBgSliderValue(name, value) {
    var input = themesBgSliders.querySelector('input[data-bgslider="' + name + '"]');
    if (!input) return;
    input.value = value;
    var label = themesBgSliders.querySelector('[data-bgslider-val="' + name + '"]');
    if (label) label.textContent = value;
  }

  function bgFromColors(uiColors) {
    var hsl = rgbToHsl(hexToRgb(uiColors["--ui-bg"]));
    setBgSliderValue("hue", hsl.h);
    setBgSliderValue("sat", hsl.s);
    setBgSliderValue("light", hsl.l);
  }

  themesBgSliders.querySelectorAll("input[data-bgslider]").forEach(function (input) {
    input.addEventListener("input", function () {
      var h = parseInt(themesBgSliders.querySelector('input[data-bgslider="hue"]').value, 10);
      var s = parseInt(themesBgSliders.querySelector('input[data-bgslider="sat"]').value, 10);
      var l = parseInt(themesBgSliders.querySelector('input[data-bgslider="light"]').value, 10);
      setBgSliderValue("hue", h);
      setBgSliderValue("sat", s);
      setBgSliderValue("light", l);
      currentBg = bgColorsFromHsl(h, s, l);
      applyThemeVars(currentBg);
      localStorage.setItem(customBgKey, JSON.stringify(currentBg));
    });
  });
}

function themesSavedList() {
  try {
    var raw = localStorage.getItem(savedThemesKey);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function themesGetSavedColors(id) {
  var list = themesSavedList();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function themeRenderChips() {
  if (!themesPresetChips || !themesSavedChips) return;
  var current = localStorage.getItem(themesKey) || "isaac";
  themesPresetChips.innerHTML = themesList.map(function (t) {
    return '<button class="theme-card' + (t.id === current ? " active" : "") + '" data-theme="' + t.id + '">' +
      '<div class="theme-swatch" style="background: linear-gradient(135deg, ' + (t.colors["--blood-hover"] || t.colors["--blood"]) + ', ' + (t.colors["--blood-dark"] || t.colors["--blood"]) + ');"></div>' +
      '<span class="theme-name">' + galleryEsc(t.name) + '</span>' +
      '</button>';
  }).join("");

  var saved = themesSavedList();
  themesSavedChips.innerHTML = saved.length
    ? saved.map(function (t) {
        return '<button class="theme-card saved" data-saved="' + t.id + '">' +
          '<div class="theme-swatch" style="background: linear-gradient(135deg, ' + (t.colors["--blood-hover"] || t.colors["--blood"]) + ', ' + (t.colors["--blood-dark"] || t.colors["--blood"]) + ');"></div>' +
          '<span class="theme-name">' + galleryEsc(t.name) + '</span>' +
          '</button>';
      }).join("")
    : '<span style="font-size:12px;color:rgba(232,213,168,0.4);">Nessun tema salvato</span>';

  themesPresetChips.querySelectorAll(".theme-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var id = card.getAttribute("data-theme");
      var theme = themesList.filter(function (t) { return t.id === id; })[0];
      if (!theme) return;
      applyThemeVars(theme.colors);
      currentColors = theme.colors;
      currentSource = "preset";
      localStorage.setItem(themesKey, id);
      localStorage.removeItem(themesCustomKey);
      sliderFromColors(theme.colors);
      themeRenderChips();
    });
  });

  themesSavedChips.querySelectorAll(".theme-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var saved = themesGetSavedColors(card.getAttribute("data-saved"));
      if (!saved) return;
      applyThemeVars(saved.colors);
      if (saved.bg) {
        currentBg = saved.bg;
        applyThemeVars(currentBg);
        localStorage.setItem(customBgKey, JSON.stringify(currentBg));
      }
      currentColors = saved.colors;
      currentSource = "saved";
      localStorage.setItem(themesKey, "custom");
      localStorage.setItem(themesCustomKey, JSON.stringify(saved.colors));
      sliderFromColors(saved.colors);
      themeRenderChips();
    });
  });
}

function themeRenderWallpaper() {
  if (!themesWallpaperGrid) return;
  var current = localStorage.getItem(wallpaperKey) || "";
  var cards = wallpaperList.map(function (w) {
    return { file: w.file, name: w.name, preset: false };
  });
  themesWallpaperGrid.innerHTML = cards.map(function (w) {
    var img = '<img class="wallpaper-thumb" src="' + themesWallpaperSrc(w.file) + '" alt="">';
    return '<button class="wallpaper-card' + (w.file === current ? " active" : "") + '" data-file="' + w.file + '">' +
      img +
      '<span class="wallpaper-name">' + galleryEsc(w.name) + '</span>' +
      '</button>';
  }).join("");
  themesWallpaperGrid.querySelectorAll(".wallpaper-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var file = card.getAttribute("data-file");
      applyWallpaper(file);
      localStorage.setItem(wallpaperKey, file);
      themeRenderWallpaper();
    });
  });
}

if (themesTabs && themesTabs.length && themesColors && themesWallpaper) {
  themesTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      themesTabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      var which = tab.getAttribute("data-tab");
      themesColors.classList.toggle("visible", which === "colors");
      themesWallpaper.classList.toggle("visible", which === "wallpaper");
    });
  });
}

if (themesRandom) {
  themesRandom.addEventListener("click", function () {
    var next = themesList[Math.floor(Math.random() * themesList.length)];
    applyThemeVars(next.colors);
    currentColors = next.colors;
    currentSource = "preset";
    localStorage.setItem(themesKey, next.id);
    localStorage.removeItem(themesCustomKey);
    sliderFromColors(next.colors);
    themeRenderChips();

    var accentH = rgbToHsl(hexToRgb(next.colors["--blood"])).h;
    var bgH = Math.floor(Math.random() * 360);
    if (Math.abs(bgH - accentH) < 40) bgH = (bgH + 180) % 360;
    var bgSat = Math.floor(Math.random() * 35) + 8;
    var bgLight = Math.floor(Math.random() * 16) + 12;
    var bg = bgColorsFromHsl(bgH, bgSat, bgLight);
    applyThemeVars(bg);
    currentBg = bg;
    localStorage.setItem(customBgKey, JSON.stringify(bg));
    themesSeedBgSliders();
  });
}

if (themesReset) {
  themesReset.addEventListener("click", function () {
    var fallback = { "--blood": "#690e0e", "--blood-hover": "#7a1010", "--blood-dark": "#230505", "--blood-deep": "#6e0808" };
    applyThemeVars(fallback);
    currentColors = fallback;
    currentSource = "preset";
    localStorage.setItem(themesKey, "isaac");
    localStorage.removeItem(themesCustomKey);
    sliderFromColors(fallback);
    var bgDefault = { "--ui-bg": "#1c1410", "--ui-panel": "#14100c", "--ui-card": "#241a14", "--ui-card-hover": "#33241a" };
    applyThemeVars(bgDefault);
    currentBg = bgDefault;
    localStorage.removeItem(customBgKey);
    themesSeedBgSliders();
    themeRenderChips();
  });
}

if (themesSaveBtn) {
  themesSaveBtn.addEventListener("click", function () {
    themesSaveBox.style.display = themesSaveBox.style.display === "none" ? "flex" : "none";
    if (themesSaveBox.style.display === "flex") themesName.focus();
  });
}

if (themesConfirmSave) {
  themesConfirmSave.addEventListener("click", function () {
    var name = themesName.value.trim();
    if (!name || !currentColors) {
      if (!name) themesName.focus();
      return;
    }
    var list = themesSavedList();
    list.push({ id: "saved-" + Date.now(), name: name, colors: currentColors, bg: currentBg });
    localStorage.setItem(savedThemesKey, JSON.stringify(list));
    themesName.value = "";
    themesSaveBox.style.display = "none";
    themeRenderChips();
  });
}

themesBuildSliders();
themesBuildBgSliders();

function themesSeedBgSliders() {
  if (!themesBgSliders) return;
  var raw = localStorage.getItem(customBgKey);
  var base = null;
  if (raw) {
    try { base = JSON.parse(raw); } catch (e) { base = null; }
  }
  if (!base) {
    base = { "--ui-bg": "#1c1410", "--ui-panel": "#14100c", "--ui-card": "#241a14", "--ui-card-hover": "#33241a" };
  }
  var hsl = rgbToHsl(hexToRgb(base["--ui-bg"]));
  themesBgSliders.querySelector('input[data-bgslider="hue"]').value = hsl.h;
  themesBgSliders.querySelector('[data-bgslider-val="hue"]').textContent = hsl.h;
  themesBgSliders.querySelector('input[data-bgslider="sat"]').value = hsl.s;
  themesBgSliders.querySelector('[data-bgslider-val="sat"]').textContent = hsl.s;
  themesBgSliders.querySelector('input[data-bgslider="light"]').value = hsl.l;
  themesBgSliders.querySelector('[data-bgslider-val="light"]').textContent = hsl.l;
}

function themeInit() {
  var saved = localStorage.getItem(themesKey) || "";
  var customRaw = localStorage.getItem(themesCustomKey);
  if (saved === "custom" && customRaw) {
    try {
      currentColors = JSON.parse(customRaw);
      applyThemeVars(currentColors);
      currentSource = "custom";
      sliderFromColors(currentColors);
    } catch (e) {}
  } else {
    var theme = themesList.filter(function (t) { return t.id === saved; })[0];
    if (!theme) theme = themesList[0];
    if (theme) {
      currentColors = theme.colors;
      currentSource = "preset";
      applyThemeVars(theme.colors);
      sliderFromColors(theme.colors);
    }
  }
  var savedBg = localStorage.getItem(customBgKey);
  if (savedBg) {
    try {
      currentBg = JSON.parse(savedBg);
      applyThemeVars(currentBg);
    } catch (e) {}
  }
  themesSeedBgSliders();
  var savedWall = localStorage.getItem(wallpaperKey) || "";
  if (savedWall) applyWallpaper(savedWall);
}

themeInit();
themeRenderChips();
themeRenderWallpaper();
