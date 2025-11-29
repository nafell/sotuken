# 作業ログ

## VPS環境構築
rootで22番にssh接続

### 作業ユーザ作成
tk220307, 管理者
```bash
sudo adduser tk220307
cat /etc/passwd | grep tk220307
```
```bash
sudo gpasswd -a tk220307 sudo
```

### ssh設定変更
1. ポート番号を30722に変更
2. root接続を禁止
3. AuthorizedKeyFileを指定
4. vim ~/.ssh/authorized_keys
5. chmod 700 ~/.ssh/authorized_keys
6. sudo systemctl restart ssh