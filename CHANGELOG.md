# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="1.4.1"></a>
## [1.4.1](https://github.com/dessant/search-by-image/compare/v1.4.0...v1.4.1) (2017-11-22)


### Bug Fixes

* always validate Yandex hostname ([687b872](https://github.com/dessant/search-by-image/commit/687b872))
* handle country specific Yandex redirection ([610bdd1](https://github.com/dessant/search-by-image/commit/610bdd1)), closes [#13](https://github.com/dessant/search-by-image/issues/13)
* set US locale for google.com ([d9762ec](https://github.com/dessant/search-by-image/commit/d9762ec))
* use country specific domain for Yandex search results ([709c34e](https://github.com/dessant/search-by-image/commit/709c34e))



<a name="1.4.0"></a>
# [1.4.0](https://github.com/dessant/search-by-image/compare/v1.3.0...v1.4.0) (2017-10-31)


### Bug Fixes

* add padding between select toolbar button and text ([1a74694](https://github.com/dessant/search-by-image/commit/1a74694))
* do not attempt to parse the page when not allowed ([84eabef](https://github.com/dessant/search-by-image/commit/84eabef))
* do not use browser style for options on Chrome and Opera ([ce7270d](https://github.com/dessant/search-by-image/commit/ce7270d))
* downscale large images before uploading to Bing ([0992c48](https://github.com/dessant/search-by-image/commit/0992c48))
* ensure upload scripts get executed in order ([3225cbc](https://github.com/dessant/search-by-image/commit/3225cbc))
* hide menu scrollbar ([dccd877](https://github.com/dessant/search-by-image/commit/dccd877))
* import theme and typography mixins instead of CSS ([ad4893d](https://github.com/dessant/search-by-image/commit/ad4893d))
* inject upload scripts only when the search page has finished loading ([66f4ee9](https://github.com/dessant/search-by-image/commit/66f4ee9))
* inline CSS not needed anymore, upstream fix ([6c40c3c](https://github.com/dessant/search-by-image/commit/6c40c3c))
* limit concurrent uploads to 3 images ([bf94a8f](https://github.com/dessant/search-by-image/commit/bf94a8f))
* open options in new tab on Chrome ([3b2c1f0](https://github.com/dessant/search-by-image/commit/3b2c1f0))
* revoke object URL as soon as possible and increase storage timeouts ([2654538](https://github.com/dessant/search-by-image/commit/2654538))
* **engines:** retrieve images using object URLs ([7da65e3](https://github.com/dessant/search-by-image/commit/7da65e3))
* set checkbox color and relay confirmFrameId ([58cdc86](https://github.com/dessant/search-by-image/commit/58cdc86))
* set minimum browser version in manifest for Chrome and Opera ([eddd6fc](https://github.com/dessant/search-by-image/commit/eddd6fc))
* set switch color ([87c3278](https://github.com/dessant/search-by-image/commit/87c3278))
* set tab index and active state correctly when uploading multiple files ([b1f4b33](https://github.com/dessant/search-by-image/commit/b1f4b33))


### Features

* filter and minimize locale messages and manifest in production ([79b806e](https://github.com/dessant/search-by-image/commit/79b806e))
* implement new search modes ([d634dcc](https://github.com/dessant/search-by-image/commit/d634dcc)), closes [#9](https://github.com/dessant/search-by-image/issues/9)
* notify on large images, avoid copying and uploading them ([a0bb3bd](https://github.com/dessant/search-by-image/commit/a0bb3bd))
* update search mode option labels ([17603af](https://github.com/dessant/search-by-image/commit/17603af))



<a name="1.3.0"></a>
# 1.3.0 (2017-08-31)

* Add .nvmrc ([4e493b6](https://github.com/dessant/search-by-image/commit/4e493b6))
* Add changelog ([f7a3374](https://github.com/dessant/search-by-image/commit/f7a3374))
* Add changelog script ([825fc1b](https://github.com/dessant/search-by-image/commit/825fc1b))
* Add project description and screenshots ([b692baa](https://github.com/dessant/search-by-image/commit/b692baa))
* Add support for Chrome and Opera ([3ded27f](https://github.com/dessant/search-by-image/commit/3ded27f))
* Additional icon sizes ([46f1252](https://github.com/dessant/search-by-image/commit/46f1252))
* Allow searching for local images (file:// scheme) ([42c9399](https://github.com/dessant/search-by-image/commit/42c9399))
* Babili renamed to babel-minify ([082f774](https://github.com/dessant/search-by-image/commit/082f774))
* Beautify icon svg ([2f7dc66](https://github.com/dessant/search-by-image/commit/2f7dc66))
* Better align options page style to MD spec ([7d2060e](https://github.com/dessant/search-by-image/commit/7d2060e))
* Bundle font files ([e44abb7](https://github.com/dessant/search-by-image/commit/e44abb7))
* Change order of manifest keys ([300d2f6](https://github.com/dessant/search-by-image/commit/300d2f6))
* Convert svg icons to png ([3eec1d3](https://github.com/dessant/search-by-image/commit/3eec1d3))
* Create tabs faster when searching all engines ([2a647a3](https://github.com/dessant/search-by-image/commit/2a647a3))
* Customize locale messages depending on build target ([3ca0ecc](https://github.com/dessant/search-by-image/commit/3ca0ecc))
* Do not discard @font-face rules ([35de3ce](https://github.com/dessant/search-by-image/commit/35de3ce))
* Do not ignore webextension-polyfill in Firefox ([1a4d326](https://github.com/dessant/search-by-image/commit/1a4d326))
* Do not load object element sources ([6e79e41](https://github.com/dessant/search-by-image/commit/6e79e41))
* Do not remove lodash iteratee shorthands in production build, fixes crash in uniqBy call ([9db6f44](https://github.com/dessant/search-by-image/commit/9db6f44))
* Do not require system dependencies to build extension archive ([81a246f](https://github.com/dessant/search-by-image/commit/81a246f))
* Extract common ui modules into a separate file ([82a59cb](https://github.com/dessant/search-by-image/commit/82a59cb))
* Fix dialog title contrast ([92c4593](https://github.com/dessant/search-by-image/commit/92c4593))
* Fix duplicate icon keys in manifest.json ([53445f1](https://github.com/dessant/search-by-image/commit/53445f1))
* Fix typo ([4542e00](https://github.com/dessant/search-by-image/commit/4542e00))
* Ignore .assets forder ([8bac206](https://github.com/dessant/search-by-image/commit/8bac206))
* Implement data URI support for Baidu ([c714c30](https://github.com/dessant/search-by-image/commit/c714c30))
* Implement data URI support for Sogou ([209c215](https://github.com/dessant/search-by-image/commit/209c215))
* Implement data URI support for Yandex ([f2e3a54](https://github.com/dessant/search-by-image/commit/f2e3a54))
* Iterate array and get its length without lodash ([20bf44d](https://github.com/dessant/search-by-image/commit/20bf44d))
* Merge searchAllEngines options ([33e8cb0](https://github.com/dessant/search-by-image/commit/33e8cb0))
* Open about:debugging page during web-ext run ([e47b0fb](https://github.com/dessant/search-by-image/commit/e47b0fb))
* Prevent Chrome errors ([8e751b1](https://github.com/dessant/search-by-image/commit/8e751b1))
* Refactor bing engine code ([b02e35f](https://github.com/dessant/search-by-image/commit/b02e35f))
* Refactor jpeg extension check ([5449b54](https://github.com/dessant/search-by-image/commit/5449b54))
* Replace var with let or const ([c0888e8](https://github.com/dessant/search-by-image/commit/c0888e8))
* Return only supported urls after parsing ([c1e3a4e](https://github.com/dessant/search-by-image/commit/c1e3a4e))
* Send image filename during upload ([b3b9b47](https://github.com/dessant/search-by-image/commit/b3b9b47))
* Set extension version at build time ([12f33a5](https://github.com/dessant/search-by-image/commit/12f33a5))
* Set image/png for favicon type ([b0e4cad](https://github.com/dessant/search-by-image/commit/b0e4cad))
* Set title for options and upload pages ([287dc55](https://github.com/dessant/search-by-image/commit/287dc55))
* Show extension icon in notifications ([564a983](https://github.com/dessant/search-by-image/commit/564a983))
* Show notification on engine error ([1646d8a](https://github.com/dessant/search-by-image/commit/1646d8a))
* Store index of data instead of serializing it ([3f1492a](https://github.com/dessant/search-by-image/commit/3f1492a))
* Style fix, auto ([9008c70](https://github.com/dessant/search-by-image/commit/9008c70))
* Style upload error message with MDC ([5f7da65](https://github.com/dessant/search-by-image/commit/5f7da65))
* Update dependencies ([1ee1522](https://github.com/dessant/search-by-image/commit/1ee1522))
* Use full allEngines name in submenu ([462b997](https://github.com/dessant/search-by-image/commit/462b997))
* Use passive event listener for saving the click target ([3f31e57](https://github.com/dessant/search-by-image/commit/3f31e57))
* Use random filenames of varying length ([32a529c](https://github.com/dessant/search-by-image/commit/32a529c))
* Use scope hoisting in production ([d0ae480](https://github.com/dessant/search-by-image/commit/d0ae480))
* Use strict equality for comparing page and frame url ([f6f004c](https://github.com/dessant/search-by-image/commit/f6f004c))
* Workaround for material-components/material-components-web/issues/1121 ([84561a4](https://github.com/dessant/search-by-image/commit/84561a4))
* Workaround for material-components/material-components-web/issues/1195 ([d64ef40](https://github.com/dessant/search-by-image/commit/d64ef40))



<a name="1.2.0"></a>
# 1.2.0 (2017-07-16)

* Add data URI support for Bing ([98afdef](https://github.com/dessant/search-by-image/commit/98afdef))
* Add missing data key ([24b684b](https://github.com/dessant/search-by-image/commit/24b684b))
* Add Sogou Images ([7e1f1b0](https://github.com/dessant/search-by-image/commit/7e1f1b0))
* Allow async code in content scripts ([14049e8](https://github.com/dessant/search-by-image/commit/14049e8))
* Allow creating new tabs by passing the url only ([28acac8](https://github.com/dessant/search-by-image/commit/28acac8))
* Chrome only supports ASCII [a-z], [A-Z], [0-9] and "_" for locale message keys ([427660a](https://github.com/dessant/search-by-image/commit/427660a))
* Fix invalid locale message key ([1c613c5](https://github.com/dessant/search-by-image/commit/1c613c5))
* Messaging sendResponse will be deprecated, use sendMessage instead ([7bc1f77](https://github.com/dessant/search-by-image/commit/7bc1f77))
* Prepare 1.2.0 release ([526211f](https://github.com/dessant/search-by-image/commit/526211f))
* Refactor engineId check for easier extension ([fbd52bc](https://github.com/dessant/search-by-image/commit/fbd52bc))
* Remove unneeded promise reference ([7ce78e3](https://github.com/dessant/search-by-image/commit/7ce78e3))
* Style fixes ([21602f1](https://github.com/dessant/search-by-image/commit/21602f1))
* Update Bing search url ([f1b053f](https://github.com/dessant/search-by-image/commit/f1b053f))
* Using fetch with a cross-origin referrer fails on Chrome ([675976e](https://github.com/dessant/search-by-image/commit/675976e))



<a name="1.1.0"></a>
# 1.1.0 (2017-07-14)

* Add support for Firefox 52 ([c28143a](https://github.com/dessant/search-by-image/commit/c28143a))
* Allow image search for links ([2bade11](https://github.com/dessant/search-by-image/commit/2bade11))
* Implement data URI support for TinEye ([32fffc2](https://github.com/dessant/search-by-image/commit/32fffc2))
* Minimize Vue component css during extraction ([a36dc87](https://github.com/dessant/search-by-image/commit/a36dc87))
* Move css to vue components and extract it into separate files ([764c239](https://github.com/dessant/search-by-image/commit/764c239))
* Parse elements below click area and show selection dialog on multiple results, refactoring and fixes ([2e31f50](https://github.com/dessant/search-by-image/commit/2e31f50))
* Prepare 1.1.0 release ([b82944a](https://github.com/dessant/search-by-image/commit/b82944a))
* Remove unused dependencies ([6637c63](https://github.com/dessant/search-by-image/commit/6637c63))
* Update dependencies ([3dad840](https://github.com/dessant/search-by-image/commit/3dad840))
* Update dependencies ([6169e1d](https://github.com/dessant/search-by-image/commit/6169e1d))
* Update dependencies ([c8c0e4c](https://github.com/dessant/search-by-image/commit/c8c0e4c))
* Use MD components on options page ([5dcda38](https://github.com/dessant/search-by-image/commit/5dcda38))



<a name="1.0.0"></a>
# 1.0.0 (2017-06-17)

* Add content ([3cb3096](https://github.com/dessant/search-by-image/commit/3cb3096))
* Prepare 1.0.0 release ([146837d](https://github.com/dessant/search-by-image/commit/146837d))
