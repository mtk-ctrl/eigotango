-- 単語リストのコピー時に先頭へ付ける見出し（例「今日の単語」）。
-- 空文字/NULL は「見出しなし」。冪等。
alter table profiles add column if not exists copy_header text;
