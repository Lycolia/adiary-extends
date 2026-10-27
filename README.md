<div align="center">
  <img src="pub/assets/dist/default-logo.svg" height="64" width="64">
</div>

# adiary-extends

このプログラムは[nabe-abk/adiary](https://github.com/nabe-abk/adiary)のフォークです。
原典となる著作権表記はオリジナルのREADMEである、[README.original.md](README.original.md)に記しています。

フォーク後の改変箇所についてはGitのコミットログに記すものとします。

このプロジェクトは本家の3.52devで追従を打ち切り、独自路線に転換しています。

主な変更点については[主な変更点](docs/主な変更点.md)に記載しています。

# 動作環境

- nginxまたはApache2
- Perl 5.14.0以降（pure Perl可）

# インストール方法

1. 解凍してでてきたファイルをサーバ上の任意の位置に置く
2. adiary.cgi に実行属性を付ける
3. `__cache/`, `data/`, `pub/`を`www`権限で書き込めるようにする。（suEXECの場合は不要）
4. `adiary.conf.cgi.sample`を`adiary.conf.cgi`としてコピーし適当にいじる
5. `adiary.cgi`にアクセスし、ID、パスワードを適当に入力してログイン。
6. その後、自分自身をユーザーとして追加する。

詳細は[オンラインマニュアル](http://adiary.org/v3man/)を参照してください。

# 著作権表示(Copyright)

Copyright (C)2013-2025 nabe@abk.

本プログラム（システム）はフリーソフトウェアです。

AGPL(AFFERO GENERAL PUBLIC LICENSE) Vesrion 3 または
それ以降のバージョンの下で本プログラム（システム）を再配布
することが可能です。

# 利用著作物

以下のものをライセンスに基づき使用しています。

## JavaScript

- jQuery (MIT)
  - jQuery UI (MIT / GPLv2)
  - dynatree (MIT)
  - Color Picker (MIT / GPL)
- [Lythumb-viewer](https://github.com/Lycolia/lythumb-viewer) (AGPLv3)
- [Prism.js](https://prismjs.com/) (MIT)

## Perl

- Image::Magick (Apache 2.0)
- Net::SSLeay (Perl)
- [Crypt::glibc](https://github.com/nabe-abk/Crypt-glibc) (LGPL / use Windows only)

## プラグインとテーマ

- `plugin/`以下に存在するプラグインはそれぞれ個別の著作物です。
- `pub/assets/theme/`以下に存在するテーマファイルはそれぞれ個別の著作物です。

ライセンスについては、各ディレクトリ内の README 等を参照してください。

## フォント

VLゴシックフォント（`pub/assets/dist/VL-PGothic-Regular.ttf`）を
ライセンスに基づき同梱しています。
フォントのライセンスは`pub/assets/dist/VLGothic/`以下を参照してください。

## 画像アイコン

- `pub/assets/dist/album-icon`以下のアイコンの多くはせりか氏の著作物です。
- `pub/assets/dist/album-icon/pdf.png`は http://iconhoihoi.oops.jp/ の著作物です。
- `pub/assets/dist/album-icon`以下の`g-\*.png`と`trashbox.png`はGNOME Desktopアイコンです。
- `pub/assets/dist/mahjong/`以下のファイルは「[麻雀豆腐](http://majandofu.com/mahjong-images)」の画像を利用しています。
- `pub/assets/theme/base.css`のソーシャルボタンのXとFacebookのロゴは、各社の商標です。はてなブックマークのマーク（「B!ブックマーク」）は、はてなの公式のブックマークボタンのものです。

せりか氏著作物のライセンスは、adiaryのライセンスに準じます。
