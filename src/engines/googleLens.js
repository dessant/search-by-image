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
  const inputSelector = 'input[type="file"][name="encoded_image"]';

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

        if (search.assetType === 'image') {
          clickButton();
        } else {
          // the preview image is not loaded after submitting the consent form
          processNode(
            'img[src*="googlesymbols/hide_image"]',
            function (node) {
              if (node) {
                window.location.reload();
              }
            },
            {
              observerOptions: {attributes: true, attributeFilter: ['src']},
              throwError: false,
              timeout: 10000
            }
          );
        }
      }
    },
    {throwError: false, selectorType: 'xpath'}
  );

  if (search.assetType === 'image') {
    await waitForCanvasAccess({engine});

    await clickButton();

    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await unsetUserAgent(storageIds);
    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  } else {
    await sleep(6000);

    await sendReceipt(storageIds);
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
