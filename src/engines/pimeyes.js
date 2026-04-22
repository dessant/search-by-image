import {findNode, processNode, runOnce, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pimeyes';

async function search({session, search, image, storageIds} = {}) {
  await sleep(1000);

  const inputSelector = '#file-input';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));

  const searchButton = await findNode('.start-search-inner > button', {
    throwError: false
  });

  // button is missing when no faces were detected
  if (searchButton) {
    if (searchButton.classList.contains('disabled')) {
      await sleep(1000);

      for (const checkbox of document.querySelectorAll(
        '.permissions input[type=checkbox]'
      )) {
        if (!checkbox.checked) {
          checkbox.click();
        }
      }

      (
        await findNode('.start-search-inner > button:not(.disabled)', {
          observerOptions: {attributes: true, attributeFilter: ['class']}
        })
      ).click();
    } else {
      searchButton.click();
    }
  }
}

function init() {
  initSearch(search, engine, taskId, {canvasAccess: true});
}

if (runOnce('search')) {
  init();
}
