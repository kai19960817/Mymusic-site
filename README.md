# 🎵 Music Artist Homepage

アーティストの音楽・ギャラリーを公開するためのホームページです。

---

## 📁 ファイル構成

```
music-site/
├── index.html   # ページ構造
├── style.css    # デザイン
├── main.js      # 機能・動作
└── README.md    # このファイル
```

---

## 🌐 公開URL の確認方法

GitHub Pages で公開後、URLは以下の場所で確認できます：

1. リポジトリの **「Settings」→「Pages」** を開く
2. 上部に青いバナーで表示されます

```
✅ Your site is live at:
https://【ユーザー名】.github.io/music-site/
```

または、リポジトリのトップページ右側の **「Deployments」→「github-pages」** からも確認できます。

---

## 🔐 管理者ログイン

URLの末尾に `?admin` を付けてアクセスします。

```
通常閲覧:  https://【ユーザー名】.github.io/music-site/
管理者:    https://【ユーザー名】.github.io/music-site/?admin
```

| 項目 | 値 |
|---|---|
| ユーザーID | `admin` |
| パスワード | `music1234` |

> ⚠️ パスワードは `main.js` の先頭で変更できます

---

## ✨ 機能一覧

### 👁 閲覧者（ログイン不要）
- ギャラリーの閲覧
- 音楽の再生
- ページネーション（30枚ごと）
- 画像のライトボックス拡大

### 🎛 管理者
- 画像＋音楽カードの追加・削除
- 音楽ファイルの紐付け（MP3・WAV・OGG）
- YouTube / Spotify の埋め込み
- Instagram / X のリンク設定

---

## 🛠 カスタマイズ

### アーティスト名・自己紹介を変える
`index.html` を開いて編集：

```html
<!-- アーティスト名 -->
<h1>Your <em>Sound</em></h1>

<!-- 自己紹介 -->
<p class="hero-sub">ここに自己紹介文を入力</p>

<!-- メールアドレス -->
<a href="mailto:kaifarronclaire@gmail.com">
```

### テーマカラーを変える
`style.css` の先頭を編集：

```css
:root {
  --bg:      #1a2420;  /* 背景色 */
  --accent:  #8fbc8f;  /* アクセントカラー */
  --text:    #dde8e2;  /* テキスト色 */
}
```

### 管理者パスワードを変える
`main.js` の先頭を編集：

```js
const ADMIN_ID = 'admin';      // ← IDを変更
const ADMIN_PW = 'music1234';  // ← パスワードを変更
```

---

## ⚠️ 注意

- 追加した画像・音楽は**ブラウザを閉じるとリセット**されます（サーバー不使用のため）
- 恒久保存にはデータベース連携が必要です

---

*© 2025 Artist Name — Music Homepage*
