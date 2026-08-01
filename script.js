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

  var offsetX = (window.innerWidth - window.innerWidth * scale) / 2;
  var offsetY = (window.innerHeight - window.innerHeight * scale) / 2;

  osContainer.style.transform = "scale(" + scale + ")";
  osContainer.style.left = offsetX + "px";
  osContainer.style.top = offsetY + "px";
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

function openWindow(element) {
  element.style.display = "flex";
  biggestIndex++;
  element.style.zIndex = biggestIndex;
  topBar.style.zIndex = biggestIndex + 1;
}

function closeWindow(element) {
  element.style.display = "none";
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
      closeWindow(element);
    });
  }

  return element;
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

var welcomeScreen = initializeWindow("welcome");
var welcomeScreenOpen = document.querySelector("#welcomeopen");

welcomeScreenOpen.addEventListener("click", function () {
  openWindow(welcomeScreen);
});

function initializeApp(id) {
  var screen = initializeWindow(id);
  var icon = document.querySelector("#" + id + "icon");

  icon.addEventListener("click", function () {
    handleIconTap(icon);
    openWindow(screen);
  });

  return screen;
}

var notesScreen = initializeApp("notes");
var contactsScreen = initializeApp("contacts");
var browserScreen = initializeApp("browser");

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

var content = [
  {
    title: "il diario di isaac",
    date: "31/07/2026",
    content: `
      <h2>il diario di isaac</h2>
      <p>
        mamma tu sei pazza
      </p>
      <blockquote>
        Eeugh.
        ~ Isaac
      </blockquote>
      <p>viva la cacca i guess? blue baby where u at</p>
    `
  }
];

var sidebar = document.querySelector("#sidebar");
var noteContent = document.querySelector("#noteContent");
var currentIndex = 0;

function setNotesContent(index) {
  currentIndex = index;
  var note = content[index];
  noteContent.innerHTML = note.content;
}

noteContent.addEventListener("input", function () {
  var heading = noteContent.querySelector("h2");
  if (heading) {
    var item = sidebar.querySelectorAll(".sidebar-item")[currentIndex];
    var title = item.querySelector(".item-title");
    title.innerHTML = heading.textContent;
  }
});

function addToSideBar(index) {
  var note = content[index];

  var newDiv = document.createElement("div");
  newDiv.classList.add("sidebar-item");
  newDiv.innerHTML = `
    <p class="item-title">${note.title}</p>
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

  sidebar.appendChild(newDiv);
}

for (var i = 0; i < content.length; i++) {
  addToSideBar(i);
}

setNotesContent(0);
sidebar.querySelector(".sidebar-item").classList.add("active");
