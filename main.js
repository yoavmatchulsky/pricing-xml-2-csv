import { Parser } from 'https://cdn.skypack.dev/saxen';

const csvHeaderRow = ['Price Book ID,Currency,Product Id,Amount'];
const $fileInput = document.getElementById('file');
const $dropzone = document.getElementById("dropzone");
let handling = false;

if (!$fileInput || !$dropzone) {
  throw new Error('Missing file input or dropzone element');
}

async function readFile($file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsText($file);
  });
}

function isEmpty(text) {
  return text.trim().length === 0;
}

async function parse(fileContent) {
  let row, currentTag;
  let baseRow = {};
  const rows = [];

  const parser = new Parser();
  parser.on('openTag', (name, attrFn) => {
    const attrs = attrFn();
    switch(name) {
      case 'header':
        baseRow.priceBookId = attrs['pricebook-id'];
        break;
      case 'currency':
        currentTag = 'currency';
        break;
      case 'price-table':
        currentTag = 'priceTable';
        row = {
          ...baseRow,
          productId: attrs['product-id'],
        }
        break;
      case 'amount':
        currentTag = 'amount';
        break;
      default:
        break;
    }
  });
  parser.on('text', (text) => {
    if (isEmpty(text)) return;
    switch (currentTag) {
      case 'currency':
        baseRow.currency = text;
        break;
      case 'amount':
        row.amount = text;
        rows.push(row);
        break;
      default:
        break;
    }
  });
  parser.on('closeTag', (name) => {
    if (currentTag === 'currency') {
      currentTag = null;
    }
  });
  parser.parse(fileContent);
  return rows;
}

function createCsv(rows) {
  const ROW_SEPARATOR = '\n';
  const FIELD_SEPARATOR = ',';
  const rowsAsStrings = rows.map(row => Object.values(row).join(FIELD_SEPARATOR));
  return [csvHeaderRow.join(FIELD_SEPARATOR), ...rowsAsStrings].join(ROW_SEPARATOR);
}

function downloadCsv(content, fileName) {
  const el = document.createElement('a');
  el.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`)
  el.setAttribute('download', fileName || 'output.csv');
  el.style.display = 'none';

  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);    
}

async function handleFile($file) {
  if (handling) return;

  try {
    setHandling(true);
    const fileContent = await readFile($file);
    const fileName = $file.name.replace(/\.xml$/, '.csv')
  
    const rows = await parse(fileContent);
    const csvContent = createCsv(rows);
    downloadCsv(csvContent, fileName);
  } catch(e) {
    console.error('Error trying to handle file:', e);
    alert('Error transforming file.');
  } finally {
    setHandling(false);
  }
}

function stopEvent(e) {
  e.stopPropagation();
  e.preventDefault();
}

function drop(e) {
  stopEvent(e);

  const files = e.dataTransfer.files;
  if (!files.length) return;
  if (files[0].type !== 'text/xml') {
    alert('Invalid file type. Please provide an XML file.');
    return;
  }

  handleFile(files[0]);
}

function setHandling(state) {
  handling = state;
  $dropzone.classList.toggle('handling', state);
}

$fileInput.addEventListener('change', async (e) => {
  const $file = e.target.files[0];
  handleFile($file);
});

$dropzone.addEventListener("dragenter", stopEvent, false);
$dropzone.addEventListener("dragover", stopEvent, false);
$dropzone.addEventListener("drop", drop, false);
$dropzone.addEventListener('click', () => $fileInput.click());
