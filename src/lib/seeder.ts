import { db } from '../firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { COURSES } from '../types';

let seedingInProgress = false;

export async function seedDatabase(currentUser: any) {
  if (!currentUser) return;
  if (seedingInProgress) return;
  seedingInProgress = true;

  try {
    console.log('Starting Firestore database seeding check...');

    // 1. Seed Courses
    for (const course of COURSES) {
      const courseRef = doc(db, 'courses', course.id);
      const courseSnap = await getDoc(courseRef);

      if (!courseSnap.exists()) {
        console.log(`Seeding course document: ${course.title} (ID: ${course.id})`);
        
        // Ensure no undefined values are written to Firestore as Firestore dislikes undefined.
        const courseData = {
          id: course.id,
          title: course.title,
          description: course.description || '',
          detailedDescription: course.detailedDescription || '',
          price: Number(course.price) || 0,
          currency: course.currency || 'DA',
          image: course.image || '',
          duration: course.duration || '',
          level: course.level || 'Beginner',
          requirements: course.requirements || [],
          learningOutcomes: course.learningOutcomes || [],
          instructor: {
            name: course.instructor?.name || 'Amine Rouabhia',
            bio: course.instructor?.bio || '',
            avatar: course.instructor?.avatar || ''
          },
          homeworks: course.homeworks || [],
          isComingSoon: !!course.isComingSoon,
          formatAvailability: course.formatAvailability || ['recorded', 'online']
        };

        await setDoc(courseRef, courseData);
        console.log(`Course ${course.id} seeded successfully.`);
      }
    }

    // 2. Seed a starter Comment if none exists
    const commentRef = doc(db, 'comments', 'starter_comment_1');
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      console.log('Seeding starter comment...');
      const commentData = {
        id: 'starter_comment_1',
        courseId: '1',
        chapter: 1,
        uid: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Member',
        userAvatar: currentUser.photoURL || '',
        content: 'I am looking forward to starting this basic video editing journey! 🚀',
        createdAt: new Date().toISOString()
      };

      await setDoc(commentRef, commentData);
      console.log('Starter comment seeded successfully.');
    }

    console.log('Firestore Database seeding completed successfully or already seeded!');
  } catch (error) {
    console.error('Error during database seeding check:', error);
  } finally {
    seedingInProgress = false;
  }
}
