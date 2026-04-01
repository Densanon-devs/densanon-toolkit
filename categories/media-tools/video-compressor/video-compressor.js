(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const fileInput = $('#file-input');
  const dropZone = $('#drop-zone');
  const fileInfo = $('#file-info');
  const controls = $('#controls');
  const compressBtn = $('#compress-btn');
  const resetBtn = $('#reset-btn');
  const progressWrap = $('#progress-wrap');
  const progressBar = $('#progress-bar');
  const progressText = $('#progress-text');
  const resultSection = $('#result-section');
  const errorBox = $('#error-box');
  const qualitySlider = $('#quality-slider');
  const qualityValue = $('#quality-value');
  const estSize = $('#est-size');
  const resolutionSelect = $('#resolution-select');
  const formatSelect = $('#format-select');
  const audioSelect = $('#audio-select');
  const speedSelect = $('#speed-select');

  let sourceFile = null;
  let sourceVideo = null;
  let sourceDuration = 0;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let resultBlobUrl = null;

  // ── Format sizes ──
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  function fmtDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  // ── Resolution map ──
  const RES_MAP = {
    '1080': { w: 1920, h: 1080 },
    '720': { w: 1280, h: 720 },
    '480': { w: 854, h: 480 },
    '360': { w: 640, h: 360 }
  };

  function getTargetDimensions() {
    const val = resolutionSelect.value;
    if (val === 'original') return { w: sourceWidth, h: sourceHeight };
    const target = RES_MAP[val];
    // Maintain aspect ratio — fit within target box
    const srcAspect = sourceWidth / sourceHeight;
    let w, h;
    if (srcAspect >= target.w / target.h) {
      w = Math.min(sourceWidth, target.w);
      h = Math.round(w / srcAspect);
    } else {
      h = Math.min(sourceHeight, target.h);
      w = Math.round(h * srcAspect);
    }
    // Ensure even dimensions for encoding
    w = w % 2 === 0 ? w : w - 1;
    h = h % 2 === 0 ? h : h - 1;
    return { w, h };
  }

  // ── Estimate output size ──
  function updateEstimate() {
    if (!sourceDuration) return;
    const bitrateMbps = parseFloat(qualitySlider.value);
    const includeAudio = audioSelect.value === 'include';
    const audioBitrate = includeAudio ? 128000 : 0; // ~128kbps audio
    const totalBitsPerSec = bitrateMbps * 1000000 + audioBitrate;
    const estBytes = (totalBitsPerSec * sourceDuration) / 8;
    estSize.textContent = 'Estimated output: ~' + fmtSize(estBytes);
  }

  // ── Quality slider ──
  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value + ' Mbps';
    updateEstimate();
  });

  audioSelect.addEventListener('change', updateEstimate);

  // ── Drop zone ──
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });

  // ── Load file ──
  function loadFile(file) {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|avi|mkv|ogv|mpeg|mpg|3gp|m4v)$/i)) {
      showError('Please select a video file.');
      return;
    }

    sourceFile = file;
    hideError();
    hideResult();

    // Create video element to read metadata
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', () => {
      sourceWidth = video.videoWidth;
      sourceHeight = video.videoHeight;
      sourceDuration = video.duration;
      sourceVideo = video;

      $('#info-name').textContent = file.name;
      $('#info-size').textContent = fmtSize(file.size);
      $('#info-type').textContent = file.type || 'unknown';
      $('#info-duration').textContent = fmtDuration(sourceDuration);
      $('#info-resolution').textContent = sourceWidth + ' x ' + sourceHeight;

      // Auto-select resolution
      if (sourceHeight <= 480) {
        resolutionSelect.value = 'original';
      } else if (sourceHeight <= 720) {
        resolutionSelect.value = '480';
      } else if (sourceHeight <= 1080) {
        resolutionSelect.value = '720';
      } else {
        resolutionSelect.value = '1080';
      }

      dropZone.style.display = 'none';
      fileInfo.style.display = 'block';
      controls.style.display = 'block';

      updateEstimate();
    });

    video.addEventListener('error', () => {
      showError('Could not read this video file. Your browser may not support this format.');
      URL.revokeObjectURL(url);
    });

    video.src = url;
  }

  // ── Reset ──
  resetBtn.addEventListener('click', () => {
    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    if (sourceVideo) URL.revokeObjectURL(sourceVideo.src);
    sourceFile = null;
    sourceVideo = null;
    sourceDuration = 0;
    sourceWidth = 0;
    sourceHeight = 0;
    resultBlobUrl = null;

    fileInput.value = '';
    dropZone.style.display = '';
    fileInfo.style.display = 'none';
    controls.style.display = 'none';
    progressWrap.style.display = 'none';
    hideResult();
    hideError();
    compressBtn.disabled = false;
  });

  // ── Error helpers ──
  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }

  function hideError() {
    errorBox.style.display = 'none';
  }

  function hideResult() {
    resultSection.style.display = 'none';
  }

  // ── Compress ──
  compressBtn.addEventListener('click', () => {
    if (!sourceFile || !sourceVideo) return;
    compressBtn.disabled = true;
    hideError();
    hideResult();
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = 'Preparing...';

    compress().catch((err) => {
      showError('Compression failed: ' + (err.message || err));
      progressWrap.style.display = 'none';
      compressBtn.disabled = false;
    });
  });

  async function compress() {
    const dim = getTargetDimensions();
    const bitrate = parseFloat(qualitySlider.value) * 1000000;
    const includeAudio = audioSelect.value === 'include';
    const format = formatSelect.value;
    const fastMode = speedSelect.value === 'fast';

    // Choose MIME type
    let mimeType, ext;
    if (format === 'mp4') {
      // Try H.264 first
      const mp4Types = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4'
      ];
      mimeType = mp4Types.find(t => MediaRecorder.isTypeSupported(t));
      if (!mimeType) {
        // Fallback to WebM
        mimeType = 'video/webm;codecs=vp8,vorbis';
        ext = 'webm';
        showError('MP4 encoding not supported by this browser. Falling back to WebM.');
      } else {
        ext = 'mp4';
      }
    } else {
      const webmTypes = [
        'video/webm;codecs=vp8,vorbis',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      mimeType = webmTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      ext = 'webm';
    }

    // Canvas setup
    const canvas = document.createElement('canvas');
    canvas.width = dim.w;
    canvas.height = dim.h;
    const ctx = canvas.getContext('2d');

    // Playback video for capture
    const video = sourceVideo;
    video.currentTime = 0;
    video.muted = !includeAudio;
    video.playbackRate = fastMode ? 2 : 1;

    await new Promise((resolve, reject) => {
      video.addEventListener('seeked', resolve, { once: true });
      video.addEventListener('error', reject, { once: true });
      video.currentTime = 0;
    });

    // Capture stream from canvas
    const fps = fastMode ? 30 : 30;
    const canvasStream = canvas.captureStream(fps);

    // Add audio track if needed
    let combinedStream;
    if (includeAudio) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination); // keep audible for sync
        const audioTrack = dest.stream.getAudioTracks()[0];
        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          audioTrack
        ]);
      } catch (e) {
        // Audio extraction failed, continue without
        combinedStream = canvasStream;
      }
    } else {
      combinedStream = canvasStream;
    }

    // MediaRecorder
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: mimeType,
      videoBitsPerSecond: bitrate
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recorderDone = new Promise((resolve) => {
      recorder.onstop = resolve;
    });

    recorder.start(500); // collect data every 500ms
    progressText.textContent = 'Compressing... playing through video';

    // Draw frames
    video.muted = false;
    if (!includeAudio) video.muted = true;

    await video.play();

    // Update progress during playback
    const progressInterval = setInterval(() => {
      if (sourceDuration > 0) {
        const pct = Math.min((video.currentTime / sourceDuration) * 100, 100);
        progressBar.style.width = pct + '%';
        progressText.textContent = 'Compressing... ' + Math.round(pct) + '% (' + fmtDuration(video.currentTime) + ' / ' + fmtDuration(sourceDuration) + ')';
      }
    }, 250);

    // Draw loop
    let animFrame;
    function drawFrame() {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, dim.w, dim.h);
      animFrame = requestAnimationFrame(drawFrame);
    }
    drawFrame();

    // Wait for video to end
    await new Promise((resolve) => {
      video.addEventListener('ended', resolve, { once: true });
    });

    cancelAnimationFrame(animFrame);
    clearInterval(progressInterval);

    // Final frame
    ctx.drawImage(video, 0, 0, dim.w, dim.h);

    progressBar.style.width = '100%';
    progressText.textContent = 'Finalizing...';

    recorder.stop();
    await recorderDone;

    // Build result blob
    const blob = new Blob(chunks, { type: mimeType });

    if (resultBlobUrl) URL.revokeObjectURL(resultBlobUrl);
    resultBlobUrl = URL.createObjectURL(blob);

    // Populate results
    const savedBytes = sourceFile.size - blob.size;
    const savedPct = ((savedBytes / sourceFile.size) * 100).toFixed(1);

    $('#result-original').textContent = fmtSize(sourceFile.size);
    $('#result-compressed').textContent = fmtSize(blob.size);
    $('#result-saved').textContent = savedBytes > 0
      ? fmtSize(savedBytes) + ' (' + savedPct + '%)'
      : 'No reduction (try lower settings)';
    $('#result-resolution').textContent = dim.w + ' x ' + dim.h;
    $('#result-duration').textContent = fmtDuration(sourceDuration);
    $('#result-format').textContent = ext.toUpperCase();

    // Previews
    $('#preview-original').src = URL.createObjectURL(sourceFile);
    $('#preview-compressed').src = resultBlobUrl;

    // Download
    const baseName = sourceFile.name.replace(/\.[^.]+$/, '');
    const downloadBtn = $('#download-btn');
    downloadBtn.href = resultBlobUrl;
    downloadBtn.download = baseName + '-compressed.' + ext;

    progressWrap.style.display = 'none';
    resultSection.style.display = 'block';
    compressBtn.disabled = false;

    // Scroll to result
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
})();
