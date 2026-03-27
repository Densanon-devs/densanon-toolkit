/* Audio Stripper — extract audio from video files entirely in the browser */

(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  const fileInfo = $('#file-info');
  const controls = $('#controls');
  const stripBtn = $('#strip-btn');
  const progressWrap = $('#progress-wrap');
  const progressBar = $('#progress-bar');
  const progressText = $('#progress-text');
  const resultSection = $('#result-section');
  const audioPreview = $('#audio-preview');
  const downloadBtn = $('#download-btn');
  const resetBtn = $('#reset-btn');
  const formatSelect = $('#format-select');
  const channelSelect = $('#channel-select');
  const errorBox = $('#error-box');

  let currentFile = null;
  let audioBuffer = null;

  /* ── Drag & drop ──────────────────────────────────────────── */

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  /* ── File handling ────────────────────────────────────────── */

  function handleFile(file) {
    hideError();
    const videoTypes = [
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      'video/x-msvideo', 'video/x-matroska', 'video/mpeg',
      'video/3gpp', 'video/3gpp2', 'video/x-m4v'
    ];
    const ext = file.name.split('.').pop().toLowerCase();
    const videoExts = ['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'mkv', 'mpeg', 'mpg', '3gp', 'm4v', 'flv', 'wmv'];

    if (!videoTypes.includes(file.type) && !videoExts.includes(ext)) {
      showError('Please select a video file (MP4, WebM, MOV, AVI, MKV, etc.).');
      return;
    }

    currentFile = file;
    audioBuffer = null;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    $('#info-name').textContent = file.name;
    $('#info-size').textContent = sizeMB + ' MB';
    $('#info-type').textContent = file.type || ext.toUpperCase();

    // Get duration via video element
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const dur = video.duration;
      $('#info-duration').textContent = isFinite(dur) ? formatTime(dur) : 'Unknown';
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      $('#info-duration').textContent = 'Unknown';
      URL.revokeObjectURL(url);
    };
    video.src = url;

    dropZone.style.display = 'none';
    fileInfo.style.display = 'block';
    controls.style.display = 'block';
    resultSection.style.display = 'none';
    progressWrap.style.display = 'none';
  }

  /* ── Strip audio ──────────────────────────────────────────── */

  stripBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    hideError();

    stripBtn.disabled = true;
    progressWrap.style.display = 'block';
    resultSection.style.display = 'none';
    setProgress(10, 'Reading file...');

    try {
      const arrayBuf = await readFileAsArrayBuffer(currentFile);
      setProgress(30, 'Decoding audio...');

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await ctx.decodeAudioData(arrayBuf);
      ctx.close();

      setProgress(60, 'Encoding audio...');

      const format = formatSelect.value;
      const channels = channelSelect.value;
      const processedBuffer = channels === 'mono' ? mixToMono(audioBuffer) : audioBuffer;

      let blob;
      let extension;

      if (format === 'wav') {
        blob = audioBufferToWav(processedBuffer);
        extension = 'wav';
      } else {
        blob = await audioBufferToOgg(processedBuffer);
        extension = 'ogg';
      }

      setProgress(100, 'Done!');

      const resultUrl = URL.createObjectURL(blob);
      audioPreview.src = resultUrl;

      const baseName = currentFile.name.replace(/\.[^.]+$/, '');
      downloadBtn.href = resultUrl;
      downloadBtn.download = baseName + '.' + extension;

      const outSize = (blob.size / (1024 * 1024)).toFixed(2);
      $('#result-size').textContent = outSize + ' MB';
      $('#result-format').textContent = extension.toUpperCase();
      $('#result-duration').textContent = formatTime(processedBuffer.duration || audioBuffer.duration);
      $('#result-channels').textContent = (processedBuffer.numberOfChannels || audioBuffer.numberOfChannels) === 1 ? 'Mono' : 'Stereo';

      resultSection.style.display = 'block';
    } catch (err) {
      console.error(err);
      showError('Could not decode audio from this file. Your browser may not support this video format. Try MP4 or WebM.');
    }

    stripBtn.disabled = false;
  });

  /* ── Reset ────────────────────────────────────────────────── */

  resetBtn.addEventListener('click', () => {
    currentFile = null;
    audioBuffer = null;
    fileInput.value = '';
    dropZone.style.display = 'flex';
    fileInfo.style.display = 'none';
    controls.style.display = 'none';
    resultSection.style.display = 'none';
    progressWrap.style.display = 'none';
    audioPreview.src = '';
    hideError();
  });

  /* ── WAV encoder ──────────────────────────────────────────── */

  function audioBufferToWav(buffer) {
    const numCh = buffer.numberOfChannels;
    const rate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numCh * bytesPerSample;
    const length = buffer.length * numCh;
    const dataSize = length * bytesPerSample;
    const headerSize = 44;
    const ab = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(ab);

    writeStr(view, 0, 'RIFF');
    view.setUint32(4, headerSize + dataSize - 8, true);
    writeStr(view, 8, 'WAVE');
    writeStr(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeStr(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        let s = buffer.getChannelData(ch)[i];
        s = Math.max(-1, Math.min(1, s));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([ab], { type: 'audio/wav' });
  }

  function writeStr(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /* ── OGG/WebM encoder via MediaRecorder ───────────────────── */

  function audioBufferToOgg(buffer) {
    return new Promise((resolve, reject) => {
      const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);
      source.start(0);

      let mimeType = 'audio/ogg; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm; codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
        }
      }

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = e => reject(e.error || new Error('Recording failed'));

      recorder.start();

      // Use OfflineAudioContext to render, but MediaRecorder needs real-time stream.
      // We'll use a regular AudioContext with a MediaStreamDestination instead.
      recorder.stop();
      ctx.startRendering().catch(() => {});

      // Fallback: re-do with real AudioContext approach
      reject(new Error('use-realtime'));
    }).catch(err => {
      if (err.message !== 'use-realtime') throw err;
      return audioBufferToOggRealtime(buffer);
    });
  }

  function audioBufferToOggRealtime(buffer) {
    return new Promise((resolve, reject) => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const dest = ctx.createMediaStreamDestination();
      source.connect(dest);

      let mimeType = 'audio/ogg; codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm; codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
        }
      }

      const recorder = new MediaRecorder(dest.stream, { mimeType });
      const chunks = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        ctx.close();
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.onerror = e => {
        ctx.close();
        reject(e.error || new Error('Recording failed'));
      };

      recorder.start();
      source.start(0);

      source.onended = () => {
        setTimeout(() => recorder.stop(), 100);
      };

      // Safety timeout
      const timeout = (buffer.duration + 2) * 1000;
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, timeout);
    });
  }

  /* ── Mono mixdown ─────────────────────────────────────────── */

  function mixToMono(buffer) {
    if (buffer.numberOfChannels === 1) return buffer;
    const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    // OfflineAudioContext.startRendering is async, but we need sync result.
    // Create mono buffer manually instead.
    const mono = new AudioBuffer({
      numberOfChannels: 1,
      length: buffer.length,
      sampleRate: buffer.sampleRate
    });
    const monoData = mono.getChannelData(0);
    const numCh = buffer.numberOfChannels;
    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (let ch = 0; ch < numCh; ch++) {
        sum += buffer.getChannelData(ch)[i];
      }
      monoData[i] = sum / numCh;
    }
    return mono;
  }

  /* ── Helpers ──────────────────────────────────────────────── */

  function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function setProgress(pct, text) {
    progressBar.style.width = pct + '%';
    progressText.textContent = text;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function hideError() {
    errorBox.style.display = 'none';
  }
})();
