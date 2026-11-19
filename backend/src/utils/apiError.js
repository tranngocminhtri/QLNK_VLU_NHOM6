// Lỗi nghiệp vụ có kèm mã HTTP. Controller chỉ cần `throw new ApiError(400, '...')`,
// bộ xử lý lỗi chung trong index.js sẽ trả về JSON { message } cho giao diện React.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Ném lỗi 400 kèm câu thông báo nếu kết quả kiểm tra từ validators.js không hợp lệ
function assertValid(result) {
  if (!result.valid) throw new ApiError(400, result.message);
  return result;
}

module.exports = { ApiError, assertValid };
