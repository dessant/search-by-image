function makeDocumentVisibleScript(eventName) {
  let visibilityState = document.visibilityState;

  function updateVisibilityState(ev) {
    visibilityState = ev.detail;
  }

  document.addEventListener(eventName, updateVisibilityState, {
    capture: true
  });

  let lastCallTime = 0;
  window.requestAnimationFrame = new Proxy(window.requestAnimationFrame, {
    apply(target, thisArg, argumentsList) {
      if (visibilityState === 'visible') {
        return Reflect.apply(target, thisArg, argumentsList);
      } else {
        const currentTime = Date.now();
        const callDelay = Math.max(0, 16 - (currentTime - lastCallTime));

        lastCallTime = currentTime + callDelay;

        const timeoutId = window.setTimeout(function () {
          argumentsList[0](performance.now());
        }, callDelay);

        return timeoutId;
      }
    }
  });

  window.cancelAnimationFrame = new Proxy(window.cancelAnimationFrame, {
    apply(target, thisArg, argumentsList) {
      if (visibilityState === 'visible') {
        return Reflect.apply(target, thisArg, argumentsList);
      } else {
        window.clearTimeout(argumentsList[0]);
      }
    }
  });

  Object.defineProperty(document, 'visibilityState', {
    get() {
      return 'visible';
    }
  });

  Object.defineProperty(document, 'hidden', {
    get() {
      return false;
    }
  });

  Document.prototype.hasFocus = function () {
    return true;
  };

  function stopEvent(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  window.addEventListener('pagehide', stopEvent, {capture: true});
  window.addEventListener('blur', stopEvent, {capture: true});

  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new PageTransitionEvent('pageshow'));
  window.dispatchEvent(new FocusEvent('focus'));
}

function setFileInputDataScript(eventName) {
  function dataUrlToFile(dataUrl, mimeType, filename) {
    const [meta, data] = dataUrl.split(',');

    let byteString;
    if (meta.endsWith(';base64')) {
      byteString = atob(data);
    } else {
      byteString = unescape(data);
    }
    const length = byteString.length;

    const array = new Uint8Array(new ArrayBuffer(length));
    for (let i = 0; i < length; i++) {
      array[i] = byteString.charCodeAt(i);
    }

    return new File([array], filename, {type: mimeType});
  }

  function patchFileInputProperty(data) {
    const fileData = dataUrlToFile(
      data.imageDataUrl,
      data.imageType,
      data.imageFilename
    );

    class FileList extends Array {
      item(index) {
        return this[index];
      }
    }
    const files = new FileList(fileData);

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'files'
    );
    const descriptorGet = descriptor.get;
    descriptor.get = function () {
      const input = document.querySelector(data.selector);
      if (this.isSameNode(input)) {
        return files;
      } else {
        return descriptorGet.apply(this);
      }
    };
    Object.defineProperty(HTMLInputElement.prototype, 'files', descriptor);
  }

  const onMessage = function (ev) {
    ev.stopImmediatePropagation();
    window.clearTimeout(timeoutId);

    patchFileInputProperty(JSON.parse(ev.detail));
  };

  const timeoutId = window.setTimeout(function () {
    document.removeEventListener(eventName, onMessage, {
      capture: true,
      once: true
    });
  }, 10000); // 10 seconds

  document.addEventListener(eventName, onMessage, {
    capture: true,
    once: true
  });
}

function hideAlertScript() {
  window.alert = function () {};
}

function lexicaOverrideEventDispatchScript() {
  const inputDispatchEvent = HTMLInputElement.prototype.dispatchEvent;

  HTMLInputElement.prototype.dispatchEvent = function (ev) {
    if (this.type === 'file' && ev.type === 'click') {
      HTMLInputElement.prototype.dispatchEvent = inputDispatchEvent;
    } else {
      inputDispatchEvent.apply(this, arguments);
    }
  };
}

function taobaoPatchContextScript() {
  const appendChildFn = Element.prototype.appendChild;
  Element.prototype.appendChild = function (node) {
    if (node.type === 'file') {
      node.addEventListener('click', ev => ev.preventDefault(), {
        capture: true,
        once: true
      });

      Element.prototype.appendChild = appendChildFn;
    }

    return appendChildFn.apply(this, arguments);
  };

  const openFn = window.open;
  window.open = function (url) {
    if (url.includes('/tmw/search_image')) {
      window.location.replace(url);
    } else {
      return openFn.apply(this, arguments);
    }
  };
}

function yandexServiceObserverScript(eventName) {
  let stop;

  const checkService = function () {
    if (window.Ya?.reactBus?.e['cbir:search-by-image:start']?.length >= 4) {
      window.clearTimeout(timeoutId);
      document.dispatchEvent(new Event(eventName));
    } else if (!stop) {
      window.setTimeout(checkService, 200);
    }
  };

  const timeoutId = window.setTimeout(function () {
    stop = true;
  }, 60000); // 1 minute

  checkService();
}

const scriptFunctions = {
  makeDocumentVisible: makeDocumentVisibleScript,
  setFileInputData: setFileInputDataScript,
  hideAlert: hideAlertScript,
  lexicaOverrideEventDispatch: lexicaOverrideEventDispatchScript,
  taobaoPatchContext: taobaoPatchContextScript,
  yandexServiceObserver: yandexServiceObserverScript
};

function getScriptFunction(func) {
  return scriptFunctions[func];
}

export {getScriptFunction};
