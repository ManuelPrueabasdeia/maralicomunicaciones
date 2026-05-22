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
        if (!email || !password || !nombre) {
            throw new Error('Todos los campos son requeridos');
        }

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
        const message = parseFirebaseError(error.code) || error.message || 'Error al crear cuenta';
        throw new Error(message);
    }
}

/**
 * Login de usuario
 */
export async function loginUser(usuario, contraseña) {
    try {
        console.log('🔐 Iniciando login para usuario:', usuario);
        
        if (!usuario || !contraseña) {
            throw new Error('Usuario y contraseña son requeridos');
        }

        // Buscar usuario por nombre de usuario en Firestore
        const usersRef = collection(db, 'usuarios');
        const q = query(usersRef, where('usuario', '==', usuario));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn('⚠️ Usuario no encontrado:', usuario);
            throw new Error('Usuario o contraseña incorrectos');
        }

        const userData = querySnapshot.docs[0].data();
        const email = userData.email;
        console.log('✓ Usuario encontrado:', email);

        // Login con email y contraseña
        try {
            console.log('🔑 Intentando autenticación con Firebase...');
            await signInWithEmailAndPassword(auth, email, contraseña);
            console.log('✓ Autenticación exitosa');
            return auth.currentUser;
        } catch (authError) {
            console.error('✗ Error de autenticación:', authError.code, authError.message);
            if (authError.code === 'auth/wrong-password' || authError.code === 'auth/user-not-found') {
                throw new Error('Usuario o contraseña incorrectos');
            }
            throw new Error(parseFirebaseError(authError.code) || authError.message || 'Error en autenticación');
        }
    } catch (error) {
        console.error('❌ Error de login:', error.message);
        // Asegurar que siempre retornamos un mensaje significativo
        if (error instanceof Error) {
            throw error;
        } else if (typeof error === 'string') {
            throw new Error(error);
        } else {
            throw new Error('Error desconocido al iniciar sesión');
        }
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
        if (!email) {
            throw new Error('El correo es requerido');
        }
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Se envió un enlace de recuperación a tu correo' };
    } catch (error) {
        const message = parseFirebaseError(error.code) || error.message || 'Error al enviar correo de recuperación';
        throw new Error(message);
    }
}

/**
 * Crear usuarios demo (solo si no existen)
 */
export async function createDemoUsers() {
    try {
        // Verificar si ya existe el usuario demo
        const usersRef = collection(db, 'usuarios');
        const q = query(usersRef, where('usuario', '==', 'admin'));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            console.log('✓ Usuario demo ya existe');
            return;
        }

        console.log('ℹ️ Creando usuario demo...');
        
        // Crear usuario demo con Firebase Auth
        const demoEmail = 'admin@maralicomunicaciones.demo';
        const demoPassword = 'admin123';
        
        let userCredential = null;
        
        try {
            userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
            console.log('✓ Usuario de autenticación creado:', userCredential.user.uid);
        } catch (authError) {
            if (authError.code === 'auth/email-already-in-use') {
                console.log('ℹ️ Email ya existe, intentando recuperar usuario...');
                // Si el email ya existe, intentar login para obtener el uid
                try {
                    await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
                    userCredential = { user: auth.currentUser };
                    console.log('✓ Usuario de autenticación recuperado');
                } catch (signInError) {
                    console.error('✗ Error al recuperar usuario:', signInError.message);
                    return;
                }
            } else {
                console.error('✗ Error creando usuario de autenticación:', authError.message);
                throw authError;
            }
        }

        // Guardar datos del usuario en Firestore
        if (userCredential && userCredential.user) {
            const uid = userCredential.user.uid;
            
            // Verificar si ya existe en Firestore
            const existingDoc = await getDoc(doc(db, 'usuarios', uid));
            if (existingDoc.exists()) {
                console.log('✓ Datos del usuario ya existen en Firestore');
                return;
            }

            // Crear documento en Firestore
            await setDoc(doc(db, 'usuarios', uid), {
                uid: uid,
                email: demoEmail,
                nombre_completo: 'Administrador Demo',
                usuario: 'admin',
                telefono: '+52 1 746 102 3929',
                fecha_creacion: new Date(),
                estado: 'activo'
            });

            console.log('✓ Usuario demo creado correctamente en Firestore');
            
            // Logout para permitir nuevo login
            await signOut(auth);
            console.log('✓ Sesión cerrada - Puedes iniciar sesión con admin/admin123');
        }
    } catch (error) {
        console.error('✗ Error creando usuarios demo:', error.message);
    }
}

/**
 * Parsear errores de Firebase a mensajes legibles
 */
function parseFirebaseError(code) {
    const errors = {
        'auth/invalid-email': 'El correo no es válido',
        'auth/user-disabled': 'El usuario ha sido desactivado',
        'auth/user-not-found': 'Usuario o contraseña incorrectos',
        'auth/wrong-password': 'Usuario o contraseña incorrectos',
        'auth/email-already-in-use': 'El correo ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/operation-not-allowed': 'Esta operación no está permitida',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
        'permission-denied': 'No tienes permisos para esta acción',
        'not-found': 'Registro no encontrado'
    };
    
    if (!code) {
        return 'Ocurrió un error desconocido';
    }
    
    return errors[code] || `Error: ${code}`;
}

/**
 * Observador de cambios de autenticación
 */
export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}
