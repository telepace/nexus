# Frontend Utils - Image URL Normalization

## normalizeImageUrl Function

This utility function solves the Next.js Image component issue with protocol-relative URLs.

### Problem
Next.js Image component throws an error when encountering protocol-relative URLs (starting with `//`):
```
Error: Failed to parse src "//upload.wikimedia.org/..." on `next/image`, protocol-relative URL (//) must be changed to an absolute URL (http:// or https://)
```

### Solution
The `normalizeImageUrl` function automatically converts protocol-relative URLs to HTTPS URLs.

### Usage

```typescript
import { normalizeImageUrl } from '@/lib/utils';
import Image from 'next/image';

// Example usage with Next.js Image component
function MyComponent({ imageUrl }: { imageUrl: string }) {
  return (
    <Image
      src={normalizeImageUrl(imageUrl)}
      alt="Example image"
      width={500}
      height={300}
    />
  );
}

// Example conversions:
normalizeImageUrl('//upload.wikimedia.org/image.jpg')
// Returns: 'https://upload.wikimedia.org/image.jpg'

normalizeImageUrl('https://example.com/image.jpg')
// Returns: 'https://example.com/image.jpg' (unchanged)
```

### Integration
This function is already integrated into:
- `OptimizedImage` component
- `MarkdownRenderer` component for handling images in markdown content
- `LinkPreview` component (in website project)

### Configuration
Make sure to add the domains to `next.config.mjs` remotePatterns:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'upload.wikimedia.org',
    },
    {
      protocol: 'https',
      hostname: '*.wikimedia.org',
    },
    // ... other domains
  ],
}
``` 