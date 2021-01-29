<p align="center"><img src="https://i.imgur.com/7eMgOtm.png"></p>
<h1 align="center">Search by Image</h1>

<p align="center">
  </br></br>
  <a href="https://chrome.google.com/webstore/detail/cnojnbdhbhnkbcieeekonklommdnndci">
    <img src="https://i.imgur.com/B0i5sn3.png" alt="Chrome Web Store"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/search_by_image/">
    <img src="https://i.imgur.com/kMH6r1a.png" alt="Firefox add-ons"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/hckehkfhdkpmdlonmjaagiodlpjbonmc">
    <img src="https://i.imgur.com/n49Wiu2.png" alt="Microsoft Store"></a>
  <a href="https://addons.opera.com/en/extensions/details/search-by-image/">
    <img src="https://i.imgur.com/wK10qEV.png" alt="Opera add-ons"></a>
  </br></br>
</p>
<p align="center">
  <a href="https://galaxy.store/ravr">
    <img src="https://i.imgur.com/uUjUDYf.png" alt="Galaxy Store"></a>
  <a href="https://apps.apple.com/us/app/search-by-image-for-safari/id1544552106">
    <img src="https://i.imgur.com/APuaioW.png" alt="Mac App Store"></a>
  </br></br>
</p>

## Supporting the Project

The continued development of Search by Image is made possible
thanks to the support of awesome backers. If you'd like to join them,
please consider contributing with
[Patreon](https://armin.dev/go/patreon?pr=search-by-image&src=repo),
[PayPal](https://armin.dev/go/paypal?pr=search-by-image&src=repo) or
[Bitcoin](https://armin.dev/go/bitcoin?pr=search-by-image&src=repo).

## Description

Search by Image is a browser extension which enables you to initiate a
reverse image search from the right-click context menu or the browser toolbar,
and comes with support for more than 30 search engines.

Images positioned at the selected area are detected regardless of how they were
embedded in the page. The extension also supports uploading local images,
searching for video frames, capturing details within images,
and searching for images from private sites.

#### Search Engines

A diverse set of reverse image search engines are supported,
which can be toggled and reordered from the extension's options.
Visit the wiki for the full list of supported search engines.

https://github.com/dessant/search-by-image/wiki/Search-engines

#### Search Modes

The extension offers a handful of search modes which serve different use cases.
The search mode can be set independently for the context menu
and browser toolbar from the options page.

* **Select** (context menu and toolbar): select an image on the page, then search
  for the image URL, whenever possible. Blob and data URLs will still be
  handled as image uploads. This is the default search mode.
* **Select & upload** (context menu and toolbar): select an image on the page,
  then fetch the image, possibly from the browser cache, and upload it.
  This search mode is preferred for sites which do not allow direct linking
  of images or are otherwise private.
* **Capture** (context menu and toolbar): create an image by selecting
  and capturing a page area, then upload it.
* **Upload** (toolbar): select or drop an image from your device, or paste it from
  the clipboard, then upload it.
* **URL** (toolbar): search for an image URL.

#### Features

* Search with a single engine, or all enabled ones, directly from the top-level
  context menu item, or the browser toolbar button (see options)
* Detect any image on the page, including those declared in CSS and pseudo-elements
* Select the desired image from a dialog when multiple images are found
* Search for images from private sites (see search modes)
* Search for local images
* Search for the current video frame

## Screenshots

<p>
  <img width="276" src="https://i.imgur.com/eV6B53R.png">
  <img width="276" src="https://i.imgur.com/ylHTQkS.png">
  <img width="276" src="https://i.imgur.com/rwUcedk.png">
  <img width="276" src="https://i.imgur.com/DtgpxvL.png">
  <img width="276" src="https://i.imgur.com/w0yU1Rm.png">
  <img width="276" src="https://i.imgur.com/Vp6XYTw.png">
  <img width="276" src="https://i.imgur.com/qBKWrW1.png">
</p>

## License

Copyright (c) 2017-2021 Armin Sebastian

This software is released under the terms of the GNU General Public License v3.0.
See the [LICENSE](LICENSE) file for further information.
