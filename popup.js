let isHighlighting = false;
let selectedColor = 'yellow';

document.getElementById('toggleHighlighter').addEventListener('change', (event) => {
  isHighlighting = event.target.checked;
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_HIGHLIGHTING', isHighlighting, color: selectedColor });
  });
});

document.getElementById('highlightColor').addEventListener('change', (event) => {
  selectedColor = event.target.value;
  if (isHighlighting) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_HIGHLIGHTING', isHighlighting, color: selectedColor });
    });
  }
});

document.getElementById('exportPDF').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: exportPageAsPDF
    });
  });
});

document.getElementById('saveHighlights').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SAVE_HIGHLIGHTS_AND_NOTES', url: tabs[0].url });
  });
});

function displayNotes(url) {
  chrome.storage.local.get([url], data => {
    const notesData = data[url] || { notes: {}, highlights: [] };
    const notes = notesData.notes;
    const colors = ['yellow', 'red', 'blue', 'green'];
    let notesExist = false;

    colors.forEach(color => {
      const noteList = document.getElementById(`${color}Notes`).querySelector('ul');
      noteList.innerHTML = '';
      if (notes[color] && notes[color].length > 0) {
        notesExist = true;
        notes[color].forEach(note => {
          const noteElement = document.createElement('li');
          noteElement.textContent = note.text;
          noteList.appendChild(noteElement);
        });
      }
    });

    document.getElementById('noNotes').style.display = notesExist ? 'none' : 'block';
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
  const url = tabs[0].url;
  displayNotes(url);
});

function exportPageAsPDF() {
  html2canvas(document.body).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = canvas.height * imgWidth / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('annotated_page.pdf'); // This line triggers the file save dialog
  });
}

function setHighlighting(isHighlighting, color) {
  chrome.runtime.sendMessage({ type: 'SET_HIGHLIGHTING', isHighlighting, color });
}
