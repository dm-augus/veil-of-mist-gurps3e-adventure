(() => {
  const audio = document.querySelector('#ambient-audio');
  const button = document.querySelector('#sound');
  const label = document.querySelector('#sound-label');
  const panel = document.querySelector('#sound-panel');
  const message = document.querySelector('#sound-status');
  audio.volume = 0.55;
  const sync = () => {
    const playing = !audio.paused && !audio.ended;
    button.setAttribute('aria-pressed', String(playing));
    label.textContent = playing ? 'Silenciar ambiente' : 'Ativar ambiente';
    if (playing) message.textContent = 'Chuva · vento · melodias sombrias';
  };
  button.addEventListener('click', async () => {
    panel.hidden = false;
    if (!audio.paused) { audio.pause(); return; }
    message.textContent = 'Carregando ambiente…';
    try {
      // Chamada direta no clique para preservar a autorização de reprodução.
      await audio.play();
      sync();
    } catch (error) {
      sync();
      message.textContent = error.name === 'NotAllowedError'
        ? 'Use o botão ▶ do player para iniciar o som.'
        : 'Não foi possível reproduzir. Tente abrir o áudio no link abaixo.';
    }
  });
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('error', () => {
    sync();
    message.textContent = 'Áudio indisponível. Recarregue a página ou abra o arquivo abaixo.';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.pause();
  });
})();
