import {validateUrl} from 'utils/app';
import {findNode, isAndroid} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'istock';

async function search({session, search, image, storageIds}) {
  if (await isAndroid()) {
    let rsp = await fetch(
      'https://www.istockphoto.com/search/search-by-image/upload_data/' +
        new Date().getTime()
    );

    if (rsp.status !== 200) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const api = await rsp.json();

    const data = new FormData();
    data.append('key', api.awsData.key);
    data.append('AWSAccessKeyId', api.awsData.AWSAccessKeyId);
    data.append('acl', api.awsData.acl);
    data.append('policy', api.awsData.policy);
    data.append('signature', api.awsData.signature);
    data.append('Content-Type', image.imageType);
    data.append('success_action_redirect', api.awsData.success_action_redirect);
    data.append('success_action_status', api.awsData.success_action_status);
    data.append('file', image.imageBlob, image.imageFilename);

    rsp = await fetch(api.url, {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (rsp.status !== 201) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const tabUrl = 'https://www.istockphoto.com' + api.presigned_url;

    await sendReceipt(storageIds);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    (await findNode('a.search-camera-icon')).click();

    const inputSelector = 'input[type=file][ng-model=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change'));
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();
