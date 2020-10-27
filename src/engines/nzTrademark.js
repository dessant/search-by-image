import {findNode} from 'utils/common';
import {setFileInputData, initUpload} from 'utils/engines';

const engine = 'nzTrademark';

async function upload({task, search, image}) {
  (await findNode('#logoCheckButton')).click();

  const input = await findNode('#imageSearchDialogUploadButton');
  setFileInputData(input, image);

  input.dispatchEvent(new Event('change'));

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
  initUpload(upload, engine, sessionKey);
}

init();
