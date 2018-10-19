var frameStore = {
  modules: {
    manifest: false,
    parse: false,
    confirm: false,
    select: false,
    capture: false
  },
  data: {
    engine: '',
    eventOrigin: '',
    selectFrameId: 0,
    confirmFrameId: 0,
    captureFrameId: 0
  }
};

var clickTarget = {
  node: null,
  dx: 0,
  dy: 0,
  ux: 0,
  uy: 0
};

var pointerCss = null;

function saveClickTarget(e) {
  clickTarget.ux = e.pageX;
  clickTarget.uy = e.pageY;
  clickTarget.node = e.target;
}

function onMouseDown(e) {
  clickTarget.dx = e.pageX;
  clickTarget.dy = e.pageY;
}

function onClick(e) {
  saveClickTarget(e);
  if (
    Math.abs(clickTarget.dx - clickTarget.ux) <= 24 &&
    Math.abs(clickTarget.dy - clickTarget.uy) <= 24
  ) {
    e.preventDefault();
    e.stopImmediatePropagation();
    chrome.runtime.sendMessage({
      id: 'imageSelectionSubmit',
      engine: frameStore.data.engine
    });
  }
}

function addClickListener() {
  window.addEventListener('mousedown', onMouseDown, {capture: true});
  window.addEventListener('click', onClick, {capture: true});
}

function removeClickListener() {
  window.removeEventListener('mousedown', onMouseDown, {capture: true});
  window.removeEventListener('click', onClick, {capture: true});
}

function showPointer() {
  if (!pointerCss) {
    pointerCss = document.createElement('link');
    pointerCss.href = chrome.extension.getURL('/src/select/pointer.css');
    pointerCss.rel = 'stylesheet';
    document.head.appendChild(pointerCss);
  }
}

function hidePointer() {
  if (pointerCss) {
    pointerCss.remove();
    pointerCss = null;
  }
}

window.addEventListener('contextmenu', saveClickTarget, {
  capture: true,
  passive: true
});
