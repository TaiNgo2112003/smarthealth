
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc  } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase configuration


// Initialize Firebase
const app = initializeApp(firebaseConfig);
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

// Hàm lấy danh sách cuộc hẹn
async function fetchAppointments() {
    try {
        const querySnapshot = await getDocs(collection(db, "appointments"));
        const appointments = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("Appointments:", appointments);

        // Gọi hàm hiển thị danh sách lịch hẹn
        renderAppointments(appointments);

        // Cập nhật số lượng thống kê
        updateStats(appointments);
    } catch (error) {
        console.error("Error fetching appointments:", error);
    }
}
// Hàm hiển thị danh sách lịch hẹn trên giao diện
function renderAppointments(appointments) {
    const appointmentsList = document.getElementById("appointmentFormAdmin");
    appointmentsList.innerHTML = ""; // Xóa nội dung cũ trước khi thêm mới

    appointments.forEach((appointment, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${appointment.fullName || "Không có tên"}</td>
            <td>${appointment.doctor || "Chưa chọn bác sĩ"}</td>
            <td>${appointment.appointmentDate || "Chưa đặt ngày"}</td>
            <td>${appointment.reason || "Không có lý do"}</td>
            <td class="status" id="status-${appointment.id}">${appointment.status || "Chưa xác nhận"}</td>
            <td>
                <button class="accept-btn">✅ Chấp nhận</button>
                <button class="reject-btn">❌ Từ chối</button>
            </td>
        `;

        // Thêm hàng vào bảng
        appointmentsList.appendChild(row);

        // Gán sự kiện cho hai nút
        row.querySelector(".accept-btn").addEventListener("click", () => updateAppointmentStatus(appointment.id, 'confirmed'));
        row.querySelector(".reject-btn").addEventListener("click", () => updateAppointmentStatus(appointment.id, 'cancelled'));
    });
}


// Hàm cập nhật số liệu thống kê
function updateStats(appointments) {
    document.getElementById("total-appointments").textContent = appointments.length;
    document.getElementById("confirmed-appointments").textContent = appointments.filter(a => a.status === "confirmed").length;
    document.getElementById("pending-appointments").textContent = appointments.filter(a => !a.status || a.status === "pending").length;
    document.getElementById("cancelled-appointments").textContent = appointments.filter(a => a.status === "cancelled").length;
}

// Hàm cập nhật trạng thái cuộc hẹn
async function updateAppointmentStatus(appointmentId, newStatus) {
    try {
        await updateDoc(doc(db, "appointments", appointmentId), { status: newStatus });

        // Cập nhật giao diện ngay sau khi thay đổi trạng thái
        document.getElementById(`status-${appointmentId}`).innerText = newStatus;
        alert(`Cập nhật trạng thái thành ${newStatus}`);
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái:", error);
    }
}


// Gọi fetchAppointments khi trang admin tải
document.addEventListener("DOMContentLoaded", function () {
    fetchAppointments();
});
