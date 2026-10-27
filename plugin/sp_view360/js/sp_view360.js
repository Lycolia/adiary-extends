// 360画像表示用プラグイン
// ver. 1.0
'use strict';

function sp_view360(){
	var me = this;
	me.name = "sp_view360";
	me.version = "1.0";
	me.speed = 0.2; // 速度補正

	me.idptn = /\d+$/; // ^sp_view360_\d+$
	me.lastid = 0;
	me.drag = false;  // drag検出フラグ

// WebGLに必要な要素
	me.elem     = []; // view用 親エレメント
	me.scene    = [];
	me.camera   = [];
	me.renderer = [];
	me.angle    = [];
	me.canvas   = [];

// 視点移動用
	me.target = -1;
	me.mouseStatus =  {x: 0, y: 0, s: 0};

// 要素のページの中の位置（jQueryの offset() と同じ）
	me.offset = function(elem){
		var r = elem.getBoundingClientRect();
		return {left: r.left + window.scrollX, top: r.top + window.scrollY};
	}

// 初期化
	me.init = function(){
		// 360度画像の要素を探す。[image:360:…]の記法（tag-image-360）か、view360のクラスを付けたリンクの画像
		// ※以前はファイル名の末尾が「-360」「_360」の画像も対象にしていたが、
		//   貼り付けた画像の名前（時刻のミリ秒が360）とぶつかるのでやめた
		document.querySelectorAll("a.tag-image-360 img, a.view360 img").forEach(function(elem, idx){
			me.make(idx, elem);
		});

		// ドキュメントのマウスイベントに登録
		document.addEventListener("mousemove", me.onMouseMove);
		document.addEventListener("mouseup", me.onMouseUp);
		document.addEventListener("mouseleave", me.onMouseUp); // たぶん発生しないイベント
		document.addEventListener("touchmove", me.onTouchMove);
		document.addEventListener("touchend", me.onMouseUp);   //mouseと同じ
		document.addEventListener("touchcancel", me.onMouseUp);//mouseと同じ

	}// init

	me.make = function(idx, elem){
		// three.min.js を読むのを待つ間に、画像を読み終えていることがある（キャッシュなど）。
		// そのときは load が起きないので、すぐに作る
		if (elem.complete && elem.naturalWidth) return me._make(elem);
		elem.addEventListener('load', function(){
			me._make(elem);
		});
	}
	me._make = function(elem){
		var width  = elem.width;
		var height = elem.height;
		var span   = document.createElement('span');
		span.setAttribute('style', "display: inline-block; width: "+width+"px; height:"+height+"px; position: relative: baseline: bottom");
		elem.parentNode.insertBefore(span, elem);
		span.appendChild(elem);
		me.elem.push(span);
		var idx = me.lastid;
		me.lastid++;

		// ドラッグイベント(兼 情報表示)用canvas
		var canvas = document.createElement('canvas');
		canvas.id     = "sp_view360_"+idx;
		canvas.width  = width;
		canvas.height = height;
		canvas.setAttribute('style', "position: absolute; width: "+width+"px; height:"+height+"px; background-color:rgba(0,0,0,0)");
		me.canvas.push(canvas);
		me.elem[idx].appendChild(me.canvas[idx]);

		// 基本オブジェクトの生成と登録
		me.scene.push(new THREE.Scene());
		me.camera.push(new THREE.PerspectiveCamera(70, width / height, 0.1, 1000));
		me.camera[idx].rotation.order = "YXZ";
		me.angle.push({lon: 0, lat: 0});
		me.renderer.push(new THREE.WebGLRenderer(/*{antialias: true}*/));
		me.renderer[idx].setPixelRatio(window.devicePixelRatio);
		me.renderer[idx].setSize(width, height);

		// 画像をtextureとして読み込み
//console.log("LoadTexture: "+elem.getAttribute("src"));
		var textureLoader = new THREE.TextureLoader();
		textureLoader.load(elem.getAttribute("src"), (function(k){
			var idx = k;
			return function(texture){
				// textureの初期設定
				texture.mapping   = THREE.UVMapping;
				texture.minFilter = texture.magFilter = THREE.LinearFilter;
				var mesh = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 32), new THREE.MeshBasicMaterial({map: texture}));
				mesh.scale.x = -1;
				mesh.position.set(0, 0, 0);
				mesh.material.needsUpdate = true;
				mesh.material.side = THREE.BackSide;
				me.scene[idx].add(mesh);

				// 読みだしたら元画像とキャンバスを入れ替えて描画
				me.elem[idx].querySelectorAll("img").forEach(function(img){ img.style.display = 'none'; });
				me.elem[idx].appendChild(me.renderer[idx].domElement);
				me.render(idx);

				// マウスイベントの登録
				me.canvas[idx].addEventListener("mousedown", me.onMouseDown);
				me.canvas[idx].addEventListener("touchstart", me.onTouchStart);

				// Dragした場合はclickイベントを止める
				me.canvas[idx].addEventListener("click", function(e){
					if (!me.drag) return;
					e.preventDefault();
					e.stopPropagation();
				});
			};
		})(idx));// textureLoader.load
	}

	me.render = function(idx) {
		// 念のため上下の角度チェックして、角度を調整する
//		me.angle[idx].lat = Math.max(-89, Math.min(89, me.angle[idx].lat));

		// カメラの首振り
		me.camera[idx].rotation.y = THREE.Math.degToRad(90-me.angle[idx].lon); // 左右首振り
		me.camera[idx].rotation.x = THREE.Math.degToRad(-me.angle[idx].lat);   // 上下首振り

		me.renderer[idx].render(me.scene[idx], me.camera[idx]);
	}

	// ドラッグスタート
	me.onMouseDown  = function(e){ me._dragstart(e, e.pageX, e.pageY); }
	me.onTouchStart = function(e){ me._dragstart(e, e.changedTouches[0].pageX, e.changedTouches[0].pageY); }
	me._dragstart   = function(e, x, y){
		me.drag = false;
		e.preventDefault();
		if(me.mouseStatus.s > 0){ return; }
		me.mouseStatus.s = 1;

		var idx = 1 * e.target.id.match(me.idptn);
		me.target = idx;

		// 基準座標の記録
		me.mouseStatus.x = (x - me.offset(me.elem[idx]).left);
		me.mouseStatus.y = (y - me.offset(me.elem[idx]).top);
	}
	// ドラッグちう
	me.onMouseMove = function(e){ me._dragging(e, e.pageX, e.pageY); }
	me.onTouchMove = function(e){ me._dragging(e, e.changedTouches[0].pageX, e.changedTouches[0].pageY); }
	me._dragging   = function(e, x, y){
		me.drag = true;
		if(me.mouseStatus.s == 0 || me.target < 0){ return ;}
		var idx = me.target;

		// 移動した分だけ画面を動かす
		me.angle[idx].lon = me.angle[idx].lon + (me.mouseStatus.x - (x - me.offset(me.elem[idx]).left)) * me.speed;
		me.angle[idx].lat = me.angle[idx].lat + (me.mouseStatus.y - (y - me.offset(me.elem[idx]).top)) * me.speed;
		me.angle[idx].lat = Math.max(-80, Math.min(80, me.angle[idx].lat)); // 上下に制限をかける

		// 基準座標の更新
		me.mouseStatus.x = x - me.offset(me.elem[idx]).left;
		me.mouseStatus.y = y - me.offset(me.elem[idx]).top;

		// 画面の更新
		me.render(idx);
	}

	// ドラッグ終了
	me.onMouseUp = function(e){
		me.mouseStatus.s = 0;
		me.target = -1;
	}
}

var sp_view360 = new sp_view360();
sp_view360.init();

