// 🗓️ Zeitraum, in dem das Formular aktiv ist (mit Uhrzeit)
const startDatum = new Date("2025-12-01T08:00:00"); // ab 1. Dez 2025, 08:00 Uhr
const endDatum   = new Date("2025-12-30T23:59:00"); // bis 30. Dez 2025, 23:59 Uhr
const heute = new Date();

// Prüfen, ob Formular aktiv ist
const formularAktiv = heute >= startDatum && heute <= endDatum;

window.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('berichtForm');
  const feedback = document.getElementById('feedback');
  const amtSelect = document.getElementById("Amt");

  // 🔒 Hilfsfunktion: bereits abgegebene Ämter im Dropdown deaktivieren
  function ladeAbgegebeneAmter() {
    // gleiche URL wie im <form>, aber mit mode=status
    const statusUrl = form.action + '?mode=status';

    fetch(statusUrl)
      .then(response => response.json())
      .then(data => {
        if (!data || !Array.isArray(data.amts)) return;

        // Alle Optionen einmal durchgehen
        const options = Array.from(amtSelect.options);

        data.amts.forEach(amtName => {
          const opt = options.find(o => o.value === amtName || o.text === amtName);
          if (opt) {
            opt.disabled = true; // ausgrauen / deaktivieren
            opt.textContent = amtName + " (bereits abgegeben)";
          }
        });
      })
      .catch(err => {
        console.error('Statusabfrage fehlgeschlagen:', err);
      });
  }

  // 🟥 ALLE amtsbezogenen Fieldsets auswählen (die ein data-amt haben)
  const amtsFieldsets = document.querySelectorAll("[data-amt]");

  // 🟥 Sonstiges-Fieldset (ohne data-amt → letztes Fieldset)
  const sonstigesFieldset = document.querySelector("form fieldset:last-of-type");
  const sonstigesTextarea = sonstigesFieldset ? sonstigesFieldset.querySelector("textarea") : null;

  // 🟥 Standard: ALLE amtsbezogenen Fieldsets + Sonstiges verstecken
  function hideAllFieldsets() {
    amtsFieldsets.forEach(fs => fs.style.display = "none");
    if (sonstigesFieldset) sonstigesFieldset.style.display = "none";
  }

  hideAllFieldsets();

  // 🔒 Wenn Formular nicht aktiv ist:
  if (!formularAktiv) {
    form.innerHTML = `
      <p style="color:red; font-weight:bold; text-align:center;">
        Das Formular ist derzeit offline.<br>
        Es ist verfügbar vom <br> 
        ${startDatum.toLocaleString("de-DE")} bis ${endDatum.toLocaleString("de-DE")}.
      </p>`;
    return;
  }

  // ✅ Beim Laden: schauen, welche Ämter schon abgegeben haben
  ladeAbgegebeneAmter();

  // 🟥 Bei Änderung des Amts → nur das passende Fieldset anzeigen + Sonstiges leeren
  amtSelect.addEventListener("change", function () {
    const selectedAmt = this.value;

    // Alles verstecken
    hideAllFieldsets();

    // Sonstiges-Inhalt löschen
    if (sonstigesTextarea) {
      sonstigesTextarea.value = "";
    }

    // Nur das ausgewählte anzeigen
    if (selectedAmt) {
      const target = document.querySelector(`[data-amt="${selectedAmt}"]`);
      if (target) target.style.display = "block";

      // Sonstiges anzeigen
      if (sonstigesFieldset) sonstigesFieldset.style.display = "block";
    }
  });

  // 📨 Formular absenden
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { 'Accept': 'text/plain' }
    })
      .then(response => response.text())
      .then(text => {

        if (text === 'OK') {
          // ✅ Erfolg
          form.reset();
          feedback.style.display = 'block';
          localStorage.removeItem("berichtData");

          // Nach Reset wieder alles verstecken
          hideAllFieldsets();

          // Sonstiges leeren
          if (sonstigesTextarea) sonstigesTextarea.value = "";

          // Status neu laden → gerade eingereichtes Amt deaktivieren
          ladeAbgegebeneAmter();

        } else if (text === 'ALREADY_EXISTS') {
          // ❌ Amt hat für diesen Monat schon einen Bericht
          alert(
            'Für dieses Amt wurde in diesem Monat bereits ein Bericht eingereicht. ' +
            'Wenn etwas korrigiert werden muss, bitte den Generalsekretär kontaktieren.'
          );

        } else {
          // Unerwartete Antwort
          alert('Es gab ein Problem beim Senden des Formulars. Antwort vom Server: ' + text);
        }
      })
      .catch(() => {
        alert('Verbindung fehlgeschlagen. Bitte später erneut versuchen.');
      });
  });

  // 💾 Beim Tippen: Formular-Daten automatisch speichern
  form.addEventListener("input", () => {
    localStorage.setItem(
      "berichtData",
      JSON.stringify(Object.fromEntries(new FormData(form)))
    );
  });

  // 🔁 Beim Laden: gespeicherte Daten wiederherstellen
  const data = JSON.parse(localStorage.getItem("berichtData") || "{}");
  Object.entries(data).forEach(([k, v]) => {
    if (form[k]) form[k].value = v;
  });

  // 🟥 Wenn beim Laden ein Amt vorher gespeichert war → automatisch anzeigen
  if (data["Amt"]) {
    amtSelect.value = data["Amt"];
    amtSelect.dispatchEvent(new Event("change"));
  }
});
