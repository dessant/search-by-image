import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'taobao';

async function search({session, search, image, storageIds}) {
  function patchContext() {
    const appendChildFn = Element.prototype.appendChild;
    Element.prototype.appendChild = function (node) {
      if (node.type === 'file') {
        node.addEventListener('click', ev => ev.preventDefault(), {
          capture: true,
          once: true
        });

        Element.prototype.appendChild = appendChildFn;
      }

      return appendChildFn.apply(this, arguments);
    };

    const openFn = window.open;
    window.open = function (url) {
      if (url.includes('/tmw/search_image')) {
        window.location.replace(url);
      } else {
        return openFn.apply(this, arguments);
      }
    };
  }

  const script = document.createElement('script');
  script.textContent = `(${patchContext.toString()})()`;
  document.documentElement.appendChild(script);
  script.remove();

  (
    await findNode(
      '.searchbar-camera-icon div.component-search-icon-container',
      {timeout: 120000}
    )
  ).click();

  const inputSelector = 'input[type="file"]';
  const input = await findNode(inputSelector);

  await setFileInputData(inputSelector, input, image);

  await sendReceipt(storageIds);

  input.dispatchEvent(new Event('change'));
}

function init() {
  initSearch(search, engine, taskId);
}

init();
