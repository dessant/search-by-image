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

var touchTarget = {
  node: null,
  dx: 0,
  dy: 0,
  ux: 0,
  uy: 0
};

var pointerCss = null;
var handleTouch = false;

function saveTouchTarget(ev) {
  touchTarget.ux = ev.pageX;
  touchTarget.uy = ev.pageY;
  touchTarget.node = ev.composedPath()[0];
}

function onMouseDown(ev) {
  if (handleTouch) {
    touchTarget.dx = ev.pageX;
    touchTarget.dy = ev.pageY;
  }
}

function onClick(ev) {
  if (handleTouch) {
    saveTouchTarget(ev);
    if (
      Math.abs(touchTarget.dx - touchTarget.ux) <= 24 &&
      Math.abs(touchTarget.dy - touchTarget.uy) <= 24
    ) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      chrome.runtime.sendMessage({
        id: 'imageSelectionSubmit',
        engine: frameStore.data.engine
      });
    }
  }
}

function addTouchListener() {
  handleTouch = true;
}

function removeTouchListener() {
  handleTouch = false;
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

window.addEventListener('contextmenu', saveTouchTarget, {
  capture: true,
  passive: true
});

window.addEventListener('mousedown', onMouseDown, {
  capture: true,
  passive: true
});
window.addEventListener('click', onClick, {capture: true, passive: false});
