//##############################################################################
// adiary.js
//
//##############################################################################
//[TAB=8]
'use strict';
$(function(){
//##############################################################################
// initalize
//##############################################################################
(function(){
	const self = this;

	this.SP = false;		// smart phone mode
	this.DialogWidth       = -1;	// auto
	this.DialogMinWidth    = 480;

	this.CommentEnableTime = 10000;	// msec
	this.CommentEnableKeys = 10;

	// load adiary vars
	let data = this.asys_vars;
	const ary = ['ScriptDir', 'PubdistDir', 'SpecialQuery', 'Static'];
	for(var i in ary) {
		this[ary[i]] = data[ary[i]];
	}

	// remove #rss-tm hash
	if (window.location.hash.indexOf('#rss-tm') == 0) {
		history.pushState("", document.title, location.pathname + location.search);
	}

	// Smartphone mode
	if (this.$body.hasClass('sp')
	 || this.$body.hasClass('responsive') && window.matchMedia('(max-width: 640px)').matches) {
		this.SP = 1;
		this.DialogWidth    = 320;
		this.DialogMinWidth =   0;
	}

	// DB time, Total time
	if (data.DBTime)    $('#system-info-db-time')   .text( data.DBTime    );
	if (data.TotalTime) $('#system-info-total-time').text( data.TotalTime );

	// Google Analytics 4
	if (data.GA4_ID) {
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('js', new Date());
		gtag('config', data.GA4_ID);
		this.load_script('https://www.googletagmanager.com/gtag/js?id=' + data.GA4_ID);
	}

	// load message
	this.load_msg('[data-secure].adiary-msgs');

	// load script		ex) twitter-widget of filter syntax
	$('script-load').each(function(idx, dom) {
		self.load_script(dom.getAttribute('src'));
	});

}).call(adiary);

//##############################################################################
// extend jQuery
//##############################################################################
(function() {
	const init_orig = $.fn.init;
	$.fn.init = function(sel,cont) {
		if (typeof sel === "string" && sel.match(/<.*?[\W]on\w+\s*=/i))
			throw 'Security error by ' + $$.name + '.js : ' + sel;
		return  new init_orig(sel,cont);
	};
})();

////////////////////////////////////////////////////////////////////////////////
// Emulate jquery.cookie for dynatree
////////////////////////////////////////////////////////////////////////////////
(function(_ls) {
	const ls = _ls;
	$.cookie = function(key, val) {
		if (val === undefined) return ls.get(key);
		ls.set(key, val);
	}
	$.removeCookie = function(key) {
		ls.removeItem(key);
	}
})($$.Storage);

//##############################################################################
// ■CSSへの機能提供
//##############################################################################
$$.css_funcs = [];
$$.css_init  = function(func) {
	if (func)
		return this.css_funcs.push(func);

	const funcs = this.css_funcs;
	for(var i=0; i<funcs.length; i++)
		funcs[i].call(this);
}
$$.init(adiary.css_init);

////////////////////////////////////////////////////////////////////////////////
// ●CSSから値を取得する
////////////////////////////////////////////////////////////////////////////////
$$.get_value_from_css = function(id, attr) {
	var span = $('<span>').attr('id', id).css('display', 'none');
	this.$body.append(span);
	if (attr) {
		attr = span.css(attr);
		span.remove();
		return attr;
	}
	var size = span.css('min-width');	// 1pxの時のみ有効
	var str  = span.css('font-family');
	span.remove();
	if (str == null || size != '1px') return '';
	str = str.replace(/["']/g, '');
	return str || size;
}

////////////////////////////////////////////////////////////////////////////////
//●sidebarのHTML位置変更
////////////////////////////////////////////////////////////////////////////////
$$.css_init(function(){
	var flag = this.get_value_from_css('sidebar-move-to-before-main');
	if (this.SP || !flag) return;

	// 入れ替え
	var sidebar = $('#sidebar');
	sidebar.insertBefore( 'div.main:first-child' );
});

$$.css_init(function(){
	var flag = this.get_value_from_css('side-b-move-to-footer');
	if (this.SP || !flag) return;

	// 入れ替え
	$('#footer').prepend( $('#side-b') );
});

////////////////////////////////////////////////////////////////////////////////
//●viewport の上書き
////////////////////////////////////////////////////////////////////////////////
$$.css_init(function(){
	var val = this.get_value_from_css('viewport-setting');
	if (!val) return;
	$('#viewport').attr('content', val);
});

////////////////////////////////////////////////////////////////////////////////
//●ui-iconの生成
////////////////////////////////////////////////////////////////////////////////
$$.css_init(function(){
	let color_bin;
	{
		const css = this.get_value_from_css('ui-icon-autoload', 'background-color');
		if (!css) return;
		const col = css.match(/#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/);
		if (col) {
			color_bin = String.fromCharCode(
				parseInt('0x'+col[1]), parseInt('0x'+col[2]), parseInt('0x'+col[3])
			);
		} else {
			const rgb = css.match(/\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
			if (!rgb) return;
			color_bin = String.fromCharCode(rgb[1], rgb[2], rgb[3]);
		}
	}
	// console.log(color_bin.charCodeAt(0), color_bin.charCodeAt(1), color_bin.charCodeAt(2));

	// generate ui-icon.png
	let png = atob( 'iVBORw0KGgoAAAANSUhEUgAAAFAAAAAgAQMAAAC//W0vAAAABlBMVEUAAP/8/PzLviUMAAAAAnRSTlP/AOW3MEoAAADJSURBVBjTdc4xjgIxDEDRjChSUOQIPkoOskehMBIH4EoZUUy509GgTaQtpiSIJiiRjR0BooBUr3D8bfj1zBvJMSiWxbSFMFnmw8Hcrg1jvf6OO1Nr2/zVyz7ZBwtkp1ydavMFdNbOP515KW5e94HkLjyv+7eJ/4V92Z6PHGtPRD6z1iT8+bLPDDYyIyGxJCYmbJ5QOHLDAuRNhoAFsyNQQh6S3TpTfHBpCKutVUIamhc2DJiVTjhy0WVgiCdZJvQSjs9Ezyu/XHYH55/2IroZ0KMAAAAASUVORK5CYII=')

	// exchange png color
	{
		const PALATTE_OFFSET = 0x29;
		png = png.substr(0, PALATTE_OFFSET) + color_bin + png.substr(PALATTE_OFFSET+3);
	}

	// calc CRC32
	const GEN    = 0xEDB88320;
	const offset = 0x25;
	const length = 10;

	const data = png.substr(offset, length);
	let crc  = 0xffffffff;
	{
		let d;
		let bits = length<<3;
		for(let i=0,j=0; i<bits; i++) {
			if ((i & 7) == 0) d = data.charCodeAt(j++);
			crc ^= (d & 1);
			let x = crc & 1;
			crc >>>=1;
			d   >>>=1;
			if (x) crc ^= GEN;
		}
		crc = ~crc;
		crc = String.fromCharCode( (crc>>>24) & 0xff, (crc>>>16) & 0xff, (crc>>>8) & 0xff, crc & 0xff);
	}
	{
		const p = offset + length;
		png = png.substr(0, p) + crc + png.substr(p+4);
	}
	const $style = this.ui_icon_style = this.ui_icon_style || this.append_style();
	const css = '.ui-icon, .art-nav a:before, .art-nav a:after {'
			+ 'background-image: '
			+ 	'url("data:image/png;base64,' + btoa(png) + '")'
			+ '}';
	$style.html(css);
});

////////////////////////////////////////////////////////////////////////////////
//●MathJaxの自動ロード
////////////////////////////////////////////////////////////////////////////////
$$.init(function(){
	const $math = $('span.math, div.math');
	if (! $math.length ) return;

	const MathJaxURL = 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js';
	window.MathJax = {
		tex: {
			tags: "ams",
			inlineMath:  [["\x01\x01", "\x01\x01"]],
			displayMath: [["\x01\x02", "\x01\x02"]],
			processEscapes: false,
			processEnvironments: false,
			processRefs: false,
			autoload: {
				color: [],
				colorv2: ['color']
			}
		},
		extensions: ["TeX/AMSmath.js", "TeX/AMSsymbol.js"]
	};
	this.load_script(MathJaxURL, async function(){
      		for(const dom of $math) {
			const deli = dom.tagName === 'SPAN' ? "\x01\x01" : "\x01\x02";
			dom.innerHTML = deli + dom.innerHTML + deli;
		}
		await MathJax.typesetPromise($math);
		$math.trigger('mathjax-complite');
	});
});


//##############################################################################
// dom extend
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
//●詳細情報ダイアログの表示
////////////////////////////////////////////////////////////////////////////////
$$.init( function(){
	let prev;
	const self=this;
	this.$body.on('click', '.js-info[data-info], .js-info[data-url]', function(evt){

		if (evt.target == prev) return;	// 連続クリック防止
		prev = evt.target;

		const $obj = $(evt.target);
		const $div = $('<div>');
		const $div2= $('<div>');	// 直接 div にクラスを設定すると表示が崩れる

		$div.attr('title', $obj.data("title") || "Infomataion" );
		$div2.addClass($obj.data("class"));
		$div.empty();
		$div.append($div2);
		if ($obj.data('info')) {
			const text = self.tag_esc_br( $obj.data("info") );
			$div2.html( text );
			$div.adiaryDialog({ width: self.DialogWidth, close: close_func });
			return;
		}
		var url = $obj.data("url");
		$div2.load( url, function(){
			$div2.text( $div2.text().replace(/\n*$/, "\n\n") );
			$div.adiaryDialog({ width: self.DialogWidth, height: 320, close: close_func });
		});
	});
	function close_func() {
		prev = null;
	}
});

////////////////////////////////////////////////////////////////////////////////
//●画像・コメントのポップアップ
////////////////////////////////////////////////////////////////////////////////
$$.init( function(){
	const self = this;
	const func = function(evt){ self.popup(evt) }

	this.$body.on('mouseover', '.js-popup-img', {
		func: function($obj, $div) {
			const $img = $('<img>');
			$img.attr('src', $obj.data('img-url'));
			$div.empty();
			$div.attr('id', 'popup-image');
			$div.append( img );
		}
	}, func);
	$('.js-popup-img').removeAttr('title');	// remove title attr popup

	this.$body.on('mouseover', '.js-popup-com', {
		func: function($obj, $div){
			var num = $obj.data('target');
			if (num == '' || num == 0) return $div.empty();

			var $com = $secure('#c' + num);
			if (!$com.length) return $div.empty();

			$div.attr('id', 'popup-com');
			$div.html( $com.html() );
		}
	}, func);
});

////////////////////////////////////////////////////////////////////////////////
//●textareaでのタブ入力
////////////////////////////////////////////////////////////////////////////////
$$.init( function(){
	const self=this;

	this.$body.on('focus', 'textarea', function(evt){
		var $obj = $(evt.target);
		$obj.data('_tab_stop', true);
	});

	this.$body.on('keydown', 'textarea', function(evt){
		var $obj = $(evt.target);
		if ($obj.prop('readonly') || $obj.prop('disabled')) return;

		// ESC key
		if (evt.keyCode == 27) return $obj.data('_tab_stop', true);

		// フォーカス直後のTABは遷移させる
		if ($obj.data('_tab_stop')) {
			$obj.data('_tab_stop', false);
			return;
		}
		if (evt.shiftKey || evt.keyCode != 9) return;

		evt.preventDefault();
		self.insert_to_textarea(evt.target, "\t");
	});
});

////////////////////////////////////////////////////////////////////////////////
//【スマホ】ドロップダウンメニューでの hover の代わり
////////////////////////////////////////////////////////////////////////////////
$$.init( function(){
	function open_link(evt) {
		location.href = $(evt.target).attr('href');
	}

	this.$body.on('click', '.js-alt-hover li > a', function(evt) {
		const $obj = $(evt.target).parent();
		if (!$obj.children('ul').length) return true;

		if ($obj.hasClass('open')) {
			$obj.removeClass('open');
			$obj.find('.open').removeClass('open')
		} else {
			$obj.addClass('open');
		}
		// リンクをキャンセル。"return false" ではダブルクリックイベントが発生しない
		evt.preventDefault();

		// dbltapイベントを登録
		if ($obj.data('_reg_dbltap')) return;
		$obj.data('_reg_dbltap', true);
		$obj.on('dblclick', open_link);
		$obj.on('mydbltap', open_link);
	});
});

//##############################################################################
// ■スケルトン用ルーチン
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
//●コメント欄の加工
////////////////////////////////////////////////////////////////////////////////
$$.init( function(){
	const self=this;
	$('#com div.comment-text').each(function(idx,dom) {
		const $obj = $(dom);

		////////////////////////////////////////////////////////////////
		// リンクに加工 ex) >>14 >>2
		////////////////////////////////////////////////////////////////
		let flag;
		let text = $obj.html();
		text = text.replace(/&gt;&gt;(\d+)/g, function(all, num){
			flag=true;
			return '<a href="#c' + num + '">&gt;&gt;' + num + '</a>';
		});
		if (!flag) return;
		$obj.html(text);

		////////////////////////////////////////////////////////////////
		// regist popup
		////////////////////////////////////////////////////////////////
		$obj.find('a').on('mouseover', {
			func: function($obj, $div) {
				const num  = $obj.attr('href').toString().replace(/[^\d]/g, '');
				const $com = $('#c' + num);
				if (!$com.length) return $div.empty();
				$div.attr('id', 'popup-com');
				$div.html( $com.html() );
			}
		}, function(evt){ self.popup(evt) });
	});
});

////////////////////////////////////////////////////////////////////////////////
//●セキュリティコードの設定
////////////////////////////////////////////////////////////////////////////////
// コメントのスパム対策。決まりはdocs/コメントのスパム対策.mdの「投稿ボタンが押せるようになるまで」
$$.init( function(){
	const $form = $('#comment-form');
	if (!$form.length) return;

	let   pkey = $('#comment-form-apkey').val() || '';
	const ary  = ($form.data('secure') || '').split(',');
	if (!pkey.match(/^\d+$/)) return;
	pkey = parseInt(pkey) & 255;

	let sid = '';
	for(var i=0; i<ary.length-1; i++) {
		if (!ary[i].match(/^\d+$/)) return;
		sid += String.fromCharCode( ary[i] ^ pkey );
	}

	// 記事を編集できる人（ブログ管理者と編集者）は待たせない（data-no-wait）
	if ($form.data('no-wait')) {
		$('#comment-form-sid').val(sid);
		return;
	}

	// 投稿ボタンを disable に
	const $btn = $('#post-comment');
	$btn.prop('disabled', true);

	// 10key押されるか、10秒経ったら設定
	const $ta = $form.find('textarea');

	let hook;
	let timer;
	const enable_func = function() {
		clearTimeout( timer );
		$ta.off('keydown', hook);
		$('#comment-form-sid').val(sid);
		$btn.prop('disabled', false);
	};

	let cnt=this.CommentEnableKeys;
	if (cnt) {
		hook = function() {
			cnt--;
			if (cnt) return;
			enable_func();
		}
		$ta.on('keydown', hook);
	}

	timer = setTimeout(enable_func, this.CommentEnableTime);
});

////////////////////////////////////////////////////////////////////////////////
// ●検索条件の項目マーク
////////////////////////////////////////////////////////////////////////////////
$$.init_top_search = function(id, flag) {
	var $form = $secure(id);
	var tagdel = $('<span>').addClass('ui-icon ui-icon-close');
	if (!flag) tagdel.click(function(evt){
		var $obj = $(evt.target);
		$obj.parent().remove();
		$form.submit();
	});
	$form.find("div.taglist span.tag, div.ctype span.ctype, div.yyyymm span.yyyymm").append(tagdel);
}

//##############################################################################
// ■スケルトン内部使用ルーチン
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
//●ソーシャルボタンの加工
////////////////////////////////////////////////////////////////////////////////
// はてなブックマークの件数を読む（ほかのサービスは件数を出さない）
$$.init( function(){
  $('.social-button.hatena-share').each(function(idx,dom) {
	const obj = $(dom);
	const url_orig = obj.data('url') || '';
	if (!url_orig.match(/^https?:\/\//i)) return;

	// data-urlはencode_uricom済みなので、一度戻してから符号化する
	let url;
	try { url = encodeURIComponent( decodeURIComponent(url_orig) ); }
	catch(e) { url = encodeURIComponent( url_orig ); }

	const count = obj.children('a.count');
	count.text('-');
	$.ajax({
		url: 'https://bookmark.hatenaapis.com/count/entry?url=' + url,
		dataType: 'jsonp',
		success: function(c) {
			count.text( parseInt(c) || 0 );
		}
	});
  });
});

////////////////////////////////////////////////////////////////////////////////
//●汎用の共有ボタン
////////////////////////////////////////////////////////////////////////////////
// OSの共有の画面を出し、出せなければ記事のURLをコピーする

$$.init( function(){
  $('.social-button.web-share').each(function(idx,dom) {
	const obj = $(dom);
	const url_orig = obj.data('url') || '';
	if (!url_orig.match(/^https?:\/\//i)) return;

	// data-urlはencode_uricom済みなので戻す
	let url;
	try { url = decodeURIComponent(url_orig); }
	catch(e) { url = url_orig; }
	const title = obj.data('title') || document.title;

	const btn = obj.children('a.share');
	btn.on('click', function(evt) {
		evt.preventDefault();
		if (navigator.share) {
			// 共有の画面を閉じたとき（AbortError）も失敗になるので、何もしない
			navigator.share({ title: title, url: url }).catch(function(){});
			return;
		}
		if (!navigator.clipboard) {	// httpのページなど
			window.prompt('記事のURL', url);
			return;
		}
		navigator.clipboard.writeText(url).then(function(){
			const text = btn.text();
			btn.text('コピーしました');
			setTimeout(function(){ btn.text(text); }, 2000);
		}, function(){
			window.prompt('記事のURL', url);
		});
	});
  });
});

////////////////////////////////////////////////////////////////////////////////
//●記事の情報の、参照元へのリンク
////////////////////////////////////////////////////////////////////////////////
// 参照元は、テーマの雛形か、参照元のモジュール（dea_backlinks）を置いたときだけ出るので、
// 飛ぶ先が無ければリンクを消す（_sub/art_info.html）
$$.init( function(){
	if (document.getElementById('backlinks')) return;
	document.querySelectorAll('.art-jump .jump-backlinks').forEach(function(a) {
		const span = a.parentNode;
		a.remove();
		if (!span.querySelector('a')) span.remove();
	});
});

////////////////////////////////////////////////////////////////////////////////
//●NSFWの記事の年齢確認
////////////////////////////////////////////////////////////////////////////////
// 「表示する」を押したら、その年齢確認を重ねた先（記事、ブログ全体）だけぼかしを外す。
// 「今後確認しない」も付けていたらブラウザーに覚え（localStorage）、このページのNSFWのぼかしをすべて外す。
// ブログ全体の確認には「今後確認しない」が無く、ブラウザーを閉じるまで覚える（sessionStorage）。
// 覚えたブラウザーでは、_frame.htmlが本文を描く前にぼかしを外す。
// 「確認を元に戻す」を押したら忘れ、このページのNSFWをまたぼかす
$$.init( function(){
	const root = document.documentElement;
	document.querySelectorAll('.nsfw-gate-ok').forEach(function(btn) {
		btn.addEventListener('click', function() {
			const gate = btn.closest('.nsfw-gate');
			const art  = btn.closest('.nsfw');
			if (art) art.classList.add('nsfw-open');

			const chk = gate && gate.querySelector('.nsfw-remember');
			const remember = chk && chk.checked;
			const site     = art && art.classList.contains('nsfw-site');
			if (!remember && !site) return;
			try {
				(remember ? localStorage : sessionStorage).setItem('adiary-nsfw-ok', '1');
			} catch(e) {}
			root.classList.add('nsfw-ok');
		});
	});
	document.querySelectorAll('.nsfw-forget').forEach(function(btn) {
		btn.addEventListener('click', function() {
			try { localStorage.removeItem('adiary-nsfw-ok'); } catch(e) {}
			try { sessionStorage.removeItem('adiary-nsfw-ok'); } catch(e) {}
			root.classList.remove('nsfw-ok');
			document.querySelectorAll('.nsfw.nsfw-open').forEach(function(art) {
				art.classList.remove('nsfw-open');
			});
			document.querySelectorAll('.nsfw-remember').forEach(function(chk) {
				chk.checked = false;
			});
		});
	});
});

////////////////////////////////////////////////////////////////////////////////
//●月別過去ログリストのリロード
////////////////////////////////////////////////////////////////////////////////
$$.init( function(){
	const self = this;
	var selbox = $('#month-list-select-box');
	selbox.change(function(evt){
		var obj = $(evt.target);
		if(!obj.data('url')) return;	// for security
		var val = obj.val();
		if (val=='') return;
		if (self.Static)
			return window.location = self.myself + 'q/' + val + '.html';
		window.location = self.myself + '?d=' + val;
	});
	var cur = $('#yyyymm-cond').data('yyyymm');
	if (!cur || typeof(cur) != 'number') return;
	selbox.val( cur.toString() );
});

//##############################################################################
// other functions
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
//●特殊Queryの処理
////////////////////////////////////////////////////////////////////////////////
$$.init(function(){
 	if (!this.SpecialQuery) return;
 	const myself   = this.myself;
 	const sp_query = this.SpecialQuery;

 	$('a').each( function(idx,dom) {
		var obj = $(dom);
		var url = obj.attr('href');
		if (! url) return;
		if (url.indexOf(myself)!=0) return;
		if (url.match(/\?[\w\/]+$/)) return;		// 管理画面では解除する
		if (url.match(/\?(.+&)?_\w+=/)) return;		// すでに特殊Queryがある

		var ma =  url.match(/^(.*?)(\?.*?)?(#.*)?$/);
		if (!ma) return;
		url = ma[1] + (ma[2] ? ma[2] : '?') + sp_query + (ma[3] ? ma[3] : '');
		obj.attr('href', url);
	});
});

////////////////////////////////////////////////////////////////////////////////
// add style
////////////////////////////////////////////////////////////////////////////////
$$.append_style = function(css) {
	const $style = $('<style>').html(css || '');
	this.$head.append($style);
	return $style;
}

//##############################################################################
// init
//##############################################################################
$$.init();

//##############################################################################
});


