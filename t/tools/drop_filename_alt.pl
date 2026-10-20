#!/usr/bin/perl
use strict;
#-------------------------------------------------------------------------------
# 画像の代替テキストがファイル名と同じものを、記事の原文から落とす
#-------------------------------------------------------------------------------
# [image:S:folder/:x.png:x.png] → [image:S:folder/:x.png]（image:L も同じ）
#
# 書き換えるのは記事データ（data/db/*_art/0*.dat）の原文（_text）だけ。
# コードフェンスとコードスパンの中は書き換えない。
#
# 使い方:
#   perl t/tools/drop_filename_alt.pl            書き換える箇所と、変換結果が変わる記事を表示する（書き換えない）
#   perl t/tools/drop_filename_alt.pl --apply    書き換える。元のファイルは data/tmp/ の下に残す
#   perl t/tools/drop_filename_alt.pl --data=data/db/lycolia_art   対象のブログを指定
#   perl t/tools/drop_filename_alt.pl --lib=DIR  変換結果の確認に使うパーサー（既定は作業ツリーの lib）
#
# 注意:
#   - 代替テキストを省いた画像の title がタグ名（image:S）にならないパーサーが必要。
#     そうでないパーサーでは --apply を断る。
#   - 書き換え中に記事を保存しないこと（読んだ後にファイルが変わっていたら、その記事は飛ばす）。
#   - 保存済みの HTML（text 欄）は書き換えない。変換結果が変わる記事は、記事の再構築で作り直す。
#
use FindBin;
use Getopt::Long ();
use File::Copy ();
use File::Path ();
use POSIX ();

my $ROOT = "$FindBin::Bin/../..";

my %opt;
Getopt::Long::GetOptions(\%opt, 'apply', 'data=s@', 'lib=s');

my @dirs = $opt{data} ? @{ $opt{data} } : glob("$ROOT/data/db/*_art");
if (!@dirs) { die "記事データが見つかりません（--data で指定してください）\n"; }

my $lib = $opt{lib} || "$ROOT/lib";
unshift(@INC, $lib, "$FindBin::Bin/../lib");
require MarkdownTest;
require Satsuki::Base::HTTP;
{
	# [&URL] などで外部へアクセスしない
	no warnings 'redefine';
	*Satsuki::Base::HTTP::get = sub { return; };
}

# 代替テキストを省いた画像の title がタグ名になるパーサーでは、書き換えると表示が悪くなる
my $sample = MarkdownTest::parse_md('[image:S:a/:x.png]');
my $parser_ok = $sample !~ /title="image:S"/;
if ($opt{apply} && !$parser_ok) {
	die "このパーサーでは、代替テキストを省いた画像の title がタグ名（image:S）になります。先にパーサーを直してください。\n";
}

#-------------------------------------------------------------------------------
# 原文の書き換え
#-------------------------------------------------------------------------------
sub drop_alt {
	my $text = shift;
	my $count = 0;
	my $fence;
	my @lines = split(/\n/, $text, -1);
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
			if (@parts) {
				my $code = shift(@parts);
				shift(@parts);	# split の中の \2 の分
				$count += ($t =~ s/\[image:([SL]):([^\]:]*):([^\]:]+):\3\]/[image:$1:$2:$3]/g);
				$out .= $t . $code;
				next;
			}
			$count += ($t =~ s/\[image:([SL]):([^\]:]*):([^\]:]+):\3\]/[image:$1:$2:$3]/g);
			$out .= $t;
		}
		$_ = $out;
	}
	return (join("\n", @lines), $count);
}

#-------------------------------------------------------------------------------
# メイン
#-------------------------------------------------------------------------------
my $backup = "$ROOT/data/tmp/drop_filename_alt-" . POSIX::strftime('%Y%m%d%H%M%S', localtime);
my ($n_files, $n_tags, $n_changed, $n_skipped) = (0, 0, 0, 0);
my @changed;

foreach my $dir (@dirs) {
	(my $blog = $dir) =~ s|.*/||;
	foreach my $file (sort glob("$dir/0*.dat")) {
		my $mtime = (stat($file))[9];
		open(my $fh, '<', $file) or next;
		my $d = do { local $/; <$fh> };	# $/ の変更はこの読み込みだけに限る
		close($fh);
		if ($d !~ /\*_text=<<__END_BLK_DATA\n(.*?)\n__END_BLK_DATA\n/s) { next; }
		my ($text, $start, $len) = ($1, $-[1], $+[1] - $-[1]);

		my ($new, $count) = drop_alt($text);
		if (!$count) { next; }
		(my $pkey = $file) =~ s|.*/0*(\d+)\.dat$|$1|;
		$n_files++;
		$n_tags += $count;

		# 変換結果が変わるか（Markdown の記事だけ確かめる）
		my $diff = '';
		if ($d =~ /^parser=markdown$/m) {
			my $a = MarkdownTest::parse_md($text);
			my $b = MarkdownTest::parse_md($new);
			if ($a ne $b) {
				$n_changed++;
				$diff = ' （変換結果が変わる）';
				push(@changed, "$blog/$pkey");
			}
		}
		print "$blog/$pkey: $count 箇所$diff\n";

		if (!$opt{apply}) { next; }

		# 読んだ後に保存された記事は飛ばす
		if ((stat($file))[9] != $mtime) {
			print "  → 読んだ後にファイルが変わったため飛ばしました\n";
			$n_skipped++;
			next;
		}
		File::Path::make_path("$backup/$blog");
		File::Copy::copy($file, "$backup/$blog/") or die "$file のバックアップに失敗しました: $!\n";

		substr($d, $start, $len) = $new;
		open(my $out, '>', "$file.tmp") or die "$file.tmp: $!\n";
		print $out $d;
		close($out) or die "$file.tmp: $!\n";
		rename("$file.tmp", $file) or die "$file: $!\n";
	}
}

print "\n";
printf "対象: %d 記事 / %d 箇所 / 変換結果が変わる記事: %d\n", $n_files, $n_tags, $n_changed;
if (@changed) { print "  再構築が必要: ", join(' ', @changed), "\n"; }
if (!$parser_ok) {
	print "\n注意: このパーサーでは、代替テキストを省いた画像の title がタグ名（image:S）になります。\n";
	print "      先にパーサーを直してください。\n";
}
if ($opt{apply}) {
	printf "書き換えました（飛ばした記事: %d）。元のファイル: %s\n", $n_skipped, $backup;
} else {
	print "書き換えていません。書き換えるには --apply を付けてください。\n";
}
