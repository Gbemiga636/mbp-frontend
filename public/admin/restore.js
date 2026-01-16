// restore.js - Handles backup JSON upload and restore

document.getElementById('restoreForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fileInput = document.getElementById('backupFile');
  const statusDiv = document.getElementById('restoreStatus');
  statusDiv.textContent = '';

  if (!fileInput.files.length) {
    statusDiv.textContent = 'Please select a backup JSON file.';
    return;
  }

  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('backup', file);

  try {
    const res = await fetch('/api/admin/data/restore-all', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const result = await res.json();
    if (res.ok && result.success) {
      statusDiv.textContent = 'Restore successful! Site data has been replaced.';
    } else {
      statusDiv.textContent = 'Restore failed: ' + (result.error || 'Unknown error');
    }
  } catch (err) {
    statusDiv.textContent = 'Restore failed: ' + err.message;
  }
});
