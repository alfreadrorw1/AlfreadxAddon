// Firebase v9 Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, doc,
  updateDoc, deleteDoc, query, orderBy, limit, startAfter,
  onSnapshot, serverTimestamp, increment, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-VY5HwK9-uIu2o2SzE73NVTEmuIXC3hE",
  authDomain: "alfreadxaddon.firebaseapp.com",
  projectId: "alfreadxaddon",
  storageBucket: "alfreadxaddon.firebasestorage.app",
  messagingSenderId: "154504478406",
  appId: "1:154504478406:web:1e37319a7dc39a31ba21c7",
  measurementId: "G-Q2GN7C2V6E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  db, storage,
  collection, addDoc, getDocs, getDoc, doc,
  updateDoc, deleteDoc, query, orderBy, limit, startAfter,
  onSnapshot, serverTimestamp, increment, where,
  ref, uploadBytesResumable, getDownloadURL, deleteObject
};
