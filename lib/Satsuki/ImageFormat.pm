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

#-------------------------------------------------------------------------------
# ●縦と横の大きさを読む
#-------------------------------------------------------------------------------
# ファイルの先頭だけを読み、ImageMagickは使わない（記事のHTMLに width と height を書くため）
# JPEGはExifの向きが縦（5〜8）なら、表示に合わせて縦と横を入れ替える
#
# ret : (幅, 高さ)。読めない形式（AVIFなど）や壊れたファイルなら空
#
sub get_size {
	my $file = shift;
	my $format = &detect($file) || return;
	my $fh;
	if (!open($fh, '<', $file)) { return; }
	binmode($fh);
	my @size;
	if    ($format eq 'jpeg') { @size = &jpeg_size($fh); }
	elsif ($format eq 'png' ) { read($fh, my $h, 24); @size = unpack('NN', substr($h, 16, 8)); }
	elsif ($format eq 'gif' ) { read($fh, my $h, 10); @size = unpack('vv', substr($h, 6, 4)); }
	elsif ($format eq 'webp') { @size = &webp_size($fh); }
	close($fh);
	if (!$size[0] || !$size[1]) { return; }
	return @size;
}

sub jpeg_size {
	my $fh = shift;
	my $rotate;
	read($fh, my $soi, 2);
	while(1) {
		read($fh, my $m, 4) == 4 || return;
		my ($ff, $marker, $len) = unpack('CCn', $m);
		if ($ff != 0xff) { return; }
		# SOF0〜SOF15（DHT、JPG、DACを除く）に大きさがある
		if ($marker >= 0xc0 && $marker <= 0xcf && $marker != 0xc4 && $marker != 0xc8 && $marker != 0xcc) {
			read($fh, my $sof, 5) == 5 || return;
			my ($h, $w) = unpack('xnn', $sof);
			return $rotate ? ($h, $w) : ($w, $h);
		}
		if ($len < 2) { return; }
		read($fh, my $data, $len-2) == $len-2 || return;
		if ($marker == 0xe1 && substr($data, 0, 6) eq "Exif\0\0") {
			my $o = &exif_orientation(substr($data, 6));
			$rotate = ($o >= 5 && $o <= 8);
		}
	}
}

# ExifのIFD0から向き（0x0112）を読む
sub exif_orientation {
	my $tiff = shift;
	my $le   = substr($tiff, 0, 2) eq 'II';
	my $u16  = $le ? 'v' : 'n';
	my $u32  = $le ? 'V' : 'N';
	my $ifd  = unpack($u32, substr($tiff, 4, 4));
	if ($ifd + 2 > length($tiff)) { return; }
	my $num  = unpack($u16, substr($tiff, $ifd, 2));
	for(my $i=0; $i<$num; $i++) {
		my $p = $ifd + 2 + $i*12;
		if ($p + 12 > length($tiff)) { return; }
		if (unpack($u16, substr($tiff, $p, 2)) == 0x0112) {
			return unpack($u16, substr($tiff, $p+8, 2));
		}
	}
	return;
}

sub webp_size {
	my $fh = shift;
	read($fh, my $h, 30) == 30 || return;
	my $chunk = substr($h, 12, 4);
	if ($chunk eq 'VP8 ') {		# 非可逆
		my ($w, $h2) = unpack('vv', substr($h, 26, 4));
		return ($w & 0x3fff, $h2 & 0x3fff);
	}
	if ($chunk eq 'VP8L') {		# 可逆
		my $b = unpack('V', substr($h, 21, 4));
		return (($b & 0x3fff) + 1, (($b >> 14) & 0x3fff) + 1);
	}
	if ($chunk eq 'VP8X') {		# 拡張形式（アニメーションなど）
		my @b = unpack('C6', substr($h, 24, 6));
		return (1 + ($b[0] | $b[1]<<8 | $b[2]<<16), 1 + ($b[3] | $b[4]<<8 | $b[5]<<16));
	}
	return;
}

1;
