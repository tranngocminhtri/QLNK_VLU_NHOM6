import { formatDateVN } from '../utils/validators';

export default function HomePage({
  topics = [],
  users = [],
  categories = [],
  timelines = [],
  onOpenLogin,
}) {
  const currentTimeline = timelines[0] || null;
  const majorCategories = categories.filter((c) => c.type === 'MAJOR');
  const fieldCategories = categories.filter((c) => c.type === 'FIELD');
  const lecturerCount = users.filter((u) => u.role === 'LECTURER' || u.role === 'ADMIN').length;

  return (
    <div className="vlu-home-page">
      {/* THANH ĐIỀU HƯỚNG TRANG CHỦ (CÓ NÚT ĐĂNG NHẬP Ở GÓC PHẢI) */}
      <header className="vlu-home-navbar">
        <div className="vlu-home-nav-inner">
          <a href="#top" className="vlu-home-brand">
            <div className="vlu-brand-cube">VLU</div>
            <div className="vlu-home-brand-text">
              <strong>TRƯỜNG ĐẠI HỌC VĂN LANG</strong>
              <span>Khoa Công nghệ Thông tin • VLU SciRes</span>
            </div>
          </a>

          <nav className="vlu-home-nav-links">
            <a href="#about-university">Về Trường & Khoa</a>
            <a href="#achievements">Thành tựu NCKH</a>
            <a href="#system-overview">Hệ thống Quản lý NCKH</a>
            <a href="#workflow">Quy trình thực hiện</a>
          </nav>

          <div className="vlu-home-nav-actions">
            <button
              type="button"
              className="btn btn-primary vlu-home-login-btn"
              onClick={onOpenLogin}
            >
              <span>Đăng nhập hệ thống</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* PHẦN MỞ ĐẦU (HERO BANNER) */}
      <section id="top" className="vlu-hero-section">
        <div className="vlu-hero-container">
          <div className="vlu-hero-content">
            <div className="vlu-hero-pill">
              <span className="vlu-pill-dot" />
              <span>CỔNG THÔNG TIN NGHIÊN CỨU KHOA HỌC • ĐẠI HỌC VĂN LANG</span>
            </div>

            <h1 className="vlu-hero-title">
              Khơi nguồn Sáng tạo, Kiến tạo Tri thức &amp; Quản trị Nghiên cứu Khoa học Số
            </h1>

            <p className="vlu-hero-desc">
              Nền tảng chính thức của Trường Đại học Văn Lang — Khoa Công nghệ Thông tin giúp kết nối Sinh viên, Giảng viên hướng dẫn và Hội đồng Khoa học trong một hệ sinh thái quản lý đề tài hiện đại, minh bạch và chuẩn học thuật quốc tế.
            </p>

            {currentTimeline && (
              <div className="vlu-hero-timeline-bar">
                <span className="timeline-live-badge">ĐANG MỞ CỔNG</span>
                <span>
                  <strong>{currentTimeline.event_name}</strong> ({formatDateVN(currentTimeline.start_date)} – {formatDateVN(currentTimeline.end_date)})
                </span>
              </div>
            )}

            <div className="vlu-hero-cta-group">
              <button
                type="button"
                className="btn btn-primary btn-lg vlu-cta-main"
                onClick={onOpenLogin}
              >
                Truy cập Cổng Đăng nhập
              </button>
              <a href="#system-overview" className="btn btn-outline btn-lg vlu-cta-secondary">
                Tìm hiểu Hệ thống NCKH
              </a>
            </div>
          </div>

          {/* Khối thống kê nổi bật bên phải Hero */}
          <div className="vlu-hero-visual">
            <div className="vlu-stat-showcase-card">
              <div className="showcase-card-header">
                <div>
                  <span className="showcase-tag">TỔNG QUAN NĂNG LỰC HỌC THUẬT</span>
                  <h3>Dấu ấn Đại học Văn Lang &amp; Khoa CNTT</h3>
                </div>
                <div className="vlu-crest-mini">VLU</div>
              </div>

              <div className="showcase-metrics-grid">
                <div className="showcase-metric-box">
                  <strong>30+ Năm</strong>
                  <span>Phát triển &amp; phụng sự giáo dục đại học Việt Nam</span>
                </div>
                <div className="showcase-metric-box">
                  <strong>QS 4 Sao</strong>
                  <span>Đạt chuẩn kiểm định đại học quốc tế QS Stars</span>
                </div>
                <div className="showcase-metric-box">
                  <strong>{majorCategories.length || 4} Ngành</strong>
                  <span>Đào tạo mũi nhọn tại Khoa Công nghệ Thông tin</span>
                </div>
                <div className="showcase-metric-box">
                  <strong>100% Số hóa</strong>
                  <span>Quy trình đăng ký, kiểm tra trùng lặp &amp; nghiệm thu</span>
                </div>
              </div>

              <div className="showcase-footer-note">
                <span>🎯 Triết lý giáo dục:</span>
                <strong>Đạo đức — Ý chí — Sáng tạo</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 1: TỔNG QUAN VỀ TRƯỜNG ĐẠI HỌC VĂN LANG & KHOA CNTT */}
      <section id="about-university" className="vlu-home-section">
        <div className="vlu-section-container">
          <div className="vlu-section-heading">
            <span className="vlu-section-eyebrow">GIỚI THIỆU TỔNG QUAN</span>
            <h2>Về Trường Đại học Văn Lang &amp; Khoa Công nghệ Thông tin</h2>
            <p>
              Trường Đại học Văn Lang hướng tới mục tiêu trở thành một trong những trường đại học trẻ được ngưỡng mộ nhất châu Á, lấy nghiên cứu ứng dụng và đổi mới sáng tạo làm trụ cột phát triển.
            </p>
          </div>

          <div className="vlu-about-grid">
            <div className="vlu-about-card">
              <div className="vlu-about-icon">🏛️</div>
              <h3>Trường Đại học Văn Lang (VLU)</h3>
              <p>
                Thành lập từ năm 1995, Trường Đại học Văn Lang là cơ sở giáo dục đại học đa ngành, đa bậc học với hệ thống cơ sở vật chất hiện đại bậc nhất tại TP. Hồ Chí Minh. Nhà trường không ngừng đầu tư mạnh mẽ cho hoạt động Nghiên cứu Khoa học của giảng viên và sinh viên, thúc đẩy hợp tác học thuật quốc tế và chuyển giao công nghệ thực tiễn.
              </p>
              <ul className="vlu-check-list">
                <li>Cơ sở chính hiện đại tại Quận Bình Thạnh, TP. Hồ Chí Minh</li>
                <li>Môi trường học thuật mở, khuyến khích khởi nghiệp &amp; sáng tạo</li>
                <li>Mạng lưới đối tác doanh nghiệp và đại học quốc tế sâu rộng</li>
              </ul>
            </div>

            <div className="vlu-about-card">
              <div className="vlu-about-icon">💻</div>
              <h3>Khoa Công nghệ Thông tin</h3>
              <p>
                Khoa Công nghệ Thông tin là một trong những đơn vị mũi nhọn trong đào tạo kỹ sư công nghệ chất lượng cao và nghiên cứu phát triển các giải pháp chuyển đổi số, Trí tuệ nhân tạo, An ninh mạng và Hệ thống thông tin thông minh.
              </p>
              <div className="vlu-major-pills">
                {majorCategories.map((m) => (
                  <span key={m.category_id} className="vlu-major-pill">
                    {m.name}
                  </span>
                ))}
              </div>
              <ul className="vlu-check-list" style={{ marginTop: '12px' }}>
                <li>Đội ngũ Giáo sư, Tiến sĩ, Thạc sĩ giàu kinh nghiệm học thuật ({lecturerCount}+ giảng viên tiêu biểu)</li>
                <li>Gắn kết chặt chẽ giữa đồ án môn học, NCKH sinh viên và bài toán doanh nghiệp</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 2: THÀNH TỰU NGHIÊN CỨU KHOA HỌC NỔI BẬT */}
      <section id="achievements" className="vlu-home-section vlu-section-alt">
        <div className="vlu-section-container">
          <div className="vlu-section-heading">
            <span className="vlu-section-eyebrow">DẤU ẤN &amp; THÀNH TỰU KHOA HỌC</span>
            <h2>Thành tựu Nghiên cứu Khoa học &amp; Đổi mới Sáng tạo</h2>
            <p>
              Hoạt động nghiên cứu khoa học tại Trường Đại học Văn Lang và Khoa Công nghệ Thông tin liên tục gặt hái nhiều kết quả ấn tượng ở cấp Quốc gia và Quốc tế.
            </p>
          </div>

          <div className="vlu-achievements-grid">
            <div className="vlu-achievement-card">
              <div className="achievement-badge-top">CÔNG BỐ QUỐC TẾ</div>
              <div className="achievement-stat">ISI / Scopus</div>
              <h4>Công trình Khoa học Quốc tế Uy tín</h4>
              <p>
                Hàng trăm bài báo khoa học của giảng viên và nhóm nghiên cứu sinh viên được công bố trên các tạp chí thuộc danh mục Web of Science (ISI), Scopus và các hội nghị quốc tế IEEE, Springer, ACM.
              </p>
            </div>

            <div className="vlu-achievement-card">
              <div className="achievement-badge-top">GIẢI THƯỞNG HỌC THUẬT</div>
              <div className="achievement-stat">Euréka &amp; Cấp Bộ</div>
              <h4>Giải thưởng Sinh viên NCKH Xuất sắc</h4>
              <p>
                Nhiều đề tài sinh viên Khoa CNTT đạt giải thưởng cao tại Giải thưởng Sinh viên Nghiên cứu Khoa học cấp Bộ GD&amp;ĐT, Giải thưởng Euréka và các cuộc thi Olympic Tin học, Hackathon toàn quốc.
              </p>
            </div>

            <div className="vlu-achievement-card">
              <div className="achievement-badge-top">PHÒNG LAB CHUYÊN SÂU</div>
              <div className="achievement-stat">3+ Labs Trọng điểm</div>
              <h4>Tổ hợp Phòng Thí nghiệm Công nghệ Cao</h4>
              <p>
                Vận hành hiệu quả Blockchain Lab, Phòng thí nghiệm Trí tuệ nhân tạo &amp; Thị giác máy tính (AI Lab), cùng không gian nghiên cứu Mạng máy tính &amp; IoT phục vụ thực nghiệm chuyên sâu.
              </p>
            </div>

            <div className="vlu-achievement-card">
              <div className="achievement-badge-top">ỨNG DỤNG THỰC TIỄN</div>
              <div className="achievement-stat">Chuyển đổi số</div>
              <h4>Chuyển giao Sản phẩm &amp; Ứng dụng Số</h4>
              <p>
                Các đề tài NCKH sinh viên tập trung giải quyết bài toán thực tế trong quản trị đại học số, y tế thông minh, thương mại điện tử và bảo mật dữ liệu doanh nghiệp.
              </p>
            </div>
          </div>

          {/* Các hướng nghiên cứu trọng tâm tại Khoa CNTT */}
          <div className="vlu-research-fields-box">
            <div className="research-fields-left">
              <h3>Định hướng Nghiên cứu Mũi nhọn tại Khoa CNTT</h3>
              <p>
                Sinh viên được khuyến khích lựa chọn và đề xuất đề tài thuộc {fieldCategories.length} lĩnh vực công nghệ trọng tâm của Khoa:
              </p>
            </div>
            <div className="research-fields-right">
              {fieldCategories.map((f, idx) => (
                <div key={f.category_id} className="research-field-item">
                  <span className="field-index">0{idx + 1}</span>
                  <strong>{f.name}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 3: TỔNG QUAN VỀ WEBSITE QUẢN LÝ HOẠT ĐỘNG NCKH (VLU SCIRES) */}
      <section id="system-overview" className="vlu-home-section">
        <div className="vlu-section-container">
          <div className="vlu-section-heading">
            <span className="vlu-section-eyebrow">NỀN TẢNG QUẢN TRỊ SỐ VLU SCIRES</span>
            <h2>Tổng quan Hệ thống Quản lý Hoạt động Nghiên cứu Khoa học</h2>
            <p>
              Website được thiết kế chuyên biệt cho Khoa Công nghệ Thông tin nhằm tự động hóa toàn bộ vòng đời của một đề tài NCKH từ lúc hình thành ý tưởng đến khi nghiệm thu hoàn tất.
            </p>
          </div>

          <div className="vlu-features-grid">
            <div className="vlu-feature-card">
              <div className="vlu-feature-num">01</div>
              <h3>Sàn Đề tài &amp; Đề xuất Trực tuyến</h3>
              <p>
                Giảng viên công bố các hướng nghiên cứu mới để sinh viên ứng tuyển. Đồng thời, sinh viên có thể chủ động lập nhóm, đề xuất đề tài mới và đăng ký nguyện vọng Giảng viên hướng dẫn.
              </p>
            </div>

            <div className="vlu-feature-card">
              <div className="vlu-feature-num">02</div>
              <h3>Kiểm tra Trùng lặp Cosine Similarity</h3>
              <p>
                Tích hợp thuật toán so khớp văn bản tự động, đối chiếu Tên đề tài và Tóm tắt với toàn bộ cơ sở dữ liệu đề tài qua các năm. Hệ thống tự động cảnh báo và chặn nếu độ trùng lặp từ 30% trở lên.
              </p>
            </div>

            <div className="vlu-feature-card">
              <div className="vlu-feature-num">03</div>
              <h3>Bảng Tiến độ Kanban &amp; Nộp Báo cáo Số</h3>
              <p>
                Quản lý công việc trực quan theo mô hình Kanban. Sinh viên tải lên báo cáo tiến độ và báo cáo tổng kết (PDF/DOCX), xem trực tiếp trên trình duyệt và nhận phản hồi chuyên môn từ GVHD.
              </p>
            </div>

            <div className="vlu-feature-card">
              <div className="vlu-feature-num">04</div>
              <h3>Hội đồng Khoa học Tích hợp Thông minh</h3>
              <p>
                Giảng viên được phân công vào Hội đồng Khoa học sẽ tự động hiển thị mục chấm nghiệm thu ngay trên tài khoản của mình. Hệ thống kiểm soát chống xung đột lợi ích và tự động tổng hợp điểm bảo vệ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PHẦN 4: QUY TRÌNH 5 BƯỚC THỰC HIỆN ĐỀ TÀI TRÊN WEBSITE */}
      <section id="workflow" className="vlu-home-section vlu-section-alt">
        <div className="vlu-section-container">
          <div className="vlu-section-heading">
            <span className="vlu-section-eyebrow">QUY TRÌNH KHÉP KÍN</span>
            <h2>Chu trình Thực hiện &amp; Nghiệm thu Đề tài NCKH</h2>
            <p>
              Phối hợp đồng bộ giữa Sinh viên, Giảng viên hướng dẫn, Quản lý Khoa và Hội đồng Khoa học trên cùng một nền tảng duy nhất.
            </p>
          </div>

          <div className="vlu-workflow-steps">
            <div className="workflow-step-card">
              <span className="step-circle">1</span>
              <h4>Đề xuất &amp; Ứng tuyển</h4>
              <p>Sinh viên đề xuất đề tài (kèm kiểm tra trùng lặp &lt; 30%) hoặc ứng tuyển vào đề tài do Giảng viên công bố.</p>
            </div>

            <div className="workflow-step-card">
              <span className="step-circle">2</span>
              <h4>Xét duyệt &amp; Phân công</h4>
              <p>Quản lý Khoa rà soát thuyết minh, phân công Giảng viên hướng dẫn và GVHD xác nhận tiếp nhận nhóm.</p>
            </div>

            <div className="workflow-step-card">
              <span className="step-circle">3</span>
              <h4>Thực hiện &amp; Báo cáo Kanban</h4>
              <p>Nhóm sinh viên triển khai nghiên cứu, cập nhật tiến độ trên bảng Kanban và nộp tệp báo cáo định kỳ.</p>
            </div>

            <div className="workflow-step-card">
              <span className="step-circle">4</span>
              <h4>Đánh giá Quá trình</h4>
              <p>Giảng viên hướng dẫn chấm điểm quá trình. Đề tài đạt từ 5.0/10 trở lên được chuyển sang chờ Hội đồng bảo vệ.</p>
            </div>

            <div className="workflow-step-card">
              <span className="step-circle">5</span>
              <h4>Bảo vệ &amp; Nghiệm thu</h4>
              <p>Các giảng viên được phân công vào Hội đồng Khoa học chấm điểm độc lập, chốt kết quả nghiệm thu và lưu trữ hồ sơ.</p>
            </div>
          </div>

          {/* Banner kêu gọi đăng nhập ở cuối trang */}
          <div className="vlu-bottom-cta-banner">
            <div>
              <h3>Sẵn sàng bắt đầu hoạt động Nghiên cứu Khoa học học kỳ này?</h3>
              <p>
                Sử dụng tài khoản email <strong>@vanlanguni.vn</strong> đã được Quản trị viên Khoa cấp phép để truy cập không gian làm việc của bạn.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onOpenLogin}
            >
              Đăng nhập ngay ({topics.length} đề tài trên hệ thống)
            </button>
          </div>
        </div>
      </section>

      {/* CHÂN TRANG (FOOTER) */}
      <footer className="vlu-home-footer">
        <div className="vlu-footer-inner">
          <div className="vlu-footer-brand">
            <div className="vlu-brand-cube">VLU</div>
            <div>
              <strong>HỆ THỐNG QUẢN LÝ HOẠT ĐỘNG NGHIÊN CỨU KHOA HỌC SINH VIÊN</strong>
              <p>Khoa Công nghệ Thông tin • Trường Đại học Văn Lang</p>
              <small>Địa chỉ: Lầu 5, Tòa nhà A, Cơ sở chính — 69/68 Đặng Thùy Trâm, P.13, Q. Bình Thạnh, TP. Hồ Chí Minh</small>
            </div>
          </div>
          <div className="vlu-footer-right">
            <span>© 2026 Van Lang University (VLU SciRes). All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
