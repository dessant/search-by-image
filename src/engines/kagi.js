import {findNode, runOnce} from 'utils/common';
import {initSearch, setFileInputData, sendReceipt} from 'utils/engines';

const engine = 'kagi';

async function search({session, search, image, storageIds} = {}) {
  (await findNode('.img_search_state_checkbox_label')).click();

  if (search.assetType === 'image') {
    const inputSelector = 'input[type="file"]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));

    // Upload image on mobile
    const button = document.querySelector(
      '.iu_form_box form:not([hidden]) button[type="submit"]'
    );
    if (button) {
      function submit() {
        button.click();
      }

      const intervalId = window.setInterval(submit, 2000);
      window.setTimeout(function () {
        window.clearInterval(intervalId);
      }, 10000);

      window.setTimeout(submit, 600);
    }
  } else {
    const input = await findNode('.iu_url_search_box form input#url');

    input.value = image.imageUrl;

    await sendReceipt(storageIds);

    (await findNode('.iu_url_search_box form button')).click();
  }
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}
