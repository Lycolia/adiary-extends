'use strict';
(function(func) {
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', func);
	else func();
})(function(){
	const TARGET    = '.main div.body-main figure, .main div.body-main table, .main div.body-main div, .main div.body-main blockquote, .main div.body-main pre, .main div.body-main iframe';
	const body      = document.querySelector('.main div.body-main');
	const baseWidth = (body ? inner_width(body) : 0) * 0.9;
	const minMargin = 8;

	// jQuery の width() と同じ（padding と border を除いた幅）
	function inner_width(dom) {
		const css = getComputedStyle(dom);
		return dom.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
	}
	function prev_target(dom) {
		const x = dom.previousElementSibling;
		return x && x.matches(TARGET) ? x : null;
	}
	function next_target(dom) {
		const x = dom.nextElementSibling;
		return x && x.matches(TARGET) ? x : null;
	}

	function alian_lineheight(dom) {
		if (dom.parentElement && dom.parentElement.closest(TARGET)) return;

		let line_h = parseInt(getComputedStyle(dom).lineHeight);
		line_h = isNaN(line_h) ? 24 : line_h;		// default 24px;

		const objs = [dom];
		if (dom.offsetWidth > baseWidth) {	// 横に複数並ぶ figure を除外する
			while(true) {
				const y = prev_target(objs[0]);
				if (!y) break;
				const w  = y.offsetWidth;
				if (w < baseWidth) break;
				objs.unshift(y);
			}
			while(true) {
				const y = next_target(objs[objs.length-1]);
				if (!y) break;
				const w  = y.offsetWidth;
				if (w < baseWidth) break;
				objs.push(y);
			}
		}

		let height = (objs.length-1) * minMargin;
		// 元の処理のとおり、どの回でも dom の高さを足し、dom に余白を付ける（並んだ要素 o ではない）
		for(const o of objs) {
			height += dom.offsetHeight;
			dom.style.marginTop     = minMargin + 'px';
			dom.style.marginBottom  = minMargin + 'px';
			dom.style.verticalAlign = 'middle';
		}

		const mul  = Math.ceil( (height + minMargin*2) /line_h );
		if (mul < 2) return;
		const diff = line_h * mul - height;

		const m = (diff/2) + 'px';
		objs[0]            .style.marginTop    = m;
		objs[objs.length-1].style.marginBottom = m;
	}

	const observer = new MutationObserver(function(list){
		const targets = [];
		for(const x of list) {
			const tar = x.target.closest && x.target.closest(TARGET);
			if (!tar) continue;

			let f;
			for(const y of targets) {
				if (tar.isEqualNode(y)) { f=true; break; }
			}
			if (f) continue;
			targets.push(tar);
		}

		for(const dom of targets) {
			alian_lineheight(dom)
		}
	});

	for(const dom of document.querySelectorAll(TARGET)) {
		alian_lineheight(dom);

		observer.observe(dom, { childList: true, subtree: true });
	}

	document.querySelectorAll('.main div.body-main img, .main div.body-main iframe').forEach(function(x) {
		x.addEventListener('load', evt => {
			let dom = evt.target;
			if (dom.tagName === 'IMG') {
				const fig = dom.closest('figure');
				if (!fig) return;
				dom = fig;
			}
			// console.log('load', dom);
			alian_lineheight(dom);
		});
	});
});
