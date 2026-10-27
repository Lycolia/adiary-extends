//##############################################################################
// 記事ヘッダ加工用
//							(C)2015 nabe@abk
//##############################################################################
//[TAB=8]
'use strict';

(function(func) {
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', func);
	else func();
})(function() {
	document.querySelectorAll('#main-first article.article').forEach(function(art){
		const h2   = art.querySelector('h2');
		const head = art.querySelector('div.body-header');
		if (h2 && head) {
			const date = h2.querySelector('a.date');
			if (date) h2.appendChild(date);
			h2.appendChild(head);
		}
		const bookmark = h2 && h2.querySelector('a.http-bookmark');
		if (bookmark) {
			h2.appendChild(bookmark);
		}
	});
});
