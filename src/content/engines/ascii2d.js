async function upload({blob, imgData}) {
  const input = document.querySelector('#file-form');
  if (!input) {
    throw new Error('input field missing');
  }
  try {
    const data = new ClipboardEvent('').clipboardData || new DataTransfer();
    data.items.add(new File([blob], imgData.filename));
    input.files = data.files;
  } catch (e) {
    chrome.runtime.sendMessage({
      id: 'notification',
      message:
        'Ascii2d image uploading requires at least Chrome 60 or Firefox 57.',
      type: `Ascii2dError`
    });
    return;
  }
  document.querySelector('#file_upload').submit();
}

initUpload(upload, dataKey, 'ascii2d');
