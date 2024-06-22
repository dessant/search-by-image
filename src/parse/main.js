import {uniqBy} from 'lodash-es';
import {v4 as uuidv4} from 'uuid';

import {
  hasUrlSupport,
  validateUrl,
  dataToImage,
  fileUrlToImage,
  blobUrlToImage,
  processImage,
  getImageElement,
  fetchImage,
  fetchImageFromBackgroundScript,
  shareImage,
  getDataFromImageUrl,
  imageTypeSupport,
  getSrcsetUrls,
  sendLargeMessage
} from 'utils/app';
import {
  getCanvas,
  getBlankCanvasDataUrl,
  canvasToDataUrl,
  drawElementOnCanvas,
  getAbsoluteUrl,
  runOnce
} from 'utils/common';
import {targetEnv} from 'utils/config';

const cssProperties = [
  'background-image',
  'border-image-source',
  'mask-image',
  'cursor'
];
const pseudoSelectors = ['::before', '::after'];
const replacedElements = ['img', 'video', 'iframe', 'embed'];
const rxCssUrl = /url\s*\(\s*(?:"(.*?)"|'(.*?)'|(.*?))\s*\)/gi;

async function downloadImage(url, {credentials = false} = {}) {
  let imageBlob;

  const sameOrigin = new URL(url).origin === window.location.origin;

  if (sameOrigin) {
    imageBlob = await fetchImage(url);
  }

  if (!imageBlob) {
    if (['safari'].includes(targetEnv)) {
      imageBlob = await fetchImage(url);

      if (!imageBlob) {
        imageBlob = await fetchImageFromBackgroundScript(url);
      }
    } else {
      const token = uuidv4();
      const origin = sameOrigin ? '' : window.location.origin;

      const ruleId = await browser.runtime.sendMessage({
        id: 'addContentRequestListener',
        url,
        origin,
        token
      });

      try {
        imageBlob = await fetchImage(url, {credentials, token});
      } finally {
        await browser.runtime.sendMessage({
          id: 'removeContentRequestListener',
          ruleId
        });
      }

      if (!imageBlob) {
        imageBlob = await fetchImageFromBackgroundScript(url);
      }
    }
  }

  return imageBlob;
}

function extractCSSImages(node, pseudo = null) {
  const nodeName = node.nodeName.toLowerCase();
  const cssProps = cssProperties.slice();

  if (nodeName === 'li') {
    cssProps.push('list-style-image');
  }

  if (pseudo) {
    cssProps.push('content');
  }

  const results = [];
  const style = window.getComputedStyle(node, pseudo);

  let match;

  cssProps.forEach(function (prop) {
    let value = style.getPropertyValue(prop);
    if (value && value !== 'none') {
      while ((match = rxCssUrl.exec(value))) {
        const url = match[1] || match[2] || match[3];
        if (url) {
          results.push({data: url});
        }
      }
    }
  });

  return results;
}

async function parseNode(node, session) {
  const results = [];
  const nodeName = node.nodeName.toLowerCase();

  if (nodeName === 'img') {
    const credentials = node.crossOrigin === 'use-credentials';

    if (session.options.detectAltImageDimension) {
      if (node.srcset) {
        const urls = getSrcsetUrls(node.srcset);

        for (const url of urls.reverse()) {
          const absUrl = getAbsoluteUrl(url);
          if (absUrl) {
            results.push({data: absUrl, credentials});
          }
        }
      }

      if (node.parentNode?.nodeName.toLowerCase() === 'picture') {
        const sourceNodes = node.parentNode.querySelectorAll('source');

        for (const source of sourceNodes) {
          const urls = getSrcsetUrls(source.srcset);
          for (const url of urls.reverse()) {
            const absUrl = getAbsoluteUrl(url);
            if (absUrl) {
              results.push({data: absUrl, credentials});
            }
          }
        }
      }

      if (node.currentSrc) {
        results.push({data: node.currentSrc, credentials});
      }

      if (node.src) {
        results.push({data: node.src, credentials});
      }
    } else {
      if (node.currentSrc) {
        results.push({data: node.currentSrc, credentials});
      }
    }
  } else if (nodeName === 'image') {
    const url = node.getAttribute('href') || node.getAttribute('xlink:href');
    if (url) {
      const absUrl = getAbsoluteUrl(url);
      if (absUrl) {
        results.push({data: absUrl});
      }
    }
  } else if (nodeName === 'embed') {
    const data = node.src;
    if (data && (await getImageElement({url: data}))) {
      results.push({data});
    }
  } else if (nodeName === 'object') {
    const data = node.data;
    if (data && (await getImageElement({url: data}))) {
      results.push({data});
    }
  } else if (nodeName === 'iframe') {
    const data = node.src;
    if (data && !node.srcdoc && (await getImageElement({url: data}))) {
      results.push({data});
    }
  } else if (nodeName === 'canvas') {
    const data = await canvasToDataUrl(node, {clear: false});
    if (
      data &&
      data !== (await getBlankCanvasDataUrl(node.width, node.height))
    ) {
      results.push({data});
    }
  } else if (nodeName === 'video') {
    if (node.readyState >= 2) {
      const {cnv, ctx} = getCanvas(node.videoWidth, node.videoHeight);

      if (drawElementOnCanvas(ctx, node)) {
        const data = await canvasToDataUrl(cnv, {ctx});
        if (data) {
          results.push({data});
        }
      }
    }

    if (node.poster) {
      results.push({data: node.poster});
    }
  } else if (nodeName === 'input' && node.type === 'image') {
    if (node.src) {
      results.push({data: node.src});
    }
  }

  results.push(...extractCSSImages(node));

  if (!replacedElements.includes(nodeName)) {
    pseudoSelectors.forEach(function (pseudo) {
      results.push(...extractCSSImages(node, pseudo));
    });
  }

  return results;
}

async function processResults(results, session) {
  results = uniqBy(results, 'data');

  const daraUrls = results.filter(
    item => item.data && item.data.startsWith('data:')
  );
  for (const item of daraUrls) {
    const file = await dataToImage({dataUrl: item.data});

    if (file) {
      const image = await processImage(file);

      if (image) {
        results[results.indexOf(item)] = image;
      }
    }
  }

  const isLocalDoc = window.location.href.startsWith('file://');
  if (isLocalDoc) {
    const fileUrls = results.filter(
      item => item.data && item.data.startsWith('file://')
    );
    for (const item of fileUrls) {
      const file = await fileUrlToImage(item.data);

      if (file) {
        const image = await processImage(file);

        if (image) {
          results[results.indexOf(item)] = image;
        }
      }
    }
  }

  const blobUrls = results.filter(
    item => item.data && item.data.startsWith('blob:')
  );
  for (const item of blobUrls) {
    const file = await blobUrlToImage(item.data);

    if (file) {
      const image = await processImage(file);

      if (image) {
        results[results.indexOf(item)] = image;
      }
    }
  }

  const httpUrls = results.filter(item => item.data && validateUrl(item.data));
  if (httpUrls.length) {
    const mustDownloadAllUrls =
      session.sessionType === 'share' ||
      (session.sessionType === 'view' && session.options.viewImageUseViewer) ||
      (session.sessionType === 'search' &&
        (session.searchMode === 'selectImage' ||
          !(await hasUrlSupport(session.engines))));

    for (const item of httpUrls) {
      let url = item.data;
      const {name: filename, type: imageType} = getDataFromImageUrl(url);

      const mustDownloadUrl =
        mustDownloadAllUrls ||
        (session.sessionType === 'search' &&
          session.engines.some(engine => !imageTypeSupport(imageType, engine)));

      if (mustDownloadUrl) {
        let blob = await downloadImage(url, {credentials: item.credentials});

        if (!blob && window.isSecureContext && url.match(/^http:/i)) {
          url = url.replace(/^http:/i, 'https:');
          blob = await downloadImage(url, {credentials: item.credentials});
        }

        let processedResult;

        if (blob) {
          const file = await dataToImage({blob, name: filename});

          if (file) {
            const image = await processImage(file);

            if (image) {
              processedResult = {imageUrl: url, ...image};
            }
          }
        }

        if (!processedResult && session.sessionType === 'view') {
          processedResult = {imageUrl: url, imageType};
        }

        if (processedResult) {
          results[results.indexOf(item)] = processedResult;
        }
      } else {
        results[results.indexOf(item)] = {imageUrl: url, imageType};
      }
    }
  }

  return results.filter(item => !item.data);
}

function getShadowRoot(node) {
  try {
    return (
      // Throws exception on unsupported shadow host
      chrome.dom?.openOrClosedShadowRoot(node) ||
      node.openOrClosedShadowRoot ||
      node.shadowRoot
    );
  } catch (err) {}
}

async function parseDocument({root = null, touchRect = null, session} = {}) {
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

    results.push(await parseNode(currentNode, session));

    const shadowRoot = getShadowRoot(currentNode);
    if (shadowRoot) {
      results.push(await parseDocument({root: shadowRoot, touchRect, session}));
    }
  }

  return results.reverse().flat();
}

async function parse(session) {
  if (!self.runStore?.baseModule) {
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
    results.push(...(await parseNode(targetNode, session)));
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
      ...(await parseDocument({root: document, touchRect, session}))
    );
  }

  return processResults(results, session);
}

async function initParse(session) {
  try {
    const images = await parse(session);

    if (session.sessionType === 'share' && images.length === 1) {
      // Safari 17: transient activation does not always propagate to
      // the content script context, navigator.userActivation.isActive is false.
      if (targetEnv === 'safari') {
        images[0].mustConfirm = true;
      } else {
        await shareImage(images[0], {
          convert: session.options.convertSharedImage
        });
        return;
      }
    }

    await sendLargeMessage({
      message: {
        id: 'pageParseSubmit',
        images,
        session
      }
    });
  } catch (err) {
    console.log(err.toString());

    await browser.runtime.sendMessage({
      id: 'pageParseError',
      session
    });

    throw err;
  }
}

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

function main() {
  browser.runtime.onMessage.addListener(onMessage);
}

if (runOnce('parseModule')) {
  main();
}
