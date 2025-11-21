document.addEventListener("DOMContentLoaded", () => {
    // --- FUNGSI NAVIGASI TAB UTAMA ---
    const navLinks = document.querySelectorAll(".nav-link");
    const pages = document.querySelectorAll(".page");

    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            const targetPage = link.getAttribute("data-target");

            // Hapus kelas active dari semua link dan halaman
            navLinks.forEach((l) => l.classList.remove("active"));
            pages.forEach((p) => p.classList.remove("active"));

            // Tambahkan kelas active ke link dan halaman yang diklik
            link.classList.add("active");
            document.getElementById(targetPage).classList.add("active");
        });
    });

    // --- FUNGSI NAVIGASI DOKUMENTASI ---
    const docLinks = document.querySelectorAll('.doc-link');
    const docContents = document.querySelectorAll('.doc-content');

    docLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetContent = link.getAttribute('data-target');

            // Hapus kelas active dari semua link dan konten
            docLinks.forEach(l => l.classList.remove('active'));
            docContents.forEach(c => c.classList.remove('active'));

            // Tambahkan kelas active ke link dan konten yang diklik
            link.classList.add('active');
            document.getElementById(targetContent).classList.add('active');
        });
    });
});
