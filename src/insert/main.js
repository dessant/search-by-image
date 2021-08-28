import browser from 'webextension-polyfill';

import storage from 'storage/storage';

self.touchTarget = {
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

      browser.runtime.sendMessage({
        id: 'routeMessage',
        setSenderFrameId: true,
        messageFrameId: 0,
        message: {
          id: 'messageView',
          message: {id: 'imageSelectionSubmit'},
          flattenMessage: true
        }
      });
    }
  }
}

self.addTouchListener = function () {
  handleTouch = true;
};

self.removeTouchListener = function () {
  handleTouch = false;
};

self.showPointer = function () {
  if (!pointerCss) {
    pointerCss = document.createElement('link');
    pointerCss.href = chrome.runtime.getURL('/src/select/pointer.css');
    pointerCss.rel = 'stylesheet';
    document.head.appendChild(pointerCss);
  }
};

self.hidePointer = function () {
  if (pointerCss) {
    pointerCss.remove();
    pointerCss = null;
  }
};

async function checkTask() {
  const {taskRegistry} = await storage.get('taskRegistry');
  if (Date.now() - taskRegistry.lastTaskStart < 600000) {
    await browser.runtime.sendMessage({id: 'taskRequest'});
  }
}

function init() {
  window.addEventListener('contextmenu', saveTouchTarget, {
    capture: true,
    passive: true
  });

  window.addEventListener('mousedown', onMouseDown, {
    capture: true,
    passive: true
  });
  window.addEventListener('click', onClick, {capture: true, passive: false});

  if (window.top === window) {
    if (document.readyState === 'complete') {
      checkTask();
    } else {
      window.addEventListener('load', checkTask);
    }
  }
}

init();
