import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push, 
  onValue, 
  off,
  update,
  remove,
  child
} from 'firebase/database';
import firebase from './firebase-web-shim';

const database = () => getDatabase(firebase.app());

export default database;