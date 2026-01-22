import auth from '@react-native-firebase/auth';

const firebaseConfig = {
  // TODO: Add your Firebase config from Firebase Console
  // This is needed for Firebase Auth to work
  // Get it from: Firebase Console -> Project Settings -> General -> Your apps -> iOS app
};

export { auth };

// Auth functions using React Native Firebase
export const firebaseAuth = {
  signInWithEmail: (email, password) => auth().signInWithEmailAndPassword(email, password),
  signUpWithEmail: (email, password) => auth().createUserWithEmailAndPassword(email, password),
  signInAnonymously: () => auth().signInAnonymously(),
  signInWithGoogle: async (credential) => {
    // This is called after Google Sign-In returns a credential
    const result = await auth().signInWithCredential(credential);
    return result;
  },
  signInWithApple: async (credential) => {
    // This is called after Apple Sign-In returns a credential
    const result = await auth().signInWithCredential(credential);
    return result;
  },
  signOut: () => auth().signOut(),
  onAuthStateChanged: (callback) => auth().onAuthStateChanged(callback),
  currentUser: () => auth().currentUser,
};
