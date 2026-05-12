import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, onValue, remove, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB6ondc3ixzX9FNwB_RzcdmQyCW0RSaeVg",
  authDomain: "studio-6524324946-b6314.firebaseapp.com",
  databaseURL: "https://studio-6524324946-b6314-default-rtdb.firebaseio.com",
  projectId: "studio-6524324946-b6314",
  storageBucket: "studio-6524324946-b6314.firebasestorage.app",
  messagingSenderId: "1095632072504",
  appId: "1:1095632072504:web:15a2f20910146f06195bcd",
  measurementId: "G-JTN8QNS13V"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log("✅ Firebase Realtime Database 초기화 완료");

export { db, ref, set, get, push, onValue, remove, update };
