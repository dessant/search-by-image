const engine = 'baidu';

async function upload({blob, imgData}) {
  if (window.screen.width < 1024) {
    const data = new FormData();
    data.append('tn', 'pc');
    data.append('from', 'pc');
    data.append('range', '{"page_from": "searchIndex"}');

    if (blob) {
      data.append('image', blob, imgData.filename);
      data.append('image_source', 'PC_UPLOAD_SEARCH_FILE');
    } else {
      data.append('image', imgData.url);
      data.append('image_source', 'PC_UPLOAD_SEARCH_URL');
    }

    const rsp = await fetch('https://graph.baidu.com/upload', {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (rsp.status !== 200) {
      throw new Error(`API response: ${rsp.status}, ${await rsp.text()}`);
    }

    const tabUrl = (await rsp.json()).data.url;

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  } else {
    (await findNode('.soutu-btn', {timeout: 120000})).click();

    if (blob) {
      const input = await findNode('input.upload-pic');
      setFileInputData(input, blob, imgData);

      input.dispatchEvent(new Event('change'));
    } else {
      const input = await findNode('input#soutu-url-kw');
      input.value = imgData.url;

      (await findNode('.soutu-url-btn')).click();
    }
  }
}

initUpload(upload, dataKey, engine);
