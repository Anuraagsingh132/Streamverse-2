import { useEffect } from 'react';

export interface DocumentMetadataOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'video.movie' | 'video.tv_show' | 'video.other';
  jsonLd?: Record<string, any>;
}

const DEFAULT_TITLE = 'Streamverse - Watch Movies, Anime, TV Shows & Live Sports';
const DEFAULT_DESCRIPTION = 'Streamverse is a cinematic streaming platform where you can discover movies, anime, tv series and live sports in high-definition.';
const DEFAULT_IMAGE = '/favicon-32x32.png';

function setMetaTag(nameOrProperty: string, content: string, isProperty: boolean = false) {
  const selector = isProperty ? `meta[property="${nameOrProperty}"]` : `meta[name="${nameOrProperty}"]`;
  let tag = document.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    if (isProperty) tag.setAttribute('property', nameOrProperty);
    else tag.setAttribute('name', nameOrProperty);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/**
 * Custom hook to dynamically manage document head metadata, Open Graph tags,
 * Twitter cards, and Schema.org JSON-LD structured data.
 */
export function useDocumentMetadata(options: DocumentMetadataOptions) {
  const { title, description, image, url, type = 'website', jsonLd } = options;

  useEffect(() => {
    // 1. Update document title
    const fullTitle = title
      ? (title.includes('Streamverse') ? title : `${title} — Streamverse`)
      : DEFAULT_TITLE;
    document.title = fullTitle;

    // 2. Standard Meta Description
    const metaDesc = description || DEFAULT_DESCRIPTION;
    setMetaTag('description', metaDesc);

    // 3. Open Graph Tags
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', metaDesc, true);
    setMetaTag('og:type', type, true);
    const ogImage = image || DEFAULT_IMAGE;
    setMetaTag('og:image', ogImage, true);
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    if (currentUrl) {
      setMetaTag('og:url', currentUrl, true);
    }

    // 4. Twitter Card Tags
    setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:image', ogImage);
    setMetaTag('twitter:description', metaDesc);

    // 5. Schema.org JSON-LD Structured Data
    let scriptTag = document.getElementById('streamverse-jsonld') as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'streamverse-jsonld';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLd);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      // Revert to default title on unmount
      document.title = DEFAULT_TITLE;
      const existingScript = document.getElementById('streamverse-jsonld');
      if (existingScript) existingScript.remove();
    };
  }, [title, description, image, url, type, jsonLd]);
}
