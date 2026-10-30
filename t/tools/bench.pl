#!/usr/bin/perl
use strict;
#-------------------------------------------------------------------------------
# 公開ページの応答時間を計る
#-------------------------------------------------------------------------------
# 動いている開発サーバーへcurlで繰り返しアクセスし、ページに埋め込まれた
# サーバー側の処理時間（TotalTime、DBTime）と、curlで見た応答時間を集計する。
# 変更の前後で比べるときは、前の結果を--saveで残し、後で--compareに渡す。
#
# 使い方:
#   perl t/tools/bench.pl                          既定のページを計る
#   perl t/tools/bench.pl -n 100                   1ページあたりの回数（既定50）
#   perl t/tools/bench.pl --save=before.json       結果を保存する
#   perl t/tools/bench.pl --compare=before.json    保存した結果と比べる
#   perl t/tools/bench.pl --url=/0805 --url=/      計るページを指定する
#
# 接続先はAGENT.mdの開発環境（--base、--curl-configで変えられる）。
# ページの順番による偏りを避けるため、1周ごとに全ページを1回ずつ回す。
# 最初の数周（--warmup）は、スケルトンのコンパイルなどが入るので集計しない。
#
use Getopt::Long ();
use JSON::PP ();

my %opt = (
	base	=> 'https://lyndbaum.lycolia.info',
	'curl-config' => "$ENV{HOME}/.curl-dev.conf",
	n	=> 50,
	warmup	=> 3,
);
Getopt::Long::GetOptions(\%opt, 'base=s', 'curl-config=s', 'n=i', 'warmup=i', 'url=s@', 'save=s', 'compare=s');

my @urls = $opt{url} ? @{ $opt{url} } : (
	'/',			# トップ（記事を並べる）
	'/?&p=2',		# トップの2ページ目
	'/0805',		# 普通の記事
	'/0501',		# 大きい記事
	'/?&t=%e3%82%bd%e3%83%95%e3%83%88%e3%82%a6%e3%82%a7%e3%82%a2',	# タグ
	'/?q=adiary',		# 検索
);

#-------------------------------------------------------------------------------
# 計測
#-------------------------------------------------------------------------------
my %data = map { $_ => { total => [], db => [], http => [] } } @urls;
my $rounds = $opt{warmup} + $opt{n};
for my $i (1..$rounds) {
	foreach my $url (@urls) {
		my $r = fetch("$opt{base}$url");
		if ($r->{status} != 200) { die "$url: HTTP $r->{status}\n"; }
		if ($i <= $opt{warmup}) { next; }
		my $d = $data{$url};
		push(@{ $d->{total} }, $r->{total}) if defined $r->{total};
		push(@{ $d->{db}    }, $r->{db})    if defined $r->{db};
		push(@{ $d->{http}  }, $r->{http});
	}
	print STDERR "\r$i/$rounds";
}
print STDERR "\n";

my %result;
foreach my $url (@urls) {
	foreach my $k (qw(total db http)) {
		my $v = $data{$url}->{$k};
		if (!@$v) { next; }
		$result{$url}->{$k} = { median => percentile($v, 50), p90 => percentile($v, 90) };
	}
}

#-------------------------------------------------------------------------------
# 出力
#-------------------------------------------------------------------------------
my $before;
if ($opt{compare}) {
	open(my $fh, '<', $opt{compare}) or die "$opt{compare}: $!\n";
	local $/;
	$before = JSON::PP->new->decode(<$fh>)->{result};
}

printf("%-24s %-6s %9s %9s", 'url', 'item', 'median', 'p90');
printf(" %9s %8s", 'before', 'diff') if $before;
print "\n";
foreach my $url (@urls) {
	foreach my $k (qw(total db http)) {
		my $r = $result{$url}->{$k} or next;
		printf("%-24s %-6s %9.1f %9.1f", short($url), $k, $r->{median}, $r->{p90});
		my $b = $before && $before->{$url} && $before->{$url}->{$k};
		if ($b) {
			printf(" %9.1f %+7.1f%%", $b->{median}, ($r->{median} - $b->{median}) / $b->{median} * 100);
		}
		print "\n";
	}
}
print "（単位はミリ秒。totalとdbはサーバー側、httpはcurlで見た全体）\n";

if ($opt{save}) {
	my $commit = `git rev-parse --short HEAD`;
	chomp($commit);
	open(my $fh, '>', $opt{save}) or die "$opt{save}: $!\n";
	print $fh JSON::PP->new->canonical->pretty->encode({
		commit	=> $commit,
		date	=> scalar(localtime),
		n	=> $opt{n},
		result	=> \%result,
	});
	close($fh);
}

#-------------------------------------------------------------------------------
# サブルーチン
#-------------------------------------------------------------------------------
sub fetch {
	my $url = shift;
	open(my $fh, '-|', 'curl', '-K', $opt{'curl-config'}, '-s', '-w', "\n%{http_code} %{time_total}", $url)
		or die "curl: $!\n";
	local $/;
	my $body = <$fh>;
	close($fh);

	$body =~ s/\n(\d+) ([\d.]+)\z// or die "$url: curl の出力を読めません\n";
	my %r = (status => $1, http => $2 * 1000);
	# ページの末尾のJSON（"DBTime": 3.1, "TotalTime": 6.3）
	if ($body =~ /"TotalTime":\s*([\d.]+)/) { $r{total} = $1; }
	if ($body =~ /"DBTime":\s*([\d.]+)/)    { $r{db}    = $1; }
	return \%r;
}

sub percentile {
	my ($ary, $p) = @_;
	my @s = sort { $a <=> $b } @$ary;
	my $i = int($#s * $p / 100 + 0.5);
	return $s[$i];
}

sub short {
	my $url = shift;
	return length($url) > 24 ? substr($url, 0, 21) . '...' : $url;
}
