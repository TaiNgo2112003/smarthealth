
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
    signOut,
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs , query, where} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase configuration


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// Display error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

window.handleLogin = async function () {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User logged in:', user);

        // Cập nhật UI ngay lập tức
        const userNameDisplay = document.getElementById('register-display-name');
        userNameDisplay.textContent = user.email.split('@')[0];
        if (user.email.includes('admin')) {
            window.location.href = "/admin_dashboard";
        } else {
            window.location.href = "/";
        }
    } catch (error) {
        showError(getAuthErrorMessage(error));
    }
};
onAuthStateChanged(auth, (user) => {
    const userNameDisplay = document.getElementById('displayName');
    const userAvatarImg = document.getElementById('user-avatar-img');
    const logoutButton = document.getElementById('logout-btn');

    if (!userNameDisplay || !userAvatarImg || !logoutButton) {
        console.warn('Không tìm thấy phần tử hiển thị user, avatar hoặc logout!');
        return;
    }

    if (user) {
        userNameDisplay.textContent = user.displayName || user.email.split('@')[0];
        userNameDisplay.href = "#";

        if (user.photoURL) {
            userAvatarImg.src = user.photoURL;
        }

        logoutButton.style.display = "inline-block";

        // Gọi hàm lấy hồ sơ y tế sau khi người dùng đã đăng nhập
        getMedicalRecordByUserId(); // Đảm bảo chỉ gọi khi đã có người dùng

    } else {
        userNameDisplay.textContent = "Đăng nhập";
        userNameDisplay.href = loginUrl;
        userAvatarImg.src = "/static/images/default-avatar.png";

        logoutButton.style.display = "none";
    }
    
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("User signed out");
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    });
});




// Hàm chuyển đổi mã lỗi Firebase thành thông báo dễ hiểu
function getAuthErrorMessage(error) {
    const errorCode = error.code || '';
    const errorMap = {
        'auth/invalid-email': 'Email không hợp lệ',
        'auth/user-disabled': 'Tài khoản đã bị vô hiệu hóa',
        'auth/user-not-found': 'Không tìm thấy tài khoản',
        'auth/wrong-password': 'Mật khẩu không chính xác',
        'auth/email-already-in-use': 'Email đã được sử dụng',
        'auth/operation-not-allowed': 'Phương thức đăng nhập không được kích hoạt',
        'auth/weak-password': 'Mật khẩu quá yếu (ít nhất 6 ký tự)',
        'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau',
        'auth/account-exists-with-different-credential': 'Email đã được đăng ký với phương thức khác',
        'auth/popup-closed-by-user': 'Cửa sổ đăng nhập đã bị đóng',
        'auth/unauthorized-domain': 'Domain chưa được cấu hình trong Firebase Console',
        'auth/cancelled-popup-request': 'Yêu cầu đăng nhập bị hủy',
        'auth/popup-blocked': 'Cửa sổ đăng nhập bị chặn. Vui lòng cho phép popup'
    };

    // Trả về thông báo tương ứng hoặc thông báo mặc định
    return errorMap[errorCode] || `Lỗi đăng nhập: ${error.message || errorCode}`;
}

// firebase.js

async function getMedicalRecordByUserId() {
    if (!auth.currentUser) {
        alert("Bạn cần đăng nhập trước khi xem hồ sơ!");
        return;
    }

    const user = auth.currentUser;
    console.log("Getting medical record for user:", user.uid);

    try {
        const q = query(
            collection(db, "medicalRecords"),
            where("userId", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            alert("Không tìm thấy hồ sơ y tế!");
            return;
        }

        const form = document.getElementById("medicalRecordForm");
        if (!form) {
            console.warn("Form medicalRecordForm chưa tồn tại, không thể đổ dữ liệu.");
            return;
        }

        const data = querySnapshot.docs[0].data();
        console.log("Medical Record Data:", data);

        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || "";
        };

        // Đổ dữ liệu vào form
        setValue("fullName", data.fullName);
        setValue("patientId", data.patientId);
        setValue("dob", data.dob);
        setValue("gender", data.gender);
        setValue("age", data.age);
        setValue("address", data.address);
        setValue("phone", data.phone);
        setValue("insurance", data.insurance);
        setValue("admissionDate", data.admissionDate);
        setValue("department", data.department);
        setValue("reason", data.reason);
        setValue("medicalHistory", data.medicalHistory);
        setValue("familyHistory", data.familyHistory);
        setValue("currentMedication", data.currentMedication);
        setValue("temperature", data.temperature);
        setValue("pulse", data.pulse);
        setValue("bloodPressure", data.bloodPressure);
        setValue("respiratoryRate", data.respiratoryRate);
        setValue("spo2", data.spo2);
        setValue("physicalExam", data.physicalExam);
        setValue("bloodTest", data.bloodTest);
        setValue("urineTest", data.urineTest);
        setValue("otherTest", data.otherTest);
        setValue("imaging", data.imaging);
        setValue("functionalTest", data.functionalTest);
        setValue("diagnosis", data.diagnosis);
        setValue("treatment", data.treatment);
        setValue("progress", data.progress);
        setValue("dischargePlan", data.dischargePlan);
        setValue("doctor", data.doctor);
        setValue("recordDate", data.recordDate);

    } catch (error) {
        console.error("Error fetching medical record: ", error.code, error.message, error.stack);
        alert("Lỗi khi lấy hồ sơ y tế. Vui lòng thử lại.");
    }
}



document.getElementById("medicalRecordForm")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!auth.currentUser) {
        alert("Bạn cần đăng nhập trước khi tải lên hồ sơ!");
        return;
    }

    const user = auth.currentUser;
    console.log("User logged in and save medical rerord:", user);
    const medicalRecordForm = {
        userId: user.uid,
        fullName: document.getElementById("fullName").value,
        patientId: document.getElementById("patientId").value,
        dob: document.getElementById("dob").value,
        gender: document.getElementById("gender").value,
        age: parseInt(document.getElementById("age").value || 0),
        address: document.getElementById("address").value,
        phone: document.getElementById("phone").value,
        insurance: document.getElementById("insurance").value,
        admissionDate: document.getElementById("admissionDate").value,
        department: document.getElementById("department").value,

        reason: document.getElementById("reason").value,
        medicalHistory: document.getElementById("medicalHistory").value,
        familyHistory: document.getElementById("familyHistory").value,
        currentMedication: document.getElementById("currentMedication").value,
        temperature: parseFloat(document.getElementById("temperature").value || 0),
        pulse: parseInt(document.getElementById("pulse").value || 0),
        bloodPressure: document.getElementById("bloodPressure").value,
        respiratoryRate: parseInt(document.getElementById("respiratoryRate").value || 0),
        spo2: parseInt(document.getElementById("spo2").value || 0),
        physicalExam: document.getElementById("physicalExam").value,

        bloodTest: document.getElementById("bloodTest").value,
        urineTest: document.getElementById("urineTest").value,
        otherTest: document.getElementById("otherTest").value,
        imaging: document.getElementById("imaging").value,
        functionalTest: document.getElementById("functionalTest").value,

        diagnosis: document.getElementById("diagnosis").value,
        treatment: document.getElementById("treatment").value,
        progress: document.getElementById("progress").value,
        dischargePlan: document.getElementById("dischargePlan").value,
        doctor: document.getElementById("doctor").value,
        recordDate: document.getElementById("recordDate").value,

        updatedAt: new Date()
    };

    console.log("Medical Record Data:", medicalRecordForm);

    try {
        // Thêm dữ liệu vào Firestore
        await addDoc(collection(db, "medicalRecords"), medicalRecordForm);
        alert("Medical record uploaded successfully!");
        // document.getElementById("medicalRecordForm").reset(); // Xóa form sau khi gửi thành công
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Failed to upload medical record. Please try again.");
    }
});
document.getElementById("appointmentForm")?.addEventListener("submit", async function (event) {
    event.preventDefault(); // Ngăn chặn reload trang

    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!auth.currentUser) {
        alert("Bạn cần đăng nhập trước khi đặt lịch!");
        return;
    }

    const user = auth.currentUser;
    console.log("User logged in:", user);
    console.log("User ID:", user.uid);

    // Lấy dữ liệu từ form
    const appointmentData = {
        userId: user.uid, // Lưu ID người dùng
        fullName: document.getElementById("fullName").value,
        phone: document.getElementById("phone").value,
        email: document.getElementById("email").value,
        dob: document.getElementById("dob").value,
        address: document.getElementById("address").value,
        department: document.getElementById("department").value,
        doctor: document.getElementById("doctor").value,
        appointmentDate: document.getElementById("appointmentDate").value,
        appointmentTime: document.getElementById("appointmentTime").value,
        reason: document.getElementById("reason").value,
        hasInsurance: document.getElementById("hasInsurance").checked,
        insuranceProvider: document.getElementById("insuranceProvider").value || "",
        policyNumber: document.getElementById("policyNumber").value || "",
        createdAt: new Date(), // Thêm timestamp
        status: "pending"
    };

    console.log("Appointment Data:", appointmentData);

    try {
        // Thêm dữ liệu vào Firestore zxcasda
        await addDoc(collection(db, "appointments"), appointmentData);
        alert("Appointment booked successfully!");
        document.getElementById("appointmentForm").reset(); // Xóa form sau khi gửi thành công
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Failed to book appointment. Please try again.");
    }
});

// Handle user sign up
window.handleSignUp = async function () {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const name = document.getElementById('register-display-name').value;

    if (password !== confirmPassword) {
        return showError('Mật khẩu không khớp!');
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, {
            displayName: name
        });
        // You can add user name to Firestore or Realtime Database here
        console.log('User registered:', user);

        // Redirect to dashboard or home page
        window.location.href = '/dashboard';
    } catch (error) {
        console.error('Sign up error:', error);
        let errorMessage = 'Đã xảy ra lỗi khi đăng ký';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email đã được sử dụng';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ';
                break;
            case 'auth/weak-password':
                errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
                break;
        }

        showError(errorMessage);
    }
};

// Handle Google Sign-In
window.signInWithGoogle = async function () {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Cập nhật tên hiển thị
        if (user.displayName) {
            document.getElementById('register-display-name').textContent = user.displayName;
        }

        if (user.email.includes('admin')) {
            window.location.href = "/admin_dashboard";
        } else {
            window.location.href = "/";
        }
    } catch (error) {
        showError(getAuthErrorMessage(error));
    }
};
// Switch between login and register forms
window.switchTab = function (tabName) {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(tabName + '-form').classList.add('active');
    event.currentTarget.classList.add('active');
    document.getElementById('error-message').style.display = 'none';
};
