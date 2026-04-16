export interface Homework {
  chapter: number;
  description: string;
  expectedOutcome: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  detailedDescription: string;
  price: number;
  currency: string;
  image: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  requirements: string[];
  learningOutcomes: string[];
  instructor: {
    name: string;
    bio: string;
    avatar: string;
  };
  homeworks?: Homework[];
  isComingSoon?: boolean;
  formatAvailability?: ('recorded' | 'online')[];
}

export const COURSES: Course[] = [
  {
    id: '1',
    title: 'Basic Video Editing',
    description: 'Master the fundamentals of video editing and start creating your own content.',
    detailedDescription: 'This comprehensive course covers everything from importing footage to final export. You will learn about cutting, transitions, basic color correction, and audio leveling using industry-standard software.',
    price: 7400,
    currency: 'DA',
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=800&auto=format&fit=crop',
    duration: '4 weeks',
    level: 'Beginner',
    requirements: ['A computer with at least 8GB RAM', 'Basic computer knowledge', 'Good internet connection'],
    learningOutcomes: [
      'Master industry-standard editing software',
      'Understand narrative storytelling through cuts',
      'Basic color correction and grading',
      'Audio mixing and sound design fundamentals'
    ],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
    homeworks: [
      { chapter: 1, description: 'Create a 30-second sequence from raw footage.', expectedOutcome: 'Clean cuts and logical flow.' },
      { chapter: 2, description: 'Apply basic color correction.', expectedOutcome: 'Natural skin tones and consistent exposure.' }
    ],
    formatAvailability: ['recorded', 'online']
  },
  {
    id: '2',
    title: 'Advanced Video Editing',
    description: 'Take your editing skills to the next level with advanced techniques and workflows.',
    detailedDescription: 'Dive deep into narrative editing, advanced color grading, multi-cam editing, and complex sound design. This course focuses on professional workflows used in high-end productions.',
    price: 9800,
    currency: 'DA',
    image: 'https://images.unsplash.com/photo-1535016120720-40c646bebbfc?q=80&w=800&auto=format&fit=crop',
    duration: '6 weeks',
    level: 'Intermediate',
    requirements: ['Completion of Basic Video Editing or equivalent experience', 'Familiarity with Adobe Premiere Pro or DaVinci Resolve', 'Basic computer knowledge', 'Good internet connection'],
    learningOutcomes: [
      'Advanced narrative editing techniques',
      'Professional color grading workflows',
      'Multi-camera editing and synchronization',
      'Complex sound design and foley'
    ],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
    homeworks: [
      { chapter: 1, description: 'Edit a multi-cam interview with at least 3 angles.', expectedOutcome: 'Seamless transitions and perfectly synced audio.' },
      { chapter: 2, description: 'Create a cinematic color grade for a short film scene.', expectedOutcome: 'Consistent mood and professional look.' }
    ],
    formatAvailability: ['recorded', 'online']
  },
  {
    id: '4',
    title: 'Graphic Design',
    description: 'Learn the principles of professional graphic design using industry-standard tools.',
    detailedDescription: 'Master typography, color theory, layout, and composition. This course covers Adobe Photoshop, Illustrator, and InDesign, providing you with the skills to create stunning visual identities, print materials, and digital assets.',
    price: 12000,
    currency: 'DA',
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=800&auto=format&fit=crop',
    duration: '6 weeks',
    level: 'Beginner',
    requirements: ['Computer with at least 8GB RAM', 'Design software installed', 'Basic creativity', 'Good internet connection'],
    learningOutcomes: [
      'Master professional design tools',
      'Understand typography and layout principles',
      'Create visual identities and branding',
      'Design for both print and digital media'
    ],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
    homeworks: [
      { chapter: 1, description: 'Design a minimalist logo.', expectedOutcome: 'Clear concept and balanced composition.' },
      { chapter: 2, description: 'Create a social media poster.', expectedOutcome: 'Hierarchy and effective use of color.' }
    ],
    formatAvailability: ['online']
  },
  {
    id: '3',
    title: 'Motion Design',
    description: 'Create stunning animations and visual effects for any project.',
    detailedDescription: 'Learn the art of motion design from scratch. We cover keyframing, typography in motion, 2D and 3D animation principles, and compositing techniques to bring your static designs to life.',
    price: 17500,
    currency: 'DA',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    duration: '8 weeks',
    level: 'Advanced',
    requirements: ['Basic knowledge of Adobe Illustrator or Photoshop', 'Understanding of design principles', 'Basic computer knowledge', 'Good internet connection'],
    learningOutcomes: [
      'Master keyframing and animation principles',
      'Create dynamic motion typography',
      '2D and 3D animation techniques',
      'Advanced compositing and visual effects'
    ],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
    homeworks: [
      { chapter: 1, description: 'Animate a logo using at least 3 different animation principles.', expectedOutcome: 'Fluid motion and professional timing.' },
      { chapter: 2, description: 'Create a 10-second kinetic typography sequence.', expectedOutcome: 'Clear legibility and dynamic movement.' }
    ],
    isComingSoon: true,
    formatAvailability: ['recorded', 'online']
  },
];
