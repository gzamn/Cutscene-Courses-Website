import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { db, doc, onSnapshot } from '../firebase';

export interface SeoRouteItem {
  id?: string;
  path: string;
  title: string;
  description: string;
  image: string;
}

export interface SeoConfigData {
  globalTitle?: string;
  globalDescription?: string;
  globalImage?: string;
  routes?: SeoRouteItem[];
}

export function getOgMetadataForPath(
  pathStr: string,
  currentUrl: string,
  config?: SeoConfigData | null
) {
  let title = config?.globalTitle || "Cutscene - Video Editing Course";
  let description = config?.globalDescription || "Learn video editing from scratch with our complete course.";
  let image = config?.globalImage || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";

  const p = pathStr.toLowerCase();

  // If dynamic Firestore config is provided, check for route matches first
  if (config?.routes && config.routes.length > 0) {
    // 1. Try exact match first
    const exactMatch = config.routes.find(r => r.path && r.path.toLowerCase() === p);
    if (exactMatch) {
      return {
        title: exactMatch.title || title,
        description: exactMatch.description || description,
        image: exactMatch.image || image,
        url: currentUrl
      };
    }

    // 2. Try prefix match (for nested sub-links like /courses/1/video/...)
    const sortedRoutes = [...config.routes].sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0));
    const prefixMatch = sortedRoutes.find(r => r.path && r.path !== '/' && p.startsWith(r.path.toLowerCase()));
    if (prefixMatch) {
      return {
        title: prefixMatch.title || title,
        description: prefixMatch.description || description,
        image: prefixMatch.image || image,
        url: currentUrl
      };
    }
  }

  // Built-in defaults fallback
  if (p.includes('/courses/') && (p.includes('/video/') || p.includes('/quiz/') || p.includes('/exercise/'))) {
    title = "Cutscene - Video Editing Course Session";
    description = "Learn video editing from scratch with our complete course.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/1')) {
    title = "Cutscene - Video Editing 101";
    description = "Master professional video editing from scratch with Premiere Pro, DaVinci Resolve and After Effects.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/2')) {
    title = "Cutscene - Web Development Bootcamp";
    description = "Build modern web applications from scratch with React, TypeScript, and Tailwind CSS.";
    image = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/3')) {
    title = "Cutscene - Advanced Frontend Engineering";
    description = "Master full-stack web architecture, interactive UIs, and state management.";
    image = "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop";
  } else if (p.includes('/courses/4')) {
    title = "Cutscene - VFX & Motion Graphics Masterclass";
    description = "Create stunning visual effects, 3D motion graphics, and compositing like a pro.";
    image = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/courses')) {
    title = "Cutscene - Video Editing & Tech Courses";
    description = "Explore our complete masterclass curricula in video editing, motion graphics, and web development.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/store')) {
    title = "Cutscene Store - Video Assets, Plugins & LUTs";
    description = "Download high-quality video editing templates, LUTs, light leaks, sound effects, and motion graphic presets.";
    image = "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/resources')) {
    title = "Cutscene Resources - Free Editing Packs";
    description = "Access free editing assets, project files, keyboard shortcut cheat sheets, and creative tools.";
    image = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/student-work')) {
    title = "Cutscene Showcase - Student Edits & Projects";
    description = "Discover amazing video edits, visual effects, and web apps created by Cutscene Academy students.";
    image = "https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/support')) {
    title = "Cutscene Support & Help Desk";
    description = "Get instant assistance, reach technical support via WhatsApp or Email, and find FAQs.";
    image = "https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=1200&auto=format&fit=crop";
  } else if (p.startsWith('/complete-order') || p.startsWith('/payment')) {
    title = "Cutscene Checkout - Course Enrollment";
    description = "Securely complete your enrollment in Cutscene Academy masterclasses.";
    image = "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop";
  }

  return { title, description, image, url: currentUrl };
}

export default function SEOHead() {
  const location = useLocation();
  const [seoConfig, setSeoConfig] = useState<SeoConfigData | null>(null);

  // Subscribe to real-time SEO updates from Firestore config/seo
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'seo'), (snap) => {
      if (snap.exists()) {
        setSeoConfig(snap.data() as SeoConfigData);
      }
    }, (err) => {
      console.warn('SEOHead Firestore snapshot error:', err);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fullUrl = window.location.href;
    const meta = getOgMetadataForPath(location.pathname, fullUrl, seoConfig);

    // Update document title
    document.title = meta.title;

    // Helper to set or create meta tag
    const setMetaTag = (attrName: string, attrVal: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrVal);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('name', 'description', meta.description);
    setMetaTag('property', 'og:title', meta.title);
    setMetaTag('property', 'og:description', meta.description);
    setMetaTag('property', 'og:image', meta.image);
    setMetaTag('property', 'og:url', meta.url);
    setMetaTag('property', 'og:type', 'website');

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', meta.title);
    setMetaTag('name', 'twitter:description', meta.description);
    setMetaTag('name', 'twitter:image', meta.image);
  }, [location, seoConfig]);

  return null;
}
