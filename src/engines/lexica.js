import {findNode, executeCodeMainContext} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'lexica';

async function search({session, search, image, storageIds}) {
  function overrideEventDispatch() {
    const inputDispatchEvent = HTMLInputElement.prototype.dispatchEvent;

    HTMLInputElement.prototype.dispatchEvent = function (ev) {
      if (this.type === 'file' && ev.type === 'click') {
        HTMLInputElement.prototype.dispatchEvent = inputDispatchEvent;
      } else {
        inputDispatchEvent.apply(this, arguments);
      }
    };
  }

  executeCodeMainContext(`(${overrideEventDispatch.toString()})()`);

  (await findNode('input#main-search')).nextElementSibling.click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();
