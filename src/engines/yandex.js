import {validateUrl, getContentXHR} from 'utils/app';
import {findNode} from 'utils/common';
import {
  getValidHostname,
  setFileInputData,
  uploadCallback,
  initSearch,
  sendReceipt
} from 'utils/engines';
import {targetEnv} from 'utils/config';

const engine = 'yandex';

function getHostname() {
  const hostnames = [
    'yandex.com',
    'yandex.ru',
    'yandex.ua',
    'yandex.by',
    'yandex.kz',
    'yandex.uz',
    'yandex.com.tr'
  ];
  return getValidHostname(hostnames, engine);
}

function showResults(xhr) {
  if (xhr.status === 413) {
    largeImageNotify(engine, '8');
    return;
  }

  const params = JSON.parse(xhr.responseText).blocks[0].params.url;
  const tabUrl = `https://${getHostname()}/images/search?${params}`;

  if (validateUrl(tabUrl)) {
    window.location.replace(tabUrl);
  }
}

async function search({session, search, image, storageIds}) {
  if (
    document.head.querySelector('meta[name="apple-mobile-web-app-capable"]')
  ) {
    const hostname = getHostname();
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
        const onServiceReady = function () {
          window.clearTimeout(timeoutId);
          resolve();
        };

        const timeoutId = window.setTimeout(function () {
          document.removeEventListener('___serviceReady', onServiceReady, {
            capture: true,
            once: true
          });

          reject(new Error('Search service is not ready'));
        }, 60000); // 1 minute

        document.addEventListener('___serviceReady', onServiceReady, {
          capture: true,
          once: true
        });

        function serviceObserver() {
          let stop;

          const checkService = function () {
            if (
              window.Ya?.reactBus?.e['cbir:search-by-image:start']?.length >= 4
            ) {
              window.clearTimeout(timeoutId);
              document.dispatchEvent(new Event('___serviceReady'));
            } else if (!stop) {
              window.setTimeout(checkService, 200);
            }
          };

          const timeoutId = window.setTimeout(function () {
            stop = true;
          }, 60000); // 1 minute

          checkService();
        }

        const script = document.createElement('script');
        if (['firefox', 'safari'].includes(targetEnv)) {
          script.nonce = document.querySelector('script[nonce]').nonce;
        }
        script.textContent = `(${serviceObserver.toString()})()`;
        document.documentElement.appendChild(script);
        script.remove();
      });
    }

    (
      await findNode('.input_js_inited .input__cbir-button button', {
        observerOptions: {attributes: true, attributeFilter: ['class']}
      })
    ).click();

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
  if (!window.location.pathname.startsWith('/showcaptcha')) {
    initSearch(search, engine, taskId);
  }
}

init();
