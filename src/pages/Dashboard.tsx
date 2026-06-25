import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db, storage, handleFirestoreError, OperationType, collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, ref, uploadBytes, getDownloadURL } from '../firebase';
import { BookOpen, Trophy, Clock, Star, Upload, Trash2, CheckCircle2, PlayCircle, Download, ExternalLink, Lock, FolderOpen, Share2, Loader2, X, Sparkles, ShieldAlert, Award, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { SparkleButton, RainbowButton } from '../components/AnimatedButtons';

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const { language, t } = useLanguage();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [firestoreCourses, setFirestoreCourses] = useState<any[]>([]);
  const [chaptersCountMap, setChaptersCountMap] = useState<{ [courseId: string]: number }>({});
  const [downloadables, setDownloadables] = useState<any[]>([]);
  const [hasDownloadAccess, setHasDownloadAccess] = useState(false);
  const [userDownloads, setUserDownloads] = useState<any[]>([]);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [bunnyUploading, setBunnyUploading] = useState(false);
  const [bunnyUploadProgress, setBunnyUploadProgress] = useState(0);
  const [bunnySuccessText, setBunnySuccessText] = useState<string | null>(null);
  const bunnyFileInputRef = React.useRef<HTMLInputElement>(null);

  // Direct video upload states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoSuccessText, setVideoSuccessText] = useState<string | null>(null);
  const videoFileInputRef = React.useRef<HTMLInputElement>(null);

  // Share Progress states
  const [isSharing, setIsSharing] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [shareCourseName, setShareCourseName] = useState('');
  const [shareProgressPercent, setShareProgressPercent] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<'ai' | 'certificate'>('ai');

  // View Certificate states
  const [isViewingCert, setIsViewingCert] = useState(false);
  const [certModalImage, setCertModalImage] = useState<string | null>(null);
  const [certModalTitle, setCertModalTitle] = useState('');
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [selectedCert, setSelectedCert] = useState<any>(null);

  const generateCertificateCanvas = (courseTitle: string, studentName: string, issuedAtStr: string, certId: string) => {
    return new Promise<string>((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Draw premium gradient background (Deep dark slate/indigo/purple)
      const gradient = ctx.createLinearGradient(0, 0, 1920, 1080);
      gradient.addColorStop(0, '#020005');
      gradient.addColorStop(0.3, '#09090b');
      gradient.addColorStop(0.7, '#04020a');
      gradient.addColorStop(1, '#150624');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1920, 1080);

      // Subtle futuristic grid lines
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1920; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1080);
        ctx.stroke();
      }
      for (let j = 0; j < 1080; j += 60) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(1920, j);
        ctx.stroke();
      }

      // Large soft decorative gradient circles for glowing background ambiance
      const glow1 = ctx.createRadialGradient(1600, 200, 0, 1600, 200, 600);
      glow1.addColorStop(0, 'rgba(168, 85, 247, 0.06)');
      glow1.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = glow1;
      ctx.beginPath();
      ctx.arc(1600, 200, 600, 0, Math.PI * 2);
      ctx.fill();

      const glow2 = ctx.createRadialGradient(300, 800, 0, 300, 800, 500);
      glow2.addColorStop(0, 'rgba(139, 92, 246, 0.06)');
      glow2.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = glow2;
      ctx.beginPath();
      ctx.arc(300, 800, 500, 0, Math.PI * 2);
      ctx.fill();

      // Dual Border Lines (Outer thin purple glow, Inner thin gold/neon gold line)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, 1840, 1000);

      ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(48, 48, 1824, 984);

      ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)'; // Golden border accent
      ctx.lineWidth = 2;
      ctx.strokeRect(65, 65, 1790, 950);

      // Corner geometric accent decorations
      const drawCorner = (x: number, y: number, xDir: number, yDir: number) => {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.7)';
        ctx.fillRect(x, y, xDir * 40, yDir * 4);
        ctx.fillRect(x, y, xDir * 4, yDir * 40);
      };
      drawCorner(65, 65, 1, 1);
      drawCorner(1855, 65, -1, 1);
      drawCorner(65, 1015, 1, -1);
      drawCorner(1855, 1015, -1, -1);

      // --- Header text ---
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CUTSCENE ACADEMY', 960, 160);

      // Small Divider Line
      const gradLine = ctx.createLinearGradient(810, 0, 1110, 0);
      gradLine.addColorStop(0, 'rgba(168, 85, 247, 0)');
      gradLine.addColorStop(0.5, 'rgba(168, 85, 247, 0.8)');
      gradLine.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = gradLine;
      ctx.fillRect(810, 185, 300, 3);

      // Main Large Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 74px sans-serif';
      ctx.fillText('CERTIFICATE OF COMPLETION', 960, 290);

      // "This is proudly presented to"
      ctx.fillStyle = 'rgba(156, 163, 175, 0.85)';
      ctx.font = 'italic 500 24px serif';
      ctx.fillText('This certificate is proudly presented to', 960, 395);

      // Student Name (Splendid elegant presentation)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText(studentName, 960, 490);

      // Underline for student name
      const nameUnderline = ctx.createLinearGradient(660, 0, 1260, 0);
      nameUnderline.addColorStop(0, 'rgba(234, 179, 8, 0.05)');
      nameUnderline.addColorStop(0.5, 'rgba(234, 179, 8, 0.8)');
      nameUnderline.addColorStop(1, 'rgba(234, 179, 8, 0.05)');
      ctx.fillStyle = nameUnderline;
      ctx.fillRect(660, 525, 600, 2);

      // "for successfully completing..."
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.font = '500 22px sans-serif';
      ctx.fillText('for successfully completing all curriculum, exercises, and projects for', 960, 580);

      // Course Name (Glowing bold purple)
      const courseTitleGrad = ctx.createLinearGradient(600, 0, 1320, 0);
      courseTitleGrad.addColorStop(0, '#a855f7');
      courseTitleGrad.addColorStop(0.5, '#c084fc');
      courseTitleGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = courseTitleGrad;
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(courseTitle, 960, 660);

      // "under instruction of professional curriculum staff"
      ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
      ctx.font = '500 18px sans-serif';
      ctx.fillText('Authorized by the Board of Instructors at Cutscene Academy', 960, 715);

      // Holographic Ribbon/Emblem Gold Seal on bottom center
      const drawHologram = (cx: number, cy: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        const sealGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 75);
        sealGrad.addColorStop(0, '#fef08a');
        sealGrad.addColorStop(0.5, '#eab308');
        sealGrad.addColorStop(1, '#ca8a04');
        ctx.fillStyle = sealGrad;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 70, 0, Math.PI * 2);
        ctx.stroke();

        // Stars inside seal
        ctx.fillStyle = '#854d0e';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('★ ★ ★', cx, cy - 10);

        ctx.fillStyle = '#854d0e';
        ctx.font = '900 11px monospace';
        ctx.fillText('OFFICIAL', cx, cy + 15);
        ctx.fillText('GRADUATE', cx, cy + 30);
        ctx.restore();
      };
      drawHologram(960, 840);

      // Signatures
      // Left side Signature
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(350, 890);
      ctx.lineTo(600, 890);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 24px serif';
      ctx.fillText('Veteran Staff', 475, 875);
      
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.font = '500 16px sans-serif';
      ctx.fillText('Course Instructor', 475, 915);

      // Right side Signature
      ctx.beginPath();
      ctx.moveTo(1320, 890);
      ctx.lineTo(1570, 890);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'italic 24px serif';
      ctx.fillText('Cutscene Director', 1445, 875);

      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.font = '500 16px sans-serif';
      ctx.fillText('Academy Director', 1445, 915);

      // Footer Certificate ID and Date
      ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VERIFICATION_ID: ${certId}`, 100, 980);

      ctx.textAlign = 'right';
      const issuedDate = issuedAtStr ? new Date(issuedAtStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString();
      ctx.fillText(`DATE ISSUED: ${issuedDate}`, 1820, 980);

      resolve(canvas.toDataURL('image/png'));
    });
  };

  const handleOpenCertificate = async (cert: any, triggerDownload = false) => {
    setIsViewingCert(true);
    setIsGeneratingCert(true);
    setCertModalImage(null);
    setCertModalTitle(cert.courseTitle);
    setSelectedCert(cert);

    try {
      const sName = cert.userName || userProfile?.displayName || user?.displayName || user?.email || 'Cutscene Student';
      const certId = cert.id || `CS-CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const issuedDate = cert.issuedAt || new Date().toISOString();
      const imgData = await generateCertificateCanvas(cert.courseTitle, sName, issuedDate, certId);
      setCertModalImage(imgData);
      
      if (triggerDownload) {
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `Certificate_${cert.courseTitle.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Failed to generate certificate:", err);
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const generateCanvasFallback = (courseName: string, progressPercent: number) => {
    return new Promise<string>((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 675;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Draw premium dark/neon gradient background
      const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
      gradient.addColorStop(0, '#04020a');
      gradient.addColorStop(0.5, '#09090b');
      gradient.addColorStop(1, '#110521');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 675);

      // Cyberpunk grid backdrop
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1200; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 675);
        ctx.stroke();
      }
      for (let j = 0; j < 675; j += 50) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(1200, j);
        ctx.stroke();
      }

      // Large soft radial glow on the right
      const glowRight = ctx.createRadialGradient(950, 330, 0, 950, 330, 350);
      glowRight.addColorStop(0, 'rgba(147, 51, 234, 0.12)');
      glowRight.addColorStop(1, 'rgba(147, 51, 234, 0)');
      ctx.fillStyle = glowRight;
      ctx.beginPath();
      ctx.arc(950, 330, 350, 0, Math.PI * 2);
      ctx.fill();

      // Outer border frame with corner accents
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, 1140, 615);

      const drawSmallCorner = (x: number, y: number, xDir: number, yDir: number) => {
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(x, y, xDir * 20, yDir * 3);
        ctx.fillRect(x, y, xDir * 3, yDir * 20);
      };
      drawSmallCorner(30, 30, 1, 1);
      drawSmallCorner(1170, 30, -1, 1);
      drawSmallCorner(30, 645, 1, -1);
      drawSmallCorner(1170, 645, -1, -1);

      // Centered glass panel background for text content
      ctx.fillStyle = 'rgba(15, 10, 25, 0.6)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1;
      const panelX = 60;
      const panelY = 60;
      const panelW = 1080;
      const panelH = 555;
      
      // Draw rounded rectangle for panel
      const radius = 24;
      ctx.beginPath();
      ctx.moveTo(panelX + radius, panelY);
      ctx.lineTo(panelX + panelW - radius, panelY);
      ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + radius);
      ctx.lineTo(panelX + panelW, panelY + panelH - radius);
      ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - radius, panelY + panelH);
      ctx.lineTo(panelX + radius, panelY + panelH);
      ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - radius);
      ctx.lineTo(panelX, panelY + radius);
      ctx.quadraticCurveTo(panelX, panelY, panelX + radius, panelY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Academy Logo on Left
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CUTSCENE ACADEMY', 100, 120);

      // Subtle label
      ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('STUDENT MILESTONE RECORD', 100, 190);

      // Student Name
      const sName = userProfile?.displayName || user?.displayName || user?.email || 'Cutscene Student';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(sName, 100, 240);

      // Divider Line
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.fillRect(100, 275, 450, 1);

      // Course Label
      ctx.fillStyle = 'rgba(156, 163, 175, 0.6)';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('ACTIVE CURRICULUM', 100, 315);

      // Course Title (wrapping)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      const words = courseName.split(' ');
      let line = '';
      let y = 370;
      const maxWidth = 540;
      const lineHeight = 55;

      for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, 100, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 100, y);

      // Right Side: Beautiful Circular Progress Indicator
      const centerX = 880;
      const centerY = 280;
      const outerRad = 120;

      // Draw background ring
      ctx.strokeStyle = 'rgba(24, 24, 27, 0.8)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRad, 0, Math.PI * 2);
      ctx.stroke();

      // Draw active progress arc
      const progressGradient = ctx.createLinearGradient(centerX - outerRad, centerY, centerX + outerRad, centerY);
      progressGradient.addColorStop(0, '#7c3aed');
      progressGradient.addColorStop(1, '#c084fc');
      
      ctx.strokeStyle = progressGradient;
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * progressPercent) / 100;
      ctx.arc(centerX, centerY, outerRad, startAngle, endAngle);
      ctx.stroke();

      // Inner percentage text
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${progressPercent}%`, centerX, centerY - 10);

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('COMPLETED', centerX, centerY + 40);

      // Reset alignment
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Horizontal linear progress bar at the bottom of the panel
      const barX = 100;
      const barY = 510;
      const barW = 1000;
      const barH = 10;

      ctx.fillStyle = 'rgba(24, 24, 27, 0.6)';
      ctx.beginPath();
      ctx.rect(barX, barY, barW, barH);
      ctx.fill();

      const activeW = Math.max(15, (barW * progressPercent) / 100);
      const linGrad = ctx.createLinearGradient(barX, 0, barX + activeW, 0);
      linGrad.addColorStop(0, '#7c3aed');
      linGrad.addColorStop(1, '#a855f7');
      ctx.fillStyle = linGrad;
      ctx.beginPath();
      ctx.rect(barX, barY, activeW, barH);
      ctx.fill();

      // Footer metadata
      ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
      ctx.font = '13px monospace';
      ctx.fillText(`VERIFIABLE_RECORD_ID: CS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 100, 560);
      
      ctx.textAlign = 'right';
      ctx.fillText(`DATE ISSUED: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`, 1100, 560);

      resolve(canvas.toDataURL('image/png'));
    });
  };

  const handleShareProgress = async (courseName: string, progressPercent: number, forceCanvas = false) => {
    setIsSharing(true);
    setIsGenerating(true);
    setShareImage(null);
    setShareError(null);
    setShareCourseName(courseName);
    setShareProgressPercent(progressPercent);

    const activeMode = forceCanvas ? 'certificate' : 'ai';
    setShareMode(activeMode);

    if (activeMode === 'certificate') {
      try {
        const imgData = await generateCanvasFallback(courseName, progressPercent);
        setShareImage(imgData);
        setIsGenerating(false);
      } catch (err) {
        setShareError("Failed to generate certificate card.");
        setIsGenerating(false);
      }
      return;
    }

    // Try AI generation
    try {
      const response = await fetch("/api/share-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName,
          progressPercent,
          studentName: userProfile?.displayName || user?.displayName || user?.email || 'Student'
        }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      if (data.success && data.image) {
        setShareImage(data.image);
      } else {
        throw new Error(data.error || "No image returned");
      }
    } catch (error: any) {
      console.warn("AI Share generation failed, falling back to certificate card:", error);
      try {
        setShareMode('certificate');
        const imgData = await generateCanvasFallback(courseName, progressPercent);
        setShareImage(imgData);
      } catch (err) {
        setShareError("Failed to generate sharing card.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Listen to courses collection
  useEffect(() => {
    const unsubCourses = onSnapshot(collection(db, 'courses'), (snapshot) => {
      setFirestoreCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error listening to courses:", error));
    return () => unsubCourses();
  }, []);

  // Fetch chapter counts of enrolled courses
  useEffect(() => {
    if (enrollments.length === 0) return;
    enrollments.forEach(async (enrollment) => {
      try {
        const snap = await getDocs(collection(db, `courses/${enrollment.courseId}/chapters`));
        let count = snap.size;
        if (count === 0) {
          const dbCourse = firestoreCourses.find(c => c.id === enrollment.courseId);
          if (dbCourse && Array.isArray(dbCourse.chapters)) {
            count = dbCourse.chapters.length;
          }
        }
        if (count === 0) {
          count = enrollment.courseId === '1' ? 12 : enrollment.courseId === '2' ? 18 : enrollment.courseId === '3' ? 24 : 10;
        }
        setChaptersCountMap(prev => ({
          ...prev,
          [enrollment.courseId]: count
        }));
      } catch (err) {
        console.error("Error fetching chapters count for course", enrollment.courseId, err);
      }
    });
  }, [enrollments, firestoreCourses]);

  useEffect(() => {
    if (!user) return;

    // Listen to enrollments
    const qEnrollments = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
    const unsubEnrollments = onSnapshot(qEnrollments, (snapshot) => {
      const enrollmentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEnrollments(enrollmentData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'enrollments'));

    // Listen to progress
    const qProgress = query(collection(db, 'progress'), where('uid', '==', user.uid));
    const unsubProgress = onSnapshot(qProgress, (snapshot) => {
      setProgress(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'progress'));

    // Listen to certificates
    const qCertificates = query(collection(db, 'certificates'), where('uid', '==', user.uid));
    const unsubCertificates = onSnapshot(qCertificates, (snapshot) => {
      setCertificates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'certificates'));

    // Listen to user videos
    const qVideos = query(collection(db, 'videos'), where('uid', '==', user.uid));
    const unsubVideos = onSnapshot(qVideos, (snapshot) => {
      setUserVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'videos'));

    return () => {
      unsubEnrollments();
      unsubProgress();
      unsubCertificates();
      unsubVideos();
    };
  }, [user]);

  // Auto-generate certificates logic
  useEffect(() => {
    if (!user || enrollments.length === 0 || progress.length === 0) return;

    const checkAndGenerateCertificates = async () => {
      for (const enrollment of enrollments) {
        const courseId = enrollment.courseId;
        const prog = getCourseProgress(courseId);
        
        if (prog === 100) {
          // Check if certificate already exists
          const certExists = certificates.some(c => c.courseId === courseId);
          if (!certExists) {
            try {
              const course = firestoreCourses.find(c => c.id === courseId);
              await addDoc(collection(db, 'certificates'), {
                uid: user.uid,
                courseId: courseId,
                courseTitle: course?.title || 'Unknown Course',
                userName: userProfile?.displayName || 'Student',
                issuedAt: new Date().toISOString(),
                certificateUrl: course?.certificateUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${courseId}-${user.uid}&backgroundColor=9333ea&fontFamily=Arial&fontWeight=700` // Mock certificate URL
              });
              console.log(`Certificate generated for course ${courseId}`);
            } catch (error) {
              console.error('Failed to generate certificate:', error);
            }
          }
        }
      }
    };

    checkAndGenerateCertificates();
  }, [user, enrollments, progress, certificates]);

  // Check downloadables access
  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setHasDownloadAccess(false);
        return;
      }

      // 1. Admin always has full access
      if (userProfile?.role === 'admin') {
        setHasDownloadAccess(true);
        return;
      }

      // 2. Active plan/subscription layouts do not grant access anymore as per client requests.
      // Access is granted strictly by enrolling/purchasing courses.

      // 3. User bought a course check (enrollments collection)
      try {
        const qEnrollments = query(collection(db, 'enrollments'), where('uid', '==', user.uid));
        const enrollSnap = await getDocs(qEnrollments);
        if (!enrollSnap.empty) {
          // Verify that they have an enrollment record representing a course, not a plan bundle
          const hasCourseEnrollment = enrollSnap.docs.some(doc => {
            const data = doc.data();
            return data.format !== 'plan' && data.courseId && !data.courseId.startsWith('plan_');
          });
          setHasDownloadAccess(hasCourseEnrollment);
        } else {
          setHasDownloadAccess(false);
        }
      } catch (err) {
        console.error('Error verifying enrollments:', err);
        setHasDownloadAccess(false);
      }
    };

    checkUserAccess();
  }, [user, userProfile]);

  // Load resources list
  useEffect(() => {
    const unsubDownloadables = onSnapshot(collection(db, 'useful_resources'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => (Number(a.order) || 0) - (Number(b.order) || 0));
      setDownloadables(list);
    }, (error) => console.error("Error listening to useful_resources:", error));
    return () => unsubDownloadables();
  }, []);

  // Listen to user downloaded/saved files
  useEffect(() => {
    if (!user) return;
    const qDownloads = query(collection(db, 'user_downloads'), where('uid', '==', user.uid));
    const unsubDownloads = onSnapshot(qDownloads, (snapshot) => {
      setUserDownloads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error listening to user downloads:", error));
    
    return () => unsubDownloads();
  }, [user]);

  const handleDownload = async (item: any) => {
    if (!hasDownloadAccess) {
      alert('This downloadable asset is locked! Kindly upgrade your plan to unlock downloads.');
      return;
    }

    const CDN_BASE = "https://Websitestorage.b-cdn.net";
    const filePath = item.downloadUrl || "";
    const fullUrl = filePath.startsWith('http://') || filePath.startsWith('https://') 
      ? filePath 
      : `${CDN_BASE}/${filePath}`;

    // Add record of this download in user library if downloaded here & not present
    try {
      if (user) {
        const qExist = query(
          collection(db, 'user_downloads'),
          where('uid', '==', user.uid),
          where('downloadableId', '==', item.downloadableId || item.id)
        );
        const existSnap = await getDocs(qExist);
        if (existSnap.empty) {
          await addDoc(collection(db, 'user_downloads'), {
            uid: user.uid,
            downloadableId: item.downloadableId || item.id,
            name: item.name,
            category: item.category,
            imageUrl: item.imageUrl || '',
            downloadUrl: fullUrl,
            description: item.description || '',
            savedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.error('Failed to register saved asset:', err);
    }

    const link = document.createElement('a');
    link.href = fullUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const handleBunnyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setBunnyUploading(true);
    setBunnyUploadProgress(10);
    setBunnySuccessText(null);
    try {
      setBunnyUploadProgress(20);
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: file.name })
      });

      if (!signRes.ok) {
        throw new Error('Failed to obtain upload authorization details from server.');
      }
      const signData = await signRes.json();
      setBunnyUploadProgress(45);

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(errText || 'Failed to transfer file to Bunny proxy.');
      }

      const uploadResult = await uploadRes.json();
      setBunnyUploadProgress(80);

      let category = 'Documents';
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (['mp4', 'mov', 'avi', 'mkv', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
        category = 'Videos/Images';
      } else if (['mp3', 'wav', 'ogg', 'aac'].includes(extension || '')) {
        category = 'Music/SFX';
      } else if (['exe', 'dmg', 'pkg', 'zip', 'rar'].includes(extension || '')) {
        category = 'Softwares';
      }

      if (user) {
        await addDoc(collection(db, 'user_downloads'), {
          uid: user.uid,
          downloadableId: `bunny-${Date.now()}`,
          name: file.name,
          category: category,
          imageUrl: category === 'Images' ? uploadResult.publicUrl : '',
          downloadUrl: uploadResult.publicUrl,
          description: `Secure file uploaded via BunnyCDN on ${new Date().toLocaleDateString()}`,
          savedAt: new Date().toISOString()
        });
      }

      setBunnyUploadProgress(100);
      setBunnySuccessText(`"${file.name}" uploaded successfully! Added to your library.`);
      setTimeout(() => {
        setBunnyUploadProgress(0);
        setBunnyUploading(false);
      }, 1000);
      setTimeout(() => {
        setBunnySuccessText(null);
      }, 4000);

    } catch (err: any) {
      console.error('Bunny upload failed:', err);
      alert(`Upload failed: ${err.message || err}`);
      setBunnyUploading(false);
      setBunnyUploadProgress(0);
      setBunnySuccessText(null);
    }
  };

  const handleVideoDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile || !uploadTitle.trim()) return;

    setVideoUploading(true);
    setVideoUploadProgress(10);
    setVideoSuccessText(null);
    try {
      setVideoUploadProgress(20);
      const signRes = await fetch('/api/bunny-upload-signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: videoFile.name })
      });

      if (!signRes.ok) {
        throw new Error('Failed to obtain upload authorization details from server.');
      }
      const signData = await signRes.json();
      setVideoUploadProgress(45);

      const uploadRes = await fetch(signData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': videoFile.type || 'application/octet-stream'
        },
        body: videoFile
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(errText || 'Failed to transfer video to Bunny.');
      }

      const uploadResult = await uploadRes.json();
      setVideoUploadProgress(80);

      await addDoc(collection(db, 'videos'), {
        uid: user.uid,
        title: uploadTitle.trim(),
        url: uploadResult.publicUrl,
        createdAt: new Date().toISOString()
      });

      setVideoUploadProgress(100);
      setVideoSuccessText(`"${uploadTitle}" uploaded successfully!`);
      
      // Clear inputs
      setVideoFile(null);
      setUploadTitle('');
      
      setTimeout(() => {
        setVideoUploadProgress(0);
        setVideoUploading(false);
      }, 1000);
      setTimeout(() => {
        setVideoSuccessText(null);
      }, 4000);

    } catch (err: any) {
      console.error('Video direct upload failed:', err);
      alert(`Video upload failed: ${err.message || err}`);
      setVideoUploading(false);
      setVideoUploadProgress(0);
      setVideoSuccessText(null);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${videoId}`);
    }
  };

  const getCourseProgress = (courseId: string) => {
    const courseProgress = progress.filter(p => p.courseId === courseId && p.completed);
    
    const chaptersCount = chaptersCountMap[courseId] || (courseId === '1' ? 12 : courseId === '2' ? 18 : courseId === '3' ? 24 : 10);
    const totalLessons = chaptersCount * 3;
    
    if (totalLessons === 0) return 0;
    return Math.min(100, Math.round((courseProgress.length / totalLessons) * 100));
  };

  const getContinueUrl = (courseId: string) => {
    const courseProgress = progress.filter(p => p.courseId === courseId && p.completed);
    const completedSet = new Set(courseProgress.map(p => `${p.chapter}-${p.type}`));
    
    const chaptersCount = chaptersCountMap[courseId] || (courseId === '1' ? 12 : courseId === '2' ? 18 : courseId === '3' ? 24 : 10);
    
    for (let c = 1; c <= chaptersCount; c++) {
      for (const type of ['session', 'exercise', 'homework']) {
        if (!completedSet.has(`${c}-${type}`)) {
          return `/courses/${courseId}/video/${c}/${type}`;
        }
      }
    }
    
    // Default to chapter 1 session if everything completed
    return `/courses/${courseId}/video/1/session`;
  };

  const validEnrollments = enrollments.filter(e => e.format !== 'plan' && (e.receiptUrl || e.paid || e.status === 'approved' || e.status === 'pending_verification'));

  const latestActivity = [...progress]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('dashboard.welcome')}, {userProfile?.displayName || 'Student'}!</h1>
            <p className="text-gray-400">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-zinc-900/50 border border-purple-900/30 p-4 rounded-2xl flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{validEnrollments.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.enrolled')}</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-purple-900/30 p-4 rounded-2xl flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">{certificates.length}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{t('dashboard.certificates')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Courses & Videos */}
          <div className="lg:col-span-2 space-y-8">
            {/* Enrolled Courses */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-purple-500" />
                {t('dashboard.yourCourses')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {validEnrollments.length > 0 ? validEnrollments.map((enrollment) => {
                  const course = firestoreCourses.find(c => c.id === enrollment.courseId);
                  if (!course) return null;
                  const prog = getCourseProgress(course.id);
                  const courseLessons = progress.filter(p => p.courseId === course.id && p.completed);
                  
                  const totalChapters = course.chapters?.length || course.lessons?.length || 12;
                  
                  const isLocked = !enrollment.paid || enrollment.status === 'pending_verification';
                  
                  return (
                    <motion.div 
                      key={enrollment.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={isLocked ? {} : { y: -5, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className={`border rounded-3xl overflow-hidden group flex flex-col transition-all duration-300 ${isLocked ? 'bg-zinc-950/60 border-purple-900/10 grayscale-[35%]' : 'bg-zinc-950 border-purple-900/20'}`}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-transform duration-500" referrerPolicy="no-referrer" />
                        
                        {isLocked ? (
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center select-none">
                            <div className="w-10 h-10 rounded-full bg-purple-950/60 border border-purple-500/35 flex items-center justify-center mb-3">
                              <Lock className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="px-3 py-1 bg-purple-900/30 border border-purple-500/20 rounded-full text-[10px] font-black uppercase tracking-wider text-purple-300 animate-pulse">
                              payment confirmation in process
                            </div>
                            <p className="text-[9px] text-gray-500 mt-2 font-mono">Usually takes 4-6 hours</p>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={getContinueUrl(course.id)} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                              <PlayCircle className="w-5 h-5" />
                              {t('dashboard.continue')}
                            </Link>
                          </div>
                        )}

                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {course.level}
                        </div>
                        {prog === 100 && !isLocked && (
                          <div className="absolute top-4 left-4 px-3 py-1 bg-yellow-500 text-black rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Completed
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-grow flex flex-col justify-between">
                        <div>
                          <h3 className={`font-bold text-lg mb-4 transition-colors ${isLocked ? 'text-gray-400' : 'group-hover:text-purple-400'}`}>{course.title}</h3>
                        </div>
                        
                        <div className="space-y-4 mt-auto">
                          {/* Circular Progress & Info Section */}
                          {(() => {
                            const chaptersCount = chaptersCountMap[course.id] || (course.id === '1' ? 12 : course.id === '2' ? 18 : course.id === '3' ? 24 : 10);
                            const totalLessons = chaptersCount * 3;
                            const completedLessonsCount = isLocked ? 0 : courseLessons.length;
                            
                            const getLessonsLabel = () => {
                              if (language === 'ar') return 'درس';
                              if (language === 'fr') return 'leçons';
                              return 'lessons';
                            };
                            const getCompletedLabel = () => {
                              if (language === 'ar') return 'مكتمل';
                              if (language === 'fr') return 'complétées';
                              return 'completed';
                            };
                            const getRemainingLabel = () => {
                              if (language === 'ar') return 'متبقي';
                              if (language === 'fr') return 'restants';
                              return 'remaining';
                            };
                            
                            return (
                              <div className="flex items-center gap-4 bg-zinc-900/40 border border-purple-900/10 p-4 rounded-2xl">
                                {/* Circular Progress Indicator */}
                                <div className="relative flex-shrink-0 w-16 h-16">
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 72 72">
                                    {/* Track Circle */}
                                    <circle 
                                      cx="36" 
                                      cy="36" 
                                      r="30" 
                                      className="text-zinc-800" 
                                      strokeWidth="4.5" 
                                      fill="transparent" 
                                      stroke="currentColor"
                                    />
                                    {/* Glow Underlay */}
                                    <motion.circle 
                                      cx="36" 
                                      cy="36" 
                                      r="30" 
                                      className="text-purple-500/15" 
                                      strokeWidth="6" 
                                      fill="transparent" 
                                      stroke="currentColor"
                                      strokeDasharray="188.5"
                                      initial={{ strokeDashoffset: 188.5 }}
                                      animate={{ strokeDashoffset: 188.5 - (188.5 * (isLocked ? 0 : prog)) / 100 }}
                                      transition={{ duration: 1.2, ease: "easeOut" }}
                                      strokeLinecap="round"
                                    />
                                    {/* Active Progress Circle */}
                                    <motion.circle 
                                      cx="36" 
                                      cy="36" 
                                      r="30" 
                                      className="text-purple-500" 
                                      strokeWidth="4.5" 
                                      fill="transparent" 
                                      stroke="currentColor"
                                      strokeDasharray="188.5"
                                      initial={{ strokeDashoffset: 188.5 }}
                                      animate={{ strokeDashoffset: 188.5 - (188.5 * (isLocked ? 0 : prog)) / 100 }}
                                      transition={{ duration: 1.2, ease: "easeOut" }}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  {/* Central text or lock icon */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    {isLocked ? (
                                      <Lock className="w-4 h-4 text-gray-500" />
                                    ) : (
                                      <span className="text-xs font-black text-purple-300">{prog}%</span>
                                    )}
                                  </div>
                                </div>

                                {/* Progress Text / Stats */}
                                <div className="flex-grow min-w-0">
                                  <div className="text-xs font-semibold text-gray-400 mb-0.5">{t('dashboard.progress')}</div>
                                  <div className="text-base font-black text-white leading-none mb-1">
                                    {isLocked ? 0 : completedLessonsCount} <span className="text-xs font-normal text-gray-500">/ {totalLessons} {getLessonsLabel()}</span>
                                  </div>
                                  <div className="text-[10px] text-gray-500 font-medium">
                                    {prog === 100 && !isLocked ? (
                                      <span className="text-yellow-500 font-bold flex items-center gap-1">🏆 {getCompletedLabel()}!</span>
                                    ) : (
                                      <span>{totalLessons - completedLessonsCount} {getRemainingLabel()}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Lesson Indicators */}
                          <div className="pt-4 border-t border-purple-900/10 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-bold">{t('dashboard.completedLessons')}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {Array.from({ length: totalChapters }).map((_, i) => {
                                  const chapter = i + 1;
                                  const isChapterDone = courseLessons.some(p => p.chapter === chapter);
                                  return (
                                    <motion.div
                                      key={chapter}
                                      initial={false}
                                      animate={{ 
                                        backgroundColor: isChapterDone ? '#9333ea' : '#18181b',
                                        scale: isChapterDone ? 1.1 : 1
                                      }}
                                      className={`w-2 h-2 rounded-full border ${isChapterDone ? 'border-purple-400' : 'border-purple-900/20'}`}
                                      title={`Chapter ${chapter}`}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {!isLocked && (
                              <div className="flex gap-2 self-end">
                                {prog === 100 && (
                                  <button
                                    onClick={() => {
                                      const cert = certificates.find(c => c.courseId === course.id) || {
                                        courseTitle: course.title,
                                        userName: userProfile?.displayName || user?.displayName || user?.email || 'Cutscene Student',
                                        issuedAt: new Date().toISOString(),
                                        id: `CS-CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
                                      };
                                      handleOpenCertificate(cert);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 border border-yellow-500/30 hover:border-yellow-400 rounded-xl text-xs font-bold uppercase tracking-wider text-yellow-400 hover:text-black transition-all duration-300 select-none cursor-pointer"
                                  >
                                    <Trophy className="w-3.5 h-3.5 animate-pulse" />
                                    <span>Certificate</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleShareProgress(course.title, prog)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/20 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-550 rounded-xl text-xs font-bold uppercase tracking-wider text-purple-300 hover:text-white transition-all duration-300 select-none cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>Share</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-2 bg-zinc-950 border border-dashed border-purple-900/30 p-12 rounded-3xl text-center">
                    <p className="text-gray-500 mb-4">{t('dashboard.noEnrollments')}</p>
                    <Link to="/courses" className="text-purple-400 font-bold hover:underline">{t('dashboard.browse')}</Link>
                  </div>
                )}
              </div>
            </section>

            {/* My Library & Presets */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FolderOpen className="w-6 h-6 text-purple-500" />
                  My Library
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <input 
                    type="file" 
                    ref={bunnyFileInputRef} 
                    className="hidden" 
                    onChange={handleBunnyFileUpload} 
                  />
                  
                  <SparkleButton
                    type="button"
                    disabled={bunnyUploading}
                    onClick={() => {
                      setBunnySuccessText(null);
                      bunnyFileInputRef.current?.click();
                    }}
                    className="overflow-hidden px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl"
                  >
                    {bunnyUploading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1" />
                        <span>Uploading {bunnyUploadProgress}%</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5 inline-block mr-1" />
                        <span>Upload File</span>
                      </span>
                    )}
                  </SparkleButton>

                  <button
                    type="button"
                    onClick={() => setIsLibraryExpanded(true)}
                    className="text-purple-400 font-bold hover:underline text-sm flex items-center gap-1.5 bg-transparent border-none cursor-pointer"
                  >
                    See all
                    <ExternalLink className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>

              {userDownloads.length > 0 || bunnyUploading || bunnySuccessText ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Realtime Uploading Placeholder */}
                  {bunnyUploading && (
                    <div className="bg-purple-900/10 border border-purple-500/25 p-5 rounded-2xl flex flex-col justify-between animate-pulse">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-450 bg-purple-500/20 px-2 py-0.5 rounded-md">
                            Uploading
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-purple-300">File is transferring to cloud workspace...</h3>
                        <div className="w-full bg-zinc-90 w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div 
                            className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${bunnyUploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 mt-2 block font-mono">{bunnyUploadProgress}% completed</span>
                      </div>
                    </div>
                  )}

                  {/* Realtime Upload Success Badge */}
                  {bunnySuccessText && (
                    <div className="bg-green-950/40 border border-green-500/20 p-5 rounded-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-500/20 px-2 py-0.5 rounded-md">
                            Success
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-green-450">Save Complete!</h3>
                        <p className="text-xs text-gray-300 mt-1">{bunnySuccessText}</p>
                      </div>
                    </div>
                  )}

                  {userDownloads.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-black border border-purple-900/10 p-5 rounded-2xl flex flex-col justify-between hover:border-purple-500/25 transition-all group"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-purple-900/10 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                          Saved File
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, 'user_downloads', item.id));
                              } catch (err) {
                                console.error('Failed to remove saved asset:', err);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Remove from Library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(item)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-black/40 border border-dashed border-purple-900/25 p-12 rounded-2xl text-center">
                  <FolderOpen className="w-10 h-10 text-gray-650 mx-auto mb-3" />
                  <p className="text-gray-450 font-bold mb-2 text-sm text-gray-200">Your library is currently empty</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4 leading-relaxed">Choose and explore useful resources and creative tools.</p>
                  <Link to="/resources" className="text-purple-400 font-extrabold hover:underline text-xs tracking-wider uppercase">
                    Browse Resources Hub
                  </Link>
                </div>
              )}
            </section>

            {/* Video Upload Section */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Upload className="w-6 h-6 text-purple-500" />
                {t('dashboard.uploadTitle')}
              </h2>
              <div className="space-y-6">
                <form onSubmit={handleVideoDirectUpload} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      required
                      placeholder={t('dashboard.uploadPlaceholder') || "Video Title"}
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="bg-black border border-purple-900/30 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-white"
                    />

                    <div className="relative">
                      <input 
                        type="file" 
                        accept="video/*"
                        ref={videoFileInputRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setVideoFile(file);
                            // Auto-set title if it's empty
                            if (!uploadTitle.trim()) {
                              setUploadTitle(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
                            }
                          }
                        }}
                        className="hidden" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setVideoSuccessText(null);
                          videoFileInputRef.current?.click();
                        }}
                        className="w-full bg-black border border-purple-900/30 rounded-2xl px-6 py-4 text-left text-sm text-gray-400 hover:border-purple-500/50 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate max-w-[85%]">
                          {videoFile ? videoFile.name : "Select Project Video File"}
                        </span>
                        <PlayCircle className="w-5 h-5 text-purple-500 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <SparkleButton 
                    type="submit"
                    disabled={videoUploading || !uploadTitle.trim() || !videoFile}
                    className="w-full font-bold rounded-2xl flex items-center justify-center gap-3 py-4"
                  >
                    {videoUploading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0 inline-block mr-2" />
                        <span>Uploading {videoUploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 inline-block" />
                        <span>Upload Project Video</span>
                      </>
                    )}
                  </SparkleButton>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videoUploading && (
                    <div className="bg-purple-900/10 border border-purple-500/25 p-4 rounded-2xl flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-4 overflow-hidden w-full">
                        <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="font-bold text-sm text-purple-300 truncate">Uploading video: {uploadTitle || "New Video"}</div>
                          <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div 
                              className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${videoUploadProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 block font-mono">{videoUploadProgress}% completed</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {videoSuccessText && (
                    <div className="bg-green-950/45 border border-green-500/25 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-green-600/25 rounded-lg flex items-center justify-center shrink-0 text-green-400 text-lg font-bold">
                          ✓
                        </div>
                        <div className="truncate text-left">
                          <div className="font-bold text-sm text-green-400">Success</div>
                          <div className="text-xs text-gray-300 truncate max-w-[200px]" title={videoSuccessText}>{videoSuccessText}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {userVideos.map((video) => (
                    <div key={video.id} className="bg-black border border-purple-900/20 p-4 rounded-2xl flex items-center justify-between group">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                          <PlayCircle className="w-6 h-6 text-purple-500" />
                        </div>
                        <div className="truncate text-left">
                          <div className="font-bold truncate text-gray-100">{video.title}</div>
                          <div className="text-xs text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-purple-400 hover:text-purple-300 transition-colors"
                          title="View Uploaded Video"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button 
                          onClick={() => deleteVideo(video.id)}
                          className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar: Certificates & Reviews */}
          <div className="space-y-8">
            {/* Certificates */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                {t('dashboard.certTitle')}
              </h2>
              <div className="space-y-4">
                {certificates.length > 0 ? certificates.map((cert) => (
                  <div key={cert.id} className="bg-black border border-purple-900/20 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{cert.courseTitle}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('dashboard.certEarned')}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenCertificate(cert)}
                        className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-purple-900/30 transition-all cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-yellow-500" />
                        {t('dashboard.viewCert')}
                      </button>
                      <button 
                        onClick={() => handleOpenCertificate(cert, true)}
                        className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all cursor-pointer"
                        title="Download Certificate"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm text-center py-4">{t('dashboard.noCert')}</p>
                )}
              </div>
            </section>



            {/* Latest Activity */}
            <section className="bg-zinc-950 border border-purple-900/20 rounded-[2.5rem] p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Clock className="w-6 h-6 text-purple-500" />
                {t('dashboard.latestActivity')}
              </h2>
              <div className="space-y-4">
                {latestActivity.length > 0 ? latestActivity.map((activity, i) => {
                  const course = firestoreCourses.find(c => c.id === activity.courseId);
                  return (
                    <motion.div 
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-black/40 border border-purple-900/10 rounded-xl"
                    >
                      <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-300">
                          Chapter {activity.chapter}: {activity.type}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                          {course?.title}
                        </div>
                        <div className="text-[10px] text-purple-400/60 mt-1">
                          {new Date(activity.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <p className="text-gray-500 text-xs text-center py-4 italic">{t('dashboard.noActivity')}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* FULL-SCREEN EXPANDED MY LIBRARY MODAL */}
      <AnimatePresence>
        {isLibraryExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col overflow-hidden"
          >
            {/* Soft Ambient Background Glows */}
            <div className="absolute top-[10%] left-[20%] w-[50%] h-[40%] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] bg-purple-650/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Content */}
            <div className="relative z-10 border-b border-purple-900/10 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full shrink-0">
              <div>
                <div className="flex items-center gap-2 text-purple-400 font-extrabold text-[10px] uppercase tracking-widest mb-1">
                  <FolderOpen className="w-3.5 h-3.5 animate-pulse" />
                  Your Customized Repository
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  MY SAVED LIBRARY
                </h1>
                <p className="text-xs text-gray-450 mt-1">
                  Access and instantly re-download any of the {userDownloads.length} assets you previously saved from the hub
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Link
                  to="/resources"
                  onClick={() => setIsLibraryExpanded(false)}
                  className="px-5 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-405 font-bold rounded-2xl border border-purple-500/15 text-xs uppercase tracking-wider transition-all"
                >
                  Explore Catalog
                </Link>
                <button
                  type="button"
                  onClick={() => setIsLibraryExpanded(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-white/5 transition-all text-xs font-bold font-mono cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Search and Categories bar inside fullscreen library */}
            <div className="relative z-10 p-4 md:px-8 border-b border-purple-900/5 max-w-7xl mx-auto w-full shrink-0 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <input
                  type="text"
                  placeholder="Filter through your saved files..."
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  className="w-full bg-zinc-950/85 border border-purple-900/20 rounded-2xl pl-4 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/30 transition-all"
                />
              </div>

              {/* Tag Carousel */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none justify-start pb-1">
                {['All', 'Softwares', 'Videos/Images', 'Music/SFX'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setLibraryFilter(cat)}
                    className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all border ${
                      libraryFilter === cat
                        ? 'bg-purple-600 text-white border-purple-505 shadow-md'
                        : 'bg-zinc-950/40 text-gray-400 hover:text-white border-white/5 hover:bg-zinc-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Container */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
              {(() => {
                const filteredLibraryItems = userDownloads.filter(item => {
                  const matchesSearch = item.name.toLowerCase().includes(libraryQuery.toLowerCase()) || 
                                        (item.description && item.description.toLowerCase().includes(libraryQuery.toLowerCase()));
                  const getNormalizedCategory = (cat: string) => {
                    if (cat === 'Videos' || cat === 'Images' || cat === 'Videos/Images') return 'Videos/Images';
                    if (cat === 'Music' || cat === 'Sound Effects' || cat === 'Music/SFX') return 'Music/SFX';
                    return cat;
                  };
                  const matchesCategory = libraryFilter === 'All' || getNormalizedCategory(item.category) === libraryFilter;
                  return matchesSearch && matchesCategory;
                });

                if (filteredLibraryItems.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto h-full">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-gray-505 mb-6">
                        <FolderOpen className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-lg text-gray-200">No matching library assets found</h3>
                      <p className="text-xs text-gray-450 mt-2 leading-relaxed">
                        {userDownloads.length === 0 
                          ? "You haven't saved or downloaded any premium source files or software presets yet."
                          : "Try checking spelling or choosing another Category selection filter above."}
                      </p>
                      <SparkleButton
                        to="/resources"
                        onClick={() => setIsLibraryExpanded(false)}
                        className="mt-6 px-6 py-3 font-bold rounded-2xl text-xs uppercase tracking-wider inline-block"
                      >
                        Browse Useful Resources
                      </SparkleButton>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLibraryItems.map((item) => (
                      <div 
                        key={item.id}
                        className="bg-zinc-950 border border-purple-900/10 rounded-3xl overflow-hidden group hover:border-purple-500/20 transition-all flex flex-col h-full relative"
                      >
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/80 border border-white/5 text-[10px] text-gray-300 font-extrabold uppercase shadow-md animate-fade-in">
                          {item.category}
                        </div>

                        {/* Cover Thumbnail */}
                        <div className="h-36 overflow-hidden relative bg-zinc-900 shrink-0">
                          <img 
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80'} 
                            alt={item.name || 'Creative File'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent pointer-events-none" />
                        </div>

                        <div className="p-5 text-left flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm text-gray-100 group-hover:text-purple-400 transition-colors line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed mt-1.5 line-clamp-2">
                              {item.description || 'Premium asset download saved inside your active CUTSCENE workspace.'}
                            </p>
                          </div>

                          <div className="pt-4 mt-4 border-t border-purple-900/10 flex items-center justify-between gap-3">
                            <button
                              onClick={async () => {
                                try {
                                  await deleteDoc(doc(db, 'user_downloads', item.id));
                                } catch (err) {
                                  console.error('Failed to remove saved asset:', err);
                                }
                              }}
                              className="text-[10px] text-gray-400 hover:text-red-400 transition-colors py-1 px-2 hover:bg-red-500/10 rounded-lg flex items-center gap-1.5 shrink-0"
                              title="Remove file from my library representation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>

                            <button
                              onClick={() => handleDownload(item)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download File
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHARE PROGRESS MODAL */}
      <AnimatePresence>
        {isSharing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-purple-900/30 rounded-[2rem] p-8 max-w-xl w-full shadow-2xl relative flex flex-col items-center text-center overflow-hidden"
            >
              {/* Soft Ambient Glows inside Modal */}
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button 
                onClick={() => setIsSharing(false)}
                className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-purple-400 font-extrabold text-[10px] uppercase tracking-widest mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Showcase Your Achievement</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Share Your Progress</h2>
              <p className="text-xs text-gray-400 mb-6 max-w-sm">Celebrate your learning milestones with friends & colleagues on social media.</p>

              {isGenerating ? (
                <div className="flex flex-col items-center py-12 w-full">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-purple-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-gray-200">Generating sharing card...</h3>
                  <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                    {shareMode === 'ai' 
                      ? "Painting a custom AI social card celebrating your progress percentage"
                      : "Designing your official Cutscene Academy achievement record"}
                  </p>
                </div>
              ) : shareError ? (
                <div className="py-8 w-full">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-200">Generation Failed</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-6 max-w-xs leading-relaxed">{shareError}</p>
                  <button 
                    onClick={() => handleShareProgress(shareCourseName, shareProgressPercent, shareMode === 'certificate')}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Retry Generation
                  </button>
                </div>
              ) : shareImage ? (
                <div className="w-full space-y-6">
                  {/* Aspect-Ratio 16:9 Image Preview Container */}
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-purple-500/20 shadow-lg bg-zinc-900">
                    <img 
                      src={shareImage} 
                      alt="Share Progress Preview" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center justify-center p-1 bg-zinc-900/60 border border-white/5 rounded-2xl w-fit mx-auto">
                    <button
                      onClick={() => handleShareProgress(shareCourseName, shareProgressPercent, false)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        shareMode === 'ai' 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      AI Art Card
                    </button>
                    <button
                      onClick={() => handleShareProgress(shareCourseName, shareProgressPercent, true)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        shareMode === 'certificate' 
                          ? 'bg-purple-600 text-white shadow-md' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Official Record
                    </button>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsSharing(false)}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <a
                      href={shareImage}
                      download={`Cutscene_Academy_${shareCourseName.replace(/\s+/g, '_')}_Progress.png`}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download Card
                    </a>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Certificate View Modal */}
      <AnimatePresence>
        {isViewingCert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-yellow-500/20 rounded-[2rem] p-5 sm:p-8 max-w-2xl w-full shadow-2xl shadow-yellow-500/5 relative flex flex-col items-center text-center overflow-hidden my-4"
            >
              {/* Soft Ambient Gold/Purple Glows inside Modal */}
              <div className="absolute -top-12 -left-12 w-36 h-36 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button 
                onClick={() => setIsViewingCert(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/5 cursor-pointer z-10 border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-yellow-500 font-extrabold text-[10px] uppercase tracking-widest mb-2">
                <Trophy className="w-3.5 h-3.5 animate-bounce" />
                <span>OFFICIAL GRADUATE DECREE</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1.5 uppercase tracking-tight">Your Course Certificate</h2>
              <p className="text-xs text-gray-400 mb-6 max-w-md leading-relaxed">
                Congratulations on completing the rigorous requirements for <span className="text-yellow-400 font-bold">"{certModalTitle}"</span>! Here is your verified digital diploma from Cutscene Academy.
              </p>

              {isGeneratingCert ? (
                <div className="flex flex-col items-center py-16 w-full">
                  <div className="relative mb-5">
                    <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
                    <Award className="w-6 h-6 text-yellow-500 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-gray-200">Generating digital parchment...</h3>
                  <p className="text-[11px] text-gray-500 mt-1.5 max-w-xs leading-relaxed">
                    Structuring vector seals, signature credentials, and cryptographic certificates.
                  </p>
                </div>
              ) : certModalImage ? (
                <div className="w-full space-y-6">
                  {/* High Quality Certificate Canvas Preview Container */}
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-yellow-500/30 shadow-2xl bg-[#09090b] group">
                    <img 
                      src={certModalImage} 
                      alt="Verified Completion Certificate" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    {/* Corner accents inside the preview frame to make it feel super precious */}
                    <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t border-l border-yellow-500/40 pointer-events-none" />
                    <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t border-r border-yellow-500/40 pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 border-b border-l border-yellow-500/40 pointer-events-none" />
                    <div className="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 border-b border-r border-yellow-500/40 pointer-events-none" />
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={() => setIsViewingCert(false)}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Close Window
                    </button>
                    <a
                      href={certModalImage}
                      download={`Cutscene_Academy_Certificate_${certModalTitle.replace(/\s+/g, '_')}.png`}
                      className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-yellow-500/10"
                    >
                      <Download className="w-3.5 h-3.5 text-black stroke-[3px]" />
                      Download Diploma (PNG)
                    </a>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
