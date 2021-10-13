import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'mailru';

async function search({session, search, image, storageIds}) {
  if (!document.head.querySelector('meta[name="format-detection"]')) {
    // desktop layout
    (await findNode('button.MainSearchFieldContainer-buttonCamera')).click();
  }

  const {selector: inputSelector, node: input} = await Promise.race([
    // desktop
    new Promise((resolve, reject) => {
      const selector = 'input#ImageUploadBlock-inputFile';
      findNode(selector)
        .then(node => resolve({selector, node}))
        .catch(err => reject(err));
    }),
    // mobile
    new Promise((resolve, reject) => {
      const selector = 'input#imageInput';
      findNode(selector)
        .then(node => resolve({selector, node}))
        .catch(err => reject(err));
    })
  ]);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change', {bubbles: true}));
}

function init() {
  initSearch(search, engine, taskId);
}

init();
