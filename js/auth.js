/**
 * Sistema de Autenticación con Firebase
 */

import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    sendPasswordResetEmail,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

// Configurar persistencia
await setPersistence(auth, browserLocalPersistence)
    .catch(err => console.log('Persistencia error:', err));

/**
 * Crear cuenta de usuario
 */
export async function registerUser(email, password, nombre) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Guardar datos adicionales en Firestore
        await setDoc(doc(db, 'usuarios', user.uid), {
            uid: user.uid,
            email: email,
            nombre_completo: nombre,
            usuario: email.split('@')[0], // usar parte del email como usuario
            fecha_creacion: new Date(),
            estado: 'activo'
        });

        // Actualizar perfil en Firebase Auth
        await updateProfile(user, {
            displayName: nombre
        });

        return user;
    } catch (error) {
        throw new Error(parseFirebaseError(error.code));
    }
}

/**
 * Login de usuario
 */
export async function loginUser(usuario, contraseña) {
    try {
        // Buscar usuario por nombre de usuario en Firestore
        const usersRef = collection(db, 'usuarios');
        const q = query(usersRef, where('usuario', '==', usuario));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error('Usuario no encontrado');
        }

        const userData = querySnapshot.docs[0].data();
        const email = userData.email;

        // Login con email y contraseña
        await signInWithEmailAndPassword(auth, email, contraseña);
        return auth.currentUser;
    } catch (error) {
        throw new Error(parseFirebaseError(error.code));
    }
}

/**
 * Logout
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem('currentUser');
    } catch (error) {
        throw new Error(parseFirebaseError(error.code));
    }
}

/**
 * Obtener usuario actual
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Obtener datos del usuario desde Firestore
 */
export async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', uid));
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo datos del usuario:', error);
        return null;
    }
}

/**
 * Recuperar contraseña
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Se envió un enlace de recuperación a tu correo' };
    } catch (error) {
        throw new Error(parseFirebaseError(error.code));
    }
}

/**
 * Crear usuarios demo (solo si no existen)
 */
export async function createDemoUsers() {
    try {
        const usersRef = collection(db, 'usuarios');
        const q = query(usersRef, where('usuario', '==', 'admin'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('Creando usuario demo...');
            
            // Crear usuario demo con Firebase Auth
            try {
                await createUserWithEmailAndPassword(
                    auth,
                    'admin@maralicomunicaciones.demo',
                    'admin123'
                );
            } catch (error) {
                if (error.code !== 'auth/email-already-in-use') {
                    throw error;
                }
            }

            // Buscar el usuario actual
            const adminUser = auth.currentUser;
            if (adminUser) {
                // Guardar datos en Firestore
                await setDoc(doc(db, 'usuarios', adminUser.uid), {
                    uid: adminUser.uid,
                    email: 'admin@maralicomunicaciones.demo',
                    nombre_completo: 'Administrador',
                    usuario: 'admin',
                    telefono: '+52 1 746 102 3929',
                    fecha_creacion: new Date(),
                    estado: 'activo'
                });

                console.log('Usuario demo creado correctamente');
            }
        }
    } catch (error) {
        console.log('Error creando usuarios demo:', error.message);
    }
}

/**
 * Parsear errores de Firebase a mensajes legibles
 */
function parseFirebaseError(code) {
    const errors = {
        'auth/invalid-email': 'El correo no es válido',
        'auth/user-disabled': 'El usuario ha sido desactivado',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'El correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/operation-not-allowed': 'Esta operación no está permitida',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde'
    };
    return errors[code] || 'Error de autenticación: ' + code;
}

/**
 * Observador de cambios de autenticación
 */
export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}
