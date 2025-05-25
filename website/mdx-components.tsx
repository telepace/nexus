import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'

/**
 * Retrieves MDX components, merging with custom components if provided.
 */
export function getMDXComponents(components = {}) {
  return {
    ...getDocsMDXComponents(components),
    // Add custom components here
  }
}
