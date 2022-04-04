import browser from 'webextension-polyfill';
import {uniqBy} from 'lodash-es';
import {v4 as uuidv4} from 'uuid';

import {
  hasUrlSupport,
  validateUrl,
  normalizeFilename,
  normalizeImage,
  getImageElement,
  fetchImage,
  fetchImageFromBackgroundScript,
  shareImage
} from 'utils/app';
import {
  getBlankCanvasDataUrl,
  canvasToDataUrl,
  drawElementOnCanvas,
  getAbsoluteUrl,
  getFilenameExtFromUrl
} from 'utils/common';
import {targetEnv} from 'utils/config';

const cssProperties = ['background-image', 'border-image-source', 'mask-image'];
const pseudoSelectors = ['::before', '::after'];
const replacedElements = ['img', 'video', 'iframe', 'embed'];
const rxCssUrl = /url\(['"]?([^'")]+)['"]?\)/gi;

async function downloadImage(url) {
  let imageBlob;

  if (new URL(url).origin === window.location.origin) {
    imageBlob = await fetchImage(url, {credentials: true});
  }

  if (!imageBlob) {
    if (['safari'].includes(targetEnv)) {
      imageBlob = await fetchImage(url);

      if (!imageBlob) {
        imageBlob = await fetchImageFromBackgroundScript(url);
      }
    } else {
      const token = uuidv4();
      await browser.runtime.sendMessage({
        id: 'setContentRequestHeaders',
        token,
        url
      });

      imageBlob = await fetchImage(url, {credentials: true, token});

      if (!imageBlob) {
        imageBlob = await fetchImageFromBackgroundScript(url);
      }
    }
  }

  return imageBlob;
}

function extractCSSImages(cssProps, node, pseudo = null) {
  if (pseudo) {
    cssProps = cssProps.slice();
    cssProps.push('content');
  }

  const results = [];
  const style = window.getComputedStyle(node, pseudo);

  let match;

  cssProperties.forEach(function (prop) {
    let value = style.getPropertyValue(prop);
    if (value && value !== 'none') {
      while ((match = rxCssUrl.exec(value)) !== null) {
        results.push({data: match[1]});
      }
    }
  });

  return results;
}

async function parseNode(node) {
  const results = [];
  const nodeName = node.nodeName.toLowerCase();
  let cssProps = cssProperties;

  if (nodeName === 'img') {
    if (node.currentSrc) {
      results.push({data: node.currentSrc});
    }
  }

  if (nodeName === 'image') {
    const url = node.getAttribute('href') || node.getAttribute('xlink:href');
    if (url) {
      const absUrl = getAbsoluteUrl(url);
      if (absUrl) {
        results.push({data: absUrl});
      }
    }
  }

  if (nodeName === 'embed') {
    const data = node.src;
    if (data && (await getImageElement(data))) {
      results.push({data});
    }
  }

  if (nodeName === 'object') {
    const data = node.data;
    if (data && (await getImageElement(data))) {
      results.push({data});
    }
  }

  if (nodeName === 'iframe') {
    const data = node.src;
    if (data && !node.srcdoc && (await getImageElement(data))) {
      results.push({data});
    }
  }

  if (nodeName === 'canvas') {
    const data = canvasToDataUrl(node, {clear: false});
    if (data && data !== getBlankCanvasDataUrl(node.width, node.height)) {
      results.push({data});
    }
  }

  if (nodeName === 'video') {
    if (node.readyState >= 2) {
      const cnv = document.createElement('canvas');
      const ctx = cnv.getContext('2d');
      cnv.width = node.videoWidth;
      cnv.height = node.videoHeight;

      if (drawElementOnCanvas(ctx, node)) {
        const data = canvasToDataUrl(cnv, {ctx});
        if (data) {
          results.push({data});
        }
      }
    }

    if (node.poster) {
      results.push({data: node.poster});
    }
  }

  if (nodeName === 'li') {
    cssProps = cssProps.slice();
    cssProps.push('list-style-image');
  }

  if (nodeName === 'input' && node.type === 'image') {
    if (node.src) {
      results.push({data: node.src});
    }
  }

  results.push(...extractCSSImages(cssProps, node));

  if (!replacedElements.includes(nodeName)) {
    pseudoSelectors.forEach(function (pseudo) {
      results.push(...extractCSSImages(cssProps, node, pseudo));
    });
  }

  return results;
}

async function processResults(results, session) {
  results = uniqBy(results, 'data');

  const convertImage =
    session.sessionType === 'share' && session.options.convertSharedImage;

  const daraUrls = results.filter(
    item => item.data && item.data.startsWith('data:')
  );
  for (const item of daraUrls) {
    const index = results.indexOf(item);
    const {dataUrl, type, ext} = await normalizeImage({
      dataUrl: item.data,
      convertImage
    });
    if (dataUrl) {
      results[index] = {
        imageDataUrl: dataUrl,
        imageFilename: normalizeFilename({ext}),
        imageType: type,
        imageExt: ext
      };
    } else {
      results.splice(index, 1);
    }
  }

  const isLocalDoc = window.location.href.startsWith('file://');
  if (isLocalDoc) {
    const fileUrls = results.filter(
      item => item.data && item.data.startsWith('file://')
    );
    if (fileUrls.length) {
      const cnv = document.createElement('canvas');
      const ctx = cnv.getContext('2d');
      for (const item of fileUrls) {
        const url = item.data;
        const img = await getImageElement(url);
        if (img) {
          let {filename, ext} = getFilenameExtFromUrl(url);
          const type = ['jpg', 'jpeg', 'jpe'].includes(ext)
            ? 'image/jpeg'
            : 'image/png';
          cnv.width = img.naturalWidth;
          cnv.height = img.naturalHeight;

          if (drawElementOnCanvas(ctx, img)) {
            const data = canvasToDataUrl(cnv, {ctx, type});
            if (data) {
              results[results.indexOf(item)] = {
                imageDataUrl: data,
                imageFilename: normalizeFilename({filename, ext}),
                imageType: type,
                imageExt: ext
              };
            }
          }
        }
      }
    }
  }

  const blobUrls = results.filter(
    item => item.data && item.data.startsWith('blob:')
  );
  if (blobUrls.length) {
    const cnv = document.createElement('canvas');
    const ctx = cnv.getContext('2d');

    for (const item of blobUrls) {
      const img = await getImageElement(item.data);
      if (img) {
        cnv.width = img.naturalWidth;
        cnv.height = img.naturalHeight;

        if (drawElementOnCanvas(ctx, img)) {
          const data = canvasToDataUrl(cnv, {ctx});
          if (data) {
            const ext = 'png';
            results[results.indexOf(item)] = {
              imageDataUrl: data,
              imageFilename: normalizeFilename({ext}),
              imageType: 'image/png',
              imageExt: ext
            };
          }
        }
      }
    }
  }

  const httpUrls = results.filter(item => item.data && validateUrl(item.data));
  if (httpUrls.length) {
    const mustDownload =
      session.sessionType === 'share' ||
      session.searchMode === 'selectUpload' ||
      !(await hasUrlSupport(session.engineGroup || session.engines[0]));

    for (const item of httpUrls) {
      const index = results.indexOf(item);
      let url = item.data;
      const {filename} = getFilenameExtFromUrl(url);
      if (mustDownload) {
        let imageBlob = await downloadImage(url);
        if (!imageBlob && window.isSecureContext && url.match(/^http:/i)) {
          url = url.replace(/^http:/i, 'https:');
          imageBlob = await downloadImage(url);
        }

        if (!imageBlob) {
          results.splice(index, 1);
          continue;
        }

        const {dataUrl, type, ext} = await normalizeImage({
          blob: imageBlob,
          convertImage
        });
        if (dataUrl) {
          results[index] = {
            imageUrl: url,
            imageDataUrl: dataUrl,
            imageFilename: normalizeFilename({filename, ext}),
            imageType: type,
            imageExt: ext,
            imageSize: imageBlob.size
          };
        } else {
          results.splice(index, 1);
        }
      } else {
        results[index] = {imageUrl: url};
      }
    }
  }

  return results.filter(item => !item.data);
}

async function parseDocument({root = null, touchRect = null} = {}) {
  const results = [];

  for (const currentNode of root.querySelectorAll('*')) {
    let nodeRect = currentNode.getBoundingClientRect();
    if (
      touchRect.bottom < nodeRect.top + window.scrollY ||
      touchRect.top > nodeRect.bottom + window.scrollY ||
      touchRect.left > nodeRect.right + window.scrollX ||
      touchRect.right < nodeRect.left + window.scrollX
    ) {
      continue;
    }

    results.push(...(await parseNode(currentNode)));

    const shadowRoot =
      chrome.dom?.openOrClosedShadowRoot(currentNode) ||
      currentNode.openOrClosedShadowRoot ||
      currentNode.shadowRoot;

    if (shadowRoot) {
      results.push(...(await parseDocument({root: shadowRoot, touchRect})));
    }
  }

  return results;
}

async function parse(session) {
  if (typeof baseModule === 'undefined') {
    throw new Error('Base module missing');
  }

  const results = [];

  const docNodeName = document.documentElement.nodeName.toLowerCase();
  if (!['html', 'svg'].includes(docNodeName)) {
    return results;
  }

  const targetNode =
    touchTarget.node ||
    document.elementFromPoint(
      touchTarget.ux - window.scrollX,
      touchTarget.uy - window.scrollY
    );

  if (targetNode) {
    results.push(...(await parseNode(targetNode)));
  }

  if (
    !results.length ||
    !targetNode ||
    targetNode.nodeName.toLowerCase() !== 'img' ||
    session.options.imgFullParse
  ) {
    const touchRect = {
      bottom: touchTarget.uy + 24,
      top: touchTarget.uy - 24,
      left: touchTarget.ux - 24,
      right: touchTarget.ux + 24
    };

    results.push(
      ...(await parseDocument({root: document, touchRect})).reverse()
    );
  }

  return processResults(results, session);
}

self.initParse = async function (session) {
  const images = await parse(session).catch(err => {
    console.log(err.toString());
    browser.runtime.sendMessage({
      id: 'pageParseError',
      session
    });
  });
  if (images) {
    if (session.sessionType === 'share' && images.length === 1) {
      await shareImage(images[0]);
    } else {
      browser.runtime.sendMessage({
        id: 'pageParseSubmit',
        images,
        session
      });
    }
  }
};

function onMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === document.URL) {
    return;
  }

  if (request.id === 'parsePage') {
    initParse(request.session);
  }
}

browser.runtime.onMessage.addListener(onMessage);
