import storage from 'storage/storage';
import {isIncomingShareContext, processIncomingShare} from 'utils/app';

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

  function saveTargetNode(ev) {
    touchTarget.node = ev.composedPath()[0];
  }

  function saveTouchStart(ev) {
    touchTarget.dx = ev.pageX;
    touchTarget.dy = ev.pageY;
  }

  function saveTouchEnd(ev) {
    touchTarget.ux = ev.pageX;
    touchTarget.uy = ev.pageY;
  }

  function initTouchTarget(ev) {
    touchTarget.node = null;
    saveTouchStart(ev);
    saveTouchEnd(ev);
  }

  function onPointerDown(ev) {
    initTouchTarget(ev);

    if (handleTouch) {
      stopEvent(ev);
    }
  }

  function onPointerUp(ev) {
    saveTouchEnd(ev);

    if (handleTouch) {
      saveTargetNode(ev);
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

  function onContextMenu(ev) {
    saveTouchEnd(ev);
    saveTargetNode(ev);
  }

  function ignoreEvent(ev) {
    if (handleTouch) {
      stopEvent(ev);
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
      pointerCss.href = browser.runtime.getURL('/src/select/pointer.css');
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

  window.addEventListener('pointerdown', onPointerDown, {
    capture: true,
    passive: false
  });
  window.addEventListener('pointerup', onPointerUp, {
    capture: true,
    passive: false
  });
  window.addEventListener('contextmenu', onContextMenu, {
    capture: true,
    passive: true
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
    if (isIncomingShareContext()) {
      processIncomingShare();
    } else {
      checkTask();
    }
  }
}

main();
