// Clock
function updateTime() {
  var now = new Date().toLocaleString();
  document.querySelector("#timeElement").innerHTML = now;
}
setInterval(updateTime, 1000);
updateTime();

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

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    currentX = initialX - e.clientX;
    currentY = initialY - e.clientY;
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
