
function toggleLeftbar() {
    let leftbar = document.getElementById("leftbar");
    if (leftbar.classList.contains("open")) {
        leftbar.classList.remove("open");
    } else {
        leftbar.classList.add("open");
    }
}

// Thêm hiệu ứng khi cuộn trang
window.addEventListener('scroll', function() {
    const topbar = document.querySelector('.topbar');
    if (window.scrollY > 10) {
        topbar.classList.add('scrolled');
    } else {
        topbar.classList.remove('scrolled');
    }
});

// Xử lý click avatar
document.querySelector('.user-avatar').addEventListener('click', function() {
    // Thêm logic đăng nhập/đăng xuất ở đây
    console.log('Open user dropdown');
});

// Xử lý toggle theme
document.querySelector('.theme-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    // Lưu preference vào localStorage
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('darkTheme', isDark);
});

// Kiểm tra theme khi tải trang
if (localStorage.getItem('darkTheme') === 'true') {
    document.body.classList.add('dark-theme');
}


