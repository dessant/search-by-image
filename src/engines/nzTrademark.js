import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'nzTrademark';

async function search({task, search, image, storageKeys}) {
  (await findNode('#logoCheckButton')).click();

  const inputSelector = '#imageSearchDialogUploadButton';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  input.dispatchEvent(new Event('change'));

  await sendReceipt(storageKeys);

  (
    await findNode('#imageSearchDialogNextButton:not([disabled])', {
      observerOptions: {attributes: true, attributeFilter: ['disabled']}
    })
  ).click();

  const features = await findNode(
    '#imageSearchDialogMainStep1_2:not(.hidden)',
    {
      timeout: 30000,
      throwError: false,
      observerOptions: {attributes: true, attributeFilter: ['class']}
    }
  );
  if (features) {
    (await findNode('#imageSearchDialogSkipButton')).click();
  }
}

function init() {
  initSearch(search, engine, sessionKey);
}

init();
