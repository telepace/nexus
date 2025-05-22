/**
 * Custom Jest resolver to handle .next directory issues
 */
module.exports = (path, options) => {
  // Skip all package.json files in .next directory
  if (path.includes(".next/types/package.json")) {
    return options.defaultResolver("./jest.resolver.stub.js", options);
  }

  // Skip all files in .next/types directory
  if (path.includes(".next/types/")) {
    return options.defaultResolver("./jest.resolver.stub.js", options);
  }

  // Use the default resolver for all other files
  return options.defaultResolver(path, options);
};
