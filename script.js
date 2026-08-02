// Clock
function updateTime() {
  var now = new Date().toLocaleString();
  document.querySelector("#timeElement").innerHTML = now;
}
setInterval(updateTime, 1000);
updateTime();

// --- Scale OS to fit the screen (enables nested OS-in-OS recursion) ---

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

  return element;
}

var openApps = {};

function openWindow(element) {
  element.style.display = "flex";
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
  openApps[element.id] = "open";
  renderDock();
}

function closeWindow(element) {
  element.style.display = "none";
  openApps[element.id] = "closed";
  renderDock();
}

function minWindow(element) {
  element.style.display = "none";
  openApps[element.id] = "minimized";
  renderDock();
}

function renderDock(){
  var dock = document.querySelector("#dock");
  dock.innerHTML = "";

  var ids = ["welcome", "notes", "contacts", "browser", "calculator"];
  ids.forEach(function (id) {
    if (openApps[id] !== "open" && openApps[id] !== "minimized") return;

    var iconImg = document.querySelector("#" + id + "icon img");
    var src = iconImg ? iconImg.src : "https://images.squarespace-cdn.com/content/v1/61c0ba022ed26d6e4203a094/41e6bec2-60cb-47f6-8199-0c9e52f63f52/TBOI-ICO-Isaac.png?format=300w";
    var item = document.createElement("div");
    item.className = "dock-item" + (openApps[id] === "minimized" ? " minimized" : "");
    item.innerHTML = '<img src="' + src + '" alt="' + id + '">';

    item.addEventListener("click", function () {
      openWindow(document.getElementById(id));
    });

    dock.appendChild(item);
  });
}

// Draggable window
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
    if (!osContainer) return 1;
    var match = osContainer.style.transform.match(/scale\(([\d.]+)\)/);
    return match ? parseFloat(match[1]) : 1;
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

// --- Icon selection ---

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

// --- Open welcome + apps ---

function initializeApp(id) {
  var screen = initializeWindow(id);
  var icon = document.querySelector("#" + id + "icon");

  icon.addEventListener("click", function () {
    handleIconTap(icon);
    openWindow(screen);
  });

  return screen;
}

var welcomeScreen = initializeWindow("welcome");
var welcomeScreenOpen = document.querySelector("#welcomeopen");

openApps["welcome"] = "open";
renderDock();

welcomeScreenOpen.addEventListener("click", function () {
  openWindow(welcomeScreen);
});

var notesScreen = initializeApp("notes");
var contactsScreen = initializeApp("contacts");
var browserScreen = initializeApp("browser");
var calculatorScreen = initializeApp("calculator");

// --- Calculator app ---

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

// --- Browser app ---

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

// --- Notes app content ---

var defaultContent = [
  {
    title: "isaac's diary",
    date: "31/07/2026",
    content: `
      <h2>isaac's diary</h2>
      <p>
        mom, you crazy
      </p>
      <blockquote>
        Eeugh.
        ~ Isaac
      </blockquote>
      <p>blue baby where u at</p>
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
    title: "Nuova nota",
    date: new Date().toLocaleDateString("it-IT"),
    content: "<h2>Nuova nota</h2><p></p>"
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
