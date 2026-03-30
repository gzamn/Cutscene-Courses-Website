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
  prerequisites: string[];
  instructor: {
    name: string;
    bio: string;
    avatar: string;
  };
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
    prerequisites: ['A computer with at least 8GB RAM', 'Basic computer literacy'],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
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
    prerequisites: ['Completion of Basic Video Editing or equivalent experience', 'Familiarity with Adobe Premiere Pro or DaVinci Resolve'],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
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
    prerequisites: ['Basic knowledge of Adobe Illustrator or Photoshop', 'Understanding of design principles'],
    instructor: {
      name: 'Amine Rouabhia',
      bio: 'Professional video editor and motion designer with extensive experience in creating high-impact visual content.',
      avatar: 'https://picsum.photos/seed/amine/100/100',
    },
  },
];
