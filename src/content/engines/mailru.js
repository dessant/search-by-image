const engine = 'mailru';

function blobToDataUrl(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => resolve();
    reader.onabort = () => resolve();
    reader.readAsDataURL(blob);
  });
}

function submitImage() {
  function dropImage({dataUrl, filename}) {
    const data = dataUrl.split(',');
    const type = data[0]
      .split(':')[1]
      .split(';')[0]
      .toLowerCase();
    const byteString = atob(data[1]);
    const length = byteString.length;

    const array = new Uint8Array(new ArrayBuffer(length));
    for (let i = 0; i < length; i++) {
      array[i] = byteString.charCodeAt(i);
    }

    const fileData = new File([array], filename, {type});

    const dataTransfer =
      new ClipboardEvent('').clipboardData || new DataTransfer();
    dataTransfer.items.add(fileData);
    const event = new DragEvent('drop', {dataTransfer});

    const dropZone = document.querySelector('#ImageUploadBlock-dropZone');
    dropZone.dispatchEvent(event);
  }

  const onMessage = function(e) {
    e.stopImmediatePropagation();
    window.clearTimeout(timeoutId);

    dropImage(JSON.parse(e.detail));
  };

  const timeoutId = window.setTimeout(function() {
    document.removeEventListener('___submitImage', onMessage, {
      capture: true,
      once: true
    });
  }, 10000); // 10 seconds

  document.addEventListener('___submitImage', onMessage, {
    capture: true,
    once: true
  });
}

async function upload({blob, imgData}) {
  const button = await waitForElement(
    'button.MainSearchFieldContainer-buttonCamera',
    60000
  );
  button.click();
  await waitForElement('#ImageUploadBlock-dropZone');

  const script = document.createElement('script');
  script.textContent = `(${submitImage.toString()})()`;
  document.documentElement.appendChild(script);
  script.remove();

  document.dispatchEvent(
    new CustomEvent('___submitImage', {
      detail: JSON.stringify({
        dataUrl: await blobToDataUrl(blob),
        filename: imgData.filename
      })
    })
  );
}

initUpload(upload, dataKey, engine);
