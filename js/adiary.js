//############################################################################
// adiary 汎用 JavaScript
//							(C)2014 nabe@abk
//############################################################################
//[TAB=8]  require jQuery
'use strict';
var DialogWidth = 640;
var default_show_speed = 300;
var popup_offset_x = 15;
var popup_offset_y = 10;
var IE67=false;
var IE8=false;
var IE9=false;
var SP;
var Vmyself;	// _frame.html で設定される
var Storage;
var SettedBrowserClass;
var _gaq;
//////////////////////////////////////////////////////////////////////////////
//●初期化処理
//////////////////////////////////////////////////////////////////////////////
$(function(){
	if(Vmyself) Storage=load_PrefixStorage( Vmyself );
	if (!SettedBrowserClass) set_browser_class_into_body();

	// Google Analytics
	if (_gaq) {
		var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
		ga.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'stats.g.doubleclick.net/dc.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	}
});

//////////////////////////////////////////////////////////////////////////////
//●RSSからの参照リンクURLの細工を消す
//////////////////////////////////////////////////////////////////////////////
{
	var x = window.location.toString();
	if (x.indexOf('#rss-tm') > 0) {
		window.location = x.replace(/#rss-tm\d*/,'');
	}
}

//////////////////////////////////////////////////////////////////////////////
//●for IE8
//////////////////////////////////////////////////////////////////////////////
if (!('console' in window)) {
	window.console = {};
	window.console.log = function(x){return x};
}
// IE8ではsubstr(-1)が効かない
String.prototype.rsubstr = function(n) {
	return this.substr(this.length-n, n);
}
if (!Array.isArray) Array.isArray = function (vArg) {
	return Object.prototype.toString.call(vArg) === "[object Array]";  
}
if (!String.prototype.trim ) String.prototype.trim = function(){
	return this.toString().replace(/^\s+|\s+$/g, '');
}

//////////////////////////////////////////////////////////////////////////////
//●<body>にCSSのためのブラウザクラスを設定
//////////////////////////////////////////////////////////////////////////////
// この関数は、いち早く設定するためにHTMLから直接呼び出す
function set_browser_class_into_body() {
	var x = [];
	var ua = navigator.userAgent;

	     if (ua.indexOf('Chrome') != -1) x.push('GC');
	else if (ua.indexOf('WebKit') != -1) x.push('GC');
	else if (ua.indexOf('Opera')  != -1) x.push('Op');
	else if (ua.indexOf('Gecko')  != -1) x.push('Fx');

	var m = ua.match(/MSIE (\d+)/);
	if (m) x.push('IE', 'IE' + m[1]);
	  else x.push('NotIE');
	if (m && m[1]<8)  IE67=true;
	if (m && m[1]<9)  IE8=true;
	if (m && m[1]<10) IE9=true;

	// スマホ
	SP=true;
	     if (ua.indexOf('Android') != -1) x.push('android');
	else if (ua.indexOf('iPhone')  != -1) x.push('iphone');
	else if (ua.indexOf('iPad')    != -1) x.push('iphone');
	else if (ua.indexOf('BlackBerry')    != -1) x.push('berry');
	else if (ua.indexOf('Windows Phone') != -1) x.push('wp');
	else SP=false;
	if (SP) {
		x.push('SP');
		DialogWidth = 360;
	}

	// bodyにクラス設定する
	$('#body').addClass( x.join(' ') );
	SettedBrowserClass=true;
}

//////////////////////////////////////////////////////////////////////////////
//●ui-iconの自動ロード
//////////////////////////////////////////////////////////////////////////////
$(function(){
	var vals = [0, 0x80, 0xC0, 0xff];
	var obj = $('<span>').attr('id', 'ui-icon-autoload');
	$('#body').append(obj);
	var color = obj.css('background-color');
	obj.remove();
	if (!color || color == 'transparent') return;
	if (color.match(/\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0/)) return;

	var ma = color.match(/#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})/);
	var cols = [];
	if (ma) {	// IE8 is #0000ff
		cols[0] = parseInt('0x' + ma[1]);
		cols[1] = parseInt('0x' + ma[2]);
		cols[2] = parseInt('0x' + ma[3]);
	} else {
		// rgb( 0, 0, 255 )
		var ma = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
		if (!ma) return;
		cols[0] = ma[1];
		cols[1] = ma[2];
		cols[2] = ma[3];
	}
	// 用意されているアイコンからもっとも近い色を選択
	var file='';
	for(var i=0; i<3; i++) {
		var c = cols[i];
		var diff=255;
		var near;
		for(var j=0; j<vals.length; j++) {
			var d = Math.abs(vals[j] - c);
			if (d>diff) continue;
			near = vals[j];
			diff = d;
		}
		file += (near<16 ? '0' : '') + near.toString(16);
	}
	// アイコンのロード
	var css = '.ui-icon, a.pnavi:before, a.pnavi:after { background-image: '
		+ 'url("' + PubdistDir + 'ui-icon/' + file + '.png") }';
	var style = $('<style>').attr('type','text/css');
	$('head').append(style);
	if (IE8)
		style[0].styleSheet.cssText = css;
	else
		style.html(css);

});

//############################################################################
//■jQuery拡張
//############################################################################
//////////////////////////////////////////////////////////////////////////////
//●[jQuery] ディレイ付showとhide
//////////////////////////////////////////////////////////////////////////////
$.fn.delay_show = function(){
	var args = Array.prototype.slice.call(arguments);
	args[0] = (args[0] == undefined) ? default_show_speed : args[0];
	return $.fn.show.apply(this, args);
};
$.fn.delay_hide = function(){
	var args = Array.prototype.slice.call(arguments);
	args[0] = (args[0] == undefined) ? default_show_speed : args[0];
	return $.fn.hide.apply(this, args);
};

//////////////////////////////////////////////////////////////////////////////
//●[jQuery] 自分自身と子要素から探す findx という拡張をする
//////////////////////////////////////////////////////////////////////////////
$.fn.findx = function(sel){
	var x = $.fn.filter.apply(this, arguments);
	var y = $.fn.find.apply  (this, arguments);
	x = x.add(y);
	// 重複処理の防止
	var r = [];
	sel = '-f-' + sel;
	for(var i=0; i<x.length; i++) {
		var obj = $(x[i]);
		if (obj.parents('.js-hook-stop').length || obj.hasClass('js-hook-stop')) continue;
		if (obj.data(sel)) continue;
		obj.data(sel, true);
		r.push(x[i]);
	}
	return $(r);
};

//////////////////////////////////////////////////////////////////////////////
//●[jQuery] find でのエラーを無視する
//////////////////////////////////////////////////////////////////////////////
function myfind(sel) {
	try {
		return $(document).find(sel);
	} catch(e) {
		console.log(e);
	}
	return $('#--not-found-');
};

//////////////////////////////////////////////////////////////////////////////
//●[jQuery] $() でXSS対策
//////////////////////////////////////////////////////////////////////////////
{
	var init_orig = $.fn.init;
	$.fn.init = function(sel,cont) {
		if (typeof sel === "string" && sel.match(/<[\W]on\w+\s*=/i))
			throw 'Security error by adiary.js : ' + sel;
		return  new init_orig(sel,cont);
	};
}

//############################################################################
//■初期化処理
//############################################################################
var initfunc = [];
function adiary_init(R) {
	for(var i=0; i<initfunc.length; i++)
		initfunc[i](R);
}

var jquery_hook_stop = false;
$(function(){
	var body = $('#body');
	body.append( $('<div>').attr('id', 'popup-div')    );
	body.append( $('<div>').attr('id', 'popup-help')   );
	body.append( $('<div>').attr('id', 'popup-com')    );
	adiary_init(body);

	//////////////////////////////////////////////////////////////////////
	//●自動でadiary初期化ルーチンが走るようにjQueryに細工する
	//////////////////////////////////////////////////////////////////////
	function hook_function(obj, args) {
		var R = $('<div>');
		for(var i=0; i<args.length; i++) {
			if (!args[i] instanceof jQuery) continue;
			if (typeof args[i] === 'string') continue;
			if (!('findx' in args[i])) continue;
			// hook ok
			adiary_init(args[i]);
		}
	}

	var hooking = false;
	var hooks = ['append', 'prepend', 'before', 'after', 'html', 'replaceWith'];
	function hook(name) {
		var func = $.fn[name];
		$.fn[name] = function() {	// closure
			if (jquery_hook_stop || hooking || this.attr('id') !== 'body' && !this.parents('#body').length)
				return func.apply(this, arguments);
			// hook処理
			hooking = true;
			var r = func.apply(this, arguments);
			// html かつ string の特別処理
			if (name === 'html' && arguments.length === 1 && typeof arguments[0] === 'string') {
				adiary_init(this);
			} else {
				hook_function(this, arguments);
			}
			hooking = false;
			return r;
		}
	}
	for(var i=0; i<hooks.length; i++) {
		hook(hooks[i]);
	}
});

//////////////////////////////////////////////////////////////////////////////
//●画像・ヘルプのポップアップ
//////////////////////////////////////////////////////////////////////////////
function easy_popup(evt) {
	var obj = $(evt.target);
	var div = evt.data.div;
	var func= evt.data.func;
	var do_popup = function(evt) {
		if (div.is(":animated")) return;
		func(obj, div);
	  	div.css("left", evt.pageX +popup_offset_x);
	  	div.css("top" , evt.pageY +popup_offset_y);
		div.delay_show();
	};

	var delay = obj.data('delay') || default_show_speed;
	if (!delay) return do_popup(evt);
	obj.data('timer', setTimeout(function(){ do_popup(evt) }, delay));
}
function easy_popup_out(evt) {
	var obj = $(evt.target);
	var div = evt.data.div;
	if (obj.data('timer')) {
		clearTimeout( obj.data('timer') );
		obj.data('timer', null);
	}
	div.hide();
}

initfunc.push( function(R){
	var popup_div  = $('#popup-div');
	var popup_help = $('#popup-help');
	var imgs  = R.findx(".js-popup-img");
	var helps = R.findx(".help[data-help]");
	
	imgs.mouseenter( {func: function(obj,div){
		var img = $('<img>');
		img.attr('src', obj.data('img-url'));
		img.addClass('popup-image');
		div.empty();
		div.append( img );
	}, div: popup_div}, easy_popup);

	helps.mouseenter( {func: function(obj,div){
		var text = tag_esc_br( obj.data("help") );
		div.html( text );
	}, div: popup_help}, easy_popup);
	helps.each( function(idx,dom){
		var obj = $(dom);
		var text = tag_esc_br( obj.data("help") );
	});

	imgs .mouseleave({div: popup_div }, easy_popup_out);
	helps.mouseleave({div: popup_help}, easy_popup_out);
});

//////////////////////////////////////////////////////////////////////////////
//●詳細情報ダイアログの表示
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
  R.findx('.js-info[data-info], .js-info[data-url]').click( function(evt){
	var obj = $(evt.target);
	var div = $('<div>');
	var div2= $('<div>');	// 直接 div にクラスを設定すると表示が崩れる
	var text;
	div.attr('title', obj.data("title") || "Infomataion" );
	div2.addClass(obj.data("class"));
	div.empty();
	div.append(div2);
	if (obj.data('info')) {
		var text = tag_esc_br( obj.data("info") );
		div2.html( text );
		div.dialog({ width: DialogWidth });
		return;
	}
	var url = obj.data("url");
	div2.load( url, function(){
		div.dialog({ width: DialogWidth, height: 320 });
	});
  })
});

//////////////////////////////////////////////////////////////////////////////
//●フォーム要素の全チェック
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
  R.findx('input.js-checked').click( function(evt){
	var obj = $(evt.target);
	var target = obj.data( 'target' );
	myfind(target).prop("checked", obj.is(":checked"));
  })
});

//////////////////////////////////////////////////////////////////////////////
//●IE8/9でのみ有効/無効にする
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	if (!IE9) R.findx('.js-ie9').hide(0);
	if (!IE8) R.findx('.js-ie8').hide(0);
	if ( IE9) R.findx('.js-not-ie9').hide(0);
	if ( IE8) R.findx('.js-not-ie8').hide(0);
});

//////////////////////////////////////////////////////////////////////////////
//●フォーム操作による、enable/disableの自動変更
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	var objs = R.findx('input.js-enable, input.js-disable');
	function btn_evt(evt) {
		var btn = $(evt.target);
		var form = myfind( btn.data('target') );

		var flag;
		var type=btn.attr('type').toLowerCase();
		if (type == 'checkbox' || type == 'radio')
			flag = btn.is(":checked");
		else	flag = ! (btn.val() + '').match(/^\s*$/);
		if (btn.hasClass('js-disable')) flag=!flag;

		// disabled設定
		form.prop('disabled', !flag);
	}
	objs.click( btn_evt );
	objs.each(function(idx,ele){ btn_evt({target: ele}) });
});


//////////////////////////////////////////////////////////////////////////////
//●複数チェックボックスフォーム、全選択、submitチェック
//////////////////////////////////////////////////////////////////////////////
var confrim_button;
initfunc.push( function(R){
  R.findx('input.js-form-check, button.js-form-check').click( function(evt){
	var obj = $(evt.target);
	confrim_button = obj;
	var form = obj.parents('form.js-form-check');
	if (!form.length) return;
	form.data('confirm', obj.data('confirm') );
  })
});

initfunc.push( function(R){
  var confirmed;
  R.findx('form.js-form-check').submit( function(evt){
	var form = $(evt.target);
	var target = form.data('target');	// 配列
	var c = false;
	if (target) {
		c = myfind( target + ":checked" ).length;
		if (!c) return false;	// ひとつもチェックされてない
	}

	// 確認メッセージがある？
	var confirm = form.data('confirm');
	if (!confirm) return true;
  	if (confirmed) { confirmed=false; return true; }

	// 確認ダイアログ
	if (c) confirm = confirm.replace("%c", c);
	var btn = confrim_button;
	confrim_button = false;
	my_confirm(confirm, function(flag) {
		if (!flag) return;
		confirmed = true;
		if (btn) return btn.click();
		form.submit();
	});
	return false;
  })
});

//////////////////////////////////////////////////////////////////////////////
//●フォーム操作、クリック操作による表示・非表示の変更
//////////////////////////////////////////////////////////////////////////////
// 一般要素 + input type="checkbox", type="button"
// (例)
// <input type="button" value="ボタン" class="js-switch" data-target="xxx"
//  data-switch-speed="500" data-hide-val="表示する" data-show-val="非表示にする">
initfunc.push( function(R){
	function display_toggle(btn, init) {
		if (btn[0].tagName == 'A') return false;	// リンククリックは無視
		var type = btn[0].tagName == 'INPUT' && btn.attr('type').toLowerCase();
		var id = btn.data('target');
		if (!id) {
			// 子要素のクリックを拾うための処理
			btn = find_parent(btn, function(par){ return par.attr("data-target") });
			if (!btn) return;
			id = btn.data('target');
		}
		var target = myfind(id);
		if (!target.length || !target.is) return false;
		var speed  = btn.data('switch-speed');
		speed = (speed === undefined) ? default_show_speed : parseInt(speed);
		speed = init ? 0 : speed;

		// スイッチの状態を保存する
		var storage = btn.data('save') ? Storage : false;

		// 変更後の状態取得
		var flag;
		if (init && storage && storage.defined(id)) {
			flag = storage.getInt(id) ? true : false;
			if (type == 'checkbox' || type == 'radio') btn.prop("checked", flag);
		} else if (type == 'checkbox' || type == 'radio') {
			flag = btn.prop("checked");
		} else {
			flag = init ? !target.is(':hidden') : target.is(':hidden');
		}

		// 変更後の状態を設定
		speed = IE8 ? undefined : speed;
		if (flag) {
			btn.addClass('sw-show');
			btn.removeClass('sw-hide');
			if (init) target.show();
			     else target.show(speed);
			if (storage) storage.set(id, '1');

		} else {
			btn.addClass('sw-hide');
			btn.removeClass('sw-show');
			if (init) target.hide();
			     else target.hide(speed);
			if (storage) storage.set(id, '0');
		}
		if (type == 'button') {
			var val = flag ? btn.data('show-val') : btn.data('hide-val');
			if (val != undefined) btn.val( val );
		}

		if (init) {
			var dom = btn[0];
			if (dom.tagName == 'INPUT' || dom.tagName == 'BUTTON') return true;
			var span = $('<span>');
			span.addClass('ui-icon switch-icon');
			if (IE8) span.css('display', 'inline-block');
			btn.prepend(span);
		}
		return true;
	}
	R.findx('.js-switch').each( function(idx,ele) {
		var obj = $(ele);
		var f = display_toggle(obj, true);	// initalize
		if (f) obj.click( function(evt){ display_toggle($(evt.target), false) } );
	} );
});

//////////////////////////////////////////////////////////////////////////////
//●input[type="text"]などで enter による submit 停止
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('input.no-enter-submit, form.no-enter-submit input').keypress( function(ev){
		if (ev.which === 13) return false;
		return true;
	});
});

//////////////////////////////////////////////////////////////////////////////
//●色選択ボックスを表示。 ※input[type=text] のリサイズより先に行うこと
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	var load_picker;
	var cp = R.findx('input.color-picker');
	if (!cp.length) return;

	cp.each(function(i,dom){
		var obj = $(dom);
		var box = $('<span>').addClass('colorbox');
		obj.before(box);
		var col = obj.val();
		if (col.match(/^#[\dA-Fa-f]{6}$/))
			box.css('background-color', col);
	});
	var initfunc = function(){
		cp.each(function(idx,dom){
			var obj = $(dom);
			obj.ColorPicker({
				onSubmit: function(hsb, hex, rgb, _el) {
					var el = $(_el);
					el.val('#' + hex);
					el.ColorPickerHide();
					var prev = el.prev();
					if (! prev.hasClass('colorbox')) return;
					prev.css('background-color', '#' + hex);
					obj.change();
				},
				onChange: function(hsb, hex, rgb) {
					var prev = obj.prev();
					if (! prev.hasClass('colorbox')) return;
					prev.css('background-color', '#' + hex);
					var func = obj.data('onChange');
					if (func) func(hsb, hex, rgb);
				}
			});
			$('.colorpicker').draggable({
				cancel: ".colorpicker_color, .colorpicker_hue, .colorpicker_submit, input, span"
			});
			obj.ColorPickerSetColor( obj.val() );
		});
		cp.bind('keyup', function(evt){
			$(evt.target).ColorPickerSetColor(evt.target.value);
		});
		cp.bind('keydown', function(evt){
			if (evt.keyCode != 27) return;
			$(evt.target).ColorPickerHide();
		});
	};

	if (cp.ColorPicker) return initfunc();

	// color pickerのロード
	var dir = ScriptDir + 'colorpicker/';
	append_css_file(dir + 'css/colorpicker.css');
	$.getScript(dir + "colorpicker.js", initfunc);
});

//////////////////////////////////////////////////////////////////////////////
//●input[type="text"], input[type="password"]の自由リサイズ
//////////////////////////////////////////////////////////////////////////////
// IE9でもまともに動かないけど無視^^;;;
initfunc.push( function(R){
	R.findx('input').each( function(idx,dom){
		if (dom.type != 'text'
		 && dom.type != 'search'
		 && dom.type != 'tel'
		 && dom.type != 'url'
		 && dom.type != 'email'
		 && dom.type != 'password'
		) return;
		set_input_resize($(dom));
	} )

function set_input_resize(obj, flag) {
	if (obj.parents('.color-picker, .colorpicker').length) return;

	// 非表示要素は最初にhoverされた時に処理する
	if (!flag && obj.is(":hidden")) {
		var func = function(){
			obj.off('mouseenter', func);
			set_input_resize(obj, 1);
		};
		obj.on('mouseenter', func);
		return;
	}

	// テーマ側でのリサイズ機能の無効化手段なので必ず先に処理すること
	var span = $('<span>').addClass('resize-parts');
	if(span.css('display') == 'none') return;

	// 基準位置とする親オブジェクト探し
	var par = find_parent(obj, function(par){
		return par.css('display') == 'table-cell' || par.css('display') == 'block'
	});
	if (!par) return;
	if(par.css('display') == 'table-cell') {
		// テーブルセルの場合は、セル全体をdiv要素の中に移動する
		var cell  = par;
		var child = cell.contents();
		par = $('<div>').css('position', 'relative');
		child.each( function(idx,dom) {
			$(dom).detach();
			par.append(dom);
		});
		cell.append(par);
	} else {
		par.css('position', 'relative');
	}

	par.append(span);
	// append してからでないと span.width() が決まらないブラウザがある
	span.css("left", obj.position().left +  obj.outerWidth() - span.width());
	span.css("top",  obj.position().top );
	span.css("height", obj.outerHeight() );

	// 最小幅算出
	var width = obj.width();
	var min_width = parseInt(span.css("z-index")) % 1000;
	if (min_width < 16) min_width=16;
	if (min_width > width) min_width=width;
	span.mousedown( function(evt){ evt_mousedown(evt, obj, min_width) });
}

function evt_mousedown(evt, obj, min_width) {
	if (!obj.parents('.ui-dialog-content').length
	  && obj.parents('.ui-draggable, .ui-sortable-handle').length) return;

	var span = $(evt.target);
	var body = $('#body');
	span.data('drag-X', evt.pageX);
	span.data("obj-width", obj.width() );
	span.data("span-left", span.css('left') );

	var evt_mousemove = function(evt) {
		var offset = evt.pageX - parseInt(span.data('drag-X'));
		var width  = parseInt(span.data('obj-width')) + offset;
		if (width<min_width) {
			width  = min_width;
			offset = min_width - parseInt(span.data('obj-width'));
		}
		// 幅設定
		obj.width(width);
		span.css("left", parseInt(span.data('span-left')) + offset);
	};
	var evt_mouseup = function(evt) {
		body.unbind('mousemove', evt_mousemove);
		body.unbind('mouseup',   evt_mouseup);
	}

	// イベント登録
	body.mousemove( evt_mousemove );
	body.mouseup  ( evt_mouseup );
}
///
});

//////////////////////////////////////////////////////////////////////////////
//●input, textareaのフォーカスクラス設定  ※リサイズ設定より後に行うこと
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('form input, form textarea').each( function(idx,dom){
		if (dom.tagName != 'TEXTAREA'
		 && dom.type != 'text'
		 && dom.type != 'search'
		 && dom.type != 'tel'
		 && dom.type != 'url'
		 && dom.type != 'email'
		 && dom.type != 'password'
		) return;

		var obj = $(dom);
		// firefoxでなぜかうまく動かないバグ
		var par = find_parent(obj, function(par){ return par.css('display') == 'table-cell' });
		if (!par) return;

		obj.focus( function() {
			par.addClass('focus');
		});
		obj.blur ( function() {
			par.removeClass('focus');
		});
	} )
});

//////////////////////////////////////////////////////////////////////////////
//●INPUT type="radio", type="checkbox" のラベル関連付け（直後のlabel要素）
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('input[type="checkbox"],input[type="radio"]').each( function(idx,dom) {
		var obj = $(dom);
		var label = obj.next();
		if (!label.length || label[0].tagName != 'LABEL' || label.attr('for')) return;

		var id = obj.attr("id");
		if (!id) {
			var flag;
			for(var i=0; i<100; i++) {
				id = 'js-generate-id-' + Math.floor( Math.random()*0x80000000 );
				if (! $('#' + id).length ) {
					flag=true;
					break;
				}
			}
			if (!flag) return;
			obj.attr('id', id);
		}
		// labelに設定
		label.attr('for', id);
	});
///
});

//////////////////////////////////////////////////////////////////////////////
//●フォーム値の保存
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R) {
	R.findx('input.js-save, select.js-save').each( function(idx, dom) {
		var obj = $(dom);
		var id  = obj.attr("id");
		if (!id) return;
		var type = obj.attr('type');
		if (type && type.toLowerCase() == 'checkbox') {
			obj.change( function(evt){
				var obj = $(evt.target);
				Storage.set(id, obj.prop('checked') ? 1 : 0);
			});
			if ( Storage.defined(id) )
				obj.prop('checked', Storage.get(id) != 0 );
			return;
		}
		obj.change( function(evt){
			var obj = $(evt.target);
			Storage.set(id, obj.val());
		});
		if ( Storage.defined(id) )
			obj.val( Storage.get(id) );
	});
});

//////////////////////////////////////////////////////////////////////////////
//●textareaでのタブ入力
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('textarea').keypress( function(evt){
		var obj = $(evt.target);
		if (obj.prop('readonly') || obj.prop('disabled')) return;
		if (evt.keyCode != 9) return;

		evt.preventDefault();
		insert_to_textarea(evt.target, "\t");
	});
});


//////////////////////////////////////////////////////////////////////////////
//●タブ機能
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	var obj = R.findx('.jqueryui-tabs');
	if (!obj.length) return;
	obj.tabs();
});

//////////////////////////////////////////////////////////////////////////////
//●accordion機能
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	var obj = R.findx('.jqueryui-accordion');
	if (!obj.length) return;
	obj.accordion({
		heightStyle: "content"
	});
});

//////////////////////////////////////////////////////////////////////////////
//●formDataが使用できないブラウザで、ファイルアップ部分を無効にする
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	if (window.FormData) return;
	R.findx('.js-fileup').each(function(idx,dom) {
		var obj = $(dom);
		obj.prop('disabled', true);
	});
});

//////////////////////////////////////////////////////////////////////////////
//●要素の位置を変更する
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('[data-move]').each(function(idx,dom) {
		var obj = $(dom);
		obj.detach();
		var target = myfind(obj.data('move'));
		var type   = obj.data('move-type');
		     if (type == 'prepend') target.prepend(obj);
		else if (type == 'append')  target.append (obj);
		else if (type == 'before')  target.before(obj);
					else target.after(obj);
	});
});

//////////////////////////////////////////////////////////////////////////////
//●bodyにクラスを追加する
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('[data-body-class]').each(function(idx,dom) {
		var cls = $(dom).data('body-class');
		$('#body').addClass(cls);
	});
});

//////////////////////////////////////////////////////////////////////////////
//●スマホ用の処理。hover代わり
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	var ary = R.findx('.js-alt-hover li ul').parent();
	ary.addClass('node');
	ary = ary.children('a');
	ary.click(function(evt) {
		var obj = $(evt.target).parent();
		if (obj.hasClass('open')) {
			obj.removeClass('open');
			obj.find('.open').removeClass('open')
		} else
			obj.addClass('open');
		// リンクを飛ぶ処理をキャンセル
		evt.preventDefault();
	});
	ary.dblclick(function(evt) {
		location.href = $(evt.target).attr('href');
	});
});

//////////////////////////////////////////////////////////////////////////////
//●要素の幅を中身を参照して自動設定する（最後に処理すること）
//////////////////////////////////////////////////////////////////////////////
initfunc.push( function(R){
	R.findx('.js-auto-width').each(function(idx,dom) {
		var obj = $(dom);
		if (obj.parents('.js-auto-width-stop').length) return;

		var ch = obj.children();
		var width = 0;
		for(var i=0; i<ch.length; i++)
			width += $(ch[i]).outerWidth();
		if (IE8) width+=2;
		obj.width(width);
	});
});

//############################################################################
// ■最初のロード時のみのサービス処理
//############################################################################
//////////////////////////////////////////////////////////////////////////////
//●コメント欄の >>14 等をリンクに変更する
//////////////////////////////////////////////////////////////////////////////
$( function(){
	var popup=$('#popup-com');
	var timer;
	$('#com div.comment-text a[data-reply], #comlist-table a[data-reply]').each(function(idx,dom) {
		var link = $(dom);
		var num  = link.data('reply').toString().replace(/[^\d]/g, '');
		var com  = $('#c' + num);
		if (!com.length) return;

		link.mouseover(function() {
			popup.html( com.html() );
		  	popup.css("top" , link.offset().top  +popup_offset_y);
		  	popup.css("left", link.offset().left +popup_offset_x);
			popup.delay_show();
		});
		link.mouseout(function() {
			timer = setTimeout(function(){
				popup.hide('fast');
			}, 300);
		});
		popup.mouseover(function() {
			clearTimeout(timer);
		});
		popup.mouseleave(function() {
			popup.hide('fast');
		});
	});
});

//////////////////////////////////////////////////////////////////////////////
//●sidebarかmainの高さに hatena-body をあわせる
//////////////////////////////////////////////////////////////////////////////
// テーマで指定があるときのみ実行
$( function(){
	var hbody = $('#hatena-body');
	if ( hbody.css('max-height') != '99999px' ) return;

	function fix_height() {
		var height = 0;
		var ary = ['#main-first', '#sidebar', '#side-a', '#side-b'];
		for(var i=0; i<ary.length; i++) {
			var h = parseInt( $(ary[i]).outerHeight() );
			if (isNaN(h)) continue;
			if (height < h) height=h;
		}
		if (!h) return;
		hbody.css('min-height', height);
	}
	setTimeout(fix_height, 1000);
	fix_height();
});

//############################################################################
// ■スケルトン内部使用ルーチン
//############################################################################
//////////////////////////////////////////////////////////////////////////////
//●セキュリティコードの設定
//////////////////////////////////////////////////////////////////////////////
function put_sid(id) {
	var str="";
	for (var i=3; i<arguments.length; i++) {
		if (i & 1) {
			str += String.fromCharCode(  arguments[i] );
		}
	}
	if (id) {
		$('#' + id).val(str);
	}
}

//////////////////////////////////////////////////////////////////////////////
// ●検索条件表示の関連処理
//////////////////////////////////////////////////////////////////////////////
function init_top_search(id) {
	var form = $(id);
	var tagdel = $('<span>').addClass('ui-icon ui-icon-close');
	tagdel.click(function(evt){
		var obj = $(evt.target);
		obj.parent().remove();
		form.submit();
	});
	form.find("div.taglist span.tag").append(tagdel);

	var ymddel = $('<span>').addClass('ui-icon ui-icon-close');
	ymddel.click(function(evt){
		form.attr('action', form.data('noymd-url'));
		form.submit();
	});

	form.find("div.yyyymm span.yyyymm").append(ymddel);
}

//////////////////////////////////////////////////////////////////////////////
// ●検索ハイライト表示
//////////////////////////////////////////////////////////////////////////////
function word_highlight(id) {
	var ch = $(id).children();
	var words = [];
	for(var i=0; i<ch.length; i++) {
		var w = $(ch[i]).text();
		if (w.length < 1) continue;
		words.push( w.toLowerCase() );
	}

	var target = $("#articles article h2 .title, #articles article div.body div.body-main");
	var h_cnt = 0;
	rec_childnodes(target, words);

// childnodesを再起関数で探索
function rec_childnodes(_nodes, words) {
	// ノードはリアルタイムで書き換わるので、呼び出し時点の状態を保存しておく
	var nodes = [];
	for(var i=0; i<_nodes.length; i++)
		nodes.push(_nodes[i]);
	
	// テキストノードの書き換えループ
	for(var i=0; i<nodes.length; i++) {
		if (nodes[i].nodeType == 3) {
			var text = nodes[i].nodeValue;
			if (text == undefined || text.match(/^[\s\n\r]*$/)) continue;
			do_highlight_string(nodes[i], words);
			h_cnt++; if (h_cnt>999) break; 
			continue;
		}
		if (! nodes[i].hasChildNodes() ) continue;
		rec_childnodes( nodes[i].childNodes, words );	// 再起
	}
}
function do_highlight_string(node, words) {
	var par  = node.parentNode;
	var str  = node.nodeValue;
	var str2 = str.toLowerCase();
	var find = false;
	var d = document;
	while(1) {
		var p=str.length;
		var n=-1;
		for(var i=0; i<words.length; i++) {
			var w = words[i];
			var x = str2.indexOf(w);
			if (x<0 || p<=x) continue;
			p = x;
			n = i;
		}
		if (n<0) break;	// 何も見つからなかった
		// words[n]が位置pに見つかった
		var len = words[n].length;
		var before = d.createTextNode( str.substr(0,p)   );
		var word   = d.createTextNode( str.substr(p,len) );
		var span   = d.createElement('span');
		span.className = "highlight highlight" + n;
		span.appendChild( word );
		if (p) par.insertBefore( before, node );
		par.insertBefore( span, node );

		find = true;
		str  = str.substr ( p + len );
		str2 = str2.substr( p + len );
	}
	if (!find) return ;
	// 残った文字列を追加して、nodeを消す
	if (str.length) {
		var remain = d.createTextNode( str );
		par.insertBefore( remain, node );
	}
	par.removeChild( node );
}
///
}

//////////////////////////////////////////////////////////////////////////////
// ●タグ一覧のロード
//////////////////////////////////////////////////////////////////////////////
function load_taglist(id, func) {
	var sel = $(id);	// セレクトボックス
	var _default = sel.data('default') || '';
	func = func ? func : function(data){
		var r_func = function(ary, head, tab) {
			for(var i=0; i<ary.length; i++) {
				var val = head + ary[i].title;
				var opt = $('<option>').attr('value', val).html( val );
				opt.css('padding-left', tab);
				if ( val == _default ) opt.prop('selected', true);
				sel.append(opt);
				if (ary[i].children)
					r_func( ary[i].children, head+val+'::', tab+8 );
			}
		};
		r_func(data, '', 0);
	};
	$.getJSON( sel.data('url'), func );
}

//////////////////////////////////////////////////////////////////////////////
// ●コンテンツ一覧のロード
//////////////////////////////////////////////////////////////////////////////
function load_contents_list(id) {
	var obj = $(id);
	$.getJSON( obj.data('url'), function(data){
		var _default  = obj.data('default');
		var this_pkey = obj.data('this-pkey');

		var r_func = function(ary, tab) {
			for(var i=0; i<ary.length; i++) {
				var pkey  = ary[i].key;
				if (pkey == this_pkey) continue;
				var title = ary[i].title;
				var opt = $('<option>').attr('value', pkey).text( title );
				opt.data('link_key', ary[i].link_key);
				if (tab) opt.css('padding-left', tab);
				if ( pkey == _default ) opt.prop('selected', true);
				obj.append(opt);
				if (ary[i].children)
					r_func( ary[i].children, tab+8 );
			}
		};
		r_func(data, 0);
	});
}

//////////////////////////////////////////////////////////////////////////////
// ●ユーザーCSSの強制リロード
//////////////////////////////////////////////////////////////////////////////
function reload_user_css() {
	var obj = $('#user-css');
	var url = obj.attr('href');
	if (!obj.length || !url || !url.length) return 1;

	url = url.replace(/\?.*/, '');	// ?より後ろを除去
	url += '?' + Math.random().toString().replace('.', '');
	obj.attr('href', url);
	return 0;
}

//////////////////////////////////////////////////////////////////////////////
//●twitterウィジェットのデザイン変更スクリプト
//////////////////////////////////////////////////////////////////////////////
function twitter_css_fix(css_text, width){
	var try_max = 20;
	var try_msec = 250;
	function callfunc() {
		var r=1;
		if (try_max--<1) return;
		try{
			r = css_fix(css_text, width);
		} catch(e) { ; }
		if (r) setTimeout(callfunc, try_msec);
	}
	setTimeout(callfunc, try_msec);

function css_fix(css_text, width) {
	var iframes = $('iframe');
	var iframe;
	var ch;
	for (var i=0; i<iframes.length; i++) {
		iframe = iframes[i];
		if (iframe.id.substring(0, 15) != 'twitter-widget-') continue;
		if (iframe.className.indexOf('twitter-timeline')<0) continue;
		if (iframes[i].id.substring(0, 15) != 'twitter-widget-') continue;
		var doc = iframe.contentDocument || iframe.document;
		if (!doc || !doc.documentElement) continue;
		var ch = doc.documentElement.children;
		break;
	}
	if (!ch) return -1;
	var head;
	var body;
	for (var i=0; i<ch.length; i++) {
		if (ch[i].nodeName == 'HEAD') head = ch[i];
		if (ch[i].nodeName == 'BODY') body = ch[i];
	}
	if (!head || !body) return -2;
	if (body.innerHTML.length == 0) return -3;

	var css = $('<style>').attr({
		id: 'add-tw-css',
		type: 'text/css'
	});
	css.html(css_text);
	$(head).append(css);

	if (width > 49) {
		iframe.css({
			'width': width + "px",
			'min-width': width + "px"
		});
	}
	return ;
};
///
}

//############################################################################
// ■サブルーチン
//############################################################################
//////////////////////////////////////////////////////////////////////////////
// セキュアなオブジェクト取得
//////////////////////////////////////////////////////////////////////////////
function $secure(id) {
	var obj = myfind('[id="' + id.substr(1) + '"]');
	if (obj.length >1) {
		show_error('Security Error!<p>id="' + id + '" is duplicate.</p>');
		return $('#--not-found--');	// 2つ以上発見された
	}
	return obj;
}

//////////////////////////////////////////////////////////////////////////////
// CSSファイルの追加
//////////////////////////////////////////////////////////////////////////////
function append_css_file(file) {
	$("head").append("<link>");
	var css = $("head").children(":last");
	css.attr({
		type: "text/css",
		rel: "stylesheet",
		href: file
	});
	return css;
}

//////////////////////////////////////////////////////////////////////////////
// タグ除去
//////////////////////////////////////////////////////////////////////////////
function tag_esc(text) {
	return text
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&apos;')
}
function tag_esc_br(text) {
	return tag_esc(text).replace(/\n|\\n/g,'<br>');
}

function tag_decode(text) {
	return text
	.replace(/&apos;/g, "'")
	.replace(/&quot;/g, '"')
	.replace(/&gt;/g, '>')
	.replace(/&lt;/g, '<')
	.replace(/&#92;/g, "\\")	// for JSON data
}

//////////////////////////////////////////////////////////////////////////////
// link_keyのエンコード :: adiary.pmと同一の処理
//////////////////////////////////////////////////////////////////////////////
function link_key_encode(text) {
	return text.replace(/^\//, './/').replace(/[^\w!\(\)\*\-\.\~\/:;=&]+/g, function(data) {
		return decodeURI(data).replace("'", '%27');
	});
}

//////////////////////////////////////////////////////////////////////////////
// 条件にマッチする親要素を最初にみつけるまで探索
//////////////////////////////////////////////////////////////////////////////
function find_parent(obj, filter) {
	for(var i=0; i<999; i++) {
		obj = obj.parent();
		if (!obj.length) return;
		if (!obj[0].tagName) return;
		if (filter(obj)) return obj;
	}
	return;
}

//////////////////////////////////////////////////////////////////////////////
// テキストエリアに文字挿入
//////////////////////////////////////////////////////////////////////////////
function insert_to_textarea(ta, text) {
	var start = ta.selectionStart;	// カーソル位置
	if (start == undefined) {
		// for IE8
		var tmp = document.selection.createRange();
		tmp.text = text;
		return;
	}
	// カーソル移動
	ta.value = ta.value.substring(0, start)	+ text + ta.value.substring(start);
	start += text.length;
	ta.setSelectionRange(start, start);
}

//############################################################################
// ダイアログ関連
//############################################################################
//////////////////////////////////////////////////////////////////////////////
// ●エラーの表示
//////////////////////////////////////////////////////////////////////////////
function show_error(h, _arg) {
	if (typeof(h) === 'string') h = {id: h, hash:_arg};
	h.dclass = h.dclass + ' error-dialog';
	h.title = 'ERROR';
	return show_dialog(h);
}
function show_dialog(h, _arg) {
	if (typeof(h) === 'string') h = {id: h, hash:_arg};
	var html = h.msg || ((h.id.substr(0,1) != '#') ? h.id : myfind(h.id).html());
	if (h.hash) html = html.replace(/%([A-Za-z])/g, function(w,m1){ return h.hash[m1] });
	html = html.replace(/%[A-Za-z]/g, '');

	var div = $('<div>');
	div.html( html );
	div.attr('title', h.title || 'Dialog');
	div.dialog({
		modal: true,
		dialogClass: h.dclass,
		buttons: { OK: function(){ div.dialog('close'); } }
	});
	return false;
}

//////////////////////////////////////////////////////////////////////////////
// ●確認ダイアログ
//////////////////////////////////////////////////////////////////////////////
function my_confirm(h, callback) {
	if (typeof(h) === 'string') h = {id: h};
	callback = callback || h.callback;
	var html = (h.id.substr(0,1) != '#') ? h.id : myfind(h.id).html();
	if (h.hash) html = html.replace(/%([A-Za-z])/g, function(w,m1){ return h.hash[m1] });

	var div = $('<div>');
	div.html( html );
	div.attr('title', h.title || $('#ajs-confirm').text());
	var btn = {};
	btn[ h.btn_ok || $('#ajs-ok').text()] = function(){
		div.dialog('close');
		callback(true);
	};
	btn[ h.btn_cancel || $('#ajs-cancel').text()] = function(){
		div.dialog('close');
		callback(false);
	};
	div.dialog({
		modal: true,
		dialogClass: h.class_,
		buttons: btn
	});
}

//////////////////////////////////////////////////////////////////////////////
// ●テキストエリア入力のダイアログ
//////////////////////////////////////////////////////////////////////////////
function textarea_dialog(dom, func) {
	var obj  = $(dom);
	form_dialog({
		title: obj.data('title'),
		elements: [
			{type: 'p', html: obj.data('msg')},
			{type: 'textarea', name: 'ta'}
		],
		callback: function( h ) { func( h.ta ) }
	});
}

//////////////////////////////////////////////////////////////////////////////
// ●入力のダイアログの表示
//////////////////////////////////////////////////////////////////////////////
function form_dialog(h) {
	var ele = h.elements || { type:'text', name:'str', dclass:'w80p' };
	if (!Array.isArray(ele)) ele = [ ele ];
	var div = $('<div>').attr('id','popup-dialog');

	var form = $('<form>');
	for(var i=0; i<ele.length; i++) {
		var x = ele[i];
		if (!x) continue;
		if (typeof(x) == 'string') {
			var line = $('<div>').html(x);
			form.append( line );
			continue;
		}
		if (x.type == 'p') {
			form.append( $('<p>').html( x.html ) );
			continue;
		}
		if (x.type == 'textarea') {
			var t = $('<textarea>').attr({
				rows: x.rows || 5,
				name: x.name
			}).addClass('w100p');
			if (x.val != '') t.text( x.val );
			form.append( t );
			continue;
		}
		if (x.type == '*') {
			form.append( x.html );
			continue;
		}
		// else
		var inp = $('<input>').attr({
			type: x.type || 'text',
			name: x.name,
			value: x.val
		});
		inp.addClass( x.dclass || 'w80p');
		form.append( inp );
	}
	div.empty();
	div.append( form );

	// ボタンの設定
	var buttons = {};
	var ok_func = buttons[ $('#ajs-ok').text() ] = function(){
		div.dialog( 'close' );
		var ret = {};
		var ary = form.serializeArray();
		for(var i=0; i<ary.length; i++){
			ret[ ary[i].name ] = ary[i].value;
		}
		h.callback( ret );	// callback
	};
	buttons[ $('#ajs-cancel').text() ] = function(){
		div.dialog( 'close' );
		if (h.cancel) h.cancel();
	};
	// Enterキーによる送信防止
	form.on('keypress', 'input', function(evt) {
		if (evt.which === 13) { ok_func(); return false; }
		return true;
	});

	// ダイアログの表示
	div.dialog({
		modal: true,
		width:  DialogWidth,
		minHeight: 100,
		title:   h.title || $('#msg-setting-title').text(),
		buttons: buttons
	});
}

//############################################################################
// ■adiary用 Ajaxライブラリ
//############################################################################
//////////////////////////////////////////////////////////////////////////////
// ●セッションを保持して随時データをロードする
//////////////////////////////////////////////////////////////////////////////
function adiary_session(_btn, opt){
  $(_btn).click( function(evt){
	var btn = $(evt.target);
	var myself = opt.myself || Vmyself;
	var log = myfind(opt.log || btn.data('log-target') || '#session-log');

	var load_session = myself + '?etc/load_session';
	var interval = opt.interval || log.data('interval') || 300;
	var snum;
	log.delay_show();

	if (opt.init) opt.init(evt);

	// セッション初期化
	$.post( load_session, {
			action: 'etc/init_session',
			csrf_check_key: opt.csrf_key || $('#csrf-key').val()
		}, function(data) {
			var reg = data.match(/snum=(\d+)/);
			if (reg) {
				snum = reg[1];
				ajax_session();
			}
		}, 'text'
	);

	// Ajaxセッション開始
	function ajax_session(){
		log_start();
		console.log('[adiary_session()] session start');
		var fd;
		if (opt.load_formdata) fd = opt.load_formdata(btn);
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
			error: function(data) {
				if (opt.error) opt.error();
				console.log('[adiary_session()] http post fail');
				console.log(data);
				log_stop();
			},
			success: function(data) {
				if (opt.success) opt.success();
				console.log('[adiary_session()] http post success');
				console.log(data);
				log_stop();
			},
			xhr: opt.xhr
		});
	}
	
	/// ログ表示タイマー
	var log_timer;
	function log_start( snum ) {
		btn.prop('disabled', true);
		log.data('snum', snum);
		log_timer = setInterval(log_load, interval);
	}
	function log_stop() {
		if (log_timer) clearInterval(log_timer);
		log_timer = 0;
		log_load();
		btn.prop('disabled', false);
	}
	function log_load() {
		var url = load_session + '&snum=' + snum;
		log.load(url, function(data){
			log.scrollTop( log.prop('scrollHeight') );
		});
	}
  });
};

//############################################################################
// 外部スクリプトロード用ライブラリ
//############################################################################
//////////////////////////////////////////////////////////////////////////////
// ■syntax highlight機能のロード
//////////////////////////////////////////////////////////////////////////////
var load_sh_flag = false;
var alt_SyntaxHighlight = false;
var syntax_highlight_css = 'github';
function load_SyntaxHighlight() {
	if (load_sh_flag) return;
	load_sh_flag=true;
$(function(){
	if (alt_SyntaxHighlight) return alt_SyntaxHighlight();
	$.getScript(ScriptDir + 'highlight.pack.js', function(){
		append_css_file(PubdistDir + 'highlight-js/'+ syntax_highlight_css +'.css');
		$('pre.syntax-highlight').each(function(i, block) {
			hljs.highlightBlock(block);
		});
	});
});
///
}

//############################################################################
// Prefix付DOM Storageライブラリ
//							(C)2010 nabe@abk
//############################################################################
// Under source is MIT License
//
// ・pathを適切に設定することで、同一ドメイン内で住み分けることができる。
// ・ただし紳士協定に過ぎないので過剰な期待は禁物
// is_session  0(default):LocalStorage 1:sessionStorage 2:ワンタイムなobj
//
//（利用可能メソッド） set(), get(), remove(), clear()
//
function load_PrefixStorage(path) {
	var ls = new PrefixStorage(path);
	return ls;	// fail
}
function PrefixStorage(path, is_session) {
	// ローカルストレージのロード
	this.ls = Load_DOMStorage( is_session );

	// プレフィックス
	this.prefix = String(path) + '::';
}

//-------------------------------------------------------------------
// メンバ関数
//-------------------------------------------------------------------
PrefixStorage.prototype.set = function (key,val) {
	this.ls[this.prefix + key] = val;
};
PrefixStorage.prototype.get = function (key) {
	return this.ls[this.prefix + key];
};
PrefixStorage.prototype.getInt = function (key) {
	var v = this.ls[this.prefix + key];
	if (v==undefined) return 0;
	return Number(v);
};
PrefixStorage.prototype.defined = function (key) {
	return (this.ls[this.prefix + key] !== undefined);
};
PrefixStorage.prototype.remove = function(key) {
	this.ls.removeItem(this.prefix + key);
};
PrefixStorage.prototype.allclear = function() {
	this.ls.clear();
};
PrefixStorage.prototype.clear = function(key) {
	var ls = this.ls;
	var pf = this.prefix;
	var len = pf.length;

	if (ls.length != undefined) {
		var ary = new Array();
		for(var i=0; i<ls.length; i++) {
			var k = ls.key(i);
			if (k.substr(0,len) === pf) ary.push(k);
		}
		// forでkey取り出し中には削除しない
		//（理由はDOM Storage仕様書参照のこと）
		for(var i in ary) {
			delete ls[ ary[i] ];
		}
	} else {
		// DOMStorageDummy
		for(var k in ls) {
			if (k.substr(0,len) === pf)
				delete ls[k];
		}
	}
};

//////////////////////////////////////////////////////////////////////////////
// ■ Storageの取得
//////////////////////////////////////////////////////////////////////////////
//(参考資料) http://www.html5.jp/trans/w3c_webstorage.html
function Load_DOMStorage(is_session) {
	var storage;
	// LocalStorage
	try{
		if (typeof(localStorage) != "object" && typeof(globalStorage) == "object") {
			storage = globalStorage[location.host];
		} else {
			storage = localStorage;
		}
	} catch(e) {
		// Cookieが無効のとき
	}
	// 未定義のとき DOM Storage もどきをロード
	if (!storage) {
		storage = new DOMStorageDummy();
	}
	return storage;
}

//////////////////////////////////////////////////////////////////////////////
// ■ sessionStorage 程度の DOM Storage もどき
//////////////////////////////////////////////////////////////////////////////
// length, storageイベントは非対応
//
function DOMStorageDummy() {
	// メンバ関数
	DOMStorageDummy.prototype.setItem = function(key, val) { this[key] = val; };
	DOMStorageDummy.prototype.getItem = function(key) { return this[key]; };
	DOMStorageDummy.prototype.removeItem = function(key) { delete this[key]; };
	DOMStorageDummy.prototype.clear = function() {
		for(var k in this) {
			if(typeof(this[k]) == 'function') continue;
			delete this[k];
		}
	}
}


