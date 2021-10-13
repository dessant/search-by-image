import browser from 'webextension-polyfill';

import storage from 'storage/storage';

function main() {
  // Script may be injected multiple times.
  if (self.baseModule) {
    return;
  } else {
    self.baseModule = true;
  }

  self.touchTarget = {
    node: null,
    dx: 0,
    dy: 0,
    ux: 0,
    uy: 0
  };

  self.pointerCss = null;
  self.handleTouch = false;

  function stopEvent(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  function saveTouchTarget(ev) {
    touchTarget.ux = ev.pageX;
    touchTarget.uy = ev.pageY;
    touchTarget.node = ev.composedPath()[0];
  }

  function ignoreEvent(ev) {
    if (handleTouch) {
      stopEvent(ev);
    }
  }

  function onPointerDown(ev) {
    if (handleTouch) {
      touchTarget.dx = ev.pageX;
      touchTarget.dy = ev.pageY;

      stopEvent(ev);
    }
  }

  function onPointerUp(ev) {
    if (handleTouch) {
      saveTouchTarget(ev);
      stopEvent(ev);

      if (
        Math.abs(touchTarget.dx - touchTarget.ux) <= 24 &&
        Math.abs(touchTarget.dy - touchTarget.uy) <= 24
      ) {
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
    if (document.readyState !== 'complete') {
      document.addEventListener('readystatechange', checkTask, {once: true});
      return;
    }

    const {taskRegistry} = await storage.get('taskRegistry');
    if (Date.now() - taskRegistry.lastTaskStart < 600000) {
      await browser.runtime.sendMessage({id: 'taskRequest'});
    }
  }

  window.addEventListener('contextmenu', saveTouchTarget, {
    capture: true,
    passive: true
  });

  window.addEventListener('pointerdown', onPointerDown, {
    capture: true,
    passive: false
  });
  window.addEventListener('pointerup', onPointerUp, {
    capture: true,
    passive: false
  });

  const extraEvents = [
    // 'touchstart', // prevents scrolling on mobile
    'touchend',
    'mousedown',
    'mouseup',
    'click'
  ];
  for (const event of extraEvents) {
    window.addEventListener(event, ignoreEvent, {
      capture: true,
      passive: false
    });
  }

  if (window.top === window) {
    checkTask();
  }
}

main();
