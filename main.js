/* ═══════════════════════════════════════════════
   main.js — Music Artist Homepage
   ═══════════════════════════════════════════════ */

/* ══════════════════════════════════════
   定数・状態
══════════════════════════════════════ */
const ADMIN_ID  = 'admin';
const ADMIN_PW  = 'music1234';
const PER_PAGE  = 30; // 5列 × 6行

let isAdmin       = false;
let currentPage   = 1;
let cards         = [];  // { imgUrl, audioObj, trackName, addedAt }
let currentAudio  = null;
let currentPlayBtn = null;

/* ══════════════════════════════════════
   🚀 起動処理
   URL に ?admin が含まれていたら
   管理者ログインモーダルを開く
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  renderGallery();

  // ?admin または ?admin=xxx でアクセスされたらモーダルを開く
  if (location.search.includes('admin')) {
    openAdminLoginModal();
  }
});

/* ══════════════════════════════════════
   🔐 管理者ログインモーダル
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
  // URL から ?admin を除去してきれいにする
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
    // URL をきれいにする
    history.replaceState(null, '', location.pathname);
    renderGallery(); // 管理者ボタンを再表示
  } else {
    const err = document.getElementById('admin-error');
    err.textContent = 'IDまたはパスワードが違います';
    document.getElementById('admin-pw').value = '';
    document.getElementById('admin-pw').focus();
  }
}

// ログアウト
document.getElementById('btn-logout').addEventListener('click', () => {
  if (!confirm('管理者モードを終了しますか？')) return;
  isAdmin = false;
  document.body.classList.remove('is-admin');
  document.getElementById('admin-badge').style.display = 'none';
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  renderGallery();
});

/* ══════════════════════════════════════
   🖼️ GALLERY
══════════════════════════════════════ */
document.getElementById('add-card-btn').addEventListener('click', openModal);

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '';

  // 新しく追加した順（降順）
  const sorted = [...cards].sort((a, b) => b.addedAt - a.addedAt);
  const total  = sorted.length;
  const pages  = Math.max(1, Math.ceil(total / PER_PAGE));
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
  sorted.slice(start, start + PER_PAGE).forEach(d => grid.appendChild(buildCard(d)));
  renderPagination(pages, currentPage);
}

/* ── カード DOM 生成 ── */
function buildCard(data) {
  const card     = document.createElement('div');
  card.className = 'gallery-card';
  const hasAudio = !!data.audioObj;

  card.innerHTML = `
    <div class="gc-img">
      <img src="${data.imgUrl}" alt="${data.trackName}" loading="lazy" />
      <div class="gc-img-ov">拡大</div>
    </div>
    <div class="gc-player">
      <div class="gc-player-top">
        <button class="gc-play-btn${hasAudio ? '' : ' no-music'}">
          <svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
        </button>
        <div class="gc-info">
          <div class="gc-name">${hasAudio ? data.trackName : '— 音楽未設定 —'}</div>
          <div class="gc-dur">${hasAudio ? '0:00' : ''}</div>
        </div>
      </div>
      <div class="gc-bar-wrap"><div class="gc-bar"></div></div>
      ${isAdmin ? `
        <button class="gc-attach-btn admin-only">${hasAudio ? '🎵 音楽変更' : '＋ 音楽を紐付ける'}</button>
        <button class="gc-del-btn admin-only">🗑 削除</button>
      ` : ''}
    </div>`;

  // 画像 → ライトボックス
  card.querySelector('.gc-img').addEventListener('click', () => openLightbox(data.imgUrl));

  const playBtn = card.querySelector('.gc-play-btn');
  const bar     = card.querySelector('.gc-bar');
  const barWrap = card.querySelector('.gc-bar-wrap');
  const durEl   = card.querySelector('.gc-dur');

  if (hasAudio) {
    const syncDur = () => {
      if (!isNaN(data.audioObj.duration)) durEl.textContent = formatTime(data.audioObj.duration);
    };
    syncDur();
    data.audioObj.addEventListener('loadedmetadata', syncDur);
    data.audioObj.addEventListener('timeupdate', () => {
      bar.style.width = (data.audioObj.currentTime / data.audioObj.duration * 100) + '%';
    });
    data.audioObj.addEventListener('ended', () => {
      setPlayIcon(playBtn); bar.style.width = '0%';
    });
  }

  // 再生ボタン
  playBtn.addEventListener('click', () => {
    if (!hasAudio) return;
    if (currentAudio && currentAudio !== data.audioObj) {
      currentAudio.pause();
      if (currentPlayBtn) setPlayIcon(currentPlayBtn);
    }
    if (data.audioObj.paused) {
      data.audioObj.play();
      setPauseIcon(playBtn);
      currentAudio   = data.audioObj;
      currentPlayBtn = playBtn;
    } else {
      data.audioObj.pause();
      setPlayIcon(playBtn);
    }
  });

  // シークバー
  barWrap.addEventListener('click', e => {
    if (!hasAudio || !data.audioObj.duration) return;
    const r = barWrap.getBoundingClientRect();
    data.audioObj.currentTime = ((e.clientX - r.left) / r.width) * data.audioObj.duration;
  });

  // 管理者：音楽紐付け
  card.querySelector('.gc-attach-btn')?.addEventListener('click', () => {
    pickFile('audio/*', f => {
      if (data.audioObj) data.audioObj.pause();
      data.audioObj  = new Audio(URL.createObjectURL(f));
      data.trackName = f.name.replace(/\.[^/.]+$/, '');
      renderGallery();
    });
  });

  // 管理者：削除
  card.querySelector('.gc-del-btn')?.addEventListener('click', () => {
    if (!confirm('このカードを削除しますか？')) return;
    if (data.audioObj) data.audioObj.pause();
    cards = cards.filter(c => c !== data);
    renderGallery();
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
let modalImgUrl    = null;
let modalAudioObj  = null;
let modalAudioName = '未選択';

function openModal() {
  modalImgUrl = null; modalAudioObj = null; modalAudioName = '未選択';

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
      modalImgUrl = URL.createObjectURL(f);
      area.innerHTML = `<img src="${modalImgUrl}" style="width:100%;height:100%;object-fit:cover;display:block" />`;
    })
  );
  document.getElementById('modal-audio-name').textContent = '未選択';
  document.getElementById('modal-add').classList.add('active');
}

document.getElementById('modal-audio-btn').addEventListener('click', () =>
  pickFile('audio/*', f => {
    modalAudioObj  = new Audio(URL.createObjectURL(f));
    modalAudioName = f.name.replace(/\.[^/.]+$/, '');
    document.getElementById('modal-audio-name').textContent = modalAudioName;
  })
);

document.getElementById('modal-cancel').addEventListener('click', () =>
  document.getElementById('modal-add').classList.remove('active')
);

document.getElementById('modal-save').addEventListener('click', () => {
  if (!modalImgUrl) { alert('画像を選択してください'); return; }
  cards.unshift({ imgUrl: modalImgUrl, audioObj: modalAudioObj, trackName: modalAudioName, addedAt: Date.now() });
  currentPage = 1;
  document.getElementById('modal-add').classList.remove('active');
  renderGallery();

  // 最初の画像をヒーロー背景に
  const hero = document.getElementById('hero-img');
  if (!hero.src || hero.src === location.href) hero.src = modalImgUrl;
});

document.getElementById('modal-add').addEventListener('click', e => {
  if (e.target === e.currentTarget) document.getElementById('modal-add').classList.remove('active');
});

/* ── ファイル選択ヘルパー ── */
function pickFile(accept, callback) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = accept;
  input.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) callback(f);
  });
  input.click();
}

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
