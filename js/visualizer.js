(function(){
  const audio = document.getElementById('audio');
  const canvas = document.getElementById('visualizer');
  if (!audio || !canvas) return;
  const ctx = canvas.getContext('2d');

  // Responsive canvas sizing (fixed height, full width)
  function resize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = canvas.clientWidth || window.innerWidth;
    const cssHeight = 300; // px

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    // scale drawing operations to CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize, { passive: true });
  // initial size
  resize();

  let audioCtx = null;
  let analyser = null;
  let source = null;
  let dataArray = null;
  let bufferLength = 0;

  function initAudio() {
    if (audioCtx) return; // already initialized

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // Create media source from the <audio> element
    try {
      source = audioCtx.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (err) {
      // createMediaElementSource can throw if audio is cross-origin or already connected
      console.warn('Could not create MediaElementSource:', err);
    }
  }

  function draw() {
    requestAnimationFrame(draw);
    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);

    // Clear using CSS pixel dimensions
    const cssWidth = canvas.width / (window.devicePixelRatio || 1);
    const cssHeight = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const barWidth = cssWidth / bufferLength;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const x = i * barWidth;
      const y = cssHeight - value; // draw from bottom up
      ctx.fillStyle = `rgb(${value}, 80, 180)`;
      ctx.fillRect(x, y, barWidth, value);
    }
  }

  // Initialize AudioContext on user interaction (some browsers block autoplay without user gesture)
  function ensureStarted() {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }

  audio.addEventListener('play', ensureStarted);
  audio.addEventListener('click', ensureStarted);
  audio.addEventListener('playing', ensureStarted);

  // Start the render loop
  draw();

  // Cleanup on unload
  window.addEventListener('pagehide', () => {
    try {
      if (audioCtx && audioCtx.close) audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  });
})();
