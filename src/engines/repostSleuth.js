import {findNode, runOnce} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'repostSleuth';

async function search({session, search, image, storageIds} = {}) {
  if (search.assetType === 'image') {
    const inputSelector = 'input[type=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  } else {
    const input = await findNode(
      '//input[preceding-sibling::label[contains(., "Image URL")]]',
      {selectorType: 'xpath'}
    );

    input.value = image.imageUrl;

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('input'));
  }

  const button = await findNode(
    '.v-main button.primary:not(.v-btn--disabled)',
    {observerOptions: {attributes: true, attributeFilter: ['class']}}
  );

  window.setTimeout(() => button.click(), 300);
}

async function engineAccess() {
  if (
    // Cloudflare challenge
    document
      .querySelector('noscript')
      ?.textContent.includes(
        '<div class="h2"><span id="challenge-error-text">'
      ) ||
    // Cloudflare error
    document.querySelector('div#cf-wrapper > div#cf-error-details')
  ) {
    return false;
  }

  return true;
}

function init() {
  initSearch(search, engine, taskId, {engineAccess});
}

if (runOnce('search')) {
  init();
}
