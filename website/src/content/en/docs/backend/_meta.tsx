import type { MetaRecord } from 'nextra' // Changed to MetaRecord

// Using MetaRecord as it's used in other _meta.tsx files
// and seems more appropriate for defining file-based metadata.
const meta: MetaRecord = {
  'index': {
    title: 'Backend',
  },
  'fastapi-models-and-database': {
    title: 'FastAPI, Models, and Database',
  },
  'development-workflow': {
    title: 'Development Workflow',
  },
  'sentry-integration': {
    title: 'Sentry Integration',
  },
}

export default meta 