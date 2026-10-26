use strict;
#-------------------------------------------------------------------------------
# テキストDBのテーブル操作のテスト
#-------------------------------------------------------------------------------
# 実行: prove t/db_text.t
#
use FindBin;
BEGIN { push(@INC, "$FindBin::Bin/../lib"); }
use Test::More;
use File::Temp ();

require Satsuki::Base;
my $ROBJ = Satsuki::Base->new();
my $dir  = File::Temp::tempdir(CLEANUP => 1) . '/';
my $DB   = $ROBJ->loadpm('DB_text', $dir);

is($DB->create_table('old_art', [ { name => 'title', type => 'text' } ]), 0, 'テーブルを作る');
ok($DB->insert('old_art', { title => 'abc' }), '行を足す');

#-------------------------------------------------------------------------------
# rename_table
#-------------------------------------------------------------------------------
is($DB->rename_table('old_art', 'art'), 0, '名前を変える');
ok(!$DB->find_table('old_art'), '元の名前のテーブルは無くなる');
ok( $DB->find_table('art'), '新しい名前のテーブルがある');
is($DB->select_match_limit1('art', 'title', 'abc')->{title}, 'abc', '行はそのまま残る');

is($DB->rename_table('none', 'none2'), 1, '無いテーブルは変えられない');

$DB->create_table('other', [ { name => 'title', type => 'text' } ]);
is($DB->rename_table('other', 'art'), 2, '同じ名前のテーブルがあれば変えない');
ok($DB->find_table('other'), '変えなかったテーブルは残る');
is($DB->select_match_limit1('art', 'title', 'abc')->{title}, 'abc', '先にあったテーブルも壊さない');

done_testing();
