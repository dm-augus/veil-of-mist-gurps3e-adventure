const characters = [
  { id: 'elisa', name: 'Elisa de Lorris', epithet: 'PASSOS QUE NÃO DEIXAM RASTROS', teaser: 'Ágil com a lâmina e ainda mais com as mãos. Entre ruas e sombras, aprendeu que sobreviver exige mais do que sorte.', stats: [13,14,11,12], sheet: 'elisa' },
  { id: 'lars', name: 'Lars Brutalex', epithet: 'A VOZ DOS CANTOS ANTIGOS', teaser: 'Um veterano de espada em punho e palavras bem escolhidas. Nenhuma estrada parece lhe ser inteiramente desconhecida.', stats: [13,13,10,13], sheet: 'lars' },
  { id: 'nepenthe', name: 'Nepenthe', epithet: 'LUNE VON VALLEN', teaser: 'Ervas, fórmulas e um olhar que parece atravessar a pele. Há perguntas que prefere responder com silêncio.', stats: [10,12,15,11], sheet: 'lune' },
  { id: 'ulric', name: 'Ulric Beaumont', epithet: 'O CAÇADOR DO INVERNO', teaser: 'Um arqueiro de olhar atento e poucas palavras. Onde outros enxergam uma floresta, ele encontra um rastro.', stats: [12,15,12,12], sheet: 'ulric' }
];

document.querySelector('#character-grid').innerHTML = characters.map((c,i) => `<article class="character" aria-labelledby="name-${c.id}"><div class="portrait"><img src="assets/portraits/${c.id}.jpg" alt="Retrato de ${c.name}" loading="lazy"><span class="character-index">0${i+1} / IV</span></div><h3 id="name-${c.id}">${c.name}</h3><p class="epithet">${c.epithet}</p><p class="teaser">${c.teaser}</p><div class="stats" aria-label="Atributos da ficha">${['ST','DX','IQ','HT'].map((s,j)=>`<span>${s} <strong>${c.stats[j]}</strong></span>`).join('')}</div><div class="character-actions"><a class="sheet-link" href="assets/sheets/${c.sheet}.png" target="_blank" rel="noopener">Consultar ficha completa ↗</a><button class="story-button" data-story="${c.id}" type="button" aria-haspopup="dialog">História selada <span aria-hidden="true">⟐</span></button></div></article>`).join('');

const dialog = document.querySelector('#story-dialog');
const form = document.querySelector('#unlock-form');
const password = document.querySelector('#password');
const status = document.querySelector('#unlock-status');
const content = document.querySelector('#story-content');
const preview = document.querySelector('#cipher-preview');
const relock = document.querySelector('#relock');
let selectedId;
let attempt = 0;
let encryptedStories;
let opener;
function clearStory() {
  attempt++;
  form.reset(); content.replaceChildren(); content.hidden = true;
  form.hidden = false; preview.hidden = false; relock.hidden = true;
  document.querySelector('#lock-description').hidden = false;
  status.textContent = ''; form.querySelector('button').disabled = false;
}
document.querySelectorAll('[data-story]').forEach(button => button.addEventListener('click', () => {
  clearStory(); opener = button; selectedId = button.dataset.story;
  document.querySelector('#dialog-title').textContent = characters.find(c => c.id === selectedId).name;
  dialog.showModal(); document.body.classList.add('modal-open'); password.focus();
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { clearStory(); document.body.classList.remove('modal-open'); opener?.focus(); });
relock.addEventListener('click', () => { clearStory(); password.focus(); });
const decode = str => Uint8Array.from(atob(str), char => char.charCodeAt(0));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!window.crypto?.subtle) { status.textContent = 'Abra o site por HTTPS ou localhost para usar a decifragem.'; return; }
  const ticket = ++attempt;
  const id = selectedId;
  const pass = password.value.trim();
  let stage = 'load';
  form.querySelector('button').disabled = true; status.textContent = 'Rompendo o selo…';
  try {
    if (!encryptedStories) {
      const embedded = document.querySelector('#encrypted-stories');
      if (embedded) {
        encryptedStories = JSON.parse(embedded.textContent);
      } else {
        if (location.protocol === 'file:') throw new Error('local-file');
        const response = await fetch('assets/stories.json', { cache: 'no-cache' });
        if (!response.ok) throw new Error('network');
        encryptedStories = await response.json();
      }
    }
    const story = encryptedStories.stories?.[id];
    if (!story || !Number.isSafeInteger(encryptedStories.iterations)) throw new Error('invalid-payload');
    stage = 'decrypt';
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name:'PBKDF2', salt:decode(story.salt), iterations:encryptedStories.iterations, hash:'SHA-256' }, material, { name:'AES-GCM', length:256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:decode(story.iv) }, key, decode(story.data));
    if (ticket !== attempt || !dialog.open) return;
    stage = 'render';
    const text = new TextDecoder().decode(plain).trim();
    content.replaceChildren(...text.split(/\r?\n\s*\r?\n/).map(part => { const p = document.createElement('p'); p.textContent = part; return p; }));
    password.value = ''; status.textContent = ''; form.hidden = true; preview.hidden = true;
    document.querySelector('#lock-description').hidden = true;
    content.hidden = false; relock.hidden = false; relock.focus(); dialog.scrollTop = 0;
  } catch (error) {
    if (ticket !== attempt) return;
    if (error.name === 'OperationError') {
      status.textContent = 'O selo permanece intacto. Use a senha deste personagem, entregue pelo mestre.';
    } else if (stage === 'load') {
      status.textContent = location.protocol === 'file:'
        ? 'Os dados cifrados não estão disponíveis nesta cópia. Execute npm run dev e abra http://127.0.0.1:4173.'
        : 'Não foi possível carregar os dados cifrados. Recarregue a página; se continuar, atualize os arquivos do site.';
    } else if (stage === 'decrypt') {
      status.textContent = 'O navegador não conseguiu processar a cifra. Tente uma versão atual do Chrome, Edge, Firefox ou Safari.';
    } else {
      status.textContent = 'A história foi decifrada, mas houve um erro ao exibi-la. Recarregue a página e tente novamente.';
    }
    password.value = ''; password.focus();
  } finally { if (ticket === attempt) form.querySelector('button').disabled = false; }
});

const fogToggle = document.querySelector('#fog-toggle');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function updateFog(enabled) {
  document.querySelector('.fog').classList.toggle('is-hidden', !enabled);
  fogToggle.setAttribute('aria-pressed', String(enabled));
  fogToggle.textContent = enabled ? 'Névoa: ativada' : 'Névoa: desativada';
}
updateFog(!reduceMotion.matches);
reduceMotion.addEventListener('change', e => updateFog(!e.matches));
fogToggle.addEventListener('click', () => updateFog(fogToggle.getAttribute('aria-pressed') !== 'true'));

