import {findNode, processNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'birchlane';

async function search({task, search, image, storageKeys}) {
  // elements may be recreated
  await processNode(
    'header#store_nav button.SearchWithPhotoButton',
    node => node.click(),
    {reprocess: true}
  );

  const {selector: inputSelector, node: input} = await Promise.race([
    // desktop
    new Promise((resolve, reject) => {
      const selector = 'input#FileUpload-input0';
      findNode(selector)
        .then(node => resolve({selector, node}))
        .catch(err => reject(err));
    }),
    // mobile
    new Promise((resolve, reject) => {
      const selector = 'input#MODAL_CAMERA';
      findNode(selector)
        .then(node => resolve({selector, node}))
        .catch(err => reject(err));
    })
  ]);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageKeys);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  if (!window.location.pathname.startsWith('/v/captcha/')) {
    initSearch(search, engine, sessionKey);
  }
}

init();
