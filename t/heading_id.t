use strict;
#-------------------------------------------------------------------------------
# 見出しの識別子の書き足し（記事の保存時の add_heading_ids）のテスト
#-------------------------------------------------------------------------------
# 実行: prove -Ilib t/heading_id.t
#
use FindBin;
use lib "$FindBin::Bin/lib";
BEGIN { push(@INC, "$FindBin::Bin/../lib"); }
use Test::More;
use MarkdownTest qw(new_parser);

sub add { return new_parser()->add_heading_ids($_[0]); }

is(add("# 見出し\n\n本文\n\n## 小見出し"),
	"# 見出し [#見出し]\n\n本文\n\n## 小見出し [#小見出し]",
	'今のIDを識別子として書き足す');

is(add("## まとめ\n\n## まとめ"),
	"## まとめ [#まとめ]\n\n## まとめ [#まとめ-2]",
	'同じ文字の見出しは、今のIDと同じく -2 を付ける');

is(add("## 見出し [#abc]\n\n## 次"),
	"## 見出し [#abc]\n\n## 次 [#次]",
	'識別子のある見出しには書き足さない');

is(add("```\n# コメント\n```\n\n## 見出し"),
	"```\n# コメント\n```\n\n## 見出し [#見出し]",
	'コードフェンスの中には書き足さない');

is(add("- 項目\n\n  ## 項目の中の見出し\n\n> ## 引用の中の見出し"),
	"- 項目\n\n  ## 項目の中の見出し [#項目の中の見出し]\n\n> ## 引用の中の見出し [#引用の中の見出し]",
	'リストや引用の中の見出しにも書き足す');

is(add("本文だけ"), "本文だけ", '見出しが無ければそのまま');

# 書き足すとHTMLが変わる場合は書き足さない（行頭に空白のある ## は見出しではなく文章）
is(add("  ## 文章\n\n## 見出し"), "  ## 文章\n\n## 見出し", '見出しの数が合わなければ書き足さない');

{
	my $p = new_parser();
	my $text = "## 見出し\n\n本文";
	my $before = $p->parse($text);
	my $new = $p->add_heading_ids($text);
	is(scalar $p->parse($new), $before, '書き足す前と後でHTMLが同じ');
	(my $renamed = $new) =~ s/## 見出し/## 名前を変えた見出し/;
	like(scalar $p->parse($renamed), qr/<h4 id="見出し">/, '書き足した後は、見出しの文字を変えてもIDが変わらない');
}

done_testing;
