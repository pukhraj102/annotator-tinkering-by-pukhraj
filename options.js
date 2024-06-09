document.getElementById('saveOptions').addEventListener('click', () => {
    const bgColor = document.getElementById('bgColor').value;
    chrome.storage.sync.set({ bgColor }, () => {
      console.log('Options saved.');
    });
  });
  
  chrome.storage.sync.get(['bgColor'], data => {
    document.getElementById('bgColor').value = data.bgColor || '#FFFF00';
  });
  