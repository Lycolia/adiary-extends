//##############################################################################
// admin.js
//	管理画面でだけ使う処理。adiary.jsの後に読み込む
//	※公開画面のフレーム（_frame）でも、システムモード（デザイン編集など）のときは読み込む
//##############################################################################
//[TAB=8]
'use strict';
$(function(){
//##############################################################################
// ■UI
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
//●色選択ボックスを表示。 ※input[type=text] のリサイズより先に行うこと
////////////////////////////////////////////////////////////////////////////////
$$._load_picker = false;
$$.dom_init( function($R){
	const $cp = $R.findx('input.color-picker');
	if (!$cp.length) return;

	$cp.each(function(i,dom){
		const $obj = $(dom);
		const $box = $('<span>').addClass('colorbox');
		$obj.before($box);
		const color = $obj.val();
		if (color.match(/^#[\dA-Fa-f]{6}$/))
			$box.css('background-color', color);
	});

	// color pickerのロード
	var dir = this.ScriptDir + 'colorpicker/';
	this.prepend_css(dir + 'css/colorpicker.css');
	this.load_script(dir + "colorpicker.js", function(){

		$cp.each(function(idx,dom){
			var $obj = $(dom);
			$obj.ColorPicker({
				onSubmit: function(hsb, hex, rgb, _el) {
					var $el = $(_el);
					$el.val('#' + hex);
					$el.ColorPickerHide();
					var $prev = $el.prev();
					if (! $prev.hasClass('colorbox')) return;
					$prev.css('background-color', '#' + hex);
					$obj.change();
				},
				onChange: function(hsb, hex, rgb) {
					var $prev = $obj.prev();
					if (! $prev.hasClass('colorbox')) return;
					$prev.css('background-color', '#' + hex);
					var func = $obj.data('onChange');
					if (func) func(hsb, hex, rgb);
				}
			});
			$obj.ColorPickerSetColor( $obj.val() );
		});
		$cp.on('keyup', function(evt){
			$(evt.target).ColorPickerSetColor(evt.target.value);
		});
		$cp.on('keydown', function(evt){
			if (evt.keyCode != 27) return;
			$(evt.target).ColorPickerHide();
		});

		// if loaded jQuery UI, color picker draggable
		$R.rootfind('.colorpicker').adiaryDraggable({
			cancel: ".colorpicker_color, .colorpicker_hue, .colorpicker_submit, input, span"
		})
	});
});

////////////////////////////////////////////////////////////////////////////////
//●【スマホ】DnDエミュレーション登録
////////////////////////////////////////////////////////////////////////////////
$$.dom_init( function($R){
	$R.findx('.treebox').dndEmulation();
});

//##############################################################################
// ■スケルトン用ルーチン
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
// ●タグ一覧のロード
////////////////////////////////////////////////////////////////////////////////
$$.load_tags_list = function(id, callback) {
	const $sel     = $(id);		// セレクトボックス
	const _default = $sel.data('default') || '';

	$.getJSON( $sel.data('url'), function(data){
		if (callback) callback(data);
		var r_func = function(ary, head, tab) {
			for(var i=0; i<ary.length; i++) {
				var name= ary[i].title;
				var val = head + name;
				var opt = $('<option>').attr('value', val);
				//opt.css('padding-left', tab*8);	// Fx以外で効かないので以下で代用
				opt.html('&emsp;'.repeat(tab) + val );
				if ( val == _default ) opt.prop('selected', true);
				$sel.append(opt);
				if (ary[i].children)
					r_func( ary[i].children, head+name+'::', tab+1 );
			}
		};
		r_func(data, '', 0);
		$sel.change();
	});
}

////////////////////////////////////////////////////////////////////////////////
// ●コンテンツ一覧のロード
////////////////////////////////////////////////////////////////////////////////
// 読み込みの jqXHR を返す（option を足して change した後に done、always が呼ばれる）
$$.load_contents_list = function(id) {
	var obj = $(id);
	return $.getJSON( obj.data('url'), function(data){
		var _default  = obj.data('default');
		var this_pkey = obj.data('this-pkey');

		var r_func = function(ary, tab) {
			for(var i=0; i<ary.length; i++) {
				var pkey  = ary[i].key;
				if (pkey == this_pkey) continue;
				var title = ary[i].title;
				if (title.length > 20)
					title = title.substr(0,20) + '...';

				var opt = $('<option>').attr('value', pkey);
				//opt.css('padding-left', tab*8);	// Fx以外で効かないので以下で代用
				opt.html('&emsp;'.repeat(tab) + title );
				opt.data('link_key', ary[i].link_key);
				if ( pkey == _default ) opt.prop('selected', true);
				obj.append(opt);
				if (ary[i].children)
					r_func( ary[i].children, tab+1 );
			}
		};
		r_func(data, 0);
		obj.change();
	});
}

//##############################################################################
// ■その他
//##############################################################################
////////////////////////////////////////////////////////////////////////////////
// ●さつきタグ記号のエスケープ
////////////////////////////////////////////////////////////////////////////////
$$.esc_satsuki_tag = function(str) {
	return str.replace(/([:\[\]])/g, function(w,m){ return "\\" + m; });
}
$$.unesc_satsuki_tag = function(str) {
	return str.replace(/\\([:\[\]])/g, "$1");
}

////////////////////////////////////////////////////////////////////////////////
// ●セッションを保持して随時データをロードする
////////////////////////////////////////////////////////////////////////////////
$$.session = function(btn, opt){
  const self=this;
  $(btn).click( function(evt){
	var $btn = $(evt.target);
	var myself = opt.myself || self.myself;
	var $log   = opt.$log   || $btn.rootfind($btn.data('log-target') || '#session-log');

	var load_session = myself + '?etc/load_session';
	var interval = opt.interval || $log.data('interval') || 300;
	var snum;

	if (opt.load_log) $log = opt.load_log(evt);
	$log.showDelay();
	if (opt.init) opt.init(evt);

	// セッション初期化
	$.post( load_session, {
			action: 'etc/init_session'
		}, function(data) {
			var reg = data.match(/snum=(\d+)/);
			if (reg) {
				snum = reg[1];
				ajax_session();
				return;
			}
			console.warn(error);
		}, 'text'
	);

	// Ajaxセッション開始
	function ajax_session(){
		log_start();
		var fd;
		if (opt.load_formdata) fd = opt.load_formdata($btn);
				else   fd = new FormData( opt.form );
		var ctype;
		if (typeof(fd) == 'string') fd += '&snum=' + snum;
		else {
			fd.append('snum', snum);
			ctype = false;
		}
		$.ajax(myself + '?etc/ajax_dummy', {
			method: 'POST',
			contentType: ctype,
			processData: false,
			data: fd,
			dataType: opt.dataType || 'text',
			error: function(jqXHR, status, msg) {
				const e_msg = '[' + $$.name + '.session()] Ajax fail: ' + msg;
				console.warn(e_msg);
				log_stop(function(){
					$log.text($log.text() + "\n" + e_msg + "\n");
					$log.scrollTop( $log.prop('scrollHeight') );
					if (opt.error) opt.error(jqXHR, status, msg);
				});
			},
			success: function(data) {
				log_stop(function(){
					if (opt.success) opt.success(data);
				});
			},
			complete:	opt.complete,
			xhr:		opt.xhr
		});
	}

	/// ログ表示タイマー
	var log_timer;
	function log_start( snum ) {
		$btn.prop('disabled', true);
		$log.data('snum', snum);
		log_timer = setInterval(log_load, interval);
	}
	function log_stop(func) {
		if (log_timer) clearInterval(log_timer);
		log_timer = 0;
		log_load(func);
		$btn.prop('disabled', false);
	}
	function log_load(func) {
		var url = load_session + '&snum=' + snum;
		$log.load(url, function(data){
			$log.scrollTop( $log.prop('scrollHeight') );
			if (func) func();
		});
	}
  });
};

////////////////////////////////////////////////////////////////////////////////
// CSS append
////////////////////////////////////////////////////////////////////////////////
$$.prepend_css = function(file) {
	const $link = $("<link>")
	$link.attr({
		rel: "stylesheet",
		href: file
	});
	this.$head.prepend($link);
	return $link;
}

//##############################################################################
});
