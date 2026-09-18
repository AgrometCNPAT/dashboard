const fs = require('fs');
const path = require('path');

const tplPath = path.join(__dirname, 'index.template.html');
const commonPath = path.join(__dirname, 'js', 'react', 'common.jsx');
const sectionsPath = path.join(__dirname, 'js', 'react', 'sections.jsx');
const appPath = path.join(__dirname, 'js', 'react', 'App.jsx');
const outPath = path.join(__dirname, 'index.html');

const tpl = fs.readFileSync(tplPath, 'utf8');
const common = fs.readFileSync(commonPath, 'utf8');
const sections = fs.readFileSync(sectionsPath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

const result = tpl
  .replace('__COMMON_JSX__', common)
  .replace('__SECTIONS_JSX__', sections)
  .replace('__APP_JSX__', app);

fs.writeFileSync(outPath, result, 'utf8');
console.log('Successfully compiled index.html (' + result.length + ' bytes)');
