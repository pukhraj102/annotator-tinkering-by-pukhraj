let highlightedElements = [];
let notes = {};
let isHighlighting = false;
let selectedColor = 'yellow';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_HIGHLIGHTING') {
    isHighlighting = message.isHighlighting;
    selectedColor = message.color;
  }
  if (message.type === 'SAVE_HIGHLIGHTS_AND_NOTES') {
    saveHighlightsAndNotes(message.url);
  }
});

document.addEventListener('mouseup', () => {
  if (isHighlighting) {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      const range = window.getSelection().getRangeAt(0);
      const span = document.createElement('span');
      span.style.backgroundColor = selectedColor;
      span.classList.add('highlighted');
      range.surroundContents(span);
      highlightedElements.push(span);

      const note = prompt('Add a note for this highlight:', '');
      if (note) {
        if (!notes[selectedColor]) {
          notes[selectedColor] = [];
        }
        notes[selectedColor].push({ text: note, xpath: getXPathForElement(span) });
        span.setAttribute('data-note', note);
        span.classList.add('note-hover');
      }
    }
  }
});

document.addEventListener('dblclick', (event) => {
  if (event.target.classList.contains('highlighted')) {
    const xpath = getXPathForElement(event.target);
    const color = event.target.style.backgroundColor;
    if (confirm('Remove this highlight?')) {
      event.target.style.backgroundColor = '';
      event.target.classList.remove('highlighted');
      notes[color] = notes[color].filter(note => note.xpath !== xpath);
    } else {
      const newNote = prompt('Update the note:', event.target.getAttribute('data-note'));
      if (newNote) {
        notes[color] = notes[color].map(note => note.xpath === xpath ? { ...note, text: newNote } : note);
        event.target.setAttribute('data-note', newNote);
      }
    }
  }
});

function saveHighlightsAndNotes(url) {
  chrome.storage.local.get([url], data => {
    const existingData = data[url] || { notes: {}, highlights: [] };
    existingData.notes = notes;
    existingData.highlights = highlightedElements.map(element => ({
      text: element.textContent,
      xpath: getXPathForElement(element),
      color: element.style.backgroundColor
    }));
    chrome.storage.local.set({ [url]: existingData });
  });
}

function getXPathForElement(element) {
  const idx = (sib, name) => sib ? idx(sib.previousElementSibling, name || sib.localName) + (sib.localName == name) : 1;
  const segs = el => !el || el.nodeType !== 1 ? [''] : el.id && document.getElementById(el.id) === el ? [`id("${el.id}")`] : [...segs(el.parentNode), el.className ? `${el.localName}[class="${el.className}"]` : `${el.localName}[${idx(el)}]`];
  return segs(element).join('/');
}

function highlightFromXPath(xpath, color) {
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  const node = result.singleNodeValue;
  if (node) {
    node.style.backgroundColor = color;
    node.classList.add('highlighted');
    highlightedElements.push(node);
  }
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const url = tabs[0].url;
  chrome.storage.local.get([url], data => {
    const notesData = data[url] || { notes: {}, highlights: [] };
    notes = notesData.notes || {};
    notesData.highlights.forEach(item => {
      highlightFromXPath(item.xpath, item.color);
    });
  });
});

// CSS for hovering note
const style = document.createElement('style');
style.innerHTML = `
  .note-hover {
    position: relative;
  }
  .note-hover:hover::after {
    content: attr(data-note);
    position: absolute;
    background-color: #fff;
    border: 1px solid #ccc;
    padding: 5px;
    color: #000;
    top: 100%;
    left: 0;
    white-space: pre-wrap;
    z-index: 10;
  }
`;
document.head.appendChild(style);

// Add keyboard shortcut for enabling/disabling the highlighter. Currently it was set to alt+H. If it conflict with already exsisting shortcut of your browser change it here.
document.addEventListener('keydown', (event) => {
  if (event.altKey && event.key === 'h') {
    isHighlighting = !isHighlighting;
    chrome.runtime.sendMessage({ type: 'SET_HIGHLIGHTING', isHighlighting, color: selectedColor });
  }
});
