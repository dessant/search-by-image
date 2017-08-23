function dataUriToBlob(dataUri) {
  let byteString;
  if (dataUri.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataUri.split(',')[1]);
  } else {
    byteString = unescape(dataUri.split(',')[1]);
  }

  const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];

  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type: mimeString});
}

function getXHR() {
  try {
    return XPCNativeWrapper(new window.wrappedJSObject.XMLHttpRequest());
  } catch (e) {
    return new XMLHttpRequest();
  }
}

function getRandomString(length) {
  let text = '';
  const seed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += seed.charAt(Math.floor(Math.random() * seed.length));
  }

  return text;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFilename(ext) {
  return `${getRandomString(getRandomInt(5, 20))}.${ext}`;
}

if (typeof module !== 'undefined') {
  module.exports = {
    dataUriToBlob,
    getXHR,
    getRandomFilename
  };
}
