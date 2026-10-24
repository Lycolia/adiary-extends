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
	{ ver => 3.10, plugin=>1, theme=>1, func => 'sys_update_310' },
	{ ver => 3.11, plugin=>1 },
	{ ver => 3.14, plugin=>1 },
	{ ver => 3.15, plugin=>1, func => 'sys_update_315' },
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
	{ ver => 3.50, plugin=>1, func => 'sys_update_350' },
	{ ver => 3.52, func => 'sys_update_352' },
	{ ver => 3.53, rebuild=>1, func => 'sys_update_353' },
	{ ver => 4.08, info=>1, func => 'sys_update_408' },
	{ ver => 4.09, plugin=>1, func => 'sys_update_409' }
);
#-------------------------------------------------------------------------------
# ●システムアップデート
#-------------------------------------------------------------------------------
sub system_update {
	my $self = shift;
	my $ROBJ = $self->{ROBJ};
	my $auth = $ROBJ->{Auth};
	if (!$auth->{isadmin}) { $ROBJ->message('Operation not permitted'); return 5; }

	my $cur_blogid = $self->{blogid};
	my $blogs = $self->load_all_blogid();

	my %opt;
	my $cur = $self->{sys}->{VERSION};
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
		if ($func) {
			$self->$func($blogs);
		}
		$cur = $h->{ver};
	}
	$self->set_and_select_blog($cur_blogid);

	# 再構築
	if ($opt{rebuild}) {
		$ROBJ->message("Rebuild all blogs");
		$self->rebuild_all_blogs();
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
		$self->rebuild_all_blogs({ filter => $filter });
		if ($cnt) {
			$ROBJ->message("Rebuild '%d articles' of all blogs", $cnt);
		}
		$opt{info} = 0;

	}
	# プラグイン再インストール
	if ($opt{plugin}) {
		$ROBJ->message("Reinstall all plugins");
		$self->reinstall_all_plugins();
	}
	# テーマカスタムCSS更新
	if ($opt{theme}) {
		$ROBJ->message("Remake all custom css");
		$self->remake_all_custom_css();
	}
	# ブログ付加情報の再構築
	if ($opt{info}) {
		$ROBJ->message("Reinstall all blogs infomation");
		$self->rebuild_all_blogs_info();
	}

	$self->update_sysdat('VERSION', $cur);
	return 0;
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.93
#-------------------------------------------------------------------------------
sub sys_update_293 {
	my $self  = shift;
	my $blogs = shift;
	my $ROBJ = $self->{ROBJ};
	foreach(@$blogs) {
		$self->update_blogset($_, 'http_rel');
		$self->update_blogset($_, 'image_rel');
		$self->update_blogset($_, 'image_data', 'lightbox=%k');
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.94
#-------------------------------------------------------------------------------
sub sys_update_294 {
	my $self  = shift;
	my $blogs = shift;
	my $ROBJ = $self->{ROBJ};
	foreach(@$blogs) {
		$self->set_and_select_blog( $_ );
		#
		my $file = $self->{blogpub_dir} . 'usercss.css';
		if (-r $file) {
			my $lines = $ROBJ->fread_lines( $file );
			my $css = join('', @$lines);
			$self->save_usercss( $css );
			unlink( $file );
		}
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.96
#-------------------------------------------------------------------------------
sub sys_update_296 {
	my $self  = shift;
	my $blogs = shift;
	my $ROBJ = $self->{ROBJ};
	foreach(@$blogs) {
		$self->update_blogset($_, 'bgfile_fit');
		$self->update_blogset($_, 'bgfile_w');
		$self->update_blogset($_, 'bgfile_h');
		$self->update_blogset($_, 'bgfile');
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver2.97 (RC1)
#-------------------------------------------------------------------------------
sub sys_update_297 {
	my $self  = shift;
	my $blogs = shift;
	my $DB   = $self->{DB};
	my $ROBJ = $self->{ROBJ};
	foreach(@$blogs) {
		my $blog = $self->load_blogset($_);
		my $desc = $blog->{description_txt};
		$ROBJ->tag_delete($desc);
		$self->update_blogset($blog, 'description_notag', $desc);

		# DB変更
		my $r=0;
		$r +=    $DB->drop_table("${_}_log");
		$r += 10*$DB->add_column("${_}_art", {name=>'main_image',  type=>'text'});
		$r += 10*$DB->add_column("${_}_art", {name=>'description', type=>'text'});

		if ($r) { $ROBJ->message("Blog '$_' database error($r)"); }
	}
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
	my $self  = shift;
	my $blogs = shift;
	foreach(@$blogs) {
		my $blog = $self->load_blogset($_);
		foreach(qw(http_target http_class http_data image_target image_class image_data section_anchor subsection_anchor)) {
			$self->update_blogset($blog, $_, undef);
		}
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
	my $self  = shift;
	my $blogs = shift;
	my $ROBJ  = $self->{ROBJ};

	# 記事の更新履歴テーブル、ゴミ箱テーブル追加
	foreach(@$blogs) {
		my $r = 0;
		$r += $self->create_rev_table($_);
		$r += $self->create_trash_tables($_);
		if ($r) { $ROBJ->message("Blog '$_' database error($r)"); }
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver3.53
#-------------------------------------------------------------------------------
# 記事の原文を書き換える（書き換えた後、全記事を再構築する）
# ・画像の代替テキストや添付ファイルの名前がファイル名と同じものを落とす。代替テキストの無い画像は末尾に : を付ける
# ・見出しに、今の見出しのIDを識別子[#id]として書き足す（Markdownの記事）
sub sys_update_353 {
	my $self = shift;
	$self->do_all_blogs('update_art_text_353');
}
sub update_art_text_353 {
	my $self   = shift;
	my $ROBJ   = $self->{ROBJ};
	my $DB     = $self->{DB};
	my $blogid = $self->{blogid};

	my $arts = $DB->select_match("${blogid}_art", '*cols', ['pkey', '_text', 'parser', 'link_key']);
	my %update;
	foreach(@$arts) {
		my $text = $self->normalize_file_alt( $_->{_text} );

		my $parser = $_->{parser} ne '' && $self->load_parser( $_->{parser} );
		if (ref($parser) && $_->{parser} eq 'markdown') {
			$self->post_process_link_key( $_ );
			$parser->{thisurl}  = $self->get_blog_path( $blogid ) . $_->{elink_key};
			$parser->{thispkey} = $_->{pkey};
			$text = $self->freeze_heading_ids_353( $parser, $text );
		}
		if ($text ne $_->{_text}) {
			$update{ $_->{pkey} } = { _text => $text };
		}
	}

	$DB->begin();
	foreach(keys(%update)) {
		$DB->update_match("${blogid}_art", $update{$_}, 'pkey', $_);
	}
	my $r = $DB->commit();
	if ($r) { $ROBJ->message("Blog '$blogid' database error($r)"); }
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver4.08
#-------------------------------------------------------------------------------
# 参照元（バックリンク）のテーブルとカラムを追加する
# ※参照元は、この後のブログ付加情報の再構築（ARTICLE_STATE_CHANGE）で作られる
sub sys_update_408 {
	my $self  = shift;
	my $blogs = shift;
	my $DB    = $self->{DB};
	my $ROBJ  = $self->{ROBJ};
	foreach(@$blogs) {
		my $r = 0;
		$r +=    $self->create_link_table($_);
		$r += 10*$DB->add_column("${_}_art",   {name=>'backlinks', type=>'text'});
		$r += 10*$DB->add_column("${_}_trash", {name=>'backlinks', type=>'text'});
		if ($r) { $ROBJ->message("Blog '$_' database error($r)"); }
	}
}

#-------------------------------------------------------------------------------
# ●システムアップデート for Ver4.09
#-------------------------------------------------------------------------------
# 履歴を残す間隔（rev_cycle）の単位を時間から分に変える
# ※コメントフォームのトークンを変えたため、プラグインの再インストールでデザインのスケルトンも作り直す
sub sys_update_409 {
	my $self  = shift;
	my $blogs = shift;
	my $ROBJ  = $self->{ROBJ};
	foreach(@$blogs) {
		my $blog = $self->load_blogset($_);
		if ($blog->{rev_cycle} eq '') { next; }
		$self->update_blogset($blog, 'rev_cycle', int($blog->{rev_cycle}) * 60);
	}

	# 削除したプラグインを、入れたままのブログから外す
	$self->do_all_blogs('uninstall_removed_plugins_409');

	# デフォルトのブログ設定値
	my $file = $self->{my_default_setting_file};
	if (!-e $file) { return; }
	my $def = $ROBJ->fread_hash($file);
	if ($def->{rev_cycle} eq '') { return; }
	$def->{rev_cycle} = int($def->{rev_cycle}) * 60;
	$ROBJ->fwrite_hash($file, $def);
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
	foreach my $name (qw(twitter_post amp)) {
		if (!$pd->{$name}) { next; }

		# 外すときのイベント（ampは記事のテーブルに足したカラムを消す）。
		# 処理はブログの側に写してあるので、プラグインのフォルダが無くても動く
		$self->call_event("UNINSTALL:$name");

		if ($self->plugin_uninstall($pd, { name => $name })) {
			$ROBJ->message("[plugin:%s] Uninstall failed", $name);
			next;
		}
		$flag = 1;
	}
	if (!$flag) { return; }

	$ROBJ->fwrite_hash($self->{blog_dir} . 'plugins.dat', $pd);
	$self->set_event_info($self->{blog}, $pd);
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
