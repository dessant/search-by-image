const engine = 'getty';

async function upload({blob, imgData}) {
  document.querySelector('a.ups-search-camera').click();
  const input = await waitForElement('input[type=file]');
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
        'Getty Images uploading requires at least Chrome 60 or Firefox 57.',
      type: `${engine}Error`
    });
    return;
  }

  const event = new Event('change');
  input.dispatchEvent(event);
}

initUpload(upload, dataKey, engine);
