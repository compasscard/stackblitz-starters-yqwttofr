import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { Suspense } from 'react';

// 🔹 고객님이 가지고 계신 파일 이름(InvitationView)으로 맞춤 수정!
import InvitationView from '../components/InvitationView'; 

// 🔹 환경 변수 안전 접근 유틸리티
const getEnv = (key, fallback) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

// 🔹 Firebase 서버 사이드 초기화
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

// 🌟 [핵심] 카카오톡 로봇이 긁어갈 썸네일 메타데이터를 서버에서 즉시 완성하는 함수
export async function generateMetadata({ searchParams }) {
  const id = searchParams?.id; 
  
  if (!id) {
    return { title: '우리 결혼합니다.', description: '모바일초대장' };
  }

  try {
    // 서버가 브라우저가 켜지기 전에 데이터베이스에서 초대장 정보를 가져옵니다.
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

// 실제 화면 렌더링 부 (Suspense로 묶어 useSearchParams 에러 방지)
export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-[#B99A7A]">
        로딩중입니다...
      </div>
    }>
      {/* 🔹 진짜 청첩장 화면을 렌더링합니다 */}
      <InvitationView />
    </Suspense>
  );
}