function updateTime() {
  var now = new Date();
  var day = now.getDate();
  var month = now.toLocaleDateString("en-EN", { month: "long" });
  var year = now.getFullYear();
  var p = function (n) { return n < 10 ? "0" + n : "" + n; };
  var date = day + " " + month + " " + year;
  var time = p(now.getHours()) + ":" + p(now.getMinutes());
  document.querySelector("#timeElement").innerHTML = date + " | " + time;
}
setInterval(updateTime, 1000);
updateTime();


var osContainer = document.getElementById("os");

var osBaseKey = "isaacos_os_base";
var osBaseW = 1280;
var osBaseH = 720;

function initOsBase() {
  try {
    var saved = localStorage.getItem(osBaseKey);
    if (saved) {
      var parts = saved.split("x");
      if (parts.length === 2 && parseFloat(parts[0]) > 0 && parseFloat(parts[1]) > 0) {
        osBaseW = parseFloat(parts[0]);
        osBaseH = parseFloat(parts[1]);
      }
    } else {
      osBaseW = window.innerWidth;
      osBaseH = window.innerHeight;
      localStorage.setItem(osBaseKey, osBaseW + "x" + osBaseH);
    }
  } catch (e) {}
  if (osContainer) {
    osContainer.style.width = osBaseW + "px";
    osContainer.style.height = osBaseH + "px";
  }
}

function fitOsToScreen() {
  if (!osContainer) return;

  var scaleX = window.innerWidth / osBaseW;
  var scaleY = window.innerHeight / osBaseH;

  osContainer.style.transform = "scale(" + scaleX + ", " + scaleY + ")";
  osContainer.style.left = "0px";
  osContainer.style.top = "0px";
}

function getOsScale() {
  if (!osContainer) return 1;
  var match = osContainer.style.transform.match(/scale\(([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}

window.addEventListener("resize", fitOsToScreen);
initOsBase();
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
    var osRect = osContainer.getBoundingClientRect();
    var rect = element.getBoundingClientRect();
    var vx = (rect.left - osRect.left) / s;
    var vy = (rect.top - osRect.top) / s;
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
  var ids = ["welcome", "notes", "contacts", "browser", "calculator", "compendium", "gallery", "music", "themes", "settings", "paint", "widgets"];

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
    var parent = icon.offsetParent || osContainer;
    var parentRect = parent.getBoundingClientRect();
    var s = getOsScale();
    var localX = (e.clientX - parentRect.left) / s;
    var localY = (e.clientY - parentRect.top) / s;
    startX = e.clientX;
    startY = e.clientY;
    offsetX = localX - icon.offsetLeft;
    offsetY = localY - icon.offsetTop;
    dragging = true;
    moved = false;

    document.onmousemove = function (ev) {
      if (!dragging) return;
      ev = ev || window.event;
      ev.preventDefault();
      var x = ((ev.clientX - parentRect.left) / s) - offsetX;
      var y = ((ev.clientY - parentRect.top) / s) - offsetY;
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

(function resetStaleIconPositions() {
  try {
    if (!localStorage.getItem("isaacos_icon_positions_v2")) {
      localStorage.removeItem(iconPositionsKey);
      localStorage.setItem("isaacos_icon_positions_v2", "1");
    }
  } catch (e) {}
})();

(function migrateMusicIconPosition() {
  try {
    if (localStorage.getItem("isaacos_icon_positions_music_v1")) return;
    var saved = localStorage.getItem(iconPositionsKey);
    if (saved) {
      var positions = JSON.parse(saved);
      if (positions.musicicon) {
        delete positions.musicicon;
        localStorage.setItem(iconPositionsKey, JSON.stringify(positions));
      }
    }
    localStorage.setItem("isaacos_icon_positions_music_v1", "1");
  } catch (e) {}
})();

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
var musicScreen = initializeApp("music");
var themesScreen = initializeApp("themes");
var settingsScreen = initializeApp("settings");
var paintScreen = initializeApp("paint");
var widgetsScreen = initializeApp("widgets");


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
      <span class="item-trash" title="Delete note">🗑</span>
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
  if (compSection === "recommended") {
    return { label: "Recommended", hasType: false, hasQuality: false, hasDLC: false, hasPools: false, search: [] };
  }
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
  if (compSection === "recommended") return window.ISAAC_RECOMMENDED || [];
  if (compSection === "unlocks") return compUnlockCat ? compUnlockCatData(compUnlockCat) : [];
  return window.ISAAC_ITEMS || [];
}

var recItemsByName = {};
var recChallengesByNum = {};
(function buildRecLookups() {
  (window.ISAAC_RECOMMENDED || []).forEach(function (r) {
    if (r.type === "item") {
      if (r.match) recItemsByName[r.match] = true;
    } else if (r.type === "challenge") {
      recChallengesByNum[r.challengeNumber] = true;
    }
  });
})();

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
  compTabs.innerHTML = [["items", "Items"], ["trinkets", "Trinkets"], ["unlocks", "Unlocks"], ["bosses", "Bosses"], ["recommended", "Recommended"]].map(function (t) {
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
  if (compSection === "recommended") {
    compRenderRecommended();
    return;
  }
  if (compIsUnlocksHub()) {
    compRenderHub();
    return;
  }
  var list = compSortItems(compFiltered());

  var isChars = compSection === "unlocks" && compUnlockCat === "characters";
  var isBosses = compSection === "bosses";
  compList.classList.toggle("compendium-list-big", isChars);
  compList.classList.toggle("compendium-list-boss", isBosses);
  compList.classList.remove("compendium-list-wide");

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
      var isItemList = compSection === "items" || (compSection === "unlocks" && compUnlockCat === "items");
      var isChallengeList = compSection === "unlocks" && compUnlockCat === "challenges";
      var recBadge = (isItemList && recItemsByName[item.name]) || (isChallengeList && recChallengesByNum[item.number])
        ? '<img class="compendium-card-badge" src="img/tbumb-removebg-preview.png" alt="Recommended">'
        : "";
      return '<button class="compendium-card' + (isChars ? " compendium-card-big" : "") + (compSelectedKey === item.key ? " selected" : "") + '" data-key="' + compEsc(item.key) + '">' +
        img +
        recBadge +
        '<span class="compendium-card-name">' + compEsc(item.name) + '</span>' +
        q + num + extra +
        '</button>';
    }).join("");
  }

  compRenderDetail();
}

function compRenderRecommended() {
  var recs = window.ISAAC_RECOMMENDED || [];
  compList.classList.remove("compendium-list-big", "compendium-list-boss");
  compList.classList.add("compendium-list-wide");
  var html = "";
  [["characters", "Characters"], ["challenges", "Challenges"], ["tainted", "Tainted"]].forEach(function (g) {
    var list = recs.filter(function (r) {
      if (g[0] === "challenges") return r.type === "challenge";
      return r.type === "item" && (g[0] === "tainted" ? r.tainted : !r.tainted);
    });
    if (!list.length) return;
    html += '<div class="compendium-recommend-group">' + g[1] + ' (' + list.length + ')</div>';
    html += '<div class="compendium-boss-list">' + list.map(compRecommendRow).join("") + '</div>';
  });
  compList.innerHTML = html || '<div class="compendium-empty">No recommended unlocks.</div>';
  compDetail.innerHTML = '<div class="compendium-detail-empty">Recommended unlocks worth pursuing.</div>';
}

function compRecommendRow(r) {
  var icon = function (src, cls) {
    return src
      ? '<img class="' + cls + '" src="' + compEsc(src) + '" alt="">'
      : '<span class="compendium-unlock-noicon">?</span>';
  };
  var arrow = '<span class="compendium-boss-arrow">\u2192</span>';
  if (r.type === "challenge") {
    return '<div class="compendium-boss-row">' +
      '<a class="compendium-boss-side" href="' + compEsc(compItemWiki(r.challenge)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(r.challenge) + '">' +
      icon(r.challengeIcon, "compendium-boss-icon") +
      '<span class="compendium-boss-name">Challenge #' + r.challengeNumber + ': ' + compEsc(r.challenge) + '</span></a>' +
      arrow +
      '<a class="compendium-boss-item" href="' + compEsc(compItemWiki(r.item)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(r.item) + '">' +
      icon(r.itemIcon, "compendium-boss-item-icon") +
      '<span class="compendium-boss-item-name">' + compEsc(r.item) + '</span></a>' +
      '</div>';
  }
  return '<div class="compendium-boss-row">' +
    '<a class="compendium-boss-side" href="' + compEsc(compItemWiki(r.character)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(r.character) + '">' +
    icon(r.characterIcon, "compendium-boss-icon") +
    '<span class="compendium-boss-name">' + compEsc(r.character) + '</span></a>' +
    arrow +
    '<a class="compendium-boss-side" href="' + compEsc(compItemWiki(r.boss)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(r.boss) + '">' +
    icon(r.bossIcon, "compendium-boss-item-icon") +
    '<span class="compendium-boss-name">' + compEsc(r.boss) + '</span></a>' +
    arrow +
    '<a class="compendium-boss-item" href="' + compEsc(compItemWiki(r.item)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(r.item) + '">' +
    icon(r.itemIcon, "compendium-boss-item-icon") +
    '<span class="compendium-boss-item-name">' + compEsc(r.item) + '</span></a>' +
    '</div>';
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
      var itemIcon = k.itemIcon
        ? '<img class="compendium-boss-item-icon" src="' + compEsc(k.itemIcon) + '" alt="">'
        : '<span class="compendium-unlock-noicon">?</span>';
      return '<div class="compendium-boss-row">' +
        '<a class="compendium-boss-side" href="' + compEsc(charWiki) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(k.char) + '">' +
        cIcon +         '<span class="compendium-boss-name">' + compEsc(k.char) + '</span></a>' +
        '<span class="compendium-boss-arrow">\u2192</span>' +
        '<a class="compendium-boss-item" href="' + compEsc(compItemWiki(k.item)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(k.item) + '">' +
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
            return '<div class="compendium-boss-row">' +
              '<a class="compendium-boss-side" href="' + compEsc(compItemWiki(bu.boss.name)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(bu.boss.name) + '">' +
              bossIcon + '<span class="compendium-boss-name">' + compEsc(bu.boss.name) + '</span>' +
              '</a>' +
              '<span class="compendium-boss-arrow">\u2192</span>' +
              '<a class="compendium-boss-item" href="' + compEsc(compItemWiki(bu.item)) + '" target="_blank" rel="noopener" title="Open on wiki.gg: ' + compEsc(bu.item) + '">' +
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
    galleryGrid.innerHTML = '<div class="gallery-empty">No photos yet.\n  Put images in the photos/ folder and run:\n  node tools/build-images.mjs photos</div>';
    return;
  }
  galleryGrid.innerHTML = galleryPhotos.map(function (p, i) {
    return '<button class="gallery-tile" data-index="' + i + '" title="' + p.name + '">' +
      '<img class="gallery-tile-img" src="' + galleryPhotoSrc(p.file) + '" alt="' + compEsc(p.name) + '" loading="lazy">' +
      '</button>';
  }).join("");
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
      '<button class="gallery-viewer-back" title="Back to grid">' +
        '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" stroke="none"/></svg>' +
      '</button>' +
      '<button class="gallery-viewer-arrow prev" title="Previous">' +
        '<svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" stroke="none"/></svg>' +
      '</button>' +
      '<img class="gallery-viewer-img" alt="">' +
      '<button class="gallery-viewer-arrow next" title="Next">' +
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
  ? window.ISAAC_WALLPAPERS.slice().sort(function (a, b) {
      return (b.file === "default-wall.png" ? 1 : 0) - (a.file === "default-wall.png" ? 1 : 0);
    })
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
var customBgKey = "isaacos_custom_bg";
var currentBg = null;
var bgDefault = { "--ui-bg": "#1c1410", "--ui-panel": "#14100c", "--ui-card": "#241a14", "--ui-card-hover": "#33241a" };

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
  document.documentElement.setAttribute("data-wall", file === "default-wall.png" ? "sheol" : "");
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
      '<span class="slider-label">Hue</span>' +
      '<input type="range" min="0" max="360" value="0" data-slider="hue">' +
      '<span class="slider-value" data-slider-val="hue">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Saturation</span>' +
      '<input type="range" min="0" max="100" value="0" data-slider="sat">' +
      '<span class="slider-value" data-slider-val="sat">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Lightness</span>' +
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
      '<span class="slider-label">Hue</span>' +
      '<input type="range" min="0" max="360" value="0" data-bgslider="hue">' +
      '<span class="slider-value" data-bgslider-val="hue">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Saturation</span>' +
      '<input type="range" min="0" max="100" value="0" data-bgslider="sat">' +
      '<span class="slider-value" data-bgslider-val="sat">0</span>' +
    '</div>' +
    '<div class="slider-row">' +
      '<span class="slider-label">Lightness</span>' +
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
  var custom = currentColors || (themesList[0] ? themesList[0].colors : {});
  themesPresetChips.innerHTML =
    themesList.map(function (t) {
      return '<button class="theme-card' + (t.id === current ? " active" : "") + '" data-theme="' + t.id + '">' +
        '<div class="theme-swatch" style="background: linear-gradient(135deg, ' + (t.colors["--blood-hover"] || t.colors["--blood"]) + ', ' + (t.colors["--blood-dark"] || t.colors["--blood"]) + ');"></div>' +
        '<span class="theme-name">' + compEsc(t.name) + '</span>' +
        '</button>';
    }).join("") +
    '<button class="theme-card' + (current === "custom" ? " active" : "") + '" data-theme="custom">' +
      '<div class="theme-swatch" style="background: linear-gradient(135deg, ' + (custom["--blood-hover"] || custom["--blood"]) + ', ' + (custom["--blood-dark"] || custom["--blood"]) + ');"></div>' +
      '<span class="theme-name">Custom</span>' +
    '</button>';

  var saved = themesSavedList();
  themesSavedChips.innerHTML = saved.length
    ? saved.map(function (t) {
        return '<button class="theme-card saved" data-saved="' + t.id + '">' +
          '<div class="theme-swatch" style="background: linear-gradient(135deg, ' + (t.colors["--blood-hover"] || t.colors["--blood"]) + ', ' + (t.colors["--blood-dark"] || t.colors["--blood"]) + ');"></div>' +
          '<span class="theme-name">' + compEsc(t.name) + '</span>' +
          '</button>';
      }).join("")
    : '<span style="font-size:12px;color:rgba(232,213,168,0.4);">No saved themes</span>';

  themesPresetChips.querySelectorAll(".theme-card").forEach(function (card) {
    card.addEventListener("click", function () {
      var id = card.getAttribute("data-theme");
      if (id === "custom") {
        applyThemeVars(currentColors);
        sliderFromColors(currentColors);
        localStorage.setItem(themesKey, "custom");
        themeRenderChips();
        return;
      }
      var theme = themesList.find(function (t) { return t.id === id; });
      if (!theme) return;
      applyThemeVars(theme.colors);
      currentColors = theme.colors;
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
  themesWallpaperGrid.innerHTML = wallpaperList.map(function (w) {
    var img = '<img class="wallpaper-thumb" src="' + themesWallpaperSrc(w.file) + '" alt="">';
    return '<button class="wallpaper-card' + (w.file === current ? " active" : "") + '" data-file="' + w.file + '">' +
      img +
      '<span class="wallpaper-name">' + compEsc(w.name) + '</span>' +
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
    var h = Math.floor(Math.random() * 360);
    var s = Math.floor(Math.random() * 46) + 40;
    var l = Math.floor(Math.random() * 22) + 14;
    var colors = accentColorsFromHsl(h, s, l);
    applyThemeVars(colors);
    currentColors = colors;
    localStorage.setItem(themesKey, "custom");
    localStorage.setItem(themesCustomKey, JSON.stringify(colors));
    sliderFromColors(colors);
    themeRenderChips();

    var bgH = Math.floor(Math.random() * 360);
    if (Math.abs(bgH - h) < 40) bgH = (bgH + 180) % 360;
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
    localStorage.setItem(themesKey, "isaac");
    localStorage.removeItem(themesCustomKey);
    sliderFromColors(fallback);
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
    base = bgDefault;
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
      sliderFromColors(currentColors);
    } catch (e) {}
  } else {
    var theme = themesList.find(function (t) { return t.id === saved; });
    if (!theme) theme = themesList[0];
    if (theme) {
      currentColors = theme.colors;
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

var musicAudio = document.querySelector("#musicAudio");
var musicQueue = [];
var musicIndex = -1;
var musicShuffleOn = false;
var musicRepeatMode = 0;
var musicVolumeKey = "isaacos_music_volume";
var musicPrefsKey = "isaacos_music_prefs";

document.querySelector("#musicclose").addEventListener("click", function () {
  try { musicAudio.pause(); } catch (e) {}
});

try {
  var musicSavedVol = localStorage.getItem(musicVolumeKey);
  if (musicSavedVol !== null) musicAudio.volume = Math.min(1, Math.max(0, parseFloat(musicSavedVol) || 1));
} catch (e) {}
try {
  var musicSavedPrefs = JSON.parse(localStorage.getItem(musicPrefsKey) || "{}");
  musicShuffleOn = !!musicSavedPrefs.shuffle;
  musicRepeatMode = musicSavedPrefs.repeat || 0;
} catch (e) {}

function musicSavePrefs() {
  try { localStorage.setItem(musicPrefsKey, JSON.stringify({ shuffle: musicShuffleOn, repeat: musicRepeatMode })); } catch (e) {}
}
function musicSaveVolume() {
  try { localStorage.setItem(musicVolumeKey, String(musicAudio.volume)); } catch (e) {}
}

function musicFormat(t) {
  if (!isFinite(t) || t < 0) return "0:00";
  var m = Math.floor(t / 60);
  var s = Math.floor(t % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function musicTrackName(fileName) {
  return String(fileName).replace(/\.[^.]+$/, "").replace(/_/g, " ");
}

function musicRenderQueue() {
  var el = document.querySelector("#musicQueue");
  el.innerHTML = "";
  musicQueue.forEach(function (track, i) {
    var card = document.createElement("button");
    card.type = "button";
    var playable = !!track.url;
    card.className = "music-track" + (i === musicIndex ? " playing" : "") + (playable ? "" : " pending");
    card.title = playable ? "Play " + track.name : "Add your local file to play this";
    card.innerHTML =
      '<span class="music-track-num">' + (i + 1) + "</span>" +
      '<span class="music-track-name">' + track.name + (track.artist ? ' <span class="music-track-artist">' + track.artist + "</span>" : "") + "</span>" +
      '<span class="music-track-dur">' + (playable ? musicFormat(track.duration) : "♪") + "</span>";
    card.addEventListener("click", function () {
      if (!track.url) {
        musicHintAdd();
        return;
      }
      musicPlayIndex(i);
    });
    el.appendChild(card);
  });
  document.querySelector("#musicDrop").style.display = musicQueue.length ? "none" : "flex";
}

function musicPlayIndex(i) {
  if (i < 0 || i >= musicQueue.length) return;
  musicIndex = i;
  var track = musicQueue[i];
  if (!track.url) return;
  musicAudio.src = track.url;
  musicAudio.play().catch(function () {});
  musicRenderQueue();
  document.querySelector("#musicTitle").textContent = track.name;
  document.querySelector("#musicArtist").textContent = track.artist || "Track " + (i + 1) + " of " + musicQueue.length;
  musicUpdatePlayBtn();
}

function musicUpdatePlayBtn() {
  var btn = document.querySelector("#musicPlay");
  btn.textContent = musicAudio.paused ? "▶" : "❚❚";
  btn.title = musicAudio.paused ? "Play" : "Pause";
}

function musicTogglePlay() {
  if (musicQueue.length === 0) return;
  var target = musicQueue[musicIndex < 0 ? 0 : musicIndex];
  if (musicAudio.paused) {
    if (!musicAudio.src) {
      if (!target || !target.url) {
        var firstPlayable = -1;
        musicQueue.forEach(function (track, i) {
          if (firstPlayable < 0 && track.url) firstPlayable = i;
        });
        if (firstPlayable >= 0) musicPlayIndex(firstPlayable);
        else musicHintAdd();
        musicUpdatePlayBtn();
        return;
      }
      musicPlayIndex(musicIndex < 0 ? 0 : musicIndex);
    } else {
      musicAudio.play().catch(function () {});
    }
  } else {
    musicAudio.pause();
  }
  musicUpdatePlayBtn();
}

function musicNext(auto) {
  if (musicQueue.length === 0) return;
  if (musicRepeatMode && auto) return;
  var i = musicIndex;
  if (musicShuffleOn && musicQueue.length > 1) {
    do { i = Math.floor(Math.random() * musicQueue.length); } while (i === musicIndex);
  } else {
    i = (i + 1) % musicQueue.length;
  }
  musicPlayIndex(i);
}

function musicPrev() {
  if (musicQueue.length === 0) return;
  if (musicAudio.currentTime > 3) {
    musicAudio.currentTime = 0;
    return;
  }
  var i = musicIndex;
  if (musicShuffleOn && musicQueue.length > 1) {
    do { i = Math.floor(Math.random() * musicQueue.length); } while (i === musicIndex);
  } else {
    i = (i - 1 + musicQueue.length) % musicQueue.length;
  }
  musicPlayIndex(i);
}

function musicProbeDuration(track) {
  var probe = document.createElement("audio");
  probe.preload = "metadata";
  probe.src = track.url;
  probe.addEventListener("loadedmetadata", function () {
    track.duration = probe.duration || 0;
    musicRenderQueue();
  });
}

function musicFindLibraryTrack(name) {
  var clean = String(name)
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/^\d+\s*[-.]?\s*/, "")
    .trim();
  var best = null;
  musicQueue.forEach(function (track) {
    if (!track.library || track.url) return;
    var tn = track.name.toLowerCase();
    if (clean.indexOf(tn) !== -1 || tn.indexOf(clean) !== -1) best = track;
  });
  return best;
}

function musicAddFiles(fileList) {
  var matched = false;
  Array.prototype.forEach.call(fileList, function (file) {
    if (file.type && file.type.indexOf("audio/") !== 0) return;
    var match = musicFindLibraryTrack(file.name);
    if (match) {
      match.url = URL.createObjectURL(file);
      match.duration = 0;
      match.file = file;
      matched = true;
      return;
    }
    musicQueue.push({
      url: URL.createObjectURL(file),
      name: musicTrackName(file.name),
      duration: 0,
      file: file,
      library: false
    });
  });
  musicQueue.forEach(function (track) {
    if (track.url && !track.duration) musicProbeDuration(track);
  });
  musicRenderQueue();
  if (musicIndex < 0 && musicQueue.length) {
    var firstPlayable = -1;
    musicQueue.forEach(function (track, i) {
      if (firstPlayable < 0 && track.url) firstPlayable = i;
    });
    if (firstPlayable >= 0) musicPlayIndex(firstPlayable);
  }
}

function musicHintAdd() {
  var add = document.querySelector(".music-add");
  add.classList.remove("hint");
  void add.offsetWidth;
  add.classList.add("hint");
  setTimeout(function () { add.classList.remove("hint"); }, 1600);
}

musicAudio.addEventListener("timeupdate", function () {
  document.querySelector("#musicTimeCur").textContent = musicFormat(musicAudio.currentTime);
  var dur = musicAudio.duration || 0;
  document.querySelector("#musicBarFill").style.width = (dur ? (musicAudio.currentTime / dur) * 100 : 0) + "%";
});
musicAudio.addEventListener("loadedmetadata", function () {
  var track = musicQueue[musicIndex];
  if (track) track.duration = musicAudio.duration || 0;
  document.querySelector("#musicTimeDur").textContent = musicFormat(musicAudio.duration);
  musicRenderQueue();
});
musicAudio.addEventListener("play", function () {
  document.querySelector("#musicVinyl").classList.add("spinning");
  musicUpdatePlayBtn();
});
musicAudio.addEventListener("pause", function () {
  document.querySelector("#musicVinyl").classList.remove("spinning");
  musicUpdatePlayBtn();
});
musicAudio.addEventListener("ended", function () {
  if (musicRepeatMode) {
    musicAudio.currentTime = 0;
    musicAudio.play().catch(function () {});
    return;
  }
  musicNext(true);
});
musicAudio.addEventListener("volumechange", function () {
  var muted = musicAudio.muted || musicAudio.volume === 0;
  document.querySelector("#musicMute").textContent = muted ? "🔇" : (musicAudio.volume < 0.5 ? "🔉" : "🔊");
  musicVolSync();
  musicSaveVolume();
});

document.querySelector("#musicPlay").addEventListener("click", musicTogglePlay);
document.querySelector("#musicNext").addEventListener("click", function () { musicNext(false); });
document.querySelector("#musicPrev").addEventListener("click", musicPrev);
document.querySelector("#musicShuffle").addEventListener("click", function () {
  musicShuffleOn = !musicShuffleOn;
  this.classList.toggle("active", musicShuffleOn);
  musicSavePrefs();
});
document.querySelector("#musicRepeat").addEventListener("click", function () {
  musicRepeatMode = musicRepeatMode ? 0 : 1;
  this.classList.toggle("active", musicRepeatMode > 0);
  this.title = musicRepeatMode ? "Repeat one" : "Repeat off";
  musicSavePrefs();
});
document.querySelector("#musicMute").addEventListener("click", function () {
  musicAudio.muted = !musicAudio.muted;
});
var musicVolSlider = document.querySelector("#musicVol");
var musicVolRoot = musicVolSlider.querySelector(".eslider-root");
var musicVolTrack = musicVolSlider.querySelector(".eslider-track");
var musicVolRange = musicVolSlider.querySelector(".eslider-range");
var musicVolValue = musicVolSlider.querySelector(".eslider-value");
var musicVolLeft = musicVolSlider.querySelector(".eslider-left");
var musicVolRight = musicVolSlider.querySelector(".eslider-right");
var musicVolVal = musicAudio.muted ? 0 : musicAudio.volume * 100;
var musicVolOverflow = 0;
var musicVolVel = 0;
var musicVolDrag = false;
var musicVolOriginRight = false;
var musicVolRaf = null;
var musicVolOverflowMax = 50;

function musicVolDecay(value, max) {
  if (!max) return 0;
  var entry = value / max;
  return (2 * (1 / (1 + Math.exp(-entry)) - 0.5)) * max;
}

function musicVolSync() {
  musicVolVal = (musicAudio.muted ? 0 : musicAudio.volume) * 100;
  musicVolRange.style.width = musicVolVal + "%";
  musicVolValue.textContent = Math.round(musicVolVal);
}

function musicVolElastic() {
  var w = musicVolRoot.getBoundingClientRect().width || 1;
  var scaleX = 1 + musicVolOverflow / w;
  var scaleY = 1 - (0.2 * musicVolOverflow) / musicVolOverflowMax;
  musicVolTrack.style.transformOrigin = musicVolOriginRight ? "right" : "left";
  musicVolTrack.style.transform = "scale(" + scaleX + "," + scaleY + ")";
  var pushingLeft = musicVolOriginRight && musicVolOverflow > 0;
  var pushingRight = !musicVolOriginRight && musicVolOverflow > 0;
  musicVolLeft.style.transform = pushingLeft ? "scale(1.2) translateX(" + (-musicVolOverflow) + "px)" : "scale(1)";
  musicVolRight.style.transform = pushingRight ? "scale(1.2) translateX(" + musicVolOverflow + "px)" : "scale(1)";
}

function musicVolLoop() {
  if (!musicVolDrag) {
    var force = (0 - musicVolOverflow) * 0.22;
    musicVolVel = (musicVolVel + force) * 0.72;
    musicVolOverflow += musicVolVel;
    musicVolElastic();
    if (Math.abs(musicVolOverflow) < 0.1 && Math.abs(musicVolVel) < 0.05) {
      musicVolOverflow = 0;
      musicVolVel = 0;
      musicVolElastic();
      musicVolRaf = null;
      return;
    }
  }
  musicVolRaf = requestAnimationFrame(musicVolLoop);
}

function musicVolSetPx(clientX) {
  var rect = musicVolRoot.getBoundingClientRect();
  var v = ((clientX - rect.left) / rect.width) * 100;
  musicVolVal = Math.min(100, Math.max(0, v));
  musicAudio.volume = musicVolVal / 100;
  if (musicVolVal > 0) musicAudio.muted = false;
  musicVolRange.style.width = musicVolVal + "%";
  musicVolValue.textContent = Math.round(musicVolVal);
  musicVolOriginRight = clientX < rect.left + rect.width / 2;
  if (clientX < rect.left) musicVolOverflow = musicVolDecay(rect.left - clientX, musicVolOverflowMax);
  else if (clientX > rect.right) musicVolOverflow = musicVolDecay(clientX - rect.right, musicVolOverflowMax);
  else musicVolOverflow = 0;
  musicVolElastic();
}

musicVolRoot.addEventListener("pointerdown", function (e) {
  musicVolDrag = true;
  musicVolVel = 0;
  musicVolSetPx(e.clientX);
  this.setPointerCapture(e.pointerId);
  if (!musicVolRaf) musicVolRaf = requestAnimationFrame(musicVolLoop);
});
musicVolRoot.addEventListener("pointermove", function (e) {
  if (musicVolDrag) musicVolSetPx(e.clientX);
});
function musicVolEnd() {
  musicVolDrag = false;
}
musicVolRoot.addEventListener("pointerup", musicVolEnd);
musicVolRoot.addEventListener("pointercancel", musicVolEnd);
musicVolRoot.addEventListener("lostpointercapture", musicVolEnd);
document.querySelector("#musicBar").addEventListener("click", function (e) {
  if (!musicAudio.duration) return;
  var rect = this.getBoundingClientRect();
  var ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  musicAudio.currentTime = ratio * musicAudio.duration;
});
document.querySelector("#musicFile").addEventListener("change", function () {
  musicAddFiles(this.files);
  this.value = "";
});
var musicDropWrap = document.querySelector("#musicQueueWrap");
musicDropWrap.addEventListener("dragover", function (e) {
  e.preventDefault();
  this.classList.add("drag-over");
});
musicDropWrap.addEventListener("dragleave", function () {
  this.classList.remove("drag-over");
});
musicDropWrap.addEventListener("drop", function (e) {
  e.preventDefault();
  this.classList.remove("drag-over");
  musicAddFiles(e.dataTransfer.files);
});
document.addEventListener("keydown", function (e) {
  var target = e.target;
  var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
  var musicWindow = document.querySelector("#music");
  if (e.code === "Space" && !typing && musicWindow && musicWindow.style.display !== "none") {
    e.preventDefault();
    musicTogglePlay();
  }
});

var musicScratchCtx = null;
var musicScratchSrc = null;
var musicScratchGain = null;
var musicScratchFilter = null;

function musicScratchEnsure() {
  if (musicScratchCtx) {
    if (musicScratchCtx.state === "suspended") musicScratchCtx.resume();
    return;
  }
  var Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  musicScratchCtx = new Ctx();
  musicScratchFilter = musicScratchCtx.createBiquadFilter();
  musicScratchFilter.type = "bandpass";
  musicScratchFilter.frequency.value = 900;
  musicScratchFilter.Q.value = 1.0;
  musicScratchGain = musicScratchCtx.createGain();
  musicScratchGain.gain.value = 0;
  musicScratchFilter.connect(musicScratchGain);
  musicScratchGain.connect(musicScratchCtx.destination);
}

function musicScratchStart() {
  musicScratchEnsure();
  if (!musicScratchCtx) return;
  var len = Math.floor(musicScratchCtx.sampleRate * 2);
  var buf = musicScratchCtx.createBuffer(1, len, musicScratchCtx.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  musicScratchSrc = musicScratchCtx.createBufferSource();
  musicScratchSrc.buffer = buf;
  musicScratchSrc.loop = true;
  musicScratchSrc.playbackRate.value = 0;
  musicScratchSrc.connect(musicScratchFilter);
  musicScratchSrc.start();
}

function musicScratchMove(rate) {
  if (!musicScratchSrc || !musicScratchGain) return;
  musicScratchSrc.playbackRate.setTargetAtTime(Math.max(-5, Math.min(5, rate)), musicScratchCtx.currentTime, 0.015);
  musicScratchGain.gain.setTargetAtTime(0.07, musicScratchCtx.currentTime, 0.01);
}

function musicScratchEnd() {
  if (!musicScratchSrc) return;
  musicScratchGain.gain.setTargetAtTime(0, musicScratchCtx.currentTime, 0.03);
  var src = musicScratchSrc;
  src.stop(musicScratchCtx.currentTime + 0.12);
  musicScratchSrc = null;
}

var musicVinyl = document.querySelector("#musicVinyl");
var musicVinylWrap = document.querySelector("#musicVinylWrap");
var musicScratchActive = false;
var musicScratchAngle = 0;
var musicScratchLastX = 0;
var musicScratchLastT = 0;
var musicScratchWasPlaying = false;

function musicNoteBurst() {
  var note = document.createElement("span");
  note.className = "music-note";
  note.textContent = Math.random() < 0.5 ? "♪" : "♫";
  note.style.left = (86 + Math.random() * 18) + "px";
  note.style.top = (86 + Math.random() * 18) + "px";
  note.style.fontSize = (14 + Math.random() * 12) + "px";
  musicVinylWrap.appendChild(note);
  setTimeout(function () { if (note.parentNode) note.parentNode.removeChild(note); }, 950);
}

musicVinyl.addEventListener("pointerdown", function (e) {
  if (e.button !== 0) return;
  e.preventDefault();
  musicVinyl.setPointerCapture(e.pointerId);
  musicScratchActive = true;
  musicScratchWasPlaying = !musicAudio.paused;
  if (musicScratchWasPlaying) musicAudio.pause();
  musicScratchAngle = musicVinyl.scratchAngle || 0;
  musicVinyl.style.transition = "none";
  musicVinyl.style.animation = "none";
  musicVinyl.style.transform = "rotate(" + musicScratchAngle + "deg)";
  musicScratchLastX = e.clientX;
  musicScratchLastT = performance.now();
  musicScratchStart();
});

musicVinyl.addEventListener("pointermove", function (e) {
  if (!musicScratchActive) return;
  var now = performance.now();
  var dt = Math.max(1, now - musicScratchLastT);
  var dx = e.clientX - musicScratchLastX;
  musicScratchAngle += dx * 2;
  musicVinyl.style.transform = "rotate(" + musicScratchAngle + "deg)";
  musicScratchMove((dx / dt) * 4);
  if (Math.abs(dx) > 4) musicNoteBurst();
  musicScratchLastX = e.clientX;
  musicScratchLastT = now;
});

function musicScratchEndAll() {
  if (!musicScratchActive) return;
  musicScratchActive = false;
  musicScratchEnd();
  musicVinyl.scratchAngle = musicScratchAngle;
  musicVinyl.style.transition = "";
  musicVinyl.style.animation = "";
  musicVinyl.style.animationDelay = -(musicScratchAngle / 360) * 4 + "s";
  musicVinyl.style.transform = "";
  if (musicScratchWasPlaying) musicAudio.play().catch(function () {});
}

musicVinyl.addEventListener("pointerup", musicScratchEndAll);
musicVinyl.addEventListener("pointercancel", musicScratchEndAll);

document.querySelector("#musicShuffle").classList.toggle("active", musicShuffleOn);
var musicRepBtn = document.querySelector("#musicRepeat");
musicRepBtn.classList.toggle("active", musicRepeatMode > 0);
musicRepBtn.title = musicRepeatMode ? "Repeat one" : "Repeat off";
musicVolSync();
if (typeof ISAAC_TRACKS !== "undefined") {
  ISAAC_TRACKS.forEach(function (track) {
    musicQueue.push({ url: track.file ? "songs/" + track.file : null, name: track.name, artist: track.artist || "", duration: 0, file: track.file || null, library: true });
  });
  musicQueue.forEach(function (track) {
    if (track.url) musicProbeDuration(track);
  });
}
musicUpdatePlayBtn();
musicRenderQueue();

// --- Settings app ---

var settingsTopbarKey = "isaacos_settings_topbar";
var settingsLabelsKey = "isaacos_settings_labels";
var settingsMuteKey = "isaacos_settings_muted";

var settingsVol = document.querySelector("#settingsVolume");
var settingsVolVal = document.querySelector("#settingsVolumeVal");
var settingsMute = document.querySelector("#settingsMute");
var settingsLabels = document.querySelector("#settingsLabels");
var settingsBattery = document.querySelector("#settingsBattery");
var settingsWifi = document.querySelector("#settingsWifi");
var settingsClock = document.querySelector("#settingsClock");

function settingsTopbarState() {
  var def = { battery: true, wifi: true, clock: true };
  try {
    var saved = JSON.parse(localStorage.getItem(settingsTopbarKey) || "{}");
    for (var k in def) {
      if (typeof saved[k] !== "boolean") saved[k] = def[k];
    }
    return saved;
  } catch (e) {
    return def;
  }
}

function settingsApplyTopbar() {
  var st = settingsTopbarState();
  var battery = document.querySelector(".topbar-battery");
  var wifi = document.querySelector(".topbar-wifi");
  var clock = document.querySelector("#timeElement");
  function show(el, on) { if (el) el.style.display = on ? "" : "none"; }
  show(battery, st.battery !== false);
  show(wifi, st.wifi !== false);
  show(clock, st.clock !== false);
}

function settingsTopbarSync() {
  var st = settingsTopbarState();
  if (settingsBattery) settingsBattery.classList.toggle("on", st.battery !== false);
  if (settingsWifi) settingsWifi.classList.toggle("on", st.wifi !== false);
  if (settingsClock) settingsClock.classList.toggle("on", st.clock !== false);
}

function settingsApplyLabels() {
  var hidden = localStorage.getItem(settingsLabelsKey) === "1";
  osContainer.classList.toggle("no-labels", hidden);
  if (settingsLabels) settingsLabels.classList.toggle("on", hidden);
}

function settingsApplyAudio() {
  if (!settingsVol || !settingsVolVal || !musicAudio) return;
  try {
    var saved = localStorage.getItem(musicVolumeKey);
    var vol = saved !== null ? (parseFloat(saved) || 1) : 1;
    vol = Math.min(1, Math.max(0, vol));
    musicAudio.volume = vol;
    settingsVol.value = Math.round(vol * 100);
    settingsVolVal.textContent = Math.round(vol * 100);
  } catch (e) {}
  var muted = localStorage.getItem(settingsMuteKey) === "1";
  musicAudio.muted = muted;
  if (settingsMute) settingsMute.classList.toggle("on", muted);
}

if (settingsVol) {
  settingsVol.addEventListener("input", function () {
    var v = parseInt(settingsVol.value, 10);
    musicAudio.volume = v / 100;
    if (v > 0) musicAudio.muted = false;
  });
}

if (settingsMute) {
  settingsMute.addEventListener("click", function () {
    musicAudio.muted = !musicAudio.muted;
  });
}

musicAudio.addEventListener("volumechange", function () {
  var shown = musicAudio.muted ? 0 : musicAudio.volume;
  if (settingsVol) settingsVol.value = Math.round(shown * 100);
  if (settingsVolVal) settingsVolVal.textContent = Math.round(shown * 100);
  if (settingsMute) settingsMute.classList.toggle("on", musicAudio.muted);
  localStorage.setItem(settingsMuteKey, musicAudio.muted ? "1" : "0");
});

if (settingsLabels) {
  settingsLabels.addEventListener("click", function () {
    var hidden = localStorage.getItem(settingsLabelsKey) !== "1";
    localStorage.setItem(settingsLabelsKey, hidden ? "1" : "0");
    settingsApplyLabels();
  });
}

function settingsBindTopbarToggle(el, key) {
  if (!el) return;
  el.addEventListener("click", function () {
    var st = settingsTopbarState();
    st[key] = !st[key];
    localStorage.setItem(settingsTopbarKey, JSON.stringify(st));
    settingsApplyTopbar();
    settingsTopbarSync();
  });
}

document.querySelectorAll(".settings-cat").forEach(function (cat) {
  cat.addEventListener("click", function () {
    document.querySelectorAll(".settings-cat").forEach(function (c) { c.classList.remove("active"); });
    cat.classList.add("active");
    document.querySelectorAll(".settings-panel").forEach(function (p) { p.classList.remove("active"); });
    var panel = document.getElementById(cat.getAttribute("data-target"));
    if (panel) panel.classList.add("active");
  });
});

settingsBindTopbarToggle(settingsBattery, "battery");
settingsBindTopbarToggle(settingsWifi, "wifi");
settingsBindTopbarToggle(settingsClock, "clock");

var settingsResetPositions = document.querySelector("#settingsResetPositions");
if (settingsResetPositions) {
  settingsResetPositions.addEventListener("click", function () {
    try { localStorage.removeItem(iconPositionsKey); } catch (e) {}
    document.querySelectorAll(".appicon").forEach(function (icon) {
      icon.style.left = "";
      icon.style.top = "";
    });
  });
}

var settingsResetAll = document.querySelector("#settingsResetAll");
if (settingsResetAll) {
  settingsResetAll.addEventListener("click", function () {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf("isaacos_") === 0) localStorage.removeItem(k);
      });
    } catch (e) {}
    location.reload();
  });
}

var settingsReplayBoot = document.querySelector("#settingsReplayBoot");
if (settingsReplayBoot) {
  settingsReplayBoot.addEventListener("click", function () {
    if (typeof window.replayBootIntro === "function") window.replayBootIntro();
  });
}

settingsApplyTopbar();
settingsApplyLabels();
settingsApplyAudio();
settingsTopbarSync();

/* =========================================================
   PIXEL ART PAINT APP IMPLEMENTATION
   ========================================================= */

function initPixelPaint() {
  var paintWindow = document.getElementById("paint");
  if (!paintWindow) return;

  var canvas = document.getElementById("paintCanvas");
  var previewCanvas = document.getElementById("paintPreviewCanvas");
  var gridCanvas = document.getElementById("paintGridCanvas");
  var cursorCanvas = document.getElementById("paintCursorCanvas");
  var wrapper = document.getElementById("paintCanvasWrapper");
  var container = document.getElementById("paintCanvasContainer");
  var coordsEl = document.getElementById("paintCoords");
  var infoEl = document.getElementById("paintInfo");
  var customColorInput = document.getElementById("paintCustomColor");
  var colorPreview = document.getElementById("paintColorPreview");
  var paletteContainer = document.getElementById("paintPalette");
  var sizeSelect = document.getElementById("paintCanvasSizeSelect");
  var gridToggleBtn = document.getElementById("paintToggleGrid");
  var clearBtn = document.getElementById("paintClear");
  var exportBtn = document.getElementById("paintExport");
  var undoBtn = document.getElementById("paintUndo");
  var redoBtn = document.getElementById("paintRedo");

  if (!canvas || !previewCanvas) return;

  var ctx = canvas.getContext("2d");
  var previewCtx = previewCanvas.getContext("2d");
  var cursorCtx = cursorCanvas.getContext("2d");

  var cursorActive = false;
  var cursorCellX = 0;
  var cursorCellY = 0;

  var state = {
    gridSize: 32,
    tool: "pencil",
    brushSize: 1,
    color: "#000000",
    isDrawing: false,
    startX: -1,
    startY: -1,
    lastX: -1,
    lastY: -1,
    gridVisible: true,
    undoStack: [],
    redoStack: [],
    maxHistory: 30
  };

  var paletteColors = [
    "#000000", "#3a3a3a", "#787878", "#b4b4b4", "#ffffff", "#e8d5a8",
    "#690e0e", "#a81c1c", "#e63946", "#ff6b6b", "#f77f00", "#fcbf49",
    "#ffe49e", "#8d5b4c", "#523429", "#2f5c1c", "#52b788", "#a7c957",
    "#1c4b7a", "#3a86ff", "#8ecae6", "#5d2f8a", "#9d4edd", "#ff006e"
  ];

  function renderPalette() {
    paletteContainer.innerHTML = "";
    paletteColors.forEach(function (col) {
      var swatch = document.createElement("button");
      swatch.className = "paint-swatch" + (state.color.toLowerCase() === col.toLowerCase() ? " active" : "");
      swatch.style.backgroundColor = col;
      swatch.title = col;
      swatch.addEventListener("click", function () {
        setColor(col);
      });
      paletteContainer.appendChild(swatch);
    });

    var transSwatch = document.createElement("button");
    transSwatch.className = "paint-swatch transparent-swatch" + (state.tool === "eraser" ? " active" : "");
    transSwatch.title = "Eraser / Transparent";
    transSwatch.addEventListener("click", function () {
      setTool("eraser");
    });
    paletteContainer.appendChild(transSwatch);
  }

  function setColor(hex) {
    state.color = hex;
    colorPreview.style.backgroundColor = hex;
    customColorInput.value = hex.startsWith("#") ? hex : "#000000";
    if (state.tool === "eraser") {
      setTool("pencil");
    }
    updatePaletteActiveState();
  }

  function updatePaletteActiveState() {
    var swatches = paletteContainer.querySelectorAll(".paint-swatch");
    swatches.forEach(function (sw) {
      if (sw.classList.contains("transparent-swatch")) {
        sw.classList.toggle("active", state.tool === "eraser");
      } else {
        var bg = sw.style.backgroundColor;
        var active = state.tool !== "eraser" && rgbToHex(bg).toLowerCase() === state.color.toLowerCase();
        sw.classList.toggle("active", active);
      }
    });
  }

  function rgbToHex(rgb) {
    if (!rgb) return "#000000";
    if (rgb.startsWith("#")) return rgb;
    var parts = rgb.match(/\d+/g);
    if (!parts || parts.length < 3) return rgb;
    function hex(n) {
      var h = parseInt(n, 10).toString(16);
      return h.length === 1 ? "0" + h : h;
    }
    return "#" + hex(parts[0]) + hex(parts[1]) + hex(parts[2]);
  }

  function hexToRgba(hex) {
    var c = hex.replace("#", "");
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    var num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 255
    };
  }

  function setTool(toolName) {
    state.tool = toolName;
    document.querySelectorAll(".paint-tool-btn[data-tool]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-tool") === toolName);
    });
    updatePaletteActiveState();
    redrawCursor();
  }

  function setBrushSize(size) {
    state.brushSize = parseInt(size, 10) || 1;
    document.querySelectorAll(".paint-size-btn").forEach(function (btn) {
      btn.classList.toggle("active", parseInt(btn.getAttribute("data-size"), 10) === state.brushSize);
    });
    redrawCursor();
  }

  function resizeCanvas(newSize, keepContent) {
    var oldData = null;
    if (keepContent && canvas.width > 0 && canvas.height > 0) {
      oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    state.gridSize = newSize;
    canvas.width = newSize;
    canvas.height = newSize;
    previewCanvas.width = newSize;
    previewCanvas.height = newSize;

    ctx.imageSmoothingEnabled = false;
    previewCtx.imageSmoothingEnabled = false;

    if (oldData && keepContent) {
      ctx.putImageData(oldData, 0, 0);
    } else {
      ctx.clearRect(0, 0, newSize, newSize);
      state.undoStack = [];
      state.redoStack = [];
      saveUndoState();
    }

    fitCanvasWrapper();
    updateGridOverlay();
    infoEl.textContent = newSize + " \u00d7 " + newSize + " px";
  }

  function fitCanvasWrapper() {
    if (!container || !wrapper) return;
    var rect = container.getBoundingClientRect();
    var s = getOsScale();
    var availW = (rect.width / s) - 24;
    var availH = (rect.height / s) - 24;
    var maxInner = Math.min(availW, availH, 436);
    var cell = Math.max(1, Math.floor(maxInner / state.gridSize));
    var inner = cell * state.gridSize;
    var side = inner + 4;
    wrapper.style.width = side + "px";
    wrapper.style.height = side + "px";
    updateGridOverlay();
    redrawCursor();
  }

  function updateGridOverlay() {
    if (!state.gridVisible) {
      gridCanvas.style.display = "none";
      gridToggleBtn.textContent = "\u25a6 Grid: OFF";
      return;
    }
    gridCanvas.style.display = "block";
    gridToggleBtn.textContent = "\u25a6 Grid: ON";

    var cell = wrapper.clientWidth / state.gridSize;
    var k = Math.max(4, Math.round(cell * getOsScale()));
    gridCanvas.width = state.gridSize * k;
    gridCanvas.height = state.gridSize * k;
    var g = gridCanvas.getContext("2d");
    g.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (var i = 0; i < state.gridSize; i++) {
      var p = i * k;
      g.fillRect(p, 0, 1, gridCanvas.height);
      g.fillRect(0, p, gridCanvas.width, 1);
    }
  }

  function redrawCursor() {
    if (cursorActive) drawCursor(cursorCellX, cursorCellY);
  }

  function drawCursor(cx, cy) {
    var w = gridCanvas.width;
    if (w > 0 && (cursorCanvas.width !== w || cursorCanvas.height !== w)) {
      cursorCanvas.width = w;
      cursorCanvas.height = w;
    }
    cursorCanvas.style.display = "block";
    if (cursorCanvas.width === 0) return;
    var k = cursorCanvas.width / state.gridSize;
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    var showOutline = state.tool === "pencil" || state.tool === "eraser" ||
      state.tool === "line" || state.tool === "rect";
    var sz = showOutline ? state.brushSize : 1;
    var half = Math.floor(sz / 2);
    var bx = (cx - half) * k;
    var by = (cy - half) * k;
    var bw = sz * k;
    var mx = bx + Math.floor(bw / 2);
    var my = by + Math.floor(bw / 2);

    if (showOutline) {
      var x0 = bx - 1, y0 = by - 1, w0 = bw + 2;
      cursorCtx.fillStyle = "#fff";
      cursorCtx.fillRect(x0, y0, w0, 1);
      cursorCtx.fillRect(x0, y0 + w0 - 1, w0, 1);
      cursorCtx.fillRect(x0, y0, 1, w0);
      cursorCtx.fillRect(x0 + w0 - 1, y0, 1, w0);
      cursorCtx.fillStyle = "#000";
      cursorCtx.fillRect(bx, by, bw, 1);
      cursorCtx.fillRect(bx, by + bw - 1, bw, 1);
      cursorCtx.fillRect(bx, by, 1, bw);
      cursorCtx.fillRect(bx + bw - 1, by, 1, bw);
    }

    var arm = 2;
    cursorCtx.fillStyle = "#000";
    cursorCtx.fillRect(mx - arm, my - 1, arm * 2 + 1, 1);
    cursorCtx.fillRect(mx - 1, my - arm, 1, arm * 2 + 1);
    cursorCtx.fillStyle = "#fff";
    cursorCtx.fillRect(mx - arm + 1, my, arm * 2 - 1, 1);
    cursorCtx.fillRect(mx, my - arm + 1, 1, arm * 2 - 1);
  }

  function clearCursor() {
    cursorActive = false;
    cursorCanvas.style.display = "none";
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  }

  function saveUndoState() {
    if (state.undoStack.length >= state.maxHistory) {
      state.undoStack.shift();
    }
    state.undoStack.push(ctx.getImageData(0, 0, state.gridSize, state.gridSize));
    state.redoStack = [];
  }

  function undo() {
    if (state.undoStack.length <= 1) return;
    var current = state.undoStack.pop();
    state.redoStack.push(current);
    var prev = state.undoStack[state.undoStack.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
    }
  }

  function redo() {
    if (state.redoStack.length === 0) return;
    var next = state.redoStack.pop();
    state.undoStack.push(next);
    ctx.putImageData(next, 0, 0);
  }

  function getPixelCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var relX = (e.clientX - rect.left) / rect.width;
    var relY = (e.clientY - rect.top) / rect.height;
    var x = Math.floor(relX * state.gridSize);
    var y = Math.floor(relY * state.gridSize);
    return {
      x: Math.max(0, Math.min(state.gridSize - 1, x)),
      y: Math.max(0, Math.min(state.gridSize - 1, y))
    };
  }

  function drawPixel(targetCtx, x, y, color, size, isEraser) {
    var half = Math.floor(size / 2);
    var startX = x - half;
    var startY = y - half;

    if (isEraser) {
      targetCtx.clearRect(startX, startY, size, size);
    } else {
      targetCtx.fillStyle = color;
      targetCtx.fillRect(startX, startY, size, size);
    }
  }

  function drawLine(targetCtx, x0, y0, x1, y1, color, size, isEraser) {
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1;
    var sy = y0 < y1 ? 1 : -1;
    var err = dx - dy;

    var curX = x0;
    var curY = y0;

    while (true) {
      drawPixel(targetCtx, curX, curY, color, size, isEraser);
      if (curX === x1 && curY === y1) break;
      var e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        curX += sx;
      }
      if (e2 < dx) {
        err += dx;
        curY += sy;
      }
    }
  }

  function drawRect(targetCtx, x0, y0, x1, y1, color, size, isEraser) {
    var minX = Math.min(x0, x1);
    var maxX = Math.max(x0, x1);
    var minY = Math.min(y0, y1);
    var maxY = Math.max(y0, y1);

    for (var x = minX; x <= maxX; x++) {
      drawPixel(targetCtx, x, minY, color, size, isEraser);
      drawPixel(targetCtx, x, maxY, color, size, isEraser);
    }
    for (var y = minY; y <= maxY; y++) {
      drawPixel(targetCtx, minX, y, color, size, isEraser);
      drawPixel(targetCtx, maxX, y, color, size, isEraser);
    }
  }

  function floodFill(startX, startY, fillColor) {
    var imgData = ctx.getImageData(0, 0, state.gridSize, state.gridSize);
    var data = imgData.data;
    var width = state.gridSize;
    var height = state.gridSize;

    var startIdx = (startY * width + startX) * 4;
    var targetR = data[startIdx];
    var targetG = data[startIdx + 1];
    var targetB = data[startIdx + 2];
    var targetA = data[startIdx + 3];

    var fillRgba = state.tool === "eraser" ? { r: 0, g: 0, b: 0, a: 0 } : hexToRgba(fillColor);

    if (
      targetR === fillRgba.r &&
      targetG === fillRgba.g &&
      targetB === fillRgba.b &&
      targetA === fillRgba.a
    ) {
      return;
    }

    var queue = [[startX, startY]];
    var visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;

    function matchesTarget(x, y) {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      var idx = (y * width + x) * 4;
      return (
        data[idx] === targetR &&
        data[idx + 1] === targetG &&
        data[idx + 2] === targetB &&
        data[idx + 3] === targetA
      );
    }

    while (queue.length > 0) {
      var pt = queue.pop();
      var cx = pt[0];
      var cy = pt[1];
      var idx = (cy * width + cx) * 4;

      data[idx] = fillRgba.r;
      data[idx + 1] = fillRgba.g;
      data[idx + 2] = fillRgba.b;
      data[idx + 3] = fillRgba.a;

      var neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (var i = 0; i < neighbors.length; i++) {
        var nx = neighbors[i][0];
        var ny = neighbors[i][1];
        var nIdx = ny * width + nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[nIdx] && matchesTarget(nx, ny)) {
          visited[nIdx] = 1;
          queue.push([nx, ny]);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  function pickColor(x, y) {
    var imgData = ctx.getImageData(x, y, 1, 1).data;
    if (imgData[3] === 0) {
      setTool("eraser");
    } else {
      var hex = "#" + [imgData[0], imgData[1], imgData[2]].map(function (v) {
        var h = v.toString(16);
        return h.length === 1 ? "0" + h : h;
      }).join("");
      setColor(hex);
      setTool("pencil");
    }
  }

  function startDraw(e) {
    var coords = getPixelCoords(e);
    state.isDrawing = true;
    state.startX = coords.x;
    state.startY = coords.y;
    state.lastX = coords.x;
    state.lastY = coords.y;

    if (state.tool === "pencil" || state.tool === "eraser") {
      drawPixel(ctx, coords.x, coords.y, state.color, state.brushSize, state.tool === "eraser");
    } else if (state.tool === "bucket") {
      floodFill(coords.x, coords.y, state.color);
      state.isDrawing = false;
      saveUndoState();
    } else if (state.tool === "picker") {
      pickColor(coords.x, coords.y);
      state.isDrawing = false;
    }
  }

  function continueDraw(e) {
    var coords = getPixelCoords(e);
    coordsEl.textContent = "X: " + coords.x + " | Y: " + coords.y;

    if (!state.isDrawing) return;

    if (state.tool === "pencil" || state.tool === "eraser") {
      drawLine(
        ctx,
        state.lastX,
        state.lastY,
        coords.x,
        coords.y,
        state.color,
        state.brushSize,
        state.tool === "eraser"
      );
      state.lastX = coords.x;
      state.lastY = coords.y;
    } else if (state.tool === "line") {
      previewCtx.clearRect(0, 0, state.gridSize, state.gridSize);
      drawLine(
        previewCtx,
        state.startX,
        state.startY,
        coords.x,
        coords.y,
        state.color,
        state.brushSize,
        false
      );
    } else if (state.tool === "rect") {
      previewCtx.clearRect(0, 0, state.gridSize, state.gridSize);
      drawRect(
        previewCtx,
        state.startX,
        state.startY,
        coords.x,
        coords.y,
        state.color,
        state.brushSize,
        false
      );
    }
  }

  function stopDraw(e) {
    if (!state.isDrawing) return;
    state.isDrawing = false;

    if (e && (state.tool === "line" || state.tool === "rect")) {
      var coords = getPixelCoords(e);
      previewCtx.clearRect(0, 0, state.gridSize, state.gridSize);
      if (state.tool === "line") {
        drawLine(
          ctx,
          state.startX,
          state.startY,
          coords.x,
          coords.y,
          state.color,
          state.brushSize,
          false
        );
      } else if (state.tool === "rect") {
        drawRect(
          ctx,
          state.startX,
          state.startY,
          coords.x,
          coords.y,
          state.color,
          state.brushSize,
          false
        );
      }
    }

    saveUndoState();
  }

  wrapper.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    startDraw(e);
  });

  window.addEventListener("mousemove", function (e) {
    if (state.isDrawing) {
      var coords = getPixelCoords(e);
      cursorCellX = coords.x;
      cursorCellY = coords.y;
      drawCursor(coords.x, coords.y);
      continueDraw(e);
    }
  });

  wrapper.addEventListener("mouseenter", function () {
    cursorActive = true;
  });

  wrapper.addEventListener("mousemove", function (e) {
    var coords = getPixelCoords(e);
    cursorCellX = coords.x;
    cursorCellY = coords.y;
    cursorActive = true;
    drawCursor(coords.x, coords.y);
    continueDraw(e);
  });

  wrapper.addEventListener("mouseleave", function () {
    clearCursor();
    if (!state.isDrawing) {
      coordsEl.textContent = "X: - | Y: -";
    }
  });

  window.addEventListener("mouseup", function (e) {
    if (state.isDrawing) {
      stopDraw(e);
    }
  });

  document.querySelectorAll(".paint-tool-btn[data-tool]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTool(btn.getAttribute("data-tool"));
    });
  });

  document.querySelectorAll(".paint-size-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setBrushSize(btn.getAttribute("data-size"));
    });
  });

  customColorInput.addEventListener("input", function () {
    setColor(customColorInput.value);
  });

  sizeSelect.addEventListener("change", function () {
    var newSize = parseInt(sizeSelect.value, 10) || 32;
    if (confirm("Changing canvas size will reset current drawing. Proceed?")) {
      resizeCanvas(newSize, false);
    } else {
      sizeSelect.value = state.gridSize.toString();
    }
  });

  gridToggleBtn.addEventListener("click", function () {
    state.gridVisible = !state.gridVisible;
    updateGridOverlay();
  });

  clearBtn.addEventListener("click", function () {
    ctx.clearRect(0, 0, state.gridSize, state.gridSize);
    previewCtx.clearRect(0, 0, state.gridSize, state.gridSize);
    saveUndoState();
  });

  exportBtn.addEventListener("click", function () {
    var exportSize = 512;
    var exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    var expCtx = exportCanvas.getContext("2d");
    expCtx.imageSmoothingEnabled = false;
    expCtx.drawImage(canvas, 0, 0, exportSize, exportSize);

    var link = document.createElement("a");
    link.download = "isaacos-pixelart-" + state.gridSize + "x" + state.gridSize + "-" + Date.now() + ".png";
    link.href = exportCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  window.addEventListener("resize", fitCanvasWrapper);

  var paintObserver = new ResizeObserver(function () {
    fitCanvasWrapper();
  });
  if (paintWindow) {
    paintObserver.observe(paintWindow);
  }

  window.addEventListener("keydown", function (e) {
    if (paintWindow.style.display === "none") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      var k = e.key.toLowerCase();
      if (k === "b" || k === "p") setTool("pencil");
      else if (k === "e") setTool("eraser");
      else if (k === "g") setTool("bucket");
      else if (k === "i") setTool("picker");
      else if (k === "l") setTool("line");
      else if (k === "u") setTool("rect");
    }
  });

  renderPalette();
  setColor("#000000");
  resizeCanvas(32, false);
}

initPixelPaint();

// --- Boot intro: Binding of Isaac trapdoor sequence ---
(function () {
  var overlay = document.getElementById("bootIntro");
  if (!overlay) return;
  var canvas = document.getElementById("bootCanvas");
  var hint = overlay.querySelector(".boot-skip");
  hint.textContent = "Click / press any key to boot";
  hint.classList.add("centered");
  var ctx = canvas.getContext("2d");
  canvas.width = 1280;
  canvas.height = 720;

  var W = canvas.width, H = canvas.height;
  var FRAME_MS = 1000 / 30;
  var S = 3;
  var AY = 425;
  var DY = 540;

  var sheets = {};
  var names = { isaac: "img/boot_isaac.png", trapdoor: "img/boot_trapdoor.png", poof: "img/boot_poof.png" };
  var pending = Object.keys(names).length;
  var ready = false;
  var rafId = null;
  var running = false;

  var sfx = {
    poof: new Audio("img/boot_appear_poof.wav"),
    trapdoor: new Audio("img/boot_crawl_open.wav"),
    grunt: new Audio("img/boot_hurt_grunt.wav")
  };

  sfx.grunt.volume = 0.5;

  function playSfx(a) {
    try {
      a.currentTime = 0;
      a.play().catch(function () {});
    } catch (e) {}
  }

  function stopSfx(which) {
    try {
      if (which) {
        which.pause();
      } else {
        sfx.poof.pause();
        sfx.trapdoor.pause();
        sfx.grunt.pause();
      }
    } catch (e) {}
  }

  Object.keys(names).forEach(function (key) {
    var img = new Image();
    img.onload = function () {
      sheets[key] = img;
      pending--;
      if (pending === 0) ready = true;
    };
    img.onerror = function () { pending--; };
    img.src = names[key];
  });

  var POOF = [
    [0,0,61,255],[64,0,61,255],[128,0,61,255],[192,0,61,235],
    [0,61,80,215],[64,61,80,195],[64,61,80,185],[128,61,80,175],
    [128,61,80,165],[192,61,80,155],[192,61,80,145],[0,141,80,135],
    [0,141,80,125],[64,141,80,115],[64,141,80,105],[128,141,80,95],
    [128,141,80,85],[192,141,80,75],[192,141,80,65],[0,221,35,55],
    [0,221,35,45],[64,221,35,35],[64,221,35,25],[128,221,35,15],
    [128,221,35,5]
  ];

  var APPEAR = [
    { c:[0,192,64,64], sx:100, sy:100, y:3, d:20 },
    { c:[0,192,64,64], sx:120, sy:80, y:4, d:2 },
    { c:[0,192,64,64], sx:80, sy:120, y:1, d:2 },
    { c:[0,192,64,64], sx:110, sy:90, y:2, d:2 },
    { c:[0,192,64,64], sx:94, sy:104, y:1, d:2 },
    { c:[0,192,64,64], sx:100, sy:100, y:1, d:12 }
  ];

  var DOOR_OPEN = [
    { c:[64,64,64,64], sx:100, sy:100, d:2 },
    { c:[128,64,64,64], sx:100, sy:100, d:2 },
    { c:[0,0,64,64], sx:80, sy:120, d:2 },
    { c:[0,0,64,64], sx:110, sy:90, d:2 },
    { c:[0,0,64,64], sx:90, sy:110, d:2 },
    { c:[0,0,64,64], sx:100, sy:100, d:1 }
  ];

  var DESCEND = [
    { c:[0,192,64,64], sx:60, sy:140, y:2, d:2 },
    { c:[0,192,64,64], sx:130, sy:70, y:-29, d:2 },
    { c:[0,256,64,64], sx:100, sy:100, y:-11, d:2 },
    { c:[64,256,64,64], sx:100, sy:100, y:-12, d:2 },
    { c:[64,256,64,64], sx:100, sy:100, y:-13, d:2 },
    { c:[64,256,64,64], sx:90, sy:110, y:-9, d:2 },
    { c:[64,256,64,64], sx:70, sy:130, y:1, d:1 },
    { c:[64,256,64,64], sx:65, sy:135, y:8, d:1 },
    { c:[0,208,64,16], sx:50, sy:150, y:72, d:1 },
    { c:[0,0,32,16], sx:50, sy:150, y:72, d:1, hidden:true }
  ];

  var AX = W / 2;
  var TRAP_X = 0;

  function drawSprite(img, crop, px, py, sx, sy, xscale, yscale) {
    if (!img) return;
    var w = crop[2] * S * (xscale / 100);
    var h = crop[3] * S * (yscale / 100);
    var dx = px - 32 * S * (xscale / 100);
    var dy = py - 56 * S * (yscale / 100);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, crop[0], crop[1], crop[2], crop[3], dx, dy, w, h);
  }

  function drawTrapdoor(crop, sx, sy) {
    if (!sheets.trapdoor) return;
    var w = 64 * S * (sx / 100);
    var h = 64 * S * (sy / 100);
    var dx = AX + TRAP_X - 32 * S * (sx / 100);
    var dy = DY - 32 * S * (sy / 100);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheets.trapdoor, crop[0], crop[1], 64, 64, dx, dy, w, h);
  }

  function drawPoof(frame, px, py) {
    if (!sheets.poof) return;
    var f = POOF[frame];
    if (!f) return;
    var w = 64 * S;
    var h = f[2] * S;
    ctx.globalAlpha = f[3] / 255;
    ctx.globalCompositeOperation = "screen";
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheets.poof, f[0], f[1], 64, f[2], px - 32 * S, py - f[2] * S + 26 * S, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  var frozen = null;

  function makeFrozen() {
    frozen = document.createElement("canvas");
    frozen.width = W;
    frozen.height = H;
    frozen.getContext("2d").drawImage(canvas, 0, 0);
  }

  var phase = -1;
  var frame = 0;
  var lastTime = 0;
  var sfxPhase = -1;

  function triggerPhaseSfx(p) {
    if (p === 0) playSfx(sfx.poof);
    else if (p === 2) playSfx(sfx.trapdoor);
    else if (p === 3) playSfx(sfx.poof);
    else if (p === 4) {
      stopSfx(sfx.poof);
      playSfx(sfx.poof);
    }
  }

  function run(t) {
    if (!running) return;
    if (!lastTime) lastTime = t;
    var elapsed = t - lastTime;
    lastTime = t;
    frame += elapsed / FRAME_MS;
    if (phase !== sfxPhase) {
      sfxPhase = phase;
      triggerPhaseSfx(phase);
    }

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (phase === 0) {
      var poofF = Math.floor(frame);
      if (poofF < POOF.length) drawPoof(poofF, AX, AY + 10);
      var appearFrame = Math.floor(frame);
      var total = 0;
      for (var i = 0; i < APPEAR.length; i++) {
        total += APPEAR[i].d;
        if (appearFrame < total) {
          var a = APPEAR[i];
          drawSprite(sheets.isaac, a.c, AX, AY, a.sx, a.sy, a.sx, a.sy);
          break;
        }
      }
      if (appearFrame >= total) {
        drawSprite(sheets.isaac, [0,192,64,64], AX, AY, 100, 100, 100, 100);
      }
      var appearTotal = 0;
      for (var ai = 0; ai < APPEAR.length; ai++) appearTotal += APPEAR[ai].d;
      if (poofF >= POOF.length && appearFrame >= appearTotal) {
        frame = 0;
        phase = 1;
      }
    } else if (phase === 1) {
      drawSprite(sheets.isaac, [0,192,64,64], AX, AY, 100, 100, 100, 100);
      if (frame >= 16) { frame = 0; phase = 2; }
    } else if (phase === 2) {
      drawSprite(sheets.isaac, [0,192,64,64], AX, AY, 100, 100, 100, 100);
      drawTrapdoor([0,64,64,64], 100, 100);
      var d = Math.floor(frame);
      var dt = 0;
      var played = false;
      for (var j = 0; j < DOOR_OPEN.length; j++) {
        dt += DOOR_OPEN[j].d;
        if (d < dt) {
          var dof = DOOR_OPEN[j];
          drawTrapdoor(dof.c, dof.sx, dof.sy);
          played = true;
          break;
        }
      }
      if (!played) drawTrapdoor([0,0,64,64], 100, 100);
      var tot = 0;
      for (var k = 0; k < DOOR_OPEN.length; k++) tot += DOOR_OPEN[k].d;
      if (d >= tot) { frame = 0; phase = 3; }
    } else if (phase === 3) {
      drawTrapdoor([0,0,64,64], 100, 100);
      var df = Math.floor(frame);
      var dd = 0;
      for (var m = 0; m < DESCEND.length; m++) {
        dd += DESCEND[m].d;
        if (df < dd) {
          var de = DESCEND[m];
          if (!de.hidden) drawSprite(sheets.isaac, de.c, AX, AY + de.y * S, 100, 100, de.sx, de.sy);
          break;
        }
      }
      if (df >= 13 && df < 15) drawPoof(df - 13, AX, AY + 10);
      var dtot = 0;
      for (var n = 0; n < DESCEND.length; n++) dtot += DESCEND[n].d;
      if (df >= dtot) { frame = 0; phase = 4; }
    } else if (phase === 4) {
      drawTrapdoor([0,0,64,64], 100, 100);
      var pf = Math.floor(frame);
      if (pf < POOF.length) drawPoof(pf, AX, AY + 10);
      if (pf >= 2) { makeFrozen(); frame = 0; phase = 5; }
    } else if (phase === 5) {
      if (frozen) {
        var block = Math.round(4 + frame * 1.5);
        if (block > 48) block = 48;
        var off = document.createElement("canvas");
        off.width = Math.max(2, Math.round(W / block));
        off.height = Math.max(2, Math.round(H / block));
        var octx = off.getContext("2d");
        octx.imageSmoothingEnabled = false;
        octx.drawImage(frozen, 0, 0, W, H, 0, 0, off.width, off.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        if (block >= 48 && frame >= 45) { frame = 0; phase = 6; }
      }
    } else if (phase === 6) {
      if (frozen) {
        var off = document.createElement("canvas");
        off.width = Math.max(2, Math.round(W / 48));
        off.height = Math.max(2, Math.round(H / 48));
        var octx = off.getContext("2d");
        octx.imageSmoothingEnabled = false;
        octx.drawImage(frozen, 0, 0, W, H, 0, 0, off.width, off.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(off, 0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
      }
      overlay.style.opacity = Math.max(0, 1 - frame / 30);
      if (frame >= 18) {
        playSfx(sfx.grunt);
        running = false;
        overlay.classList.add("hidden");
        overlay.style.opacity = 1;
      }
    }

    if (running) rafId = requestAnimationFrame(run);
  }

  function start() {
    if (running) return;
    if (!ready) {
      overlay.classList.add("hidden");
      return;
    }
    hint.textContent = "Click / press any key to skip";
    hint.classList.remove("centered");
    running = true;
    phase = 0;
    frame = 0;
    lastTime = 0;
    sfxPhase = -1;
    rafId = requestAnimationFrame(run);
  }

  function skip() {
    running = false;
    stopSfx();
    if (rafId) cancelAnimationFrame(rafId);
    overlay.classList.add("hidden");
  }

  var started = false;

  function firstInput() {
    if (started) {
      if (running) skip();
      return;
    }
    started = true;
    start();
  }

  function replay() {
    if (running) skip();
    started = false;
    overlay.classList.remove("hidden");
    overlay.style.opacity = 1;
    hint.textContent = "Click / press any key to boot";
    hint.classList.add("centered");
    running = false;
    phase = -1;
    frame = 0;
    lastTime = 0;
    sfxPhase = -1;
    frozen = null;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }

  window.replayBootIntro = replay;

  overlay.addEventListener("click", firstInput);
  document.addEventListener("keydown", firstInput);
  overlay.tabIndex = 0;

  setTimeout(function () {
    if (!ready && !started) overlay.classList.add("hidden");
  }, 4000);
})();

/* =========================================================
   WIDGETS APP IMPLEMENTATION
   ========================================================= */

(function initWidgets() {
  var desktop = document.getElementById("desktopWidgets");
  var preview = document.getElementById("widgetsPreview");
  if (!desktop || !preview) return;

  var widgetsKey = "isaacos_widgets_pinned";

  function loadPinned() {
    try { return JSON.parse(localStorage.getItem(widgetsKey) || "[]"); }
    catch (e) { return []; }
  }

  var pinned = loadPinned();
  if (pinned.indexOf("clock") === -1) {
    pinned.unshift("clock");
    savePinned();
  }

  function savePinned() {
    try { localStorage.setItem(widgetsKey, JSON.stringify(pinned)); } catch (e) {}
  }

  /* ---- individual widget state ---- */

  var todoKey = "isaacos_todo";
  var todoItems = [];
  try { todoItems = JSON.parse(localStorage.getItem(todoKey) || "[]"); } catch (e) { todoItems = []; }
  function saveTodo() {
    try { localStorage.setItem(todoKey, JSON.stringify(todoItems)); } catch (e) {}
  }

  /* ---- clock ---- */

  var clockHandH = null, clockHandM = null, clockHandS = null, clockDigit = null, clockSec = null, clockTimer = null;

  function renderClock() {
    if (!clockHandH) return;
    var d = new Date();
    var s = d.getSeconds(), m = d.getMinutes(), h24 = d.getHours(), h = h24 % 12;
    clockHandH.setAttribute("transform", "rotate(" + ((h + m / 60) * 30) + " 50 50)");
    clockHandM.setAttribute("transform", "rotate(" + ((m + s / 60) * 6) + " 50 50)");
    clockHandS.setAttribute("transform", "rotate(" + (s * 6) + " 50 50)");
    var p = function (n) { return n < 10 ? "0" + n : "" + n; };
    clockDigit.textContent = p(h24) + ":" + p(m);
    clockSec.textContent = p(s);
  }

  function buildClock() {
    var marks = "";
    for (var i = 0; i < 12; i++) {
      var a = (i * 30 * Math.PI) / 180;
      marks += '<line x1="' + (50 + 38 * Math.sin(a)) + '" y1="' + (50 - 38 * Math.cos(a)) +
               '" x2="' + (50 + 42 * Math.sin(a)) + '" y2="' + (50 - 42 * Math.cos(a)) +
               '" stroke="#e8d5a8" stroke-width="2" stroke-linecap="round"></line>';
    }
    return (
      '<div class="wclock-wrap">' +
        '<svg class="wclock-face" viewBox="0 0 100 100">' +
          '<circle cx="50" cy="50" r="44" fill="none" stroke="#e8d5a8" stroke-width="3"></circle>' + marks +
          '<line id="wclockH" x1="50" y1="50" x2="50" y2="30" stroke="#e8d5a8" stroke-width="4" stroke-linecap="round"></line>' +
          '<line id="wclockM" x1="50" y1="50" x2="50" y2="20" stroke="#e8d5a8" stroke-width="3" stroke-linecap="round"></line>' +
          '<line id="wclockS" x1="50" y1="52" x2="50" y2="16" stroke="#7a1010" stroke-width="1.5" stroke-linecap="round"></line>' +
          '<circle cx="50" cy="50" r="2.5" fill="#7a1010"></circle>' +
        '</svg>' +
        '<div><div class="wclock-digits" id="wclockDigit"></div><div class="wclock-secs" id="wclockSec"></div></div>' +
      '</div>'
    );
  }

  function startClock() {
    clockHandH = document.getElementById("wclockH");
    clockHandM = document.getElementById("wclockM");
    clockHandS = document.getElementById("wclockS");
    clockDigit = document.getElementById("wclockDigit");
    clockSec = document.getElementById("wclockSec");
    renderClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(renderClock, 1000);
  }

  function stopClock() {
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  /* ---- weather ---- */

  var weatherKey = "isaacos_weather";
  var weatherState = null;
  try { weatherState = JSON.parse(localStorage.getItem(weatherKey) || "null"); } catch (e) { weatherState = null; }
  var weatherLastFetch = 0;

  function wmoIcon(code, isDay) {
    if (code === 0) return isDay ? "☀" : "☾";
    if (code === 1 || code === 2) return isDay ? "⛅" : "☁";
    if (code === 3) return "☁";
    if (code === 45 || code === 48) return "🌫";
    if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return "🌦";
    if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67) return "☂";
    if (code === 71 || code === 73 || code === 75 || code === 77) return "❄";
    if (code === 80 || code === 81 || code === 82) return "☂";
    if (code === 85 || code === 86) return "❄";
    if (code === 95) return "⚡";
    if (code === 96 || code === 99) return "⛈";
    return "☁";
  }

  function wmoLabel(code) {
    if (code === 0) return "clear";
    if (code === 1) return "mainly clear";
    if (code === 2) return "partly cloudy";
    if (code === 3) return "overcast";
    if (code === 45 || code === 48) return "fog";
    if (code === 51 || code === 53 || code === 55) return "drizzle";
    if (code === 56 || code === 57) return "freezing drizzle";
    if (code === 61 || code === 63 || code === 65) return "rain";
    if (code === 66 || code === 67) return "freezing rain";
    if (code === 71 || code === 73 || code === 75) return "snow";
    if (code === 77) return "snow grains";
    if (code === 80 || code === 81 || code === 82) return "rain showers";
    if (code === 85 || code === 86) return "snow showers";
    if (code === 95) return "thunderstorm";
    if (code === 96 || code === 99) return "thunderstorm with hail";
    return "unknown";
  }

  function weatherSave() {
    try {
      localStorage.setItem(weatherKey, JSON.stringify(weatherState ? { name: weatherState.name, lat: weatherState.lat, lon: weatherState.lon } : null));
    } catch (e) {}
  }

  function weatherCardRefresh() {
    var card = document.querySelector('#desktopWidgets .widget-card[data-widget="weather"]');
    if (card) card.outerHTML = cardHtml("weather");
  }

  function weatherFetch() {
    if (!weatherState) return;
    var now = Date.now();
    if (now - weatherLastFetch < 60000) return;
    weatherLastFetch = now;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + weatherState.lat +
      "&longitude=" + weatherState.lon + "&current=temperature_2m,weather_code,is_day&timezone=auto";
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.current) return;
      weatherState.temp = d.current.temperature_2m;
      weatherState.code = d.current.weather_code;
      weatherState.isDay = d.current.is_day === 1;
      weatherCardRefresh();
    }).catch(function () {});
  }

  function weatherGeocode(q) {
    var url = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(q) + "&count=1&language=en&format=json";
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.results || !d.results.length) return null;
      var r = d.results[0];
      return { name: r.name + (r.country ? ", " + r.country : ""), lat: r.latitude, lon: r.longitude };
    });
  }

  function weatherSetCity(q) {
    weatherGeocode(q).then(function (loc) {
      if (!loc) {
        var wl = document.querySelector('#desktopWidgets .widget-card[data-widget="weather"] .wweather-label');
        if (wl) wl.textContent = "city not found";
        return;
      }
      weatherState = { name: loc.name, lat: loc.lat, lon: loc.lon };
      weatherSave();
      delete weatherState.temp;
      delete weatherState.code;
      delete weatherState.isDay;
      weatherLastFetch = 0;
      weatherCardRefresh();
      weatherFetch();
    });
  }

  function buildWeather() {
    var w = weatherState;
    var icon = "☁", label = "set a city to get weather", temp = "--";
    if (w && w.temp !== undefined) {
      icon = wmoIcon(w.code, w.isDay);
      label = wmoLabel(w.code);
      temp = Math.round(w.temp) + "°C";
    }
    return (
      '<div class="wweather">' +
        '<span class="wweather-icon">' + icon + '</span>' +
        '<div>' +
          '<div class="wweather-temp">' + temp + '</div>' +
          '<div class="wweather-label">' + label + '</div>' +
          (w ? '<div class="wweather-city">' + compEsc(w.name) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="wweather-setup">' +
        '<input class="wweather-input" placeholder="city..." value="">' +
        '<button class="wweather-go" data-waction="weather-go">set</button>' +
      '</div>'
    );
  }

  /* ---- calendar ---- */

  function buildCalendar() {
    var d = new Date();
    var year = d.getFullYear(), month = d.getMonth(), today = d.getDate();
    var firstDay = new Date(year, month, 1).getDay();
    var days = new Date(year, month + 1, 0).getDate();
    var names = ["S", "M", "T", "W", "T", "F", "S"];
    var html = '<div class="wcalendar"><div class="wcalendar-title">' +
      d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) +
      '</div><div class="wcalendar-grid">';
    names.forEach(function (n) { html += '<div class="wcalendar-dow">' + n + '</div>'; });
    for (var i = 0; i < firstDay; i++) html += '<div class="wcalendar-day blank">·</div>';
    for (var day = 1; day <= days; day++) {
      html += '<div class="wcalendar-day' + (day === today ? " today" : "") + '">' + day + '</div>';
    }
    return html + '</div></div>';
  }

  /* ---- todo ---- */

  function todoHtml() {
    var html = '<div class="wtodo"><div class="wtodo-inputrow">' +
      '<input class="wtodo-input" id="wtodoInput" placeholder="remember to..." maxlength="60">' +
      '<button class="wtodo-add" data-waction="todo-add">add</button>' +
      '</div><div class="wtodo-list" id="wtodoList">';
    if (todoItems.length === 0) {
      html += '<div class="wcalendar-title">nothing to do. lucky.</div>';
    }
    todoItems.forEach(function (it, idx) {
      html += '<div class="wtodo-item">' +
        '<span class="wtodo-check' + (it.done ? " done" : "") + '" data-waction="todo-toggle" data-idx="' + idx + '">' + (it.done ? "✓" : "") + '</span>' +
        '<span class="wtodo-text' + (it.done ? " done" : "") + '">' + compEsc(it.t) + '</span>' +
        '<button class="wtodo-del" data-waction="todo-del" data-idx="' + idx + '">✕</button>' +
      '</div>';
    });
    return html + '</div></div>';
  }

  /* ---- timer ---- */

  var timerLeft = 25 * 60;
  var timerRunning = false;
  var timerTimer = null;
  var timerTextEl = null, timerRingEl = null;

  var TIMER_R = 44;
  var TIMER_C = 2 * Math.PI * TIMER_R;

  function timerRender() {
    if (!timerTextEl) return;
    var frac = timerLeft / (25 * 60);
    var p = function (n) { return n < 10 ? "0" + n : "" + n; };
    timerTextEl.textContent = p(Math.floor(timerLeft / 60)) + ":" + p(timerLeft % 60);
    timerRingEl.setAttribute("stroke-dashoffset", TIMER_C * (1 - frac));
  }

  function timerTick() {
    timerLeft--;
    if (timerLeft <= 0) {
      timerLeft = 0;
      stopTimer();
    }
    timerRender();
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerTimer = setInterval(timerTick, 1000);
  }

  function stopTimer() {
    timerRunning = false;
    if (timerTimer) { clearInterval(timerTimer); timerTimer = null; }
  }

  function resetTimer() {
    stopTimer();
    timerLeft = 25 * 60;
    timerRender();
  }

  function buildTimer() {
    return (
      '<div class="wtimer">' +
        '<svg class="wtimer-ring" viewBox="0 0 100 100">' +
          '<circle cx="50" cy="50" r="' + TIMER_R + '" fill="none" stroke="#241a14" stroke-width="6"></circle>' +
          '<circle id="wtimerRing" cx="50" cy="50" r="' + TIMER_R + '" fill="none" stroke="#690e0e" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + TIMER_C + '" stroke-dashoffset="0" transform="rotate(-90 50 50)"></circle>' +
          '<text id="wtimerText" x="50" y="57" text-anchor="middle" font-family="VT323, monospace" font-size="22" fill="#e8d5a8"></text>' +
        '</svg>' +
        '<div class="wtimer-btns">' +
          '<button class="wtimer-btn start" data-waction="timer-start">start</button>' +
          '<button class="wtimer-btn reset" data-waction="timer-reset">reset</button>' +
        '</div>' +
      '</div>'
    );
  }

  function syncTimer() {
    timerTextEl = document.getElementById("wtimerText");
    timerRingEl = document.getElementById("wtimerRing");
    if (timerTextEl) timerRender();
  }

  /* ---- mom ---- */

  var momLines = [
    "i will do my best to save him, my lord.",
    "i will follow your instructions, lord. i have faith in thee.",
    "yes lord, anything!",
    "i will do as i'm told, my lord. i love you above all else.",
    "isaac!",
    "isaac... what are you drawing?",
    "give it to me now.",
    "this is what you think of me? this is what i am to you?! a monster?!",
    "i'll show you a monster!",
    "you are just like your father... i can't even look at you.",
    "how could you?! you're just like him!",
    "our father who art in heaven, hallowed be thy name..."
  ];
  var momIdx = Math.floor(Math.random() * momLines.length);

  function buildMom() {
    return (
      '<div class="wmom">' +
        '<img class="wmom-avatar" src="img/avatar-isaac.png" alt="">' +
        '<div class="wmom-text">' + momLines[momIdx] +
          '<div class="wmom-sign">— mom says</div>' +
        '</div>' +
        '<button class="wmom-reroll" data-waction="mom-reroll">⟳</button>' +
      '</div>'
    );
  }

  /* ---- item of the day ---- */

  var iodKey = "isaacos_iod";
  var iodState = null;
  try { iodState = JSON.parse(localStorage.getItem(iodKey) || "null"); } catch (e) { iodState = null; }

  function iodDay() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function iodToday() {
    var day = iodDay();
    if (!iodState || iodState.date !== day) iodState = { date: day, override: -1 };
    return iodState;
  }

  function iodSave() {
    try { localStorage.setItem(iodKey, JSON.stringify(iodState)); } catch (e) {}
  }

  function iodDailyIndex(len) {
    var d = new Date();
    var seed = (d.getFullYear() + 1) * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    var x = Math.sin(seed) * 10000;
    var idx = Math.floor((x - Math.floor(x)) * len);
    return idx % len;
  }

  function buildIod() {
    var items = window.ISAAC_ITEMS || [];
    if (!items.length) return '<div class="wiod wiod-empty">no items available</div>';
    var st = iodToday();
    var item = st.override >= 0 ? items[st.override % items.length] : items[iodDailyIndex(items.length)];
    if (!item) return '<div class="wiod wiod-empty">no item today</div>';
    var used = st.override >= 0;
    return (
      '<div class="wiod">' +
        '<img class="wiod-icon" src="' + (item.icon || "") + '" alt="" loading="lazy">' +
        '<div class="wiod-body">' +
          '<div class="wiod-name">' + item.name + '</div>' +
          '<div class="wiod-quote">"' + (item.quote || "") + '"</div>' +
          '<div class="wiod-desc">' + (item.description || "") + '</div>' +
        '</div>' +
        '<button class="wiod-reroll' + (used ? " used" : "") + '" data-waction="iod-reroll" title="' + (used ? "reroll used for today" : "reroll (once per day)") + '">' +
          '<img class="wiod-reroll-icon" src="img/Collectible_The_D6_icon.webp" alt="reroll">' +
        '</button>' +
      '</div>'
    );
  }

  /* ---- render grid ---- */

  var builders = {
    clock: buildClock,
    weather: buildWeather,
    calendar: buildCalendar,
    todo: todoHtml,
    timer: buildTimer,
    mom: buildMom,
    iod: buildIod
  };

  function cardHtml(id) {
    var names = { clock: "Clock", weather: "Weather", calendar: "Calendar", todo: "To-do", timer: "Timer", mom: "Mom says", iod: "Item of the day" };
    var glyphs = { clock: "◷", weather: "☂", calendar: "▦", todo: "✎", timer: "⏱", mom: "✍", iod: "★" };
    return '<div class="widget-card" data-widget="' + id + '">' +
      '<div class="widget-card-head"><span class="widget-card-title">' + names[id] + '</span><span class="wcalendar-title">' + glyphs[id] + '</span></div>' +
      builders[id]() +
    '</div>';
  }

  function syncWidgets() {
    var clockVisible = pinned.indexOf("clock") !== -1;
    if (clockVisible) startClock(); else stopClock();
    syncTimer();
    if (pinned.indexOf("weather") !== -1 && weatherState) weatherFetch();
  }

  function renderGrid() {
    desktop.innerHTML = "";
    if (pinned.length === 0) {
      stopClock();
      return;
    }
    var html = "";
    pinned.forEach(function (id) {
      if (builders[id]) html += cardHtml(id);
    });
    desktop.innerHTML = html;
    syncWidgets();
  }

  /* ---- events ---- */

  function renderPreviews() {
    preview.innerHTML = "";
    var colA = document.createElement("div");
    colA.className = "wp-col";
    var colB = document.createElement("div");
    colB.className = "wp-col";
    var ids = Object.keys(builders);
    ids.forEach(function (id, i) {
      var item = document.createElement("div");
      item.className = "widgets-preview-item" + (pinned.indexOf(id) !== -1 ? " active" : "");
      item.setAttribute("data-widget", id);
      item.innerHTML = cardHtml(id);
      (i % 2 === 0 ? colA : colB).appendChild(item);
    });
    preview.appendChild(colA);
    preview.appendChild(colB);
  }

  preview.addEventListener("click", function (e) {
    var item = e.target.closest(".widgets-preview-item");
    if (!item) return;
    var id = item.getAttribute("data-widget");
    var idx = pinned.indexOf(id);
    if (idx === -1) pinned.push(id);
    else pinned.splice(idx, 1);
    savePinned();
    renderGrid();
    renderPreviews();
  });

  desktop.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-waction]");
    if (!btn) return;
    var action = btn.getAttribute("data-waction");
    var card = btn.closest(".widget-card");

    if (action === "weather-go") {
      var inp = card ? card.querySelector(".wweather-input") : null;
      var q = (inp && inp.value || "").trim();
      if (q) weatherSetCity(q);
      return;
    }

    if (action === "todo-add") {
      var input = document.getElementById("wtodoInput");
      var val = (input.value || "").trim();
      if (!val) return;
      todoItems.push({ t: val, done: false });
      saveTodo();
      if (card) card.outerHTML = cardHtml("todo");
      var ni = document.getElementById("wtodoInput");
      if (ni) ni.focus();
      return;
    }

    if (action === "todo-toggle") {
      var ti = parseInt(btn.getAttribute("data-idx"), 10);
      if (!isNaN(ti) && todoItems[ti]) todoItems[ti].done = !todoItems[ti].done;
      saveTodo();
      if (card) card.outerHTML = cardHtml("todo");
      return;
    }

    if (action === "todo-del") {
      var di = parseInt(btn.getAttribute("data-idx"), 10);
      if (!isNaN(di)) todoItems.splice(di, 1);
      saveTodo();
      if (card) card.outerHTML = cardHtml("todo");
      return;
    }

    if (action === "timer-start") {
      var btnEl = btn;
      if (timerRunning) {
        stopTimer();
        btnEl.textContent = "start";
      } else {
        if (timerLeft <= 0) { timerLeft = 25 * 60; }
        startTimer();
        btnEl.textContent = "pause";
      }
      return;
    }

    if (action === "timer-reset") {
      resetTimer();
      var startBtn = desktop.querySelector("[data-waction='timer-start']");
      if (startBtn) startBtn.textContent = "start";
      return;
    }

    if (action === "mom-reroll") {
      momIdx = (momIdx + 1) % momLines.length;
      if (card) card.outerHTML = cardHtml("mom");
      return;
    }

    if (action === "iod-reroll") {
      var iodItems = window.ISAAC_ITEMS || [];
      if (iodItems.length && iodToday().override < 0) {
        iodState.override = Math.floor(Math.random() * iodItems.length);
        iodSave();
        if (card) card.outerHTML = cardHtml("iod");
      }
      return;
    }
  });

  desktop.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.classList.contains("wtodo-input")) {
      var input = e.target;
      var val = (input.value || "").trim();
      if (!val) return;
      todoItems.push({ t: val, done: false });
      saveTodo();
      var card = input.closest(".widget-card");
      if (card) card.outerHTML = cardHtml("todo");
      var ni = document.getElementById("wtodoInput");
      if (ni) ni.focus();
    }
    if (e.key === "Enter" && e.target.classList.contains("wweather-input")) {
      var wq = (e.target.value || "").trim();
      if (wq) weatherSetCity(wq);
    }
  });

  /* ---- init ---- */

  renderPreviews();
  renderGrid();
})();
