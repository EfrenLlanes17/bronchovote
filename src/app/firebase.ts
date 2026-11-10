import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
	apiKey: 'AIzaSyCu4jgbTHKwdDYACyTHI1gQXizi92sZlXA',
	authDomain: 'bronchovote.firebaseapp.com',
	databaseURL: 'https://bronchovote-default-rtdb.firebaseio.com',
	projectId: 'bronchovote',
	storageBucket: 'bronchovote.firebasestorage.app',
	messagingSenderId: '476702803479',
	appId: '1:476702803479:web:5c70731bb09a6072cf7e52',
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);