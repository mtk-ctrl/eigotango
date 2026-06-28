-- 通知チャネルに 'none'（オフ）を許可
alter table profiles drop constraint if exists profiles_notification_channel_check;
alter table profiles add constraint profiles_notification_channel_check
  check (notification_channel in ('none', 'line', 'email', 'both'));
