// restore.js - Handles backup JSON upload and restore

document.getElementById('restoreForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const fileInput = document.getElementById('backupFile');
  const statusDiv = document.getElementById('restoreStatus');
  statusDiv.textContent = '';
  try {
    const res = await fetch('/api/admin/data/restore-all', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    const contentType = res.headers.get('content-type') || '';
    let result = {};
    if (contentType.includes('application/json')) {
      result = await res.json();
    } else {
      // If not JSON, treat as error
      statusDiv.textContent = 'Restore failed: Server did not return JSON.';
      return;
    }
    if (res.ok && result.ok) {
      statusDiv.textContent = 'Restore successful! Site data has been replaced.';
    } else {
      statusDiv.textContent = 'Restore failed: ' + (result.error || 'Unknown error');
    }
  } catch (err) {
    statusDiv.textContent = 'Restore failed: ' + err.message;
  }
      credentials: 'include'
    });
    const result = await res.json();
    if (res.ok && result.ok) {
      statusDiv.textContent = 'Restore successful! Site data has been replaced.';
    } else {
      statusDiv.textContent = 'Restore failed: ' + (result.error || 'Unknown error');
    }
  } catch (err) {
    statusDiv.textContent = 'Restore failed: ' + err.message;
  }
});
