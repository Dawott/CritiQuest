import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import firebase from './firebase-web-shim';

const auth = () => getAuth(firebase.app());

export default auth;