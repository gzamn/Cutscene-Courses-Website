import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Radio, Sparkles, Trophy, Trash2, Edit2, Plus, 
  Check, X, Search, Shield, Flame, Video, Volume2, FolderDown, 
  HelpCircle, ThumbsUp, Heart, CheckCircle2, Lock, Eye, Clock,
  Tag, Download, Upload, AlertCircle, RefreshCw, Hash, Play, Disc, ArrowUpRight,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  onSnapshot 
} from '../firebase';
import { 
  CommunityChannel, 
  CommunityLivestream, 
  CommunityVaultResource, 
  VaultCategory, 
  CommunityChallenge, 
  CommunityChallengeSubmission, 
  CommunityQuestion, 
  CommunityMessage 
} from '../types';

// ==========================================
// DEFAULT DATA CONSTANTS
// ==========================================
const DEFAULT_CHANNELS: CommunityChannel[] = [
  {
    id: 'general-lounge',
    name: 'general-lounge',
    category: 'General',
    description: 'The main gathering space for video editors, motion artists, and students.',
    icon: '#',
    isPrivate: false
  },
  {
    id: 'edit-feedback-roast',
    name: 'edit-feedback-roast',
    category: 'Feedback & Critique',
    description: 'Post your latest rough cut or reel for constructive timeline feedback and critique.',
    icon: '#',
    isPrivate: false
  },
  {
    id: 'motion-vfx-lounge',
    name: 'motion-vfx-lounge',
    category: 'Specialized',
    description: 'After Effects, Blender 3D, Premiere Pro, and DaVinci Resolve workflows & troubleshooting.',
    icon: '#',
    isPrivate: false
  },
  {
    id: 'freelance-and-gigs',
    name: 'freelance-and-gigs',
    category: 'Career & Collabs',
    description: 'Paid editing opportunities, freelance client leads, and creator collaborations.',
    icon: '#',
    isPrivate: false
  },
  {
    id: 'wins-and-showcase',
    name: 'wins-and-showcase',
    category: 'General',
    description: 'Share your latest published client work, viral reels, and production milestones.',
    icon: '#',
    isPrivate: false
  },
  {
    id: 'plugin-and-tech-help',
    name: 'plugin-and-tech-help',
    category: 'Specialized',
    description: 'Stuck on a render error, expression bug, or color management issue? Ask here.',
    icon: '#',
    isPrivate: false
  }
];

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

const DEFAULT_LIVESTREAM: CommunityLivestream = {
  id: 'live-masterclass-davinci-19',
  title: 'Live Workshop: Advanced Color Science & Cinematic Grading in DaVinci Resolve 19',
  description: 'Join Academy Instructor Amine Rouabhia for an interactive live session breaking down commercial color management, ACES pipelines, film print emulation (FPE), and skin-tone vector curves.',
  hostName: 'Amine Rouabhia',
  hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  hostRole: 'Lead Colorist & Instructor',
  streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
  status: 'live',
  scheduledAt: new Date().toISOString(),
  viewersCount: 238,
  tags: ['DaVinci Resolve', 'Color Grading', 'Live Q&A', 'Masterclass'],
  createdAt: new Date().toISOString()
};

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

interface AdminCommunityManagerProps {
  showToast: (type: 'success' | 'error', message: string) => void;
  askConfirmation: (title: string, message: string, onConfirm: () => void, confirmText?: string, isDanger?: boolean) => void;
}

type SubTab = 'channels' | 'livestreams' | 'vault' | 'challenges' | 'moderation' | 'qna';

export const AdminCommunityManager: React.FC<AdminCommunityManagerProps> = ({
  showToast,
  askConfirmation
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('channels');

  // ==========================================
  // STATE: CHANNELS
  // ==========================================
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState({
    id: '',
    name: '',
    category: 'General' as CommunityChannel['category'],
    description: '',
    icon: '#',
    isPrivate: false,
    order: 0
  });

  // ==========================================
  // STATE: LIVESTREAMS
  // ==========================================
  const [livestreams, setLivestreams] = useState<CommunityLivestream[]>([]);
  const [loadingLivestreams, setLoadingLivestreams] = useState(false);
  const [showLivestreamModal, setShowLivestreamModal] = useState(false);
  const [editingLivestreamId, setEditingLivestreamId] = useState<string | null>(null);
  const [livestreamForm, setLivestreamForm] = useState({
    title: '',
    description: '',
    hostName: 'Amine Rouabhia',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    hostRole: 'Lead Colorist & Instructor',
    streamUrl: '',
    status: 'live' as 'live' | 'upcoming' | 'ended',
    scheduledAt: '',
    viewersCount: 240,
    tagsRaw: 'DaVinci Resolve, Color Grading, Masterclass',
    recordingUrl: ''
  });

  // ==========================================
  // STATE: CREATOR VAULT
  // ==========================================
  const [vaultResources, setVaultResources] = useState<CommunityVaultResource[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState<string>('all');
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null);
  const [vaultForm, setVaultForm] = useState({
    title: '',
    description: '',
    category: 'sfx' as VaultCategory,
    format: '.WAV (48kHz)',
    fileSize: '150 MB',
    downloadUrl: '',
    previewUrl: '',
    audioUrl: '',
    isPro: true,
    downloadsCount: 0,
    likesCount: 0,
    tagsRaw: 'Cinematic, Sound FX, Transitions'
  });

  // ==========================================
  // STATE: CHALLENGES & SUBMISSIONS
  // ==========================================
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [challengeSubmissions, setChallengeSubmissions] = useState<CommunityChallengeSubmission[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    prompt: '',
    rawFootageUrl: '',
    prize: '',
    deadline: '',
    status: 'active' as 'active' | 'voting' | 'completed',
    coverImage: '',
    rulesRaw: 'Length must be exactly 25 to 35 seconds.\nMust include at least 3 custom sound design elements.\nMust submit high-res link.'
  });

  // ==========================================
  // STATE: LIVE Q&A QUESTIONS MODERATION
  // ==========================================
  const [qnaQuestions, setQnaQuestions] = useState<CommunityQuestion[]>([]);
  const [loadingQna, setLoadingQna] = useState(false);

  // ==========================================
  // STATE: CHAT MESSAGES MODERATION
  // ==========================================
  const [recentMessages, setRecentMessages] = useState<CommunityMessage[]>([]);
  const [messageSearch, setMessageSearch] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ==========================================
  // FETCHERS / LISTENERS
  // ==========================================

  // Fetch Channels
  const fetchChannels = async () => {
    setLoadingChannels(true);
    try {
      const snap = await getDocs(collection(db, 'community_channels'));
      const list: CommunityChannel[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0));
      
      if (list.length === 0) {
        setChannels(DEFAULT_CHANNELS);
        // Persist default channels so admin can edit or delete them right away
        DEFAULT_CHANNELS.forEach(async (ch, idx) => {
          try {
            await setDoc(doc(db, 'community_channels', ch.id), { ...ch, order: idx, createdAt: new Date().toISOString() });
          } catch (err) {
            console.warn('Auto-seed channel error:', err);
          }
        });
      } else {
        setChannels(list);
      }
    } catch (e: any) {
      console.error('Fetch channels error:', e);
      setChannels(DEFAULT_CHANNELS);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Fetch Livestreams
  const fetchLivestreams = async () => {
    setLoadingLivestreams(true);
    try {
      const snap = await getDocs(collection(db, 'community_livestreams'));
      const list: CommunityLivestream[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      if (list.length === 0) {
        setLivestreams([DEFAULT_LIVESTREAM]);
        try {
          await setDoc(doc(db, 'community_livestreams', DEFAULT_LIVESTREAM.id), DEFAULT_LIVESTREAM);
        } catch (err) {
          console.warn('Auto-seed livestream error:', err);
        }
      } else {
        setLivestreams(list);
      }
    } catch (e: any) {
      console.error('Fetch livestreams error:', e);
      setLivestreams([DEFAULT_LIVESTREAM]);
    } finally {
      setLoadingLivestreams(false);
    }
  };

  // Fetch Vault Resources
  const fetchVault = async () => {
    setLoadingVault(true);
    try {
      const snap = await getDocs(collection(db, 'community_vault_resources'));
      const list: CommunityVaultResource[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      if (list.length === 0) {
        setVaultResources(DEFAULT_VAULT_RESOURCES);
        DEFAULT_VAULT_RESOURCES.forEach(async (item) => {
          try {
            await setDoc(doc(db, 'community_vault_resources', item.id), item);
          } catch (err) {
            console.warn('Auto-seed vault error:', err);
          }
        });
      } else {
        setVaultResources(list);
      }
    } catch (e: any) {
      console.error('Fetch vault error:', e);
      setVaultResources(DEFAULT_VAULT_RESOURCES);
    } finally {
      setLoadingVault(false);
    }
  };

  // Fetch Challenges & Submissions
  const fetchChallenges = async () => {
    setLoadingChallenges(true);
    try {
      const snap = await getDocs(collection(db, 'community_challenges'));
      const list: CommunityChallenge[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      if (list.length === 0) {
        setChallenges([DEFAULT_CHALLENGE]);
        try {
          await setDoc(doc(db, 'community_challenges', DEFAULT_CHALLENGE.id), DEFAULT_CHALLENGE);
        } catch (err) {
          console.warn('Auto-seed challenge error:', err);
        }
      } else {
        setChallenges(list);
      }

      const subSnap = await getDocs(collection(db, 'community_challenge_submissions'));
      const subs: CommunityChallengeSubmission[] = [];
      subSnap.forEach(d => subs.push({ id: d.id, ...(d.data() as any) }));
      subs.sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
      setChallengeSubmissions(subs);
    } catch (e: any) {
      console.error('Fetch challenges error:', e);
      setChallenges([DEFAULT_CHALLENGE]);
    } finally {
      setLoadingChallenges(false);
    }
  };

  // Fetch Q&A Questions
  const fetchQna = async () => {
    setLoadingQna(true);
    try {
      const snap = await getDocs(collection(db, 'community_stream_questions'));
      const list: CommunityQuestion[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setQnaQuestions(list);
    } catch (e: any) {
      console.error('Fetch QnA error:', e);
    } finally {
      setLoadingQna(false);
    }
  };

  // Fetch Recent Messages
  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const snap = await getDocs(collection(db, 'community_messages'));
      const list: CommunityMessage[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRecentMessages(list);
    } catch (e: any) {
      console.error('Fetch messages error:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Initial tab loading
  useEffect(() => {
    if (activeSubTab === 'channels') fetchChannels();
    if (activeSubTab === 'livestreams') fetchLivestreams();
    if (activeSubTab === 'vault') fetchVault();
    if (activeSubTab === 'challenges') fetchChallenges();
    if (activeSubTab === 'qna') fetchQna();
    if (activeSubTab === 'moderation') fetchMessages();
  }, [activeSubTab]);

  // ==========================================
  // SEED DEFAULTS IF EMPTY
  // ==========================================
  const handleSeedDefaults = async () => {
    askConfirmation(
      'Seed Default Community Content',
      'This will populate default channels, starter vault resource packs, and initial livestream settings into Firestore. Proceed?',
      async () => {
        try {
          // Channels
          const defaultChs: CommunityChannel[] = [
            { id: 'general-lounge', name: 'general-lounge', category: 'General', description: 'The main gathering space for video editors and students.', icon: '#' },
            { id: 'edit-feedback-roast', name: 'edit-feedback-roast', category: 'Feedback & Critique', description: 'Post your latest rough cut or reel for constructive feedback.', icon: '#' },
            { id: 'motion-vfx-lounge', name: 'motion-vfx-lounge', category: 'Specialized', description: 'After Effects, Blender 3D, Premiere Pro, and DaVinci Resolve workflows.', icon: '#' },
            { id: 'freelance-and-gigs', name: 'freelance-and-gigs', category: 'Career & Collabs', description: 'Paid editing opportunities and client leads.', icon: '#' },
            { id: 'wins-and-showcase', name: 'wins-and-showcase', category: 'General', description: 'Share published client work, viral reels, and milestones.', icon: '#' },
            { id: 'plugin-and-tech-help', name: 'plugin-and-tech-help', category: 'Specialized', description: 'Resolve render errors, expression bugs, and hardware questions.', icon: '#' }
          ];
          for (let i = 0; i < defaultChs.length; i++) {
            const ch = defaultChs[i];
            await setDoc(doc(db, 'community_channels', ch.id), { ...ch, order: i, createdAt: new Date().toISOString() });
          }

          // Livestream
          await setDoc(doc(db, 'community_livestreams', 'live-masterclass-davinci-19'), {
            id: 'live-masterclass-davinci-19',
            title: 'Live Workshop: Advanced Color Science & Cinematic Grading in DaVinci Resolve 19',
            description: 'Interactive masterclass breaking down commercial color management, ACES pipelines, film print emulation (FPE), and skin-tone curves.',
            hostName: 'Amine Rouabhia',
            hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
            hostRole: 'Lead Colorist & Instructor',
            streamUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
            status: 'live',
            scheduledAt: new Date().toISOString(),
            viewersCount: 248,
            tags: ['DaVinci Resolve', 'Color Grading', 'Live Q&A', 'Masterclass'],
            createdAt: new Date().toISOString()
          });

          // Challenge
          await setDoc(doc(db, 'community_challenges', 'challenge-cyber-amv-2026'), {
            id: 'challenge-cyber-amv-2026',
            title: 'Edit Challenge #34: 30-Second Cyberpunk Anime AMV',
            description: 'Download the provided 4K raw anime footage and craft a high-impact, rhythm-synced 30-second sequence. Focus on sound design and speed ramps.',
            prompt: 'Sync heavy bass hits with impact frames, add custom text motion, and grade in a moody neo-noir palette.',
            rawFootageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
            prize: '1 Year Adobe Creative Cloud Pro + 15,000 DA Store Credit + Cutscene Verified Editor Badge',
            deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
            status: 'active',
            coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
            rules: [
              'Length must be exactly 25 to 35 seconds.',
              'Must include at least 3 custom sound design elements from the Vault.',
              'Must submit high-res YouTube, Vimeo, or MP4 link with preview thumbnail.'
            ],
            submissionsCount: 2,
            createdAt: new Date().toISOString()
          });

          // Vault Packs
          const vaultPacks: CommunityVaultResource[] = [
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
            }
          ];

          for (const pack of vaultPacks) {
            await setDoc(doc(db, 'community_vault_resources', pack.id), pack);
          }

          showToast('success', 'Community Firestore collections seeded successfully!');
          fetchChannels();
          fetchLivestreams();
          fetchVault();
          fetchChallenges();
        } catch (e: any) {
          console.error('Seed error:', e);
          showToast('error', 'Failed seeding community collections: ' + e.message);
        }
      }
    );
  };

  // ==========================================
  // HANDLERS: CHANNELS
  // ==========================================
  const handleOpenNewChannel = () => {
    setEditingChannelId(null);
    setChannelForm({
      id: '',
      name: '',
      category: 'General',
      description: '',
      icon: '#',
      isPrivate: false,
      order: channels.length
    });
    setShowChannelModal(true);
  };

  const handleEditChannel = (ch: CommunityChannel) => {
    setEditingChannelId(ch.id);
    setChannelForm({
      id: ch.id,
      name: ch.name,
      category: ch.category || 'General',
      description: ch.description || '',
      icon: ch.icon || '#',
      isPrivate: !!ch.isPrivate,
      order: (ch as any).order ?? 0
    });
    setShowChannelModal(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelForm.name.trim()) return;

    try {
      const rawId = editingChannelId || channelForm.id.trim() || channelForm.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const cleanId = rawId.replace(/^-+|-+$/g, '') || `channel-${Date.now()}`;

      const payload = {
        id: cleanId,
        name: channelForm.name.trim().toLowerCase().replace(/\s+/g, '-'),
        category: channelForm.category,
        description: channelForm.description.trim(),
        icon: channelForm.icon || '#',
        isPrivate: channelForm.isPrivate,
        order: Number(channelForm.order) || 0,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'community_channels', cleanId), payload, { merge: true });
      showToast('success', `Channel #${payload.name} saved successfully.`);
      setShowChannelModal(false);
      fetchChannels();
    } catch (err: any) {
      console.error('Save channel failed:', err);
      showToast('error', 'Failed to save channel.');
    }
  };

  const handleDeleteChannel = async (ch: CommunityChannel) => {
    askConfirmation(
      'Delete Community Channel',
      `Are you sure you want to delete #${ch.name}? Existing messages under this channel won't be deleted automatically, but users will no longer see this channel in navigation.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_channels', ch.id));
          showToast('success', `Channel #${ch.name} deleted.`);
          fetchChannels();
        } catch (e: any) {
          console.error('Delete channel error:', e);
          showToast('error', 'Failed deleting channel.');
        }
      },
      'Delete Channel',
      true
    );
  };

  // ==========================================
  // HANDLERS: LIVESTREAMS
  // ==========================================
  const handleOpenNewLivestream = () => {
    setEditingLivestreamId(null);
    setLivestreamForm({
      title: '',
      description: '',
      hostName: 'Amine Rouabhia',
      hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      hostRole: 'Lead Colorist & Instructor',
      streamUrl: '',
      status: 'live',
      scheduledAt: new Date().toISOString().slice(0, 16),
      viewersCount: 240,
      tagsRaw: 'DaVinci Resolve, Color Grading, Masterclass',
      recordingUrl: ''
    });
    setShowLivestreamModal(true);
  };

  const handleEditLivestream = (ls: CommunityLivestream) => {
    setEditingLivestreamId(ls.id);
    setLivestreamForm({
      title: ls.title || '',
      description: ls.description || '',
      hostName: ls.hostName || 'Amine Rouabhia',
      hostAvatar: ls.hostAvatar || '',
      hostRole: ls.hostRole || 'Instructor',
      streamUrl: ls.streamUrl || '',
      status: ls.status || 'live',
      scheduledAt: ls.scheduledAt ? ls.scheduledAt.slice(0, 16) : '',
      viewersCount: ls.viewersCount || 100,
      tagsRaw: (ls.tags || []).join(', '),
      recordingUrl: ls.recordingUrl || ''
    });
    setShowLivestreamModal(true);
  };

  const handleSaveLivestream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!livestreamForm.title.trim()) return;

    try {
      const id = editingLivestreamId || `stream-${Date.now()}`;
      const tags = livestreamForm.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

      // If set to live, end other live streams
      if (livestreamForm.status === 'live') {
        for (const other of livestreams) {
          if (other.id !== id && other.status === 'live') {
            await updateDoc(doc(db, 'community_livestreams', other.id), { status: 'ended' });
          }
        }
      }

      const payload: Partial<CommunityLivestream> = {
        id,
        title: livestreamForm.title.trim(),
        description: livestreamForm.description.trim(),
        hostName: livestreamForm.hostName.trim(),
        hostAvatar: livestreamForm.hostAvatar.trim(),
        hostRole: livestreamForm.hostRole.trim(),
        streamUrl: livestreamForm.streamUrl.trim(),
        status: livestreamForm.status,
        scheduledAt: livestreamForm.scheduledAt ? new Date(livestreamForm.scheduledAt).toISOString() : new Date().toISOString(),
        viewersCount: Number(livestreamForm.viewersCount) || 150,
        tags,
        recordingUrl: livestreamForm.recordingUrl.trim(),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'community_livestreams', id), payload, { merge: true });
      showToast('success', `Livestream "${payload.title}" updated.`);
      setShowLivestreamModal(false);
      fetchLivestreams();
    } catch (e: any) {
      console.error('Save livestream error:', e);
      showToast('error', 'Failed saving livestream: ' + e.message);
    }
  };

  const handleDeleteLivestream = async (ls: CommunityLivestream) => {
    askConfirmation(
      'Delete Livestream Session',
      `Are you sure you want to delete "${ls.title}"?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_livestreams', ls.id));
          showToast('success', 'Livestream deleted.');
          fetchLivestreams();
        } catch (e: any) {
          console.error('Delete livestream error:', e);
          showToast('error', 'Failed deleting livestream.');
        }
      },
      'Delete Livestream',
      true
    );
  };

  // ==========================================
  // HANDLERS: VAULT
  // ==========================================
  const handleOpenNewVaultResource = () => {
    setEditingVaultId(null);
    setVaultForm({
      title: '',
      description: '',
      category: 'sfx',
      format: '.WAV (48kHz)',
      fileSize: '150 MB',
      downloadUrl: '',
      previewUrl: '',
      audioUrl: '',
      isPro: true,
      downloadsCount: 0,
      likesCount: 0,
      tagsRaw: 'Cinematic, Sound FX, Transitions'
    });
    setShowVaultModal(true);
  };

  const handleEditVaultResource = (res: CommunityVaultResource) => {
    setEditingVaultId(res.id);
    setVaultForm({
      title: res.title || '',
      description: res.description || '',
      category: res.category || 'sfx',
      format: res.format || '.WAV',
      fileSize: res.fileSize || '100 MB',
      downloadUrl: res.downloadUrl || '',
      previewUrl: res.previewUrl || '',
      audioUrl: res.audioUrl || '',
      isPro: res.isPro !== false,
      downloadsCount: res.downloadsCount || 0,
      likesCount: res.likesCount || 0,
      tagsRaw: (res.tags || []).join(', ')
    });
    setShowVaultModal(true);
  };

  const handleSaveVaultResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultForm.title.trim() || !vaultForm.downloadUrl.trim()) return;

    try {
      const id = editingVaultId || `vault-${vaultForm.category}-${Date.now()}`;
      const tags = vaultForm.tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

      const payload: Partial<CommunityVaultResource> = {
        id,
        title: vaultForm.title.trim(),
        description: vaultForm.description.trim(),
        category: vaultForm.category,
        format: vaultForm.format.trim(),
        fileSize: vaultForm.fileSize.trim(),
        downloadUrl: vaultForm.downloadUrl.trim(),
        previewUrl: vaultForm.previewUrl.trim(),
        audioUrl: vaultForm.audioUrl.trim(),
        isPro: !!vaultForm.isPro,
        downloadsCount: Number(vaultForm.downloadsCount) || 0,
        likesCount: Number(vaultForm.likesCount) || 0,
        tags,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'community_vault_resources', id), payload, { merge: true });
      showToast('success', `Vault pack "${payload.title}" saved successfully.`);
      setShowVaultModal(false);
      fetchVault();
    } catch (e: any) {
      console.error('Save vault resource error:', e);
      showToast('error', 'Failed saving vault resource.');
    }
  };

  const handleDeleteVaultResource = async (res: CommunityVaultResource) => {
    askConfirmation(
      'Delete Vault Pack',
      `Are you sure you want to permanently delete "${res.title}" from the Creator Vault?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_vault_resources', res.id));
          showToast('success', 'Vault resource pack deleted.');
          fetchVault();
        } catch (e: any) {
          console.error('Delete vault resource error:', e);
          showToast('error', 'Failed deleting vault resource.');
        }
      },
      'Delete Resource',
      true
    );
  };

  // ==========================================
  // HANDLERS: CHALLENGES
  // ==========================================
  const handleOpenNewChallenge = () => {
    setEditingChallengeId(null);
    setChallengeForm({
      title: '',
      description: '',
      prompt: '',
      rawFootageUrl: '',
      prize: '1 Year Adobe Creative Cloud Pro + 15,000 DA Store Credit',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
      status: 'active',
      coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop',
      rulesRaw: 'Length must be exactly 25 to 35 seconds.\nMust include at least 3 custom sound design elements.\nMust submit high-res link.'
    });
    setShowChallengeModal(true);
  };

  const handleEditChallenge = (ch: CommunityChallenge) => {
    setEditingChallengeId(ch.id);
    setChallengeForm({
      title: ch.title || '',
      description: ch.description || '',
      prompt: ch.prompt || '',
      rawFootageUrl: ch.rawFootageUrl || '',
      prize: ch.prize || '',
      deadline: ch.deadline ? ch.deadline.slice(0, 16) : '',
      status: ch.status || 'active',
      coverImage: ch.coverImage || '',
      rulesRaw: (ch.rules || []).join('\n')
    });
    setShowChallengeModal(true);
  };

  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeForm.title.trim()) return;

    try {
      const id = editingChallengeId || `challenge-${Date.now()}`;
      const rules = challengeForm.rulesRaw.split('\n').map(r => r.trim()).filter(Boolean);

      const payload: Partial<CommunityChallenge> = {
        id,
        title: challengeForm.title.trim(),
        description: challengeForm.description.trim(),
        prompt: challengeForm.prompt.trim(),
        rawFootageUrl: challengeForm.rawFootageUrl.trim(),
        prize: challengeForm.prize.trim(),
        deadline: challengeForm.deadline ? new Date(challengeForm.deadline).toISOString() : new Date().toISOString(),
        status: challengeForm.status,
        coverImage: challengeForm.coverImage.trim(),
        rules,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'community_challenges', id), payload, { merge: true });
      showToast('success', `Challenge "${payload.title}" saved.`);
      setShowChallengeModal(false);
      fetchChallenges();
    } catch (e: any) {
      console.error('Save challenge error:', e);
      showToast('error', 'Failed saving challenge.');
    }
  };

  const handleDeleteChallenge = async (ch: CommunityChallenge) => {
    askConfirmation(
      'Delete Community Challenge',
      `Are you sure you want to delete challenge "${ch.title}"?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_challenges', ch.id));
          showToast('success', 'Challenge deleted.');
          fetchChallenges();
        } catch (e: any) {
          console.error('Delete challenge error:', e);
          showToast('error', 'Failed deleting challenge.');
        }
      },
      'Delete Challenge',
      true
    );
  };

  const handleDeleteSubmission = async (sub: CommunityChallengeSubmission) => {
    askConfirmation(
      'Delete Challenge Submission',
      `Delete entry "${sub.title}" by ${sub.userName}?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_challenge_submissions', sub.id));
          showToast('success', 'Submission deleted.');
          fetchChallenges();
        } catch (e: any) {
          console.error('Delete submission error:', e);
          showToast('error', 'Failed deleting submission.');
        }
      },
      'Delete Entry',
      true
    );
  };

  // ==========================================
  // HANDLERS: MODERATION & QNA
  // ==========================================
  const handleToggleAnsweredQuestion = async (q: CommunityQuestion) => {
    try {
      const newStatus = !q.isAnswered;
      await updateDoc(doc(db, 'community_stream_questions', q.id), { isAnswered: newStatus });
      setQnaQuestions(prev => prev.map(item => item.id === q.id ? { ...item, isAnswered: newStatus } : item));
      showToast('success', newStatus ? 'Marked question as answered live on stream.' : 'Question marked as pending.');
    } catch (e: any) {
      console.error('Update question error:', e);
      showToast('error', 'Failed updating question.');
    }
  };

  const handleDeleteQuestion = async (q: CommunityQuestion) => {
    askConfirmation(
      'Delete Q&A Question',
      `Remove question "${q.question.slice(0, 60)}..." from live stream queue?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_stream_questions', q.id));
          setQnaQuestions(prev => prev.filter(item => item.id !== q.id));
          showToast('success', 'Question deleted.');
        } catch (e: any) {
          console.error('Delete question error:', e);
          showToast('error', 'Failed deleting question.');
        }
      },
      'Delete Question',
      true
    );
  };

  const handleDeleteChatMessage = async (msg: CommunityMessage) => {
    askConfirmation(
      'Delete Chat Message',
      `Are you sure you want to delete message from ${msg.userName} in #${msg.channelId}?`,
      async () => {
        try {
          await deleteDoc(doc(db, 'community_messages', msg.id));
          setRecentMessages(prev => prev.filter(m => m.id !== msg.id));
          showToast('success', 'Message removed from community chat.');
        } catch (e: any) {
          console.error('Delete message error:', e);
          showToast('error', 'Failed deleting message.');
        }
      },
      'Delete Message',
      true
    );
  };

  const handleTogglePinMessage = async (msg: CommunityMessage) => {
    try {
      const newPinned = !msg.isPinned;
      await updateDoc(doc(db, 'community_messages', msg.id), { isPinned: newPinned });
      setRecentMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: newPinned } : m));
      showToast('success', newPinned ? 'Message pinned to channel!' : 'Message unpinned.');
    } catch (e: any) {
      console.error('Pin message error:', e);
      showToast('error', 'Failed updating pinned status.');
    }
  };

  // Filtered lists
  const filteredVault = vaultResources.filter(r => {
    const matchCat = vaultCategoryFilter === 'all' || r.category === vaultCategoryFilter;
    const matchQ = !vaultSearchQuery.trim() || 
      r.title.toLowerCase().includes(vaultSearchQuery.toLowerCase()) || 
      r.description.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(vaultSearchQuery.toLowerCase())));
    return matchCat && matchQ;
  });

  const filteredMessages = recentMessages.filter(m => 
    !messageSearch.trim() || 
    m.userName.toLowerCase().includes(messageSearch.toLowerCase()) ||
    m.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
    m.channelId.toLowerCase().includes(messageSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-900/20 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Community Command Center</h1>
              <p className="text-gray-400 text-xs mt-0.5">Control live masterclasses, chat channels, creator vault assets, challenges, and user moderation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 text-xs font-bold transition-all shadow-md cursor-pointer"
            title="Seed missing default channels, packs and events"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Seed Defaults</span>
          </button>
          
          <a
            href="/community"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-gray-200 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <span>Preview Community</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION WITH NAVIGATION ARROWS */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const tabs: SubTab[] = ['channels', 'livestreams', 'vault', 'challenges', 'qna', 'moderation'];
            const idx = tabs.indexOf(activeSubTab);
            const prev = (idx - 1 + tabs.length) % tabs.length;
            setActiveSubTab(tabs[prev]);
          }}
          className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-purple-900/40 border border-purple-900/30 text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          title="Previous Section"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2 p-1.5 bg-black/60 border border-purple-900/20 rounded-2xl overflow-x-auto scrollbar-none scroll-smooth">
          {[
            { id: 'channels', label: 'Chat Channels', icon: MessageSquare, count: channels.length },
            { id: 'livestreams', label: 'Live Masterclasses', icon: Radio, count: livestreams.length },
            { id: 'vault', label: 'Creator Vault (Packs/LUTs/SFX)', icon: FolderDown, count: vaultResources.length },
            { id: 'challenges', label: 'Edit Contests & Submissions', icon: Trophy, count: challenges.length },
            { id: 'qna', label: 'Live Q&A Queue', icon: HelpCircle, count: qnaQuestions.length },
            { id: 'moderation', label: 'Messages Moderation', icon: Shield, count: recentMessages.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as SubTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-black/30 text-white' : 'bg-purple-950/60 text-purple-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            const tabs: SubTab[] = ['channels', 'livestreams', 'vault', 'challenges', 'qna', 'moderation'];
            const idx = tabs.indexOf(activeSubTab);
            const next = (idx + 1) % tabs.length;
            setActiveSubTab(tabs[next]);
          }}
          className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-purple-900/40 border border-purple-900/30 text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          title="Next Section"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CHANNELS MANAGEMENT                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'channels' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Chat Channels & Lounges</h2>
              <p className="text-gray-400 text-xs">Create, categorize, reorder and control community discussion rooms</p>
            </div>
            <button
              onClick={handleOpenNewChannel}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Channel
            </button>
          </div>

          <div className="bg-black/40 border border-purple-900/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-950/30 text-gray-400 uppercase font-mono tracking-wider border-b border-purple-900/20">
                  <tr>
                    <th className="py-3 px-4">Channel Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Access Type</th>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/10 text-gray-300">
                  {channels.map((ch, idx) => (
                    <tr key={ch.id || idx} className="hover:bg-purple-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <span className="text-purple-400 font-black text-sm">#</span>
                        <span>{ch.name}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-800/30 text-purple-300 text-[11px] font-semibold">
                          {ch.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-gray-400">
                        {ch.description || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {ch.isPrivate ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                            <Lock className="w-3 h-3" /> Pro Only
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <Eye className="w-3 h-3" /> Public
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-400">
                        {(ch as any).order ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleEditChannel(ch)}
                          className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 hover:bg-purple-950/30 text-purple-400 rounded-lg transition-all cursor-pointer"
                          title="Edit channel details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteChannel(ch)}
                          className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 hover:bg-red-950/30 text-red-400 rounded-lg transition-all cursor-pointer"
                          title="Delete channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {channels.length === 0 && !loadingChannels && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                        No custom channels configured yet. Click "Seed Defaults" or "Add New Channel".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: LIVESTREAMS MANAGEMENT                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'livestreams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Live Masterclasses & Workshops</h2>
              <p className="text-gray-400 text-xs">Configure YouTube / Vimeo / RTMP stream broadcasts, instructor profile, schedule, and replay recordings</p>
            </div>
            <button
              onClick={handleOpenNewLivestream}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Schedule Masterclass
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {livestreams.map(ls => (
              <div key={ls.id} className="bg-zinc-950/80 border border-purple-900/30 rounded-2xl p-5 space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider ${
                        ls.status === 'live'
                          ? 'bg-red-500 text-white animate-pulse'
                          : ls.status === 'upcoming'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-zinc-800 text-gray-400'
                      }`}>
                        {ls.status === 'live' ? '● LIVE STREAMING' : ls.status.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-purple-300 font-mono">
                        {ls.viewersCount || 100} Viewers
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base leading-snug">{ls.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditLivestream(ls)}
                      className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 text-purple-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLivestream(ls)}
                      className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 text-red-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{ls.description}</p>

                <div className="bg-black/60 rounded-xl p-3 border border-purple-900/20 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Host / Instructor:</span>
                    <span className="text-white font-semibold">{ls.hostName} ({ls.hostRole})</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Stream Embed URL:</span>
                    <span className="text-purple-300 font-mono truncate max-w-[200px]">{ls.streamUrl || '—'}</span>
                  </div>
                  {ls.recordingUrl && (
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Recording Replay:</span>
                      <span className="text-emerald-400 font-mono truncate max-w-[200px]">{ls.recordingUrl}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(ls.tags || []).map((t, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-900/30 text-purple-300 text-[10px] font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {livestreams.length === 0 && !loadingLivestreams && (
              <div className="col-span-2 py-12 text-center text-gray-500 font-mono bg-black/40 border border-purple-900/20 rounded-2xl">
                No livestreams scheduled. Click "Schedule Masterclass" or "Seed Defaults".
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: CREATOR VAULT MANAGEMENT                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'vault' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Creator Vault Asset Library</h2>
              <p className="text-gray-400 text-xs">Manage downloadable sound effects, LUT packs, Premiere/AE MOGRTs, 3D assets, and project files</p>
            </div>
            <button
              onClick={handleOpenNewVaultResource}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload Vault Asset
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/40 border border-purple-900/20 p-3 rounded-2xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vault packs by title or tag..."
                value={vaultSearchQuery}
                onChange={e => setVaultSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-purple-900/30 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {['all', 'sfx', 'luts', 'templates', 'overlays', '3d-assets', 'project-files'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setVaultCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase font-mono tracking-wider transition-all cursor-pointer ${
                    vaultCategoryFilter === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-900 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Vault Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVault.map(res => (
              <div key={res.id} className="bg-zinc-950/80 border border-purple-900/30 rounded-2xl p-4 flex flex-col justify-between space-y-4 group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-950 border border-purple-800/40 text-purple-300 text-[10px] font-mono uppercase font-bold">
                      {res.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                      res.isPro ? 'bg-amber-500 text-black' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {res.isPro ? 'PRO ONLY' : 'FREE'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm line-clamp-2">{res.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{res.description}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 bg-black/50 p-2.5 rounded-xl border border-purple-900/20">
                    <span>{res.format || '.WAV'}</span>
                    <span>{res.fileSize || '100 MB'}</span>
                    <span>{res.downloadsCount || 0} downloads</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-900/20 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-gray-500">
                    ❤️ {res.likesCount || 0} likes
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditVaultResource(res)}
                      className="p-1.5 bg-zinc-900 border border-white/5 hover:border-purple-500 text-purple-400 rounded-lg transition-all cursor-pointer"
                      title="Edit pack"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteVaultResource(res)}
                      className="p-1.5 bg-zinc-900 border border-white/5 hover:border-red-500 text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Delete pack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredVault.length === 0 && !loadingVault && (
              <div className="col-span-3 py-12 text-center text-gray-500 font-mono bg-black/40 border border-purple-900/20 rounded-2xl">
                No vault resources found matching filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: CHALLENGES & CONTESTS                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'challenges' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Community Edit Contests & Submissions</h2>
              <p className="text-gray-400 text-xs">Create themed video editing competitions, set prompts, upload raw footage links, and review submissions</p>
            </div>
            <button
              onClick={handleOpenNewChallenge}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Edit Challenge
            </button>
          </div>

          {/* Active Challenges List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map(ch => (
              <div key={ch.id} className="bg-zinc-950/80 border border-purple-900/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                        ch.status === 'active'
                          ? 'bg-emerald-500 text-black'
                          : ch.status === 'voting'
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-800 text-gray-400'
                      }`}>
                        {ch.status}
                      </span>
                      <span className="text-[11px] font-mono text-purple-300">
                        Deadline: {new Date(ch.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base">{ch.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditChallenge(ch)}
                      className="p-2 bg-zinc-900 border border-white/5 hover:border-purple-500 text-purple-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteChallenge(ch)}
                      className="p-2 bg-zinc-900 border border-white/5 hover:border-red-500 text-red-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-300">{ch.description}</p>

                <div className="bg-black/60 p-3 rounded-xl border border-purple-900/20 space-y-1 text-xs">
                  <div className="text-amber-400 font-semibold">🏆 Prize: {ch.prize}</div>
                  {ch.rawFootageUrl && (
                    <div className="text-purple-300 font-mono text-[11px] truncate">
                      📦 Raw Assets: {ch.rawFootageUrl}
                    </div>
                  )}
                </div>

                <div className="text-[11px] font-mono text-gray-400">
                  {challengeSubmissions.filter(s => s.challengeId === ch.id).length} Entries Submitted
                </div>
              </div>
            ))}
          </div>

          {/* Submissions Review Table */}
          <div className="space-y-4 pt-4 border-t border-purple-900/20">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Student Challenge Submissions Ledger ({challengeSubmissions.length})
            </h3>

            <div className="bg-black/40 border border-purple-900/20 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-950/30 text-gray-400 uppercase font-mono tracking-wider border-b border-purple-900/20">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Submission Title</th>
                      <th className="py-3 px-4">Video Link</th>
                      <th className="py-3 px-4">Votes</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/10 text-gray-300">
                    {challengeSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-purple-950/20 transition-colors">
                        <td className="py-3 px-4 flex items-center gap-2">
                          <img
                            src={sub.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-purple-500/30"
                          />
                          <span className="font-semibold text-white">{sub.userName}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white max-w-xs truncate">
                          {sub.title}
                        </td>
                        <td className="py-3 px-4 font-mono text-purple-400 truncate max-w-[200px]">
                          <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                            <span>{sub.videoUrl}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          ⭐️ {sub.votesCount || 0}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteSubmission(sub)}
                            className="p-1.5 bg-zinc-900 hover:bg-red-950 text-red-400 rounded-lg transition-all cursor-pointer"
                            title="Delete submission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {challengeSubmissions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                          No student submissions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: LIVE Q&A QUEUE                                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'qna' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Live Stream Q&A Question Queue</h2>
              <p className="text-gray-400 text-xs">Review student questions asked during masterclasses, prioritize top upvoted questions, and mark as answered</p>
            </div>
            <button
              onClick={fetchQna}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-gray-200 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="space-y-3">
            {qnaQuestions.map(q => (
              <div key={q.id} className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                q.isAnswered 
                  ? 'bg-zinc-950/40 border-purple-900/10 opacity-70' 
                  : 'bg-zinc-950 border-purple-900/30 shadow-md'
              }`}>
                <div className="flex items-start gap-3">
                  <img
                    src={q.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=qna'}
                    alt=""
                    className="w-8 h-8 rounded-full border border-purple-500/30 object-cover mt-0.5"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{q.userName}</span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(q.createdAt).toLocaleTimeString()}
                      </span>
                      {q.isAnswered && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold">
                          ✓ Answered Live
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-200">{q.question}</p>
                    <div className="text-[11px] font-mono text-purple-400">
                      👍 {q.upvotesCount || 0} Upvotes from students
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleAnsweredQuestion(q)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      q.isAnswered
                        ? 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {q.isAnswered ? 'Mark Pending' : 'Mark Answered'}
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q)}
                    className="p-2 bg-zinc-900 hover:bg-red-950 text-red-400 rounded-xl transition-all cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {qnaQuestions.length === 0 && !loadingQna && (
              <div className="py-12 text-center text-gray-500 font-mono bg-black/40 border border-purple-900/20 rounded-2xl">
                No active questions in the live stream queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: CHAT MESSAGES MODERATION                                      */}
      {/* ========================================================================= */}
      {activeSubTab === 'moderation' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Community Chat Messages Moderation</h2>
              <p className="text-gray-400 text-xs">Search messages, delete spam/inappropriate content, pin announcements, and monitor chat safety</p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search messages, user, channel..."
                value={messageSearch}
                onChange={e => setMessageSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-purple-900/30 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="bg-black/40 border border-purple-900/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-950/30 text-gray-400 uppercase font-mono tracking-wider border-b border-purple-900/20">
                  <tr>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Sender</th>
                    <th className="py-3 px-4">Message Content</th>
                    <th className="py-3 px-4">Media</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/10 text-gray-300">
                  {filteredMessages.map(msg => (
                    <tr key={msg.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">
                        #{msg.channelId}
                      </td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        <img
                          src={msg.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                          alt=""
                          className="w-5 h-5 rounded-full object-cover border border-purple-500/30"
                        />
                        <span className="font-semibold text-white">{msg.userName}</span>
                        {msg.userRole && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950 text-purple-300">
                            {msg.userRole}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-200 max-w-sm">
                        <div className="line-clamp-2">{msg.content}</div>
                        {msg.isPinned && (
                          <span className="text-[10px] text-amber-400 font-mono font-bold mt-0.5 block">
                            📌 PINNED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {msg.mediaUrl ? (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">
                            Attachment
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                        {new Date(msg.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleTogglePinMessage(msg)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            msg.isPinned 
                              ? 'bg-amber-950 border-amber-500 text-amber-300' 
                              : 'bg-zinc-900 border-white/5 text-gray-400 hover:text-white'
                          }`}
                          title={msg.isPinned ? 'Unpin message' : 'Pin message to channel'}
                        >
                          📌
                        </button>
                        <button
                          onClick={() => handleDeleteChatMessage(msg)}
                          className="p-1.5 bg-zinc-900 border border-white/5 hover:border-red-500 text-red-400 rounded-lg transition-all cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMessages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                        No messages found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CHANNEL EDIT/CREATE                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showChannelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-purple-900/20 pb-4">
                <h3 className="font-black text-lg text-white">
                  {editingChannelId ? 'Edit Channel Details' : 'Create New Channel'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowChannelModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveChannel} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Channel Name (e.g. premiere-pro-help)
                  </label>
                  <input
                    type="text"
                    required
                    value={channelForm.name}
                    onChange={e => setChannelForm({ ...channelForm, name: e.target.value })}
                    placeholder="premiere-pro-help"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Category
                    </label>
                    <select
                      value={channelForm.category}
                      onChange={e => setChannelForm({ ...channelForm, category: e.target.value as any })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="General">General</option>
                      <option value="Feedback & Critique">Feedback & Critique</option>
                      <option value="Specialized">Specialized</option>
                      <option value="Career & Collabs">Career & Collabs</option>
                      <option value="Assets">Assets</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Display Order (Sort)
                    </label>
                    <input
                      type="number"
                      value={channelForm.order}
                      onChange={e => setChannelForm({ ...channelForm, order: Number(e.target.value) })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Description & Topic
                  </label>
                  <textarea
                    rows={2}
                    value={channelForm.description}
                    onChange={e => setChannelForm({ ...channelForm, description: e.target.value })}
                    placeholder="What is this channel for?"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isPrivateCh"
                    checked={channelForm.isPrivate}
                    onChange={e => setChannelForm({ ...channelForm, isPrivate: e.target.checked })}
                    className="rounded bg-black border-purple-900/40 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isPrivateCh" className="text-xs text-gray-300 font-semibold cursor-pointer select-none">
                    Lock as Pro / Enrolled Student Only Channel
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/20">
                  <button
                    type="button"
                    onClick={() => setShowChannelModal(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Save Channel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: LIVESTREAM EDIT/CREATE                                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showLivestreamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-purple-900/20 pb-4">
                <h3 className="font-black text-lg text-white">
                  {editingLivestreamId ? 'Edit Masterclass Stream' : 'Schedule New Live Masterclass'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLivestreamModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveLivestream} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Masterclass Title
                  </label>
                  <input
                    type="text"
                    required
                    value={livestreamForm.title}
                    onChange={e => setLivestreamForm({ ...livestreamForm, title: e.target.value })}
                    placeholder="Live Workshop: Advanced Color Science in DaVinci Resolve 19"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Description & Overview
                  </label>
                  <textarea
                    rows={3}
                    value={livestreamForm.description}
                    onChange={e => setLivestreamForm({ ...livestreamForm, description: e.target.value })}
                    placeholder="Detailed session breakdown and what editors will learn..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Stream Status
                    </label>
                    <select
                      value={livestreamForm.status}
                      onChange={e => setLivestreamForm({ ...livestreamForm, status: e.target.value as any })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="live">🔴 Live Now</option>
                      <option value="upcoming">🗓️ Upcoming / Scheduled</option>
                      <option value="ended">🏁 Ended (Replay)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Scheduled Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      value={livestreamForm.scheduledAt}
                      onChange={e => setLivestreamForm({ ...livestreamForm, scheduledAt: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Simulated Viewers
                    </label>
                    <input
                      type="number"
                      value={livestreamForm.viewersCount}
                      onChange={e => setLivestreamForm({ ...livestreamForm, viewersCount: Number(e.target.value) })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Live Stream Video Embed URL (YouTube embed / Vimeo / HLS)
                  </label>
                  <input
                    type="text"
                    value={livestreamForm.streamUrl}
                    onChange={e => setLivestreamForm({ ...livestreamForm, streamUrl: e.target.value })}
                    placeholder="https://www.youtube.com/embed/VIDEO_ID"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Instructor / Host Name
                    </label>
                    <input
                      type="text"
                      value={livestreamForm.hostName}
                      onChange={e => setLivestreamForm({ ...livestreamForm, hostName: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Host Role / Title
                    </label>
                    <input
                      type="text"
                      value={livestreamForm.hostRole}
                      onChange={e => setLivestreamForm({ ...livestreamForm, hostRole: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Topic Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={livestreamForm.tagsRaw}
                    onChange={e => setLivestreamForm({ ...livestreamForm, tagsRaw: e.target.value })}
                    placeholder="DaVinci Resolve, Color Science, Masterclass"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Replay Recording URL (Optional, for ended sessions)
                  </label>
                  <input
                    type="text"
                    value={livestreamForm.recordingUrl}
                    onChange={e => setLivestreamForm({ ...livestreamForm, recordingUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/20">
                  <button
                    type="button"
                    onClick={() => setShowLivestreamModal(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Save Masterclass
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: VAULT RESOURCE EDIT/CREATE                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showVaultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-purple-900/20 pb-4">
                <h3 className="font-black text-lg text-white">
                  {editingVaultId ? 'Edit Vault Asset Pack' : 'Upload New Vault Pack'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowVaultModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVaultResource} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Asset Pack Title
                  </label>
                  <input
                    type="text"
                    required
                    value={vaultForm.title}
                    onChange={e => setVaultForm({ ...vaultForm, title: e.target.value })}
                    placeholder="Cyberpunk & Cinematic Impact Hits Vol. 2"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Category
                    </label>
                    <select
                      value={vaultForm.category}
                      onChange={e => setVaultForm({ ...vaultForm, category: e.target.value as any })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="sfx">SFX (Sound Effects)</option>
                      <option value="luts">LUTs & Color Presets</option>
                      <option value="templates">MOGRT / AE Templates</option>
                      <option value="overlays">Film Grain & Overlays</option>
                      <option value="3d-assets">3D Models & UI HUDs</option>
                      <option value="project-files">Project Files & Stems</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Format
                    </label>
                    <input
                      type="text"
                      value={vaultForm.format}
                      onChange={e => setVaultForm({ ...vaultForm, format: e.target.value })}
                      placeholder=".WAV (48kHz 24-bit)"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      File Size
                    </label>
                    <input
                      type="text"
                      value={vaultForm.fileSize}
                      onChange={e => setVaultForm({ ...vaultForm, fileSize: e.target.value })}
                      placeholder="350 MB"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Description & Contents
                  </label>
                  <textarea
                    rows={2}
                    value={vaultForm.description}
                    onChange={e => setVaultForm({ ...vaultForm, description: e.target.value })}
                    placeholder="120+ High-Definition sub-booms, trailer risers, whoosh hits..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Download File URL (Direct Cloud Storage / Bunny CDN)
                  </label>
                  <input
                    type="url"
                    required
                    value={vaultForm.downloadUrl}
                    onChange={e => setVaultForm({ ...vaultForm, downloadUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Thumbnail Preview Image URL
                    </label>
                    <input
                      type="url"
                      value={vaultForm.previewUrl}
                      onChange={e => setVaultForm({ ...vaultForm, previewUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Audio Preview Track URL (Optional for SFX)
                    </label>
                    <input
                      type="url"
                      value={vaultForm.audioUrl}
                      onChange={e => setVaultForm({ ...vaultForm, audioUrl: e.target.value })}
                      placeholder="https://.../preview.mp3"
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={vaultForm.tagsRaw}
                    onChange={e => setVaultForm({ ...vaultForm, tagsRaw: e.target.value })}
                    placeholder="Sub-Bass, Trailer SFX, Transitions"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isProVault"
                    checked={vaultForm.isPro}
                    onChange={e => setVaultForm({ ...vaultForm, isPro: e.target.checked })}
                    className="rounded bg-black border-purple-900/40 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isProVault" className="text-xs text-gray-300 font-semibold cursor-pointer select-none">
                    Lock as Pro Plan / Enrolled Creator Asset (Uncheck for free public asset)
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/20">
                  <button
                    type="button"
                    onClick={() => setShowVaultModal(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Save Asset Pack
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: CHALLENGE EDIT/CREATE                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showChallengeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-900/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-purple-900/20 pb-4">
                <h3 className="font-black text-lg text-white">
                  {editingChallengeId ? 'Edit Video Challenge' : 'Create New Video Challenge'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowChallengeModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveChallenge} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Challenge Title
                  </label>
                  <input
                    type="text"
                    required
                    value={challengeForm.title}
                    onChange={e => setChallengeForm({ ...challengeForm, title: e.target.value })}
                    placeholder="Edit Challenge #35: 30-Second Cyberpunk Trailer"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Status
                    </label>
                    <select
                      value={challengeForm.status}
                      onChange={e => setChallengeForm({ ...challengeForm, status: e.target.value as any })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="active">Active (Accepting Entries)</option>
                      <option value="voting">Community Voting Phase</option>
                      <option value="completed">Completed / Winner Crowned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                      Deadline Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      value={challengeForm.deadline}
                      onChange={e => setChallengeForm({ ...challengeForm, deadline: e.target.value })}
                      className="w-full bg-black border border-purple-900/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Prize Description
                  </label>
                  <input
                    type="text"
                    value={challengeForm.prize}
                    onChange={e => setChallengeForm({ ...challengeForm, prize: e.target.value })}
                    placeholder="1 Year Adobe Creative Cloud Pro + 15,000 DA Store Credit"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Brief Description
                  </label>
                  <textarea
                    rows={2}
                    value={challengeForm.description}
                    onChange={e => setChallengeForm({ ...challengeForm, description: e.target.value })}
                    placeholder="Craft a 30s rhythm synced trailer using the raw footage pack..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Raw Footage / Assets Download URL
                  </label>
                  <input
                    type="url"
                    value={challengeForm.rawFootageUrl}
                    onChange={e => setChallengeForm({ ...challengeForm, rawFootageUrl: e.target.value })}
                    placeholder="https://drive.google.com/... or direct zip link"
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Cover Banner Image URL
                  </label>
                  <input
                    type="url"
                    value={challengeForm.coverImage}
                    onChange={e => setChallengeForm({ ...challengeForm, coverImage: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-300 uppercase mb-1">
                    Rules & Guidelines (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={challengeForm.rulesRaw}
                    onChange={e => setChallengeForm({ ...challengeForm, rulesRaw: e.target.value })}
                    placeholder="Length must be exactly 25 to 35 seconds..."
                    className="w-full bg-black border border-purple-900/30 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-900/20">
                  <button
                    type="button"
                    onClick={() => setShowChallengeModal(false)}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-gray-300 rounded-xl text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Save Challenge
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
