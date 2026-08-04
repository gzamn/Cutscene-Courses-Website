import { DEFAULT_COURSES } from '../firebase';

export interface SeoMetaData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
  locale: string;
  twitterCard: string;
}

export const DEFAULT_SEO_CONFIG: SeoMetaData = {
  title: 'Cutscene | Master Video Editing & Visual Storytelling',
  description: 'Learn professional video editing, color grading, VFX, sound design, and post-production through hands-on masterclasses.',
  image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop',
  url: 'https://cutscene.vercel.app',
  type: 'website',
  siteName: 'Cutscene',
  locale: 'en_US',
  twitterCard: 'summary_large_image',
};

/**
 * Ensure an image URL is an absolute HTTPS URL formatted for social sharing (1200x630 preferred).
 */
export function formatSocialImageUrl(imageUrl?: string): string {
  if (!imageUrl) return DEFAULT_SEO_CONFIG.image;
  
  let formatted = imageUrl;
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    if (formatted.startsWith('//')) {
      formatted = 'https:' + formatted;
    } else if (formatted.startsWith('/')) {
      formatted = 'https://cutscene.vercel.app' + formatted;
    } else {
      formatted = 'https://' + formatted;
    }
  }

  // Optimize unsplash images if needed
  if (formatted.includes('images.unsplash.com') && !formatted.includes('w=1200')) {
    formatted = formatted.replace(/w=\d+/, 'w=1200');
  }

  return formatted;
}

/**
 * Resolves full dynamic SEO metadata for any route pathname.
 */
export function getSeoMetadata(
  pathname: string,
  originHost: string = 'https://cutscene.vercel.app',
  customSettings?: any,
  coursesList: any[] = DEFAULT_COURSES
): SeoMetaData {
  const cleanPath = (pathname || '/').split('?')[0];
  const baseUrl = (customSettings?.canonicalBase || originHost).replace(/\/$/, '');
  const fullUrl = `${baseUrl}${cleanPath}`;

  const siteName = customSettings?.webName || customSettings?.siteName || DEFAULT_SEO_CONFIG.siteName;
  const globalTitle = customSettings?.seoTitle || DEFAULT_SEO_CONFIG.title;
  const globalDesc = customSettings?.seoDescription || DEFAULT_SEO_CONFIG.description;
  const globalImage = formatSocialImageUrl(customSettings?.seoImage || DEFAULT_SEO_CONFIG.image);
  const contactPhone = customSettings?.contactPhone || '0793193921';

  // Base fallback SEO object
  const seo: SeoMetaData = {
    ...DEFAULT_SEO_CONFIG,
    title: globalTitle,
    description: globalDesc,
    image: globalImage,
    siteName,
    url: fullUrl,
  };

  // Check if admin console defined custom page-level SEO overrides
  const pageOverride = customSettings?.pageSeoMap?.[cleanPath];
  if (pageOverride) {
    if (pageOverride.title) seo.title = pageOverride.title;
    if (pageOverride.description) seo.description = pageOverride.description;
    if (pageOverride.image) seo.image = formatSocialImageUrl(pageOverride.image);
    return seo;
  }

  if (cleanPath === '/' || cleanPath === '') {
    seo.title = customSettings?.seoTitle || `${siteName} | Master Video Editing & Visual Storytelling`;
    seo.description = globalDesc;
    seo.image = globalImage;
    return seo;
  }

  if (cleanPath === '/courses') {
    seo.title = `Courses & Masterclasses | ${siteName}`;
    seo.description = `Browse all video editing, color grading, VFX, and post-production masterclasses available on ${siteName}.`;
    seo.image = globalImage;
    return seo;
  }

  if (cleanPath === '/store') {
    seo.title = `Store & Creative Assets | ${siteName}`;
    seo.description = `Get premium video editing assets, LUTs, light leaks, sound effects, presets, and overlay packs on ${siteName}.`;
    seo.image = formatSocialImageUrl('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop');
    return seo;
  }

  if (cleanPath === '/resources') {
    seo.title = `Free Resources & Practice Clips | ${siteName}`;
    seo.description = `Download free video editing practice clips, raw footage, project files, sound packs, and overlays.`;
    seo.image = globalImage;
    return seo;
  }

  if (cleanPath === '/student-work') {
    seo.title = `Student Showcase & Portfolio | ${siteName}`;
    seo.description = `Explore impressive cinematic videos, edits, and projects created by ${siteName} students.`;
    seo.image = formatSocialImageUrl('https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=1200&auto=format&fit=crop');
    return seo;
  }

  if (cleanPath === '/support') {
    seo.title = `Support & Help Center | ${siteName}`;
    seo.description = `Contact our support desk via WhatsApp (${contactPhone}) or phone call. We are here to help you with course access and technical issues.`;
    seo.image = globalImage;
    return seo;
  }

  if (cleanPath === '/login') {
    seo.title = `Sign In | ${siteName}`;
    seo.description = `Sign in to access your video editing masterclasses, homework submissions, and student dashboard.`;
    return seo;
  }

  if (cleanPath === '/payment') {
    seo.title = `Enrollment & Checkout | ${siteName}`;
    seo.description = `Securely finalize your enrollment and get immediate access to ${siteName} courses.`;
    return seo;
  }

  if (cleanPath === '/dashboard') {
    seo.title = `Student Dashboard | ${siteName}`;
    seo.description = `View your active enrolled masterclasses, continue watching progress, and submit video exercises.`;
    return seo;
  }

  if (cleanPath === '/profile') {
    seo.title = `My Profile | ${siteName}`;
    seo.description = `Manage your student profile, account settings, and course progress on ${siteName}.`;
    return seo;
  }

  if (cleanPath === '/privacy-policy') {
    seo.title = `Privacy Policy | ${siteName}`;
    seo.description = `Read the privacy policy, data usage guidelines, and security terms for ${siteName}.`;
    return seo;
  }

  if (cleanPath === '/terms-and-conditions') {
    seo.title = `Terms & Conditions | ${siteName}`;
    seo.description = `Read the terms of service and student enrollment agreement for ${siteName}.`;
    return seo;
  }

  // Dynamic Course Page: /courses/:id
  const courseMatch = cleanPath.match(/^\/courses\/([^\/]+)$/);
  if (courseMatch) {
    const courseId = courseMatch[1];
    const course = (coursesList || []).find((c) => String(c.id) === String(courseId));
    if (course) {
      seo.title = course.seoTitle || `${course.title} | ${siteName}`;
      seo.description = course.seoDescription || course.description || course.detailedDescription || globalDesc;
      seo.image = formatSocialImageUrl(course.seoImage || course.image || globalImage);
    } else {
      seo.title = `Course Details | ${siteName}`;
      seo.description = `Master video editing and cinematic post-production with ${siteName}.`;
    }
    return seo;
  }

  // Dynamic Video Lesson Page: /courses/:id/video/:chapter/:type
  const videoMatch = cleanPath.match(/^\/courses\/([^\/]+)\/video\/([^\/]+)\/([^\/]+)$/);
  if (videoMatch) {
    const courseId = videoMatch[1];
    const chapter = videoMatch[2];
    const lessonType = videoMatch[3];
    const course = (coursesList || []).find((c) => String(c.id) === String(courseId));

    const courseTitle = course ? course.title : 'Masterclass';
    const typeLabel = lessonType === 'exercise' ? 'Practice Exercise' : lessonType === 'homework' ? 'Homework Review' : 'Session';

    seo.title = `${typeLabel} ${chapter} - ${courseTitle} | ${siteName}`;
    seo.description = `Watch ${typeLabel.toLowerCase()} ${chapter} of ${courseTitle} on ${siteName}.`;
    if (course && (course.seoImage || course.image)) {
      seo.image = formatSocialImageUrl(course.seoImage || course.image);
    }
    return seo;
  }

  // Generic fallback
  const segment = cleanPath.replace(/^\//, '').replace(/-/g, ' ');
  const formattedSegment = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : siteName;

  seo.title = `${formattedSegment} | ${siteName}`;
  seo.description = `Explore ${formattedSegment.toLowerCase()} on ${siteName}. Master professional video editing and visual storytelling.`;

  return seo;
}

/**
 * Renders complete HTML meta tags for initial server-side rendering (Express / Vercel).
 */
export function buildHtmlMetaTags(seo: SeoMetaData): string {
  const escapeAttr = (str: string) => (str || '').replace(/"/g, '&quot;');
  
  return `
    <title>${escapeAttr(seo.title)}</title>
    <meta name="description" content="${escapeAttr(seo.description)}" />
    <link rel="canonical" href="${escapeAttr(seo.url)}" />

    <!-- Open Graph / Facebook / WhatsApp / Instagram / Discord / Telegram -->
    <meta property="og:site_name" content="${escapeAttr(seo.siteName)}" />
    <meta property="og:locale" content="${escapeAttr(seo.locale)}" />
    <meta property="og:type" content="${escapeAttr(seo.type)}" />
    <meta property="og:title" content="${escapeAttr(seo.title)}" />
    <meta property="og:description" content="${escapeAttr(seo.description)}" />
    <meta property="og:image" content="${escapeAttr(seo.image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${escapeAttr(seo.url)}" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="${escapeAttr(seo.twitterCard)}" />
    <meta name="twitter:title" content="${escapeAttr(seo.title)}" />
    <meta name="twitter:description" content="${escapeAttr(seo.description)}" />
    <meta name="twitter:image" content="${escapeAttr(seo.image)}" />
  `.trim();
}
