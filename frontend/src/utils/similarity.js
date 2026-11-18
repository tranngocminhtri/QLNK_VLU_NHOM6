// =========================================================================
// THUẬT TOÁN KIỂM TRA TRÙNG LẶP ĐỀ TÀI COSINE SIMILARITY (UC22)
// Ngưỡng an toàn: dưới 30% | Ngưỡng cảnh báo đỏ và chặn nộp: từ 30% trở lên
// =========================================================================

// Khởi tạo danh sách các hư từ tiếng Việt (Stop-words) phổ biến cần lược bỏ khi so sánh
const DANH_SACH_HU_TU = [
  'và', 'của', 'cho', 'các', 'những', 'một', 'trong', 'với', 'để', 'tại',
  'về', 'từ', 'theo', 'trên', 'dưới', 'khi', 'như', 'là', 'có', 'được',
  'bằng', 'qua', 'đến', 'vào', 'ra', 'lên', 'xuống', 'này', 'đó', 'kia',
  'nhằm', 'giúp', 'việc', 'ứng', 'dụng', 'nghiên', 'cứu', 'xây', 'dựng',
  'phát', 'triển', 'hỗ', 'trợ', 'trường', 'đại', 'học', 'văn', 'lang',
];

// Hàm bước 1: Làm sạch chuỗi văn bản tiếng Việt và tách thành mảng các từ khóa
export function preprocessVietnameseText(text = '') {
  // Nếu dữ liệu đầu vào bị rỗng hoặc không phải kiểu chuỗi thì trả về mảng rỗng
  if (!text || typeof text !== 'string') {
    // Trả về danh sách từ rỗng
    return [];
  }

  // Chuyển toàn bộ chữ hoa thành chữ thường để so sánh chính xác
  let chuoiDaLamSach = text.toLowerCase();
  // Thay thế các ký tự dấu câu đặc biệt phổ biến bằng khoảng trắng
  chuoiDaLamSach = chuoiDaLamSach.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'[\]\\|<>+@]/g, ' ');
  // Gộp nhiều khoảng trắng liên tiếp thành 1 khoảng trắng duy nhất và cắt khoảng trắng 2 đầu
  chuoiDaLamSach = chuoiDaLamSach.replace(/\s+/g, ' ').trim();

  // Nếu sau khi làm sạch mà chuỗi rỗng thì trả về mảng rỗng
  if (chuoiDaLamSach.length === 0) {
    // Trả về mảng rỗng
    return [];
  }

  // Cắt chuỗi thành từng từ đơn dựa vào dấu cách
  const mangTuGoc = chuoiDaLamSach.split(' ');
  // Tạo mảng lưu các từ có độ dài lớn hơn 1 ký tự
  const mangTuHopLe = [];

  // Duyệt qua từng từ trong mảng từ gốc bằng vòng lặp for cơ bản
  for (let i = 0; i < mangTuGoc.length; i++) {
    // Lấy từ ở vị trí thứ i
    const tuHienTai = mangTuGoc[i];
    // Nếu từ có từ 2 ký tự trở lên thì mới giữ lại
    if (tuHienTai.length > 1) {
      // Đưa từ vào mảng hợp lệ
      mangTuHopLe.push(tuHienTai);
    }
  }

  // Tạo mảng lưu các từ khóa quan trọng sau khi đã bỏ hư từ (stop-words)
  const mangTuKhoa = [];
  // Duyệt qua từng từ hợp lệ để kiểm tra xem có nằm trong danh sách hư từ không
  for (let i = 0; i < mangTuHopLe.length; i++) {
    // Lấy từ cần kiểm tra
    const tuCanKiemTra = mangTuHopLe[i];
    // Kiểm tra xem từ này có nằm trong mảng DANH_SACH_HU_TU hay không
    const laHuTu = DANH_SACH_HU_TU.includes(tuCanKiemTra);
    // Nếu không phải là hư từ thì mới giữ lại
    if (laHuTu === false) {
      // Thêm từ khóa vào danh sách
      mangTuKhoa.push(tuCanKiemTra);
    }
  }

  // Nếu lọc xong mà vẫn còn từ khóa thì dùng mảng đã lọc, ngược lại dùng mảng từ hợp lệ ban đầu
  const danhSachTuDon = mangTuKhoa.length > 0 ? mangTuKhoa : mangTuHopLe;

  // Tạo mảng kết quả cuối cùng bao gồm cả từ đơn và cụm 2 từ liền kề (bigram)
  const ketQuaTokens = [];
  // Đưa toàn bộ từ đơn vào mảng kết quả
  for (let i = 0; i < danhSachTuDon.length; i++) {
    // Thêm từng từ đơn vào mảng
    ketQuaTokens.push(danhSachTuDon[i]);
  }

  // Ghép thêm các cặp 2 từ đứng cạnh nhau (ví dụ: "trí_tuệ", "nhân_tạo") để bắt sát nghĩa tiếng Việt
  for (let i = 0; i < danhSachTuDon.length - 1; i++) {
    // Nối từ thứ i và từ thứ i+1 bằng dấu gạch dưới
    const cumHaiTu = danhSachTuDon[i] + '_' + danhSachTuDon[i + 1];
    // Đưa cụm 2 từ vào mảng kết quả
    ketQuaTokens.push(cumHaiTu);
  }

  // Trả về danh sách các từ khóa đặc trưng đã xử lý xong
  return ketQuaTokens;
}

// Hàm bước 2: Tính toán độ tương đồng góc Cosine giữa 2 danh sách từ khóa A và B
export function computeCosineSimilarity(tokensA, tokensB) {
  // Nếu 1 trong 2 danh sách từ khóa bị rỗng thì độ trùng lặp bằng 0
  if (!tokensA || !tokensB || tokensA.length === 0 || tokensB.length === 0) {
    // Trả về kết quả bằng 0
    return 0;
  }

  // Tạo đối tượng đếm số lần xuất hiện của từng từ trong văn bản A
  const bangDemA = {};
  // Tạo đối tượng đếm số lần xuất hiện của từng từ trong văn bản B
  const bangDemB = {};
  // Tạo mảng chứa tất cả các từ vựng khác nhau xuất hiện ở cả A và B
  const tapTuVungChung = [];

  // Duyệt qua từng từ trong danh sách A
  for (let i = 0; i < tokensA.length; i++) {
    // Lấy từ hiện tại trong A
    const tu = tokensA[i];
    // Tăng số lần xuất hiện của từ đó trong bảng đếm A thêm 1
    bangDemA[tu] = (bangDemA[tu] || 0) + 1;
    // Nếu từ này chưa có trong tập từ vựng chung thì thêm vào
    if (tapTuVungChung.includes(tu) === false) {
      // Thêm vào mảng từ vựng chung
      tapTuVungChung.push(tu);
    }
  }

  // Duyệt qua từng từ trong danh sách B
  for (let i = 0; i < tokensB.length; i++) {
    // Lấy từ hiện tại trong B
    const tu = tokensB[i];
    // Tăng số lần xuất hiện của từ đó trong bảng đếm B thêm 1
    bangDemB[tu] = (bangDemB[tu] || 0) + 1;
    // Nếu từ này chưa có trong tập từ vựng chung thì thêm vào
    if (tapTuVungChung.includes(tu) === false) {
      // Thêm vào mảng từ vựng chung
      tapTuVungChung.push(tu);
    }
  }

  // Khởi tạo biến tính tích vô hướng của 2 vector (Tử số: Tổng của A[i] * B[i])
  let tichVoHuong = 0;
  // Khởi tạo biến tính tổng bình phương độ dài vector A
  let tongBinhPhuongA = 0;
  // Khởi tạo biến tính tổng bình phương độ dài vector B
  let tongBinhPhuongB = 0;

  // Duyệt qua từng từ trong tập từ vựng chung để áp dụng công thức toán học Cosine
  for (let i = 0; i < tapTuVungChung.length; i++) {
    // Lấy từ vựng thứ i
    const tuVung = tapTuVungChung[i];
    // Lấy tần suất xuất hiện của từ đó trong văn bản A (nếu không có thì bằng 0)
    const soLanA = bangDemA[tuVung] || 0;
    // Lấy tần suất xuất hiện của từ đó trong văn bản B (nếu không có thì bằng 0)
    const soLanB = bangDemB[tuVung] || 0;

    // Cộng dồn tích (soLanA * soLanB) vào tử số
    tichVoHuong = tichVoHuong + soLanA * soLanB;
    // Cộng dồn bình phương tần suất A vào mẫu số
    tongBinhPhuongA = tongBinhPhuongA + soLanA * soLanA;
    // Cộng dồn bình phương tần suất B vào mẫu số
    tongBinhPhuongB = tongBinhPhuongB + soLanB * soLanB;
  }

  // Nếu 1 trong 2 tổng bình phương bằng 0 thì trả về 0 để tránh lỗi chia cho số 0
  if (tongBinhPhuongA === 0 || tongBinhPhuongB === 0) {
    // Trả về 0
    return 0;
  }

  // Tính mẫu số bằng tích căn bậc hai của 2 tổng bình phương
  const mauSo = Math.sqrt(tongBinhPhuongA) * Math.sqrt(tongBinhPhuongB);
  // Trả về giá trị Cosine nằm trong khoảng từ 0 đến 1
  return tichVoHuong / mauSo;
}

// Hàm bước 3: Đối chiếu đề tài mới với toàn bộ kho đề tài hiện có trong hệ thống
export function checkTopicSimilarity(
  newTitle = '',
  newSummary = '',
  existingTopics = [],
  excludeTopicId = null
) {
  // Nếu kho đề tài hiện tại đang trống thì chắc chắn an toàn (0% trùng lặp)
  if (!existingTopics || existingTopics.length === 0) {
    // Trả về kết quả an toàn tuyệt đối
    return {
      isSafe: true,
      percentage: 0,
      maxScore: 0,
      matchedTopic: null,
      topMatches: [],
    };
  }

  // Tách từ khóa cho phần Tên đề tài mới
  const tuKhoaTieuDeMoi = preprocessVietnameseText(newTitle);
  // Tách từ khóa cho cả Tên đề tài và Tóm tắt đề tài mới
  const tuKhoaTongHopMoi = preprocessVietnameseText(newTitle + ' ' + newTitle + ' ' + newSummary);

  // Biến lưu tỷ lệ phần trăm trùng lặp cao nhất tìm thấy
  let diemTrungCaoNhat = 0;
  // Biến lưu thông tin đề tài cũ có độ trùng cao nhất
  let deTaiBiTrungNhat = null;
  // Mảng lưu danh sách các đề tài có dấu hiệu tương đồng
  const danhSachTuongDong = [];

  // Duyệt qua từng đề tài cũ trong cơ sở dữ liệu để so sánh
  for (let i = 0; i < existingTopics.length; i++) {
    // Lấy thông tin đề tài cũ thứ i
    const deTaiCu = existingTopics[i];

    // Nếu đang chỉnh sửa chính đề tài đó thì bỏ qua không tự so sánh với chính mình
    if (excludeTopicId && deTaiCu.topic_id === excludeTopicId) {
      // Chuyển sang đề tài tiếp theo
      continue;
    }

    // Tách từ khóa của tên đề tài cũ
    const tuKhoaTieuDeCu = preprocessVietnameseText(deTaiCu.title || '');
    // Tách từ khóa tổng hợp của đề tài cũ
    const tuKhoaTongHopCu = preprocessVietnameseText(
      (deTaiCu.title || '') + ' ' + (deTaiCu.title || '') + ' ' + (deTaiCu.summary || '')
    );

    // Tính độ tương đồng riêng phần Tên đề tài
    const doGiongTieuDe = computeCosineSimilarity(tuKhoaTieuDeMoi, tuKhoaTieuDeCu);
    // Tính độ tương đồng trên toàn bộ nội dung (Tên + Tóm tắt)
    const doGiongToanBo = computeCosineSimilarity(tuKhoaTongHopMoi, tuKhoaTongHopCu);

    // Kết hợp trọng số: ưu tiên tên đề tài 85% và nội dung tổng hợp 15%
    const diemKetHop = doGiongTieuDe * 0.85 + doGiongToanBo * 0.15;
    // Lấy giá trị lớn hơn giữa điểm kết hợp và điểm toàn bộ
    const diemThucTe = diemKetHop > doGiongToanBo ? diemKetHop : doGiongToanBo;
    // Đổi từ thang (0 -> 1) sang thang phần trăm (0% -> 100%) và làm tròn 1 chữ số thập phân
    let phanTram = Math.round(diemThucTe * 1000) / 10;
    // Đảm bảo phần trăm không vượt quá 100%
    if (phanTram > 100) {
      // Gán trần tối đa là 100
      phanTram = 100;
    }

    // Nếu có độ tương đồng lớn hơn 0% thì lưu vào danh sách đối chiếu
    if (phanTram > 0) {
      // Thêm vào mảng danh sách tương đồng
      danhSachTuongDong.push({
        topic_id: deTaiCu.topic_id,
        title: deTaiCu.title,
        status: deTaiCu.status,
        percentage: phanTram,
      });
    }

    // Nếu phần trăm của đề tài này lớn hơn kỷ lục hiện tại thì cập nhật kỷ lục mới
    if (phanTram > diemTrungCaoNhat) {
      // Cập nhật điểm trùng cao nhất
      diemTrungCaoNhat = phanTram;
      // Lưu lại đối tượng đề tài gây trùng cao nhất
      deTaiBiTrungNhat = deTaiCu;
    }
  }

  // Sắp xếp danh sách tương đồng theo thứ tự phần trăm giảm dần
  danhSachTuongDong.sort(function (deTaiA, deTaiB) {
    // Đề tài nào có phần trăm lớn hơn sẽ đứng trước
    return deTaiB.percentage - deTaiA.percentage;
  });

  // Trích xuất tối đa 3 đề tài giống nhất để hiển thị lên màn hình cảnh báo
  const top3DeTaiTrung = danhSachTuongDong.slice(0, 3);

  // Trả về kết quả kiểm tra: An toàn nếu dưới 30% (diemTrungCaoNhat < 30)
  return {
    isSafe: diemTrungCaoNhat < 30,
    percentage: diemTrungCaoNhat,
    maxScore: diemTrungCaoNhat,
    matchedTopic: deTaiBiTrungNhat,
    topMatches: top3DeTaiTrung,
  };
}
