async function upload({blob, imgData}) {
  const input = document.querySelector('#file');
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
        'Iqdb image uploading requires at least Chrome 60 or Firefox 57.',
      type: `IqdbError`
    });
    return;
  }
  document.querySelector('form').submit();
}

initUpload(upload, dataKey, 'iqdb');
