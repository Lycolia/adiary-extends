use strict;
use utf8;
#-------------------------------------------------------------------------------
# 主な操作の中身のテスト
#-------------------------------------------------------------------------------
# 実行: prove t/operations.t
#
# 操作をしてから画面やファイルを見て、思ったとおりに変わったかを確かめる。
# 権限は t/permission_*.t、画面のエラーは t/screens.t で確かめる。
#
use FindBin;
BEGIN { push(@INC, "$FindBin::Bin/lib", "$FindBin::Bin/../lib"); }
use Test::More;
our $TODO;
use AppTest;

binmode(Test::More->builder->$_, ':utf8') foreach (qw(output failure_output todo_output));

my $app = AppTest->new()->setup()->seed();
my $dir = $app->dir;

sub body {
	my $b = shift->{body} // '';
	utf8::decode($b);
	return $b;
}
sub read_file {
	my $file = shift;
	open(my $fh, '<:utf8', $file) || return '';
	local $/;
	return <$fh>;
}
sub json_ok {
	my $r = shift;
	return $r->{json} && defined $r->{json}->{ret} && $r->{json}->{ret} eq '0';
}
my %ART = (action => 'edit', parser => 'markdown', enable => 1, com_ok => 1, ymd => '2026-10-10');

#-------------------------------------------------------------------------------
# 記事
#-------------------------------------------------------------------------------
subtest '記事を書く' => sub {
	my $r = $app->post('editor', '', { %ART, title => '新しい記事', body_txt => "新しい**本文**\n", tag_ary => '新しいタグ' });
	ok(AppTest::is_reload($r), '保存できる');

	$r = $app->get('guest', '/04');
	is($r->{status}, 200, '記事のページが出る');
	like($r->{title}, qr/^新しい記事 - /, '題名');
	like(body($r), qr{新しい<strong>本文</strong>}, '本文はMarkdownからHTMLになる');
	like(body($r), qr{新しいタグ}, 'タグが出る');

	like(body($app->get('guest', '')), qr{新しい記事}, 'トップに出る');
	like(body($app->get('guest', '&t=' . AppTest::_uri_escape('新しいタグ'))), qr{新しい記事}, 'タグの一覧に出る');
	like(read_file("$dir/pub/rss.xml"), qr{新しい記事}, 'RSSに出る');
};

subtest '下書き' => sub {
	my $r = $app->post('editor', '', { %ART, title => '下書きの記事', body_txt => "下書き\n", enable => 0 });
	ok(AppTest::is_reload($r), '保存できる');
	is($app->get('guest', '/05')->{status}, 404, 'ログインしていない人には出ない');
	like($app->get('editor', '/05')->{title}, qr/^下書きの記事 - /, '編集者には出る');
	unlike(body($app->get('guest', '')), qr{下書きの記事}, 'トップに出ない');
	unlike(read_file("$dir/pub/rss.xml"), qr{下書きの記事}, 'RSSに出ない');
};

subtest '記事を直す' => sub {
	my $r = $app->post('editor', '', { %ART, edit_pkey_int => 1, title => '直した題名', body_txt => "直した本文\n", ymd => '2026-10-01' });
	ok(AppTest::is_reload($r), '保存できる');

	$r = $app->get('guest', '/01');
	like($r->{title}, qr/^直した題名 - /, '題名が変わる');
	like(body($r), qr{直した本文}, '本文が変わる');
	like(read_file("$dir/pub/rss.xml"), qr{直した題名}, 'RSSも変わる');

	$r = $app->post('editor', '', { action => 'ajax_revision', pkey => 1 });
	my $revs = $r->{json};
	ok(ref($revs) eq 'ARRAY' && @$revs == 1, '更新履歴に、直す前の版が1つ残る');
};

subtest '他人の記事' => sub {
	my $r = $app->post('owner', '', { %ART, edit_pkey_int => 1, title => 'ブログ管理者が直した', body_txt => "本文\n" });
	ok(AppTest::is_reload($r), 'ブログ管理者は、編集者の記事を直せる');

	# 自分の記事だけを直せる設定にすると、編集者はブログ管理者の記事を直せない
	$r = $app->post('owner', 'set/role', { action => 'set/role', admin_users => 'owner', editors => 'editor', viewers => '', view_pass => '', edit_by_author_only => 1 });
	ok(AppTest::is_reload($r), '「自分の記事だけ」にする');
	$r = $app->post('editor', '', { %ART, edit_pkey_int => 2, title => '編集者が直した', body_txt => "本文\n" });
	ok(!AppTest::is_reload($r), '編集者はブログ管理者の記事を直せない');
	unlike($app->get('guest', '/02')->{title}, qr/編集者が直した/, '題名は変わらない');

	$r = $app->post('owner', 'set/role', { action => 'set/role', admin_users => 'owner', editors => 'editor', viewers => '', view_pass => '' });
	ok(AppTest::is_reload($r), '元に戻す');
};

subtest 'ゴミ箱' => sub {
	my $r = $app->post('editor', '', { action => 'delete', delete_pkey_ary => 1, title => '' });
	ok(AppTest::is_reload($r), 'ゴミ箱へ移せる');
	is($app->get('guest', '/01')->{status}, 404, '記事のページは出ない');
	like(body($app->get('editor', 'trash')), qr{ブログ管理者が直した}, 'ゴミ箱に出る');

	$r = $app->post('editor', '', { action => 'trash', mode => 'restore', pkey_ary => 1 });
	ok(AppTest::is_reload($r), '戻せる');
	is($app->get('guest', '/01')->{status}, 200, '記事のページがまた出る');

	$r = $app->post('owner', '', { action => 'trash', mode => 'purge_all' });
	ok(AppTest::is_reload($r), 'ゴミ箱を空にできる');
	unlike(body($app->get('editor', 'trash')), qr{消す記事}, 'ゴミ箱から消える');
};

subtest '記事一覧からのまとめての操作' => sub {
	my $r = $app->post('editor', 'artlist', [ action => 'articles_edit', mode => 'disable', pkey_ary => 1, pkey_ary => 2 ]);
	ok(AppTest::is_reload($r), '非公開にできる');
	is($app->get('guest', '/01')->{status}, 404, '記事1は出ない');
	is($app->get('guest', '/02')->{status}, 404, '記事2は出ない');

	$r = $app->post('editor', 'artlist', [ action => 'articles_edit', mode => 'enable', pkey_ary => 1, pkey_ary => 2 ]);
	ok(AppTest::is_reload($r), '公開に戻せる');
	is($app->get('guest', '/01')->{status}, 200, '記事1が出る');
	is($app->get('guest', '/02')->{status}, 200, '記事2が出る');
};

#-------------------------------------------------------------------------------
# コメント
#-------------------------------------------------------------------------------
subtest 'ログインしていない人のコメント' => sub {
	# ブラウザーと同じく、記事のページのトークンを読み、3秒より後に送る
	my $r = $app->get('visitor', '/02');
	my ($secure) = body($r) =~ /data-secure="([^"]+)"/;
	ok($secure, 'コメント欄にトークンがある');
	my @ary = split(/,/, $secure);
	pop(@ary);
	my $sid = join('', map { chr($_ ^ (2 & 255)) } @ary);

	my %form = (action => 'comment_post', a_pkey => 2, secure_id => $sid, name => '通りすがり', comment_txt => 'ゲストのコメント', website => '');
	$r = $app->post('visitor', '/02', { %form });
	unlike(body($app->get('guest', '/02')), qr{ゲストのコメント}, 'トークンを出してからすぐに送ると、はじかれる');

	sleep(4);
	$r = $app->post('visitor', '/02', { %form, website => 'http://spam.example/' });
	unlike(body($app->get('guest', '/02')), qr{ゲストのコメント}, 'おとりの欄に入っていると、はじかれる');

	$r = $app->post('visitor', '/02', { %form });
	like($r->{title}, qr/^処理結果/, '投稿できる');
	like(body($app->get('guest', '/02')), qr{ゲストのコメント}, '記事のページに出る');
	like(body($app->get('editor', 'comlist')), qr{ゲストのコメント}, 'コメント一覧に出る');
};

subtest 'コメントの表示・非表示・削除' => sub {
	my $r = $app->post('editor', '', { action => 'comments_edit', disable => 1, pkey_ary => 1 });
	ok(AppTest::is_reload($r), '非表示にできる');
	unlike(body($app->get('guest', '/01')), qr{seedのコメント}, 'ログインしていない人には出ない');
	like(body($app->get('editor', '/01')), qr{seedのコメント}, '編集者には出る');

	$r = $app->post('editor', '', { action => 'comments_edit', enable => 1, pkey_ary => 1 });
	ok(AppTest::is_reload($r), '表示に戻せる');

	$r = $app->post('editor', '', { action => 'comments_edit', delete => 1, pkey_ary => 1 });
	ok(AppTest::is_reload($r), '削除できる');
	ok(!-e "$dir/data/db/com/00001.dat" || read_file("$dir/data/db/com/00001.dat") !~ /\S/, 'コメントが消える');
};

#-------------------------------------------------------------------------------
# NSFW
#-------------------------------------------------------------------------------
subtest 'NSFWの記事' => sub {
	my $r = $app->post('owner', '', { %ART, title => '成人向けの記事', body_txt => "成人向けの本文\n", nsfw => 1 });
	ok(AppTest::is_reload($r), '保存できる');
	$r = $app->get('guest', '/06');
	like(body($r), qr{<meta name="rating" content="adult">}, 'ratingのmetaが出る');
	like(body($r), qr{nsfw}i, '年齢確認が出る');
	my $rss = read_file("$dir/pub/rss.xml");
	like($rss, qr{成人向けの記事}, 'RSSに題名は出る');
	unlike($rss, qr{成人向けの本文}, 'RSSに本文は出ない');
};

#-------------------------------------------------------------------------------
# ブログの設定
#-------------------------------------------------------------------------------
subtest 'ブログの基本設定' => sub {
	my $r = $app->post('owner', 'set/', { action => 'set/index', blog_name => 'テストのブログ', description_txt => 'ブログの説明' });
	ok(AppTest::is_reload($r), '保存できる');
	$r = $app->get('guest', '');
	is($r->{title}, 'テストのブログ', 'トップの題名が変わる');
	like(body($r), qr{ブログの説明}, '説明が出る');
	like(read_file("$dir/pub/rss.xml"), qr{テストのブログ}, 'RSSの題名も変わる');
};

subtest 'ブログの権限' => sub {
	is($app->get('user', 'edit')->{status}, 403, 'userは記事を書けない');
	my $r = $app->post('owner', 'set/role', { action => 'set/role', admin_users => 'owner', editors => 'editor, user', viewers => '', view_pass => '' });
	ok(AppTest::is_reload($r), 'userを編集者にする');
	is($app->get('user', 'edit')->{status}, 200, 'userが記事を書ける');

	$r = $app->post('owner', 'set/role', { action => 'set/role', admin_users => 'owner', editors => 'editor', viewers => '', view_pass => '' });
	ok(AppTest::is_reload($r), '元に戻す');
	is($app->get('user', 'edit')->{status}, 403, 'userはまた記事を書けない');
};

subtest 'プライベートモードと表示パスワード' => sub {
	# 表示パスワードは、プライベートモードのときだけ効く
	my $r = $app->post('owner', 'set/', { action => 'set/index', blog_name => 'テストのブログ', description_txt => 'ブログの説明', private => 1 });
	ok(AppTest::is_reload($r), 'プライベートモードにする');
	foreach my $q ('', '/02', '&t=' . AppTest::_uri_escape('タグ2'), '&q=owner') {
		$r = $app->get('guest', $q);
		my $b = body($r);
		ok($r->{status} == 403 && $b !~ /ownerの記事|本文2|タグ2/, "ログインしていない人には ?$q で記事が出ない（403）");
	}
	like(body($app->get('guest', '')), qr{ブログを見る権限がありません}, 'ログインしていない人には、権限が無いことを出す');
	is($app->get('guest', '/99999')->{status}, 403, '無い記事でも同じ403（記事があるかは分からない）');
	is($app->get('guest', 'login')->{status}, 200, 'ログインの画面は開ける');
	like(body($app->get('editor', '/02')), qr{本文2}, '編集者には記事が出る');

	# 公開フォルダのファイルは、推測できない名前のフォルダへ移る
	my ($private) = map { m{/(private\.[^/]+)$} } glob("$dir/pub/private.*");
	ok($private, '公開フォルダのファイルを、推測できない名前のフォルダへ移す');
	ok(!-e "$dir/pub/rss.xml" && -f "$dir/pub/$private/rss.xml", 'RSSが移る');
	ok(!-e "$dir/pub/attachments" && -f "$dir/pub/$private/attachments/test/a.png", '画像が移る');
	ok(-d "$dir/pub/assets", '配布物（pub/assets/）は移さない');
	like(body($app->get('editor', '')), qr{/pub/$private/rss\.xml}, '編集者の画面のRSSのURLも変わる');

	$r = $app->post('owner', 'set/role', { action => 'set/role', admin_users => 'owner', editors => 'editor', viewers => '', view_pass => 'secret' });
	ok(AppTest::is_reload($r), '表示パスワードを設定する');

	$r = $app->get('guest', '/02');
	is($r->{status}, 403, 'パスワードが無いと記事を見られない');
	unlike(body($r), qr{本文2}, '記事の中身は出ない');

	$app->set_cookie('reader', 'view-pass', 'wrong');
	is($app->get('reader', '/02')->{status}, 403, 'パスワードが違うと見られない');
	$app->set_cookie('reader', 'view-pass', 'secret');
	is($app->get('reader', '/02')->{status}, 200, 'パスワードが合うと見られる');

	$r = $app->post('owner', 'set/role', { action => 'set/role', admin_users => 'owner', editors => 'editor', viewers => '', view_pass => '' });
	ok(AppTest::is_reload($r), '表示パスワードを消す');
	$r = $app->post('owner', 'set/', { action => 'set/index', blog_name => 'テストのブログ', description_txt => 'ブログの説明', private => 0 });
	ok(AppTest::is_reload($r), 'プライベートモードを外す');
	is($app->get('guest', '/02')->{status}, 200, 'ログインしていない人も見られる');
	ok(!glob("$dir/pub/private.*") && -f "$dir/pub/rss.xml" && -f "$dir/pub/attachments/test/a.png", '公開フォルダのファイルが pub/ に戻る');
};

subtest 'タグの削除' => sub {
	# seed() のタグ1（pkey=1）は記事1に付いている
	my $r = $app->post('editor', 'set2/tag_edit', { action => 'set2/tag_edit', del_ary => 1 });
	ok(AppTest::is_reload($r), '削除できる');
	is($app->get('guest', '&t=' . AppTest::_uri_escape('タグ1'))->{status}, 404, 'タグの一覧に記事が出ない');
	like(body($app->get('guest', '&t=' . AppTest::_uri_escape('タグ2'))), qr{ownerの記事}, 'ほかのタグはそのまま');
};

#-------------------------------------------------------------------------------
# 画像アルバム
#-------------------------------------------------------------------------------
subtest '画像アルバム' => sub {
	my $png = do {
		open(my $fh, '<:raw', "$FindBin::Bin/../pub/assets/dist/default-icon.png") || die $!;
		local $/; <$fh>;
	};
	my $img = "$dir/pub/attachments/test";

	my $r = $app->post('editor', '', [ action => 'album/upload_form', folder => 'test/', size => 120,
		file_ary => { filename => 'up.png', content => $png, type => 'image/png' } ]);
	like($r->{body}, qr/^ret=0$/m, 'アップロードできる');
	ok(-f "$img/up.png", 'ファイルが置かれる');
	ok(-f "$img/.thumbnail/up.png.jpg", 'サムネイルが作られる');

	$r = $app->post('editor', '', { action => 'album/rename_file', folder => 'test/', old => 'up.png', name => 'renamed.png' });
	ok(json_ok($r), '名前を変えられる');
	ok(!-e "$img/up.png" && -f "$img/renamed.png", 'ファイルの名前が変わる');

	$r = $app->post('editor', '', { action => 'album/create_folder', folder => '/', name => 'other' });
	ok(json_ok($r), 'フォルダを作れる');
	$r = $app->post('editor', '', { action => 'album/move_files', from => 'test/', to => 'other/', file_ary => 'renamed.png' });
	ok(json_ok($r), '移せる');
	ok(!-e "$img/renamed.png" && -f "$dir/pub/attachments/other/renamed.png", 'ファイルが移る');

	$r = $app->post('editor', '', { action => 'album/delete_files', folder => 'other/', file_ary => 'renamed.png' });
	ok(json_ok($r), '削除できる');
	ok(!-e "$dir/pub/attachments/other/renamed.png", 'フォルダから消える');
};

#-------------------------------------------------------------------------------
# エクスポートとインポート
#-------------------------------------------------------------------------------
subtest 'エクスポートとインポート' => sub {
	my $r = $app->post('owner', '', { action => 'mainte/export', file => '10_movable_type' });
	is($r->{status}, 200, 'エクスポートできる');
	my $data = $r->{body};
	like($data, qr/TITLE: /, 'Movable Typeの形式で出る');
	my @titles = $data =~ /^TITLE: (.*)$/mg;
	utf8::decode($_) foreach (@titles);

	$r = $app->post('owner', '', { action => 'mainte/blog_clear', yes => 'yes' });
	ok(AppTest::is_reload($r), '全記事を消せる');
	is($app->get('guest', '/02')->{status}, 404, '記事が無くなる');

	$r = $app->post('owner', '', [ action => 'mainte/import', type => 'MT',
		file => { filename => 'export.txt', content => $data, type => 'text/plain' } ]);
	like($r->{body}, qr/^ret=0$/m, 'インポートできる');
	like($r->{body}, qr/^articles=${\ scalar(@titles)}$/m, '応答の articles= はインポートできた記事の数');
	my $list = body($app->get('editor', 'artlist'));	# 下書きも出る
	is(scalar(grep { index($list, $_) >= 0 } @titles), scalar(@titles), '出した記事（' . scalar(@titles) . '件）がすべて記事一覧に出る');
};

#-------------------------------------------------------------------------------
# 再構築
#-------------------------------------------------------------------------------
subtest '再構築' => sub {
	unlink("$dir/pub/rss.xml");
	my $r = $app->post('owner', '', { action => 'mainte/blog_rebuild' });
	ok(AppTest::is_reload($r), 'ブログを再構築できる');
	ok(-s "$dir/pub/rss.xml", 'RSSが書き出し直される');
};

#-------------------------------------------------------------------------------
# ユーザー
#-------------------------------------------------------------------------------
subtest 'ユーザー' => sub {
	my $r = $app->post('user', '', { action => '_ajax_self_change_name', name => '新しい名前' });
	ok(json_ok($r), '自分の名前を変えられる');
	like(body($app->get('user', 'menu')), qr{新しい名前}, '変えた名前が出る');

	$r = $app->post('user', '', { action => '_ajax_self_change_pass', now_pass => 'wrong', pass => 'new-pass-5678', pass2 => 'new-pass-5678' });
	ok(!json_ok($r), '今のパスワードが違うと変えられない');
	$r = $app->post('user', '', { action => '_ajax_self_change_pass', now_pass => $AppTest::PASS, pass => 'new-pass-5678', pass2 => 'new-pass-5678' });
	ok(json_ok($r), 'パスワードを変えられる');
	is($app->get('user', 'menu')->{status}, 403, 'パスワードを変えると、ログインしていたセッションが切れる');

	$r = $app->post('user', '', { action => '_ajax_login', adiary_id => 'user', pass => $AppTest::PASS });
	ok(!json_ok($r), '前のパスワードではログインできない');
	$r = $app->post('user', '', { action => '_ajax_login', adiary_id => 'user', pass => 'new-pass-5678' });
	ok(json_ok($r), '新しいパスワードでログインできる');

	$r = $app->post('admin', '', { action => '_ajax_user_edit', id => 'user', disable => 1 });
	ok(json_ok($r), 'システム管理者がユーザーを無効にできる');
	is($app->get('user', 'menu')->{status}, 403, '無効にすると、セッションが切れる');
	$r = $app->post('user', '', { action => '_ajax_login', adiary_id => 'user', pass => 'new-pass-5678' });
	ok(!json_ok($r), '無効にしたユーザーはログインできない');

	$r = $app->post('admin', '', { action => '_ajax_user_delete', id => 'user' });
	ok(json_ok($r), 'ユーザーを削除できる');
	unlike(body($app->get('admin', 'user/')), qr{>user<}, 'ユーザーの一覧から消える');
};

done_testing();
