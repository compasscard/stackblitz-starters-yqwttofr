"use client";
import React, { useState, useEffect, Suspense } from 'react';
// Next.js 전용 라우터 대신 브라우저 호환용 훅으로 대체하여 원본 동작을 동일하게 유지합니다.
// import { useSearchParams } from 'next/navigation'; 

import {
  MapPin, Phone, Copy, Heart, ChevronDown, ChevronUp, Image as ImageIcon,
  Edit3, Check, Calendar as CalIcon, Settings, MessageSquare, Trash2, X,
  Link as LinkIcon, Loader2, MessageCircle, Share2, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';

// --- Firebase 설정 ---
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

// 🔹 Next.js 환경의 useSearchParams를 브라우저 환경에서 동작하도록 Mocking
const useSearchParams = () => {
  const [params] = useState(() => 
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  );
  return params;
};

const getEnv = (key, fallback) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const getFirebaseConfig = () => {
  return {
    apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyDS-YsD7nB323VAT_MhhXhJM4tOft0ROek'),
    authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'compass114-92ff1.firebaseapp.com'),
    projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'compass114-92ff1'),
    storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'compass114-92ff1.firebasestorage.app'),
    messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '861952326694'),
    appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID', '1:861952326694:web:884895828dd96819cffae7'),
  };
};
 
const app = getApps().length === 0 ? initializeApp(getFirebaseConfig()) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); 
const appId = getEnv('NEXT_PUBLIC_APP_ID', 'wedding-app-123');

const initialData = {
  groomName: '김철수', brideName: '이영희',
  groomFather: '김아빠', groomMother: '박엄마', groomRelation: '장남',
  brideFather: '이아빠', brideMother: '최엄마', brideRelation: '장녀',
  groomPhone: '010-1234-5678', bridePhone: '010-9876-5432',
  mainNameFontSize: 36, 
  groomFamilyContacts: [
    { relation: '아버지', name: '김아빠', phone: '010-1111-2222' },
    { relation: '어머니', name: '박엄마', phone: '010-3333-4444' },
  ],
  brideFamilyContacts: [
    { relation: '아버지', name: '이아빠', phone: '010-5555-6666' },
    { relation: '어머니', name: '최엄마', phone: '010-7777-8888' },
  ],
  weddingDate: '2026-10-24', weddingTime: '12:30',
  locationName: '더 라움 마제스틱 볼룸', locationAddress: '서울특별시 강남구 역삼동 123-45', locationPhone: '02-1234-5678',
  shareTitle: '', shareDescription: '', thumbnailPhoto: '', 
  mainCoverType: 'basic', editedMainPhoto: '',
  greetingTitle: '초대합니다', greetingTitleFontSize: 30,
  mainTextColor: 'text-white', customMainTextColor: '#B99A7A', mainOverlayOpacity: 0,
  greetingMessage: '두 사람이 사랑으로 만나\n진실과 이해로써 하나를 이루려 합니다.\n이 태어남을 축복하시는 자리를\n빛내주시면 감사하겠습니다.',
  greetingFontSize: 16,
  mainPhoto: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop',
  galleryPhotos: [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2069&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1974&auto=format&fit=crop',
  ],
  subwayInfo: '2호선 역삼역 4번 출구 도보 5분', busInfo: '간선 146, 341, 360 / 지선 4211', parkingInfo: '건물 내 지하주차장 2시간 무료',
  accountTitle: '신랑 & 신부에게 마음 전하기', accountTitleFontSize: 20, accountSubtitle: '축복의 의미로 축의금을 전달해보세요.',
  groomAccounts: [
    { bank: '국민은행', account: '123456-04-123456', name: '김철수' },
    { bank: '신한은행', account: '110-123-456789', name: '김아빠' },
  ],
  brideAccounts: [
    { bank: '우리은행', account: '1002-123-456789', name: '이영희' },
    { bank: '하나은행', account: '123-456789-01205', name: '이아빠' },
  ],
  guestbook: [],
};

// 🔹 캔버스 환경에 맞추어 export default function App() 로 이름만 변경
export default function App() {
  const searchParams = useSearchParams(); // 🔹 URL 파라미터 읽어오기
  const [data, setData] = useState(initialData);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [user, setUser] = useState(null);
  const [isViewer, setIsViewer] = useState(false);
  const [invitationId, setInvitationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 문자 및 SNS 공유 시 썸네일을 크게 보여주기 위한 메타 태그 동적 삽입
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const coverImg = data.mainCoverType === 'edited' && data.editedMainPhoto ? data.editedMainPhoto : data.mainPhoto;
    const finalImage = data.thumbnailPhoto || coverImg;

    const setMetaTag = (attrName, attrValue, content) => {
      let meta = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attrName, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMetaTag('property', 'og:image', finalImage);
    setMetaTag('property', 'og:title', data.shareTitle || '우리 결혼합니다.');
    setMetaTag('property', 'og:description', data.shareDescription || '모바일초대장');
    
    // 문자 앱(안드로이드, iOS)에서 썸네일을 크게(summary_large_image) 보여주는 설정
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:image', finalImage);
    setMetaTag('name', 'twitter:title', data.shareTitle || '우리 결혼합니다.');
    setMetaTag('name', 'twitter:description', data.shareDescription || '모바일초대장');
  }, [data.thumbnailPhoto, data.mainPhoto, data.editedMainPhoto, data.mainCoverType, data.shareTitle, data.shareDescription]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initApp = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error('Auth init failed:', e);
      }
    };
    initApp();

    if (!window.Kakao) {
      const script = document.createElement('script');
      script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
      script.onload = () => {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(getEnv('NEXT_PUBLIC_KAKAO_APP_KEY', 'a1bc967f249056d996c6bf4d8c91be60'));
        }
      };
      document.head.appendChild(script);
    } else if (!window.Kakao.isInitialized()) {
      window.Kakao.init(getEnv('NEXT_PUBLIC_KAKAO_APP_KEY', 'a1bc967f249056d996c6bf4d8c91be60'));
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const id = searchParams ? searchParams.get('id') : null; // 🔹 Next.js 방식으로 id 가져오기

        if (id) {
          try {
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'invitations', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const loadedData = docSnap.data();
              setData({
                ...loadedData,
                groomFamilyContacts: loadedData.groomFamilyContacts || [],
                brideFamilyContacts: loadedData.brideFamilyContacts || [],
              });
              setIsViewer(true);
              setInvitationId(id);
            } else {
              showToast('삭제되거나 존재하지 않는 청첩장입니다.');
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [searchParams]); // 🔹 searchParams 의존성 추가

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}년 ${month}월 ${day}일 ${week}요일`;
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hourStr, minuteStr] = timeStr.split(':');
    let hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return timeStr;
    const ampm = hour >= 12 ? '오후' : '오전';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${ampm} ${hour}:${minuteStr}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#B99A7A]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center font-sans text-gray-800">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative overflow-x-hidden">
        {isEditMode ? (
          <EditForm data={data} setData={setData} setIsEditMode={setIsEditMode} showToast={showToast} user={user} appId={appId} storage={storage} />
        ) : (
          <InvitationPreview data={data} setData={setData} formatDate={formatDate} formatTime={formatTime} showToast={showToast} isViewer={isViewer} invitationId={invitationId} appId={appId} />
        )}

        {!isViewer && (
          <div className="fixed bottom-6 right-6 flex gap-3 z-50 md:absolute">
            {isEditMode ? (
              <>
                <button onClick={() => setIsEditMode(false)} className="w-14 h-14 bg-gray-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-600 transition-colors"><X size={24} /></button>
                <button onClick={() => setIsEditMode(false)} className="w-14 h-14 bg-[#B99A7A] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#a38668] transition-colors"><Check size={24} /></button>
              </>
            ) : (
              <button onClick={() => setIsEditMode(true)} className="w-14 h-14 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors"><Settings size={24} /></button>
            )}
          </div>
        )}

        {toastMsg && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-50 text-sm md:absolute animate-fade-in-up">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 미리보기 모드 컴포넌트
// ==========================================
function InvitationPreview({ data, setData, formatDate, formatTime, showToast, isViewer, invitationId, appId }) {
  const [openGroom, setOpenGroom] = useState(false);
  const [openBride, setOpenBride] = useState(false);
  const [showParentsContact, setShowParentsContact] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const hasGroomFamily = data.groomFamilyContacts && data.groomFamilyContacts.length > 0;
  const hasBrideFamily = data.brideFamilyContacts && data.brideFamilyContacts.length > 0;
  const hasAnyFamily = hasGroomFamily || hasBrideFamily;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => setLightboxIndex(null);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openLightbox = (index) => {
    if (typeof window !== 'undefined') window.history.pushState({ lightbox: true }, '');
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    if (typeof window !== 'undefined' && window.history.state && window.history.state.lightbox) {
      window.history.back();
    } else {
      setLightboxIndex(null);
    }
  };

  const nextPhoto = (e) => {
    if (e) e.stopPropagation();
    setLightboxIndex((prev) => (prev + 1) % data.galleryPhotos.length);
  };

  const prevPhoto = (e) => {
    if (e) e.stopPropagation();
    setLightboxIndex((prev) => (prev - 1 + data.galleryPhotos.length) % data.galleryPhotos.length);
  };

  const minSwipeDistance = 50;
  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) nextPhoto();
    else if (distance < -minSwipeDistance) prevPhoto();
  };

  const executeCopy = (text, successMessage) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(successMessage)).catch(() => legacyCopy(text, successMessage));
    } else {
      legacyCopy(text, successMessage);
    }
  };

  const legacyCopy = (text, successMessage) => {
    if (typeof document === 'undefined') return;
    const textArea = document.createElement('textarea');
    textArea.value = text; textArea.style.position = 'fixed'; textArea.style.left = '-9999px';
    document.body.appendChild(textArea); textArea.focus(); textArea.select(); textArea.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); showToast(successMessage); } catch (err) { showToast('복사에 실패했습니다. 직접 복사해주세요.'); }
    textArea.remove();
  };

  const copyToClipboard = (text) => executeCopy(text, '계좌번호가 복사되었습니다.');
  const copyInvitationLink = () => {
    if (typeof window !== 'undefined') executeCopy(window.location.href, '초대장 링크가 복사되었습니다!');
  };

  const handleNaverMapClick = (e) => {
    e.preventDefault();
    if (!data.locationAddress || typeof window === 'undefined') return;
    const query = encodeURIComponent(data.locationAddress.replace(/\n/g, ' '));
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = `intent://search?query=${query}&appname=compass#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;end`;
    } else if (isIOS) {
      window.location.href = `nmap://search?query=${query}&appname=compass`;
      setTimeout(() => window.location.href = `https://m.map.naver.com/search2/search.naver?query=${query}`, 1500);
    } else {
      window.open(`https://map.naver.com/v5/search/${query}`, '_blank');
    }
  };

  const shareKakao = () => {
    if (typeof window === 'undefined' || !window.Kakao) {
      showToast('카카오 스크립트를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    try {
      if (!window.Kakao.isInitialized()) window.Kakao.init(getEnv('NEXT_PUBLIC_KAKAO_APP_KEY', 'a1bc967f249056d996c6bf4d8c91be60'));

      const coverImg = data.mainCoverType === 'edited' && data.editedMainPhoto ? data.editedMainPhoto : data.mainPhoto;
      const targetImage = data.thumbnailPhoto || coverImg;
      const isBase64 = targetImage && targetImage.startsWith('data:');
      const finalThumbnail = isBase64 ? 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop' : targetImage;
      if (isBase64) showToast('업로드 중인 이미지입니다. 기본 이미지로 공유됩니다.');

      const shareUrl = window.location.href;
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: data.shareTitle || '우리 결혼합니다.',
          description: data.shareDescription || '모바일초대장',
          imageUrl: finalThumbnail,
          imageWidth: 800,
          imageHeight: 1200, // 🔹 카카오톡 공유 썸네일도 800x1200으로 변경
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: '초대장 보기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
    } catch (error) {
      console.error('카카오 공유 에러:', error);
      showToast('미리보기 환경 제한 또는 도메인 미등록으로 인해 공유가 실패했습니다.');
    }
  };

  return (
    <div className="pb-24 bg-white">
      {/* 🔹 라이트박스 전체화면 뷰어 */}
      {lightboxIndex !== null && data.galleryPhotos[lightboxIndex] && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-95 flex items-center justify-center backdrop-blur-sm touch-none" onClick={closeLightbox} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-50"><X size={32} /></button>
          <button onClick={prevPhoto} className="absolute left-2 md:left-6 text-white/80 hover:text-white p-2 z-50"><ChevronLeft size={40} /></button>
          <img src={data.galleryPhotos[lightboxIndex]} alt={`gallery-fullscreen-${lightboxIndex}`} className="max-h-[85vh] max-w-[85vw] object-contain select-none shadow-2xl transition-transform duration-300" onClick={(e) => e.stopPropagation()} />
          <button onClick={nextPhoto} className="absolute right-2 md:right-6 text-white/80 hover:text-white p-2 z-50"><ChevronRight size={40} /></button>
        </div>
      )}

      {/* 🔹 메인 커버 */}
      {data.mainCoverType === 'edited' ? (
        <section className="w-full bg-white">
          <img src={data.editedMainPhoto || 'https://via.placeholder.com/800x1200?text=Upload+Edited+Photo'} alt="Main Wedding Edited" className="w-full h-auto block" onError={(e) => e.target.src = 'https://via.placeholder.com/800x1200?text=Photo+Error'} />
        </section>
      ) : (
        <section className="relative h-[80vh] w-full overflow-hidden">
          <img src={data.mainPhoto} alt="Main Wedding" className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://via.placeholder.com/800x1200?text=Photo+Error'} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: data.mainTextColor === 'text-gray-800' || data.mainTextColor === 'text-black-outline' ? `linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,${(data.mainOverlayOpacity ?? 0) / 100}) 100%)` : `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${(data.mainOverlayOpacity ?? 0) / 100}) 100%)` }}></div>

          <div className={`absolute bottom-12 left-0 w-full text-center px-4 ${data.mainTextColor === 'text-black-outline' ? 'text-black' : data.mainTextColor === 'custom' ? '' : data.mainTextColor || 'text-white'}`} style={{ color: data.mainTextColor === 'custom' ? data.customMainTextColor || '#B99A7A' : undefined, textShadow: data.mainTextColor === 'text-black-outline' || data.mainTextColor === 'custom' ? '-1px -1px 0 rgba(255,255,255,0.8), 0 -1px 0 rgba(255,255,255,0.8), 1px -1px 0 rgba(255,255,255,0.8), 1px 0 0 rgba(255,255,255,0.8), 1px 1px 0 rgba(255,255,255,0.8), 0 1px 0 rgba(255,255,255,0.8), -1px 1px 0 rgba(255,255,255,0.8), -1px 0 0 rgba(255,255,255,0.8), 0px 4px 6px rgba(0,0,0,0.5)' : data.mainTextColor === 'text-gray-800' ? '0px 1px 4px rgba(255, 255, 255, 0.9)' : '0px 1px 4px rgba(0, 0, 0, 0.7)' }}>
            <div className="text-sm tracking-widest mb-4 opacity-90 font-light">{formatDate(data.weddingDate)} {formatTime(data.weddingTime)}</div>
            <h1 className="font-serif mb-6 flex justify-center items-center gap-x-4 gap-y-2 flex-wrap px-2" style={{ fontSize: `${data.mainNameFontSize || 36}px`, wordBreak: 'keep-all' }}>
              <span className="whitespace-nowrap">{data.groomName}</span>
              <span className="opacity-80" style={{ fontSize: '0.6em' }}>&</span>
              <span className="whitespace-nowrap">{data.brideName}</span>
            </h1>
            <div className="text-sm opacity-90 font-light whitespace-pre-line">{data.locationName}</div>
          </div>
        </section>
      )}

      {/* 인사말 */}
      <section className="py-20 px-4 md:px-8 text-center bg-white">
        <h2 className="text-[#B99A7A] mb-8 font-serif tracking-widest" style={{ fontSize: `${data.greetingTitleFontSize || 30}px` }}>{data.greetingTitle}</h2>
        <p className="whitespace-pre-line leading-loose text-gray-600 mb-12 font-serif" style={{ fontSize: `${data.greetingFontSize || 16}px` }}>{data.greetingMessage}</p>
      </section>

      <Divider />

      {/* 연락처 섹션 */}
      <section className="py-16 bg-[#faf9f8] px-6">
        <div className="grid grid-cols-2 text-center text-gray-600">
          <div className="border-r border-gray-200">
            <p className="text-[15px] font-medium mb-3">신랑</p>
            <div className="flex justify-center gap-4 text-gray-400">
              <a href={`tel:${data.groomPhone}`} className="hover:text-gray-700 transition-colors"><Phone size={20} /></a>
              <a href={`sms:${data.groomPhone}`} className="hover:text-gray-700 transition-colors"><Mail size={20} /></a>
            </div>
          </div>
          <div>
            <p className="text-[15px] font-medium mb-3">신부</p>
            <div className="flex justify-center gap-4 text-gray-400">
              <a href={`tel:${data.bridePhone}`} className="hover:text-gray-700 transition-colors"><Phone size={20} /></a>
              <a href={`sms:${data.bridePhone}`} className="hover:text-gray-700 transition-colors"><Mail size={20} /></a>
            </div>
          </div>
        </div>

        {hasAnyFamily && (
          <>
            <div className="flex justify-center items-center gap-8 mt-12 mb-2 cursor-pointer text-gray-500 hover:text-gray-800 transition-colors select-none" onClick={() => setShowParentsContact(!showParentsContact)}>
              {hasGroomFamily && <span className="text-[15px] font-medium">신랑 측 혼주</span>}
              {showParentsContact ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {hasBrideFamily && <span className="text-[15px] font-medium">신부 측 혼주</span>}
            </div>
            {showParentsContact && (
              <div className={`grid ${hasGroomFamily && hasBrideFamily ? 'grid-cols-2' : 'grid-cols-1'} text-center pt-8 animate-fade-in-up`}>
                {hasGroomFamily && (
                  <div className={`${hasBrideFamily ? 'border-r border-gray-200' : ''} space-y-8`}>
                    {data.groomFamilyContacts.map((contact, i) => (
                      <div key={i}>
                        <p className="text-[14px] text-gray-700 mb-2 font-medium"><span className="text-gray-400 mr-2 text-[13px]">{contact.relation}</span>{contact.name}</p>
                        <div className="flex justify-center gap-4 text-gray-400">
                          <a href={`tel:${contact.phone}`} className="hover:text-gray-700 transition-colors"><Phone size={18} /></a>
                          <a href={`sms:${contact.phone}`} className="hover:text-gray-700 transition-colors"><Mail size={18} /></a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasBrideFamily && (
                  <div className="space-y-8">
                    {data.brideFamilyContacts.map((contact, i) => (
                      <div key={i}>
                        <p className="text-[14px] text-gray-700 mb-2 font-medium"><span className="text-gray-400 mr-2 text-[13px]">{contact.relation}</span>{contact.name}</p>
                        <div className="flex justify-center gap-4 text-gray-400">
                          <a href={`tel:${contact.phone}`} className="hover:text-gray-700 transition-colors"><Phone size={18} /></a>
                          <a href={`sms:${contact.phone}`} className="hover:text-gray-700 transition-colors"><Mail size={18} /></a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <Divider />

      <section className="py-16 px-6 bg-white">
        <h2 className="text-center text-xl text-[#B99A7A] font-serif mb-4 tracking-widest">GALLERY</h2>
        <p className="text-center text-xs text-gray-400 mb-8 font-light">사진을 탭하여 확대해 보세요.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {data.galleryPhotos.map((photo, idx) => (
            <div key={idx} className="aspect-[3/4] overflow-hidden rounded-sm bg-gray-200 cursor-pointer" onClick={() => openLightbox(idx)}>
              {photo && <img src={photo} alt={`gallery-${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.src = 'https://via.placeholder.com/400x533?text=Image'; }} />}
            </div>
          ))}
        </div>
      </section>

      <Divider />

      <section className="py-16 px-8 bg-[#faf9f8]">
        <h2 className="text-center text-xl text-[#B99A7A] font-serif mb-2 tracking-widest">DATE</h2>
        <p className="text-center text-gray-500 mb-8">{formatDate(data.weddingDate)} {formatTime(data.weddingTime)}</p>
        <SimpleCalendar dateStr={data.weddingDate} />
      </section>

      <Divider />

      <section className="py-16 px-8 bg-white">
        <h2 className="text-center text-xl text-[#B99A7A] font-serif mb-10 tracking-widest">LOCATION</h2>
        <div className="font-semibold text-lg mb-2 text-center whitespace-pre-line">{data.locationName}</div>
        <div className={`text-gray-500 text-sm text-center whitespace-pre-line ${data.locationPhone ? 'mb-2' : 'mb-6'}`}>{data.locationAddress}</div>
        {data.locationPhone && (
          <div className="text-gray-500 text-sm mb-6 text-center flex items-center justify-center gap-1.5">
            <Phone size={14} className="text-gray-400" />
            <a href={`tel:${data.locationPhone}`} className="hover:text-[#B99A7A] transition-colors">{data.locationPhone}</a>
          </div>
        )}
        <div className="w-full h-64 bg-gray-200 rounded-lg mb-4 relative overflow-hidden shadow-sm border border-gray-200">
          {data.locationAddress ? (
            <iframe title="wedding-location-map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${encodeURIComponent(data.locationAddress.replace(/\n/g, ' '))}&t=&z=16&ie=UTF8&iwloc=&output=embed`}></iframe>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400"><MapPin size={32} className="mb-2 opacity-50" /><span className="text-sm">주소를 입력해주세요</span></div>
          )}
        </div>
        {data.locationAddress && (
          <div className="flex justify-center mb-8">
            <button onClick={handleNaverMapClick} className="bg-[#03C75A] text-white text-[13px] font-medium py-2 px-5 rounded-full flex items-center gap-1.5 hover:bg-[#02b350] transition-colors shadow-sm"><MapPin size={14} />네이버 앱으로 보기</button>
          </div>
        )}
        {(data.subwayInfo || data.busInfo || data.parkingInfo) && (
          <div className="space-y-6 text-sm">
            {data.subwayInfo && <div className="flex items-start gap-4"><div className="w-12 h-6 rounded-full bg-[#B99A7A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">지하철</div><p className="text-gray-600 leading-relaxed pt-0.5 whitespace-pre-line">{data.subwayInfo}</p></div>}
            {data.busInfo && <div className="flex items-start gap-4"><div className="w-12 h-6 rounded-full bg-[#B99A7A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">버스</div><p className="text-gray-600 leading-relaxed pt-0.5 whitespace-pre-line">{data.busInfo}</p></div>}
            {data.parkingInfo && <div className="flex items-start gap-4"><div className="w-12 h-6 rounded-full bg-[#B99A7A] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">주차</div><p className="text-gray-600 leading-relaxed pt-0.5 whitespace-pre-line">{data.parkingInfo}</p></div>}
          </div>
        )}
      </section>

      <Divider />

      <section className="py-16 px-6 bg-[#faf9f8]">
        <h2 className="text-center text-gray-800 font-serif mb-3 tracking-wide" style={{ fontSize: `${data.accountTitleFontSize || 20}px` }}>{data.accountTitle ?? '신랑 & 신부에게 마음 전하기'}</h2>
        <p className="text-center text-gray-500 text-[15px] mb-10 whitespace-pre-line font-light">{data.accountSubtitle ?? '축복의 의미로 축의금을 전달해보세요.'}</p>
        <div className="space-y-4">
          {data.groomAccounts && data.groomAccounts.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setOpenGroom(!openGroom)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-700">신랑측 계좌번호</span>{openGroom ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
              </button>
              {openGroom && (
                <div className="p-4 bg-white divide-y divide-gray-100">
                  {data.groomAccounts.map((acc, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div><div className="text-sm font-medium">{acc.bank} <span className="text-gray-400 font-normal">| {acc.name}</span></div><div className="text-gray-500 mt-1">{acc.account}</div></div>
                      <button onClick={() => copyToClipboard(`${acc.bank} ${acc.account}`)} className="text-xs border border-gray-300 rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Copy size={12} /> 복사</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {data.brideAccounts && data.brideAccounts.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setOpenBride(!openBride)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="font-medium text-gray-700">신부측 계좌번호</span>{openBride ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
              </button>
              {openBride && (
                <div className="p-4 bg-white divide-y divide-gray-100">
                  {data.brideAccounts.map((acc, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div><div className="text-sm font-medium">{acc.bank} <span className="text-gray-400 font-normal">| {acc.name}</span></div><div className="text-gray-500 mt-1">{acc.account}</div></div>
                      <button onClick={() => copyToClipboard(`${acc.bank} ${acc.account}`)} className="text-xs border border-gray-300 rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50 flex items-center gap-1"><Copy size={12} /> 복사</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Divider />

      <GuestbookSection data={data} setData={setData} showToast={showToast} isViewer={isViewer} invitationId={invitationId} appId={appId} />

      <section className="py-12 px-6 bg-white flex flex-col items-center justify-center gap-3 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-2">모바일초대장 공유하기</h3>
        <button onClick={shareKakao} className="w-full max-w-xs flex items-center justify-center gap-2 bg-[#FEE500] text-gray-900 py-3.5 rounded-xl font-semibold shadow-sm hover:bg-[#FDD800] transition-colors"><MessageCircle size={18} /> 카카오톡으로 공유하기</button>
        <button onClick={copyInvitationLink} className="w-full max-w-xs flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold shadow-sm hover:bg-gray-200 transition-colors"><LinkIcon size={18} /> 초대장 링크 복사하기</button>
      </section>

      <footer className="bg-gray-100 py-10 text-center text-xs text-gray-400"><p>Copyright © 2026. 모바일초대장 All rights reserved.</p></footer>
    </div>
  );
}

// ==========================================
// 편집 폼 컴포넌트
// ==========================================
function EditForm({ data, setData, setIsEditMode, showToast, user, appId, storage }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error("Cannot compress image on server"));
      const img = new Image(); const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas'); const MAX_WIDTH = 800;
          let width = img.width; let height = img.height;
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } catch (error) { reject(error); } finally { URL.revokeObjectURL(objectUrl); }
      };
      img.onerror = (error) => { URL.revokeObjectURL(objectUrl); reject(error); };
      img.src = objectUrl;
    });
  };

  const handleImageUpload = async (e, targetField, index = null) => {
    const file = e.target.files[0]; const inputElement = e.target;
    if (!file) return;
    showToast('사진을 최적화하고 서버에 업로드 중입니다...');
    try {
      const compressedBase64 = await compressImage(file);
      let finalImageUrl = compressedBase64;
      try {
        const storageRef = ref(storage, `invitations/${appId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`);
        await uploadString(storageRef, compressedBase64, 'data_url');
        finalImageUrl = await getDownloadURL(storageRef);
      } catch (error) { showToast('서버 권한 문제로 썸네일 생성이 제한될 수 있습니다.'); }

      if (index !== null) {
        const newGallery = [...data.galleryPhotos]; newGallery[index] = finalImageUrl;
        setData((prev) => ({ ...prev, galleryPhotos: newGallery }));
      } else { setData((prev) => ({ ...prev, [targetField]: finalImageUrl })); }
      showToast('사진이 성공적으로 적용되었습니다.');
    } catch (err) { showToast('사진 변환 중 오류가 발생했습니다.'); } finally { inputElement.value = ''; }
  };

  const handleRemoveImage = (targetField, index = null) => {
    if (targetField === 'galleryPhotos' && index !== null) setData((prev) => ({ ...prev, galleryPhotos: prev.galleryPhotos.filter((_, i) => i !== index) }));
    else setData((prev) => ({ ...prev, [targetField]: '' }));
    showToast('사진이 삭제되었습니다.');
  };

  const handleChange = (e) => setData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAccountChange = (side, index, field, value) => { const newAccounts = [...data[side]]; newAccounts[index] = { ...newAccounts[index], [field]: value }; setData((prev) => ({ ...prev, [side]: newAccounts })); };
  const addAccount = (side) => setData((prev) => ({ ...prev, [side]: [...(prev[side] || []), { bank: '', account: '', name: '' }] }));
  const removeAccount = (side, index) => setData((prev) => ({ ...prev, [side]: prev[side].filter((_, i) => i !== index) }));
  const addFamilyContact = (side) => setData((prev) => ({ ...prev, [side]: [...(prev[side] || []), { relation: '', name: '', phone: '' }] }));
  const handleFamilyContactChange = (side, index, field, value) => { const newContacts = [...(data[side] || [])]; newContacts[index] = { ...newContacts[index], [field]: value }; setData((prev) => ({ ...prev, [side]: newContacts })); };
  const removeFamilyContact = (side, index) => setData((prev) => ({ ...prev, [side]: (prev[side] || []).filter((_, i) => i !== index) }));

  const handleGenerateLink = async () => {
    if (!user) return showToast('서버 접속에 실패했습니다.');
    setIsGenerating(true);
    try {
      const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'invitations'), data);
      setGeneratedLink(typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?id=${docRef.id}` : `?id=${docRef.id}`);
    } catch (e) { showToast('링크 생성에 실패했습니다.'); }
    setIsGenerating(false);
  };

  const executeCopy = (text, successMessage) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => showToast(successMessage)).catch(() => legacyCopy(text, successMessage));
    else legacyCopy(text, successMessage);
  };
  const legacyCopy = (text, successMessage) => {
    if (typeof document === 'undefined') return;
    const textArea = document.createElement('textarea'); textArea.value = text; textArea.style.position = 'fixed'; textArea.style.left = '-9999px';
    document.body.appendChild(textArea); textArea.focus(); textArea.select(); textArea.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); showToast(successMessage); } catch (err) { showToast('복사에 실패했습니다. 상단의 링크를 직접 복사해주세요.'); }
    textArea.remove();
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="bg-white p-4 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-gray-200">
        <h1 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={20} /> 설정</h1>
        <div className="flex gap-2">
          <button onClick={() => setIsEditMode(false)} className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 text-gray-600 bg-white">미리보기</button>
          <button onClick={handleGenerateLink} disabled={isGenerating} className="bg-[#B99A7A] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#a38668] flex items-center gap-1 shadow-sm">{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}링크 생성</button>
        </div>
      </div>
      {generatedLink && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
            <div className="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={28} /></div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">모바일초대장이 생성되었습니다!</h3>
            <p className="text-gray-500 text-sm mb-5">아래 주소를 복사하여 공유하세요.</p>
            <input type="text" readOnly value={generatedLink} className="w-full bg-gray-100 p-3 rounded-lg text-sm mb-5 text-center text-gray-700 outline-none border border-gray-200" />
            <div className="flex gap-2">
              <button onClick={() => executeCopy(generatedLink, '링크 복사 성공')} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-medium shadow-sm hover:bg-gray-700">복사하기</button>
              <button onClick={() => setGeneratedLink('')} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-300">닫기</button>
            </div>
          </div>
        </div>
      )}
      <div className="p-6 space-y-8">
        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">기본 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><Input label="신랑 이름" name="groomName" value={data.groomName} onChange={handleChange} /><Input label="신부 이름" name="brideName" value={data.brideName} onChange={handleChange} /></div>
            <div className="grid grid-cols-2 gap-4"><Input label="신랑 연락처" name="groomPhone" value={data.groomPhone} onChange={handleChange} /><Input label="신부 연락처" name="bridePhone" value={data.bridePhone} onChange={handleChange} /></div>
            <div className="mt-4 flex items-center gap-3 bg-gray-50 p-3 rounded-md border border-gray-100"><label className="text-xs font-semibold text-gray-500 w-28">메인 이름 글자 크기</label><input type="range" name="mainNameFontSize" min="20" max="60" value={data.mainNameFontSize || 36} onChange={handleChange} className="flex-1 accent-[#B99A7A]" /><span className="text-xs text-gray-500 w-8 text-right font-medium">{data.mainNameFontSize || 36}px</span></div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-2 pb-2 border-b">혼주/가족 연락처 설정</h2>
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-[#B99A7A]">신랑 측 혼주 목록</h3><button onClick={() => addFamilyContact('groomFamilyContacts')} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">+ 추가</button></div>
            <div className="space-y-3">
              {(data.groomFamilyContacts || []).map((contact, idx) => (
                <div key={`gfc-${idx}`} className="flex gap-2 items-center">
                  <div className="flex-1 flex gap-2">
                    <input type="text" value={contact.relation} placeholder="관계" onChange={(e) => handleFamilyContactChange('groomFamilyContacts', idx, 'relation', e.target.value)} className="w-[30%] p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A]" />
                    <input type="text" value={contact.name} placeholder="이름" onChange={(e) => handleFamilyContactChange('groomFamilyContacts', idx, 'name', e.target.value)} className="w-[30%] p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A]" />
                    <input type="text" value={contact.phone} placeholder="연락처" onChange={(e) => handleFamilyContactChange('groomFamilyContacts', idx, 'phone', e.target.value)} className="w-[40%] p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A]" />
                  </div>
                  <button onClick={() => removeFamilyContact('groomFamilyContacts', idx)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md border border-gray-100"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-[#B99A7A]">신부 측 혼주 목록</h3><button onClick={() => addFamilyContact('brideFamilyContacts')} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">+ 추가</button></div>
            <div className="space-y-3">
              {(data.brideFamilyContacts || []).map((contact, idx) => (
                <div key={`bfc-${idx}`} className="flex gap-2 items-center">
                  <div className="flex-1 flex gap-2">
                    <input type="text" value={contact.relation} placeholder="관계" onChange={(e) => handleFamilyContactChange('brideFamilyContacts', idx, 'relation', e.target.value)} className="w-[30%] p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A]" />
                    <input type="text" value={contact.name} placeholder="이름" onChange={(e) => handleFamilyContactChange('brideFamilyContacts', idx, 'name', e.target.value)} className="w-[30%] p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A]" />
                    <input type="text" value={contact.phone} placeholder="연락처" onChange={(e) => handleFamilyContactChange('brideFamilyContacts', idx, 'phone', e.target.value)} className="w-[40%] p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A]" />
                  </div>
                  <button onClick={() => removeFamilyContact('brideFamilyContacts', idx)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md border border-gray-100"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">링크 공유 썸네일 설정</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">썸네일 이미지 <span className="text-gray-400 font-normal">(권장: 800x1200 세로형)</span></label>
              <div className="flex items-center gap-3">
                {data.thumbnailPhoto ? (
                  <div className="relative"><img src={data.thumbnailPhoto} alt="preview" className="w-16 h-8 object-cover rounded border border-gray-200" /><button onClick={() => handleRemoveImage('thumbnailPhoto')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"><X size={12} /></button></div>
                ) : (<div className="w-16 h-8 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-[10px] text-gray-400">없음</div>)}
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'thumbnailPhoto')} className="text-xs" />
              </div>
            </div>
            <div className="space-y-4"><Input label="미리보기 제목" name="shareTitle" value={data.shareTitle} onChange={handleChange} /><Input label="미리보기 내용" name="shareDescription" value={data.shareDescription} onChange={handleChange} /></div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">예식 일시 및 장소</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><Input label="예식일" type="date" name="weddingDate" value={data.weddingDate} onChange={handleChange} /><Input label="예식 시간" type="time" name="weddingTime" value={data.weddingTime} onChange={handleChange} /></div>
            <TextAreaInput label="예식장 이름" name="locationName" value={data.locationName} onChange={handleChange} rows={2} /><Input label="예식장 전화번호" name="locationPhone" value={data.locationPhone} onChange={handleChange} />
            <TextAreaInput label="도로명 주소" name="locationAddress" value={data.locationAddress} onChange={handleChange} rows={2} />
            <div className="pt-2"><h3 className="text-sm font-medium text-gray-600 mb-2">교통 정보</h3><TextAreaInput label="지하철" name="subwayInfo" value={data.subwayInfo} onChange={handleChange} rows={2} /><div className="mt-2"></div><TextAreaInput label="버스" name="busInfo" value={data.busInfo} onChange={handleChange} rows={2} /><div className="mt-2"></div><TextAreaInput label="주차" name="parkingInfo" value={data.parkingInfo} onChange={handleChange} rows={2} /></div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">인사말</h2>
          <div className="space-y-4">
            <div><Input label="제목" name="greetingTitle" value={data.greetingTitle} onChange={handleChange} /><div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-md border border-gray-100"><label className="text-xs font-semibold text-gray-500 w-24">제목 글자 크기</label><input type="range" name="greetingTitleFontSize" min="20" max="50" value={data.greetingTitleFontSize || 30} onChange={handleChange} className="flex-1 accent-[#B99A7A]" /><span className="text-xs text-gray-500 w-8 text-right font-medium">{data.greetingTitleFontSize || 30}px</span></div></div>
            <div><TextAreaInput label="내용" name="greetingMessage" value={data.greetingMessage} onChange={handleChange} rows={5} /><div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-md border border-gray-100"><label className="text-xs font-semibold text-gray-500 w-24">내용 글자 크기</label><input type="range" name="greetingFontSize" min="12" max="35" value={data.greetingFontSize || 16} onChange={handleChange} className="flex-1 accent-[#B99A7A]" /><span className="text-xs text-gray-500 w-8 text-right font-medium">{data.greetingFontSize || 16}px</span></div></div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">사진 업로드</h2>
          <div className="space-y-6">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
              <span className="text-xs font-semibold text-gray-600 block mb-2">메인 커버 유형 선택</span>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="mainCoverType" value="basic" checked={data.mainCoverType !== 'edited'} onChange={handleChange} className="accent-[#B99A7A]" />일반 커버</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="mainCoverType" value="edited" checked={data.mainCoverType === 'edited'} onChange={handleChange} className="accent-[#B99A7A]" />편집 커버</label>
              </div>
            </div>
            {data.mainCoverType !== 'edited' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">메인 커버 사진 <span className="text-gray-400 font-normal">(권장: 800x1200 세로형)</span></label>
                <div className="flex items-center gap-3">{data.mainPhoto ? (<div className="relative"><img src={data.mainPhoto} alt="preview" className="w-12 h-12 object-cover rounded border border-gray-200" /><button onClick={() => handleRemoveImage('mainPhoto')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"><X size={12} /></button></div>) : (<div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">없음</div>)}<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'mainPhoto')} className="text-xs" /></div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block mb-3">메인 글자 색상</span>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="mainTextColor" value="text-white" checked={data.mainTextColor === 'text-white' || !data.mainTextColor} onChange={handleChange} />흰색</label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="mainTextColor" value="text-gray-800" checked={data.mainTextColor === 'text-gray-800'} onChange={handleChange} />검은색</label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer"><input type="radio" name="mainTextColor" value="text-black-outline" checked={data.mainTextColor === 'text-black-outline'} onChange={handleChange} />테두리 있는 검은색</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="mainTextColor" value="custom" checked={data.mainTextColor === 'custom'} onChange={handleChange} />직접 색상 선택<input type="color" name="customMainTextColor" value={data.customMainTextColor || '#B99A7A'} onChange={handleChange} onClick={() => setData((prev) => ({ ...prev, mainTextColor: 'custom' }))} className="w-7 h-7 border-0 p-0 cursor-pointer rounded" /></label>
                    </div>
                  </div>
                  <div><label className="flex justify-between text-xs font-semibold text-gray-500 mb-2"><span>배경 그라데이션 필터 진하기</span><span>{data.mainOverlayOpacity ?? 0}%</span></label><input type="range" name="mainOverlayOpacity" min="0" max="100" value={data.mainOverlayOpacity ?? 0} onChange={handleChange} className="w-full accent-[#B99A7A]" /></div>
                </div>
              </div>
            )}
            {data.mainCoverType === 'edited' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">편집 커버 사진 <span className="text-gray-400 font-normal">(권장: 800x1200 세로형)</span></label>
                <div className="flex items-center gap-3">{data.editedMainPhoto ? (<div className="relative"><img src={data.editedMainPhoto} alt="preview" className="w-12 h-12 object-cover rounded border border-gray-200" /><button onClick={() => handleRemoveImage('editedMainPhoto')} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:bg-red-600"><X size={12} /></button></div>) : (<div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400">없음</div>)}<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'editedMainPhoto')} className="text-xs" /></div>
              </div>
            )}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-end mb-3"><h3 className="text-sm font-medium text-gray-600">갤러리 사진</h3></div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {data.galleryPhotos.map((photo, idx) => (<div key={idx} className="relative aspect-[3/4] bg-gray-100 rounded-md overflow-hidden border border-gray-200 group"><img src={photo} alt={`gallery-${idx}`} className="w-full h-full object-cover" /><button onClick={() => handleRemoveImage('galleryPhotos', idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"><X size={14} /></button></div>))}
                <label className="flex flex-col items-center justify-center aspect-[3/4] border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-400 transition-colors"><span className="text-2xl mb-1">+</span><span className="text-[10px] font-medium">사진 추가</span><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'galleryPhotos', data.galleryPhotos.length)} className="hidden" /></label>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4 pb-2 border-b">마음 전하실 곳 (계좌)</h2>
          <div className="space-y-4 mb-8">
            <div><Input label="섹션 제목" name="accountTitle" value={data.accountTitle ?? '신랑 & 신부에게 마음 전하기'} onChange={handleChange} /><div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-md border border-gray-100"><label className="text-xs font-semibold text-gray-500 w-24">제목 글자 크기</label><input type="range" name="accountTitleFontSize" min="16" max="40" value={data.accountTitleFontSize || 20} onChange={handleChange} className="flex-1 accent-[#B99A7A]" /><span className="text-xs text-gray-500 w-8 text-right font-medium">{data.accountTitleFontSize || 20}px</span></div></div>
            <TextAreaInput label="섹션 안내문 (줄바꿈 가능)" name="accountSubtitle" value={data.accountSubtitle ?? '축복의 의미로 축의금을 전달해보세요.'} onChange={handleChange} rows={2} />
          </div>
          <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-[#B99A7A]">신랑측</h3><button onClick={() => addAccount('groomAccounts')} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">+ 추가</button></div>
          <div className="space-y-3 mb-6">
            {data.groomAccounts.map((acc, idx) => (
              <div key={`groom-${idx}`} className="flex gap-2 items-center">
                <div className="flex-1 flex gap-2"><div className="w-1/4"><Input placeholder="은행" value={acc.bank} onChange={(e) => handleAccountChange('groomAccounts', idx, 'bank', e.target.value)} /></div><div className="w-2/4"><Input placeholder="계좌번호" value={acc.account} onChange={(e) => handleAccountChange('groomAccounts', idx, 'account', e.target.value)} /></div><div className="w-1/4"><Input placeholder="예금주" value={acc.name} onChange={(e) => handleAccountChange('groomAccounts', idx, 'name', e.target.value)} /></div></div>
                <button onClick={() => removeAccount('groomAccounts', idx)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md border border-gray-100"><X size={16} /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-[#B99A7A]">신부측</h3><button onClick={() => addAccount('brideAccounts')} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">+ 추가</button></div>
          <div className="space-y-3">
            {data.brideAccounts.map((acc, idx) => (
              <div key={`bride-${idx}`} className="flex gap-2 items-center">
                <div className="flex-1 flex gap-2"><div className="w-1/4"><Input placeholder="은행" value={acc.bank} onChange={(e) => handleAccountChange('brideAccounts', idx, 'bank', e.target.value)} /></div><div className="w-2/4"><Input placeholder="계좌번호" value={acc.account} onChange={(e) => handleAccountChange('brideAccounts', idx, 'account', e.target.value)} /></div><div className="w-1/4"><Input placeholder="예금주" value={acc.name} onChange={(e) => handleAccountChange('brideAccounts', idx, 'name', e.target.value)} /></div></div>
                <button onClick={() => removeAccount('brideAccounts', idx)} className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md border border-gray-100"><X size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ==========================================
// 공용 유틸리티 컴포넌트
// ==========================================
function Input({ label, type = 'text', name, value, onChange, placeholder }) {
  return (
    <div>{label && <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>}<input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#B99A7A] bg-white" /></div>
  );
}

function TextAreaInput({ label, name, value, onChange, placeholder, rows = 2 }) {
  return (
    <div>{label && <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>}<textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none resize-none focus:border-[#B99A7A] bg-white" /></div>
  );
}

// ==========================================
// 방명록 컴포넌트
// ==========================================
function GuestbookSection({ data, setData, showToast, isViewer, invitationId, appId }) {
  const [name, setName] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState('');
  const [deleteModeId, setDeleteModeId] = useState(null); const [deletePassword, setDeletePassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim() || !message.trim()) return showToast('이름, 비밀번호, 내용을 모두 입력해주세요.');
    const newEntry = { id: Date.now(), name, password, message, date: new Date().toISOString().split('T')[0] };
    const newGuestbook = [newEntry, ...(data.guestbook || [])];

    if (isViewer && invitationId) {
      try { const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'invitations', invitationId); await updateDoc(docRef, { guestbook: newGuestbook }); } catch (e) { return showToast('서버 저장 실패'); }
    }
    setData((prev) => ({ ...prev, guestbook: newGuestbook })); setName(''); setPassword(''); setMessage(''); showToast('방명록이 등록되었습니다.');
  };

  const handleDelete = async (id, originalPassword) => {
    if (deletePassword !== originalPassword) return showToast('비밀번호가 일치하지 않습니다.');
    const newGuestbook = data.guestbook.filter((item) => item.id !== id);
    if (isViewer && invitationId) {
      try { const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'invitations', invitationId); await updateDoc(docRef, { guestbook: newGuestbook }); } catch (e) { return showToast('서버 삭제 실패'); }
    }
    setData((prev) => ({ ...prev, guestbook: newGuestbook })); setDeleteModeId(null); setDeletePassword(''); showToast('방명록이 삭제되었습니다.');
  };

  return (
    <section className="py-16 px-6 bg-[#faf9f8]">
      <h2 className="text-center text-xl text-[#B99A7A] font-serif mb-8 tracking-widest">GUESTBOOK</h2>
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-8 space-y-3">
        <div className="flex gap-2"><input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} className="w-1/2 p-2 border border-gray-200 rounded text-sm focus:border-[#B99A7A] outline-none" maxLength={10} /><input type="password" placeholder="비밀번호(삭제용)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-1/2 p-2 border border-gray-200 rounded text-sm focus:border-[#B99A7A] outline-none" maxLength={12} /></div>
        <textarea placeholder="축하 메시지를 남겨주세요." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-2 border border-gray-200 rounded text-sm outline-none resize-none h-20 focus:border-[#B99A7A]" />
        <button type="submit" className="w-full bg-[#B99A7A] text-white py-2 rounded text-sm font-medium hover:bg-[#a6896c]">등록하기</button>
      </form>
      <div className="space-y-4">
        {(data.guestbook || []).map((entry) => (
          <div key={entry.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2"><span className="font-semibold text-gray-800">{entry.name}</span><span className="text-xs text-gray-400">{entry.date}</span></div>
              <button onClick={() => { setDeleteModeId(deleteModeId === entry.id ? null : entry.id); setDeletePassword(''); }} className="text-gray-400 hover:text-red-500 p-1">{deleteModeId === entry.id ? <X size={16} /> : <Trash2 size={16} />}</button>
            </div>
            <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{entry.message}</p>
            {deleteModeId === entry.id && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2"><input type="password" placeholder="비밀번호 입력" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="flex-1 p-1.5 border border-gray-200 rounded text-sm outline-none focus:border-red-300" /><button onClick={() => handleDelete(entry.id, entry.password)} className="px-4 bg-red-500 text-white rounded text-sm hover:bg-red-600">삭제</button></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const Divider = () => (<div className="flex justify-center bg-white"><div className="w-12 border-t border-gray-200"></div></div>);

function SimpleCalendar({ dateStr }) {
  if (!dateStr) return null;
  const date = new Date(dateStr); const year = date.getFullYear(); const month = date.getMonth(); const targetDay = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1); const blanks = Array.from({ length: firstDay }, (_, i) => '');
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="max-w-[280px] mx-auto border-t border-b border-gray-200 py-6">
      <div className="grid grid-cols-7 gap-y-4 text-center text-sm">
        {weekDays.map((day, i) => (<div key={day} className={`font-medium ${i === 0 ? 'text-red-400' : 'text-gray-500'}`}>{day}</div>))}
        {blanks.map((_, i) => (<div key={`blank-${i}`}></div>))}
        {days.map((day) => (<div key={day} className="flex justify-center items-center"><span className={`w-7 h-7 flex items-center justify-center rounded-full ${day === targetDay ? 'bg-[#B99A7A] text-white font-bold shadow-md' : 'text-gray-700'}`}>{day}</span></div>))}
      </div>
    </div>
  );
}