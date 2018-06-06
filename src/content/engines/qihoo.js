const engine = 'qihoo';

async function upload({blob, imgData}) {
  document.querySelector('#iconSt').click();
  if (blob) {
    const input = document.querySelector('input#stUpload');
    if (!input) {
      throw new Error('input field missing');
    }
    try {
      const data = new ClipboardEvent('').clipboardData || new DataTransfer();
      data.items.add(new File([blob], imgData.filename, {type: blob.type}));
      input.files = data.files;
    } catch (e) {
      chrome.runtime.sendMessage({
        id: 'notification',
        message:
          'Qihoo image uploading requires at least Chrome 60 or Firefox 57.',
        type: `${engine}Error`
      });
      return;
    }

    const event = new Event('change');
    input.dispatchEvent(event);
  } else {
    document.querySelector('input#stInput').value = imgData.url;
    document.querySelector('button.st_submit').click();
  }
}

initUpload(upload, dataKey, engine);
