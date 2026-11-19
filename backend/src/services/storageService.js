// ============================================================================
// LƯU TRỮ FILE BÁO CÁO (UC06) - Supabase Storage, dự phòng thư mục uploads khi chạy thử cục bộ
// CSDL chỉ lưu "địa chỉ" của file (file_url), file thật nằm trên kho lưu trữ.
// ============================================================================
const fs = require('fs');
const path = require('path');
const { supabase, BUCKET } = require('../config/supabase');
const { ApiError } = require('../utils/apiError');

const THU_MUC_UPLOADS = path.join(__dirname, '../../uploads');

function tenAnToan(ten) {
  return String(ten).replace(/[^\w.\-]+/g, '_');
}

// Lưu file và trả về file_url dạng "supabase:<đường dẫn>" hoặc "local:<tên file>"
async function luuTep({ buffer, tenGoc, mimetype, topicId }) {
  const duongDan = `${tenAnToan(topicId)}/${Date.now()}_${tenAnToan(tenGoc)}`;

  if (supabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(duongDan, buffer, { contentType: mimetype, upsert: false });
    if (error) throw new ApiError(502, `Không tải được tệp lên Supabase Storage: ${error.message}`);
    return `supabase:${duongDan}`;
  }

  fs.mkdirSync(THU_MUC_UPLOADS, { recursive: true });
  const tenFile = duongDan.replace('/', '_');
  fs.writeFileSync(path.join(THU_MUC_UPLOADS, tenFile), buffer);
  return `local:${tenFile}`;
}

// Đọc nội dung file theo file_url đã lưu trong CSDL
async function docTep(fileUrl) {
  if (fileUrl.startsWith('supabase:')) {
    if (!supabase) throw new ApiError(503, 'Máy chủ chưa cấu hình Supabase Storage.');
    const { data, error } = await supabase.storage.from(BUCKET).download(fileUrl.slice('supabase:'.length));
    if (error) throw new ApiError(404, 'Không tìm thấy tệp trên Supabase Storage.');
    return Buffer.from(await data.arrayBuffer());
  }

  // "local:<tên>" hoặc dữ liệu cũ dạng "/uploads/<tên>"; path.basename chặn truy cập ra ngoài thư mục uploads
  const tenFile = path.basename(fileUrl.replace(/^local:/, ''));
  const duongDanFile = path.join(THU_MUC_UPLOADS, tenFile);
  if (!fs.existsSync(duongDanFile)) throw new ApiError(404, 'Không tìm thấy tệp tin trên máy chủ.');
  return fs.readFileSync(duongDanFile);
}

module.exports = { luuTep, docTep };
