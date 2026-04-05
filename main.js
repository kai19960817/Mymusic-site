/* ═══════════════════════════════════════════════
   main.js — Music Artist Homepage + Supabase
   ═══════════════════════════════════════════════ */

/* ══════════════════════════════════════
   🔧 Supabase 設定
══════════════════════════════════════ */
const SUPABASE_URL  = 'https://qfubgkknldxuucxrwnmv.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWJna2tubGR4dXVjeHJ3bm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTM2NzcsImV4cCI6MjA5MDk2OTY3N30.7k5LX9jidq97vC3MELEDfpldfjuncMnBRXxQfZXZ9jE';

// Supabase REST APIヘルパー
const SB = {
  headers: {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
  },

  // DBからカード一覧取得
  async getCards() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cards?order=added_at.desc`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // DBにカード追加
  async insertCard(data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cards`, {
      method: 'POST',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // DBからカード削除
  async deleteCard(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok) throw new Error(await res.text());
  },

  // DBのカード更新（音楽変更用）
  async updateCard(id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${id}`, {
      method: 'PATCH',
      headers: { ...this.headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Storageにファイルをアップロード
  async uploadFile(bucket, path, file) {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      }
    );
    if (!res.ok) throw new Error(await res.text());
    // 公開URLを返す
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  },
};

/* ══════════════════════════════════════
   定数・状態
══════════════════════════════════════ */
const ADMIN_ID = 'admin';
const ADMIN_PW = 'music1234';
const PER_PAGE = 30;

let isAdmin      = false;
let currentPage  = 1;
let cards        = [];   // DBから取得したカードデータ
let audioCache   = {};   // { card.id: Audio オブジェクト }
let currentAudio = null;
let currentPlayBtn = null;

/* ══════════════════════════════════════
   🚀 起動
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  showLoading(true);
  try {
    await loadCards();
  } catch (e) {
    console.error('Supabase接続エラー:', e);
    showToast('データの読み込みに失敗しました', 'error');
  }
  showLoading(false);

  if (location.search.includes('admin')) {
    openAdminLoginModal();
  }
});

/* ── カードをDBから読み込む ── */
async function loadCards() {
  cards = await SB.getCards();
  renderGallery();
}

/* ══════════════════════════════════════
   🔐 管理者ログイン
══════════════════════════════════════ */
function openAdminLoginModal() {
  document.getElementById('modal-admin-login').classList.add('active');
  setTimeout(() => document.getElementById('admin-id').focus(), 100);
}

document.getElementById('btn-admin-submit').addEventListener('click', doAdminLogin);
document.getElementById('admin-pw').addEventListener('keydown', e => {
  if (e.key === 'Enter') doAdminLogin();
});
document.getElementById('btn-admin-cancel').addEventListener('click', () => {
  document.getElementById('modal-admin-login').classList.remove('active');
  history.replaceState(null, '', location.pathname);
});

function doAdminLogin() {
  const id = document.getElementById('admin-id').value.trim();
  const pw = document.getElementById('admin-pw').value;
  if (id === ADMIN_ID && pw === ADMIN_PW) {
    isAdmin = true;
    document.body.classList.add('is-admin');
    document.getElementById('admin-badge').style.display = 'inline-block';
    document.getElementById('modal-admin-login').classList.remove('active');
    document.getElementById('admin-error').textContent = '';
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-pw').value = '';
    history.replaceState(null, '', location.pathname);
    renderGallery();
    showToast('管理者モードでログインしました');
  } else {
    document.getElementById('admin-error').textContent = 'IDまたはパスワードが違います';
    document.getElementById('admin-pw').value = '';
    document.getElementById('admin-pw').focus();
  }
}

document.getElementById('btn-logout').addEventListener('click', () => {
  if (!confirm('管理者モードを終了しますか？')) return;
  isAdmin = false;
  document.body.classList.remove('is-admin');
  document.getElementById('admin-badge').style.display = 'none';
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  renderGallery();
});

/* ══════════════════════════════════════
   🖼️ GALLERY レンダリング
══════════════════════════════════════ */
document.getElementById('add-card-btn').addEventListener('click', openModal);

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  const total = cards.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (currentPage > pages) currentPage = pages;

  if (total === 0) {
    const msg = document.createElement('p');
    msg.className = 'gallery-empty';
    msg.textContent = isAdmin
      ? '「＋ 追加」から画像と音楽を追加してください。'
      : 'まだコンテンツがありません。';
    grid.appendChild(msg);
    renderPagination(0, 0);
    return;
  }

  const start = (currentPage - 1) * PER_PAGE;
  cards.slice(start, start + PER_PAGE).forEach(d => grid.appendChild(buildCard(d)));
  renderPagination(pages, currentPage);
}

/* ── カード DOM 生成 ── */
function buildCard(data) {
  const card     = document.createElement('div');
  card.className = 'gallery-card';
  const hasAudio = !!data.audio_url;

  // Audio オブジェクトをキャッシュ（ページ再描画でも維持）
  if (hasAudio && !audioCache[data.id]) {
    audioCache[data.id] = new Audio(data.audio_url);
  }
  const audioObj = audioCache[data.id] || null;

  card.innerHTML = `
    <div class="gc-img">
      <img src="${data.img_url}" alt="${data.track_name}" loading="lazy" />
      <div class="gc-img-ov">拡大</div>
    </div>
    <div class="gc-player">
      <div class="gc-player-top">
        <button class="gc-play-btn${hasAudio ? '' : ' no-music'}">
          <svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
        </button>
        <div class="gc-info">
          <div class="gc-name">${hasAudio ? data.track_name : '— 音楽未設定 —'}</div>
          <div class="gc-dur">${hasAudio ? '0:00' : ''}</div>
        </div>
      </div>
      <div class="gc-bar-wrap"><div class="gc-bar"></div></div>
      ${isAdmin ? `
        <button class="gc-attach-btn admin-only">${hasAudio ? '🎵 音楽変更' : '＋ 音楽を紐付ける'}</button>
        <button class="gc-del-btn admin-only">🗑 削除</button>
      ` : ''}
    </div>`;

  card.querySelector('.gc-img').addEventListener('click', () => openLightbox(data.img_url));

  const playBtn = card.querySelector('.gc-play-btn');
  const bar     = card.querySelector('.gc-bar');
  const barWrap = card.querySelector('.gc-bar-wrap');
  const durEl   = card.querySelector('.gc-dur');

  if (hasAudio && audioObj) {
    const syncDur = () => {
      if (!isNaN(audioObj.duration)) durEl.textContent = formatTime(audioObj.duration);
    };
    syncDur();
    audioObj.addEventListener('loadedmetadata', syncDur);
    audioObj.addEventListener('timeupdate', () => {
      bar.style.width = (audioObj.currentTime / audioObj.duration * 100) + '%';
    });
    audioObj.addEventListener('ended', () => {
      setPlayIcon(playBtn); bar.style.width = '0%';
    });
  }

  // 再生ボタン
  playBtn.addEventListener('click', () => {
    if (!hasAudio || !audioObj) return;
    if (currentAudio && currentAudio !== audioObj) {
      currentAudio.pause();
      if (currentPlayBtn) setPlayIcon(currentPlayBtn);
    }
    if (audioObj.paused) {
      audioObj.play();
      setPauseIcon(playBtn);
      currentAudio   = audioObj;
      currentPlayBtn = playBtn;
    } else {
      audioObj.pause();
      setPlayIcon(playBtn);
    }
  });

  barWrap.addEventListener('click', e => {
    if (!hasAudio || !audioObj?.duration) return;
    const r = barWrap.getBoundingClientRect();
    audioObj.currentTime = ((e.clientX - r.left) / r.width) * audioObj.duration;
  });

  // 管理者：音楽紐付け・変更
  card.querySelector('.gc-attach-btn')?.addEventListener('click', async () => {
    pickFile('audio/*', async f => {
      showLoading(true);
      try {
        const path    = `audio/${Date.now()}_${f.name}`;
        const audioUrl = await SB.uploadFile('media', path, f);
        const trackName = f.name.replace(/\.[^/.]+$/, '');
        await SB.updateCard(data.id, { audio_url: audioUrl, track_name: trackName });

        // キャッシュ更新
        if (audioCache[data.id]) audioCache[data.id].pause();
        delete audioCache[data.id];

        await loadCards();
        showToast('音楽を保存しました ✓');
      } catch (e) {
        console.error(e);
        showToast('保存に失敗しました', 'error');
      }
      showLoading(false);
    });
  });

  // 管理者：削除
  card.querySelector('.gc-del-btn')?.addEventListener('click', async () => {
    if (!confirm('このカードを削除しますか？')) return;
    showLoading(true);
    try {
      if (audioCache[data.id]) { audioCache[data.id].pause(); delete audioCache[data.id]; }
      await SB.deleteCard(data.id);
      await loadCards();
      showToast('削除しました ✓');
    } catch (e) {
      console.error(e);
      showToast('削除に失敗しました', 'error');
    }
    showLoading(false);
  });

  return card;
}

/* ── ページネーション ── */
function renderPagination(totalPages, cur) {
  ['pag-top', 'pag-bot'].forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    if (totalPages <= 1) return;

    el.appendChild(mkPageBtn('‹', cur > 1, () => { currentPage--; renderGallery(); scrollToGallery(); }));
    for (let i = 1; i <= totalPages; i++) {
      const b = mkPageBtn(String(i), true, () => { currentPage = i; renderGallery(); scrollToGallery(); });
      if (i === cur) b.classList.add('active');
      el.appendChild(b);
    }
    el.appendChild(mkPageBtn('›', cur < totalPages, () => { currentPage++; renderGallery(); scrollToGallery(); }));
  });
}

function mkPageBtn(label, enabled, onClick) {
  const b = document.createElement('button');
  b.className = 'page-btn';
  b.textContent = label;
  if (enabled) b.addEventListener('click', onClick);
  else b.disabled = true;
  return b;
}

function scrollToGallery() {
  document.getElementById('gallery').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════
   📦 ADD CARD MODAL
══════════════════════════════════════ */
let modalImgFile   = null;
let modalImgUrl    = null;
let modalAudioFile = null;
let modalAudioName = '未選択';

function openModal() {
  modalImgFile = null; modalImgUrl = null;
  modalAudioFile = null; modalAudioName = '未選択';

  const area = document.getElementById('modal-img-area');
  area.innerHTML = `
    <button class="modal-img-btn" id="modal-img-btn">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <span>画像を選択（必須）</span>
    </button>`;
  document.getElementById('modal-img-btn').addEventListener('click', () =>
    pickFile('image/*', f => {
      modalImgFile = f;
      modalImgUrl  = URL.createObjectURL(f);
      area.innerHTML = `<img src="${modalImgUrl}" style="width:100%;height:100%;object-fit:cover;display:block" />`;
    })
  );
  document.getElementById('modal-audio-name').textContent = '未選択';
  document.getElementById('modal-add').classList.add('active');
}

document.getElementById('modal-audio-btn').addEventListener('click', () =>
  pickFile('audio/*', f => {
    modalAudioFile = f;
    modalAudioName = f.name.replace(/\.[^/.]+$/, '');
    document.getElementById('modal-audio-name').textContent = modalAudioName;
  })
);

document.getElementById('modal-cancel').addEventListener('click', () =>
  document.getElementById('modal-add').classList.remove('active')
);

document.getElementById('modal-save').addEventListener('click', async () => {
  if (!modalImgFile) { alert('画像を選択してください'); return; }

  document.getElementById('modal-add').classList.remove('active');
  showLoading(true);

  try {
    // 1. 画像をStorageにアップロード
    const imgPath = `images/${Date.now()}_${modalImgFile.name}`;
    const imgUrl  = await SB.uploadFile('media', imgPath, modalImgFile);

    // 2. 音楽があればアップロード
    let audioUrl   = null;
    let trackName  = '音楽未設定';
    if (modalAudioFile) {
      const audioPath = `audio/${Date.now()}_${modalAudioFile.name}`;
      audioUrl  = await SB.uploadFile('media', audioPath, modalAudioFile);
      trackName = modalAudioName;
    }

    // 3. DBに保存
    await SB.insertCard({ img_url: imgUrl, audio_url: audioUrl, track_name: trackName });

    // 4. 最初の画像をヒーロー背景に
    const hero = document.getElementById('hero-img');
    if (!hero.src || hero.src === location.href) hero.src = imgUrl;

    currentPage = 1;
    await loadCards();
    showToast('保存しました ✓');
  } catch (e) {
    console.error(e);
    showToast('保存に失敗しました。Supabaseの設定を確認してください。', 'error');
  }

  showLoading(false);
});

document.getElementById('modal-add').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('modal-add').classList.remove('active');
});

/* ══════════════════════════════════════
   🔍 LIGHTBOX
══════════════════════════════════════ */
function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('active');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLightbox();
});

/* ══════════════════════════════════════
   🔊 オーディオヘルパー
══════════════════════════════════════ */
function setPlayIcon(btn) {
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>';
}
function setPauseIcon(btn) {
  btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
}
function formatTime(s) {
  return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
}

/* ── ファイル選択ヘルパー ── */
function pickFile(accept, callback) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = accept;
  input.addEventListener('change', e => { const f = e.target.files[0]; if (f) callback(f); });
  input.click();
}

/* ══════════════════════════════════════
   ⏳ ローディング・トースト UI
══════════════════════════════════════ */
function showLoading(show) {
  let el = document.getElementById('loading-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loading-overlay';
    el.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}

function showToast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast toast--${type} toast--show`;
  setTimeout(() => el.classList.remove('toast--show'), 3000);
}

/* ══════════════════════════════════════
   📱 SNS
══════════════════════════════════════ */
function embedYoutube() {
  const input = document.getElementById('yt-url').value.trim();
  if (!input) return;
  const m = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!m) { alert('正しいYouTube URLを入力してください'); return; }
  document.getElementById('yt-embed-area').innerHTML = `
    <iframe class="sns-embed-frame" height="195"
      src="https://www.youtube.com/embed/${m[1]}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>
    <button class="sns-btn admin-only" style="margin-top:.6rem;width:100%" onclick="resetYT()">変更</button>`;
}
function resetYT() {
  document.getElementById('yt-embed-area').innerHTML = `
    <div class="sns-input-row admin-only"><input class="sns-input" id="yt-url" placeholder="YouTube動画URLを貼り付け" /><button class="sns-btn" onclick="embedYoutube()">埋め込み</button></div>
    <p class="sns-ph viewer-only">動画未設定</p>`;
}

function embedSpotify() {
  const input = document.getElementById('sp-url').value.trim();
  if (!input) return;
  document.getElementById('sp-embed-area').innerHTML = `
    <iframe class="sns-embed-frame" height="152"
      src="${input.replace('open.spotify.com/', 'open.spotify.com/embed/')}"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
    <button class="sns-btn admin-only" style="margin-top:.6rem;width:100%" onclick="resetSP()">変更</button>`;
}
function resetSP() {
  document.getElementById('sp-embed-area').innerHTML = `
    <div class="sns-input-row admin-only"><input class="sns-input" id="sp-url" placeholder="Spotify トラック/アルバムURL" /><button class="sns-btn" onclick="embedSpotify()">埋め込み</button></div>
    <p class="sns-ph viewer-only">楽曲未設定</p>`;
}

function openSNS(inputId) {
  const url = document.getElementById(inputId)?.value.trim();
  if (!url) { alert('URLを入力してください'); return; }
  window.open(url.startsWith('http') ? url : 'https://' + url, '_blank', 'noopener');
}
