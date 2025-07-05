/* ---------- Supabase ---------- */
const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- DOM ---------- */
const tbody           = document.getElementById('tabla-equipos-body');
const objetivosBody   = document.getElementById('tabla-objetivos-body');

/* ---------- Mapas de estado ---------- */
const previousValues    = new Map();
const previousPositions = new Map();
const flashTimeouts     = new Map();

/* ---------- Objetivos: 10 000 → 1 000 000 ---------- */
const metas = Array.from({ length: 100 }, (_, i) => (i + 1) * 10000); // [10000, 20000, ... 1000000]

/* ---------- Helpers de dígitos ---------- */
function formatNumberToDigits(n){ return n.toLocaleString('es-ES').split(''); }

function createDigitElement(oldChar,newChar,direction,delay){
  const digit=document.createElement('span');
  digit.className='digit';
  if(newChar==='.') digit.classList.add('decimal');

  const inner=document.createElement('div');inner.className='digit-inner';
  const oldSpan=document.createElement('span');oldSpan.textContent=oldChar;
  const newSpan=document.createElement('span');newSpan.textContent=newChar;

  if(direction==='up'){
    digit.classList.add('spin-up');
    inner.append(oldSpan,newSpan);
    inner.style.transform='translateY(0)';
    setTimeout(()=>{inner.style.transitionDelay=delay+'ms';inner.style.transform='translateY(-28px)';},50);
  }else{
    digit.classList.add('spin-down');
    inner.append(newSpan,oldSpan);
    inner.style.transform='translateY(-28px)';
    setTimeout(()=>{inner.style.transitionDelay=delay+'ms';inner.style.transform='translateY(0)';},50);
  }
  digit.appendChild(inner);
  return digit;
}

function animateNumber(oldNum,newNum){
  const oldChars=oldNum!==undefined?formatNumberToDigits(oldNum):[];
  const newChars=formatNumberToDigits(newNum);
  const frag=document.createDocumentFragment();

  for(let i=0;i<newChars.length;i++){
    const oldChar=oldChars[i]||' ';
    const newChar=newChars[i];
    if(oldChar===newChar){
      const span=document.createElement('span');span.className='digit';
      if(newChar==='.'){span.classList.add('decimal');}
      span.textContent=newChar;frag.appendChild(span);
    }else{
      const direction=oldNum>newNum?'down':'up';
      frag.appendChild(createDigitElement(oldChar,newChar,direction,i*60));
    }
  }
  return frag;
}

/* ---------- Sincronizar hitos con Supabase ---------- */
async function syncHitos(equipos){
  /* 1. Obtener hitos ya guardados */
  const { data:hitosExistentes, error } = await client
      .from('hitos_logrados')
      .select('puntuacion_alcanzada')
      .order('puntuacion_alcanzada');
  if(error){ console.error('Supabase hitos error:',error); return; }

  const metasGuardadas = new Set(hitosExistentes.map(h => h.puntuacion_alcanzada));

  /* 2. Insertar si se alcanza una meta nueva */
  for(const meta of metas){
    if(metasGuardadas.has(meta)) continue;

    const pionero = equipos.find(e => e.value >= meta);
    if(pionero){
      await client.from('hitos_logrados').insert({
        equipo_id: pionero.id,
        equipo_name: pionero.name,
        equipo_image_url: pionero.image_url,
        puntuacion_alcanzada: meta
      });
      metasGuardadas.add(meta); // evitar doble inserción en este ciclo
    }
  }
}

/* ---------- Pintar tabla de hitos ---------- */
async function renderHitos(){
  const { data:hitos, error } = await client
      .from('hitos_logrados')
      .select('*')
      .order('puntuacion_alcanzada');
  if(error){ console.error('Supabase hitos error:',error); return; }

  objetivosBody.innerHTML='';
  hitos.forEach(h=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>
        <div class="country-container">
          <img src="${h.equipo_image_url}" alt="${h.equipo_name}" class="country-flag">
          <span>${h.equipo_name}</span>
        </div>
      </td>
      <td>${h.puntuacion_alcanzada.toLocaleString('es-ES')}</td>`;
    objetivosBody.appendChild(tr);
  });
}

/* ---------- Bucle principal ---------- */
async function fetchAndUpdate(){
  const { data:equipos, error } = await client
      .from('equipos')
      .select('*')
      .order('value',{ ascending:false });
  if(error){ console.error('Supabase equipos error:',error); return; }

  /* -------- Tabla principal -------- */
  tbody.innerHTML='';
  equipos.forEach((eq,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML = `
      <td><div class="country-container">
        <img src="${eq.image_url}" alt="${eq.name}" class="country-flag">
        <span>${eq.name}</span>
      </div></td>`;

    /* Valor animado */
    const tdVal=document.createElement('td');
    const oldVal=previousValues.get(eq.id)??0;
    tdVal.appendChild(animateNumber(oldVal,eq.value));
    tr.appendChild(tdVal);

    /* Flash si sube posición */
    const prevPos=previousPositions.get(eq.id);
    if(prevPos!==undefined && prevPos>idx && !flashTimeouts.has(eq.id)){
      tr.classList.add('flash');
      const t=setTimeout(()=>{tr.classList.remove('flash');flashTimeouts.delete(eq.id);},500);
      flashTimeouts.set(eq.id,t);
    }

    tbody.appendChild(tr);
    previousValues.set(eq.id, eq.value);
    previousPositions.set(eq.id, idx);
  });

  /* -------- Hitos -------- */
  await syncHitos(equipos); // Inserta nuevos hitos en Supabase si aparecen
  await renderHitos();      // Muestra la tabla de hitos actualizada
}

/* ---------- Lanzar bucle -------- */
fetchAndUpdate();
setInterval(fetchAndUpdate, 1000);
