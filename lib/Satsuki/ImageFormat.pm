use strict;
#-------------------------------------------------------------------------------
# 画像の形式の判定と、ImageMagickでの読み込み
#-------------------------------------------------------------------------------
# ImageMagickはファイルの中身で形式を決めるため、拡張子が.pngでも中身がSVGやMVG、
# PostScriptなどなら、その形式として処理してしまう（ImageTragickの入り口）。
# ファイルの先頭のバイトで形式を確かめ、その形式を指定して読み込む。
#
# 扱う形式：JPEG, PNG（APNGはPNGとして1枚目を読む）, GIF, WebP, AVIF
#
package Satsuki::ImageFormat;
our $VERSION = '1.00';
################################################################################
# ■メイン
################################################################################
#-------------------------------------------------------------------------------
# ●ImageMagickで読み込む
#-------------------------------------------------------------------------------
# $img  : Image::Magickオブジェクト
# $file : 読み込むファイル（実パス）
# ret   : 成功なら空。失敗ならエラーメッセージ（Image::MagickのReadと同じ）
#
sub read {
	my ($img, $file) = @_;
	my $format = &detect($file);
	if (!$format) { return "Unsupported image format: $file"; }
	return $img->Read("$format:$file");
}

#-------------------------------------------------------------------------------
# ●形式を判定する
#-------------------------------------------------------------------------------
# ret : ImageMagickの形式名（jpeg, png, gif, webp, avif）。扱えない形式ならundef
#
sub detect {
	my $file = shift;
	my $fh;
	if (!open($fh, '<', $file)) { return; }
	binmode($fh);
	read($fh, my $head, 64);
	close($fh);

	if ($head =~ /^\xff\xd8\xff/)            { return 'jpeg'; }
	if ($head =~ /^\x89PNG\r\n\x1a\n/)        { return 'png';  }
	if ($head =~ /^GIF8[79]a/)               { return 'gif';  }
	if ($head =~ /^RIFF.{4}WEBP/s)           { return 'webp'; }

	# AVIF : ISO BMFFのftypボックスの、メジャーブランドか互換ブランドがavifかavis
	if (substr($head, 4, 4) eq 'ftyp') {
		my $size = unpack('N', substr($head, 0, 4));
		if ($size > length($head)) { $size = length($head); }
		my @brands = (substr($head, 8, 4));
		for(my $i=16; $i+4 <= $size; $i+=4) {
			push(@brands, substr($head, $i, 4));
		}
		if (grep { $_ eq 'avif' || $_ eq 'avis' } @brands) { return 'avif'; }
	}
	return;
}

1;
