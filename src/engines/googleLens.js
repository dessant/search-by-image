import {findNode, processNode, sleep} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'googleLens';

async function search({session, search, image, storageIds}) {
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

  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();
