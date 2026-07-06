# お絵かきチャット

React + Vite + TypeScript、Node.js + Express、Socket.IO、HTML Canvas で作成した、ブラウザだけで使えるリアルタイムお絵かきチャットです。部屋機能はなく、全ユーザーが1つの共通キャンバスと共通チャットを共有します。

## 必要環境

- Node.js 20 以上推奨
- npm 10 以上推奨
- モダンブラウザ（PC / スマートフォン）

## インストール方法

```bash
npm install
```

## 開発環境での起動方法

```bash
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3001

Vite の開発サーバーが `/socket.io` を Express サーバーへプロキシします。

## 本番環境へのデプロイ方法

1. 依存関係をインストールします。
   ```bash
   npm install
   ```
2. フロントエンドとバックエンドをビルドします。
   ```bash
   npm run build
   ```
3. サーバーを起動します。
   ```bash
   npm start
   ```

本番では Express が `dist/client` の静的ファイルを配信し、同じサーバー上で Socket.IO 通信を処理します。必要に応じて `PORT` 環境変数でポートを指定できます。

## プロジェクト構成

```text
.
├── server/                 # Express + Socket.IO サーバー
│   ├── index.ts            # 接続、描画同期、チャット同期、履歴管理
│   └── shared/types.ts     # サーバー側の型定義
├── src/                    # React + Vite フロントエンド
│   ├── main.tsx            # UI、Canvas 描画、Socket.IO クライアント
│   ├── styles.css          # レスポンシブUIスタイル
│   └── types.ts            # フロントエンド側の型定義
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 使用ライブラリ

- React / React DOM: UI 構築
- Vite: フロントエンド開発サーバー、ビルド
- TypeScript: 型安全な実装
- Express: HTTP サーバー、静的ファイル配信
- Socket.IO / socket.io-client: リアルタイム通信
- tsx: 開発時の TypeScript サーバー起動
- concurrently: フロントエンド・バックエンド同時起動

## 主な仕様

- 初回アクセス時にユーザー名を入力して参加
- 複数ユーザーによるリアルタイム同時描画
- 共通チャット
- ペン色、線の太さ、消しゴム、全消し
- 接続人数表示
- 参加・退出・全消し通知をチャットに表示
- サーバーメモリ上に描画履歴と直近100件のチャット履歴を保持
- 新規接続時に現在のキャンバスとチャット履歴を復元
- データベース、ログイン、画像保存は未使用

## 将来的な拡張案

- 部屋機能を追加して複数キャンバスを切り替える
- 画像保存・書き出し機能を追加する
- DB や Redis に描画履歴・チャット履歴を永続化する
- ユーザー認証や権限管理を追加する
- Undo / Redo、図形ツール、レイヤー機能を追加する
- 描画履歴の圧縮やスナップショット保存で大規模利用に対応する
