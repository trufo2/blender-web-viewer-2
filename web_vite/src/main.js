import './style.css';
import { REVISION as THREE_REVISION } from 'three';
import { setupViewer } from './viewer/scene.js';

const showFileProtocolWarning = () => {
  if (document.getElementById('file-protocol-warning')) {
    return;
  }

  const warningDiv = document.createElement('div');
  warningDiv.id = 'file-protocol-warning';
  warningDiv.style.position = 'fixed';
  warningDiv.style.top = '0';
  warningDiv.style.left = '0';
  warningDiv.style.width = '100%';
  warningDiv.style.padding = '10px';
  warningDiv.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
  warningDiv.style.color = '#ffffff';
  warningDiv.style.textAlign = 'center';
  warningDiv.style.zIndex = '9999';
  warningDiv.innerHTML = [
    'This 3D viewer may not work when opened directly from your computer.',
    'For best results:',
    '1) Use a local web server (e.g. Vite, VS Code Live Server)',
    '2) Or upload the exported files to web hosting.',
  ].join('<br>');
  document.body.appendChild(warningDiv);
};

const addThreeVersionBadge = () => {
  const badge = document.getElementById('toggle-controls');
  if (!badge) {
    return;
  }

  if (badge.dataset.initialized === 'true') {
    return;
  }

  const revision = THREE_REVISION ?? 'unknown';
  badge.innerHTML = `
    <span>three.js</span>
    <strong>r${revision}</strong>
  `;
  badge.dataset.initialized = 'true';
};

const initialize = async () => {
  if (window.location.protocol === 'file:') {
    showFileProtocolWarning();
  }

  try {
    await setupViewer();
    addThreeVersionBadge();
  } catch (error) {
    console.error('Viewer initialization failed:', error);
  }
};

window.addEventListener('load', initialize);
