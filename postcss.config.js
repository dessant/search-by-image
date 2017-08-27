module.exports = function(ctx) {
  return {
    plugins: {
      autoprefixer: ctx.env === 'production' ? {} : false,
      cssnano:
        ctx.env === 'production' ? {zindex: false, discardUnused: false} : false
    }
  };
};
