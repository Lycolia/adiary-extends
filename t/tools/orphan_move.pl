#!/usr/bin/perl
# テキストDBの、indexに無い行ファイル（孤立したファイル）を退避用フォルダへ移す
#
#   perl orphan_move.pl <DBのフォルダ（data/db/）>                  … 数えて一覧を出すだけ。何も変えない
#   perl orphan_move.pl <DBのフォルダ（data/db/）> --move <退避先>  … 退避先/テーブル名/ へ移す
#
# - テーブルごとに #index.dat へ書き込みのロックをかけてから調べて移すので、サイトを動かしたままでもよい
#   （アプリは「行ファイルを書く→indexを保存する」の間、indexのロックを持っている）
# - ロックが30秒取れないテーブルは飛ばす
# - #index.dat が無いテーブルは触らない（indexを作り直すときに行ファイルが要るため）
# - 移したファイルの一覧を 退避先/moved.txt に書く。戻すときは、各ファイルを元のテーブルのフォルダへ移す
use strict;
use Fcntl qw(:flock);
use File::Path ();

my ($dir, $opt, $dest) = @ARGV;
if ($dir eq '' || ($opt ne '' && ($opt ne '--move' || $dest eq ''))) {
	die "usage: $0 <data/db/> [--move <退避先>]\n";
}
$dir =~ s|/?$|/|;
$dest =~ s|/?$|/| if ($dest ne '');
my $move = $dest ne '';
if ($move && -e $dest) {	# 空のフォルダなら使う
	opendir(my $x, $dest) || die "退避先がフォルダでない: $dest\n";
	if (grep { !/^\.\.?$/ } readdir($x)) { die "退避先が空でない: $dest\n"; }
	closedir($x);
}

opendir(my $dh, $dir) || die "$dir: $!";
my @tables = sort grep { /^\w+$/ && -d "$dir$_" } readdir($dh);
closedir($dh);

my $log;
my $total = 0;
foreach my $t (@tables) {
	my $index = "$dir$t/#index.dat";
	if (!-e $index) { print "$t: #index.dat が無いので飛ばす\n"; next; }

	# indexを開いて書き込みのロック（アプリと同じflock）
	open(my $fh, '+<', $index) || die "$index: $!";
	my $locked = eval {
		local $SIG{ALRM} = sub { die "timeout\n" };
		alarm(30);
		flock($fh, LOCK_EX) || die "flock: $!";
		alarm(0);
		1;
	};
	alarm(0);
	if (!$locked) { print "$t: ロックが取れないので飛ばす\n"; close($fh); next; }

	# ロックの中で読み直してから比べる
	my @lines = <$fh>;
	my %idx = map { (split(/\t/))[0] + 0 => 1 } @lines[12..$#lines];
	opendir(my $th, "$dir$t") || die "$dir$t: $!";
	my @orph = sort { int($a) <=> int($b) } grep { /^\d+\.dat$/ && !$idx{int($_)} } readdir($th);
	closedir($th);

	printf("%-12s index=%6d 孤立=%5d%s\n", $t, scalar(keys %idx), scalar(@orph),
		@orph ? "  ($orph[0] … $orph[-1])" : '');
	if ($move && @orph) {
		File::Path::make_path("$dest$t") || -d "$dest$t" || die "$dest$t: $!";
		if (!$log) { open($log, '>', "${dest}moved.txt") || die "${dest}moved.txt: $!"; }
		foreach (@orph) {
			if (rename("$dir$t/$_", "$dest$t/$_")) {
				print $log "$t/$_\n";
				$total++;
			} else {
				print "  移せなかった: $t/$_ ($!)\n";
			}
		}
	}
	close($fh);	# ロックを外す
}
if ($move) {
	close($log) if ($log);
	print "移したファイル: $total（一覧は ${dest}moved.txt）\n";
}
