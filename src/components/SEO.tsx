import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeoMetadata, SeoMetaData } from '../lib/seo';
import { db, doc, onSnapshot } from '../firebase';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEO: React.FC<SEOProps> = ({ title, description, image, url, type }) => {
  const location = useLocation();
  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    try {
      unsubscribe = onSnapshot(
        doc(db, 'config', 'settings'),
        (snapshot) => {
          if (snapshot.exists()) {
            setLiveSettings(snapshot.data());
          }
        },
        (err) => {
          console.warn('SEO settings live listener error:', err);
        }
      );
    } catch (e) {
      console.warn('SEO live settings setup warning:', e);
    }
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // 1. Resolve SEO metadata for the current route
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://cutscene.vercel.app';
    const computedSeo: SeoMetaData = getSeoMetadata(location.pathname, currentOrigin, liveSettings);

    const finalTitle = title || computedSeo.title;
    const finalDescription = description || computedSeo.description;
    const finalImage = image || computedSeo.image;
    const finalUrl = url || `${currentOrigin}${location.pathname}`;
    const finalType = type || computedSeo.type;

    // 2. Update document.title
    document.title = finalTitle;

    // 3. Helper function to update or inject meta tags safely
    const setMetaTag = (selector: string, attributeName: string, attributeValue: string, contentValue: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', contentValue);
    };

    const setLinkCanonical = (hrefValue: string) => {
      let element = document.querySelector('link[rel="canonical"]');
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        document.head.appendChild(element);
      }
      element.setAttribute('href', hrefValue);
    };

    // Standard metadata
    setMetaTag('meta[name="description"]', 'name', 'description', finalDescription);
    setLinkCanonical(finalUrl);

    // Open Graph
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', computedSeo.siteName);
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', computedSeo.locale);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', finalType);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', finalDescription);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', finalImage);
    setMetaTag('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
    setMetaTag('meta[property="og:image:height"]', 'property', 'og:image:height', '630');
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', finalUrl);

    // Twitter Card
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', computedSeo.twitterCard);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', finalDescription);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', finalImage);
  }, [location.pathname, liveSettings, title, description, image, url, type]);

  return null;
};
