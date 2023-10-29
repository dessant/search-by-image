import {findNode, processNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'pimeyes';

async function search({session, search, image, storageIds}) {
  const inputSelector = '.upload-file input#file-input';

  processNode(inputSelector, function (node) {
    node.addEventListener('click', ev => ev.preventDefault(), {
      capture: true,
      once: true
    });
  });

  (await findNode('.upload-bar button[aria-label="upload photo" i]')).click();

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
      await findNode('.permissions input[type=checkbox]');

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
  initSearch(search, engine, taskId);
}

init();
