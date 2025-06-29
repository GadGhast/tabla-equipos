const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const tbody = document.getElementById('tabla-equipos-body');
const previousValues = new Map();

function formatNumberToDigits(num) {
  return num.toLocaleString('es-ES').split('');
}

function createDigitElement(oldChar, newChar, direction, delay, overallChange) {
  const digit = document.createElement('span');
  digit.className = 'digit';
  if (newChar === '.') digit.classList.add('decimal');

  const inner = document.createElement('div');
  inner.className = 'digit-inner';

  const oldSpan = document.createElement('span');
  oldSpan.textContent = oldChar;
  const newSpan = document.createElement('span');
  newSpan.textContent = newChar;

  // Aplicar color solo si cifra cambia, según cambio global
  if (overallChange > 0) {
    digit.classList.add('spin-up');
  } else if (overallChange < 0) {
    digit.classList.add('spin-down');
  }

  if (direction === 'up') {
    inner.appendChild(oldSpan);
    inner.appendChild(newSpan);
    inner.style.transform = 'translateY(0)';
    setTimeout(() => {
      inner.style.transitionDelay = delay + 'ms';
      inner.style.transform = 'translateY(-28px)';
    }, 50);
  } else {
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

  // Cambio global: 1 = sube, -1 = baja, 0 = igual
  const overallChange = (newNum > oldNum) ? 1 : (newNum < oldNum) ? -1 : 0;

  for (let i = 0; i < newChars.length; i++) {
    const oldChar = oldChars[i] || ' ';
    const newChar = newChars[i];

    if (oldChar === newChar) {
      // Cifra sin cambio, sin color ni animación
      const span = document.createElement('span');
      span.className = 'digit';
      if (newChar === '.') span.classList.add('decimal');
      span.textContent = newChar;
      digitsContainer.appendChild(span);
    } else {
      // Cifra distinta, animar y colorear según cambio global
      const oldDigit = parseInt(oldChar) || 0;
      const newDigit = parseInt(newChar) || 0;
      const direction = newDigit > oldDigit ? 'up' : 'down';

      digitsContainer.appendChild(createDigitElement(oldChar, newChar, direction, i * 60, overallChange));
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

  equipos.forEach((equipo) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
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
