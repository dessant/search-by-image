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

async function search({task, search, image, storageKeys}) {
  if (
    document.head.querySelector('meta[name="apple-mobile-web-app-capable"]') ||
    targetEnv === 'safari'
  ) {
    const hostname = getHostname();
    const url =
      `https://${hostname}/images/touch/search?rpt=imageview&format=json` +
      `&request={"blocks":[{"block":"cbir-uploader__get-cbir-id"}]}`;

    const data = new FormData();
    data.append('upfile', image.imageBlob);

    const xhr = getContentXHR();
    xhr.addEventListener('load', function () {
      sendReceipt(storageKeys);

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
    (
      await findNode('.input_js_inited .input__cbir-button button', {
        observerOptions: {attributes: true, attributeFilter: ['class']}
      })
    ).click();

    await Promise.race([
      findNode('div.cbir-panel_visibility_visible', {
        observerOptions: {attributes: true, attributeFilter: ['class']}
      }), // old layout
      findNode('div.CbirPanel-PopupBody') // new layout
    ]);

    const {selector: inputSelector, node: input} = await Promise.race([
      // old layout
      new Promise((resolve, reject) => {
        const selector = 'input.cbir-panel__file-input';
        findNode(selector)
          .then(node => resolve({selector, node}))
          .catch(err => reject(err));
      }),
      // new layout
      new Promise((resolve, reject) => {
        const selector = 'input.CbirCore-FileInput';
        findNode(selector)
          .then(node => resolve({selector, node}))
          .catch(err => reject(err));
      })
    ]);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageKeys);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  if (!window.location.pathname.startsWith('/showcaptcha')) {
    initSearch(search, engine, sessionKey);
  }
}

init();
