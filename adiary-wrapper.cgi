#!/usr/bin/perl
use strict;
use warnings;

# 以下のコマンドでIP::Geolocation::MMDBをインストールしていることが前提
# cpanm -l extlib IP::Geolocation::MMDB
use lib './extlib/lib/perl5';
use IP::Geolocation::MMDB;
# https://download.db-ip.com/free/dbip-city-lite-YYYY-MM.mmdb.gz
# ex. https://download.db-ip.com/free/dbip-city-lite-2026-01.mmdb.gz
my $db = IP::Geolocation::MMDB->new(file => './DBIP-City.mmdb');
my $country_code = $db->getcc($ENV{REMOTE_ADDR});

# 設定値はそのうちプラグインで変えられるようになるとよい

# 日本のみ許可する方針
my @allow_country_codes = ('JP');
# 許可する国コードかチェック
my $is_allowed_country = grep { $_ eq $country_code } @allow_country_codes;

my $user_agent = $ENV{HTTP_USER_AGENT};
# 許可するBOTのUAパターン, HeadlessChromeは認めない
my @allowed_bot_patterns = (
    qr/bot/i,
    qr/curl/i,
    qr/wget/i,
    qr/google/i,
    qr/bing/i,
    qr/mastodon/i,
    qr/misskey/i,
    qr/pleroma/i,
    qr/akkoma/i,
    qr/lemmy/i,
    qr/activitypub/i,
    qr/hatena/i,
    qr/github/i,
    qr/tumblr/i,
    qr/meta/i
);

# 許可するBOTかチェック
my $is_allowed_bot = 0;
for my $pattern (@allowed_bot_patterns) {
    if ($user_agent =~ $pattern) {
        $is_allowed_bot = 1;
        last;
    }
}

if ($is_allowed_country || $is_allowed_bot) {
    # 許可国ないし、許可BOT
    # adiary呼び出し
    my $original_cgi = './adiary.cgi';
    exec($original_cgi) or die "Cannot exec $original_cgi: $!";
} else {
    # 許可国でないか、非許可BOT
    # 未知のSNS BOTを将来的に許可するためにログを集めておく
    if ($user_agent !~ /Windows|Mac OS|Linux|Android|iOS|iPhone|iPad/i) {
        # SNSBOTに間違いなく含まれない文字列が入ってるものはログに入れない
        my $deny_ua_log_file = './deny_ua.log';
        if (open my $fh, '>>', $deny_ua_log_file) {
           my $time = localtime();
           my $remote = $ENV{REMOTE_ADDR} // 'unknown';
           my $uri = $ENV{REQUEST_URI} // 'unknown';
           print $fh "[$time]\t\"$user_agent\"\t$country_code\t$remote\t$uri\n";
           close $fh;
        }
    }

    print "Status: 403 Forbidden\n";
    print "Content-Type: text/plain; charset=UTF-8\n\n";
    print "Access denied.\n";
    exit;
}

