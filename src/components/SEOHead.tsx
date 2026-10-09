import React from 'react';
import { useDocumentMetadata, DocumentMetadataOptions } from '../hooks/useDocumentMetadata';

export interface SEOHeadProps extends DocumentMetadataOptions {}

/**
 * Declarative component for injecting dynamic head metadata, Open Graph cards,
 * and JSON-LD schema into the page.
 */
export const SEOHead: React.FC<SEOHeadProps> = (props) => {
  useDocumentMetadata(props);
  return null;
};
