const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');

const inverterStartStr = '{/* Inverter Specs & OCR */}';
const moduleStartStr = '{/* Module Specs with Database Search */}';
const siteStartStr = '{/* Site Conditions */}';
const projectStartStr = '{/* PROJECT DETAILS SECTION */}';

const inverterStart = content.indexOf(inverterStartStr);
const moduleStart = content.indexOf(moduleStartStr);
const siteStart = content.indexOf(siteStartStr);
const projectStart = content.indexOf(projectStartStr);
const endOfProject = content.indexOf('</motion.section>', projectStart) + '</motion.section>'.length;

const before = content.substring(0, inverterStart);
const inverter = content.substring(inverterStart, moduleStart);
const moduleStr = content.substring(moduleStart, siteStart);
const site = content.substring(siteStart, projectStart);
const project = content.substring(projectStart, endOfProject);
const after = content.substring(endOfProject);

const adjustDelay = (block, newDelay) => {
    return block.replace(/transition=\{\{\s*delay:\s*0\.\d+\s*\}\}/g, `transition={{ delay: ${newDelay} }}`);
};

const projectAdjusted = adjustDelay(project, '0.1');
const inverterAdjusted = adjustDelay(inverter, '0.15');
let siteAdjusted = adjustDelay(site, '0.2').replace('Condições Locais', '03 Condições Locais');
let moduleAdjusted = adjustDelay(moduleStr, '0.25');

if (!moduleAdjusted.includes('transition={{ delay: 0.25 }}')) {
    moduleAdjusted = moduleAdjusted.replace('animate={{ opacity: 1, y: 0 }}', 'animate={{ opacity: 1, y: 0 }}\n              transition={{ delay: 0.25 }}');
}

const newContent = before + projectAdjusted + '\n\n            ' + inverterAdjusted + siteAdjusted + moduleAdjusted + after;

fs.writeFileSync('src/App.tsx', newContent);
console.log("Reordered successfully");
