import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { Suspense } from 'react';

import InvitationView from '../components/InvitationView'; 

const getEnv = (key, fallback) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyDS-YsD7nB323VAT_MhhXhJM4tOft0ROek'),
  authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'compass114-92ff1.firebaseapp.com'),
  projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'compass114-92ff1'),
  storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'compass114-92ff1.firebasestorage.app'),
  messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '861952326694'),
  appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID', '1:861952326694:web:884895828dd96819cffae7'),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const mainAppId = getEnv('NEXT_PUBLIC_APP_ID', 'wedding-app-123');

export async function generateMetadata({ searchParams }) {
  // 🌟 [핵심 수정] Next.js 최신 버전을 위해 await를 추가하여 아이디를 정확히 읽어옵니다.
  const params = await searchParams;
  const id = params?.id; 
  
  if (!id) {
    return { title: '우리 결혼합니다.', description: '모바일초대장' };
  }

  try {
    const docRef = doc(db, 'artifacts', mainAppId, 'public', 'data', 'invitations', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const invitationData = docSnap.data();
      const title = invitationData.shareTitle || '우리 결혼합니다.';
      const description = invitationData.shareDescription || '모바일초대장';
      const coverImg = invitationData.mainCoverType === 'edited' && invitationData.editedMainPhoto 
        ? invitationData.editedMainPhoto 
        : invitationData.mainPhoto;
      const finalImage = invitationData.thumbnailPhoto || coverImg;

      return {
        title: title,
        description: description,
        openGraph: {
          title: title,
          description: description,
          images: [{ url: finalImage }],
        },
      };
    }
  } catch (error) {
    console.error('서버 메타데이터 로드 실패:', error);
  }

  return { title: '우리 결혼합니다.' };
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-[#B99A7A]">
        로딩중입니다...
      </div>
    }>
      <InvitationView />
    </Suspense>
  );
}