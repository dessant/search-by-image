async function upload({blob, imgData}) {
  const input = await waitForElement('input#upload_box');
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
        'Tineye image uploading requires at least Chrome 60 or Firefox 57.',
      type: `${engine}Error`
    });
    return;
  }

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, 'tineye');
