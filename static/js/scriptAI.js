document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user_input");
    const sendBtn = document.getElementById("send-btn");
    const clearCacheBtn = document.getElementById("clear-cache-btn");

    // Load tin nhắn cũ từ localStorage khi mở trang
    function loadChatHistory() {
        let messages = JSON.parse(localStorage.getItem("chatHistory")) || [];
        messages.forEach(msg => addMessage(msg.text, msg.sender));
    }

    // Hàm thêm tin nhắn vào khung chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
        messageDiv.innerText = text;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Cuộn xuống tin nhắn mới nhất
    }

    // Xử lý gửi tin nhắn
    chatForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const text = userInput.value.trim();
        if (text === "") return;

        // Hiển thị tin nhắn của người dùng
        addMessage(text, "user");

        // Lưu vào localStorage
        let messages = JSON.parse(localStorage.getItem("chatHistory")) || [];
        messages.push({ text, sender: "user" });
        localStorage.setItem("chatHistory", JSON.stringify(messages));

        // Gửi request lên server
        try {
            let response = await fetch("/chatbox", {
                method: "POST",
                body: new URLSearchParams({ user_input: text }),
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            let result = await response.text();
            let parser = new DOMParser();
            let doc = parser.parseFromString(result, "text/html");
            let botResponseElement = doc.querySelector("#bot-response");
            let botResponse = botResponseElement ? botResponseElement.innerText.trim() : "Xin lỗi, tôi không thể phản hồi ngay lúc này.";

            // Hiển thị phản hồi từ Gemini AI
            addMessage(botResponse, "bot");

            // Lưu phản hồi vào localStorage
            messages.push({ text: botResponse, sender: "bot" });
            localStorage.setItem("chatHistory", JSON.stringify(messages));
        } catch (error) {
            console.error("Lỗi khi gửi tin nhắn:", error);
            addMessage("Lỗi khi kết nối với server!", "bot");
        }

        // Reset ô nhập tin nhắn
        userInput.value = "";
    });

    // Tải lịch sử tin nhắn khi load trang
    loadChatHistory();

    // Xử lý xóa cache
    clearCacheBtn.addEventListener("click", function () {
        // Xóa lịch sử chat khỏi localStorage
        localStorage.removeItem("chatHistory");

        // Xóa nội dung khung chat
        chatBox.innerHTML = "";

        // Xóa cache trình duyệt
        caches.keys().then(function (names) {
            names.forEach(name => caches.delete(name));
        });

        // Xóa cache cục bộ (localStorage + sessionStorage)
        localStorage.clear();
        sessionStorage.clear();

        // Reload lại trang để cập nhật nội dung mới
        location.reload();
    });
});
