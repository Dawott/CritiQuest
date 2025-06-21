class AuthService {
  static currentUser = null;

  static async signIn(email: string, password: string) {
    console.warn('signIn not implemented in web build');
    return null;
  }

  static async signUp(email: string, password: string) {
    console.warn('signUp not implemented in web build');
    return null;
  }

  static async signOut() {
    console.warn('signOut not implemented in web build');
    return null;
  }

  static onAuthStateChanged(callback: (user: any) => void) {
    console.warn('onAuthStateChanged not implemented in web build');
    return () => {}; // unsubscribe function
  }
}

export default AuthService;