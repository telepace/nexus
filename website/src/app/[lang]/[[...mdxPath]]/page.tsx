import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { generateStaticParamsFor, importPage } from 'nextra/pages'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

/**
 * Generates metadata for a given page based on provided properties.
 *
 * This function asynchronously retrieves the parameters and language information from the provided props.
 * It constructs an MDX path using these details, defaulting to 'index' if no path is specified.
 * The function then attempts to import metadata from the corresponding MDX file.
 * If successful, it returns the imported metadata; otherwise, it returns a default metadata object
 * indicating that the page was not found.
 *
 * @async
 * @param {PageProps} props - The properties of the page including parameters and language information.
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
 * Handles rendering of pages based on language and path parameters.
 *
 * The function first retrieves the params from the provided props. It checks if the language code is valid ('en' or 'zh'),
 * redirecting to English if not. If no mdxPath is provided, it defaults to 'index'. It then attempts to load the MDX content
 * using the importPage function. If successful, it renders the MDX content; otherwise, it logs an error and calls notFound.
 *
 * @async
 * @function Page
 * @param {PageProps} props - An object containing properties for the page component.
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
