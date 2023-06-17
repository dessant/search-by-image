import {
  sendLargeMessage,
  processLargeMessage,
  processMessageResponse,
  getAppTheme,
  addThemeListener
} from 'utils/app';
import {addCssClass} from 'utils/common';
import {targetEnv} from 'utils/config';

var contentStorage = {
  viewFrame: null,
  viewFrameId: 0,
  viewMessagePort: null,
  queuedMessage: null
};

function addViewFrame() {
  const shadowHost = document.createElement('div');
  const shadowRoot = shadowHost.attachShadow({mode: 'closed'});

  const css = document.createElement('link');
  css.setAttribute('rel', 'stylesheet');
  css.setAttribute('href', browser.runtime.getURL('/src/content/style.css'));
  shadowRoot.appendChild(css);

  const viewFrame = document.createElement('iframe');
  viewFrame.classList.add('hidden');

  css.addEventListener(
    'load',
    async function () {
      await configTheme(viewFrame);
      shadowRoot.appendChild(viewFrame);
    },
    {once: true}
  );

  document.body.appendChild(shadowHost);

  contentStorage.viewFrame = viewFrame;
}

function showView(view) {
  const currentView = contentStorage.viewFrame.id;
  if (currentView !== view) {
    contentStorage.viewFrameId = 0;
    contentStorage.viewMessagePort = null;

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

    contentStorage.viewFrame.src = browser.runtime.getURL(
      `/src/${view}/index.html`
    );
  }

  contentStorage.viewFrame.classList.remove('hidden');
}

function hideView(view) {
  window.setTimeout(function () {
    if (contentStorage.viewFrame.id === view) {
      contentStorage.viewFrame.classList.add('hidden');
      document.body.focus();
    }
  }, 300);
}

async function sendQueuedMessage() {
  const message = contentStorage.queuedMessage;
  if (message) {
    contentStorage.queuedMessage = null;

    await messageView(message);
  }
}

async function messageView(message) {
  if (contentStorage.viewFrameId) {
    await browser.runtime.sendMessage({
      id: 'routeMessage',
      messageFrameId: contentStorage.viewFrameId,
      message
    });
  } else if (contentStorage.viewMessagePort) {
    await sendLargeMessage({
      target: 'port',
      messagePort: contentStorage.viewMessagePort,
      message
    });
  } else {
    contentStorage.queuedMessage = message;
  }
}

async function processMessage(request, sender) {
  if (request.id === 'openView') {
    showView(request.view);
    await messageView(request);
  } else if (request.id === 'closeView') {
    if (request.messageView) {
      await messageView({id: request.id});
    }
    hideView(request.view);
  } else if (request.id === 'messageView') {
    const message = request.message;
    if (request.flattenMessage) {
      delete request.id;
      delete request.message;
      delete request.flattenMessage;
      Object.assign(message, request);
    }
    await messageView(message);
  } else if (request.id === 'saveFrameId') {
    contentStorage.viewFrameId = request.senderFrameId;
    await sendQueuedMessage();
  }
}

function onMessage(request, sender, sendResponse) {
  const response = processLargeMessage({
    request,
    sender,
    requestHandler: processMessage
  });

  return processMessageResponse(response, sendResponse);
}

function onConnect(messagePort) {
  if (messagePort.name === 'view') {
    contentStorage.viewMessagePort = messagePort;
    sendQueuedMessage();
  }
}

async function configTheme(viewFrame) {
  // Opaque background may be flashed when an iframe is added to the DOM
  viewFrame.classList.add('fade-in');

  async function setTheme() {
    const theme = await getAppTheme();

    addCssClass(viewFrame, `theme-${theme}`, {
      replaceClass: `theme-${theme === 'light' ? 'dark' : 'light'}`
    });
  }

  addThemeListener(setTheme);

  await setTheme();
}

self.initContent = function () {
  addViewFrame();

  browser.runtime.onMessage.addListener(onMessage);
  if (targetEnv !== 'firefox') {
    browser.runtime.onConnect.addListener(onConnect);
  }
};

initContent();
