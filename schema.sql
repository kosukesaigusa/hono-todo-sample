-- テーブルが存在する場合は削除
DROP TABLE IF EXISTS todos;

-- テーブルの作成
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  client_id TEXT NOT NULL
);

-- サンプルデータの挿入
INSERT INTO
  todos (title, completed, client_id)
VALUES
  (
    '買い物に行く',
    0,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'レポートを書く',
    1,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '運動する',
    0,
    '00000000-0000-0000-0000-000000000002'
  );

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX idx_client_id ON todos(client_id);