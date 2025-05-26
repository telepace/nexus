'use client'


/**
 * A React component that wraps its children elements within an empty fragment.
 *
 * @param {object} props - The component properties.
 * @param {React.ReactNode} props.children - The child elements to be wrapped.
 * @returns {JSX.Element} - The JSX element containing the wrapped children.
 */
export default function ClientMDXWrapper({ children }) {
  return <>{children}</>
}
