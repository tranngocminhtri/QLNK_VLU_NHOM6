// Kết nối tới Supabase Storage (kho lưu trữ file báo cáo). Nếu chưa cấu hình thì trả về null
// và hệ thống tự lưu file vào thư mục backend/uploads (chỉ dùng khi chạy thử trên máy cá nhân).
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
// Backend cần service role key để ghi vào bucket riêng tư; anon key chỉ dùng được khi bucket cho phép
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

module.exports = {
  supabase: url && key ? createClient(url, key) : null,
  BUCKET: process.env.SUPABASE_BUCKET || 'reports',
};
