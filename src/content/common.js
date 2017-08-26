function getDataUriMimeType(dataUri) {
  return dataUri.split(',')[0].split(':')[1].split(';')[0].toLowerCase();
}

function dataUriToBlob(dataUri) {
  let byteString;
  if (dataUri.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataUri.split(',')[1]);
  } else {
    byteString = unescape(dataUri.split(',')[1]);
  }

  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type: getDataUriMimeType(dataUri)});
}

function getXHR() {
  try {
    return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
  } catch (e) {
    return new XMLHttpRequest();
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    dataUriToBlob,
    getXHR,
    getDataUriMimeType
  };
}
