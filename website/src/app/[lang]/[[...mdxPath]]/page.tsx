import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { generateStaticParamsFor, importPage } from 'nextra/pages'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

/**
 * Generates metadata for a given page based on provided properties.
 *
 * @async
 * @param {PageProps} props - The properties of the page including parameters and language information.
 * @returns {Promise<Metadata>} A promise that resolves to an object containing the title and description of the page.
 *
 * This function determines whether the provided path corresponds to a home page or not.
 * If it is, metadata from a dictionary is used. For other paths, it attempts to import the
 * metadata from the corresponding mdx file. In case of an error during this process,
 * default metadata indicating that the page was not found is returned.
 */
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params
  const mdxPath = params.mdxPath || ['index']

  try {
    const { metadata } = await importPage(mdxPath, params.lang)
    return metadata || { title: 'Page', description: 'Page description' }
  }
  catch {
    return { title: 'Not Found', description: 'Page not found' }
  }
}

type PageProps = Readonly<{
  params: Promise<{
    mdxPath: string[] | undefined
    lang: string
  }>
}>

/**
 * The default function that handles rendering of pages based on language and path parameters.
 *
 * @async
 * @function Page
 * @param {PageProps} props - An object containing properties for the page component.
 * @returns {JSX.Element | void} - A JSX element representing the rendered page or void if an error occurs.
 *
 * @throws Will throw an error and redirect to '404' if there is a failure in loading the MDX content.
 */
export default async function Page(props: PageProps) {
  const params = await props.params

  // Ensure the language code is valid, otherwise redirect to English
  if (params.lang !== 'en' && params.lang !== 'zh') {
    redirect('/en')
  }

  // If no mdxPath is provided, use 'index' as default
  const mdxPath = params.mdxPath || ['index']

  try {
    const result = await importPage(mdxPath, params.lang)
    const { default: MDXContent } = result

    return <MDXContent {...props} params={params} />
  }
  catch (error) {
    console.error('Error loading page:', error)
    notFound()
  }
}
