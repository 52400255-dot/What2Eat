/* ============================================================
   What2Eat - food-note.js
   Food notes: grid/list view, filter, search, pin, delete,
   autosave, tag input, star rating
   ============================================================ */

'use strict';

// ============================================================
// DEMO DATA: Food Notes Việt Nam thực tế
// ============================================================
const FOOD_NOTES_DATA = [
  {
    id: 'n1',
    title: 'Tô phở tuyệt vời nhất Hà Nội',
    restaurant: 'Phở Thìn Bờ Hồ',
    restaurantId: 'r1',
    rating: 5,
    content: 'Đến Phở Thìn lần này mình thực sự bị chinh phục. Nước dùng ninh từ xương bò hàng tiếng đồng hồ, trong veo mà đậm đà vô cùng. Bánh phở mềm, tái lăn chín vừa, hành lá thơm phức. Quán đông nhưng phục vụ nhanh. Chắc chắn sẽ quay lại!',
    tags: ['Phở', 'Hà Nội', 'Phải thử', 'Xứng đáng 5 sao'],
    image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80',
    date: '2026-09-20',
    isPinned: true,
    isFavorite: true,
    isPublic: true,
    status: 'approved',
    priceSpent: 70000,
    mood: 'Tuyệt vời',
    readingTime: '2 phút đọc',
  },
  {
    id: 'n2',
    title: 'Cơm tấm sườn bì chả đúng vị Sài Gòn',
    restaurant: 'Cơm Tấm Thuận Kiều',
    restaurantId: 'r3',
    rating: 4,
    content: 'Cơm tấm ở đây ăn buổi sáng thật sự ngon. Sườn nướng than hồng còn khói, bì dai dai thơm thơm, chả trứng mềm. Nước mắm pha ngọt thanh, dưa cải kèm giúp đỡ ngán. Hơi đông giờ sáng nhưng chịu khó xếp hàng là xứng đáng.',
    tags: ['Cơm tấm', 'Sài Gòn', 'Bữa sáng', 'Ngon'],
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80',
    date: '2026-09-18',
    isPinned: false,
    isFavorite: true,
    isPublic: true,
    status: 'approved',
    priceSpent: 55000,
    mood: 'Vui vẻ',
    readingTime: '2 phút đọc',
  },
  {
    id: 'n3',
    title: 'Bánh mì Phượng - Huyền thoại Hội An',
    restaurant: 'Bánh Mì Phượng Hội An',
    restaurantId: 'r4',
    rating: 5,
    content: 'Mình phải xếp hàng 20 phút nhưng thật sự xứng đáng. Bánh mì giòn rụm, nhân phong phú gồm thịt, pate, rau sống, dưa leo, hành phi. Tất cả kết hợp hoàn hảo. Hiểu tại sao Anthony Bourdain gọi đây là "sandwich ngon nhất thế giới".',
    tags: ['Bánh mì', 'Hội An', 'Phải thử một lần', 'Du lịch'],
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&q=80',
    date: '2026-09-15',
    isPinned: true,
    isFavorite: true,
    isPublic: true,
    status: 'approved',
    priceSpent: 35000,
    mood: 'Háo hức',
    readingTime: '2 phút đọc',
  },
  {
    id: 'n4',
    title: 'Bún bò Huế - Buổi sáng đúng vị',
    restaurant: 'Bún Bò Huế Mệ Kính',
    restaurantId: 'r2',
    rating: 4,
    content: 'Bún bò Huế ở đây nước dùng cay vừa, có mùi sả đặc trưng. Thịt bò và giò heo mềm, không bị dai. Bún to sợi đúng kiểu Huế. Sáng sớm ăn tô này đổ mồ hôi nhưng tỉnh táo và ngon miệng vô cùng. Chủ quán thân thiện.',
    tags: ['Bún bò Huế', 'Cay', 'Bữa sáng', 'Miền Trung'],
    image: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
    date: '2026-09-10',
    isPinned: false,
    isFavorite: false,
    isPublic: true,
    status: 'pending',
    priceSpent: 65000,
    mood: 'Ngon miệng',
    readingTime: '2 phút đọc',
  },
  {
    id: 'n5',
    title: 'Chè khúc bạch - Giải nhiệt mùa hè',
    restaurant: 'Chè Khúc Bạch Bà Dần',
    restaurantId: 'r7',
    rating: 5,
    content: 'Chiều hè nóng 40 độ mà được ăn chè khúc bạch thì không gì bằng. Khúc bạch béo mịn, tan trong miệng, thạch đủ màu đẹp mắt. Nước đường hơi ngọt nhưng hòa với đá là hoàn hảo. Topping rất đa dạng. Quán sạch sẽ, không gian thoáng.',
    tags: ['Chè', 'Mùa hè', 'Ngọt mát', 'Hà Nội'],
    image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=600&q=80',
    date: '2026-09-05',
    isPinned: false,
    isFavorite: false,
    isPublic: false,
    status: 'approved',
    priceSpent: 45000,
    mood: 'Hài lòng',
    readingTime: '2 phút đọc',
  },
  {
    id: 'n6',
    title: 'Cà phê sáng - Không gian làm việc lý tưởng',
    restaurant: 'The Coffee House Signature',
    restaurantId: 'r6',
    rating: 4,
    content: 'Mình đến đây làm việc từ 9 giờ sáng đến 2 giờ chiều. WiFi ổn định, ổ cắm điện đủ, không gian rộng rãi và yên tĩnh buổi sáng. Cà phê sữa đá ngon, bánh croissant bơ thơm. Giá hơi cao nhưng xứng với chất lượng và không gian.',
    tags: ['Cà phê', 'Làm việc', 'Wifi', 'Buổi sáng'],
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80',
    date: '2026-08-28',
    isPinned: false,
    isFavorite: false,
    isPublic: true,
    status: 'approved',
    priceSpent: 85000,
    mood: 'Thư giãn',
    readingTime: '2 phút đọc',
  },
];

// ============================================================
// FOOD NOTE STATE
// ============================================================
const noteState = {
  allNotes: [...FOOD_NOTES_DATA],
  filtered: [...FOOD_NOTES_DATA],
  viewMode: 'grid',     // 'grid' | 'list'
  searchQuery: '',
  filterTags: [],
  filterRating: 0,
  filterStatus: 'all',  // 'all' | 'pinned' | 'public' | 'private'
  sortBy: 'newest',
};

// ============================================================
// RENDER NOTE CARD
// ============================================================
function renderNoteCard(note) {
  const stars = renderStarsFilled(note.rating);
  const tagHTML = note.tags.slice(0, 3).map(t => `<span class="w2e-tag">${t}</span>`).join('');
  const extraTags = note.tags.length > 3 ? `<span class="w2e-tag secondary">+${note.tags.length - 3}</span>` : '';

  return `
    <div class="w2e-note-card ${note.isPinned ? 'pinned' : ''} w2e-fade-in-up" data-note-id="${note.id}">
      <div class="w2e-note-card__img-wrap">
        ${note.image
          ? `<img class="w2e-note-card__img" src="${note.image}" alt="${note.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w2e-note-card__no-img\\'></div>'">`
          : `<div class="w2e-note-card__no-img"></div>`
        }
        <div class="w2e-note-card__actions">
          <button
            class="w2e-note-card__action-btn pin ${note.isPinned ? 'active' : ''}"
            onclick="togglePin('${note.id}')"
            title="${note.isPinned ? 'Bỏ ghim' : 'Ghim ghi chú'}"
            aria-label="${note.isPinned ? 'Bỏ ghim' : 'Ghim ghi chú'}"
          >
            <i class="bi bi-pin${note.isPinned ? '-fill' : ''}"></i>
          </button>
          <button
            class="w2e-note-card__action-btn fav ${note.isFavorite ? 'active' : ''}"
            onclick="toggleNoteFavorite('${note.id}')"
            title="${note.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}"
            aria-label="${note.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}"
          >
            <i class="bi bi-heart${note.isFavorite ? '-fill' : ''}"></i>
          </button>
          <button
            class="w2e-note-card__action-btn"
            onclick="deleteNote('${note.id}')"
            title="Xóa ghi chú"
            aria-label="Xóa ghi chú"
            style="color: var(--error)"
          >
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </div>

      <div class="w2e-note-card__body">
        <div class="w2e-note-card__restaurant">
          <i class="bi bi-shop"></i> ${note.restaurant}
        </div>
        <div class="w2e-note-card__title">${note.title}</div>
        <div class="w2e-note-card__stars">${stars}</div>
        <div class="w2e-note-card__excerpt">${note.content}</div>
        <div class="w2e-note-card__tags">
          ${tagHTML}${extraTags}
          ${note.isPinned ? '<span class="w2e-tag">Đã ghim</span>' : ''}
        </div>
        <div class="w2e-note-card__footer">
          <span>
            <i class="bi bi-calendar3"></i>
            ${formatDateVN(note.date)}
          </span>
          <span>
            ${[note.mood, note.priceSpent ? formatVNDShort(note.priceSpent) : ''].filter(Boolean).join(' · ')}
          </span>
          <span class="w2e-badge w2e-badge--${note.isPublic ? 'public' : 'private'}">
            <i class="bi bi-${note.isPublic ? 'globe' : 'lock'}"></i>
            ${note.isPublic ? 'Công khai' : 'Riêng tư'}
          </span>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// RENDER STARS (filled version)
// ============================================================
function renderStarsFilled(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<i class="bi bi-star${i <= rating ? '-fill' : ''} ${i > rating ? 'empty' : ''}"></i>`;
  }
  return html;
}

// ============================================================
// RENDER ALL NOTES
// ============================================================
function renderNotes() {
  const grid = document.getElementById('notesGrid');
  const countEl = document.getElementById('noteCount');
  const emptyEl = document.getElementById('notesEmpty');

  if (!grid) return;

  const notes = getSortedNotes();

  if (countEl) {
    countEl.textContent = `${notes.length} ghi chú`;
  }

  if (notes.length === 0) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  // Pinned first always
  const pinned = notes.filter(n => n.isPinned);
  const rest   = notes.filter(n => !n.isPinned);
  const ordered = [...pinned, ...rest];

  grid.innerHTML = ordered.map(n => renderNoteCard(n)).join('');
  grid.className = `w2e-notes-grid ${noteState.viewMode === 'list' ? 'list-view' : ''}`;
}

// ============================================================
// SORT NOTES
// ============================================================
function getSortedNotes() {
  let notes = [...noteState.filtered];
  switch (noteState.sortBy) {
    case 'newest':  notes.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'oldest':  notes.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'highest': notes.sort((a, b) => b.rating - a.rating); break;
    case 'lowest':  notes.sort((a, b) => a.rating - b.rating); break;
    case 'alpha':   notes.sort((a, b) => a.title.localeCompare(b.title, 'vi')); break;
  }
  return notes;
}

// ============================================================
// FILTER NOTES
// ============================================================
function filterNotes() {
  let result = [...noteState.allNotes];

  // Search
  if (noteState.searchQuery) {
    const q = noteState.searchQuery.toLowerCase();
    result = result.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.restaurant.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  // Tags filter
  if (noteState.filterTags.length > 0) {
    result = result.filter(n =>
      noteState.filterTags.every(ft => n.tags.some(t => t.toLowerCase().includes(ft.toLowerCase())))
    );
  }

  // Rating
  if (noteState.filterRating > 0) {
    result = result.filter(n => n.rating >= noteState.filterRating);
  }

  // Status
  switch (noteState.filterStatus) {
    case 'pinned':  result = result.filter(n => n.isPinned); break;
    case 'public':  result = result.filter(n => n.isPublic); break;
    case 'private': result = result.filter(n => !n.isPublic); break;
    case 'fav':     result = result.filter(n => n.isFavorite); break;
  }

  noteState.filtered = result;
  renderNotes();
  renderTagCloud();
}

// ============================================================
// GRID / LIST VIEW TOGGLE
// ============================================================
function initViewToggle() {
  const gridBtn = document.getElementById('viewGrid');
  const listBtn = document.getElementById('viewList');

  if (gridBtn) {
    gridBtn.addEventListener('click', () => {
      noteState.viewMode = 'grid';
      gridBtn.classList.add('active');
      if (listBtn) listBtn.classList.remove('active');
      renderNotes();
      setLS('w2e_note_view', 'grid');
    });
  }

  if (listBtn) {
    listBtn.addEventListener('click', () => {
      noteState.viewMode = 'list';
      listBtn.classList.add('active');
      if (gridBtn) gridBtn.classList.remove('active');
      renderNotes();
      setLS('w2e_note_view', 'list');
    });
  }

  // Restore saved preference
  const saved = getLS('w2e_note_view');
  if (saved === 'list' && listBtn) listBtn.click();
}

// ============================================================
// SEARCH NOTES
// ============================================================
function initNoteSearch() {
  const searchInput = document.getElementById('noteSearch');
  if (!searchInput) return;

  const debouncedSearch = debounce((val) => {
    noteState.searchQuery = val;
    filterNotes();
  }, 300);

  searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value.trim()));

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      noteState.searchQuery = '';
      filterNotes();
    }
  });
}

// ============================================================
// SORT NOTES
// ============================================================
function initNoteSort() {
  const sortSelect = document.getElementById('noteSort');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', (e) => {
    noteState.sortBy = e.target.value;
    renderNotes();
  });
}

// ============================================================
// FILTER BY STATUS CHIPS
// ============================================================
function initStatusFilter() {
  document.querySelectorAll('[data-status-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      noteState.filterStatus = chip.getAttribute('data-status-filter');
      document.querySelectorAll('[data-status-filter]').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-status-filter') === noteState.filterStatus);
      });
      filterNotes();
    });
  });
}

// ============================================================
// FILTER BY RATING
// ============================================================
function initNoteRatingFilter() {
  document.querySelectorAll('[data-note-rating]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = parseInt(chip.getAttribute('data-note-rating'));
      noteState.filterRating = noteState.filterRating === val ? 0 : val;
      document.querySelectorAll('[data-note-rating]').forEach(c => {
        c.classList.toggle('active', parseInt(c.getAttribute('data-note-rating')) === noteState.filterRating);
      });
      filterNotes();
    });
  });
}

// ============================================================
// TAG CLOUD
// ============================================================
function renderTagCloud() {
  const container = document.getElementById('tagCloud');
  if (!container) return;

  const tagCounts = {};
  noteState.allNotes.forEach(note => {
    note.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  container.innerHTML = sorted.map(([tag, count]) => `
    <span
      class="w2e-filter-chip ${noteState.filterTags.includes(tag) ? 'active' : ''}"
      onclick="toggleTagFilter('${tag}')"
      data-tag="${tag}"
      role="button"
      tabindex="0"
    >
      ${tag} <small style="opacity:.7">(${count})</small>
    </span>
  `).join('');
}

function toggleTagFilter(tag) {
  const idx = noteState.filterTags.indexOf(tag);
  if (idx === -1) {
    noteState.filterTags.push(tag);
  } else {
    noteState.filterTags.splice(idx, 1);
  }
  document.querySelectorAll(`[data-tag="${tag}"]`).forEach(el => {
    el.classList.toggle('active', noteState.filterTags.includes(tag));
  });
  filterNotes();
}

// ============================================================
// PIN / UNPIN NOTE
// ============================================================
function togglePin(noteId) {
  const note = noteState.allNotes.find(n => n.id === noteId);
  if (!note) return;

  note.isPinned = !note.isPinned;

  // Sync to filtered
  const filteredNote = noteState.filtered.find(n => n.id === noteId);
  if (filteredNote) filteredNote.isPinned = note.isPinned;

  saveNotesToLS();
  renderNotes();

  toast.success(note.isPinned ? 'Đã ghim ghi chú!' : 'Đã bỏ ghim ghi chú.');
}

// ============================================================
// TOGGLE FAVORITE NOTE
// ============================================================
function toggleNoteFavorite(noteId) {
  const note = noteState.allNotes.find(n => n.id === noteId);
  if (!note) return;

  note.isFavorite = !note.isFavorite;
  const filteredNote = noteState.filtered.find(n => n.id === noteId);
  if (filteredNote) filteredNote.isFavorite = note.isFavorite;

  saveNotesToLS();
  renderNotes();

  if (note.isFavorite) {
    toast.success('Đã thêm vào yêu thích!');
  } else {
    toast.info('Đã xóa khỏi yêu thích.');
  }
}

// ============================================================
// DELETE NOTE
// ============================================================
function deleteNote(noteId) {
  const note = noteState.allNotes.find(n => n.id === noteId);
  if (!note) return;

  showConfirm({
    title: 'Xóa ghi chú?',
    message: `Bạn có chắc muốn xóa "<strong>${note.title}</strong>"? Hành động này không thể hoàn tác.`,
    confirmText: 'Xóa ngay',
    cancelText: 'Giữ lại',
    type: 'danger',
    onConfirm: () => {
      noteState.allNotes   = noteState.allNotes.filter(n => n.id !== noteId);
      noteState.filtered   = noteState.filtered.filter(n => n.id !== noteId);
      saveNotesToLS();
      renderNotes();
      toast.success('Đã xóa ghi chú thành công!');
    }
  });
}

// ============================================================
// SAVE NOTES TO LOCALSTORAGE
// ============================================================
function saveNotesToLS() {
  setLS('w2e_food_notes', noteState.allNotes);
}

// ============================================================
// LOAD NOTES FROM LOCALSTORAGE
// ============================================================
function loadNotesFromLS() {
  const saved = getLS('w2e_food_notes');
  if (saved && Array.isArray(saved) && saved.length > 0) {
    noteState.allNotes = saved;
    noteState.filtered = [...saved];
  }
}

// ============================================================
// CREATE NOTE FORM: AUTOSAVE DRAFT
// ============================================================
function initCreateNoteForm() {
  const form = document.getElementById('createNoteForm');
  if (!form) return;

  initAutosave('createNoteForm', 'w2e_note_draft');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm(form)) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      const firstError = form.querySelector('.is-invalid');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Collect tags from tag input
    const tagEls = form.querySelectorAll('.w2e-tag-input__tag span');
    const tags = Array.from(tagEls).map(el => el.textContent.trim()).filter(Boolean);

    // Collect rating
    const ratingInput = form.querySelector('[name="rating"]:checked') || form.querySelector('[data-star-value]');
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;

    const newNote = {
      id: 'n' + Date.now(),
      title: form.querySelector('[name="title"]')?.value || '',
      restaurant: form.querySelector('[name="restaurant"]')?.value || '',
      restaurantId: '',
      rating: rating,
      content: form.querySelector('[name="content"]')?.value || '',
      tags: tags,
      image: '',
      date: new Date().toISOString().split('T')[0],
      isPinned: form.querySelector('[name="isPinned"]')?.checked || false,
      isFavorite: false,
      isPublic: form.querySelector('[name="isPublic"]')?.checked !== false,
      status: 'pending',
      priceSpent: parseInt(form.querySelector('[name="priceSpent"]')?.value) || 0,
      mood: form.querySelector('[name="mood"]')?.value || 'Vui vẻ',
      readingTime: estimateReadingTime(form.querySelector('[name="content"]')?.value || ''),
    };

    // Add to state
    noteState.allNotes.unshift(newNote);
    noteState.filtered.unshift(newNote);
    saveNotesToLS();
    removeLS('w2e_note_draft');

    toast.success('Đã lưu ghi chú thành công!', 'Hoàn tất!');

    setTimeout(() => {
      window.location.href = './food-notes.html';
    }, 1500);
  });

  // Live character count for content
  const contentTextarea = form.querySelector('[name="content"]');
  const charCount = document.getElementById('contentCharCount');
  if (contentTextarea && charCount) {
    contentTextarea.addEventListener('input', () => {
      const len = contentTextarea.value.length;
      charCount.textContent = `${len} ký tự · ${estimateReadingTime(contentTextarea.value)}`;
    });
  }

  // Preview note card
  const previewBtn = document.getElementById('previewNoteBtn');
  if (previewBtn) {
    previewBtn.addEventListener('click', showNotePreview);
  }
}

// ============================================================
// NOTE PREVIEW
// ============================================================
function showNotePreview() {
  const form = document.getElementById('createNoteForm');
  if (!form) return;

  const title    = form.querySelector('[name="title"]')?.value || '(Chưa có tiêu đề)';
  const content  = form.querySelector('[name="content"]')?.value || '';
  const restaurant = form.querySelector('[name="restaurant"]')?.value || '(Chưa chọn quán)';
  const ratingEl = form.querySelector('[name="rating"]:checked');
  const rating   = ratingEl ? parseInt(ratingEl.value) : 0;
  const tagEls   = form.querySelectorAll('.w2e-tag-input__tag span');
  const tags     = Array.from(tagEls).map(el => el.textContent);

  let previewModal = document.getElementById('notePreviewModal');
  if (!previewModal) {
    previewModal = document.createElement('div');
    previewModal.className = 'w2e-modal-overlay';
    previewModal.id = 'notePreviewModal';
    previewModal.innerHTML = `
      <div class="w2e-modal w2e-modal--lg">
        <div class="w2e-modal__header">
          <div class="w2e-modal__title">Xem trước ghi chú</div>
          <button class="w2e-modal__close" onclick="hideModal('notePreviewModal')" aria-label="Đóng">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="w2e-modal__body" id="notePreviewBody"></div>
        <div class="w2e-modal__footer">
          <button class="w2e-btn w2e-btn--ghost" onclick="hideModal('notePreviewModal')">Đóng</button>
        </div>
      </div>
    `;
    document.body.appendChild(previewModal);
  }

  const starsHTML = renderStarsFilled(rating);
  document.getElementById('notePreviewBody').innerHTML = `
    <div class="w2e-note-card" style="max-width:500px;margin:0 auto">
      <div class="w2e-note-card__body" style="padding:1.5rem">
        <div class="w2e-note-card__restaurant"><i class="bi bi-shop"></i> ${restaurant}</div>
        <div class="w2e-note-card__title" style="font-size:1.25rem;margin-bottom:.75rem">${title}</div>
        <div class="w2e-note-card__stars" style="margin-bottom:.75rem">${starsHTML}</div>
        <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:1rem">${content || '<em style="color:var(--text-muted)">Chưa có nội dung...</em>'}</p>
        <div class="w2e-note-card__tags">
          ${tags.map(t => `<span class="w2e-tag">${t}</span>`).join('')}
        </div>
        <div class="w2e-note-card__footer" style="margin-top:1rem;padding-top:.875rem;border-top:1px solid var(--border)">
          <span><i class="bi bi-calendar3"></i> Hôm nay</span>
          <span class="w2e-badge w2e-badge--public"><i class="bi bi-globe"></i> Công khai</span>
        </div>
      </div>
    </div>
  `;

  showModal('notePreviewModal');
}

// ============================================================
// STAR RATING INPUT INTERACTIVE
// ============================================================
function initInteractiveStarRating() {
  const wrapper = document.querySelector('.w2e-star-rating');
  if (!wrapper) return;

  const labels = Array.from(wrapper.querySelectorAll('label'));
  const inputs = Array.from(wrapper.querySelectorAll('input'));
  const ratingDisplay = document.getElementById('ratingDisplay');

  const ratingTexts = ['', 'Tệ', 'Không ổn', 'Bình thường', 'Tốt', 'Tuyệt vời!'];

  labels.forEach((label, idx) => {
    label.addEventListener('mouseenter', () => {
      const val = parseInt(inputs[idx].value);
      if (ratingDisplay) ratingDisplay.textContent = ratingTexts[val] || '';
    });
  });

  wrapper.addEventListener('mouseleave', () => {
    const checked = wrapper.querySelector('input:checked');
    const val = checked ? parseInt(checked.value) : 0;
    if (ratingDisplay) ratingDisplay.textContent = val > 0 ? ratingTexts[val] : '';
  });

  inputs.forEach(input => {
    input.addEventListener('change', () => {
      const val = parseInt(input.value);
      if (ratingDisplay) ratingDisplay.textContent = ratingTexts[val] || '';
    });
  });
}

// ============================================================
// TAG INPUT FOR CREATE FORM
// ============================================================
function initCreateTagInput() {
  const wrapper = document.querySelector('.w2e-tag-input');
  if (!wrapper) return;

  const suggestions = [
    'Ngon', 'Phải thử', 'Giá rẻ', 'Không gian đẹp', 'Phục vụ tốt',
    'Sạch sẽ', 'Đông khách', 'Thân thiện', 'Có chỗ đậu xe', 'Wifi tốt',
    'Bình thường', 'Tệ', 'Cần cải thiện', 'Quay lại', 'Món signature',
  ];

  const suggestionBox = document.createElement('div');
  suggestionBox.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:white;border:1.5px solid var(--border);border-radius:10px;box-shadow:var(--shadow-hover);z-index:100;display:none;padding:.5rem;max-height:200px;overflow-y:auto;';

  wrapper.style.position = 'relative';
  wrapper.appendChild(suggestionBox);

  const input = wrapper.querySelector('input');
  if (!input) return;

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    if (q.length === 0) {
      suggestionBox.style.display = 'none';
      return;
    }

    const matches = suggestions.filter(s => s.toLowerCase().includes(q));
    if (matches.length === 0) {
      suggestionBox.style.display = 'none';
      return;
    }

    suggestionBox.innerHTML = matches.map(s => `
      <div style="padding:.5rem .75rem;border-radius:8px;cursor:pointer;font-size:.875rem;color:var(--text);transition:background .15s" 
           onmouseover="this.style.background='var(--bg-alt)'" 
           onmouseout="this.style.background=''"
           onmousedown="event.preventDefault()"
           onclick="addTagSuggestion('${s}')">
        ${s}
      </div>
    `).join('');
    suggestionBox.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { suggestionBox.style.display = 'none'; }, 200);
  });

  window.addTagSuggestion = (tag) => {
    const existing = Array.from(wrapper.querySelectorAll('.w2e-tag-input__tag span')).map(s => s.textContent);
    if (!existing.includes(tag)) {
      const tagEl = document.createElement('span');
      tagEl.className = 'w2e-tag-input__tag';
      tagEl.innerHTML = `<span>${tag}</span><button type="button" onclick="this.parentElement.remove()">×</button>`;
      wrapper.insertBefore(tagEl, input);
    }
    input.value = '';
    suggestionBox.style.display = 'none';
    input.focus();
  };
}

// ============================================================
// INIT FOOD NOTES PAGE
// ============================================================
function initFoodNotes() {
  loadNotesFromLS();
  filterNotes();
  initViewToggle();
  initNoteSearch();
  initNoteSort();
  initStatusFilter();
  initNoteRatingFilter();
  renderTagCloud();
}

// ============================================================
// INIT CREATE FOOD NOTE PAGE
// ============================================================
function initCreateFoodNote() {
  initCreateNoteForm();
  initInteractiveStarRating();
  initCreateTagInput();
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('notesGrid')) {
    initFoodNotes();
  }
  if (document.getElementById('createNoteForm')) {
    initCreateFoodNote();
  }
});

// Expose globals
window.togglePin = togglePin;
window.toggleNoteFavorite = toggleNoteFavorite;
window.deleteNote = deleteNote;
window.toggleTagFilter = toggleTagFilter;
window.noteState = noteState;
window.FOOD_NOTES_DATA = FOOD_NOTES_DATA;
