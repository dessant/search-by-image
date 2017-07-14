const cssProperties = ['background-image', 'border-image-source', 'mask-image'];
const pseudoSelectors = ['::before', '::after'];
const replacedElements = ['IMG', 'VIDEO', 'IFRAME', 'EMBED'];
const rx = /url\(['"]?([^'")]+)['"]?\)/gi;

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
      while ((match = rx.exec(value)) !== null) {
        urls.push(match[1]);
      }
    }
  });

  return urls;
}

function parseNode(node) {
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

  return urls;
}

function parseDocument() {
  if (typeof clickTarget === 'undefined' || !clickTarget.node) {
    return null;
  }

  const urls = [];
  let targetNode = clickTarget.node;

  urls.push(...parseNode(targetNode));

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
        fullParseUrls.push(...parseNode(currentNode));
      }
    }

    urls.push(...fullParseUrls.reverse());
  }

  return urls;
}
