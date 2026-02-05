import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  push,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  DatabaseReference,
  DataSnapshot,
} from "firebase/database";
import { TripPlan, TripChecklist, TripInput } from "./types";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBzGb8Pq7kcYH4SaNOb2_SDy-lDDHNVsSo",
  authDomain: "jeju-travel-planner-2a4ef.firebaseapp.com",
  databaseURL: "https://jeju-travel-planner-2a4ef-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jeju-travel-planner-2a4ef",
  storageBucket: "jeju-travel-planner-2a4ef.firebasestorage.app",
  messagingSenderId: "1040322338152",
  appId: "1:1040322338152:web:d7f03667abbbe2195e4add",
  measurementId: "G-FK600Q1K0L"
};

// Firebase 초기화 (중복 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// 저장된 여행 데이터 타입
export interface SavedTrip {
  id: string;
  userId: string;
  title: string;
  input: TripInput;
  tripPlan: TripPlan;
  checklist?: TripChecklist;
  createdAt: number;
  updatedAt: number;
}

// 여행 일정 저장 (새로 생성)
export async function saveTrip(
  userId: string,
  title: string,
  input: TripInput,
  tripPlan: TripPlan,
  checklist?: TripChecklist
): Promise<string> {
  const tripsRef = ref(database, "trips");
  const newTripRef = push(tripsRef);
  const tripId = newTripRef.key!;

  const tripData = {
    id: tripId,
    userId,
    title,
    input,
    tripPlan,
    checklist: checklist || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(newTripRef, tripData);
  return tripId;
}

// 사용자의 모든 여행 일정 가져오기
export async function getUserTrips(userId: string): Promise<SavedTrip[]> {
  const tripsRef = ref(database, "trips");
  const userTripsQuery = query(tripsRef, orderByChild("userId"), equalTo(userId));
  const snapshot = await get(userTripsQuery);

  if (!snapshot.exists()) {
    return [];
  }

  const trips: SavedTrip[] = [];
  snapshot.forEach((childSnapshot) => {
    trips.push(childSnapshot.val() as SavedTrip);
  });

  // 최신순 정렬
  return trips.sort((a, b) => b.createdAt - a.createdAt);
}

// 여행 일정 삭제
export async function deleteTrip(tripId: string): Promise<void> {
  const tripRef = ref(database, `trips/${tripId}`);
  await remove(tripRef);
}

// 여행 일정 불러오기
export async function getTrip(tripId: string): Promise<SavedTrip | null> {
  const tripRef = ref(database, `trips/${tripId}`);
  const snapshot = await get(tripRef);

  if (snapshot.exists()) {
    return snapshot.val() as SavedTrip;
  }
  return null;
}

// 여행 일정 업데이트
export async function updateTrip(
  tripId: string,
  updates: Partial<Pick<SavedTrip, "tripPlan" | "checklist" | "title">>
): Promise<void> {
  const tripRef = ref(database, `trips/${tripId}`);
  await update(tripRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}

// 일정만 업데이트
export async function updateTripPlan(
  tripId: string,
  tripPlan: TripPlan
): Promise<void> {
  const tripRef = ref(database, `trips/${tripId}`);
  await update(tripRef, {
    tripPlan,
    updatedAt: Date.now(),
  });
}

// 체크리스트만 업데이트
export async function updateChecklist(
  tripId: string,
  checklist: TripChecklist
): Promise<void> {
  const tripRef = ref(database, `trips/${tripId}`);
  await update(tripRef, {
    checklist,
    updatedAt: Date.now(),
  });
}

// 실시간 구독 (여행 전체)
export function subscribeToTrip(
  tripId: string,
  callback: (trip: SavedTrip | null) => void
): () => void {
  const tripRef = ref(database, `trips/${tripId}`);

  const unsubscribe = onValue(tripRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as SavedTrip);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

// 실시간 구독 (일정만)
export function subscribeToTripPlan(
  tripId: string,
  callback: (tripPlan: TripPlan | null) => void
): () => void {
  const tripPlanRef = ref(database, `trips/${tripId}/tripPlan`);

  const unsubscribe = onValue(tripPlanRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as TripPlan);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

// 실시간 구독 (체크리스트만)
export function subscribeToChecklist(
  tripId: string,
  callback: (checklist: TripChecklist | null) => void
): () => void {
  const checklistRef = ref(database, `trips/${tripId}/checklist`);

  const unsubscribe = onValue(checklistRef, (snapshot: DataSnapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as TripChecklist);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

// 공유 링크 생성
export function generateShareLink(tripId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/shared/${tripId}`;
  }
  return `/shared/${tripId}`;
}

export { database };
