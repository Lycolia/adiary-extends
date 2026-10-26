# nginxの設定

## 4.09までの公開フォルダの転送

4.10で公開フォルダの持ち方を変えた（`docs/仕様/機能一覧.md`の「3.5 複数のブログ」）。

| 4.09まで                      | 4.10から                  |
| ----------------------------- | ------------------------- |
| `/pub/ブログID/image/adiary/` | `/pub/attachments/posts/` |
| `/pub/ブログID/image/`        | `/pub/attachments/`       |
| `/pub/ブログID/`              | `/pub/`                   |

記事のHTML、RSS、サイトマップなど、adiaryが作るものは4.10のアップデート処理で新しいパスになる。記事の原文に手で書いたパス（Markdownのリンク、`<img>`、`<source>`など）と、外のサイトからのリンクやRSSの購読は古いパスのままなので、nginxで301に転送する。

`ブログID`は4.09までのブログのIDに置き換える。上から順に当たるので、この順で書く。

```nginx
location ^~ /pub/ブログID/ {
    rewrite ^/pub/ブログID/image/adiary/(.*)$ /pub/attachments/posts/$1 permanent;
    rewrite ^/pub/ブログID/image/(.*)$        /pub/attachments/$1       permanent;
    rewrite ^/pub/ブログID/(.*)$              /pub/$1                   permanent;
}
```

非公開モードで公開フォルダに文字列を付けていた（`/pub/ブログID.文字列/`）ときは、その名前でも同じ`location`を足す。

## 非公開のフォルダ

公開するのは`pub/`だけ（`docs/仕様/機能一覧.md`の「5. データ」）。ほかのフォルダは`.htaccess`で拒否しているが、nginxは`.htaccess`を読まないので、`location`で拒否する。

```nginx
location ~ ^/(?:__cache|data|info|lib|plugin|skel|skel\.local|docs|t)/ { deny all; }
location ~ /\.  { deny all; }
location ~ \.cgi$  { deny all; }
```

- 1行目は、非公開のフォルダ。末尾の`/`まで合わせて、フォルダの中だけを拒否する。
- 2行目は、`.git/`、`.htaccess`などのドットで始まるもの。
- 3行目は、`adiary.conf.cgi`などの設定ファイル。
- 正規表現の`location`は、`location /`より先に当たる。

## 4.10までの配布物のファイルの転送

4.11で、ルートにあった配布物のフォルダを`pub/assets/`の下に移した。

| 4.10まで     | 4.11から             |
| ------------ | -------------------- |
| `/js/`       | `/pub/assets/js/`    |
| `/pub-dist/` | `/pub/assets/dist/`  |
| `/theme/`    | `/pub/assets/theme/` |

ページが読み込むパスはadiaryが新しいパスで出す。記事の原文に手で書いたパスと、外のサイトからのリンクは古いパスのままなので、nginxで301に転送する。

```nginx
location ^~ /js/       { rewrite ^/js/(.*)$       /pub/assets/js/$1    permanent; }
location ^~ /pub-dist/ { rewrite ^/pub-dist/(.*)$ /pub/assets/dist/$1  permanent; }
location ^~ /theme/    { rewrite ^/theme/(.*)$    /pub/assets/theme/$1 permanent; }
```

`js`、`pub-dist`、`theme`は4.11からコンテンツのキーの先頭に使えるが、この転送を入れている間は、`/js/…`のように`/`が続くURLは転送が先に当たる。その名前のコンテンツを作るときは、転送を外す。
