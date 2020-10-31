import browser from 'webextension-polyfill';

var contentStorage = {
  viewFrame: null,
  viewFrameId: 0,
  queuedMessage: null
};

function showView(view) {
  const currentView = contentStorage.viewFrame.id;
  if (currentView !== view) {
    contentStorage.viewFrameId = 0;

    if (currentView) {
      window.setTimeout(function () {
        contentStorage.viewFrame.id = view;
      }, 100);

      browser.runtime.sendMessage({
        id: 'discardView',
        view: currentView
      });
    } else {
      contentStorage.viewFrame.id = view;
    }

    contentStorage.viewFrame.src = browser.extension.getURL(
      `/src/${view}/index.html`
    );
  }

  contentStorage.viewFrame.classList.remove('hidden');
}

function hideView() {
  window.setTimeout(function () {
    contentStorage.viewFrame.classList.add('hidden');
    document.body.focus();
  }, 300);
}

function messageView(message) {
  if (contentStorage.viewFrameId) {
    browser.runtime.sendMessage({
      id: 'routeMessage',
      messageFrameId: contentStorage.viewFrameId,
      message
    });
  } else {
    contentStorage.queuedMessage = message;
  }
}

function onMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === document.URL) {
    return;
  }

  if (request.id === 'openView') {
    showView(request.view);
    messageView(request);
  } else if (request.id === 'closeView') {
    if (request.messageView) {
      messageView({id: request.id});
    }
    hideView();
  } else if (request.id === 'messageView') {
    const message = request.message;
    if (request.flattenMessage) {
      delete request.id;
      delete request.message;
      Object.assign(message, request);
    }

    messageView(message);
  } else if (request.id === 'saveFrameId') {
    if (!contentStorage.viewFrameId) {
      contentStorage.viewFrameId = request.senderFrameId;
      if (contentStorage.queuedMessage) {
        messageView(contentStorage.queuedMessage);
        contentStorage.queuedMessage = null;
      }
    }
  }
}

self.initContent = function () {
  const shadowHost = document.createElement('div');
  const shadowRoot = shadowHost.attachShadow({mode: 'closed'});

  const css = document.createElement('link');
  css.setAttribute('rel', 'stylesheet');
  css.setAttribute('href', browser.extension.getURL('/src/content/style.css'));
  shadowRoot.appendChild(css);

  const viewFrame = document.createElement('iframe');
  viewFrame.classList.add('hidden');

  css.addEventListener('load', () => shadowRoot.appendChild(viewFrame), {
    once: true
  });

  document.body.appendChild(shadowHost);

  contentStorage.viewFrame = viewFrame;

  browser.runtime.onMessage.addListener(onMessage);
};

initContent();
