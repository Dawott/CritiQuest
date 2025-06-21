// Empty stub file to replace server-side packages
console.warn('🚫 Server-side package blocked by empty stub');

// Export empty objects for any import patterns
module.exports = {};
module.exports.default = {};

// Common function stubs
module.exports.configureDefaultLogger = () => {
  console.warn('configureDefaultLogger stubbed');
};

module.exports.createLogger = () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
});

// Export as both CommonJS and ES modules
export default {};
export const configureDefaultLogger = () => {
  console.warn('configureDefaultLogger stubbed');
};

export const createLogger = () => ({
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
});