import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import DatabaseService from './database.service';

export interface AuthCredentials {
  email: string;
  password: string;
  username?: string;
}

class AuthService {
  private auth = auth();

  // User-getter
  get currentUser(): FirebaseAuthTypes.User | null {
    return this.auth.currentUser;
  }

  // Zasubskrybuj do zmian w uwierzytelnieniu
  onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
    return this.auth.onAuthStateChanged(callback);
  }

  // Rejestruj nowego użytkownika
  async register({ email, password, username }: AuthCredentials): Promise<FirebaseAuthTypes.User> {
    if (!username) {
      throw new Error('Podaj nazwę użytkownika');
    }

    try {
      // Sprawdź czy nazwa już zajęta
      const isUsernameTaken = await this.checkUsernameExists(username);
      if (isUsernameTaken) {
        throw new Error('Ta nazwa użytkownika jest już zajęta');
      }

      // Utwórz konto
      const { user } = await this.auth.createUserWithEmailAndPassword(email, password);
      
      // Zaktualizuj nazwę usera
      await user.updateProfile({
        displayName: username,
      });

      // Twórz profil w bazie
      await DatabaseService.createUser(user.uid, email, username);

      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }
  // Zaloguj istniejącego
  async login({ email, password }: AuthCredentials): Promise<FirebaseAuthTypes.User> {
    try {
      const { user } = await this.auth.signInWithEmailAndPassword(email, password);
      
      // Aktywny timestamp
      await DatabaseService.updateUserProfile(user.uid, {
        lastActive: Date.now(),
      });

      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Reset
  async resetPassword(email: string): Promise<void> {
    try {
      await this.auth.sendPasswordResetEmail(email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Sprawdź czy nazwa użytkownika istnieje w bazie
  private async checkUsernameExists(username: string): Promise<boolean> {
    // TBD
    return false;
  }

  // Error messages
  private handleAuthError(error: any): Error {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Ten email już istnieje',
      'auth/invalid-email': 'Błędy adres email',
      'auth/weak-password': 'Hasło powinno mieć minimum 6 znaków',
      'auth/user-not-found': 'Nie odnaleziono konta dla tego adresu email',
      'auth/wrong-password': 'Błędne hasło',
      'auth/too-many-requests': 'Za dużo prób. Spróbuj ponownie później',
      'auth/network-request-failed': 'Błąd sieci. Sprawdź połączenie',
    };

    const message = errorMessages[error.code] || error.message || 'Pojawił się błąd';
    return new Error(message);
  }

  // Regex dla maila
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Siła hasła
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 6) {
      errors.push('Hasło musi zawierać ponad 6 znaków');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Hasło musi zawierać co najmniej 1 cyfrę');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Hasło musi zawierać co najmniej 1 wielką literę');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Walidacja username
  validateUsername(username: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (username.length < 3) {
      errors.push('Nazwa użytkownika musi mieć przynajmniej trzy znaki');
    }
    
    if (username.length > 20) {
      errors.push('Nazwa użytkownika musi mieć mniej niż 20 znaków');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Nazwa użytkownika nie może zawierać znaków specjalnych');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default new AuthService();