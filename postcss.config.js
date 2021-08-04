module.exports = function (api) {
  if (api.env === 'production') {
    return {
      plugins: [
        require('autoprefixer'),
        require('cssnano')({zindex: false, discardUnused: false})
      ]
    };
  }

  return {
    plugins: [require('autoprefixer')]
  };
};
