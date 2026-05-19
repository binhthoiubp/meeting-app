import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// THAY THẾ TOÀN BỘ KHỐI NÀY BẰNG MÃ COPY TỪ FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyCulPKeiX8jIneIDBeGQiZ9pyrx7Jx3xHo",
  authDomain: "lich-hop-binh-thoi.firebaseapp.com",
  projectId: "lich-hop-binh-thoi",
  storageBucket: "lich-hop-binh-thoi.firebasestorage.app",
  messagingSenderId: "317334344332",
  appId: "1:317334344332:web:324434234032890c05e1a9"
};

// Khởi tạo ứng dụng Firebase
const app = initializeApp(firebaseConfig);

// Xuất các dịch vụ Authentication và Database để sử dụng ở các file khác
export const auth = getAuth(app);
export const db = getFirestore(app);