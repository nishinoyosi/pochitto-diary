# ポチっと日記（フェーズ1・個人用PWA）

タグと気分を選ぶだけで、AIが日記文を作ってくれる個人用アプリです。
外出先ではタグとメモだけ記録し、あとでまとめてAI生成する運用を想定しています。

構成は要求設計書（`diary_app_requirements.md`）の11章で推奨した
**A案（HTML/CSS/JS、ビルド不要のPWA）** です。

## ファイル構成

```
diary-pwa/
├── index.html         アプリ本体（画面の入れ物）
├── styles.css          デザイン
├── app.js              ロジック（状態管理・描画・保存・AI生成）
├── manifest.json        PWAの設定（ホーム画面アイコン等）
├── service-worker.js    オフラインでも開けるようにするための仕組み
├── icon-192.png         ホーム画面アイコン（小）
├── icon-512.png         ホーム画面アイコン（大）
└── README.md            このファイル
```

## まずは手元で試す

このフォルダをそのままブラウザで開くだけでも動作は確認できますが、
Service Worker（オフライン対応）とAPI通信は `file://` では正しく動かないことが多いので、
簡易サーバーを立てて確認するのがおすすめです。

```bash
cd diary-pwa
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

## データの保存場所とプライバシー

- 日記のデータ（気分・タグ・メモ・生成した文章）は、**すべてこの端末のブラウザ内
  （localStorage）に保存**されます。外部のサーバーには一切送信されません。
- AI生成機能を使う場合のみ、入力内容（気分・タグ・メモ）が直接
  Anthropic社のAPI（`api.anthropic.com`）に送信されます。日記データを
  こちら側のサーバーで預かることはありません（そもそもサーバー自体がありません）。

## AI生成機能を使うには（任意）

AI生成は任意機能です。設定しなくても「簡易文」で日記は完成します。

1. https://console.anthropic.com でAPIキーを発行する
2. アプリ右上の⚙アイコン →「Anthropic APIキー」欄に貼り付けて保存

**注意**：このAPIキーはあなたのブラウザの中だけに保存され、Anthropicの
API以外には送信されません。ただし、ブラウザの開発者ツールを見れば
キーの文字列自体は見えてしまう仕組みです。他の人と共有する端末では
使わないことをおすすめします。

生成に使うモデルは `app.js` 冒頭の `DEFAULT_MODEL` 定数
（既定値: `claude-haiku-4-5-20251001`）で指定しています。
最新のモデル名は https://docs.claude.com で確認・変更できます。

## スマホのホーム画面に追加する

1. 下記のいずれかの方法で公開したURLをスマホのブラウザで開く
2. iPhone(Safari): 共有ボタン →「ホーム画面に追加」
   Android(Chrome): メニュー →「ホーム画面に追加」／「アプリをインストール」

これでアイコンをタップするだけで、ネイティブアプリのように起動します。

## 公開する（GitHub Pagesの例）

個人用なので、無料の静的ホスティングで十分です。GitHub Pagesの手順例：

```bash
# 1. GitHub上に新しいリポジトリを作成（例: pochitto-diary）
# 2. このフォルダの中身をそのままリポジトリ直下にコピーしてpush
cd diary-pwa
git init
git add .
git commit -m "ポチっと日記 フェーズ1"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/pochitto-diary.git
git push -u origin main

# 3. GitHubのリポジトリ設定 → Pages → Branch を "main" / "/(root)" に設定
# 数分待つと https://<あなたのユーザー名>.github.io/pochitto-diary/ で公開されます
```

公開後にURLが変わったら、`manifest.json` の `start_url` / `scope` は
相対パス（`./`）のままで問題ありません。

## 自動同期を使う（複数端末・Supabase）

スマホとPCなど複数端末で自動的にデータを同期したい場合は、無料のSupabaseを使えます。
使わなくてもアプリ自体は動くので、任意の機能です。

### 1. Supabaseプロジェクトを作る

1. https://supabase.com でアカウント作成 → 「New Project」
2. プロジェクト作成後、左メニューの「SQL Editor」を開き、以下を実行してテーブルを作成：

```sql
create table if not exists diary_sync (
  sync_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table diary_sync enable row level security;

create policy "allow anon full access"
on diary_sync
for all
to anon
using (true)
with check (true);
```

3. 左メニュー「Project Settings」→「API」から、**Project URL** と **anon public key** をコピーしておく

### 2. アプリ側で設定する

1. アプリ右上の⚙設定を開く
2. 「自動同期（Supabase）」欄に、Project URL・anon public key・**同期パスフレーズ**（自分で決める、長めのランダムな文字列）を入力
3. 「同期を有効にする」を押す
4. **同じ3つの値（特に同期パスフレーズ）を、もう一方の端末にも同じように入力する**

これで、下書き保存・確定保存のたびに自動でクラウドへ送信され、アプリを開き直したときや
画面に戻ってきたときに自動で最新データを取り込むようになります。

### セキュリティ上の注意（重要）

この仕組みは、あなた一人のための簡易的な同期です。**同期パスフレーズが実質的な
パスワード**になっています。上記のanonキーとパスフレーズを知っている人は誰でも
そのデータを読み書きできてしまうため：

- パスフレーズは他人に教えない
- 短い単語ではなく、長くランダムな文字列にする（例: 特定の単語の羅列＋数字など）
- 本格的な会員制サービスのような安全性は保証されない、簡易的な仕組みだと理解した上で使う

より厳密なセキュリティが必要になった場合は、Supabase Authによるログイン機能を
追加する拡張も可能ですが、フェーズ1の範囲では扱っていません。

## 既知の制限（フェーズ1の範囲）

- 複数端末間のデータ同期はありません（この端末だけに保存されます）
- 生成し直すと以前の文章は上書きされます（バージョン管理はしていません）
- 標準の4カテゴリ（場所・買い物／外食／日課／その他）は削除・改名できません
  （新しいカテゴリの追加のみ対応）

これらは要求設計書のフェーズ2・3、あるいは「保留」としているため、
今回はあえて実装していません。使ってみて必要だと感じたら、また拡張できます。
