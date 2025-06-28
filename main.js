const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tbody = document.getElementById('tabla-equipos-body');
const previousValues = new Map();

function formatNumberToDigits(num) {
  return num.toLocaleString('es-ES').split('');
}

function createDigitElement(oldChar, newChar, direction, delay) {
  const digit = document.createElement('span');
  digit.className = 'digit';
  if (newChar === '.') digit.classList.add('decimal');

  const inner = document.createElement('div');
  inner.className = 'digit-inner';

  const oldSpan = document.createElement('span');
  oldSpan.textContent = oldChar;
  const newSpan = document.createElement('span');
  newSpan.textContent = newChar;

  if (direction === 'up') {
    digit.classList.add('spin-up');
    inner.appendChild(oldSpan);
    inner.appendChild(newSpan);
    inner.style.transform = 'translateY(0)';
    setTimeout(() => {
      inner.style.transitionDelay = delay + 'ms';
      inner.style.transform = 'translateY(-28px)';
    }, 50);
  } else {
    digit.classList.add('spin-down');
    inner.appendChild(newSpan);
    inner.appendChild(oldSpan);
    inner.style.transform = 'translateY(-28px)';
    setTimeout(() => {
      inner.style.transitionDelay = delay + 'ms';
      inner.style.transform = 'translateY(0)';
    }, 50);
  }

  digit.appendChild(inner);
  return digit;
}

function animateNumber(oldNum, newNum) {
  const oldChars = oldNum !== undefined ? formatNumberToDigits(oldNum) : [];
  const newChars = formatNumberToDigits(newNum);
  const digitsContainer = document.createDocumentFragment();

  for (let i = 0; i < newChars.length; i++) {
    const oldChar = oldChars[i] || ' ';
    const newChar = newChars[i];

    if (oldChar === newChar) {
      const span = document.createElement('span');
      span.className = 'digit';
      if (newChar === '.') span.classList.add('decimal');
      span.textContent = newChar;
      digitsContainer.appendChild(span);
    } else {
      const oldDigit = parseInt(oldChar) || 0;
      const newDigit = parseInt(newChar) || 0;
      const direction = newDigit > oldDigit ? 'up' : 'down';
      digitsContainer.appendChild(createDigitElement(oldChar, newChar, direction, i * 60));
    }
  }
  return digitsContainer;
}

async function fetchAndUpdate() {
  const { data: equipos, error } = await client
    .from('equipos')
    .select('*')
    .order('value', { ascending: false });

  if (error) {
    console.error('Error al obtener datos:', error);
    return;
  }

  tbody.innerHTML = '';

  equipos.forEach((equipo, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${equipo.name}</td>
    `;

    const tdValue = document.createElement('td');

    const oldValue = previousValues.get(equipo.id) ?? 0;
    const newValue = equipo.value;

    tdValue.appendChild(animateNumber(oldValue, newValue));
    tr.appendChild(tdValue);

    tbody.appendChild(tr);

    previousValues.set(equipo.id, newValue);
  });
}

setInterval(fetchAndUpdate, 1000);
fetchAndUpdate();
