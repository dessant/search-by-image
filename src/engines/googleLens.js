import {findNode, processNode, runOnce, sleep} from 'utils/common';
import {
  setFileInputData,
  initSearch,
  sendReceipt,
  unsetUserAgent,
  waitForCanvasAccess
} from 'utils/engines';

const engine = 'googleLens';

async function search({session, search, image, storageIds} = {}) {
  const inputSelector = 'input[type="file"]';

  async function clickButton() {
    await processNode('div[data-base-lens-url]', async function (node) {
      await sleep(1000);

      if (!document.querySelector(inputSelector)) {
        node.click();
      }
    });
  }

  // handle consent popup
  processNode(
    `//div[@role="dialog"
      and contains(., "g.co/privacytools")
      and .//a[starts-with(@href, "https://policies.google.com/technologies/cookies")]
      and .//a[starts-with(@href, "https://policies.google.com/privacy")]
      and .//a[starts-with(@href, "https://policies.google.com/terms")]
    ]`,
    function (node) {
      if (node) {
        node.querySelectorAll('button')[2].click();

        clickButton();
      }
    },
    {throwError: false, selectorType: 'xpath'}
  );

  await clickButton();

  await unsetUserAgent(storageIds);

  if (search.assetType === 'image') {
    await waitForCanvasAccess({engine});

    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  } else {
    const input = await findNode(
      `//div[count(child::*)=2]/input[following-sibling::div[@role="button"]]`,
      {selectorType: 'xpath'}
    );

    input.value = image.imageUrl;

    await sendReceipt(storageIds);

    input.nextElementSibling.click();
  }
}

async function engineAccess() {
  if (window.location.pathname.startsWith('/sorry')) {
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
