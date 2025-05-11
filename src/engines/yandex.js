import {v4 as uuidv4} from 'uuid';

import {validateUrl, getContentXHR} from 'utils/app';
import {
  findNode,
  makeDocumentVisible,
  executeScriptMainContext,
  runOnce
} from 'utils/common';
import {
  initSearch,
  prepareImageForUpload,
  setFileInputData,
  sendReceipt,
  getValidHostname,
  uploadCallback
} from 'utils/engines';
import {targetEnv} from 'utils/config';

const engine = 'yandex';

function showResults(xhr) {
  if (xhr.status === 413) {
    largeImageNotify(engine, '8');
    return;
  }

  const params = JSON.parse(xhr.responseText).blocks[0].params.url;
  const tabUrl = `https://${getValidHostname()}/images/search?${params}`;

  if (validateUrl(tabUrl)) {
    window.location.replace(tabUrl);
  }
}

async function search({session, search, image, storageIds}) {
  const mobile = document.head.querySelector(
    'meta[name="apple-mobile-web-app-capable"]'
  );

  image = await prepareImageForUpload({
    image,
    engine,
    target: mobile ? 'api' : 'ui'
  });

  if (mobile) {
    const hostname = getValidHostname();
    const url =
      `https://${hostname}/images/touch/search?rpt=imageview&format=json` +
      `&request={"blocks":[{"block":"cbir-uploader__get-cbir-id"}]}`;

    const data = new FormData();
    data.append('upfile', image.imageBlob);

    const xhr = getContentXHR();
    xhr.addEventListener('load', function () {
      sendReceipt(storageIds);

      uploadCallback(this, showResults, engine);
    });
    xhr.open('POST', url);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader(
      'Accept',
      'application/json, text/javascript, */*; q=0.01'
    );
    xhr.send(data);
  } else {
    // new layout: hide onboarding popup
    localStorage.setItem(
      'cbir:uploader_onboarded',
      `{"count":1,"last":${Date.now()}}`
    );

    const {
      selector: inputSelector,
      node: input,
      layout
    } = await Promise.race([
      // old layout
      new Promise((resolve, reject) => {
        const selector = 'input.cbir-panel__file-input';
        findNode(selector)
          .then(node => resolve({selector, node, layout: 'old'}))
          .catch(err => reject(err));
      }),
      // new layout
      new Promise((resolve, reject) => {
        const selector = 'input.CbirCore-FileInput';
        findNode(selector)
          .then(node => resolve({selector, node, layout: 'new'}))
          .catch(err => reject(err));
      })
    ]);

    if (layout === 'new') {
      // wait for search service to load
      await new Promise((resolve, reject) => {
        const eventName = uuidv4();

        const onServiceReady = function () {
          window.clearTimeout(timeoutId);
          resolve();
        };

        const timeoutId = window.setTimeout(function () {
          document.removeEventListener(eventName, onServiceReady, {
            capture: true,
            once: true
          });

          reject(new Error('Search service is not ready'));
        }, 60000); // 1 minute

        document.addEventListener(eventName, onServiceReady, {
          capture: true,
          once: true
        });

        executeScriptMainContext({
          func: 'yandexServiceObserver',
          args: [eventName]
        });
      });
    }

    const validateNode = function (node) {
      // checkVisibility supported from Safari 17.4 and Samsung Internet 20
      if (['safari', 'samsung'].includes(targetEnv)) {
        return (
          window.getComputedStyle(node).getPropertyValue('display') !== 'none'
        );
      } else {
        return node.checkVisibility();
      }
    };

    const {node: button, layout: buttonLayout} = await Promise.race([
      new Promise((resolve, reject) => {
        findNode('.input_js_inited .input__cbir-button button', {
          observerOptions: {attributes: true, attributeFilter: ['class']}
        })
          .then(node => resolve({node, layout: 'old'}))
          .catch(err => reject(err));
      }), // old layout
      new Promise((resolve, reject) => {
        findNode('.i-keyrouter_js_inited button.HeaderForm-InlineCbirButton', {
          observerOptions: {attributes: true, attributeFilter: ['class']},
          validateFn: validateNode
        })
          .then(node => resolve({node, layout: 'narrow'}))
          .catch(err => reject(err));
      }), // new layout: narrow
      new Promise((resolve, reject) => {
        findNode(
          '.i-keyrouter_js_inited button.HeaderDesktopActions-CbirButton',
          {
            observerOptions: {attributes: true, attributeFilter: ['class']},
            validateFn: validateNode
          }
        )
          .then(node => resolve({node, layout: 'wide'}))
          .catch(err => reject(err));
      }) // new layout: wide
    ]);

    if (buttonLayout === 'narrow') {
      button.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    } else {
      button.click();
    }

    await Promise.race([
      findNode('div.cbir-panel_visibility_visible', {
        observerOptions: {attributes: true, attributeFilter: ['class']}
      }), // old layout
      findNode('div.CbirPanel-Popup.Popup2_visible', {
        observerOptions: {attributes: true, attributeFilter: ['class']}
      }) // new layout
    ]);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change', {bubbles: true}));
  }
}

function init() {
  makeDocumentVisible();
  if (!window.location.pathname.startsWith('/showcaptcha')) {
    initSearch(search, engine, taskId);
  }
}

if (runOnce('search')) {
  init();
}
