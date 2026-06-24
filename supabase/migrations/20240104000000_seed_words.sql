-- 本番 words テーブルに単語データを投入（冪等）
-- seed.sql は supabase db push では流れないため、マイグレーションとして投入する。
-- word は UNIQUE 制約があるので ON CONFLICT DO NOTHING で再実行しても安全。
INSERT INTO words (word, reading, meaning, example_en, example_ja, grade, level) VALUES

-- 中1 基礎 (15語)
('apple', 'アップル', 'リンゴ', 'I eat an apple every morning.', '私は毎朝リンゴを食べます。', '中1', '基礎'),
('book', 'ブック', '本', 'This book is very interesting.', 'この本はとても面白いです。', '中1', '基礎'),
('eat', 'イート', '食べる', 'We eat dinner together.', '私たちは一緒に夕食を食べます。', '中1', '基礎'),
('family', 'ファミリー', '家族', 'My family is important to me.', '家族は私にとって大切です。', '中1', '基礎'),
('friend', 'フレンド', '友達', 'She is my best friend.', '彼女は私の親友です。', '中1', '基礎'),
('game', 'ゲーム', 'ゲーム、試合', 'Let''s play a game after school.', '放課後にゲームをしましょう。', '中1', '基礎'),
('happy', 'ハッピー', '幸せな', 'I am very happy today.', '今日はとても幸せです。', '中1', '基礎'),
('like', 'ライク', '好む、～のような', 'I like music very much.', '音楽がとても好きです。', '中1', '基礎'),
('music', 'ミュージック', '音楽', 'Music makes me feel better.', '音楽で気分が良くなります。', '中1', '基礎'),
('name', 'ネーム', '名前', 'What is your name?', 'あなたの名前は何ですか？', '中1', '基礎'),
('play', 'プレイ', '遊ぶ、演奏する', 'Children play in the park.', '子どもたちが公園で遊んでいます。', '中1', '基礎'),
('school', 'スクール', '学校', 'I go to school every day.', '毎日学校に行きます。', '中1', '基礎'),
('study', 'スタディ', '勉強する', 'I study English every night.', '毎晩英語を勉強します。', '中1', '基礎'),
('time', 'タイム', '時間', 'Time flies when you have fun.', '楽しいと時間が過ぎるのが早いです。', '中1', '基礎'),
('water', 'ウォーター', '水', 'Please drink more water.', 'もっと水を飲んでください。', '中1', '基礎'),

-- 中2 標準 (20語)
('abroad', 'アブロード', '海外で（に）', 'She studied abroad last year.', '彼女は去年海外で勉強しました。', '中2', '標準'),
('believe', 'ビリーブ', '信じる', 'I believe in your ability.', 'あなたの能力を信じています。', '中2', '標準'),
('collect', 'コレクト', '集める', 'He collects old stamps.', '彼は古い切手を集めています。', '中2', '標準'),
('develop', 'ディベロップ', '発展させる、開発する', 'We need to develop new skills.', '新しいスキルを身につける必要があります。', '中2', '標準'),
('effort', 'エフォート', '努力', 'Success needs a lot of effort.', '成功には多くの努力が必要です。', '中2', '標準'),
('fail', 'フェイル', '失敗する', 'Don''t be afraid to fail.', '失敗を恐れないでください。', '中2', '標準'),
('global', 'グローバル', '世界的な、地球規模の', 'Global warming is a serious problem.', '地球温暖化は深刻な問題です。', '中2', '標準'),
('happen', 'ハプン', '起こる', 'What happened yesterday?', '昨日何が起きましたか？', '中2', '標準'),
('improve', 'インプルーブ', '改善する、上達する', 'Practice will improve your skills.', '練習でスキルが上達します。', '中2', '標準'),
('join', 'ジョイン', '参加する、加わる', 'Please join our club.', '私たちのクラブに参加してください。', '中2', '標準'),
('leader', 'リーダー', 'リーダー、指導者', 'She is a great leader.', '彼女は素晴らしいリーダーです。', '中2', '標準'),
('method', 'メソッド', '方法', 'This method works well.', 'この方法はうまく機能します。', '中2', '標準'),
('nature', 'ネイチャー', '自然', 'We must protect nature.', '自然を守らなければなりません。', '中2', '標準'),
('opinion', 'オピニオン', '意見', 'In my opinion, this is wrong.', '私の意見では、これは間違っています。', '中2', '標準'),
('practice', 'プラクティス', '練習する', 'I practice piano every day.', '毎日ピアノを練習します。', '中2', '標準'),
('question', 'クエスチョン', '質問', 'Do you have any questions?', '何か質問はありますか？', '中2', '標準'),
('result', 'リザルト', '結果', 'The result was surprising.', '結果は驚くべきものでした。', '中2', '標準'),
('support', 'サポート', '支援する、支持する', 'Thank you for your support.', 'ご支援ありがとうございます。', '中2', '標準'),
('technology', 'テクノロジー', 'テクノロジー、技術', 'Technology changes our lives.', 'テクノロジーは私たちの生活を変えます。', '中2', '標準'),
('understand', 'アンダースタンド', '理解する', 'I understand your feelings.', 'あなたの気持ちが理解できます。', '中2', '標準'),

-- 中3 難関 (15語)
('achievement', 'アチーブメント', '達成、業績', 'This is a great achievement.', 'これは素晴らしい業績です。', '中3', '難関'),
('brilliant', 'ブリリアント', '素晴らしい、輝かしい', 'She had a brilliant idea.', '彼女は素晴らしいアイデアを思いついた。', '中3', '難関'),
('consequence', 'コンシークエンス', '結果、影響', 'Think about the consequences.', '結果について考えてください。', '中3', '難関'),
('dedicate', 'デディケイト', '捧げる、専念する', 'He dedicates his life to music.', '彼は音楽に人生を捧げています。', '中3', '難関'),
('environment', 'エンバイロンメント', '環境', 'Protect the environment.', '環境を守りましょう。', '中3', '難関'),
('fascinating', 'ファシネイティング', '魅力的な、うっとりするような', 'The story is fascinating.', 'その話は魅力的です。', '中3', '難関'),
('generation', 'ジェネレーション', '世代', 'Each generation has new challenges.', '各世代は新しい課題を持っています。', '中3', '難関'),
('hypothesis', 'ハイポシシス', '仮説', 'The scientist proved the hypothesis.', '科学者はその仮説を証明しました。', '中3', '難関'),
('immediately', 'イミーディアトリー', 'すぐに、即座に', 'Please reply immediately.', 'すぐに返信してください。', '中3', '難関'),
('journey', 'ジャーニー', '旅、旅程', 'Life is a long journey.', '人生は長い旅です。', '中3', '難関'),
('limitation', 'リミテーション', '限界、制限', 'Know your limitations.', '自分の限界を知りましょう。', '中3', '難関'),
('magnificent', 'マグニフィセント', '壮大な、素晴らしい', 'The view was magnificent.', '景色は壮大でした。', '中3', '難関'),
('necessary', 'ネセサリー', '必要な', 'Sleep is necessary for health.', '睡眠は健康に必要です。', '中3', '難関'),
('opportunity', 'オポチュニティ', '機会、チャンス', 'Don''t miss this opportunity.', 'このチャンスを逃さないでください。', '中3', '難関'),
('patience', 'ペイシェンス', '忍耐、我慢', 'Patience is a virtue.', '忍耐は美徳です。', '中3', '難関')

ON CONFLICT (word) DO NOTHING;
