// ============================================================================
// FILE: backend/src/utils/similarity.js
// MỤC ĐÍCH: Thuật toán kiểm tra trùng lặp đề tài (Cosine Similarity - UC22)
// Giải thích dễ nhớ: Giống như giáo viên chấm bài văn, tách từng từ trong bài mới
// đem đếm và so sánh với các bài cũ xem giống nhau bao nhiêu phần trăm.
// ============================================================================

// Danh sách các từ nối phổ biến trong tiếng Việt (Stop-words) không mang nhiều ý nghĩa phân biệt
const DANH_SACH_TU_NOI = [
  'và', 'của', 'cho', 'các', 'những', 'một', 'trong', 'với', 'để', 'tại',
  'về', 'từ', 'theo', 'trên', 'dưới', 'khi', 'như', 'là', 'có', 'được',
  'nhằm', 'giúp', 'việc', 'ứng', 'dụng', 'nghiên', 'cứu', 'xây', 'dựng'
];

// BƯỚC 1: Hàm làm sạch câu chữ và tách thành danh sách các từ đơn giản
function tachTuTiengViet(vanBan) {
  // Nếu văn bản rỗng hoặc không có chữ nào thì trả về mảng rỗng ngay
  if (!vanBan) {
    return [];
  }

  // Đổi toàn bộ chữ hoa thành chữ thường (Ví dụ: " Đề Tài " -> " đề tài ")
  let chuThuong = String(vanBan).toLowerCase();

  // Xóa bỏ các dấu câu đặc biệt như dấu phẩy, dấu chấm, ngoặc đơn... thay bằng khoảng trắng
  let daXoaKyTuDacBiet = chuThuong.replace(/[^\p{L}\p{N}\s]/gu, ' ');

  // Cắt chuỗi thành mảng các từ dựa vào khoảng trắng
  let danhSachTuTho = daXoaKyTuDacBiet.split(' ');

  // Tạo một mảng mới để chứa các từ quan trọng sau khi đã lọc bỏ từ thừa
  let danhSachTuSach = [];

  // Duyệt qua từng từ trong mảng thô bằng vòng lặp for cơ bản
  for (let i = 0; i < danhSachTuTho.length; i++) {
    // Lấy từ ở vị trí thứ i và cắt bỏ khoảng trắng thừa hai đầu
    let tuHienTai = danhSachTuTho[i].trim();

    // Chỉ giữ lại từ có độ dài lớn hơn 1 ký tự và không nằm trong danh sách từ nối
    if (tuHienTai.length > 1 && !DANH_SACH_TU_NOI.includes(tuHienTai)) {
      // Đưa từ hợp lệ vào danh sách kết quả
      danhSachTuSach.push(tuHienTai);
    }
  }

  // Trả về danh sách các từ đã làm sạch
  return danhSachTuSach;
}

// BƯỚC 2: Hàm tính công thức toán học Cosine Similarity giữa 2 danh sách từ
function tinhDiemCosine(mangTuA, mangTuB) {
  // Nếu 1 trong 2 văn bản không có từ nào thì độ trùng lặp bằng 0
  if (mangTuA.length === 0 || mangTuB.length === 0) {
    return 0;
  }

  // Tạo đối tượng đếm số lần xuất hiện của từng từ trong văn bản A
  let demTuA = {};
  for (let i = 0; i < mangTuA.length; i++) {
    let tu = mangTuA[i];
    // Nếu từ đã có thì cộng thêm 1, nếu chưa có thì gán bằng 1
    if (demTuA[tu]) {
      demTuA[tu] = demTuA[tu] + 1;
    } else {
      demTuA[tu] = 1;
    }
  }

  // Tạo đối tượng đếm số lần xuất hiện của từng từ trong văn bản B
  let demTuB = {};
  for (let i = 0; i < mangTuB.length; i++) {
    let tu = mangTuB[i];
    // Nếu từ đã có thì cộng thêm 1, nếu chưa có thì gán bằng 1
    if (demTuB[tu]) {
      demTuB[tu] = demTuB[tu] + 1;
    } else {
      demTuB[tu] = 1;
    }
  }

  // Gom tất cả các từ khác nhau của cả A và B vào một danh sách chung không trùng lặp
  let tatCaCacTu = [];
  for (let tu in demTuA) {
    tatCaCacTu.push(tu);
  }
  for (let tu in demTuB) {
    if (!tatCaCacTu.includes(tu)) {
      tatCaCacTu.push(tu);
    }
  }

  // Khởi tạo 3 biến cho công thức Cosine: Tử số (tích vô hướng) và 2 phần mẫu số (độ dài vector)
  let tichVoHuong = 0;
  let tongBinhPhuongA = 0;
  let tongBinhPhuongB = 0;

  // Duyệt qua từng từ trong bộ từ vựng chung để cộng dồn công thức
  for (let i = 0; i < tatCaCacTu.length; i++) {
    let tu = tatCaCacTu[i];
    // Lấy số lần xuất hiện của từ đó ở bài A và bài B (nếu không có thì tính là 0)
    let soLanA = demTuA[tu] || 0;
    let soLanB = demTuB[tu] || 0;

    // Tử số = tổng của (số lần A * số lần B)
    tichVoHuong = tichVoHuong + (soLanA * soLanB);
    // Mẫu số A = tổng bình phương của số lần A
    tongBinhPhuongA = tongBinhPhuongA + (soLanA * soLanA);
    // Mẫu số B = tổng bình phương của số lần B
    tongBinhPhuongB = tongBinhPhuongB + (soLanB * soLanB);
  }

  // Tính mẫu số chung bằng căn bậc hai của A nhân căn bậc hai của B
  let mauSo = Math.sqrt(tongBinhPhuongA) * Math.sqrt(tongBinhPhuongB);

  // Tránh lỗi chia cho 0
  if (mauSo === 0) {
    return 0;
  }

  // Trả về tỷ lệ từ 0 đến 1 (Ví dụ: 0.35 tức là giống nhau 35%)
  return tichVoHuong / mauSo;
}

// BƯỚC 3: Hàm chính quét toàn bộ danh sách đề tài cũ trong Database để tìm đề tài giống nhất
function kiemTraDaoVanDeTai(tenDeTaiMoi, tomTatMoi, danhSachDeTaiCu) {
  // Nếu kho dữ liệu cũ đang trống (chưa có đề tài nào) thì báo an toàn 0% (Luồng 3a UC22)
  if (!danhSachDeTaiCu || danhSachDeTaiCu.length === 0) {
    return {
      isSafe: true,          // An toàn cho phép lưu
      similarityScore: 0,    // Tỷ lệ trùng lặp là 0%
      matchedTopic: null     // Không trùng với đề tài nào
    };
  }

  // Ghép tên đề tài và tóm tắt của đề tài mới lại rồi tách từ
  let tuDeTaiMoi = tachTuTiengViet(tenDeTaiMoi + ' ' + (tomTatMoi || ''));

  // Biến lưu điểm trùng lặp cao nhất tìm được
  let diemCaoNhat = 0;
  // Biến lưu lại đề tài cũ nào giống với đề tài mới nhất
  let deTaiTrungNhat = null;

  // Dùng vòng lặp for quét qua từng đề tài cũ trong cơ sở dữ liệu
  for (let i = 0; i < danhSachDeTaiCu.length; i++) {
    let deTaiCu = danhSachDeTaiCu[i];
    // Tách từ của đề tài cũ thứ i
    let tuDeTaiCu = tachTuTiengViet((deTaiCu.title || '') + ' ' + (deTaiCu.summary || ''));

    // Tính điểm tương đồng Cosine và nhân với 100 để đổi ra phần trăm (%)
    let tyLePhanTram = tinhDiemCosine(tuDeTaiMoi, tuDeTaiCu) * 100;
    // Làm tròn 1 chữ số thập phân (Ví dụ: 32.456 -> 32.5)
    tyLePhanTram = Math.round(tyLePhanTram * 10) / 10;

    // Nếu tỷ lệ này lớn hơn kỷ lục hiện tại thì cập nhật kỷ lục mới
    if (tyLePhanTram > diemCaoNhat) {
      diemCaoNhat = tyLePhanTram;
      deTaiTrungNhat = deTaiCu;
    }
  }

  // Theo quy tắc nghiệp vụ Rule 3 & UC22: Dưới 30% là An toàn (true), từ 30% trở lên là Chặn (false)
  let ketQuaAnToan = diemCaoNhat < 30;

  // Trả kết quả về cho Controller xử lý
  return {
    isSafe: ketQuaAnToan,
    similarityScore: diemCaoNhat,
    matchedTopic: deTaiTrungNhat
  };
}

// Xuất hàm ra để các file khác trong Backend có thể gọi sử dụng
module.exports = {
  tachTuTiengViet,
  tinhDiemCosine,
  kiemTraDaoVanDeTai
};
