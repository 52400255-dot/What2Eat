/* ============================================================
   What2Eat - dashboard.js
   Personal dashboard: Chart.js charts + stat cards
   ============================================================ */

'use strict';

// ============================================================
// DEMO DATA: Thực tế VNĐ
// ============================================================
const DASHBOARD_DATA = {
  user: {
    name: 'Nguyễn Văn An',
    avatar: 'https://i.pravatar.cc/100?img=12',
    joinDate: '2025-03-15',
    level: 'Foodie Pro',
  },

  stats: {
    totalNotes:      47,
    totalRestaurants: 28,
    totalSpent:       4_850_000,
    totalFavorites:   15,
    thisMonthNotes:   8,
    thisMonthSpent:   685_000,
    avgRating:        4.3,
    streakDays:       12,
  },

  // Chi tiêu theo tháng (6 tháng gần nhất - đơn vị nghìn đồng)
  monthlySpending: {
    labels: ['Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9'],
    data: [520_000, 680_000, 450_000, 890_000, 720_000, 685_000],
    notesCounts: [5, 8, 4, 11, 9, 8],
  },

  // Phân loại món ăn (Pie chart)
  foodCategories: {
    labels: ['Phở & Bún', 'Cơm & Bánh', 'Đồ uống', 'Lẩu & Nướng', 'Tráng miệng', 'Khác'],
    data: [30, 25, 20, 15, 7, 3],
    colors: ['#D4A017', '#4A90D9', '#2D9B6F', '#E05A5A', '#9C27B0', '#A89B91'],
    lightColors: ['rgba(212,160,23,0.15)', 'rgba(74,144,217,0.15)', 'rgba(45,155,111,0.15)',
                  'rgba(224,90,90,0.15)', 'rgba(156,39,176,0.15)', 'rgba(168,155,145,0.15)'],
  },

  // Quán ghé nhiều nhất (Bar chart)
  topRestaurants: {
    labels: ['Phở Thìn\nBờ Hồ', 'Cơm Tấm\nThuận Kiều', 'Bún Bò\nMệ Kính', 'The Coffee\nHouse', 'Bánh Mì\nPhượng', 'Chè\nBà Dần'],
    visits: [8, 6, 5, 5, 4, 3],
    spending: [560_000, 330_000, 325_000, 425_000, 140_000, 135_000],
  },

  // Ghi chú gần đây
  recentNotes: [
    { id: 'n1', title: 'Tô phở tuyệt vời nhất Hà Nội', restaurant: 'Phở Thìn Bờ Hồ', rating: 5, date: '2026-09-20', priceSpent: 70_000 },
    { id: 'n2', title: 'Cơm tấm sườn bì chả đúng vị Sài Gòn', restaurant: 'Cơm Tấm Thuận Kiều', rating: 4, date: '2026-09-18', priceSpent: 55_000 },
    { id: 'n3', title: 'Bánh mì Phượng - Huyền thoại Hội An', restaurant: 'Bánh Mì Phượng Hội An', rating: 5, date: '2026-09-15', priceSpent: 35_000 },
    { id: 'n4', title: 'Bún bò Huế - Buổi sáng đúng vị', restaurant: 'Bún Bò Huế Mệ Kính', rating: 4, date: '2026-09-10', priceSpent: 65_000 },
  ],

  // Mục tiêu tháng
  monthGoal: {
    budget: 1_000_000,
    spent:    685_000,
    notes: 10,
    notesDone: 8,
    restaurants: 5,
    restaurantsDone: 4,
  },
};

// ============================================================
// CHART.JS DEFAULTS
// ============================================================
function setChartDefaults() {
  if (!window.Chart) return;
  Chart.defaults.font.family = "'Be Vietnam Pro', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#6F6258';
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyleWidth = 10;
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(43, 33, 24, 0.92)';
  Chart.defaults.plugins.tooltip.titleFont = { weight: '500', size: 13 };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.displayColors = false;
}

// ============================================================
// CHART 1: LINE CHART - CHI TIÊU THEO THÁNG
// ============================================================
function initSpendingChart() {
  const canvas = document.getElementById('spendingChart');
  if (!canvas || !window.Chart) return;

  const { labels, data, notesCounts } = DASHBOARD_DATA.monthlySpending;

  const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(212, 160, 23, 0.3)');
  gradient.addColorStop(1, 'rgba(212, 160, 23, 0.02)');

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Chi tiêu (VNĐ)',
          data,
          borderColor: '#D4A017',
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: '#D4A017',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 9,
          pointHoverBorderWidth: 3,
          fill: true,
          tension: 0.45,
          yAxisID: 'ySpending',
        },
        {
          label: 'Số ghi chú',
          data: notesCounts,
          borderColor: '#4A90D9',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 4],
          pointBackgroundColor: '#4A90D9',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: false,
          tension: 0.45,
          yAxisID: 'yNotes',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) {
                return ` Chi tiêu: ${formatVND(ctx.raw)}`;
              }
              return ` Ghi chú: ${ctx.raw} bài`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(232, 222, 210, 0.5)', drawBorder: false },
          ticks: { color: '#6F6258', font: { size: 12 } },
        },
        ySpending: {
          position: 'left',
          grid: { color: 'rgba(232, 222, 210, 0.5)', drawBorder: false },
          ticks: {
            color: '#6F6258',
            callback: (val) => formatVNDShort(val),
          },
          title: {
            display: true,
            text: 'Chi tiêu',
            color: '#D4A017',
            font: { weight: '600', size: 11 },
          },
        },
        yNotes: {
          position: 'right',
          grid: { display: false },
          ticks: {
            color: '#4A90D9',
            stepSize: 2,
          },
          title: {
            display: true,
            text: 'Ghi chú',
            color: '#4A90D9',
            font: { weight: '600', size: 11 },
          },
        },
      },
    },
  });
}

// ============================================================
// CHART 2: PIE/DOUGHNUT CHART - PHÂN LOẠI MÓN ĂN
// ============================================================
function initCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas || !window.Chart) return;

  const { labels, data, colors, lightColors } = DASHBOARD_DATA.foodCategories;

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: lightColors.map((c, i) => colors[i] + 'CC'),
        borderColor: colors,
        borderWidth: 2,
        hoverBackgroundColor: colors.map(c => c + 'EE'),
        hoverBorderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#2B2118',
            font: { size: 12 },
            generateLabels: (chart) => {
              const meta = chart.getDatasetMeta(0);
              return chart.data.labels.map((label, i) => ({
                text: `${label}  ${chart.data.datasets[0].data[i]}%`,
                fillStyle: chart.data.datasets[0].borderColor[i],
                strokeStyle: chart.data.datasets[0].borderColor[i],
                pointStyle: 'circle',
                hidden: meta.data[i]?.hidden,
                index: i,
              }));
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw}%`,
          },
        },
      },
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom } } = chart;
        const cx = (left + right) / 2;
        const cy = (top + bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#2B2118';
        ctx.font = "500 20px 'Be Vietnam Pro', sans-serif";
        ctx.fillText('47', cx, cy - 10);
        ctx.font = "400 11px 'Be Vietnam Pro', sans-serif";
        ctx.fillStyle = '#6F6258';
        ctx.fillText('Ghi chú', cx, cy + 10);
        ctx.restore();
      },
    }],
  });
}

// ============================================================
// CHART 3: BAR CHART - QUÁN GHÉ NHIỀU NHẤT
// ============================================================
function initTopRestaurantsChart() {
  const canvas = document.getElementById('restaurantsChart');
  if (!canvas || !window.Chart) return;

  const { labels, visits, spending } = DASHBOARD_DATA.topRestaurants;

  // Shorten labels for display
  const shortLabels = ['Phở Thìn', 'Cơm Tấm\nTK', 'Bún Bò\nMK', 'Coffee\nHouse', 'Bánh Mì\nPhượng', 'Chè\nBà Dần'];

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: shortLabels,
      datasets: [
        {
          label: 'Số lần ghé',
          data: visits,
          backgroundColor: visits.map((_, i) =>
            i === 0 ? 'rgba(212,160,23,0.85)' : 'rgba(212,160,23,0.45)'
          ),
          borderColor: visits.map((_, i) =>
            i === 0 ? '#D4A017' : '#E8C04F'
          ),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          yAxisID: 'yVisits',
        },
        {
          label: 'Chi tiêu (VNĐ)',
          data: spending,
          type: 'line',
          borderColor: '#4A90D9',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 3],
          pointBackgroundColor: '#4A90D9',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: false,
          tension: 0.35,
          yAxisID: 'ySpend',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 0) return ` Số lần ghé: ${ctx.raw} lần`;
              return ` Chi tiêu: ${formatVND(ctx.raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6F6258', font: { size: 11 } },
        },
        yVisits: {
          position: 'left',
          grid: { color: 'rgba(232, 222, 210, 0.5)', drawBorder: false },
          ticks: {
            color: '#D4A017',
            stepSize: 1,
          },
          title: {
            display: true,
            text: 'Lần ghé',
            color: '#D4A017',
            font: { weight: '600', size: 11 },
          },
          min: 0,
        },
        ySpend: {
          position: 'right',
          grid: { display: false },
          ticks: {
            color: '#4A90D9',
            callback: (val) => formatVNDShort(val),
          },
          title: {
            display: true,
            text: 'Chi tiêu',
            color: '#4A90D9',
            font: { weight: '600', size: 11 },
          },
        },
      },
    },
  });
}

// ============================================================
// UPDATE STAT CARDS
// ============================================================
function updateStatCards() {
  const { stats, monthGoal } = DASHBOARD_DATA;

  const statMapping = {
    'statTotalNotes':       { value: stats.totalNotes,       suffix: ' ghi chú', animate: true },
    'statTotalRestaurants': { value: stats.totalRestaurants, suffix: ' quán',    animate: true },
    'statTotalSpent':       { value: null, formatted: formatVND(stats.totalSpent), animate: false },
    'statTotalFavorites':   { value: stats.totalFavorites,   suffix: ' yêu thích', animate: true },
    'statAvgRating':        { value: null, formatted: stats.avgRating.toFixed(1), animate: false },
    'statStreakDays':        { value: stats.streakDays,       suffix: ' ngày',   animate: true },
    'statMonthNotes':       { value: stats.thisMonthNotes,   suffix: ' bài',    animate: true },
    'statMonthSpent':       { value: null, formatted: formatVND(stats.thisMonthSpent), animate: false },
  };

  Object.entries(statMapping).forEach(([id, config]) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (config.animate && config.value !== null) {
      animateCounter(el, 0, config.value, config.suffix, 1200);
    } else {
      el.textContent = config.formatted || (config.value + (config.suffix || ''));
    }
  });

  // Progress bars for goals
  updateGoalProgress('budgetGoalBar', monthGoal.spent, monthGoal.budget);
  updateGoalProgress('notesGoalBar', monthGoal.notesDone, monthGoal.notes);
  updateGoalProgress('restaurantsGoalBar', monthGoal.restaurantsDone, monthGoal.restaurants);

  // Goal labels
  updateGoalLabel('budgetGoalLabel', `${formatVND(monthGoal.spent)} / ${formatVND(monthGoal.budget)}`);
  updateGoalLabel('notesGoalLabel', `${monthGoal.notesDone} / ${monthGoal.notes} ghi chú`);
  updateGoalLabel('restaurantsGoalLabel', `${monthGoal.restaurantsDone} / ${monthGoal.restaurants} quán`);
}

function updateGoalProgress(barId, current, total) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  const pct = Math.min(100, Math.round((current / total) * 100));
  bar.style.width = '0%';
  setTimeout(() => {
    bar.style.transition = 'width 1s ease';
    bar.style.width = pct + '%';
    bar.setAttribute('title', `${pct}%`);
    if (pct >= 100) {
      bar.style.background = '#2D9B6F';
    } else if (pct >= 70) {
      bar.style.background = '#D4A017';
    } else {
      bar.style.background = '#4A90D9';
    }
  }, 400);
}

function updateGoalLabel(labelId, text) {
  const el = document.getElementById(labelId);
  if (el) el.textContent = text;
}

// ============================================================
// ANIMATE COUNTER
// ============================================================
function animateCounter(el, from, to, suffix = '', duration = 1000) {
  const startTime = performance.now();
  const diff = to - from;

  const step = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(from + diff * eased);
    el.textContent = current.toLocaleString('vi-VN') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

// ============================================================
// RENDER RECENT NOTES
// ============================================================
function renderRecentNotes() {
  const container = document.getElementById('recentNotesList');
  if (!container) return;

  container.innerHTML = DASHBOARD_DATA.recentNotes.map(note => `
    <div class="w2e-dashboard-note-item" style="display:flex;align-items:center;gap:1rem;padding:1rem;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='var(--bg-alt)'" onmouseout="this.style.background=''">
      <div style="width:44px;height:44px;border-radius:12px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.375rem;flex-shrink:0">
        ${initialLetter(note.title)}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.9375rem;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${note.title}
        </div>
        <div style="font-size:.8125rem;color:var(--text-secondary);margin-top:2px">
          <i class="bi bi-shop"></i> ${note.restaurant} · ${formatDateVN(note.date)}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:.875rem;font-weight:500;color:var(--primary-dark)">
          ${formatVNDShort(note.priceSpent)}
        </div>
        <div class="w2e-stars-text" style="margin-top:2px">
          ${'★'.repeat(note.rating)}${'☆'.repeat(5 - note.rating)}
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// RENDER TOP RESTAURANTS LIST
// ============================================================
function renderTopRestaurantsList() {
  const container = document.getElementById('topRestaurantsList');
  if (!container) return;

  const { labels, visits, spending } = DASHBOARD_DATA.topRestaurants;
  const maxVisits = Math.max(...visits);

  container.innerHTML = labels.map((label, i) => {
    const pct = Math.round((visits[i] / maxVisits) * 100);
    const shortName = label.replace('\n', ' ');
    return `
      <div style="margin-bottom:1rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.375rem">
          <span style="font-size:.875rem;font-weight:600;color:var(--text)">${shortName}</span>
          <span style="font-size:.8125rem;color:var(--text-secondary)">${visits[i]} lần · ${formatVNDShort(spending[i])}</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:0;border-radius:4px;background:${i === 0 ? 'var(--primary)' : 'rgba(212,160,23,0.5)'};transition:width 1.2s ease ${i * 0.1}s" data-width="${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Animate bars
  setTimeout(() => {
    container.querySelectorAll('[data-width]').forEach(bar => {
      bar.style.width = bar.getAttribute('data-width');
    });
  }, 300);
}

// ============================================================
// RENDER MONTHLY SUMMARY TABLE
// ============================================================
function renderMonthlySummary() {
  const container = document.getElementById('monthlySummaryTable');
  if (!container) return;

  const { labels, data, notesCounts } = DASHBOARD_DATA.monthlySpending;

  const rows = labels.map((label, i) => {
    const prev = i > 0 ? data[i - 1] : null;
    const diff = prev !== null ? data[i] - prev : null;
    const diffClass = diff === null ? '' : (diff >= 0 ? 'up' : 'down');
    const diffStr = diff === null ? '—' : (diff >= 0 ? '+' : '') + formatVNDShort(diff);

    return `
      <tr>
        <td style="font-weight:600;color:var(--text)">${label}</td>
        <td style="color:var(--primary-dark);font-weight:500">${formatVND(data[i])}</td>
        <td style="text-align:center">${notesCounts[i]} bài</td>
        <td style="text-align:right">
          <span class="w2e-stat-card__change ${diffClass}">
            <i class="bi bi-arrow-${diff === null ? 'right' : (diff >= 0 ? 'up' : 'down')}-short"></i>
            ${diffStr}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <table style="width:100%;border-collapse:collapse;font-size:.875rem">
      <thead>
        <tr style="border-bottom:2px solid var(--border)">
          <th style="padding:.625rem 1rem .625rem 0;text-align:left;color:var(--text-secondary);font-size:.75rem;text-transform:uppercase;letter-spacing:.5px">Tháng</th>
          <th style="padding:.625rem;text-align:left;color:var(--text-secondary);font-size:.75rem;text-transform:uppercase">Chi tiêu</th>
          <th style="padding:.625rem;text-align:center;color:var(--text-secondary);font-size:.75rem;text-transform:uppercase">Ghi chú</th>
          <th style="padding:.625rem 0 .625rem 1rem;text-align:right;color:var(--text-secondary);font-size:.75rem;text-transform:uppercase">So với trước</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="border-top:2px solid var(--border)">
          <td style="padding:.75rem 0;font-weight:500;color:var(--text)">Tổng cộng</td>
          <td style="font-weight:500;color:var(--primary-dark);font-size:1rem">
            ${formatVND(DASHBOARD_DATA.monthlySpending.data.reduce((a, b) => a + b, 0))}
          </td>
          <td style="text-align:center;font-weight:500">${DASHBOARD_DATA.monthlySpending.notesCounts.reduce((a, b) => a + b, 0)} bài</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

// ============================================================
// CHART PERIOD TOGGLE (3M / 6M / 1Y)
// ============================================================
function initChartPeriodToggle() {
  document.querySelectorAll('[data-chart-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      const period = btn.getAttribute('data-chart-period');
      document.querySelectorAll('[data-chart-period]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      toast.info(`Đang hiển thị dữ liệu ${period === '3m' ? '3 tháng' : period === '6m' ? '6 tháng' : '1 năm'} gần nhất.`);
      // In real app: re-fetch and re-render chart data
    });
  });
}

// ============================================================
// INIT DASHBOARD
// ============================================================
function initDashboard() {
  if (!document.getElementById('spendingChart') &&
      !document.getElementById('categoryChart') &&
      !document.getElementById('restaurantsChart') &&
      !document.getElementById('statTotalNotes')) {
    return; // Not on dashboard page
  }

  setChartDefaults();
  updateStatCards();
  renderRecentNotes();
  renderTopRestaurantsList();
  renderMonthlySummary();
  initChartPeriodToggle();

  // Load charts after short delay for smooth entrance
  setTimeout(() => {
    initSpendingChart();
    initCategoryChart();
    initTopRestaurantsChart();
  }, 200);
}

// ============================================================
// FOOD PLAN FEATURES ON DASHBOARD
// ============================================================
function initFoodPlanQuickAdd() {
  const form = document.getElementById('quickAddPlanForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="planName"]')?.value?.trim();
    if (!name) {
      toast.warning('Vui lòng nhập tên kế hoạch!');
      return;
    }
    toast.success(`Đã tạo kế hoạch "${name}"!`);
    form.reset();
    hideModal('quickAddPlanModal');
  });
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  initFoodPlanQuickAdd();
});

// Expose globals
window.DASHBOARD_DATA = DASHBOARD_DATA;
window.initDashboard = initDashboard;
window.animateCounter = animateCounter;
window.formatVND = window.formatVND || ((n) => n?.toLocaleString('vi-VN') + '₫');
window.formatVNDShort = window.formatVNDShort || ((n) => n + 'đ');

// Single-letter monogram used by the "no image" tiles in place of the emoji
// this page used to print. dashboard.js loads standalone, so it owns its copy.
function initialLetter(value) {
  const text = String(value || '').replace(/^[^\p{L}\p{N}]+/u, '');
  const point = Array.from(text)[0];
  return point ? point.toUpperCase() : '•';
}

