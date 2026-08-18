export interface Homework {
  chapter: number;
  description: string;
  expectedOutcome: string;
}

export interface CourseSoftwareOption {
  id: string; // e.g. 'premiere', 'davinci', 'capcut'
  title: string; // e.g. 'Adobe Premiere Pro'
  imageUrl: string; // Icon image URL
  status: 'available' | 'coming_soon';
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
  softwareOptions?: CourseSoftwareOption[];
}

export type CommunityTab = 
  | 'stream'
  | 'chat'
  | 'vault'
  | 'challenges'
  | 'schedule'
  | 'coworking';

export interface CommunityChannel {
  id: string;
  name: string;
  category: 'General' | 'Feedback & Critique' | 'Specialized' | 'Career & Collabs' | 'Assets';
  description: string;
  icon: string;
  isPrivate?: boolean;
  unreadCount?: number;
}

export interface CommunityMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole?: 'admin' | 'instructor' | 'pro' | 'student';
  content: string;
  mediaUrl?: string;
  replyTo?: {
    id: string;
    userName: string;
    content: string;
  };
  reactions?: Record<string, string[]>; // emoji -> [uid1, uid2]
  isPinned?: boolean;
  createdAt: string;
}

export interface CommunityLivestream {
  id: string;
  title: string;
  description: string;
  hostName: string;
  hostAvatar: string;
  hostRole: string;
  streamUrl: string;
  status: 'live' | 'upcoming' | 'ended';
  scheduledAt?: string;
  viewersCount: number;
  tags: string[];
  recordingUrl?: string;
  createdAt: string;
}

export interface CommunityQuestion {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  question: string;
  upvotes: string[]; // uids
  upvotesCount: number;
  isAnswered: boolean;
  createdAt: string;
}

export type VaultCategory = 
  | 'all'
  | 'sfx'
  | 'luts'
  | 'templates'
  | 'presets'
  | 'overlays'
  | '3d-assets'
  | 'project-files';

export interface CommunityVaultResource {
  id: string;
  title: string;
  description: string;
  category: VaultCategory;
  format: string; // e.g. '.WAV (48kHz)', '.CUBE (33x)', '.MOGRT', '.AEP'
  fileSize: string;
  downloadUrl: string;
  previewUrl?: string;
  audioUrl?: string;
  isPro?: boolean;
  downloadsCount: number;
  likesCount: number;
  likes?: string[];
  tags: string[];
  createdAt: string;
}

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  prompt: string;
  rawFootageUrl?: string;
  prize: string;
  deadline: string;
  status: 'active' | 'voting' | 'completed';
  coverImage: string;
  rules: string[];
  submissionsCount: number;
  winner?: {
    userName: string;
    userAvatar: string;
    videoUrl: string;
    title: string;
  };
  createdAt: string;
}

export interface CommunityChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  videoUrl: string;
  title: string;
  description: string;
  thumbnail: string;
  votes: string[];
  votesCount: number;
  createdAt: string;
}



