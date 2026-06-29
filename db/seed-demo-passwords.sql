-- =====================================================================
-- seed-demo-passwords.sql — pose de VRAIS hash bcrypt sur les comptes de
-- démo (mots de passe connus, documentés dans le README). À exécuter APRÈS
-- seed.sql. Réservé à une base de DÉMONSTRATION.
-- =====================================================================
UPDATE users SET password_hash='$2a$12$GMj8MPJkF8cyIbtBMo01XuMBdVJXV4gOaqNfVqazAh37SokZukyTa', must_change_password=false, password_changed_at=password_changed_at WHERE email='justine@image-coaching.test';
UPDATE users SET password_hash='$2a$12$kFhVU5oyuFFW5YS09Uj9eOZZdSxSSXlvyTfhChRMQDrGAunbpG8aq', must_change_password=true, password_changed_at=NULL WHERE email='lea.martin@example.test';
UPDATE users SET password_hash='$2a$12$w2AoAiKjipdC8Esa0XEX3.pzr63hCcdvDWRkuhGZq3fNMKLq35zx2', must_change_password=false, password_changed_at=now() WHERE email='manon.petit@example.test';
