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
