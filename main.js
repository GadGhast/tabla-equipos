/* ---------- Supabase ---------- */
const SUPABASE_URL = 'https://pcnrwrttjbwannedamki.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbnJ3cnR0amJ3YW5uZWRhbWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTkwODUsImV4cCI6MjA2NjQzNTA4NX0.j62o4rP8afaRiaMyfX-UTze5B8ftgRgpwrGLq4FEvcs';
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- DOM ---------- */
const tbody = document.getElementById('tabla-equipos-body');
const objetivosBody = document.getElementById('tabla-objetivos-body');

/* ---------- Anteriores ---------- */
const previousValues    = new Map();
const previousPositions = new Map();
const flashTimeouts     = new Map();

/* ---------- Objetivos hasta 1 000 000 ---------- */
const metas = Array.from({ length: 100 }, (_, i) => (i + 1) * 10000); // 10 000 → 1 000 000
const objetivosAlcanzados = new Map(); // meta → equipoId

/* ---------- Helpers de dígitos ---------- */
function formatNumberToDigits(n){return n.toLocaleString('es-ES').split('');}
function createDigitElement(oldChar,newChar,direction,delay){
  const digit=document.createElement('span');
  digit.className='digit';
  if(newChar === '.') digit.classList.add('decimal');

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

/* ---------- Main update loop ---------- */
async function fetchAndUpdate(){
  const { data:equipos, error } = await client.from('equipos').select('*').order('value',{ascending:false});
  if(error){ console.error('Error:',error); return; }

  /* ---- Tabla principal ---- */
  tbody.innerHTML='';
  equipos.forEach((eq,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>
        <div class="country-container">
          <img src="${eq.image_url}" alt="${eq.name}" class="country-flag">
          <span>${eq.name}</span>
        </div>
      </td>`;
    const tdVal=document.createElement('td');
    const oldVal=previousValues.get(eq.id)??0;
    tdVal.appendChild(animateNumber(oldVal,eq.value));
    tr.appendChild(tdVal);

    /* efecto flash si sube posición */
    const prevPos=previousPositions.get(eq.id);
    if(prevPos!==undefined && prevPos>idx && !flashTimeouts.has(eq.id)){
      tr.classList.add('flash');
      const t=setTimeout(()=>{tr.classList.remove('flash');flashTimeouts.delete(eq.id);},500);
      flashTimeouts.set(eq.id,t);
    }

    tbody.appendChild(tr);
    previousValues.set(eq.id,eq.value);
    previousPositions.set(eq.id,idx);
  });

  /* ---- Tabla de hitos ---- */
  metas.forEach(meta=>{
    if(!objetivosAlcanzados.has(meta)){
      const primero = equipos.find(e => e.value >= meta);
      if(primero){
        objetivosAlcanzados.set(meta, primero.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="country-container">
              <img src="${primero.image_url}" alt="${primero.name}" class="country-flag" />
              <span>${primero.name}</span>
            </div>
          </td>
          <td>${meta.toLocaleString('es-ES')}</td>
        `;
        objetivosBody.appendChild(tr);
      }
    }
  });
}

fetchAndUpdate();
setInterval(fetchAndUpdate,1000);
