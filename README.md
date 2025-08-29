# adiary-extends

このプログラムは[nabe-abk/adiary](https://github.com/nabe-abk/adiary)のフォークです。
原典となる著作権表記はオリジナルのREADMEである、[README.original.md](README.original.md)に記しています。

フォーク後の改変箇所についてはGitのコミットログに記すものとします。

このプロジェクトは基本的に本家の最新版に追従しますが、最新版の変更点が独自追加機能と衝突した場合は、原則的に独自機能を優先します。

# 動作環境

  * Apache またはそれと互換性のあるWebサーバ
  * Perl 5.14.0以降（pure Perl可）

# インストール方法

1. 解凍してでてきたファイルをサーバ上の任意の位置に置く
2. adiary.cgi に実行属性を付ける
3. \_\_cache/, data/, pub/ を www 権限で書き込めるようにする。（suEXEC の場合は不要）
4. adiary.conf.cgi.sample を adiary.conf.cgi としてコピーし適当にいじる
5. adiary.cgi にアクセスし、ID、パスワードを適当に入力してログイン。
6. その後、自分自身をユーザーとして追加する。

詳細は[オンラインマニュアル](http://adiary.org/v3man/)を参照してください。

# 著作権表示(Copyright)

 Copyright (C)2013-2025 nabe@abk.

本プログラム（システム）はフリーソフトウェアです。

AGPL(AFFERO GENERAL PUBLIC LICENSE) Vesrion 3 または
それ以降のバージョンの下で本プログラム（システム）を再配布
することが可能です。

もっと緩いライセンスをご希望の場合は、
理由を沿えてお知らせください。
考慮するかもしれません。

特にベースシステムに関しては、
より緩いライセンスへの移行も考えています。

# パッチを送られる方へ

パッチやPull Requestを送信される場合は、
必ずコードのライセンスを明記してください。
MITライセンスやPerlライセンスだと大変助かります。

ライセンスが不明記、
またはライセンスの内容によっては、
当方で記述し直すことがあります。
ご了承ください。

# 利用著作物

以下のものをライセンスに基づき使用しています。

## JavaScript

  * jQuery (MIT)
    * jQuery UI (MIT / GPLv2)
    * dynatree  (MIT)
    * Color Picker (MIT / GPL)
  * [Fancybox v3.5.7](https://github.com/fancyapps/fancybox) (GPLv3)
  * [Prism.js](https://prismjs.com/) (MIT)

## Perl

  * Image::Magick (Apache 2.0)
  * Net::SSLeay (Perl)
  * CryptX (Perl)
  * [Crypt::glibc](https://github.com/nabe-abk/Crypt-glibc) (LGPL / use Windows only)

## プラグインとテーマ

  * plugin/ 以下に存在するプラグインはそれぞれ個別の著作物です。
  * theme/ 以下に存在するテーマファイルはそれぞれ個別の著作物です。

ライセンスについては、各ディレクトリ内の README 等を参照してください。

## フォント

VLゴシックフォント（pub-dist/VL-PGothic-Regular.ttf）を
ライセンスに基づき同梱しています。
フォントのライセンスは pub-dist/VLGothic/ 以下を参照してください。

## 画像アイコン

  * pub-dist/album-icon 以下のアイコンの多くはせりか氏の著作物です。
  * pub-dist/album-icon/pdf.png は http://iconhoihoi.oops.jp/ の著作物です。
  * pub-dist/album-icon 以下の g-*.png と trashbox.png はGNOME Desktopアイコンです。
  * pub-dist/mahjong/ 以下のファイルは「[麻雀豆腐](http://majandofu.com/mahjong-images)」の画像を利用しています。
  * theme/_img/social-buttons.png は「Simplicity (GPL)」に含まれるアイコンを元にしました。

せりか氏著作物のライセンスは、adiaryのライセンスに準じます。
