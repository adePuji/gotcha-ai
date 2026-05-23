import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// =================================================================
// GOTCHA.AI INTERAKTIF ENGINE - CORE LOGIC V4 (FINAL REVOLUTION KUIS)
// =================================================================

// State Management Global untuk Fitur Baru (Roadmap, Kuis, History)
let currentMateri = "";
let examTimer = null;
let examSeconds = 180; 
let examQuestions = [];
let userAnswers = [];

// Fungsi otomatis jalan pas halaman pertama kali dibuka browser
document.addEventListener('DOMContentLoaded', () => {
    initHistory();
    setupEventListeners();
});

// Event Listener Utama untuk Form Submit Pencarian
function setupEventListeners() {
    document.getElementById('main-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await dekonstruksiMateri();
    });
}

// Fungsi Sliding Panel untuk Membuka / Menutup Sidebar History
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebarHistory');
    sidebar.classList.toggle('-translate-x-full');
}

// Custom Toast Notification System Bawaan Lu yang Mewah
function showToast(message, type = "info") {
    const toast = document.getElementById('custom-toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    if (!toast || !toastMessage || !toastIcon) return;

    toastMessage.innerText = message;
    
    if (type === "success") {
        toast.style.borderColor = "rgba(16, 185, 129, 0.3)";
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i>';
    } else if (type === "error") {
        toast.style.borderColor = "rgba(239, 68, 68, 0.3)";
        toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-rose-500 text-lg"></i>';
    } else {
        toast.style.borderColor = "rgba(245, 158, 11, 0.3)";
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-info text-amber-500 text-lg"></i>';
    }

    toast.style.transform = "translateY(0px)";
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.transform = "translateY(-120px)";
        toast.style.opacity = "0";
    }, 3500);
}

// Custom Markdown Parser Bawaan Lu agar Text Bintang-bintang Jadi Bold Cantik
function parseSimpleMarkdown(text) {
    if (!text) return "";
    let parsed = text;
    parsed = parsed.replace(/\*\*(.*?)\*\//g, '<strong class="text-amber-400 font-bold">$1</strong>');
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-400 font-bold">$1</strong>');
    parsed = parsed.replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-5 list-disc text-slate-300 my-1">$1</li>');
    parsed = parsed.replace(/\n/g, "<br>");
    return parsed;
}

// Fetch Engine Pintar (Nembak Backend Mini Vercel & Bongkar Kiriman Gemini 3.5 Flash)
async function fetchGeminiWithRetry(systemPrompt, userQuery) {
    const url = `/api/gemini`; 
    
    let delay = 1000;
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemPrompt, userQuery })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log("Data sukses didapat dari Vercel:", result);

                let textExtract = "";
                if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    textExtract = result.candidates[0].content.parts[0].text;
                } else if (result.text) {
                    textExtract = result.text;
                }

                if (textExtract) return textExtract;
            }
        } catch (e) {
            console.error(`Percobaan ke-${i + 1} mengekstrak data gagal:`, e);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
    }
    throw new Error("Gagal memproses penjelasan otak AI. Pastikan API Key di Secrets Vercel lu valid ya cantikk!");
}

// Alur Fungsi Utama saat Tombol "Terjemahkan Materi Sekarang" Di-submit
async function dekonstruksiMateri() {
    const textInput = document.getElementById('text-input');
    const btnSubmit = document.getElementById('btn-submit');
    const resultSection = document.getElementById('result-section');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const displayResult = document.getElementById('display-result');
    const resultMetaLevel = document.getElementById('result-meta-level');

    const promptText = textInput.value.trim();
    const selectedLevel = document.querySelector('input[name="education-level"]:checked')?.value;

    if (!promptText || !selectedLevel) {
        showToast("Pilih level dan isi teks materinya dulu ya!", "error");
        return;
    }

    currentMateri = promptText;
    saveToHistory(promptText);

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span>Membongkar Otak AI...</span> <i class="fa-solid fa-brain animate-bounce"></i>`;
    
    displayResult.innerHTML = ""; 
    resultSection.classList.remove('hidden');
    resultSection.style.setProperty('display', 'block', 'important');
    loadingSkeleton.classList.remove('hidden'); 

    document.getElementById('quickRefineContainer').classList.add('hidden');
    document.getElementById('roadmapOptionBox').classList.add('hidden');

    const levelNames = {
        "sd": "Anak Sekolah Dasar (SD)",
        "smp": "Pelajar Sekolah Menengah Pertama (SMP)",
        "sma-smk": "Pelajar SMA / SMK (Cheat Sheet)",
        "mahasiswa": "Analisis Berbobot Tingkat Mahasiswa"
    };
    resultMetaLevel.innerText = `Level Penjelasan: ${levelNames[selectedLevel]}`;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

    let systemPrompt = "";
    if (selectedLevel === "sd") {
        systemPrompt = "Ubah materi berikut menjadi penjelasan yang SANGAT MUDAH untuk anak SD umur 7-10 tahun. Gunakan analogi cerita seru atau benda konkrit di sekitar kita. Gunakan bahasa yang ramah, asyik, ceria, dan hindari istilah ilmiah yang rumit.";
    } else if (selectedLevel === "smp") {
        systemPrompt = "Ubah materi berikut menjadi penjelasan yang jelas dan mudah dipahami anak SMP. Fokus pada poin-poin esensial, definisi dasar yang kuat, serta contoh nyata yang relevan dengan pelajaran sekolah mereka.";
    } else if (selectedLevel === "sma-smk") {
        systemPrompt = "Ubah materi berikut menjadi ringkasan taktik belajar (Cheat Sheet) yang praktis buat anak SMA/SMK. Berikan rumus kilat jika ada, langkah-langkah kerja yang aplikatif, dan logika dasarnya agar gampang lulus ujian.";
    } else if (selectedLevel === "mahasiswa") {
        systemPrompt = "Ubah materi berikut menjadi Analisis Kritis berbobot untuk tingkat Mahasiswa Kuliah. Bedah metodologinya, korelasi teoritisnya, dan sajikan 3 poin pertanyaan tajam yang bisa dipakai sebagai bahan diskusi kritis di kelas.";
    }

    systemPrompt += " Di baris paling awal jawabanmu, WAJIB tampilkan 3 baris list materi dasar bertuliskan judul 'Prasyarat Belajar / Roadmap Singkat' sebelum menjelaskan materi intinya.";

    try {
        const aiResult = await fetchGeminiWithRetry(systemPrompt, promptText);
        loadingSkeleton.classList.add('hidden');

        if (aiResult) {
            displayResult.innerHTML = parseSimpleMarkdown(aiResult);
            showToast("Materi sukses didekonstruksi!", "success");
            
            document.getElementById('quickRefineContainer').classList.remove('hidden');
            document.getElementById('roadmapOptionBox').classList.remove('hidden');
        } else {
            showToast("Google AI memproses dengan kosong, coba lagi ya!", "error");
            resultSection.classList.add('hidden');
        }
    } catch (error) {
        showToast(error.message, "error");
        loadingSkeleton.classList.add('hidden');
        resultSection.classList.add('hidden');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Terjemahkan Materi Sekarang</span> <i class="fa-solid fa-wand-magic-sparkles text-xs sm:text-sm"></i>`;
    }
}

// FITUR QUICK REFINE MODE (MODIFIKASI INSTAN)
window.refineMateri = async function(mode) {
    const displayResult = document.getElementById('display-result');
    if (!currentMateri) return showToast("Belum ada materi untuk diubah!", "error");
    showToast(`Merombak penjelasan ke mode ${mode}...`, "info");
    
    let promptTambahan = "";
    if (mode === 'gampang') promptTambahan = `Jelaskan kembali materi "${currentMateri}" dengan kosakata yang SANGAT MUDAH dimengerti anak kecil.`;
    if (mode === 'singkat') promptTambahan = `Rangkum materi "${currentMateri}" secara SUPER SINGKAT, padat, langsung to the point berupa poin esensial saja.`;
    if (mode === 'analogi') promptTambahan = `Gubah materi "${currentMateri}" sepenuhnya menggunakan cerita analogi imajinatif atau perumpamaan konkret.`;
    if (mode === 'detail') promptTambahan = `Bedah materi "${currentMateri}" secara mendalam, rinci, lengkap dengan komponen teoritisnya secara detail.`;

    try {
        const aiResult = await fetchGeminiWithRetry("Kamu adalah asisten pengubah gaya bahasa.", promptTambahan);
        if (aiResult) {
            displayResult.innerHTML = parseSimpleMarkdown(aiResult);
            showToast("Sukses mengubah gaya materi!", "success");
        }
    } catch (e) {
        showToast("Gagal memodifikasi teks, coba lagi cantikk!", "error");
    }
}

// FITUR ROADMAP GENERATOR DETAIL MINGGUAN
window.mintaRoadmapDetail = async function() {
    const displayResult = document.getElementById('display-result');
    document.getElementById('roadmapOptionBox').classList.add('hidden');
    showToast("Meracik peta kurikulum roadmap belajarmu...", "info");
    
    try {
        const aiResult = await fetchGeminiWithRetry("Kamu adalah pakar penyusun roadmap belajar terstruktur.", `Buatkan susunan roadmap panduan belajar mingguan (Week 1 sampai Week 4) yang sangat jelas, terstruktur, dan gampang diikuti untuk menguasai materi: ${currentMateri}`);
        if (aiResult) {
            displayResult.innerHTML = parseSimpleMarkdown(aiResult);
            showToast("Roadmap sukses dibuat!", "success");
        }
    } catch (e) {
        showToast("Gagal membuat roadmap belajar.", "error");
    }
}

// FITUR ENGINE UJIAN 3 MENIT INTERAKTIF
window.mulaiUjian = async function() {
    if (!currentMateri) return showToast("Cari materi dulu baru bisa ujian!", "error");
    showToast("Gemini sedang memformulasikan soal ujian...", "info");

    const promptKuis = `Buatkan 5 soal kuis pilihan ganda mengenai materi "${currentMateri}". Anda WAJIB menjawab HANYA dengan format teks JSON murni mengikuti struktur persis seperti ini: {"questions": [{"q": "Teks pertanyaan?", "options": ["opsi 0", "opsi 1", "opsi 2", "opsi 3"], "answer": 0}]}. Isikan field 'answer' dengan angka indeks 0 sampai 3 yang menjadi jawaban benar. Jangan berikan teks pembuka atau penutup markdown!`;

    try {
        const aiResult = await fetchGeminiWithRetry("Kamu adalah mesin pembuat kuis berformat JSON murni.", promptKuis);
        const cleanJson = aiResult.replace(/```json/g, '').replace(/```/g, '').trim();
        examQuestions = JSON.parse(cleanJson).questions;
        
        userAnswers = new Array(examQuestions.length).fill(null);
        examSeconds = 180; 
        document.getElementById('examModal').classList.remove('hidden');

        // JALUR PENYELAMAT: Daftarkan fungsi penangkap klik kuis ke ranah Global Window
        window.simpanJawabanKuis = function(soalIdx, opsiIdx) {
            userAnswers[soalIdx] = opsiIdx;
            console.log(`Jawaban soal ke-${soalIdx + 1} terekam: opsi indeks ${opsiIdx}`);
        };
        
        let htmlContent = "";
        examQuestions.forEach((q, qIdx) => {
            htmlContent += `
                <div class="mb-4 bg-white/[0.02] p-4 rounded-xl border border-white/5 text-left space-y-2">
                    <p class="text-xs sm:text-sm font-bold text-white">${qIdx + 1}. ${q.q}</p>
                    <div class="flex flex-col gap-2 text-xs text-slate-300">
                        ${q.options.map((opt, oIdx) => `
                            <label class="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-warm border border-transparent hover:border-white/5">
                                <input type="radio" name="soal_${qIdx}" value="${oIdx}" onchange="window.simpanJawabanKuis(${qIdx}, ${oIdx})" class="accent-amber-400">
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        document.getElementById('quizQuestionsContainer').innerHTML = htmlContent;

        clearInterval(examTimer);
        examTimer = setInterval(() => {
            examSeconds--;
            let m = Math.floor(examSeconds / 60);
            let s = examSeconds % 60;
            document.getElementById('examTimerDisplay').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
            
            if (examSeconds <= 0) {
                clearInterval(examTimer);
                selesaiUjian(); // Jika waktu habis, otomatis hitung jawaban seadanya
                showToast("Waktu kuis habis! Jawaban otomatis terkirim.", "info");
            }
        }, 1000);

    } catch (e) {
        showToast("Gagal merelasikan kuis, klik tombol ujian sekali lagi lee!", "error");
    }
}

// FUNGSI HITUNG SKOR KUIS (FIX ANTIPELURU SKOR 0 & KONDISI WAKTU HABIS)
window.selesaiUjian = function() {
    clearInterval(examTimer);
    let skor = 0;
    
    examQuestions.forEach((q, idx) => {
        // Deteksi kecocokan menggunakan konversi angka murni Number()
        if (userAnswers[idx] !== null && Number(userAnswers[idx]) == q.answer) { 
            skor += 20; // 1 soal betul = 20 poin
        } 
    });
    
    document.getElementById('examModal').classList.add('hidden');
    
    // Notifikasi Pop-up Kemenangan Nilai Akurat Lu
    alert(`🎯 UJIAN SELESAI 🎯\n\nSkor Pemahaman Kamu: ${skor} / 100\n\nKlik OK untuk kembali merangkum materi bersama Gotcha.ai.`);
    showToast(`Ujian Selesai! Skor kamu: ${skor}`, "success");
}

// FITUR ENGINE RIWAYAT (LOCAL STORAGE)
function saveToHistory(query) {
    let history = JSON.parse(localStorage.getItem('gotcha_history_v2')) || [];
    if (!history.includes(query)) {
        history.unshift(query);
        if (history.length > 10) history.pop(); 
        localStorage.setItem('gotcha_history_v2', JSON.stringify(history));
        initHistory();
    }
}

function initHistory() {
    let history = JSON.parse(localStorage.getItem('gotcha_history_v2')) || [];
    const container = document.getElementById('historyList');
    
    if (history.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-600 italic text-center mt-4">Belum ada riwayat.</p>`;
        return;
    }
    
    container.innerHTML = history.map(item => `
        <button type="button" onclick="loadFromHistory('${item}')" 
            class="w-full text-left bg-white/[0.02] hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 text-xs py-2 px-3 rounded-xl border border-white/5 truncate">
            🔍 ${item}
        </button>
    `).join('');
}

window.loadFromHistory = function(query) {
    const textInput = document.getElementById('text-input');
    textInput.value = query;
    document.getElementById('char-counter').innerText = `${query.length} Karakter`;
    toggleSidebar(); 
    dekonstruksiMateri();
}

// FITUR PREMIUM COPY TO CLIPBOARD
document.getElementById('btn-copy').addEventListener('click', () => {
    const displayResult = document.getElementById('display-result');
    const btnCopy = document.getElementById('btn-copy');
    const rawText = displayResult.innerText;
    if (!rawText) return;

    const textareaDummy = document.createElement("textarea");
    textareaDummy.value = rawText;
    document.body.appendChild(textareaDummy);
    textareaDummy.select();
    document.execCommand("copy");
    document.body.removeChild(textareaDummy);

    const icon = btnCopy.querySelector('i');
    const textSpan = btnCopy.querySelector('span');
    
    icon.className = "fa-solid fa-circle-check text-emerald-400";
    textSpan.innerText = "Tersalin!";
    btnCopy.classList.add('border-emerald-500/30', 'bg-emerald-500/5');

    showToast("Hasil penjelasan berhasil disalin ke clipboard!", "success");

    setTimeout(() => {
        icon.className = "fa-regular fa-copy";
        textSpan.innerText = "Salin";
        btnCopy.classList.remove('border-emerald-500/30', 'bg-emerald-500/5');
    }, 2500);
});