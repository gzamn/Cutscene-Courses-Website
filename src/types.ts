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
  formatAvailability?: ('recorded')[];
}


