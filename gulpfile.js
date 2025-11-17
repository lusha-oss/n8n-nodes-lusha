const { src, dest } = require('gulp');

function buildIcons() {
	// Copy all SVG and PNG files from nodes directory to dist
	// This ensures the logo appears correctly in n8n
	return src('nodes/**/*.{svg,png,jpg,jpeg,gif,ico}')
		.pipe(dest('dist/nodes/'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;