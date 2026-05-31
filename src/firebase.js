import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, onValue, remove, update } from 'firebase/database';

const firebaseConfig = {
    apiKey: 'AIzaSyA7Cd-rI9YMgADoXG32WoSHJAcwfZEemws',
    authDomain: 'chorok-8433b.firebaseapp.com',
    databaseURL: 'https://chorok-8433b-default-rtdb.firebaseio.com',
    projectId: 'chorok-8433b',
    storageBucket: 'chorok-8433b.firebasestorage.app',
    messagingSenderId: '862591960042',
    appId: '1:862591960042:web:e2abf060f0e9a340b1a893'
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log('✅ Firebase Realtime Database 초기화 완료');

export { db, ref, set, get, push, onValue, remove, update };
