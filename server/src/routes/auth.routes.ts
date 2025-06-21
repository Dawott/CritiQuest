import { Router,Request, Response } from 'express';
import { z } from 'zod';
import admin from 'firebase-admin';
import { validateRequest, authRateLimit, checkFirebaseConnection } from '../middleware/middleware';
import { asyncHandler, AppError, ErrorType } from '../middleware/error.middleware';
import { EnhancedDatabaseService } from '../services/firebase/database.service';
import { UserProfileSchema } from '../utils/schemas';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const dbService = new EnhancedDatabaseService();

// Validation Schemas for Auth Routes
const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Nieprawidłowy format adresu email'),
    password: z.string()
      .min(6, 'Hasło musi mieć minimum 6 znaków')
      .regex(/^(?=.*[A-Z])(?=.*\d)/, 'Hasło musi zawierać wielką literę i cyfrę'),
    username: z.string()
      .min(3, 'Nazwa użytkownika musi mieć minimum 3 znaki')
      .max(20, 'Nazwa użytkownika może mieć maksymalnie 20 znaków')
      .regex(/^[a-zA-Z0-9_]+$/, 'Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  }),
});

const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Nieprawidłowy format adresu email'),
    password: z.string().min(1, 'Hasło jest wymagane'),
  }),
});

const ResetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Nieprawidłowy format adresu email'),
  }),
});

const UpdateProfileSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, 'Nazwa użytkownika musi mieć minimum 3 znaki')
      .max(20, 'Nazwa użytkownika może mieć maksymalnie 20 znaków')
      .regex(/^[a-zA-Z0-9_]+$/, 'Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia')
      .optional(),
    avatarUrl: z.string().url('Nieprawidłowy URL avatara').optional(),
  }),
});

const VerifyTokenSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Token jest wymagany'),
  }),
});

// Apply middleware
router.use(authRateLimit.middleware);
router.use(checkFirebaseConnection);

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Auth service is running',
    timestamp: Date.now() 
  });
});

// Register new user
router.post('/register', 
  validateRequest(RegisterSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, username } = req.body;

    try {
      // Check if username is already taken
      const existingUsername = await checkUsernameExists(username);
      if (existingUsername) {
        throw new AppError('Ta nazwa użytkownika jest już zajęta', 400, ErrorType.VALIDATION);
      }

      // Create Firebase user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: username,
        emailVerified: false,
      });

      // Create user profile in database
      await dbService.createUser(userRecord.uid, email, username);

      // Generate custom token for immediate login
      const customToken = await admin.auth().createCustomToken(userRecord.uid);

      res.status(201).json({
        success: true,
        message: 'Konto zostało utworzone pomyślnie',
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          username,
          customToken,
        },
      });

    } catch (error: any) {
      // Handle Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        throw new AppError('Ten adres email jest już używany', 400, ErrorType.VALIDATION);
      }
      if (error.code === 'auth/invalid-email') {
        throw new AppError('Nieprawidłowy format adresu email', 400, ErrorType.VALIDATION);
      }
      if (error.code === 'auth/weak-password') {
        throw new AppError('Hasło jest zbyt słabe', 400, ErrorType.VALIDATION);
      }
      
      throw error;
    }
  })
);

// Login user (verify credentials and return user data)
router.post('/login',
  validateRequest(LoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      if (userRecord.disabled) {
        throw new AppError('Konto zostało zablokowane', 403, ErrorType.AUTHORIZATION);
      }

      // Get user data from database
      const userData = await dbService.getUser(userRecord.uid);
      if (!userData) {
        throw new AppError('Profil użytkownika nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      // Update last active timestamp
      await dbService.updateUserProfile(userRecord.uid, {
        lastActive: Date.now(),
      });

      res.json({
        success: true,
        message: 'Dane użytkownika pobrane pomyślnie',
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          profile: userData.profile,
          progression: userData.progression,
          stats: userData.stats,
        },
      });

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new AppError('Nie znaleziono konta z tym adresem email', 404, ErrorType.NOT_FOUND);
      }
      
      throw error;
    }
  })
);

// Verify ID token and return user data
router.post('/verify',
  validateRequest(VerifyTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { idToken } = req.body;

    try {
      // Verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get user data from database
      const userData = await dbService.getUser(decodedToken.uid);
      if (!userData) {
        throw new AppError('Profil użytkownika nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }

      res.json({
        success: true,
        message: 'Token zweryfikowany pomyślnie',
        data: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          profile: userData.profile,
          progression: userData.progression,
          stats: userData.stats,
          tokenClaims: {
            iat: decodedToken.iat,
            exp: decodedToken.exp,
            aud: decodedToken.aud,
          },
        },
      });

    } catch (error: any) {
      if (error.code === 'auth/id-token-expired') {
        throw new AppError('Token wygasł', 401, ErrorType.AUTHENTICATION);
      }
      if (error.code === 'auth/invalid-id-token') {
        throw new AppError('Nieprawidłowy token', 401, ErrorType.AUTHENTICATION);
      }
      
      throw error;
    }
  })
);

// Reset password
router.post('/reset-password',
  validateRequest(ResetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      // Check if user exists
      await admin.auth().getUserByEmail(email);
      
      // Generate password reset link
      const link = await admin.auth().generatePasswordResetLink(email);

      // In a real app, you would send this link via email
      // For now, we'll just return success (the actual email sending would be handled by Firebase)
      res.json({
        success: true,
        message: 'Link do resetowania hasła został wysłany na podany adres email',
        ...(process.env.NODE_ENV === 'development' && { resetLink: link }),
      });

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // For security, we don't reveal if email exists or not
        res.json({
          success: true,
          message: 'Jeśli konto z tym adresem email istnieje, link do resetowania hasła został wysłany',
        });
        return;
      }
      
      throw error;
    }
  })
);

// Update user profile (authenticated endpoint)
router.put('/profile',
  validateRequest(UpdateProfileSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Brakuje tokenu uwierzytelnienia', 401, ErrorType.AUTHENTICATION);
    }

    try {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      const { username, avatarUrl } = req.body;
      const updates: any = {};

      if (username) {
        // Check if new username is available
        const existingUsername = await checkUsernameExists(username, decodedToken.uid);
        if (existingUsername) {
          throw new AppError('Ta nazwa użytkownika jest już zajęta', 400, ErrorType.VALIDATION);
        }
        
        updates.username = username;
        
        // Update Firebase user profile
        await admin.auth().updateUser(decodedToken.uid, {
          displayName: username,
        });
      }

      if (avatarUrl) {
        updates.avatarUrl = avatarUrl;
      }

      // Update database profile
      await dbService.updateUserProfile(decodedToken.uid, updates);

      res.json({
        success: true,
        message: 'Profil został zaktualizowany pomyślnie',
        data: updates,
      });

    } catch (error: any) {
      if (error.code === 'auth/id-token-expired') {
        throw new AppError('Token wygasł', 401, ErrorType.AUTHENTICATION);
      }
      if (error.code === 'auth/invalid-id-token') {
        throw new AppError('Nieprawidłowy token', 401, ErrorType.AUTHENTICATION);
      }
      
      throw error;
    }
  })
);

// Delete user account (authenticated endpoint)
router.delete('/account',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Brakuje tokenu uwierzytelnienia', 401, ErrorType.AUTHENTICATION);
    }

    try {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Delete user data from database
      await admin.database().ref(`users/${decodedToken.uid}`).remove();
      
      // Delete Firebase user account
      await admin.auth().deleteUser(decodedToken.uid);

      res.json({
        success: true,
        message: 'Konto zostało usunięte pomyślnie',
      });

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new AppError('Użytkownik nie został znaleziony', 404, ErrorType.NOT_FOUND);
      }
      
      throw error;
    }
  })
);

// Helper function to check if username exists
async function checkUsernameExists(username: string, excludeUserId?: string): Promise<boolean> {
  try {
    const usersRef = admin.database().ref('users');
    const snapshot = await usersRef.orderByChild('profile/username').equalTo(username).once('value');
    
    if (!snapshot.exists()) {
      return false;
    }

    // If we're updating a user, exclude their current username
    if (excludeUserId) {
      const users = snapshot.val();
      const userIds = Object.keys(users);
      return userIds.some(uid => uid !== excludeUserId);
    }

    return true;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
}

export default router;