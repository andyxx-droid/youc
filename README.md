# YouC — Istruzioni di installazione

## Cosa ti serve
- Un account Google
- Chrome o Edge (per installare la PWA)
- Un hosting gratuito (Netlify) — 5 minuti

---

## PASSO 1 — Crea il progetto su Google Cloud Console

1. Vai su https://console.cloud.google.com
2. Clicca **"Nuovo progetto"** → chiamalo "YouC" → **Crea**
3. Nel menu a sinistra vai su **API e servizi → Libreria**
4. Cerca **"Google Calendar API"** → clicca → **Abilita**

---

## PASSO 2 — Crea le credenziali

### API Key
1. Vai su **API e servizi → Credenziali**
2. Clicca **"+ Crea credenziali" → Chiave API**
3. Copia la chiave (es. `AIzaSy...`)
4. Clicca su **"Limita chiave"** → Restrizioni API → seleziona "Google Calendar API" → Salva

### OAuth 2.0 Client ID
1. Clicca **"+ Crea credenziali" → ID client OAuth**
2. Tipo applicazione: **Applicazione web**
3. Nome: "YouC"
4. In **"Origini JavaScript autorizzate"** aggiungi:
   - `https://tuo-nome.netlify.app` (lo aggiungi dopo aver caricato su Netlify)
5. Clicca **Crea**
6. Copia il **Client ID** (es. `1234567890-abc...apps.googleusercontent.com`)

---

## PASSO 3 — Inserisci le credenziali nel codice

Apri il file `index.html` con un editor di testo (Blocco Note va bene).

Trova questa sezione vicino all'inizio del file JavaScript:

```javascript
const CONFIG = {
  CLIENT_ID:     'IL_TUO_CLIENT_ID.apps.googleusercontent.com',
  API_KEY:       'LA_TUA_API_KEY',
  ...
```

Sostituisci:
- `IL_TUO_CLIENT_ID.apps.googleusercontent.com` con il tuo Client ID
- `LA_TUA_API_KEY` con la tua API Key

Salva il file.

---

## PASSO 4 — Carica su Netlify

1. Vai su https://netlify.com → crea un account gratuito (o accedi)
2. Nella dashboard, trascina l'intera cartella `youc-pwa` nell'area indicata
3. Netlify pubblica il sito e ti dà un link tipo `https://amazing-name-123.netlify.app`
4. **Copia questo link**

---

## PASSO 5 — Aggiungi l'URL a Google Cloud

1. Torna su https://console.cloud.google.com
2. **API e servizi → Credenziali → clicca sul tuo Client ID**
3. In **"Origini JavaScript autorizzate"** aggiungi il link Netlify copiato prima
4. Salva

---

## PASSO 6 — Installa la PWA su Windows

1. Apri il link Netlify in **Chrome** o **Edge**
2. La prima volta ti chiede di autorizzare Google Calendar → clicca **Consenti**
3. Nella barra degli indirizzi, a destra, compare un'icona di installazione (monitor con freccia ↓)
4. Cliccala → **Installa**
5. YouC si apre come app indipendente, senza barre del browser!

---

## Utilizzo

- **Ctrl + ←** → mese precedente
- **Ctrl + →** → mese successivo
- **Passa il mouse** su un giorno → vedi i dettagli degli eventi
- Il calendario si **aggiorna automaticamente** ogni 5 minuti
- Il **titolo della finestra** mostra l'anno visualizzato

---

## Aggiornare i dati del calendario Festivi

Il calendario "Festivi" è identificato da questo ID nel codice:
```
de2b5cf32d2fe58d3394bb3ae25094f5436c32ca469b28075c4023fd92302d32@group.calendar.google.com
```
Se vuoi cambiarlo, modificalo nel campo `HOLIDAYS_CAL` in `index.html`.

---

## Problemi comuni

**"Errore di autenticazione"**
→ Verifica che l'URL di Netlify sia nelle origini autorizzate in Google Cloud Console

**Il calendario non si aggiorna**
→ Clicca fuori dalla finestra e rientra, oppure chiudi e riapri l'app

**Vuoi disinstallare**
→ Tasto destro sull'icona dell'app → Disinstalla
