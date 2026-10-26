use strict;
#-------------------------------------------------------------------------------
# adiary_6.pm (C)nabe@abk
#-------------------------------------------------------------------------------
# ・システムアップデート
#-------------------------------------------------------------------------------
use SatsukiApp::adiary ();
use SatsukiApp::adiary_2 ();
use SatsukiApp::adiary_3 ();
use SatsukiApp::adiary_4 ();
use SatsukiApp::adiary_5 ();
package SatsukiApp::adiary;
################################################################################
# ■ワンライナーなサブルーチン等
################################################################################
my @update_versions = (
	{ ver => 2.93, plugin=>1, rebuild=>1, func=>'sys_update_293' },
	{ ver => 2.94, func=>'sys_update_294' },
	{ ver => 2.95, plugin=>1 },
	{ ver => 2.96, plugin=>1, theme=>1, func=>'sys_update_296' },
	{ ver => 2.97, plugin=>1, theme=>1, rebuild=>1, func=>'sys_update_297' },
	{ ver => 2.98, plugin=>1, theme=>1 },
	{ ver => 3.00, plugin=>1 },
	{ ver => 3.01, plugin=>1 },
	{ ver => 3.04, plugin=>1 },
	{ ver => 3.05, plugin=>1 },
	{ ver => 3.09, plugin=>1 },
	{ ver => 3.10, plugin=>1, theme=>1, func => 'sys_update_310', system=>1 },
	{ ver => 3.11, plugin=>1 },
	{ ver => 3.14, plugin=>1 },
	{ ver => 3.15, plugin=>1, func => 'sys_update_315', system=>1 },
	{ ver => 3.20, plugin=>1 },
	{ ver => 3.21, plugin=>1, theme=>1, rebuild_cond=>[
		'\[&https?://github\.com',
		'\[&https?://gist\.github\.com'
	]},
	{ ver => 3.22, plugin=>1 },
	{ ver => 3.23, plugin=>1 },
	{ ver => 3.24, plugin=>1 },
	{ ver => 3.30, plugin=>1, theme=>1 },
	{ ver => 3.31, plugin=>1, theme=>1 },
	{ ver => 3.32, plugin=>1 },
	{ ver => 3.34, plugin=>1 },
	{ ver => 3.40, plugin=>1 },
	{ ver => 3.50, plugin=>1, func => 'sys_update_350', system=>1 },
	{ ver => 3.52, func => 'sys_update_352' },
	{ ver => 3.53, rebuild=>1, func => 'sys_update_353' },
	{ ver => 4.08, info=>1, func => 'sys_update_408' },
	{ ver => 4.09, plugin=>1, func => 'sys_update_409' },
	{ ver => 4.10, plugin=>1, theme=>1, rebuild=>1 },	# データの持ち方を変えた（migrate_410）。パスが変わるので全部作り直す
	{ ver => 4.11, plugin=>1, theme=>1, rebuild_cond=>[	# js/、pub-dist/、theme/ を pub/assets/ の下に移した
		'\[(?:mj|icon|pubdist)[:\]]'				# pub-dist/ のパスを出す記法
	]},
	{ ver => 4.12, plugin=>1 }	# 記事一覧とコメント一覧を管理画面に移した。デザインに残るリンクを作り直して消す
);
#-------------------------------------------------------------------------------
# ●システムアップデート
#-------------------------------------------------------------------------------
sub system_update {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};
	my $auth = $ROBJ->{Auth};
	if (!$auth->{isadmin}) { $ROBJ->message('Operation not permitted'); return 5; }

	my %opt;
	my $cur = $self->{sys}->{VERSION};

	# データの持ち方の変更（Ver4.10）。各バージョンの処理は新しいテーブル名とパスで動くので、それより先に行う
	if ($cur < 4.10) {
		$self->migrate_410();
	}
	my $exists = $self->select_blog();

	foreach my $h (@update_versions) {
		if ($cur >= $h->{ver}) { next; }
		$ROBJ->message("System update for Ver %.2f", $h->{ver});
		$opt{rebuild} ||= $h->{rebuild};	# 全記事再構築
		$opt{plugin}  ||= $h->{plugin};		# プラグイン更新
		$opt{theme}   ||= $h->{theme};		# テーマカスタムCSS更新
		$opt{info}    ||= $h->{info};		# ブログ付加情報更新

		# 条件付きリビルド
		if ($h->{rebuild_cond}) {
			$opt{rebuild_cond} ||= [];
			push(@{ $opt{rebuild_cond} }, @{ $h->{rebuild_cond} });
		}

		my $func = $h->{func};
		if ($func && ($exists || $h->{system})) {
			$self->$func();
		}
		$cur = $h->{ver};
	}
	$self->select_blog();
	if (!$exists) { %opt = (); }	# ブログが無ければ再構築などは不要

	# 再構築
	if ($opt{rebuild}) {
		$ROBJ->message("Rebuild blog");
		$self->rebuild_blog();
		$opt{info} = 0;

	# 条件付き再構築（記事内容による）
	} elsif ($opt{rebuild_cond}) {
		my @ary = map { qr/$_/i } @{ $opt{rebuild_cond} };
		my $cnt = 0;
		my $filter = sub {
			my $h = shift;
			foreach(@ary) {
				if ($h->{_text} =~ /$_/) { $cnt++; return 1; }	# rebuild
			}
			return 0;
		};
		$self->rebuild_blog({ filter => $filter });
		if ($cnt) {
			$ROBJ->message("Rebuild '%d articles'", $cnt);
		}
		$opt{info} = 0;

	}
	# プラグイン再インストール
	if ($opt{plugin}) {
		$ROBJ->message("Reinstall all plugins");
		local($self->{stop_plugin_install_msg}) = 1;
		$self->reinstall_plugins();
	}
	# テーマカスタムCSS更新
	if ($opt{theme}) {
		$ROBJ->message("Remake all custom css");
		$self->remake_theme_custom_css();
	}
	# ブログ付加情報の再構築
	if ($opt{info}) {
		$ROBJ->message("Rebuild blog infomation");
		$self->blog_info_rebuild();
	}

	$self->update_sysdat('VERSION', $cur);
	return 0;
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.93
#-------------------------------------------------------------------------------
sub sys_update_293 {
	my $self = shift;
	my $blog = $self->{blog};
	$self->update_blogset($blog, 'http_rel');
	$self->update_blogset($blog, 'image_rel');
	$self->update_blogset($blog, 'image_data', 'lightbox=%k');
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.94
#-------------------------------------------------------------------------------
sub sys_update_294 {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};
	my $file = $self->{blogpub_dir} . 'usercss.css';
	if (-r $file) {
		my $lines = $ROBJ->fread_lines( $file );
		my $css = join('', @$lines);
		$self->save_usercss( $css );
		unlink( $file );
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.96
#-------------------------------------------------------------------------------
sub sys_update_296 {
	my $self = shift;
	my $blog = $self->{blog};
	$self->update_blogset($blog, 'bgfile_fit');
	$self->update_blogset($blog, 'bgfile_w');
	$self->update_blogset($blog, 'bgfile_h');
	$self->update_blogset($blog, 'bgfile');
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.97 (RC1)
#-------------------------------------------------------------------------------
sub sys_update_297 {
	my $self = shift;
	my $DB   = $self->{DB};
	my $ROBJ = $self->{ROBJ};
	my $blog = $self->{blog};
	my $desc = $blog->{description_txt};
	$ROBJ->tag_delete($desc);
	$self->update_blogset($blog, 'description_notag', $desc);

	# DB変更（古いログのテーブル「ブログID_log」は、migrate_410で消す）
	my $r=0;
	$r += 10*$DB->add_column("art", {name=>'main_image',  type=>'text'});
	$r += 10*$DB->add_column("art", {name=>'description', type=>'text'});

	if ($r) { $ROBJ->message("Blog database error(%s)", $r); }
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.10
#-------------------------------------------------------------------------------
sub sys_update_310 {
	my $self  = shift;
	my $ROBJ = $self->{ROBJ};
	if ($ROBJ->{FastCGI}) {
		my $soft = ($ENV{SERVER_SOFTWARE} =~ /Apache/i) ? 'Apache' : 'FastCGI';
		$ROBJ->warn("Restart of %s is required!", $soft);
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.15
#-------------------------------------------------------------------------------
sub sys_update_315 {
	my $self  = shift;
	my $pings = $self->{sys}->{ping_servers_txt};
	$pings =~ s!(^|\n)(http://blogsearch\.google\.(?:co\.jp|com)/ping/RPC2)!$1# $2!;
	$self->update_sysdat('ping_servers_txt', $pings);
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.30
#-------------------------------------------------------------------------------
sub sys_update_330 {
	my $self = shift;
	my $blog = $self->{blog};
	foreach(qw(http_target http_class http_data image_target image_class image_data section_anchor subsection_anchor)) {
		$self->update_blogset($blog, $_, undef);
	}
	$self->update_sysdat('edit_lock_interval', $self->{sys}->{edit_lock_time});
	$self->update_sysdat('edit_lock_time', undef);
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.50
#-------------------------------------------------------------------------------
sub sys_update_350 {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};
	my $auth = $ROBJ->{Auth};

	# DB変更
	my $r = $auth->{DB}->add_column($auth->{table}, {name=>'email', type=>'text'});
	if ($r) { $ROBJ->message("ALTER TABLE $auth->{table} add column error($r)"); }
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.52
#-------------------------------------------------------------------------------
sub sys_update_352 {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};

	# 記事の更新履歴テーブル、ゴミ箱テーブル追加
	my $r = 0;
	$r += $self->create_rev_table();
	$r += $self->create_trash_tables();
	if ($r) { $ROBJ->message("Blog database error(%s)", $r); }
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.53
#-------------------------------------------------------------------------------
# 記事の原文を書き換える（書き換えた後、全記事を再構築する）
# ・画像の代替テキストや添付ファイルの名前がファイル名と同じものを落とす。代替テキストの無い画像は末尾に : を付ける
# ・見出しに、今の見出しのIDを識別子[#id]として書き足す（Markdownの記事）
sub sys_update_353 {
	my $self = shift;
	$self->update_art_text_353();
}
sub update_art_text_353 {
	my $self   = shift;
	my $ROBJ   = $self->{ROBJ};
	my $DB     = $self->{DB};

	my $arts = $DB->select_match("art", '*cols', ['pkey', '_text', 'parser', 'link_key']);
	my %update;
	foreach(@$arts) {
		my $text = $self->normalize_file_alt( $_->{_text} );

		my $parser = $_->{parser} ne '' && $self->load_parser( $_->{parser} );
		if (ref($parser) && $_->{parser} eq 'markdown') {
			$self->post_process_link_key( $_ );
			$parser->{thisurl}  = $self->{myself2} . $_->{elink_key};
			$parser->{thispkey} = $_->{pkey};
			$text = $self->freeze_heading_ids_353( $parser, $text );
		}
		if ($text ne $_->{_text}) {
			$update{ $_->{pkey} } = { _text => $text };
		}
	}

	$DB->begin();
	foreach(keys(%update)) {
		$DB->update_match("art", $update{$_}, 'pkey', $_);
	}
	my $r = $DB->commit();
	if ($r) { $ROBJ->message("Blog database error(%s)", $r); }
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver4.08
#-------------------------------------------------------------------------------
# 参照元（バックリンク）のテーブルとカラムを追加する
# ※参照元は、この後のブログ付加情報の再構築（ARTICLE_STATE_CHANGE）で作られる
sub sys_update_408 {
	my $self = shift;
	my $DB   = $self->{DB};
	my $ROBJ = $self->{ROBJ};
	my $r = 0;
	$r +=    $self->create_link_table();
	$r += 10*$DB->add_column("art",   {name=>'backlinks', type=>'text'});
	$r += 10*$DB->add_column("trash", {name=>'backlinks', type=>'text'});
	if ($r) { $ROBJ->message("Blog database error(%s)", $r); }
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver4.09
#-------------------------------------------------------------------------------
# 履歴を残す間隔（rev_cycle）の単位を時間から分に変える
# 記事とゴミ箱のテーブルから、使われていなかったrevisionのカラムを消す
# ※コメントフォームのトークンを変えたため、プラグインの再インストールでデザインのスケルトンも作り直す
sub sys_update_409 {
	my $self = shift;
	my $DB   = $self->{DB};

	# 定義から外した後に作ったブログにはカラムが無く、エラーになるので出さない
	my $noerr = $DB->set_noerror(1);
	$DB->drop_column("art",   'revision');
	$DB->drop_column("trash", 'revision');
	$DB->set_noerror($noerr);

	my $blog = $self->{blog};
	if ($blog->{rev_cycle} ne '') {
		$self->update_blogset($blog, 'rev_cycle', int($blog->{rev_cycle}) * 60);
	}

	# 削除したプラグインを、入れたままのブログから外す
	$self->uninstall_removed_plugins_409();
}

# プラグインの管理画面での保存（save_use_plugins）は、plugin/に今あるプラグインしか見ないので、
# フォルダを消したプラグインは外せない。ブログに写したファイルとイベントが残り、動き続けてしまう。
sub uninstall_removed_plugins_409 {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};
	my $pd   = $self->load_plugins_dat();

	my $flag;
	# twitter_post : Twitter API v1.1が使えなくなったため削除
	# amp        : Googleの検索でAMPが有利でなくなり、手入れもされていないため削除
	# des_twitter: Xのタイムラインの埋め込みが、ログインしていない人に表示されなくなったため削除
	#              （デザインからは、デザインの作り直しで取り除く。reinstall_design_plugins）
	foreach my $name (qw(twitter_post amp des_twitter)) {
		# デザインモジュールは、複数置くと「名前,番号」の別名でも記録される
		my @names = sort { length($b) <=> length($a) } grep { $pd->{$_} && /^\Q$name\E(?:,\d+)?$/ } keys(%$pd);
		foreach my $n (@names) {
			# 外すときのイベント（ampは記事のテーブルに足したカラムを、デザインモジュールはCSSを消す）。
			# 処理はブログの側にあるので、プラグインのフォルダが無くても動く
			$self->call_event("UNINSTALL:$n");

			if ($self->plugin_uninstall($pd, { name => $n })) {
				$ROBJ->message("[plugin:%s] Uninstall failed", $n);
				next;
			}
			$flag = 1;
		}
	}
	if (!$flag) { return; }

	$ROBJ->fwrite_hash($self->{blog_dir} . 'plugins.dat', $pd);
	$self->set_event_info($self->{blog}, $pd);
}

#-------------------------------------------------------------------------------
# ●データの持ち方の変更（Ver4.10）
#-------------------------------------------------------------------------------
# ブログは1つだけにしたので、ブログIDを使わない持ち方にする。
# ・テーブル    ブログID_art など → art など
# ・データ      data/blog/ブログID/ → data/blog/
# ・公開フォルダ pub/ブログID/ → pub/、画像は pub/ブログID/image/ → pub/attachments/（adiary/ は posts/ にする）
# ・記事の原文の記法（[image:…:adiary/…]）と、ブログの設定のパスを書き換える
# ・ブログ管理テーブル（_bloglist）とデフォルトブログ（default_blogid）を消す
# ※ブログIDのテーブルが無いとき（ブログを作る前など）は、_bloglistとdefault_blogidを消すだけ
sub migrate_410 {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};
	my $DB   = $self->{DB};

	# 移すブログ（デフォルトブログ、無ければブログIDの順で最初のブログ）
	my $id = $self->{sys}->{default_blogid};
	if ($id !~ /^\w+$/ || !$DB->find_table("${id}_art")) {
		my $noerr = $DB->set_noerror(1);
		my $list  = $DB->select_match('_bloglist', '*cols', 'id');
		$DB->set_noerror($noerr);
		($id) = sort grep { /^\w+$/ && $DB->find_table("${_}_art") } map { $_->{id} } @$list;
	}
	if ($id ne '' && !$DB->find_table('art')) {
		$self->migrate_blog_410($id);
	}

	my $noerr = $DB->set_noerror(1);
	$DB->drop_table('_bloglist');
	$DB->set_noerror($noerr);
	$self->update_sysdat('default_blogid', undef);
	$self->update_sysdat('dir_postfix_len', undef);
	delete $self->{_cache_exists_blog};
}

sub migrate_blog_410 {
	my $self = shift;
	my $id   = shift;
	my $ROBJ = $self->{ROBJ};
	my $DB   = $self->{DB};
	$ROBJ->message("Migrate blog '%s'", $id);

	# テーブル
	foreach(qw(art com tag tagart rev trash trashcom link)) {
		if (!$DB->find_table("${id}_$_")) { next; }
		if ($DB->rename_table("${id}_$_", $_)) {
			$ROBJ->message("Rename table '%s' failed", "${id}_$_");
		}
	}
	my $noerr = $DB->set_noerror(1);
	$DB->drop_table("${id}_log");		# Ver2.97より前のもの
	$DB->set_noerror($noerr);

	# データ
	my $old_dir = "$self->{data_dir}blog/$id/";
	my $set     = $ROBJ->fread_hash("${old_dir}setting.dat");
	$self->move_dir_files_410($old_dir, $self->blog_dir());

	# 公開フォルダ（非公開モードで付けた文字列が付いていることがある）
	my $old_pub = "$self->{pub_dir}$id$set->{blogpub_dir_postfix}/";
	my $img_dir = $self->blogimg_dir();
	if (-d "${old_pub}image/") {
		rename("${old_pub}image/", $img_dir) || $ROBJ->message("Rename '%s' failed", "${old_pub}image/");
		if (-d "${img_dir}adiary/" && !-e "${img_dir}posts/") {
			rename("${img_dir}adiary/", "${img_dir}posts/") || $ROBJ->message("Rename '%s' failed", "${img_dir}adiary/");
		}
	}
	$self->move_dir_files_410($old_pub, $self->blogpub_dir());

	# ブログの設定のパス
	my %path = (
		"${old_pub}image/adiary/" => "${img_dir}posts/",
		"${old_pub}image/"        => $img_dir,
		$old_pub                  => $self->blogpub_dir()
	);
	my $re = join('|', map { quotemeta } sort { length($b) <=> length($a) } keys(%path));
	foreach(keys(%$set)) {
		$set->{$_} =~ s/($re)/$path{$1}/g;
	}
	$set->{edit_upload} =~ s|^adiary/|posts/|;
	delete $set->{blogpub_dir_postfix};
	$ROBJ->fwrite_hash($self->blog_dir() . 'setting.dat', $set);
	delete $self->{_cache_exists_blog};
	delete $self->{_loaded_bset};

	# 記事の原文の記法と、アイキャッチのパス
	foreach my $table (qw(art rev trash)) {
		if (!$DB->find_table($table)) { next; }
		my $cols = $table eq 'rev' ? ['pkey', '_text'] : ['pkey', '_text', 'main_image'];
		my $ary  = $DB->select_match($table, '*cols', $cols);
		$DB->begin();
		foreach(@$ary) {
			my %up;
			my $text = $_->{_text};
			if ($text =~ s/(\[(?:image|file):[^:\]\n]*:)adiary\//$1posts\//g) { $up{_text} = $text; }
			my $img  = $_->{main_image};
			if ($img ne '' && $img =~ s/($re)/$path{$1}/g) { $up{main_image} = $img; }
			if (%up) { $DB->update_match($table, \%up, 'pkey', $_->{pkey}); }
		}
		if ($DB->commit()) { $ROBJ->message("Blog database error(%s)", $table); }
	}

	# ブログに写したプラグインの処理が古いテーブル名を使っているので、先に入れ直す
	if ($self->select_blog()) {
		local($self->{stop_plugin_install_msg}) = 1;
		$self->reinstall_plugins();
	}
}

# $src の中身を $des に移し、$src を消す（同じ名前のものがあれば移さない）
sub move_dir_files_410 {
	my ($self, $src, $des) = @_;
	my $ROBJ = $self->{ROBJ};
	if (!-d $src) { return; }
	$ROBJ->mkdir($des);

	opendir(my $dh, $src) || return;
	my @files = grep { $_ ne '.' && $_ ne '..' } readdir($dh);
	closedir($dh);
	foreach(@files) {
		if (-e "$des$_") {
			$ROBJ->message("Already exists '%s'", "$des$_");
			next;
		}
		rename("$src$_", "$des$_") || $ROBJ->message("Rename '%s' failed", "$src$_");
	}
	rmdir($src);
}

#-------------------------------------------------------------------------------
# ●見出しに、今の見出しのIDを識別子[#id]として書き足す（Ver3.53）
#-------------------------------------------------------------------------------
# 見出しは行を見て探す（引用とリストとコードフェンスの中は見ない）。
# 書き足す前と後で変換結果がまったく同じになる時だけ書き足し、違えば元の原文を返す。
sub freeze_heading_ids_353 {
	my $self   = shift;
	my $parser = shift;
	my $text   = shift;
	my $ID = qr/[^\x00-\x20\x7F\]]+/;	# 識別子に使える文字

	my @before = $parser->parse($text);
	my @ids    = @{ $parser->{heading_ids} || [] };
	if (!@ids) { return $text; }

	my $n = 0;
	my $added = 0;
	my $fence;
	my $quote;
	my $list;
	my $blank;
	my @lines = split(/\n/, $text, -1);
	foreach(@lines) {
		# 引用は空行まで続く（>の無い行も引用の中）。
		# リストは、空行の後に字下げの無い行が来るまで続く（字下げの無い行も、空行の前なら項目の続き）。
		if ($_ =~ /^\s*$/) {
			undef $quote;
			$blank = 1;
		} else {
			if (/^ ? ? ?>/) { $quote = 1; }
			if (/^\s*(?:[\*\+\-]|\d+\.) +/) { $list = 1; }
			elsif ($blank && /^\S/) { undef $list; }
			undef $blank;
		}
		# 引用の>とリストの記号を除く
		my $rest = $_;
		$rest =~ s/^(?: ? ? ?>\s?|\s*(?:[\*\+\-]|\d+\.) +)*\s*//;
		if (defined $fence) {
			if ($rest =~ /^\Q$fence\E[`~]*\s*$/) { undef $fence; }
			next;
		}
		if ($rest =~ /^(```+|~~~+)/) {
			$fence = $1;
			next;
		}
		if ($quote || $list) { next; }	# 引用とリストの中の#は見出しにならない
		if ($_ !~ /^#+\s+(.*?)$/) { next; }
		my $title = $1;
		my $id = $ids[$n++];
		if ($title =~ /^(?:(.*?)[ \t]+)?\[#$ID\][ \t]*$/) { next; }	# 識別子がある
		if (!defined $id || $id !~ /^$ID$/) { return $text; }
		$_ =~ s/[ \t]*$/ [#$id]/;
		$added++;
	}
	if (!$added || $n != @ids) { return $text; }

	my $new   = join("\n", @lines);
	my @after = $parser->parse($new);
	if ($before[0] ne $after[0] || $before[1] ne $after[1]) { return $text; }
	return $new;
}

#-------------------------------------------------------------------------------
# ●画像の代替テキストや添付ファイルの名前を整える
#-------------------------------------------------------------------------------
# ファイル名と同じ代替テキストや名前を落とす。画像は代替テキストを書きやすいよう、末尾に : を付ける。
# [image:S:folder/:x.png:x.png] → [image:S:folder/:x.png:]（image:Lも同じ）
# [image:S:folder/:x.png]       → [image:S:folder/:x.png:]
# [file:mp4:folder/:x.mp4:x.mp4] → [file:mp4:folder/:x.mp4]
# コードフェンスとコードスパンの中は書き換えない。
sub normalize_file_alt {
	my $self = shift;
	my $replace = sub {
		$_[0] =~ s/\[image:([SL]):([^\]:]*):([^\]:]+)(?::\3)?\]/[image:$1:$2:$3:]/g;
		$_[0] =~ s/\[file:([^\]:]*):([^\]:]*):([^\]:]+):\3\]/[file:$1:$2:$3]/g;
	};
	my $fence;
	my @lines = split(/\n/, shift, -1);
	foreach(@lines) {
		# コードフェンスの中は書き換えない
		if (defined $fence) {
			if (/^\s*\Q$fence\E[`~]*\s*$/) { undef $fence; }
			next;
		}
		if (/^\s*(```+|~~~+)/) { $fence = $1; next; }

		# コードスパンの中は書き換えない
		my @parts = split(/((?<!`)(`+)(?!`).*?(?<!`)\2(?!`))/, $_);
		my $out = '';
		while(@parts) {
			my $t = shift(@parts);
			&$replace($t);
			$out .= $t;
			if (@parts) {
				$out .= shift(@parts);	# コードスパン
				shift(@parts);		# splitの中の\2の分
			}
		}
		$_ = $out;
	}
	return join("\n", @lines);
}

1;
