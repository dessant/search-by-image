import {findNode, runOnce} from 'utils/common';
import {initSearch, sendReceipt} from 'utils/engines';

const engine = 'googleImages';

async function search({session, search, image, storageIds} = {}) {
  await sendReceipt(storageIds);

  const targetNode = await Promise.race([
    findNode('div#search', {timeout: 10000, throwError: false}), // desktop
    findNode('div#rso', {timeout: 10000, throwError: false}) // mobile
  ]);

  if (targetNode && !targetNode.children.length) {
    targetNode.style.margin = '6px';
    targetNode.style.padding = '16px';
    targetNode.style.border = '1px solid #fdd663';
    targetNode.style.borderRadius = '24px';
    targetNode.style.backgroundColor = '#feefc3';

    targetNode.style.fontSize = '13px';
    targetNode.style.fontWeight = '700';
    targetNode.style.lineHeight = '20px';
    targetNode.style.color = '#2d3436';

    targetNode.innerHTML = `Google has replaced the legacy reverse image search service with Google Lens.<br><br>
      It may still be possible to view the legacy search results by updating your Google Account settings,
      visit our <a href="https://github.com/dessant/search-by-image/issues/309" rel="nofollow" style="color:green;text-decoration:underline;white-space: nowrap;">help page</a> for more details.<br><br>
      Search by Image supports a wide variety of image search services, including Google Lens.
      Visit the extension's options to enable additional search engines.`;
  }
}

function init() {
  initSearch(search, engine, taskId);
}

if (runOnce('search')) {
  init();
}
