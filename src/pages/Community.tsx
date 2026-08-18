import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Radio, 
  MessageSquare, 
  Sparkles, 
  Download, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Heart, 
  ThumbsUp, 
  Send, 
  Paperclip, 
  Smile, 
  Pin, 
  Trash2, 
  Award, 
  Calendar, 
  Users, 
  Music, 
  Layers, 
  Search, 
  Filter, 
  Share2, 
  Eye, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  Menu, 
  X, 
  Trophy, 
  Film, 
  Clock,
  Flame,
  Rocket,
  Lightbulb,
  ExternalLink,
  Plus,
  Compass,
  MessageCircle,
  Hash,
  Headphones,
  Check,
  Zap,
  Info,
  Maximize2,
  Minimize2,
  AlertCircle,
  Loader2,
  FolderDown,
  Disc
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { 
  db, 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  handleFirestoreError,
  OperationType 
} from '../firebase';
import { 
  CommunityTab, 
  CommunityChannel, 
  CommunityMessage, 
  CommunityLivestream, 
  CommunityQuestion, 
  CommunityVaultResource, 
  VaultCategory, 
  CommunityChallenge, 
  CommunityChallengeSubmission 
} from '../types';

// ============================================================================
// DEFAULT PRE-SEEDED CHANNELS CONFIGURATION
// ============================================================================
const DEFAULT_CHANNELS: CommunityChannel[] = [
  {
    id: 'general-lounge',
    name: 'general-lounge',
    category: 'General',
    description: 'The main gathering space for video editors, motion artists, and students.',
    icon: '#',
    unreadCount: 3
  },
  {
    id: 'edit-feedback-roast',
    name: 'edit-feedback-roast',
    category: 'Feedback & Critique',
    description: 'Post your latest rough cut or reel for constructive timeline feedback and critique.',
    icon: '#',
    unreadCount: 5
  },
  {
    id: 'motion-vfx-lounge',
    name: 'motion-vfx-lounge',
    category: 'Specialized',
    description: 'After Effects, Blender 3D, Premiere Pro, and DaVinci Resolve workflows & troubleshooting.',
    icon: '#'
  },
  {
    id: 'freelance-and-gigs',
    name: 'freelance-and-gigs',
    category: 'Career & Collabs',
    description: 'Paid editing opportunities, freelance client leads, and creator collaborations.',
    icon: '#',
    unreadCount: 2
  },
  {
    id: 'wins-and-showcase',
    name: 'wins-and-showcase',
    category: 'General',
    description: 'Share your latest published client work, viral reels, and production milestones.',
    icon: '#'
  },
  {
    id: 'plugin-and-tech-help',
    name: 'plugin-and-tech-help',
    category: 'Specialized',
    description: 'Stuck on a render error, expression bug, or color management issue? Ask here.',
    icon: '#'
  }
];

// ============================================================================
// DEFAULT CREATOR VAULT RESOURCES (PREMIUM PACKS, SFX, LUTS, TEMPLATES)
// ============================================================================
const DEFAULT_VAULT_RESOURCES: CommunityVaultResource[] = [
  {
    id: 'sfx-cinematic-impacts-v2',
    title: 'Cyberpunk & Cinematic Impact Hits Vol. 2',
    description: '120+ High-Definition sub-booms, trailer risers, whoosh hits, and low frequency bass drops.',
    category: 'sfx',
    format: '.WAV (48kHz 24-bit)',
    fileSize: '340 MB',
    downloadUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    isPro: true,
    downloadsCount: 1420,
    likesCount: 389,
    likes: [],
    tags: ['Trailer SFX', 'Sub-Bass', 'Transitions', 'Sound Design'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'lut-cinematic-tokyo-neon',
    title: 'Tokyo Neon & Cyber Blade DaVinci / Premiere LUT Pack',
    description: '15 High-Dynamic-Range 3D LUTs crafted specifically for Sony S-Log3, Apple Log, and Canon CLOG3.',
    category: 'luts',
    format: '.CUBE (33x33x33)',
    fileSize: '45 MB',
    downloadUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
    isPro: false,
    downloadsCount: 2840,
    likesCount: 712,
    likes: [],
    tags: ['Color Grading', 'S-Log3', 'Cyberpunk', 'Teal & Orange'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'mogrt-modern-kinetic-titles',
    title: 'Kinetic Typography & Lower Thirds (Premiere & AE MOGRTs)',
    description: '30 Fully customizable auto-resizing text cards, dynamic title openers, and glitch overlays.',
    category: 'templates',
    format: '.MOGRT / .AEP',
    fileSize: '185 MB',
    downloadUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop',
    isPro: true,
    downloadsCount: 1950,
    likesCount: 524,
    likes: [],
    tags: ['Typography', 'Titles', 'Lower Thirds', 'MOGRT'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'overlay-4k-kodak-film-grain',
    title: 'Authentic 4K Kodak 5219 35mm & 16mm Film Grain & Halation',
    description: 'Real photochemical film scans in ProRes 422 with genuine organic halation & gate weaves.',
    category: 'overlays',
    format: '.MOV (ProRes 422)',
    fileSize: '1.2 GB',
    downloadUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    isPro: true,
    downloadsCount: 3120,
    likesCount: 890,
    likes: [],
    tags: ['Film Look', '35mm Scan', 'Halation', 'Overlays'],
    createdAt: new Date().toISOString()
  },
  {
    id: '3d-cyber-hud-assets-blender',
    title: 'Holographic Sci-Fi HUD & UI Elements for Blender & AE',
    description: '40 Modular 3D UI gadgets, animated radar displays, audio visualizers, and looping sci-fi telemetry.',
    category: '3d-assets',
    format: '.BLEND / .FBX / Alpha PNGs',
    fileSize: '560 MB',
    downloadUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    isPro: false,
    downloadsCount: 1680,
    likesCount: 430,
    likes: [],
    tags: ['Blender 3D', 'Sci-Fi HUD', 'Motion Graphics', 'UI Design'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'project-commercial-car-edit',
    title: 'Commercial Automotive Breakdown & Complete AE Project File',
    description: 'Learn how our instructor edited a national car commercial: sound design stems, speed ramping & nodes.',
    category: 'project-files',
    format: '.AEP / .PRPROJ / Stems',
    fileSize: '2.4 GB',
    downloadUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
    isPro: true,
    downloadsCount: 940,
    likesCount: 610,
    likes: [],
    tags: ['Commercial', 'Car Edit', 'After Effects', 'Project File'],
    createdAt: new Date().toISOString()
  }
];

// ============================================================================
// DEFAULT ACTIVE COMMUNITY CHALLENGE
// ============================================================================
const DEFAULT_CHALLENGE: CommunityChallenge = {
  id: 'challenge-cyber-amv-2026',
  title: 'Edit Challenge #34: 30-Second Cyberpunk Anime AMV',
  description: 'Download the provided 4K raw anime footage and craft a high-impact, rhythm-synced 30-second sequence. Focus on sound design, seamless match cuts, and aggressive speed ramps.',
  prompt: 'Sync heavy bass hits with impact frames, add custom text motion, and grade in a moody neo-noir color scheme.',
  rawFootageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
  prize: '1 Year Adobe Creative Cloud Pro + 15,000 DA Store Credit + Cutscene Verified Editor Badge',
  deadline: '2026-08-30T23:59:59Z',
  status: 'active',
  coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
  rules: [
    'Length must be exactly 25 to 35 seconds.',
    'Must include at least 3 custom sound design elements from the Vault.',
    'Must submit high-res YouTube, Vimeo, or MP4 link with preview thumbnail.',
    'Original edits only; collaborative submissions must credit all editors.'
  ],
  submissionsCount: 19,
  createdAt: new Date().toISOString()
};

// ============================================================================
// DEFAULT COMMUNITY LIVESTREAM
// ============================================================================
const DEFAULT_LIVESTREAM: CommunityLivestream = {
  id: 'live-masterclass-davinci-19',
  title: 'Live Workshop: Advanced Color Science & Cinematic Grading in DaVinci Resolve 19',
  description: 'Join Academy Instructor Amine Rouabhia for an interactive live session breaking down commercial color management, ACES pipelines, film print emulation (FPE), and skin-tone vector curves.',
  hostName: 'Amine Rouabhia',
  hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  hostRole: 'Lead Colorist & Instructor',
  streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
  status: 'live',
  scheduledAt: '2026-08-18T18:00:00Z',
  viewersCount: 238,
  tags: ['DaVinci Resolve', 'Color Grading', 'Live Q&A', 'Masterclass'],
  createdAt: new Date().toISOString()
};

// ============================================================================
// LOFI PLAYLIST PRESETS FOR BACKGROUND STUDY / EDITING POD
// ============================================================================
const LOFI_TRACKS = [
  { title: 'Tokyo Midnight Rain (Lofi Beats)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'Cyberpunk Synthwave Focus', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { title: 'Late Night Timeline Rendering', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
];

export default function Community() {
  const { user, userProfile } = useAuth();
  const { language, t } = useLanguage();
  const { showToast } = useToast();
  const addToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => showToast(msg, type);
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation State
  const [activeTab, setActiveTab] = useState<CommunityTab>('stream');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('general-lounge');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Stream & Live Q&A State
  const [stream, setStream] = useState<CommunityLivestream>(DEFAULT_LIVESTREAM);
  const [streamQuestions, setStreamQuestions] = useState<CommunityQuestion[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [streamChatTab, setStreamChatTab] = useState<'chat' | 'qna' | 'resources'>('chat');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);

  // Group Chat State
  const [channels, setChannels] = useState<CommunityChannel[]>(DEFAULT_CHANNELS);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommunityMessage | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Vault State
  const [vaultResources, setVaultResources] = useState<CommunityVaultResource[]>(DEFAULT_VAULT_RESOURCES);
  const [vaultCategory, setVaultCategory] = useState<VaultCategory>('all');
  const [vaultSearch, setVaultSearch] = useState('');
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [savedVaultIds, setSavedVaultIds] = useState<string[]>([]);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [newResourceForm, setNewResourceForm] = useState({
    title: '',
    description: '',
    category: 'sfx' as VaultCategory,
    format: '.WAV (48kHz)',
    fileSize: '150 MB',
    downloadUrl: '',
    previewUrl: '',
    audioUrl: '',
    isPro: true,
    tags: 'Sound FX, Cinematic'
  });

  // Challenge State
  const [challenge, setChallenge] = useState<CommunityChallenge>(DEFAULT_CHALLENGE);
  const [challengeSubmissions, setChallengeSubmissions] = useState<CommunityChallengeSubmission[]>([]);
  const [showSubmitChallengeModal, setShowSubmitChallengeModal] = useState(false);
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnail: ''
  });

  // Lofi Background Music Radio
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [lofiTrackIndex, setLofiTrackIndex] = useState(0);
  const [lofiVolume, setLofiVolume] = useState(0.5);
  const lofiAudioRef = useRef<HTMLAudioElement | null>(null);

  // Scoped scroll ref for chat container only (prevents window scrolling)
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const previousChannelRef = useRef<string>(selectedChannelId);

  const isAdmin = userProfile?.role === 'admin' || user?.email === 'aminerouabhia14@gmail.com';
  const isProUser = userProfile?.role === 'admin' || (userProfile?.enrolledCourses && userProfile?.enrolledCourses.length > 0);

  // Sync route query if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab') as CommunityTab;
    const channelParam = params.get('channel');
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
    if (channelParam && channelParam !== selectedChannelId) {
      setSelectedChannelId(channelParam);
      setActiveTab('chat');
    }
  }, [location.search]);

  // Internal chat-only scroll adjustment (strictly scoped to inner container, never scrolling window)
  useEffect(() => {
    if (activeTab === 'chat' && chatScrollContainerRef.current) {
      const container = chatScrollContainerRef.current;
      if (previousChannelRef.current !== selectedChannelId) {
        previousChannelRef.current = selectedChannelId;
        container.scrollTop = container.scrollHeight;
      } else {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
        if (isNearBottom) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  }, [messages, activeTab, selectedChannelId]);

  // ============================================================================
  // FIRESTORE REAL-TIME LISTENERS
  // ============================================================================
  
  // 0. Listen for Dynamic Channels
  useEffect(() => {
    try {
      const channelsRef = collection(db, 'community_channels');
      const unsubscribe = onSnapshot(channelsRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: CommunityChannel[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) });
          });
          list.sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0));
          setChannels(list);
        } else {
          setChannels(DEFAULT_CHANNELS);
        }
      }, (err) => {
        console.warn('Channels onSnapshot warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to channels:', e);
    }
  }, []);

  // 0b. Listen for Live Stream Config
  useEffect(() => {
    try {
      const streamRef = collection(db, 'community_livestreams');
      const unsubscribe = onSnapshot(streamRef, (snapshot) => {
        if (!snapshot.empty) {
          const docs: CommunityLivestream[] = [];
          snapshot.forEach(d => docs.push({ id: d.id, ...(d.data() as any) }));
          // Find active live stream or most recently created
          const liveOne = docs.find(s => s.status === 'live') || docs[0];
          if (liveOne) setStream(liveOne);
        }
      }, (err) => {
        console.warn('Livestream listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to livestream:', e);
    }
  }, []);

  // 0c. Listen for Vault Resources
  useEffect(() => {
    try {
      const vaultRef = collection(db, 'community_vault_resources');
      const unsubscribe = onSnapshot(vaultRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: CommunityVaultResource[] = [];
          snapshot.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setVaultResources(list);
        } else {
          setVaultResources(DEFAULT_VAULT_RESOURCES);
        }
      }, (err) => {
        console.warn('Vault listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to vault resources:', e);
    }
  }, []);

  // 0d. Listen for Active Community Challenges
  useEffect(() => {
    try {
      const challengeRef = collection(db, 'community_challenges');
      const unsubscribe = onSnapshot(challengeRef, (snapshot) => {
        if (!snapshot.empty) {
          const list: CommunityChallenge[] = [];
          snapshot.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
          const activeCh = list.find(c => c.status === 'active' || c.status === 'voting') || list[0];
          if (activeCh) setChallenge(activeCh);
        }
      }, (err) => {
        console.warn('Challenge listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to challenges:', e);
    }
  }, []);

  // 1. Listen for Chat Messages for selected channel
  useEffect(() => {
    if (!selectedChannelId) return;

    try {
      const messagesRef = collection(db, 'community_messages');
      // Simple query filtered by channelId
      const q = query(
        messagesRef,
        where('channelId', '==', selectedChannelId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: CommunityMessage[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        // Sort chronologically in memory
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // If no messages yet in this channel, seed with welcome starter messages
        if (list.length === 0) {
          const starterMessages: CommunityMessage[] = [
            {
              id: 'starter-1',
              channelId: selectedChannelId,
              userId: 'academy-bot',
              userName: 'Cutscene Host',
              userAvatar: 'https://i.imgur.com/GbSMeSE.png',
              userRole: 'admin',
              content: `Welcome to **#${selectedChannelId}**! Share your ideas, ask questions, and connect with fellow creators. Remember to be supportive and creative!`,
              createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              id: 'starter-2',
              channelId: selectedChannelId,
              userId: 'creator-pro',
              userName: 'Karim Motion',
              userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
              userRole: 'pro',
              content: 'Hey everyone! Excited to collaborate and check out everyone\'s timelines and reels today.',
              reactions: {},
              createdAt: new Date(Date.now() - 1800000).toISOString()
            }
          ];
          setMessages(starterMessages);
        } else {
          setMessages(list);
        }
      }, (err) => {
        console.warn('Messages onSnapshot warning:', err);
        // Fallback to local default state
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to messages:', e);
    }
  }, [selectedChannelId]);

  // 2. Listen for Live Q&A questions
  useEffect(() => {
    try {
      const qRef = collection(db, 'community_stream_questions');
      const unsubscribe = onSnapshot(qRef, (snapshot) => {
        const list: CommunityQuestion[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => (b.upvotesCount || 0) - (a.upvotesCount || 0));
        if (list.length > 0) {
          setStreamQuestions(list);
        } else {
          // Pre-seed sample questions
          setStreamQuestions([
            {
              id: 'q-1',
              streamId: stream.id,
              userId: 'student-yacine',
              userName: 'Yacine DaVinci',
              userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
              question: 'How do you prevent skin tones from breaking when converting Sony S-Log3 to Rec.709 with heavy saturated neons?',
              upvotes: ['user-1', 'user-2', 'user-3', 'user-4'],
              upvotesCount: 4,
              isAnswered: true,
              createdAt: new Date().toISOString()
            },
            {
              id: 'q-2',
              streamId: stream.id,
              userId: 'student-nour',
              userName: 'Nour VFX',
              userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
              question: 'Will we get the project node tree and LUTs used in this live masterclass in the Vault?',
              upvotes: ['user-1', 'user-2'],
              upvotesCount: 2,
              isAnswered: false,
              createdAt: new Date().toISOString()
            }
          ]);
        }
      }, (err) => {
        console.warn('Q&A listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to Q&A:', e);
    }
  }, [stream.id]);

  // 3. Listen for Challenge Submissions
  useEffect(() => {
    try {
      const subRef = collection(db, 'community_challenge_submissions');
      const unsubscribe = onSnapshot(subRef, (snapshot) => {
        const list: CommunityChallengeSubmission[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        list.sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
        if (list.length > 0) {
          setChallengeSubmissions(list);
        } else {
          // Pre-seed sample submissions
          setChallengeSubmissions([
            {
              id: 'sub-1',
              challengeId: challenge.id,
              userId: 'editor-samir',
              userName: 'Samir Cuts',
              userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'CYBER-DRIFT // 30s Speed Ramp Edit',
              description: 'Created with Premiere Pro and After Effects. Used custom sub-impacts and speed ramping on anime beats.',
              thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
              votes: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
              votesCount: 6,
              createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: 'sub-2',
              challengeId: challenge.id,
              userId: 'editor-lyna',
              userName: 'Lyna Motion',
              userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
              videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'NEO TOKYO 2099 // Rhythm Flow',
              description: 'Heavy use of optical flow transitions, chromatic aberration, and film grain emulation.',
              thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
              votes: ['u1', 'u2', 'u3', 'u4'],
              votesCount: 4,
              createdAt: new Date(Date.now() - 43200000).toISOString()
            }
          ]);
        }
      }, (err) => {
        console.warn('Challenge submissions listener warning:', err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Failed to listen to submissions:', e);
    }
  }, [challenge.id]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !attachmentUrl.trim()) return;

    if (!user) {
      addToast('Please sign in to participate in the community chat!', 'error');
      navigate('/login');
      return;
    }

    setSendingMessage(true);
    try {
      const newMessage: Omit<CommunityMessage, 'id'> = {
        channelId: selectedChannelId,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'Editor',
        userAvatar: userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        userRole: isAdmin ? 'admin' : isProUser ? 'pro' : 'student',
        content: messageText.trim(),
        ...(attachmentUrl ? { mediaUrl: attachmentUrl.trim() } : {}),
        ...(replyingTo ? {
          replyTo: {
            id: replyingTo.id,
            userName: replyingTo.userName,
            content: replyingTo.content.slice(0, 80)
          }
        } : {}),
        reactions: {},
        createdAt: new Date().toISOString()
      };

      const messagesRef = collection(db, 'community_messages');
      await addDoc(messagesRef, newMessage);

      setMessageText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Fallback local update if network issue
      const localMsg: CommunityMessage = {
        id: `local-${Date.now()}`,
        channelId: selectedChannelId,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'Editor',
        userAvatar: userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        userRole: isAdmin ? 'admin' : isProUser ? 'pro' : 'student',
        content: messageText.trim(),
        ...(attachmentUrl ? { mediaUrl: attachmentUrl.trim() } : {}),
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, localMsg]);
      setMessageText('');
      setAttachmentUrl('');
      setReplyingTo(null);
      addToast('Message posted!', 'success');
    } finally {
      setSendingMessage(false);
    }
  };

  // Toggle Reaction on message
  const handleToggleReaction = async (message: CommunityMessage, emoji: string) => {
    if (!user) {
      addToast('Please sign in to react to messages!', 'info');
      return;
    }

    const currentReactions = { ...(message.reactions || {}) };
    const userList = currentReactions[emoji] || [];
    const hasReacted = userList.includes(user.uid);

    let updatedUsers: string[];
    if (hasReacted) {
      updatedUsers = userList.filter(uid => uid !== user.uid);
    } else {
      updatedUsers = [...userList, user.uid];
    }

    if (updatedUsers.length === 0) {
      delete currentReactions[emoji];
    } else {
      currentReactions[emoji] = updatedUsers;
    }

    // Optimistic UI update
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: currentReactions } : m));

    try {
      if (!message.id.startsWith('starter-') && !message.id.startsWith('local-')) {
        const msgDoc = doc(db, 'community_messages', message.id);
        await updateDoc(msgDoc, { reactions: currentReactions });
      }
    } catch (error) {
      console.warn('Reaction update error:', error);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!user) return;
    try {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      if (!msgId.startsWith('starter-') && !msgId.startsWith('local-')) {
        const msgDoc = doc(db, 'community_messages', msgId);
        await deleteDoc(msgDoc);
      }
      addToast('Message deleted', 'info');
    } catch (error) {
      console.error('Delete message error:', error);
    }
  };

  // Trigger floating reaction on live stream
  const triggerStreamReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = 30 + Math.random() * 40; // percentage
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 2400);
  };

  // Submit Question in Live Q&A
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    if (!user) {
      addToast('Please sign in to ask a question in the Live Q&A!', 'error');
      navigate('/login');
      return;
    }

    const newQ: Omit<CommunityQuestion, 'id'> = {
      streamId: stream.id,
      userId: user.uid,
      userName: userProfile?.displayName || user.displayName || 'Student',
      userAvatar: userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      question: newQuestionText.trim(),
      upvotes: [user.uid],
      upvotesCount: 1,
      isAnswered: false,
      createdAt: new Date().toISOString()
    };

    try {
      const qRef = collection(db, 'community_stream_questions');
      await addDoc(qRef, newQ);
      setNewQuestionText('');
      addToast('Question added to live queue!', 'success');
    } catch (err) {
      console.warn('Failed to add question to firestore:', err);
      setStreamQuestions(prev => [{ id: `q-${Date.now()}`, ...newQ }, ...prev]);
      setNewQuestionText('');
      addToast('Question submitted!', 'success');
    }
  };

  // Upvote Question in Live Q&A
  const handleUpvoteQuestion = async (q: CommunityQuestion) => {
    if (!user) {
      addToast('Please sign in to upvote questions!', 'info');
      return;
    }

    const hasUpvoted = (q.upvotes || []).includes(user.uid);
    let newUpvotes: string[];
    if (hasUpvoted) {
      newUpvotes = (q.upvotes || []).filter(uid => uid !== user.uid);
    } else {
      newUpvotes = [...(q.upvotes || []), user.uid];
    }
    const count = newUpvotes.length;

    // Optimistic
    setStreamQuestions(prev => prev.map(item => item.id === q.id ? { ...item, upvotes: newUpvotes, upvotesCount: count } : item));

    try {
      if (!q.id.startsWith('q-')) {
        const qDoc = doc(db, 'community_stream_questions', q.id);
        await updateDoc(qDoc, { upvotes: newUpvotes, upvotesCount: count });
      }
    } catch (err) {
      console.warn('Upvote error:', err);
    }
  };

  // Toggle Like on Vault Resource
  const handleToggleVaultLike = async (res: CommunityVaultResource) => {
    if (!user) {
      addToast('Please sign in to like vault resources!', 'info');
      return;
    }

    const currentLikes = res.likes || [];
    const hasLiked = currentLikes.includes(user.uid);
    const newLikes = hasLiked ? currentLikes.filter(u => u !== user.uid) : [...currentLikes, user.uid];
    const newCount = newLikes.length;

    setVaultResources(prev => prev.map(r => r.id === res.id ? { ...r, likes: newLikes, likesCount: newCount } : r));

    try {
      const resDoc = doc(db, 'community_vault_resources', res.id);
      await updateDoc(resDoc, { likes: newLikes, likesCount: newCount });
    } catch (err) {
      console.warn('Vault like update error:', err);
    }
  };

  // Bookmark / Save Vault Resource
  const handleToggleSaveVault = (resId: string) => {
    if (!user) {
      addToast('Sign in to bookmark resources to your private Vault!', 'info');
      return;
    }
    setSavedVaultIds(prev => {
      const isSaved = prev.includes(resId);
      if (isSaved) {
        addToast('Removed from your saved vault', 'info');
        return prev.filter(id => id !== resId);
      } else {
        addToast('Saved to your creator vault!', 'success');
        return [...prev, resId];
      }
    });
  };

  // Audio preview playback for SFX
  const handlePlayAudioPreview = (audioUrl?: string, resId?: string) => {
    if (!audioUrl || !resId) return;

    if (activeAudioPlaying === resId) {
      audioPlayerRef.current?.pause();
      setActiveAudioPlaying(null);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
      } else {
        audioPlayerRef.current.src = audioUrl;
      }
      audioPlayerRef.current.play().then(() => {
        setActiveAudioPlaying(resId);
      }).catch(err => {
        console.warn('Audio play blocked:', err);
      });

      audioPlayerRef.current.onended = () => {
        setActiveAudioPlaying(null);
      };
    }
  };

  // Download Resource
  const handleDownloadResource = (res: CommunityVaultResource) => {
    if (res.isPro && !isProUser && !isAdmin) {
      addToast('This is a Pro Creator Asset. Upgrade to an academy plan or enroll to unlock unlimited downloads!', 'error');
      navigate('/plans');
      return;
    }

    addToast(`Downloading ${res.title}...`, 'success');
    setVaultResources(prev => prev.map(r => r.id === res.id ? { ...r, downloadsCount: (r.downloadsCount || 0) + 1 } : r));

    // Open download link safely
    window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  // Submit to Challenge
  const handleSubmitChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeForm.title.trim() || !challengeForm.videoUrl.trim()) return;

    if (!user) {
      addToast('Please sign in to submit to the edit challenge!', 'error');
      navigate('/login');
      return;
    }

    setSubmittingChallenge(true);
    try {
      const newSub: Omit<CommunityChallengeSubmission, 'id'> = {
        challengeId: challenge.id,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'Creator',
        userAvatar: userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        title: challengeForm.title.trim(),
        description: challengeForm.description.trim(),
        videoUrl: challengeForm.videoUrl.trim(),
        thumbnail: challengeForm.thumbnail.trim() || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=600&auto=format&fit=crop',
        votes: [user.uid],
        votesCount: 1,
        createdAt: new Date().toISOString()
      };

      const subRef = collection(db, 'community_challenge_submissions');
      await addDoc(subRef, newSub);

      setShowSubmitChallengeModal(false);
      setChallengeForm({ title: '', description: '', videoUrl: '', thumbnail: '' });
      addToast('Your video challenge entry has been submitted! Best of luck!', 'success');
    } catch (err) {
      console.warn('Challenge submit error:', err);
      setChallengeSubmissions(prev => [{ id: `sub-${Date.now()}`, ...challengeForm, challengeId: challenge.id, userId: user.uid, userName: user.displayName || 'Creator', userAvatar: user.photoURL || '', votes: [user.uid], votesCount: 1, createdAt: new Date().toISOString() } as any, ...prev]);
      setShowSubmitChallengeModal(false);
      addToast('Entry recorded successfully!', 'success');
    } finally {
      setSubmittingChallenge(false);
    }
  };

  // Vote on Challenge Submission
  const handleVoteSubmission = async (sub: CommunityChallengeSubmission) => {
    if (!user) {
      addToast('Please sign in to vote for challenge entries!', 'info');
      return;
    }

    const hasVoted = (sub.votes || []).includes(user.uid);
    let updatedVotes: string[];
    if (hasVoted) {
      updatedVotes = (sub.votes || []).filter(uid => uid !== user.uid);
    } else {
      updatedVotes = [...(sub.votes || []), user.uid];
    }
    const count = updatedVotes.length;

    setChallengeSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, votes: updatedVotes, votesCount: count } : s));

    try {
      if (!sub.id.startsWith('sub-')) {
        const subDoc = doc(db, 'community_challenge_submissions', sub.id);
        await updateDoc(subDoc, { votes: updatedVotes, votesCount: count });
      }
    } catch (err) {
      console.warn('Vote submission error:', err);
    }
  };

  // Lofi Audio Toggle
  const toggleLofiMusic = () => {
    if (!lofiAudioRef.current) {
      lofiAudioRef.current = new Audio(LOFI_TRACKS[lofiTrackIndex].url);
      lofiAudioRef.current.loop = true;
      lofiAudioRef.current.volume = lofiVolume;
    }

    if (lofiPlaying) {
      lofiAudioRef.current.pause();
      setLofiPlaying(false);
    } else {
      lofiAudioRef.current.play().then(() => {
        setLofiPlaying(true);
      }).catch(e => console.warn('Lofi audio playback error:', e));
    }
  };

  // Filtered lists
  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVaultResources = vaultResources.filter(r => {
    const matchesCat = vaultCategory === 'all' || r.category === vaultCategory;
    const matchesQuery = !vaultSearch.trim() || 
      r.title.toLowerCase().includes(vaultSearch.toLowerCase()) || 
      r.description.toLowerCase().includes(vaultSearch.toLowerCase()) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(vaultSearch.toLowerCase())));
    return matchesCat && matchesQuery;
  });

  const selectedChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

  return (
    <div className="min-h-screen pt-16 bg-[#070512] text-white flex flex-col selection:bg-purple-500/30">
      
      {/* Floating Header Bar for Mobile Toggle */}
      <div className="lg:hidden sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-purple-900/20 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-900/40 text-purple-300 text-xs font-bold font-mono cursor-pointer active:scale-95 transition-all"
        >
          <Menu className="w-4 h-4" />
          <span>Channels & Stages</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-mono font-bold text-gray-300">Live Studio</span>
        </div>
      </div>

      {/* Main Two-Column / Sidebar Layout */}
      <div className="flex-1 flex overflow-hidden relative max-w-[1700px] w-full mx-auto">
        
        {/* ========================================================================= */}
        {/* LEFT SIDEBAR: CHANNELS, STAGES, VAULT, CHALLENGES, LOFI RADIO            */}
        {/* ========================================================================= */}
        <aside 
          className={`
            fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
            w-72 sm:w-80 bg-zinc-950/95 lg:bg-zinc-950/70 border-r border-purple-900/20
            flex flex-col shrink-0 backdrop-blur-xl transition-transform duration-300
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            top-16 lg:top-0 h-[calc(100vh-4rem)]
          `}
        >
          {/* Guild Header Banner */}
          <div className="p-4 border-b border-purple-900/20 bg-gradient-to-b from-purple-950/30 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-white tracking-tight leading-none">
                    Cutscene Creator Guild
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-gray-400">
                      184 Editors Online
                    </span>
                  </div>
                </div>
              </div>

              {/* Close Mobile Sidebar */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search channels */}
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search channels & rooms..."
                className="w-full bg-black/60 border border-purple-900/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Navigable Sidebar Items (Scrollable Area) */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-900/30">
            
            {/* SECTION 1: LIVE BROADCAST & STAGES */}
            <div>
              <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-purple-400">
                <span>Stages & Masterclasses</span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  LIVE
                </span>
              </div>

              <div className="space-y-1">
                {/* Live Stream Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('stream');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'stream'
                      ? 'bg-gradient-to-r from-red-600/30 to-purple-600/20 border border-red-500/40 text-white shadow-lg shadow-red-600/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div className="text-left truncate">
                      <span className="block truncate font-black">Live Workshop</span>
                      <span className="block text-[10px] text-gray-400 truncate">DaVinci Color Science</span>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-[9px] font-black text-white font-mono shrink-0">
                    238
                  </span>
                </button>

                {/* Masterclass Calendar Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('schedule');
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'schedule'
                      ? 'bg-purple-600/20 border border-purple-500/40 text-purple-300'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Workshop Schedule</span>
                </button>
              </div>
            </div>

            {/* SECTION 2: TEXT CHAT CHANNELS */}
            <div>
              <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-purple-400">
                <span>Text Channels</span>
                <span className="text-gray-500">#</span>
              </div>

              <div className="space-y-0.5">
                {filteredChannels.map((chan) => {
                  const isSelected = activeTab === 'chat' && selectedChannelId === chan.id;
                  return (
                    <button
                      key={chan.id}
                      type="button"
                      onClick={() => {
                        setSelectedChannelId(chan.id);
                        setActiveTab('chat');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-purple-600/30 border border-purple-500/50 text-white font-bold'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">{chan.icon}</span>
                        <span className="font-mono text-xs truncate">{chan.name}</span>
                      </div>
                      {chan.unreadCount && !isSelected && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-600 text-[9px] font-black text-white font-mono">
                          {chan.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: CREATOR VAULT (PREMIUM RESOURCES) */}
            <div>
              <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-purple-400">
                <span>Creator Vault</span>
                <Sparkles className="w-3 h-3 text-pink-400" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('vault');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'vault'
                    ? 'bg-gradient-to-r from-pink-600/30 to-purple-600/20 border border-pink-500/40 text-white shadow-lg shadow-pink-600/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-pink-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black">Premium Resources</span>
                    <span className="block text-[10px] text-gray-400">SFX, LUTs, MOGRTs</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-pink-950/60 border border-pink-500/30 text-[9px] font-mono text-pink-300">
                  PRO
                </span>
              </button>
            </div>

            {/* SECTION 4: CREATIVE EDIT CHALLENGES */}
            <div>
              <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-purple-400">
                <span>Edit Challenges</span>
                <Trophy className="w-3 h-3 text-amber-400" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('challenges');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'challenges'
                    ? 'bg-gradient-to-r from-amber-600/30 to-purple-600/20 border border-amber-500/40 text-white shadow-lg shadow-amber-600/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black">Weekly Edit Battle</span>
                    <span className="block text-[10px] text-amber-300/80">15,000 DA Prize</span>
                  </div>
                </div>
              </button>
            </div>

            {/* SECTION 5: CO-WORKING & EDIT PODS */}
            <div>
              <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-purple-400">
                <span>Audio Pods</span>
                <Headphones className="w-3 h-3 text-cyan-400" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('coworking');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeTab === 'coworking'
                    ? 'bg-cyan-600/20 border border-cyan-500/40 text-cyan-300'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Silent Co-Working Pod</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400">12 Active</span>
              </button>
            </div>
          </div>

          {/* LOFI RADIO PLAYER DOCK (BOTTOM OF SIDEBAR) */}
          <div className="p-3 border-t border-purple-900/20 bg-black/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Disc className={`w-4 h-4 text-purple-400 ${lofiPlaying ? 'animate-spin' : ''}`} />
                <div className="truncate">
                  <span className="block text-[10px] font-mono font-bold text-gray-300 truncate">
                    {LOFI_TRACKS[lofiTrackIndex].title}
                  </span>
                  <span className="block text-[9px] text-gray-500">Lofi Focus Beats</span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleLofiMusic}
                className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white cursor-pointer transition-all shadow-md shadow-purple-600/30"
                title={lofiPlaying ? 'Pause Lofi' : 'Play Lofi'}
              >
                {lofiPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            </div>

            {/* Quick Profile Mini Dock */}
            {user && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <Link to="/profile" className="flex items-center gap-2 group min-w-0">
                  <img
                    src={userProfile?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                    alt="User Avatar"
                    className="w-6 h-6 rounded-full object-cover border border-purple-500/40"
                  />
                  <div className="truncate">
                    <span className="block text-[11px] font-bold text-gray-200 group-hover:text-purple-300 truncate">
                      {userProfile?.displayName || user.displayName || 'Editor'}
                    </span>
                    <span className="block text-[9px] font-mono text-purple-400 capitalize">
                      {isAdmin ? 'Admin' : isProUser ? 'Pro Member' : 'Student'}
                    </span>
                  </div>
                </Link>
                <Link
                  to="/profile"
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                  title="Profile Settings"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* RIGHT MAIN VIEW AREA: TABS                                                */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col min-w-0 bg-black/40 relative overflow-y-auto">
          
          {/* ========================================================================= */}
          {/* TAB 1: LIVE STREAM & MASTERCLASS                                          */}
          {/* ========================================================================= */}
          {activeTab === 'stream' && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
              {/* Live Stream Main Cinema Player */}
              <div className="relative rounded-3xl overflow-hidden border border-purple-900/40 bg-zinc-950 shadow-2xl">
                {/* 16:9 Aspect Ratio Container */}
                <div className="relative aspect-video w-full bg-black overflow-hidden group">
                  <iframe
                    src={stream.streamUrl}
                    title={stream.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>

                {/* Broadcast Info Header */}
                <div className="p-6 border-t border-purple-900/30 bg-zinc-950/90">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {stream.tags.map(tag => (
                          <span key={tag} className="px-2.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-900/40 text-[10px] font-mono text-purple-300 font-bold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {stream.title}
                      </h1>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-3xl">
                        {stream.description}
                      </p>
                    </div>

                    {/* Host Card */}
                    <div className="flex items-center gap-3 bg-black/50 p-3 rounded-2xl border border-purple-900/30 shrink-0">
                      <img
                        src={stream.hostAvatar}
                        alt={stream.hostName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-purple-500 shadow-md shadow-purple-600/30"
                      />
                      <div>
                        <span className="block text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Host</span>
                        <h4 className="text-sm font-black text-white">{stream.hostName}</h4>
                        <span className="text-[11px] text-gray-400">{stream.hostRole}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Interactive Tabs: Live Q&A Queue, Stream Assets, Timeline */}
              <div className="bg-zinc-950/80 border border-purple-900/30 rounded-3xl p-6 shadow-2xl space-y-6">
                
                {/* Tab Switcher */}
                <div className="flex items-center justify-between border-b border-purple-900/20 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStreamChatTab('qna')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
                        streamChatTab === 'qna'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'text-gray-400 hover:text-white bg-black/40'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 text-purple-300" />
                      <span>Live Q&A Queue ({streamQuestions.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStreamChatTab('resources')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer ${
                        streamChatTab === 'resources'
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'text-gray-400 hover:text-white bg-black/40'
                      }`}
                    >
                      <FolderDown className="w-4 h-4 text-pink-300" />
                      <span>Live Session Assets</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
                    Interactive Live Broadcast
                  </span>
                </div>

                {/* Sub-tab: Q&A */}
                {streamChatTab === 'qna' && (
                  <div className="space-y-6">
                    {/* Ask a question box */}
                    <form onSubmit={handleAskQuestion} className="flex gap-2">
                      <input
                        type="text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Ask the instructor a question for the live stream..."
                        className="flex-1 bg-black border border-purple-900/40 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                      />
                      <button
                        type="submit"
                        disabled={!newQuestionText.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-purple-600/30 cursor-pointer shrink-0"
                      >
                        Ask Live
                      </button>
                    </form>

                    {/* Question List */}
                    <div className="space-y-3">
                      {streamQuestions.map((q) => {
                        const hasUpvoted = (q.upvotes || []).includes(user?.uid || '');
                        return (
                          <div
                            key={q.id}
                            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                              q.isAnswered
                                ? 'bg-purple-950/10 border-emerald-500/30'
                                : 'bg-black/60 border-purple-900/20 hover:border-purple-500/40'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={q.userAvatar}
                                alt={q.userName}
                                className="w-9 h-9 rounded-full object-cover border border-purple-500/40 shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-white">{q.userName}</span>
                                  {q.isAnswered && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Answered Live
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-300 leading-relaxed">{q.question}</p>
                              </div>
                            </div>

                            {/* Upvote Button */}
                            <button
                              type="button"
                              onClick={() => handleUpvoteQuestion(q)}
                              className={`flex flex-col items-center justify-center min-w-12 py-1.5 px-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                                hasUpvoted
                                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                                  : 'bg-zinc-900 border-purple-900/30 text-gray-400 hover:text-white hover:border-purple-500/40'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5 mb-0.5" />
                              <span className="text-[10px] font-mono font-bold">{q.upvotesCount || 0}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sub-tab: Session Assets */}
                {streamChatTab === 'resources' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-black/60 border border-purple-900/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                          <Download className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Live DaVinci PowerGrade (.drx)</h4>
                          <span className="text-[10px] font-mono text-gray-400">12.4 MB • Free for Attendees</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToast('Downloading session PowerGrade...', 'success')}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Download
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/60 border border-purple-900/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                          <Film className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Raw Cinema DNG Sample Clip</h4>
                          <span className="text-[10px] font-mono text-gray-400">450 MB • RED RAW Practice</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToast('Downloading sample clip...', 'success')}
                        className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: TEXT CHAT CHANNELS                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
              {/* Channel Header Bar */}
              <div className="px-6 py-4 border-b border-purple-900/20 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedChannel.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-white font-mono">
                        #{selectedChannel.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-900/30 text-[10px] font-mono text-purple-400">
                        {selectedChannel.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {selectedChannel.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      showPinnedOnly
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-black/60 border-purple-900/20 text-gray-400 hover:text-white'
                    }`}
                    title="Toggle Pinned Messages"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pinned</span>
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div 
                ref={chatScrollContainerRef} 
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-purple-900/30"
              >
                {messages
                  .filter(m => !showPinnedOnly || m.isPinned)
                  .map((msg) => {
                    const isAuthor = user && user.uid === msg.userId;
                    return (
                      <div
                        key={msg.id}
                        className="group flex items-start gap-3.5 p-3 rounded-2xl hover:bg-zinc-900/40 transition-colors relative"
                      >
                        {/* User Avatar */}
                        <Link to={`/profile/${msg.userId}`} className="shrink-0">
                          <img
                            src={msg.userAvatar}
                            alt={msg.userName}
                            className="w-10 h-10 rounded-2xl object-cover border border-purple-900/40 group-hover:border-purple-500 transition-colors shadow-md"
                          />
                        </Link>

                        {/* Message Body */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Author Info Bar */}
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${msg.userId}`}
                              className="font-bold text-xs text-white hover:text-purple-300 transition-colors"
                            >
                              {msg.userName}
                            </Link>

                            {/* Badge */}
                            {msg.userRole === 'admin' && (
                              <span className="px-1.5 py-0.2 rounded bg-red-950/60 border border-red-500/30 text-[9px] font-mono text-red-400 font-bold">
                                ADMIN
                              </span>
                            )}
                            {msg.userRole === 'pro' && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/30 text-[9px] font-mono text-purple-300 font-bold">
                                PRO
                              </span>
                            )}

                            <span className="text-[10px] font-mono text-gray-500">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Reply Context if applicable */}
                          {msg.replyTo && (
                            <div className="text-[11px] font-mono text-gray-400 border-l-2 border-purple-500/60 pl-2.5 py-0.5 bg-purple-950/20 rounded-r-lg">
                              Replying to <span className="font-bold text-purple-300">@{msg.replyTo.userName}</span>: "{msg.replyTo.content}"
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed break-words whitespace-pre-wrap">
                            {msg.content}
                          </p>

                          {/* Attached Media Preview */}
                          {msg.mediaUrl && (
                            <div className="mt-2 rounded-2xl overflow-hidden max-w-md border border-purple-900/40 bg-black">
                              <img
                                src={msg.mediaUrl}
                                alt="Message Attachment"
                                className="w-full h-auto object-cover max-h-72"
                              />
                            </div>
                          )}
                        </div>

                        {/* Hover Action Menu */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-950/90 border border-purple-900/40 p-1 rounded-xl shadow-xl absolute right-4 top-2">
                          <button
                            type="button"
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                            title="Reply"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          {(isAuthor || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-purple-900/20 bg-zinc-950/90 shrink-0">
                {/* Replying banner */}
                {replyingTo && (
                  <div className="mb-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-900/40 flex items-center justify-between text-xs font-mono text-gray-300">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-purple-400">Replying to @{replyingTo.userName}</span>
                      <span className="text-gray-500 truncate">"{replyingTo.content}"</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Optional Media Attachment Input */}
                {showAttachmentInput && (
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={(e) => setAttachmentUrl(e.target.value)}
                      placeholder="Paste image or thumbnail URL (e.g. https://...)"
                      className="flex-1 bg-black border border-purple-900/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAttachmentInput(false)}
                      className="p-2 text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                    className="p-2.5 rounded-xl bg-black/60 border border-purple-900/30 text-gray-400 hover:text-purple-400 hover:border-purple-500/40 transition-all cursor-pointer"
                    title="Attach Image"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Message #${selectedChannel.name}...`}
                    className="flex-1 bg-black border border-purple-900/40 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                  />

                  <button
                    type="submit"
                    disabled={(!messageText.trim() && !attachmentUrl.trim()) || sendingMessage}
                    className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CREATOR VAULT (PREMIUM RESOURCES)                                  */}
          {/* ========================================================================= */}
          {activeTab === 'vault' && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
              
              {/* Vault Header Banner */}
              <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/60 via-zinc-950 to-pink-950/50 border border-purple-900/40 shadow-2xl overflow-hidden">
                <div className="absolute -top-16 -right-16 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] font-mono font-black uppercase tracking-wider">
                        Creator Asset Vault
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">Updated Weekly</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Exclusive Production Assets & LUTs
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
                      Download studio-grade sound effects, DaVinci & Premiere LUTs, MOGRT templates, and project stems crafted by Cutscene Academy mentors.
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowAddResourceModal(true)}
                      className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload New Asset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters & Category Navigation */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
                  {([
                    { id: 'all', label: 'All Vault Assets' },
                    { id: 'sfx', label: 'Sound FX' },
                    { id: 'luts', label: 'Cinematic LUTs' },
                    { id: 'templates', label: 'MOGRTs & Titles' },
                    { id: 'overlays', label: '4K Film Grains' },
                    { id: '3d-assets', label: '3D Models' },
                    { id: 'project-files', label: 'Project Stems' }
                  ] as const).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setVaultCategory(cat.id as VaultCategory)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all cursor-pointer ${
                        vaultCategory === cat.id
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-zinc-900/80 hover:bg-zinc-800 text-gray-400 hover:text-white border border-purple-900/20'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    placeholder="Filter assets by tag..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Assets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVaultResources.map((res) => {
                  const isSaved = savedVaultIds.includes(res.id);
                  const isAudioPlaying = activeAudioPlaying === res.id;
                  return (
                    <div
                      key={res.id}
                      className="group rounded-3xl bg-zinc-950 border border-purple-900/30 hover:border-purple-500/60 transition-all duration-300 shadow-xl hover:shadow-purple-600/10 flex flex-col justify-between overflow-hidden"
                    >
                      {/* Top Preview Image / Audio Card */}
                      <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                        <img
                          src={res.previewUrl || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop'}
                          alt={res.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                        {/* Pro Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {res.isPro ? (
                            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white font-mono text-[10px] font-black shadow-lg shadow-pink-600/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> PRO VAULT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 text-white font-mono text-[10px] font-black">
                              FREE
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-gray-300 font-mono text-[10px]">
                            {res.format}
                          </span>
                        </div>

                        {/* Audio Preview Overlay if SFX */}
                        {res.audioUrl && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handlePlayAudioPreview(res.audioUrl, res.id)}
                              className="w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-500 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
                              title={isAudioPlaying ? 'Pause Audio Preview' : 'Play Audio Preview'}
                            >
                              {isAudioPlaying ? (
                                <Pause className="w-5 h-5" />
                              ) : (
                                <Play className="w-5 h-5 ml-0.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content Card Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                            <span>{res.fileSize}</span>
                            <span>{res.downloadsCount || 0} Downloads</span>
                          </div>
                          <h3 className="font-black text-base text-white group-hover:text-purple-300 transition-colors leading-snug">
                            {res.title}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {res.description}
                          </p>
                        </div>

                        {/* Tags */}
                        {res.tags && (
                          <div className="flex flex-wrap gap-1">
                            {res.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded bg-purple-950/40 text-[10px] font-mono text-purple-300 border border-purple-900/30">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-purple-900/20 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {/* Like Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleVaultLike(res)}
                              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-gray-400 hover:text-red-400 border border-purple-900/20 transition-all flex items-center gap-1 cursor-pointer"
                              title="Like"
                            >
                              <Heart className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-mono">{res.likesCount || 0}</span>
                            </button>

                            {/* Bookmark Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSaveVault(res.id)}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                isSaved
                                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                                  : 'bg-zinc-900 text-gray-400 hover:text-white border-purple-900/20'
                              }`}
                              title="Save to My Vault"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadResource(res)}
                            className="flex-1 py-2 px-3.5 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Pack</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: EDIT CHALLENGES & CONTESTS                                         */}
          {/* ========================================================================= */}
          {activeTab === 'challenges' && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto w-full">
              
              {/* Active Challenge Hero Card */}
              <div className="relative rounded-3xl overflow-hidden border border-amber-500/40 bg-zinc-950 shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  
                  {/* Left Side: Challenge Details */}
                  <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-black tracking-wider flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" /> ACTIVE CREATOR BATTLE
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          ⏳ Ends Aug 30, 2026
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {challenge.title}
                      </h1>

                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        {challenge.description}
                      </p>

                      {/* Prize Card */}
                      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40">
                        <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">Prize Pool</span>
                        <p className="text-xs sm:text-sm font-bold text-amber-200 mt-0.5">
                          {challenge.prize}
                        </p>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-purple-900/20">
                      <button
                        type="button"
                        onClick={() => {
                          addToast('Downloading 4K raw anime footage pack (1.8 GB)...', 'success');
                          window.open(challenge.rawFootageUrl, '_blank');
                        }}
                        className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-purple-900/40 text-purple-300 hover:text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Raw Footage</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSubmitChallengeModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-amber-600/30 flex items-center gap-2 cursor-pointer"
                      >
                        <Rocket className="w-4 h-4" />
                        <span>Submit Your Entry</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Side: Cover Art */}
                  <div className="lg:col-span-5 relative min-h-[260px] bg-zinc-900">
                    <img
                      src={challenge.coverImage}
                      alt={challenge.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-zinc-950 via-transparent to-transparent" />
                  </div>
                </div>
              </div>

              {/* Submissions Gallery & Community Voting */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-white">Community Submissions</h2>
                    <p className="text-xs text-gray-400">Vote for the most cinematic, rhythm-synced edit.</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-purple-950/40 border border-purple-900/40 text-xs font-mono font-bold text-purple-300">
                    {challengeSubmissions.length} Submissions
                  </span>
                </div>

                {/* Submissions Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {challengeSubmissions.map((sub) => {
                    const hasVoted = (sub.votes || []).includes(user?.uid || '');
                    return (
                      <div
                        key={sub.id}
                        className="rounded-3xl bg-zinc-950 border border-purple-900/30 hover:border-purple-500/50 transition-all overflow-hidden flex flex-col justify-between shadow-xl"
                      >
                        {/* Thumbnail & Video Link */}
                        <a
                          href={sub.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-video bg-zinc-900 group cursor-pointer block"
                        >
                          <img
                            src={sub.thumbnail}
                            alt={sub.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                            <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xl">
                              <Play className="w-5 h-5 ml-0.5" />
                            </div>
                          </div>
                        </a>

                        {/* Body */}
                        <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <img
                                src={sub.userAvatar}
                                alt={sub.userName}
                                className="w-6 h-6 rounded-full object-cover border border-purple-500/40"
                              />
                              <span className="text-xs font-bold text-gray-300">{sub.userName}</span>
                            </div>
                            <h3 className="font-black text-sm text-white line-clamp-1">{sub.title}</h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sub.description}</p>
                          </div>

                          {/* Voting Footer */}
                          <div className="pt-3 border-t border-purple-900/20 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-gray-500">
                              {new Date(sub.createdAt).toLocaleDateString()}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleVoteSubmission(sub)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                hasVoted
                                  ? 'bg-amber-600 border-amber-400 text-white shadow-md shadow-amber-600/30'
                                  : 'bg-zinc-900 border-purple-900/30 text-gray-400 hover:text-white'
                              }`}
                            >
                              <Heart className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                              <span>{sub.votesCount || 0} Votes</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: WORKSHOP SCHEDULE & MASTERCLASSES                                  */}
          {/* ========================================================================= */}
          {activeTab === 'schedule' && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
              <div>
                <h1 className="text-2xl font-black text-white">Masterclass & Workshop Calendar</h1>
                <p className="text-xs text-gray-400 mt-1">RSVP to interactive editing sessions and guest colorist breakdowns.</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: 'Live DaVinci Resolve 19 Advanced Node Science',
                    instructor: 'Amine Rouabhia',
                    date: 'Today, 18:00 UTC',
                    badge: 'Broadcasting Live',
                    isLive: true,
                    desc: 'Deep dive into color spaces, ACEScc, and skin vector preservation.'
                  },
                  {
                    title: 'Premiere Pro Speed Ramping & Sound Design Masterclass',
                    instructor: 'Karim Motion',
                    date: 'Thursday, Aug 20 • 19:00 UTC',
                    badge: 'Upcoming',
                    isLive: false,
                    desc: 'Techniques for automotive commercials, pacing, and dynamic bass hits.'
                  },
                  {
                    title: 'Blender 3D Cyberpunk Camera Tracking & VFX Integration',
                    instructor: 'Sarah Lens',
                    date: 'Saturday, Aug 22 • 17:00 UTC',
                    badge: 'Upcoming',
                    isLive: false,
                    desc: 'Matchmoving footage, camera distortion grids, and multi-pass compositing.'
                  }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-3xl bg-zinc-950 border border-purple-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          item.isLive ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-purple-950/60 text-purple-300 border border-purple-900/40'
                        }`}>
                          {item.badge}
                        </span>
                        <span className="text-xs font-mono text-gray-400">{item.date}</span>
                      </div>
                      <h3 className="text-base font-black text-white">{item.title}</h3>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                      <span className="text-xs font-mono text-purple-400 block pt-1">Instructor: {item.instructor}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (item.isLive) {
                          setActiveTab('stream');
                        } else {
                          addToast(`RSVP Confirmed for ${item.title}!`, 'success');
                        }
                      }}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/30 cursor-pointer shrink-0"
                    >
                      {item.isLive ? 'Watch Live Stream' : 'RSVP & Add to Calendar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: SILENT CO-WORKING POD                                              */}
          {/* ========================================================================= */}
          {activeTab === 'coworking' && (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
              <div className="p-8 rounded-3xl bg-gradient-to-tr from-cyan-950/40 via-zinc-950 to-purple-950/30 border border-cyan-500/30 text-center space-y-4">
                <Headphones className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
                <h1 className="text-2xl font-black text-white">Silent Co-Working & Focus Lounge</h1>
                <p className="text-xs text-gray-300 max-w-lg mx-auto leading-relaxed">
                  Join fellow editors working on their active timelines. Listen to synced lofi focus beats, see what software others are using, and stay accountable.
                </p>
                <div className="pt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={toggleLofiMusic}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-2xl transition-all shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    {lofiPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{lofiPlaying ? 'Pause Co-Working Audio' : 'Play Synced Lofi Beats'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT CHALLENGE ENTRY                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSubmitChallengeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-purple-900/30 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">Entry Submission</span>
                  <h3 className="text-lg font-black text-white">Submit to Edit Challenge #34</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitChallengeModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitChallenge} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-purple-400 mb-1">
                    Edit Title
                  </label>
                  <input
                    type="text"
                    required
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                    placeholder="e.g. CYBER-PULSE // 30s Cut"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-purple-400 mb-1">
                    Video Stream Link (YouTube / Vimeo / MP4)
                  </label>
                  <input
                    type="url"
                    required
                    value={challengeForm.videoUrl}
                    onChange={(e) => setChallengeForm({ ...challengeForm, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-purple-400 mb-1">
                    Custom Thumbnail Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={challengeForm.thumbnail}
                    onChange={(e) => setChallengeForm({ ...challengeForm, thumbnail: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-purple-400 mb-1">
                    Editor Notes / Techniques Used
                  </label>
                  <textarea
                    rows={3}
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                    placeholder="Describe your sound design, grading nodes, and plugins..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitChallengeModal(false)}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-gray-300 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingChallenge}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-purple-600 hover:from-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-600/30 cursor-pointer flex items-center gap-2"
                  >
                    {submittingChallenge ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Submit Video</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
