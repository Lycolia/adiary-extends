# adiary-extends

このプログラムは[nabe-abk/adiary](https://github.com/nabe-abk/adiary)のフォークです。
原典となる著作権表記はオリジナルのREADMEである、[README.original.md](README.original.md)に記しています。

フォーク後の改変箇所についてはGitのコミットログに記すものとします。

このプロジェクトは基本的に本家の最新版に追従しますが、最新版の変更点が独自追加機能と衝突した場合は、原則的に独自機能を優先します。

# 動作環境

- Apache またはそれと互換性のあるWebサーバ
- Perl 5.8.1以降（pure Perl可）

# インストール方法

1. 解凍してでてきたファイルをサーバ上の任意の位置に置く
2. adiary.cgi に実行属性を付ける
3. \_\_cache/, data/, pub/ を www 権限で書き込めるようにする。（suEXEC の場合は不要）
4. adiary.conf.cgi.sample を adiary.conf.cgi としてコピーし適当にいじる
5. adiary.cgi にアクセスし、ID、パスワードを適当に入力してログイン。
6. その後、自分自身をユーザーとして追加する。

詳細は[オンラインマニュアル](http://adiary.org/v3man/)を参照してください。
