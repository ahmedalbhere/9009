// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCJ4VhGD49H3RNifMf9VCRPnkALAxNpsOU",
    authDomain: "project-2980864980936907935.firebaseapp.com",
    databaseURL: "https://project-2980864980936907935-default-rtdb.firebaseio.com",
    projectId: "project-2980864980936907935",
    storageBucket: "project-2980864980936907935.appspot.com",
    messagingSenderId: "580110751353",
    appId: "1:580110751353:web:8f039f9b34e1709d4126a8",
    measurementId: "G-R3JNPHCFZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// متغيرات التطبيق
let currentUser = null;
let currentUserType = null;

// عناصر DOM
const screens = {
    roleSelection: document.getElementById('roleSelection'),
    clientLogin: document.getElementById('clientLogin'),
    barberLogin: document.getElementById('barberLogin'),
    clientDashboard: document.getElementById('clientDashboard'),
    barberDashboard: document.getElementById('barberDashboard')
};

// دالة تسجيل دخول الحلاق المعدلة
async function barberLogin() {
    const phone = document.getElementById('barberPhone').value.trim();
    const password = document.getElementById('barberPassword').value;
    const errorElement = document.getElementById('barberError');
    
    if (!phone || !password) {
        errorElement.textContent = 'رقم الهاتف وكلمة المرور مطلوبان';
        errorElement.classList.remove('hidden');
        return;
    }
    
    try {
        // تسجيل الدخول باستخدام Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(auth, `${phone}@barber.com`, password);
        const user = userCredential.user;
        
        // جلب بيانات الحلاق من قاعدة البيانات
        const barberRef = ref(database, 'barbers/' + user.uid);
        const snapshot = await get(barberRef);
        
        if (snapshot.exists()) {
            const barberData = snapshot.val();
            
            // التحقق من أن المستخدم حلاق
            if (!barberData.type || barberData.type !== 'barber') {
                errorElement.textContent = 'هذا الحساب ليس حساب حلاق';
                errorElement.classList.remove('hidden');
                await signOut(auth);
                return;
            }
            
            currentUser = {
                id: user.uid,
                name: barberData.name,
                phone: barberData.phone,
                type: 'barber'
            };
            currentUserType = 'barber';
            
            document.getElementById('barberAvatar').textContent = barberData.name.charAt(0);
            showBarberDashboard();
            loadBarberQueue();
        } else {
            errorElement.textContent = 'بيانات الحلاق غير موجودة في قاعدة البيانات';
            errorElement.classList.remove('hidden');
            await signOut(auth);
        }
        
    } catch (error) {
        let errorMessage = 'بيانات الدخول غير صحيحة';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'لا يوجد حساب مرتبط بهذا الرقم';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'كلمة المرور غير صحيحة';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'صيغة البريد الإلكتروني غير صالحة';
        }
        
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
        console.error('Login error:', error);
    }
}

// دالة إنشاء حساب الحلاق المعدلة
async function barberSignup() {
    const name = document.getElementById('barberName').value.trim();
    const phone = document.getElementById('newBarberPhone').value.trim();
    const password = document.getElementById('newBarberPassword').value;
    const confirmPassword = document.getElementById('confirmBarberPassword').value;
    const errorElement = document.getElementById('barberError');
    
    if (!name || !phone || !password || !confirmPassword) {
        errorElement.textContent = 'جميع الحقول مطلوبة';
        errorElement.classList.remove('hidden');
        return;
    }
    
    if (!/^[0-9]{10,15}$/.test(phone)) {
        errorElement.textContent = 'رقم الهاتف يجب أن يكون بين 10-15 رقمًا';
        errorElement.classList.remove('hidden');
        return;
    }
    
    if (password.length < 6) {
        errorElement.textContent = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        errorElement.classList.remove('hidden');
        return;
    }
    
    if (password !== confirmPassword) {
        errorElement.textContent = 'كلمتا المرور غير متطابقتين';
        errorElement.classList.remove('hidden');
        return;
    }
    
    try {
        // إنشاء حساب في Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, `${phone}@barber.com`, password);
        const user = userCredential.user;
        
        // حفظ بيانات الحلاق في قاعدة البيانات
        await set(ref(database, 'barbers/' + user.uid), {
            name: name,
            phone: phone,
            status: 'open',
            queue: {},
            type: 'barber', // هذا الحقل ضروري للتمييز بين الحلاقين والعملاء
            createdAt: new Date().toISOString()
        });
        
        // تسجيل الدخول تلقائياً بعد إنشاء الحساب
        currentUser = {
            id: user.uid,
            name: name,
            phone: phone,
            type: 'barber'
        };
        currentUserType = 'barber';
        
        document.getElementById('barberAvatar').textContent = name.charAt(0);
        showBarberDashboard();
        loadBarberQueue();
        
    } catch (error) {
        let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'هذا الرقم مسجل بالفعل، يرجى تسجيل الدخول';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'رقم الهاتف غير صالح';
        }
        
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
        console.error('Signup error:', error);
    }
}

// بقية الدوال (showScreen, showBarberSignup, showBarberLogin, ...) تبقى كما هي

// مراقبة حالة المصادقة المعدلة
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = ref(database, 'barbers/' + user.uid);
            const snapshot = await get(userRef);
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                
                if (userData.type === 'barber') {
                    currentUser = {
                        id: user.uid,
                        name: userData.name,
                        phone: userData.phone,
                        type: 'barber'
                    };
                    currentUserType = 'barber';
                    showBarberDashboard();
                    loadBarberQueue();
                }
            }
        } catch (error) {
            console.error('Auth state error:', error);
            await signOut(auth);
            showScreen('roleSelection');
        }
    } else {
        currentUser = null;
        currentUserType = null;
        showScreen('roleSelection');
    }
});

// جعل الدوال متاحة globally
window.showScreen = showScreen;
window.clientLogin = clientLogin;
window.barberLogin = barberLogin;
window.barberSignup = barberSignup;
window.showBarberSignup = showBarberSignup;
window.showBarberLogin = showBarberLogin;
window.bookAppointment = bookAppointment;
window.completeClient = completeClient;
window.logout = logout;

// تهيئة التطبيق
showScreen('roleSelection');
