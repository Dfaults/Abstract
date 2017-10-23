const showdown  = require('showdown');
const mathjax = require('mathjax-node');
const replaceAsync = require('string-replace-async');
const path = require('path');

/** Setup MathJax */
let dirname = __dirname;
if (process.platform === 'win32') dirname = "/"+__dirname.replace(/\\/g, '/');

mathjax.config({
	fontURL: 'file://'+dirname+'/lib/fonts/HTML-CSS'
});
mathjax.start();

/** Setup parser */
showdown.extension('maths', function() {
	var matches = [];
	return [
		{
			type: 'lang',
			regex: /===([^]+?)===/gi,
			replace: function(s, match) {
				matches.push('===' + match + '===');
				var n = matches.length - 1;
				return '%ASCIIMATHPLACEHOLDER1' + n + 'ENDASCIIMATHPLACEHOLDER1%';
			}
		},
		{
			type: 'output',
			filter: function(text) {
				for (var i = 0; i < matches.length; ++i) {
					var pat = '%ASCIIMATHPLACEHOLDER1' + i + 'ENDASCIIMATHPLACEHOLDER1%';
					text = text.replace(new RegExp(pat, 'gi'), matches[i]);
				}
				//reset array
				matches = [];
				return text;
			}
		}
	]
});

showdown.extension('tex-maths', function() {
	var matches = [];
	return [
		{
			type: 'lang',
			regex: /;;([^]+?);;/gi,
			replace: function(s, match) {
				matches.push(';;' + match + ';;');
				var n = matches.length - 1;
				return '%TEXPLACEHOLDER1' + n + 'ENDTEXPLACEHOLDER1%';
			}
		},
		{
			type: 'output',
			filter: function(text) {
				for (var i = 0; i < matches.length; ++i) {
					var pat = '%TEXPLACEHOLDER1' + i + 'ENDTEXPLACEHOLDER1%';
					text = text.replace(new RegExp(pat, 'gi'), matches[i]);
				}
				//reset array
				matches = [];
				return text;
			}
		}
	]
});

showdown.extension('graphs', function() {
	var matches = [];
	return [
		{
			type: 'lang',
			regex: /=-=([^]+?)=-=/gi,
			replace: function(s, match) {
				matches.push("<embed width='400' height='400' src='"+__dirname+"/d.svg' script='{0}'></embed>".format(match));
				var n = matches.length - 1;
				return '%PLACEHOLDER2' + n + 'ENDPLACEHOLDER2%';
			}
		},
		{
			type: 'output',
			filter: function(text) {
				for (var i = 0; i < matches.length; ++i) {
					var pat = '%PLACEHOLDER2' + i + 'ENDPLACEHOLDER2%';
					text = text.replace(new RegExp(pat, 'gi'), matches[i]);
				}
				//reset array
				matches = [];
				return text;
			}
		}
	]
});

showdown.extension('quick-maths', function() {
	var matches = [];
	return [
		{
			type: 'lang',
			regex: /''([^]+?)''/gi,
			replace: function(s, match) {
				matches.push('==={0}==='.format(match));
				var n = matches.length - 1;
				return '%PLACEHOLDER4' + n + 'ENDPLACEHOLDER4%';
			}
		},
		{
			type: 'output',
			filter: function(text) {
				for (var i = 0; i < matches.length; ++i) {
					var pat = '%PLACEHOLDER4' + i + 'ENDPLACEHOLDER4%';
					text = text.replace(new RegExp(pat, 'gi'), matches[i]);
				}
				//reset array
				matches = [];
				return text;
			}
		}
	]
});

const converter = new showdown.Converter({
	parseImgDimensions: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tables: true,
	tasklists: true,
	extensions: ['maths', 'tex-maths', 'graphs', 'quick-maths']
});

exports.getHtml = function(md, extraHtml, css, js) {
	return new Promise((resolve, reject) => {
		extraHtml = (extraHtml) ? extraHtml : "";
		let html = '<meta charset="UTF-8"><style>'+css+'</style>'+extraHtml+converter.makeHtml(md);

		//Parse TeX
		replaceAsync(html, /;;([^]+?);;/gi, (match, str) => {
			return new Promise((resolve, reject) => {
				mathjax.typeset({
					math: str,
					format: "inline-TeX",
					html: true,
					css: true
				}, data => {
					resolve('<style>{0}</style>{1}'.format(data.css, data.html));
				});
			});
		}).then(html => {
			//Parse ASCIIMath
			replaceAsync(html, /===([^]+?)===/gi, (match, str) => {
				return new Promise((resolve, reject) => {
					mathjax.typeset({
						math: str,
						format: "AsciiMath",
						html: true,
						css: true
					}, data => {
						resolve('<style>{0}</style>{1}'.format(data.css, data.html));
					});
				});
			}).then(html => {
				//Parse page breaks
				html = html.replace(/\+-\+-/g, '<p style="page-break-before: always;">&nbsp;</p>');

				//Return compiled html
				resolve(html+'<script>'+js+'</script>');
			});
		});
	});
}

//Thanks to http://stackoverflow.com/a/4673436/998467
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined'
				? args[number]
				: match
			;
		});
	};
}
