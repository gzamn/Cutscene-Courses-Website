import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  onAuthStateChanged as fbOnAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile,
  updateEmail as fbUpdateEmail,
  updatePassword as fbUpdatePassword,
  User as FirebaseUserClass
} from 'firebase/auth';
import { 
  getFirestore,
  collection as fbCollection,
  doc as fbDoc,
  query as fbQuery,
  where as fbWhere,
  orderBy as fbOrderBy,
  getDoc as fbGetDoc,
  getDocFromServer as fbGetDocFromServer,
  setDoc as fbSetDoc,
  updateDoc as fbUpdateDoc,
  addDoc as fbAddDoc,
  deleteDoc as fbDeleteDoc,
  getDocs as fbGetDocs,
  onSnapshot as fbOnSnapshot,
  serverTimestamp as fbServerTimestamp
} from 'firebase/firestore';
import { 
  getStorage,
  ref as fbRef,
  uploadBytes as fbUploadBytes,
  getDownloadURL as fbGetDownloadURL
} from 'firebase/storage';

// Import configuration dynamically
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize core Firebase services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const storage = getStorage(app);

// Align with current codebase export schemas
export type FirebaseUser = FirebaseUserClass;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Comprehensive Firestore security-vulnerability and operations error diagnostic wrapper
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Payload: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Aligning auth changes tracking with our React components
export const onAuthStateChanged = (authInstance: any, callback: (user: FirebaseUser | null) => void) => {
  return fbOnAuthStateChanged(auth, callback);
};

// --- FIRESTORE SDK WRAPPERS ---

export const collection = (dbInstance: any, collectionName: string) => {
  return fbCollection(db, collectionName);
};

export const doc = (dbOrCollection: any, ...pathSegments: string[]) => {
  if (typeof dbOrCollection === 'string') {
    return fbDoc(db, dbOrCollection, ...pathSegments);
  }
  return fbDoc(dbOrCollection, ...pathSegments);
};

export const query = (collectionRef: any, ...constraints: any[]) => {
  return fbQuery(collectionRef, ...constraints);
};

export const where = (field: string, op: any, val: any) => {
  return fbWhere(field, op, val);
};

export const orderBy = (field: string, direction?: 'asc' | 'desc') => {
  return fbOrderBy(field, direction);
};

// Document Fetch Actions
export const getDoc = async (docRef: any): Promise<any> => {
  try {
    const snap = await fbGetDoc(docRef);
    return snap as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docRef.path || '[Doc]');
  }
};

export const getDocFromServer = async (docRef: any): Promise<any> => {
  try {
    const snap = await fbGetDocFromServer(docRef);
    return snap as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docRef.path || '[Doc]');
  }
};

export const getDocs = async (queryRef: any): Promise<any> => {
  try {
    const snap = await fbGetDocs(queryRef);
    return snap as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, queryRef.path || '[Query]');
  }
};

// Document Mutation Actions
export const setDoc = async (docRef: any, data: any, options?: any): Promise<any> => {
  try {
    return await fbSetDoc(docRef, data, options) as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docRef.path || '[Doc]');
  }
};

export const updateDoc = async (docRef: any, data: any): Promise<any> => {
  try {
    return await fbUpdateDoc(docRef, data) as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docRef.path || '[Doc]');
  }
};

export const addDoc = async (collectionRef: any, data: any): Promise<any> => {
  try {
    return await fbAddDoc(collectionRef, data) as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionRef.path || '[Collection]');
  }
};

export const deleteDoc = async (docRef: any): Promise<any> => {
  try {
    return await fbDeleteDoc(docRef) as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docRef.path || '[Doc]');
  }
};

export const serverTimestamp = fbServerTimestamp;

// Dynamic snapshot observers with embedded fail-safe logging
export const onSnapshot = (
  refInstance: any, 
  callback: (snap: any) => void, 
  errorCallback?: (err: any) => void
): any => {
  const path = refInstance.path || '[Document / Query Snapshot]';
  return fbOnSnapshot(refInstance, (snap: any) => {
    callback(snap as any);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      handleFirestoreError(error, OperationType.GET, path);
    }
  });
};

// --- AUTHENTICATION ACTIONS ---

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  // Always use signInWithPopup under the AI Studio review context
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  
  // Update user profile in Firestore
  const userRef = fbDoc(db, 'users', user.uid);
  await fbSetDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'student',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return user;
};

export const loginWithEmail = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
};

export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  const user = result.user;

  // Set auth display name
  await fbUpdateProfile(user, { displayName: name });

  // Provision user in users metadata collection
  const userRef = fbDoc(db, 'users', user.uid);
  await fbSetDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: name,
    photoURL: '',
    role: 'student',
    createdAt: new Date().toISOString()
  }, { merge: true });

  return user;
};

export const logout = async () => {
  await signOut(auth);
};

export const updateProfile = async (fbUser: any, data: { displayName?: string; photoURL?: string }) => {
  // Update authenticating service profile
  await fbUpdateProfile(fbUser, data);
  
  // Update Firestore user document
  const userRef = fbDoc(db, 'users', fbUser.uid);
  await fbUpdateDoc(userRef, data);
};

export const updateEmail = async (fbUser: any, newEmail: string) => {
  await fbUpdateEmail(fbUser, newEmail);
  const userRef = fbDoc(db, 'users', fbUser.uid);
  await fbUpdateDoc(userRef, { email: newEmail });
};

export const updatePassword = async (fbUser: any, pass: string) => {
  await fbUpdatePassword(fbUser, pass);
};

// --- STORAGE ACTIONS ---

export const ref = (storageInstance: any, path: string) => {
  return fbRef(storage, path);
};

export const uploadBytes = async (refInstance: any, file: any) => {
  return await fbUploadBytes(refInstance, file);
};

export const getDownloadURL = async (refInstance: any) => {
  return await fbGetDownloadURL(refInstance);
};

// --- DEFAULT SEED DATA ---

export const DEFAULT_COURSES = [
  {
    id: "1",
    title: "Video Editing 101",
    description: "Master professional cinematic video editing using Adobe Premiere Pro and Adobe After Effects. Learn color grading, sound design, and industry-standard workflows.",
    detailedDescription: "Go from beginner to pro editor. Learn advanced montage techniques, cinematic pacing, color workflows, and sound editing with Adobe Premiere Pro and Adobe After Effects.",
    price: 15000,
    currency: "DA",
    image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80",
    duration: "12 weeks",
    level: "Beginner to Pro",
    requirements: ["A computer capable of video editing", "Adobe Premiere Pro & Adobe After Effects installed", "No prior experience required"],
    learningOutcomes: ["Master professional video editing techniques", "Incorporate advanced color grading and cinematic sound design", "Optimize editing efficiency and delivery workflows", "Structure stories with premium pacing"],
    instructor: {
      name: "Amine Rouabhia",
      bio: "Professional cinematic editor and director with a passion for creative visual storytelling.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80"
    },
    isComingSoon: false,
    formatAvailability: ["recorded"],
  },
  {
    id: "2",
    title: "Web Development Bootcamp",
    description: "Go from absolute beginner to full-stack developer. Learn HTML, CSS, JavaScript, React, and Node.js.",
    detailedDescription: "A complete masterclass on modern web application construction, APIs, database integration, and state managers.",
    price: 18000,
    currency: "DA",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    duration: "16 weeks",
    level: "Beginner",
    requirements: ["Basic computer literacy", "A laptop or computer", "No programming experience required"],
    learningOutcomes: ["Build fully responsive web applications", "Create REST APIs and database schemas", "Deploy production-ready programs"],
    instructor: {
      name: "Amine Rouabhia",
      bio: "Full Stack Engineer and digital content trainer.",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80"
    },
    isComingSoon: false,
    formatAvailability: ["recorded"],
    chapters: [
      {
        title: "Web Standards & Coding Essentials",
        lessons: [
          { id: "session", type: "session", video_url: "https://www.youtube.com/embed/gO8Vp6_Z9x8" },
          { id: "exercise", type: "exercise", video_url: "https://www.youtube.com/embed/EAn8p3ZIn_s" },
          { id: "homework", type: "homework", video_url: "https://www.youtube.com/embed/vG-L84R89n0" }
        ]
      },
      {
        title: "Advanced React & Component States",
        lessons: [
          { id: "session", type: "session", video_url: "https://www.youtube.com/embed/5R42-8sN_E8" },
          { id: "exercise", type: "exercise", video_url: "https://www.youtube.com/embed/vN1qUf5M9hA" },
          { id: "homework", type: "homework", video_url: "https://www.youtube.com/embed/8H6f68N_l9w" }
        ]
      }
    ]
  },
  {
    id: "3",
    title: "Advanced Frontend Engineering",
    description: "Deep dive into performance tuning, state machines, structural systems, and automated test pipelines.",
    detailedDescription: "Designed for intermediate developers who want to master cutting-edge software design in React and Vite.",
    price: 22000,
    currency: "DA",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    duration: "10 weeks",
    level: "Advanced",
    requirements: ["Intermediate React knowledge", "Familiarity with Git and styling", "Solid JavaScript basics"],
    learningOutcomes: ["Optimize app render speeds", "Implement design tokens", "Configure modern CI/CD operations"],
    instructor: {
      name: "Amine Rouabhia",
      bio: "Principal Frontend Architect with a decade of engineering experience.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80"
    },
    isComingSoon: false,
    formatAvailability: ["recorded"],
    chapters: [
      {
        title: "Build Systems and Package Optimization",
        lessons: [
          { id: "session", type: "session", video_url: "https://www.youtube.com/embed/8_85VunF-1c" },
          { id: "exercise", type: "exercise", video_url: "https://www.youtube.com/embed/QpI77U8aP_g" },
          { id: "homework", type: "homework", video_url: "https://www.youtube.com/embed/v82eK36tH4Q" }
        ]
      }
    ]
  },
  {
    id: "4",
    title: "Graphic Design Masterclass",
    description: "Master typography, vector design, branding concepts, and visual media production using standard design apps.",
    detailedDescription: "A curated design program for creatives who want to develop stunning typography layouts and identity brandings.",
    price: 12000,
    currency: "DA",
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80",
    duration: "8 weeks",
    level: "Intermediate",
    requirements: ["A computer with design tool access", "Passion for high contrast visual forms", "Basic file export knowledge"],
    learningOutcomes: ["Design comprehensive brand styles", "Select optimal typographic combinations", "Produce portfolio-quality visual layouts"],
    instructor: {
      name: "Amine Rouabhia",
      bio: "Visual Director and Brand Consultant with extensive corporate experience.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80"
    },
    isComingSoon: false,
    formatAvailability: ["recorded"],
    chapters: [
      {
        title: "Typography and Communication Formats",
        lessons: [
          { id: "session", type: "session", video_url: "https://www.youtube.com/embed/9G6k7E-pZog" },
          { id: "exercise", type: "exercise", video_url: "https://www.youtube.com/embed/YqQx75OPRa0" },
          { id: "homework", type: "homework", video_url: "https://www.youtube.com/embed/V_K77qJ8488" }
        ]
      }
    ]
  }
];

export const ensureDefaultCoursesSeeded = async () => {
  try {
    const coursesRef = fbCollection(db, 'courses');
    const snap = await fbGetDocs(coursesRef);
    if (snap.empty) {
      console.log("Empty Firestore courses collection detected. Seeding starter academy data...");
      for (const course of DEFAULT_COURSES) {
        await fbSetDoc(fbDoc(db, 'courses', course.id), course);
      }
    } else {
      // Force update Course ID '1' to Video Editing 101 so the theme, content, and titles match perfectly!
      await fbSetDoc(fbDoc(db, 'courses', '1'), DEFAULT_COURSES[0], { merge: true });
    }

    // Now seed Video Editing subcollection chapters!
    const id = "1";
    const chSnap = await fbGetDocs(fbCollection(db, `courses/${id}/chapters`));
    if (chSnap.empty) {
      console.log("Seeding Video Editing 101 chapters subcollection...");
      const initialChapters = [
        {
          courseId: id,
          title: "Chapter 1: Mastering the Basics",
          position: 1,
          is_preview: true,
          session_url_1: "https://www.youtube.com/embed/9G6k7E-pZog",
          session_url_2: "https://www.youtube.com/embed/Jn6A_9X_3p8",
          session_url_3: "https://www.youtube.com/embed/M9hFv_1vNzo",
          session_url_4: "https://www.youtube.com/embed/Jn6A_9X_3p8",
          exercise_url: "https://www.youtube.com/embed/YqQx75OPRa0"
        },
        {
          courseId: id,
          title: "Chapter 2: Advanced Editing & Visual Styles",
          position: 2,
          is_preview: false,
          session_url_1: "https://www.youtube.com/embed/K19_ePZJby0",
          session_url_2: "https://www.youtube.com/embed/z82c7fSOfqE",
          session_url_3: "https://www.youtube.com/embed/U03K6GAtKMo",
          session_url_4: "https://www.youtube.com/embed/z82c7fSOfqE",
          exercise_url: "https://www.youtube.com/embed/Jn6A_9X_3p8"
        },
        {
          courseId: id,
          title: "Chapter 3: Professional Workflow & Directing",
          position: 3,
          is_preview: false,
          session_url_1: "https://www.youtube.com/embed/8_85VunF-1c",
          session_url_2: "https://www.youtube.com/embed/QpI77U8aP_g",
          session_url_3: "https://www.youtube.com/embed/v82eK36tH4Q",
          session_url_4: "https://www.youtube.com/embed/QpI77U8aP_g",
          exercise_url: "https://www.youtube.com/embed/YqQx75OPRa0"
        }
      ];
      for (const ch of initialChapters) {
        await fbSetDoc(fbDoc(db, `courses/${id}/chapters`, `seeded_${ch.position}`), ch);
      }
      console.log("Starter chapters database subcollection seeding completed successfully.");
    }
  } catch (error) {
    console.warn("Could not seed starter academy courses:", error);
  }
};

export const DEFAULT_STUDENT_WORKS = [
  { id: 'w1', studentName: 'Ahmed Z.', thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=400&auto=format&fit=crop', courseId: '1', courseTitle: 'Video Editing 101', approved: true, status: 'approved' },
  { id: 'w2', studentName: 'Sara M.', thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=400&auto=format&fit=crop', courseId: '1', courseTitle: 'Video Editing 101', approved: true, status: 'approved' },
  { id: 'w3', studentName: 'Karim L.', thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=400&auto=format&fit=crop', courseId: '1', courseTitle: 'Video Editing 101', approved: true, status: 'approved' },
  { id: 'w4', studentName: 'Yassine B.', thumbnail: 'https://images.unsplash.com/photo-1535016120720-40c646bebbfc?q=80&w=400&auto=format&fit=crop', courseId: '2', courseTitle: 'Web Development Bootcamp', approved: true, status: 'approved' },
  { id: 'w5', studentName: 'Lina K.', thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=400&auto=format&fit=crop', courseId: '2', courseTitle: 'Web Development Bootcamp', approved: true, status: 'approved' },
  { id: 'w9', studentName: 'Amir T.', thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400&auto=format&fit=crop', courseId: '2', courseTitle: 'Web Development Bootcamp', approved: true, status: 'approved' },
  { id: 'w6', studentName: 'Omar D.', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop', courseId: '3', courseTitle: 'Advanced Frontend Engineering', approved: true, status: 'approved' },
  { id: 'w7', studentName: 'Meriem S.', thumbnail: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?q=80&w=400&auto=format&fit=crop', courseId: '3', courseTitle: 'Advanced Frontend Engineering', approved: true, status: 'approved' },
  { id: 'w8', studentName: 'Sofiane R.', thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400&auto=format&fit=crop', courseId: '3', courseTitle: 'Advanced Frontend Engineering', approved: true, status: 'approved' }
];

export const ensureDefaultStudentWorksSeeded = async () => {
  try {
    const worksRef = fbCollection(db, 'student_works');
    const snap = await fbGetDocs(worksRef);
    if (snap.empty) {
      console.log("Empty Firestore student_works collection detected. Seeding starter student works...");
      for (const work of DEFAULT_STUDENT_WORKS) {
        await fbSetDoc(fbDoc(db, 'student_works', work.id), work);
      }
      console.log("Starter student works database seeding completed successfully.");
    }
  } catch (error) {
    console.warn("Could not seed starter student works:", error);
  }
};

export const DEFAULT_HERO_VIDEOS = [
  { 
    id: 'hero1', 
    title: 'CUTSCENE Academy Intro Video', 
    videoUrl: 'https://player.mediadelivery.net/embed/674907/2c8123ea-b758-4743-8e78-50f577c890a1?autoplay=true&loop=true&muted=true&preload=true&responsive=true', 
    isActive: true, 
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'hero2', 
    title: 'Starter Cinematic Background', 
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-intro-of-a-video-editor-at-work-43750-large.mp4', 
    isActive: false, 
    createdAt: new Date().toISOString() 
  }
];

export const ensureDefaultHeroVideosSeeded = async () => {
  try {
    const heroRef = fbCollection(db, 'hero_videos');
    const snap = await fbGetDocs(heroRef);
    if (snap.empty) {
      console.log("Empty Firestore hero_videos collection detected. Seeding fallback hero videos...");
      for (const hero of DEFAULT_HERO_VIDEOS) {
        await fbSetDoc(fbDoc(db, 'hero_videos', hero.id), hero);
      }
      console.log("Starter hero videos database seeding completed successfully.");
    }
  } catch (error) {
    console.warn("Could not seed starter hero videos:", error);
  }
};

