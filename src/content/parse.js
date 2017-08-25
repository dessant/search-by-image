const cssProperties = ['background-image', 'border-image-source', 'mask-image'];
const pseudoSelectors = ['::before', '::after'];
const replacedElements = ['IMG', 'VIDEO', 'IFRAME', 'EMBED'];
const rxCssUrl = /url\(['"]?([^'")]+)['"]?\)/gi;
const rxSupportedUrls = /^(?:https?:\/\/|ftp:\/\/|data:image\/).*$/i;
const canvas = {cnv: null, ctx: null};

function extractCSSImages(cssProps, node, pseudo = null) {
  if (pseudo) {
    cssProps = cssProps.slice();
    cssProps.push('content');
  }

  const urls = [];
  const style = window.getComputedStyle(node, pseudo);

  let match;

  cssProperties.forEach(function(prop) {
    let value = style.getPropertyValue(prop);
    if (value && value !== 'none') {
      while ((match = rxCssUrl.exec(value)) !== null) {
        urls.push(match[1]);
      }
    }
  });

  return urls;
}

function parseNode(node, isLocalDoc) {
  const urls = [];
  const nodeName = node.nodeName;
  let cssProps = cssProperties;

  switch (nodeName) {
    case 'IMG':
      if (node.src) {
        urls.push(node.src);
      }
      break;
    case 'VIDEO':
      if (node.poster) {
        urls.push(node.poster);
      }
      break;
    case 'LI':
      cssProps = cssProps.slice();
      cssProps.push('list-style-image');
      break;
  }

  urls.push(...extractCSSImages(cssProps, node));

  if (replacedElements.indexOf(nodeName) === -1) {
    pseudoSelectors.forEach(function(pseudo) {
      urls.push(...extractCSSImages(cssProps, node, pseudo));
    });
  }

  if (isLocalDoc) {
    const fileUrls = urls.filter(url => url.startsWith('file://'));
    const {cnv, ctx} = canvas;
    fileUrls.forEach(function(url) {
      let img = document.querySelector(`img[src="${url}"]`);
      if (!img) {
        img = new Image();
        img.src = url;
        const startTime = new Date().getTime();
        while (true) {
          if (
            img.complete ||
            img.naturalWidth ||
            new Date().getTime() - startTime > 120000
          ) {
            break;
          }
        }
      }

      cnv.width = img.naturalWidth;
      cnv.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      urls[urls.indexOf(url)] = cnv.toDataURL();
      ctx.clearRect(0, 0, cnv.width, cnv.height);
    });
  }

  return urls;
}

function parseDocument() {
  if (typeof clickTarget === 'undefined' || !clickTarget.node) {
    return null;
  }

  const urls = [];
  const targetNode = clickTarget.node;
  const isLocalDoc = window.location.href.startsWith('file://');

  if (!document.querySelector('html')) {
    return urls;
  }

  if (isLocalDoc && !canvas.cnv) {
    canvas.cnv = document.createElement('canvas');
    canvas.ctx = canvas.cnv.getContext('2d');
  }

  urls.push(...parseNode(targetNode, isLocalDoc));

  if (targetNode.nodeName !== 'IMG' || frameStorage.options.imgFullParse) {
    const fullParseUrls = [];

    const clickRectBottom = clickTarget.y + 50;
    const clickRectTop = clickTarget.y - 50;
    const clickRectLeft = clickTarget.x - 50;
    const clickRectRight = clickTarget.x + 50;

    const nodes = document.getElementsByTagName('*');
    const nodeCount = nodes.length;

    for (let i = 0; i < nodeCount; i++) {
      let currentNode = nodes[i];

      let nodeRect = currentNode.getBoundingClientRect();
      if (
        clickRectBottom < nodeRect.top + window.scrollY ||
        clickRectTop > nodeRect.bottom + window.scrollY ||
        clickRectLeft > nodeRect.right + window.scrollX ||
        clickRectRight < nodeRect.left + window.scrollX
      ) {
        continue;
      }

      if (!currentNode.isSameNode(targetNode)) {
        fullParseUrls.push(...parseNode(currentNode, isLocalDoc));
      }
    }

    urls.push(...fullParseUrls.reverse());
  }

  return urls.filter(url => rxSupportedUrls.test(url));
}
