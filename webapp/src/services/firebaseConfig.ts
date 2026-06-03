// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCnOXcIqASTo3CvsFI8dFj0IT8SnJgkWrY",
  authDomain: "fitlink-dev-847d0.firebaseapp.com",
  projectId: "fitlink-dev-847d0",
  storageBucket: "fitlink-dev-847d0.firebasestorage.app",
  messagingSenderId: "790319371268",
  appId: "1:790319371268:web:de4fda33bcdb2be32d9151"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;