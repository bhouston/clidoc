// Docusaurus 3 loads site configuration through CommonJS jiti.
module.exports = async function clidocPlugin(context, options) {
  const { default: plugin } = await import('./dist/index.js');
  return plugin(context, options);
};
