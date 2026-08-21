const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const metadata = packageJson.userscript;
const version = packageJson.version;
const outputFile = path.resolve(__dirname, '../dist/linux-sb-enhance.user.js');
const bundledJsFile = path.resolve(__dirname, '../dist/bundle.js');

let metadataBlock = '// ==UserScript==\n';
metadataBlock += `// @name         ${metadata.name}\n`;
metadataBlock += `// @namespace    ${metadata.namespace}\n`;
metadataBlock += `// @version      ${version}\n`;
metadataBlock += `// @description  ${metadata.description}\n`;
metadataBlock += `// @author       ${metadata.author}\n`;

if (metadata.match && Array.isArray(metadata.match)) {
    metadata.match.forEach(item => {
        metadataBlock += `// @match        ${item}\n`;
    });
}

if (metadata.grant && Array.isArray(metadata.grant)) {
    metadata.grant.forEach(item => {
        metadataBlock += `// @grant        ${item}\n`;
    });
}

if (metadata.connect && Array.isArray(metadata.connect)) {
    metadata.connect.forEach(item => {
        metadataBlock += `// @connect      ${item}\n`;
    });
}

if (metadata['run-at']) {
    metadataBlock += `// @run-at       ${metadata['run-at']}\n`;
}

if (metadata.license) {
    metadataBlock += `// @license      ${metadata.license}\n`;
}

if (metadata.downloadURL) {
    metadataBlock += `// @downloadURL ${metadata.downloadURL}\n`;
}

if (metadata.updateURL) {
    metadataBlock += `// @updateURL ${metadata.updateURL}\n`;
}

metadataBlock += '// ==/UserScript==\n';

// 读取捆绑的 JS 文件内容
const bundledJsContent = fs.readFileSync(bundledJsFile, 'utf8');

// 将元数据和捆绑的 JS 内容写入最终的油猴脚本文件
fs.writeFileSync(outputFile, metadataBlock + bundledJsContent);

console.log('Tampermonkey script generated successfully!');
