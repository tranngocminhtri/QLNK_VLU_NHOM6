// Nhập plugin hỗ trợ biên dịch giao diện React cho công cụ Vite
import react from '@vitejs/plugin-react';
// Nhập hàm cấu hình defineConfig của Vite
import { defineConfig } from 'vite';

// Xuất cấu hình máy chủ Frontend và cầu nối Proxy sang máy chủ Backend
export default defineConfig({
  // Kích hoạt plugin React
  plugins: [react()],
  // Cấu hình cổng chạy và chuyển tiếp yêu cầu sang Backend
  server: {
    // Cổng mặc định của giao diện Frontend
    port: 5173,
    // Cấu hình Proxy chuyển tiếp các đường dẫn /api và /uploads sang máy chủ Backend ở cổng 5000
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
