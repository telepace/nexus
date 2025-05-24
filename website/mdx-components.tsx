import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs'

export function getMDXComponents(components = {}) {
  return {
    ...getDocsMDXComponents(components),
    // Add custom components here
  }
}
