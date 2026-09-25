<template>
  <div class="report-page admin-settings">
    <section class="admin-hero">
      <div>
        <span>Admin-Einstellungen</span>
        <h1>Inhalte und Pflegepläne verwalten.</h1>
        <p>Elementwissen, Produkte und Empfehlungen passend zu Ihren Laborberichten pflegen.</p>
      </div>
      <div class="admin-role"><span>Zugriff</span><strong>{{ roleLabel }}</strong><em>{{ ANALYSIS_PARAMETERS.length }} Elemente · {{ supportContent.faqs.length }} FAQs<span v-if="canManageUsers"> · {{ adminUsers.length }} Nutzer</span></em></div>
    </section>

    <nav class="settings-tabs" aria-label="Einstellungsbereiche">
      <button type="button" :class="{ active: activeArea === 'elements' }" @click="activeArea = 'elements'"><span>Elemente</span><small>Messwerte &amp; Empfehlungen</small></button>
      <button type="button" :class="{ active: activeArea === 'dosing' }" @click="activeArea = 'dosing'"><span>Produkte &amp; Dosierung</span><small>Produktkarten &amp; freigegebene Formeln</small></button>
      <button v-if="recommendationRulesEnabled" type="button" :class="{ active: activeArea === 'recommendations' }" @click="activeArea = 'recommendations'"><span>Regeln &amp; Empfehlungen</span><small>Auslöser &amp; Maßnahmen</small></button>
      <button type="button" :class="{ active: activeArea === 'scales' }" @click="activeArea = 'scales'"><span>Bewertungsgrundlagen</span><small>Score-Stufen je Element</small></button>
      <button type="button" :class="{ active: activeArea === 'texts' }" @click="activeArea = 'texts'"><span>Empfehlungstexte</span><small>Maßnahmen &amp; Tipps</small></button>
      <button type="button" :class="{ active: activeArea === 'support' }" @click="activeArea = 'support'"><span>Hilfe &amp; Support</span><small>FAQs verwalten</small></button>
      <button v-if="canManageUsers" type="button" :class="{ active: activeArea === 'users' }" @click="openUserManagement"><span>Benutzer</span><small>Konten &amp; Berechtigungen</small></button>
    </nav>
    <p class="storage-note">Aktuell werden Änderungen in diesem Browser gespeichert. Eine geräteübergreifende Veröffentlichung ist noch nicht angebunden.</p>

    <section v-show="activeArea === 'elements'" class="editor-shell">
      <header class="editor-heading">
        <div><span>Analyse-Inhalte</span><h2>Elementbibliothek</h2><p>Wählen Sie ein Element und bearbeiten Sie die Informationen für Kundenberichte.</p></div>
        <div class="editor-state" :class="{ unsaved: dirtyAreas.elements }"><i></i><span>{{ dirtyAreas.elements ? 'Ungespeicherte Änderungen' : 'Gespeicherter Inhalt' }}</span></div>
      </header>

      <div class="editor-layout">
        <aside class="element-browser">
          <label><span>Element suchen · {{ filteredParameters.length }} Treffer</span><input v-model="search" type="search" placeholder="Name, Symbol, Gruppe…" /></label>
          <nav aria-label="Element zum Bearbeiten auswählen">
            <button v-for="parameter in filteredParameters" :key="parameter.key" type="button" :class="{ active: selectedKey === parameter.key }" @click="selectedKey = parameter.key">
              <span>{{ parameter.symbol }}</span><div><strong>{{ parameter.label }}</strong><small>{{ parameter.group }}</small></div><i>›</i>
            </button>
          </nav>
        </aside>

        <main class="content-editor">
          <header>
            <div class="element-identity"><span>{{ selectedMeta.symbol }}</span><div><small>{{ selectedMeta.group }}</small><h3>{{ selectedMeta.label }}</h3></div></div>
            <button type="button" class="reset-button" @click="resetSelected">Standard wiederherstellen</button>
          </header>

          <div class="editor-section">
            <div class="section-label"><span>01</span><div><strong>Messwert-Konfiguration</strong><small>Einheit und Demo-Zielbereich für Meerwasser</small></div></div>
            <div class="technical-fields">
              <label><span>Einheit</span><input v-model="selectedContent.unit" type="text" /></label>
              <label><span>Ziel Minimum</span><input v-model.number="selectedContent.targetMin" type="number" step="any" /></label>
              <label><span>Ziel Maximum</span><input v-model.number="selectedContent.targetMax" type="number" step="any" /></label>
              <label><span>Nachkommastellen</span><input v-model.number="selectedContent.precision" type="number" min="0" max="4" /></label>
            </div>
            <p class="technical-note"><b>{{ selectedMeta.source }}</b> · {{ selectedMeta.waterTypes.join(', ') }} · Zielbereiche sind aktuell als Demo markiert.</p>
            <p v-if="selectedElementError" class="field-error" role="status">{{ selectedElementError }}</p>
          </div>

          <div class="editor-section">
            <div class="section-label"><span>02</span><div><strong>Info &amp; Technik</strong><small>Grundwissen im ersten Bereich der Elementkarte</small></div></div>
            <label><span>Allgemeine Information</span><small>Was wird gemessen und wie wird der Parameter technisch eingeordnet?</small><textarea v-model="selectedContent.general" rows="5"></textarea></label>
            <label><span>Wofür wichtig</span><small>Welche Rolle spielt der Wert für das Aquarium und seine Bewohner?</small><textarea v-model="selectedContent.importance" rows="5"></textarea></label>
          </div>

          <div class="editor-section">
            <div class="section-label"><span>03</span><div><strong>Empfehlungen</strong><small>Handlungsanweisungen für Abweichungen vom Zielbereich</small></div></div>
            <div class="recommendation-fields">
              <label class="high"><span>Wert zu hoch</span><small>Was soll geprüft und wie soll korrigiert werden?</small><textarea v-model="selectedContent.high" rows="6"></textarea></label>
              <label class="low"><span>Wert zu niedrig</span><small>Was soll geprüft und wie soll korrigiert werden?</small><textarea v-model="selectedContent.low" rows="6"></textarea></label>
            </div>
          </div>

          <div class="editor-section">
            <div class="section-label"><span>04</span><div><strong>Bewertungsgrundlagen</strong><small>Neun Stufen von kritisch niedrig bis kritisch hoch — je Grundlage eine Zeile</small></div></div>
            <div class="element-scale-wrap">
              <table class="element-scale-table">
                <thead>
                  <tr>
                    <th scope="col">Grundlage</th>
                    <th v-for="field in THRESHOLD_FIELDS" :key="field.key" scope="col" :title="field.label" :class="{ optimum: field.key === 'min' || field.key === 'max' }">{{ field.short }}</th>
                    <th scope="col"><span class="visually-hidden">Aktionen</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="scale in scales" :key="scale.id" :class="{ active: selectedScaleId === scale.id }">
                    <th scope="row">
                      <button type="button" class="scale-name-button" :aria-pressed="selectedScaleId === scale.id" :title="`Stufen von ${scale.name} unten anzeigen`" @click="selectedScaleId = scale.id">
                        <strong>{{ scale.name }}</strong>
                        <small>{{ scale.builtIn ? 'Standard' : 'Eigene' }}</small>
                      </button>
                    </th>
                    <td v-for="field in THRESHOLD_FIELDS" :key="field.key" :class="{ optimum: field.key === 'min' || field.key === 'max' }">
                      <input v-model.number="scale.thresholds[selectedKey][field.key]" type="number" step="any" :aria-label="`${selectedMeta.label} · ${scale.name} · ${field.label}`" />
                    </td>
                    <td class="row-action">
                      <button v-if="!scale.builtIn" type="button" :aria-label="`${scale.name} löschen`" title="Grundlage löschen" @click="removeScale(scale.id)">×</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="element-scale-foot">
              <button type="button" class="scale-inline-add" @click="addScale">+ Grundlage hinzufügen</button>
              <p v-if="elementScaleError" class="field-error" role="status">{{ elementScaleError }}</p>
            </div>

            <div class="band-preview" aria-label="Bewertungsstufen">
              <span v-for="band in SCORE_BANDS" :key="band.score" :class="['band-chip', band.tone]">
                <b>{{ band.score }}</b>
                <em>{{ band.short }}</em>
                <small>{{ bandRangeLabel(band.score) }}</small>
              </span>
            </div>
            <p class="technical-note">Stufen von <b>{{ selectedScale.name }}</b>. Score 5 ist das Optimum, Dosierungen zielen auf {{ correctionTarget }} {{ selectedContent.unit }}.</p>
          </div>

          <section class="content-preview">
            <div><span>Vorschau</span><strong>{{ selectedMeta.label }}</strong></div>
            <p>{{ selectedContent.general }}</p>
            <div class="preview-actions"><article><span>Zu hoch</span><p>{{ selectedContent.high }}</p></article><article><span>Zu niedrig</span><p>{{ selectedContent.low }}</p></article></div>
          </section>

          <footer>
            <p :class="['save-message', saveState.type]" role="status">{{ saveState.message }}</p>
          </footer>
        </main>
      </div>
    </section>

    <section v-show="activeArea === 'dosing'" class="editor-shell dosing-editor-shell">
      <header class="editor-heading dosing-editor-heading">
        <div><span>Produkte &amp; Dosierung</span><h2>Produkte zuordnen, Dosierungen freigeben</h2><p>Ein Produkt kann ohne Dosierformel empfohlen werden. Eine ml-Menge erscheint erst mit einer vollständigen, laborgeprüften Formel.</p></div>
        <div class="dosing-summary">
          <span><b>{{ activeDosingCount }}</b>aktiv</span>
          <span><b>{{ verifiedDosingCount }}</b>verifiziert</span>
          <span><b>{{ DOSING_PARAMETERS.length }}</b>dosierbar</span>
        </div>
      </header>

      <div class="dosing-workspace">
        <aside class="dosing-browser">
          <label><span>Element suchen · {{ filteredDosingParameters.length }} Treffer</span><input v-model="dosingSearch" type="search" placeholder="Name, Symbol, Produkt…" /></label>
          <nav aria-label="Dosierungsparameter auswählen">
            <button v-for="parameter in filteredDosingParameters" :key="parameter.key" type="button" :class="{ active: selectedDosingKey === parameter.key }" @click="selectDosingParameter(parameter.key)">
              <span>{{ parameter.symbol }}</span>
              <div><strong>{{ parameter.label }}</strong><small>{{ dosingConfig[parameter.key].productOverride ? 'Eigenes Produkt' : dosingConfig[parameter.key].productName ? 'Standard ATI-Produkt' : 'Kein Produkt zugeordnet' }}</small><small :class="['dosing-status', { approved: dosingStatus(parameter.key) === 'Dosierung freigegeben' }]">{{ dosingStatus(parameter.key) }}</small></div>
            </button>
          </nav>
        </aside>

        <main class="dosing-form">
          <header>
            <div class="dosing-identity"><span>{{ selectedDosingMeta.symbol }}</span><div><small>{{ selectedDosingMeta.group }}</small><h3>{{ selectedDosingMeta.label }}</h3></div></div>
            <div class="dosing-header-actions">
              <button type="button" class="reset-button" @click="resetSelectedDosing">Eintrag zurücksetzen</button>
            </div>
          </header>

          <div class="dosing-form-body">
            <section class="dosing-form-section">
              <div class="section-label"><span>01</span><div><strong>Empfohlenes Produkt</strong><small>Unabhängig von einer Dosierformel in Berichten sichtbar</small></div></div>
              <div class="dosing-fields product-fields">
                <label class="wide"><span>Produktname</span><input v-model="selectedDosing.productName" type="text" placeholder="Produktname eingeben" @input="selectedDosing.productOverride = true; selectedDosing.verified = false" /><small v-if="selectedDosingErrors.productName" class="field-error">{{ selectedDosingErrors.productName }}</small></label>
                <label class="wide"><span>Shop-Link · optional</span><input v-model="selectedDosing.productUrl" type="text" inputmode="url" placeholder="https://shop.atiaquaristik.com/…" @input="selectedDosing.productOverride = true" /><small v-if="selectedDosingErrors.productUrl" class="field-error">{{ selectedDosingErrors.productUrl }}</small></label>
                <label class="wide"><span>Bild-Link · optional</span><input v-model="selectedDosing.productImage" type="text" inputmode="url" placeholder="https://…" @input="selectedDosing.productOverride = true" /><small v-if="selectedDosingErrors.productImage" class="field-error">{{ selectedDosingErrors.productImage }}</small></label>
              </div>
              <div class="product-source"><span>{{ selectedDosing.productOverride ? 'Eigenes Produkt' : 'Standard ATI-Produkt' }}</span><button v-if="selectedDosing.productOverride" type="button" class="reset-button" @click="restoreStandardProduct">Standardprodukt verwenden</button></div>
              <ProductSuggestions :products="adminProductPreview" />
            </section>

            <section class="dosing-form-section">
              <div class="section-label"><span>02</span><div><strong>Dosierformel · optional</strong><small>Produktwirkung bezogen auf 100 Liter Aquarienwasser</small></div></div>
              <label class="dosing-switch"><input v-model="selectedDosing.enabled" type="checkbox" /><span>Konkrete Dosierung konfigurieren</span></label>
              <p v-if="selectedDosingSource.verificationSource === 'manufacturer'" class="formula-explanation">ATI-Herstellerangaben · geprüft am 18.09.2026 · Einheit {{ selectedDosingSource.unit }}. Diese Angaben gelten automatisch für alle passenden Analysen. <a :href="selectedDosingSource.sourceUrl" target="_blank" rel="noreferrer">Produktdaten ansehen ↗</a></p>
              <p v-if="!selectedDosing.productName" class="formula-explanation">Noch kein Produkt mit bestätigter Wirkung und Tageslimit hinterlegt. Eigene Produktdaten können hier ergänzt werden.</p>
              <fieldset v-show="selectedDosing.enabled" :disabled="!selectedDosing.enabled" class="formula-fields">
              <div class="formula-builder">
                <label><span>Produktmenge</span><div><input v-model.number="selectedDosing.mlPer100Liters" type="number" min="0" step="any" @input="selectedDosing.verified = false" /><b>ml / 100 l</b></div></label>
                <i>erhöht</i>
                <label><span>{{ selectedDosingMeta.label }}</span><div><input v-model.number="selectedDosing.raisesBy" type="number" min="0" step="any" @input="selectedDosing.verified = false" /><b>{{ selectedDosing.unit || selectedDosingMeta.unit }}</b></div></label>
                <i>maximal</i>
                <label><span>Tagesanstieg</span><div><input v-model.number="selectedDosing.maxDailyIncrease" type="number" min="0" step="any" @input="selectedDosing.verified = false" /><b>{{ selectedDosing.unit || selectedDosingMeta.unit }} / Tag</b></div></label>
              </div>
              <label class="verification-field"><input v-model="selectedDosing.verified" type="checkbox" /><span><b>Dosierangaben geprüft</b><small>Einmalige Prüfung des Produkts. Alle passenden Analysen berechnen ihre Dosierung automatisch.</small></span></label>
              </fieldset>
              <p v-if="selectedDosing.enabled" class="formula-explanation">{{ dosingFormulaExplanation }}</p>
              <ul v-if="selectedDosing.enabled && formulaErrors.length" class="formula-errors"><li v-for="error in formulaErrors" :key="error">{{ error }}</li></ul>
            </section>

            <section v-show="selectedDosing.enabled" class="dosing-form-section">
              <div class="section-label"><span>03</span><div><strong>Anwendungshinweis</strong><small>Zusätzlicher Hinweis unter der berechneten Dosierung</small></div></div>
              <label class="dosing-instructions"><span>Hinweis für Kunden</span><textarea v-model="selectedDosing.instructions" rows="4" placeholder="z. B. Tagesmenge auf mehrere Dosierzeitpunkte verteilen."></textarea></label>
            </section>

            <section class="dosing-preview">
              <header><div><span>Kundenvorschau</span><h4>Dosierung mit Beispielwert testen</h4></div><b :class="{ ready: dosingPreview.ready }">{{ dosingPreview.ready ? 'Dosierung freigegeben' : dosingStatus(selectedDosingKey) }}</b></header>
              <div v-if="selectedDosing.enabled" class="preview-inputs">
                <label><span>Aquariumvolumen</span><div><input v-model.number="previewVolume" type="number" min="1" /><b>Liter</b></div></label>
                <label><span>Aktueller Wert</span><div><input v-model.number="previewValue" type="number" min="0" step="any" /><b>{{ selectedDosingMeta.unit }}</b></div></label>
                <div><span>Zielwert</span><strong>{{ selectedDosingTarget }} {{ selectedDosingMeta.unit }}</strong></div>
              </div>
              <div v-if="dosingPreview.ready" class="preview-result">
                <div><span>Gesamtmenge</span><strong>{{ formatDosingNumber(dosingPreview.totalMl) }} ml</strong></div>
                <div><span>Dauer</span><strong>{{ dosingPreview.days }} {{ dosingPreview.days === 1 ? 'Tag' : 'Tage' }}</strong></div>
                <div><span>Pro Tag</span><strong>{{ formatDosingNumber(dosingPreview.dailyMl) }} ml</strong></div>
              </div>
              <p v-else>{{ dosingPreviewReason }}</p>
            </section>
          </div>

          <footer><p :class="['save-message', dosingSaveState.type]" role="status">{{ dosingSaveState.message }}</p></footer>
        </main>
      </div>
    </section>

    <section v-if="recommendationRulesEnabled" v-show="activeArea === 'recommendations'" class="editor-shell rule-editor-shell">
      <header class="editor-heading rule-editor-heading">
        <div><span>Empfehlungen</span><h2>Auslöser und nächste Schritte</h2><p>Definieren Sie, wann eine Empfehlung erscheint, und prüfen Sie das Ergebnis direkt an einem Laborbericht.</p></div>
        <button class="btn btn-primary" type="button" @click="addRecommendationRule">+ Regel hinzufügen</button>
      </header>

      <div class="rule-workspace">
        <aside class="rule-browser">
          <label><span>Regel suchen · {{ filteredRecommendationRules.length }} Treffer</span><input v-model="recommendationSearch" type="search" placeholder="Name, Gruppe, Empfehlung…" /></label>
          <nav aria-label="Empfehlungsregel auswählen">
            <button v-for="rule in filteredRecommendationRules" :key="rule.id" type="button" :class="{ active: selectedRecommendationRuleId === rule.id }" @click="selectedRecommendationRuleId = rule.id">
              <i :class="{ off: !rule.active }"></i>
              <span><strong>{{ rule.name }}</strong><small>{{ scopeLabel(rule.groupKey) }} · ab {{ rule.minimumMatches }} Treffer</small></span>
              <b>›</b>
            </button>
          </nav>
        </aside>

        <main v-if="selectedRecommendationRule" class="rule-form">
          <header>
            <div><small>Ausgewählte Regel</small><h3>{{ selectedRecommendationRule.name || 'Neue Regel' }}</h3></div>
            <label class="rule-active"><input v-model="selectedRecommendationRule.active" type="checkbox" /><span>{{ selectedRecommendationRule.active ? 'Aktiv' : 'Pausiert' }}</span></label>
          </header>

          <section class="rule-form-section">
            <div class="section-label"><span>01</span><div><strong>Wann wird sie ausgelöst?</strong><small>Bedingungen werden auf jeden fertigen Laborbericht angewendet</small></div></div>
            <div class="rule-fields trigger-fields">
              <label class="wide"><span>Interner Regelname</span><input v-model="selectedRecommendationRule.name" type="text" placeholder="z. B. Nährstoffbalance" /></label>
              <label><span>Bedingung</span><select v-model="selectedRecommendationRule.conditionType"><option value="group_status">Auffällige Werte in Gruppe</option><option value="invalid">Ungültige Laborwerte</option></select></label>
              <label v-if="selectedRecommendationRule.conditionType === 'group_status'"><span>Messwertgruppe</span><select v-model="selectedRecommendationRule.groupKey"><option v-for="scope in RECOMMENDATION_SCOPES" :key="scope.key" :value="scope.key">{{ scope.label }}</option></select></label>
              <label><span>Wassertyp</span><select v-model="selectedRecommendationRule.waterType"><option value="all">Alle Wassertypen</option><option value="Meerwasser">Meerwasser</option><option value="Süßwasser">Süßwasser</option><option value="Osmosewasser">Osmosewasser</option><option value="Meersalz">Meersalz</option><option value="Aquakultur">Aquakultur</option></select></label>
              <label v-if="selectedRecommendationRule.conditionType === 'group_status'"><span>Abweichungsstufe</span><select :value="ruleTrigger(selectedRecommendationRule)" @change="setRuleTrigger"><option value="watch-critical">Beobachten oder kritisch</option><option value="critical">Nur kritisch</option></select></label>
              <label v-if="selectedRecommendationRule.conditionType === 'group_status'"><span>Richtung</span><select :value="ruleDirection(selectedRecommendationRule)" @change="setRuleDirection"><option value="both">Zu niedrig oder zu hoch</option><option value="low">Nur zu niedrig</option><option value="high">Nur zu hoch</option></select></label>
              <label><span>Mindestens Treffer</span><input v-model.number="selectedRecommendationRule.minimumMatches" type="number" min="1" max="43" /></label>
            </div>
            <p class="rule-explanation"><b>Wenn</b> mindestens {{ selectedRecommendationRule.minimumMatches }} {{ selectedRecommendationRule.conditionType === 'invalid' ? 'ungültige Messung' : `${ruleTrigger(selectedRecommendationRule) === 'critical' ? 'kritischer Wert' : 'auffälliger Wert'} (${ruleDirectionLabel(selectedRecommendationRule)}) in „${scopeLabel(selectedRecommendationRule.groupKey)}“` }} gefunden {{ selectedRecommendationRule.minimumMatches === 1 ? 'wird' : 'werden' }}, erscheint die Empfehlung einmal für alle passenden Elemente.</p>
          </section>

          <section class="rule-form-section">
            <div class="section-label"><span>02</span><div><strong>Was sieht der Kunde?</strong><small>Kurzdarstellung und ausführliche Erklärung im Pflegeplan</small></div></div>
            <div class="rule-fields output-fields">
              <label><span>Priorität</span><select v-model="selectedRecommendationRule.priority"><option value="Hoch">Hoch</option><option value="Mittel">Mittel</option></select></label>
              <label><span>Kontrolle nach Tagen</span><input v-model.number="selectedRecommendationRule.recheckDays" type="number" min="1" max="90" /></label>
              <label class="wide"><span>Titel</span><input v-model="selectedRecommendationRule.title" type="text" /></label>
              <label class="wide"><span>Kurze Empfehlung</span><textarea v-model="selectedRecommendationRule.summary" rows="3"></textarea></label>
              <label class="wide"><span>Warum wird das empfohlen?</span><textarea v-model="selectedRecommendationRule.why" rows="3"></textarea></label>
              <label class="wide"><span>Konkrete Schritte · ein Schritt pro Zeile</span><textarea :value="selectedRecommendationRule.steps.join('\n')" rows="5" @input="updateRuleSteps"></textarea></label>
            </div>
          </section>

          <footer class="rule-form-footer"><button type="button" class="remove-rule" @click="removeRecommendationRule">Regel entfernen</button></footer>
        </main>
        <div v-else class="faq-admin-empty"><strong>Noch keine Regel ausgewählt</strong><p>Erstellen Sie eine Regel, um die Empfehlungslogik festzulegen.</p><button class="btn btn-primary" type="button" @click="addRecommendationRule">Erste Regel hinzufügen</button></div>
      </div>

      <section class="rule-simulator">
        <header><div><span>Kundenvorschau</span><h3>Was sieht der Kunde mit diesen Regeln?</h3><p>Ungespeicherte Regeländerungen wirken nur auf diese Vorschau.</p></div></header>
        <label class="simulator-report-picker"><span>Laborbericht prüfen</span><select v-model="simulatorReportId"><option value="">Demoberichte</option><option v-for="report in simulatorReports" :key="report.id" :value="report.id">{{ report.reportNumber || report.barcode }} · {{ report.aquariumName }}</option></select></label>
        <div v-if="!simulatorReportId" class="scenario-switch" role="group" aria-label="Demo-Ergebnis auswählen"><button type="button" :class="{ active: simulatorScenario === 'good' }" @click="simulatorScenario = 'good'">Gut</button><button type="button" :class="{ active: simulatorScenario === 'medium' }" @click="simulatorScenario = 'medium'">Mittel</button><button type="button" :class="{ active: simulatorScenario === 'bad' }" @click="simulatorScenario = 'bad'">Schlecht</button></div>
        <div class="simulator-summary"><span :class="`tone-${simulatorAnalysis.resultLevel}`">{{ simulatorAnalysis.score }} Punkte</span><strong>{{ simulatorIssueCount }} auffällige Werte</strong><b>{{ simulatorResults.length }} {{ simulatorResults.length === 1 ? 'Regel' : 'Regeln' }} ausgelöst</b></div>
        <div v-if="simulatorResults.length" class="simulator-results">
          <article v-for="result in simulatorResults" :key="result.key"><div><span>{{ result.priority }}</span><small>{{ result.ruleName }}</small></div><h4>{{ result.title }}</h4><p><b>{{ result.matchedCount }} passende Werte:</b> {{ result.parameters.join(', ') }}</p><p>{{ result.summary }}</p><ol><li v-for="step in result.steps" :key="step">{{ step }}</li></ol><p>Kontrolle nach {{ result.recheckDays }} Tagen</p><ProductSuggestions :products="simulatorProducts(result)" /></article>
        </div>
        <div v-else class="simulator-empty"><strong>Keine Regel ausgelöst</strong><p>Für diesen Bericht passen aktuell keine aktiven Bedingungen.</p></div>
      </section>

      <footer class="rule-save-footer"><p :class="['save-message', recommendationSaveState.type]" role="status">{{ recommendationSaveState.message }}</p><span>{{ recommendationRules.filter((rule) => rule.active).length }} von {{ recommendationRules.length }} Regeln aktiv</span></footer>
    </section>

    <section v-show="activeArea === 'scales'" class="editor-shell">
      <header class="editor-heading">
        <div><span>Bewertungsgrundlagen</span><h2>Alle Grundlagen im Vergleich</h2><p>Eine Grundlage legt für jedes Element fest, ab wann ein Wert als niedrig, optimal oder erhöht gilt. Kunden wählen sie beim Anlegen eines Aquariums.</p></div>
        <div class="editor-state" :class="{ unsaved: dirtyAreas.scales }"><i></i><span>{{ dirtyAreas.scales ? 'Ungespeicherte Änderungen' : 'Gespeicherter Inhalt' }}</span></div>
      </header>

      <div class="scale-manager">
        <article v-for="scale in scales" :key="scale.id" class="scale-card">
          <div class="scale-card-head">
            <span>{{ scale.builtIn ? 'Standard' : 'Eigene Grundlage' }}</span>
            <button v-if="!scale.builtIn" type="button" class="scale-remove" :aria-label="`${scale.name} löschen`" title="Grundlage löschen" @click="removeScale(scale.id)">×</button>
          </div>
          <label><span>Name</span><input v-model="scale.name" type="text" /></label>
          <label><span>Beschreibung</span><input v-model="scale.description" type="text" placeholder="Wofür eignet sich diese Grundlage?" /></label>
        </article>
        <button type="button" class="scale-new" @click="addScale"><b>+</b><span>Neue Grundlage</span><small>Kopiert die Werte der ersten Grundlage</small></button>
      </div>

      <div class="editor-section scale-matrix">
        <div class="section-label"><span>01</span><div><strong>Schwellenwerte aller Grundlagen</strong><small>{{ filteredScaleParameters.length }} von {{ ANALYSIS_PARAMETERS.length }} Elementen · {{ visibleScales.length }} von {{ scales.length }} Grundlagen</small></div></div>

        <div class="matrix-toolbar">
          <label class="matrix-search">
            <span class="visually-hidden">Element suchen</span>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" width="15" height="15"><circle cx="9" cy="9" r="6" /><path d="M15 15l-3-3" /></svg>
            <input v-model="scaleSearch" type="search" placeholder="Element suchen…" />
          </label>
          <select v-model="scaleGroupFilter" aria-label="Nach Elementgruppe filtern">
            <option value="">Alle Gruppen</option>
            <option v-for="group in ANALYSIS_GROUPS" :key="group.key" :value="group.key">{{ group.label }}</option>
          </select>
          <div class="matrix-density" role="group" aria-label="Detailgrad">
            <button type="button" :class="{ active: scaleDensity === 'compact' }" @click="scaleDensity = 'compact'">Optimum</button>
            <button type="button" :class="{ active: scaleDensity === 'full' }" @click="scaleDensity = 'full'">Alle Grenzen</button>
          </div>
        </div>

        <div class="matrix-scales" role="group" aria-label="Grundlagen ein- oder ausblenden">
          <button
            v-for="scale in scales"
            :key="scale.id"
            type="button"
            :class="['matrix-scale-chip', { off: hiddenScaleIds.includes(scale.id) }]"
            :aria-pressed="!hiddenScaleIds.includes(scale.id)"
            @click="toggleScaleVisibility(scale.id)"
          >{{ scale.name }}</button>
        </div>

        <p v-if="!visibleScales.length" class="matrix-hint">Alle Grundlagen sind ausgeblendet. Wählen Sie mindestens eine aus.</p>

        <template v-else-if="filteredScaleParameters.length">
          <div class="scale-table-wrap">
            <table class="scale-table">
              <thead>
                <tr>
                  <th scope="col" rowspan="2" class="scale-element-col">Element</th>
                  <th v-for="scale in visibleScales" :key="scale.id" scope="colgroup" :colspan="visibleFields.length" class="scale-group-head">{{ scale.name }}</th>
                </tr>
                <tr>
                  <template v-for="scale in visibleScales" :key="`${scale.id}-fields`">
                    <th v-for="(field, index) in visibleFields" :key="`${scale.id}-${field.key}`" scope="col" :title="field.label" :class="{ 'scale-group-start': index === 0, optimum: field.key === 'min' || field.key === 'max' }">{{ field.short }}</th>
                  </template>
                </tr>
              </thead>
              <tbody v-for="group in groupedScaleParameters" :key="group.key">
                <tr class="scale-group-row">
                  <th :colspan="1 + visibleScales.length * visibleFields.length" scope="colgroup">{{ group.label }} <b>{{ group.parameters.length }}</b></th>
                </tr>
                <tr v-for="parameter in group.parameters" :key="parameter.key">
                  <th scope="row" class="scale-element-col"><strong>{{ parameter.label }}</strong><small>{{ parameter.symbol }} · {{ content[parameter.key]?.unit || parameter.unit }}</small></th>
                  <template v-for="scale in visibleScales" :key="`${scale.id}-${parameter.key}`">
                    <td v-for="(field, index) in visibleFields" :key="`${scale.id}-${parameter.key}-${field.key}`" :class="{ 'scale-group-start': index === 0, optimum: field.key === 'min' || field.key === 'max' }">
                      <input v-model.number="scale.thresholds[parameter.key][field.key]" type="number" step="any" :aria-label="`${parameter.label} · ${scale.name} · ${field.label}`" />
                    </td>
                  </template>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="scale-cards">
            <article v-for="parameter in filteredScaleParameters" :key="parameter.key" class="scale-card-row">
              <header><strong>{{ parameter.label }}</strong><small>{{ parameter.symbol }} · {{ content[parameter.key]?.unit || parameter.unit }}</small></header>
              <div v-for="scale in visibleScales" :key="scale.id" class="scale-card-scale">
                <span>{{ scale.name }}</span>
                <div>
                  <label v-for="field in visibleFields" :key="field.key" :class="{ optimum: field.key === 'min' || field.key === 'max' }">
                    <small>{{ field.short }}</small>
                    <input v-model.number="scale.thresholds[parameter.key][field.key]" type="number" step="any" :aria-label="`${parameter.label} · ${scale.name} · ${field.label}`" />
                  </label>
                </div>
              </div>
            </article>
          </div>
        </template>

        <p v-else class="matrix-hint">Kein Element passt zu dieser Suche.</p>
        <p v-if="scaleTableError" class="field-error" role="status">{{ scaleTableError }}</p>
      </div>
    </section>

    <section v-show="activeArea === 'texts'" class="editor-shell">
      <header class="editor-heading">
        <div><span>Empfehlungstexte</span><h2>Karten im Bericht befüllen</h2><p>Titel, Maßnahmenliste und Tipps jeder direkten Empfehlung. Welche Karte erscheint, entscheidet der Score des Messwerts.</p></div>
        <div class="editor-state" :class="{ unsaved: dirtyAreas.texts }"><i></i><span>{{ dirtyAreas.texts ? 'Ungespeicherte Änderungen' : 'Gespeicherter Inhalt' }}</span></div>
      </header>

      <div class="editor-layout">
        <aside class="element-browser">
          <nav aria-label="Empfehlung auswählen">
            <button v-for="template in templates" :key="template.key" type="button" :class="{ active: selectedTemplateKey === template.key }" @click="selectedTemplateKey = template.key">
              <span>{{ template.name.slice(0, 2).toUpperCase() }}</span><div><strong>{{ template.name }}</strong><small>{{ template.tips.length }} Tipp(s)</small></div><i>›</i>
            </button>
          </nav>
        </aside>

        <main class="content-editor">
          <header>
            <div class="element-identity"><span>{{ selectedTemplate.name.slice(0, 2).toUpperCase() }}</span><div><small>Direkte Empfehlung</small><h3>{{ selectedTemplate.name }}</h3></div></div>
            <button type="button" class="reset-button" @click="resetTemplates">Standardtexte wiederherstellen</button>
          </header>

          <div class="editor-section">
            <div class="section-label"><span>01</span><div><strong>Überschrift &amp; Aktion</strong><small>Kopf der Karte und Beschriftung des Buttons</small></div></div>
            <div class="technical-fields">
              <label class="wide"><span>Titel</span><input v-model="selectedTemplate.title" type="text" /></label>
              <label><span>Kicker</span><input v-model="selectedTemplate.kicker" type="text" /></label>
              <label><span>Button</span><input v-model="selectedTemplate.actionLabel" type="text" /></label>
              <label><span>Kontrolle in Tagen</span><input v-model.number="selectedTemplate.recheckDays" type="number" min="1" max="90" /></label>
            </div>
            <p class="technical-note">Der Fließtext nennt automatisch die betroffenen Elemente und wird nicht redaktionell gepflegt.</p>
          </div>

          <div class="editor-section">
            <div class="section-label"><span>02</span><div><strong>Blaue Infobox</strong><small>Handlungsanweisung — mehrere Einträge erscheinen als Optionen</small></div></div>
            <div class="option-editor">
              <article v-for="(option, index) in selectedTemplate.options" :key="index">
                <header>
                  <b>{{ index + 1 }}</b>
                  <input v-model="option.label" type="text" placeholder="Überschrift · optional, z. B. „Option A: Standard“" />
                  <button type="button" :aria-label="`Eintrag ${index + 1} entfernen`" title="Entfernen" @click="selectedTemplate.options.splice(index, 1)">×</button>
                </header>
                <textarea v-model="option.text" rows="3" placeholder="Text der Option"></textarea>
                <input v-model="option.actionLabel" type="text" placeholder="Button-Text · leer lassen für keinen Button" />
              </article>
              <p v-if="!selectedTemplate.options.length" class="option-editor-empty">Noch kein Eintrag. Die blaue Box bleibt im Bericht ausgeblendet.</p>
              <button type="button" class="option-editor-add" @click="selectedTemplate.options.push({ label: '', text: '', actionLabel: '' })">Eintrag hinzufügen</button>
            </div>
            <p class="technical-note">Trägt ein Eintrag einen Button-Text, übernimmt dieser Button die Aktion der Karte. Der Button im Kartenfuß entfällt dann.</p>
          </div>

          <div class="editor-section">
            <div class="section-label"><span>03</span><div><strong>Maßnahmenblock</strong><small>Der hervorgehobene Kasten unter dem Text</small></div></div>
            <label><span>Überschrift des Blocks</span><small>Zum Beispiel „Mögliche Quellen“ oder „Empfohlene Maßnahmen“. Leer lassen, um den Block auszublenden.</small><input v-model="selectedTemplate.detailLabel" type="text" /></label>
            <div v-if="selectedTemplate.dynamicDetail" class="template-dynamic-note"><i>i</i><p>Die Einträge dieses Blocks berechnet das System je Element aus dem Score (zum Beispiel „Brom −20 %“). Nur die Überschrift ist redaktionell.</p></div>
            <ListEditor v-else v-model="selectedTemplate.detailItems" placeholder="Maßnahme oder Quelle eingeben" add-label="Eintrag hinzufügen" />
          </div>

          <div class="editor-section">
            <div class="section-label"><span>04</span><div><strong>Tipps</strong><small>Hinweiskasten neben den Maßnahmen</small></div></div>
            <ListEditor v-model="selectedTemplate.tips" placeholder="Tipp eingeben" add-label="Tipp hinzufügen" />
          </div>

          <section class="content-preview">
            <div><span>Vorschau</span><strong>{{ selectedTemplate.title }}</strong></div>
            <p v-for="(option, index) in selectedTemplate.options" :key="index"><b v-if="option.label">{{ option.label }}:</b> {{ option.text }}</p>
            <p v-if="selectedTemplate.detailLabel"><b>{{ selectedTemplate.detailLabel }}:</b> {{ selectedTemplate.dynamicDetail ? 'automatisch je Element' : selectedTemplate.detailItems.join(' · ') || '—' }}</p>
            <div class="preview-actions">
              <article><span>Tipps</span><p>{{ selectedTemplate.tips.join(' · ') || 'Keine Tipps hinterlegt.' }}</p></article>
            </div>
          </section>
        </main>
      </div>
    </section>

    <section v-show="activeArea === 'support'" class="editor-shell support-editor-shell">
      <header class="editor-heading support-editor-heading">
        <div><span>Hilfe &amp; Support</span><h2>FAQ-Verwaltung</h2><p>Fragen ergänzen, Antworten aktualisieren oder nicht mehr benötigte Einträge entfernen.</p></div>
        <button class="btn btn-primary" type="button" @click="addFaq">+ FAQ hinzufügen</button>
      </header>

      <div v-if="supportContent.faqs.length" class="faq-admin-list">
        <article v-for="(faq, index) in supportContent.faqs" :key="faq.id" class="faq-admin-card">
          <header>
            <button type="button" class="faq-expand" :aria-expanded="expandedFaqId === faq.id" :aria-controls="`faq-editor-${faq.id}`" @click="expandedFaqId = expandedFaqId === faq.id ? '' : faq.id"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ faq.question || 'Neue Frage' }}</strong><i aria-hidden="true">{{ expandedFaqId === faq.id ? '−' : '+' }}</i></button>
            <div class="faq-card-actions">
              <button type="button" :disabled="index === 0" title="Nach oben" aria-label="FAQ nach oben verschieben" @click="moveFaq(index, -1)">↑</button>
              <button type="button" :disabled="index === supportContent.faqs.length - 1" title="Nach unten" aria-label="FAQ nach unten verschieben" @click="moveFaq(index, 1)">↓</button>
              <button type="button" class="remove-faq" title="FAQ entfernen" aria-label="FAQ entfernen" @click="removeFaq(index)">Entfernen</button>
            </div>
          </header>
          <div v-show="expandedFaqId === faq.id" :id="`faq-editor-${faq.id}`" class="faq-fields">
            <label class="faq-category"><span>Kategorie</span><input v-model="faq.category" type="text" placeholder="z. B. Analyse" /></label>
            <label><span>Frage</span><input v-model="faq.question" type="text" placeholder="Welche Frage soll beantwortet werden?" /></label>
            <label class="faq-answer"><span>Antwort</span><textarea v-model="faq.answer" rows="4" placeholder="Klare und hilfreiche Antwort…"></textarea></label>
          </div>
        </article>
      </div>
      <div v-else class="faq-admin-empty"><strong>Noch keine FAQs vorhanden</strong><p>Fügen Sie die erste Frage hinzu, damit sie in Hilfe &amp; Support erscheint.</p><button class="btn btn-primary" type="button" @click="addFaq">Erste FAQ hinzufügen</button></div>

      <footer class="support-editor-footer">
        <p :class="['save-message', supportSaveState.type]" role="status">{{ supportSaveState.message }}</p>
        <span>{{ supportContent.faqs.length }} {{ supportContent.faqs.length === 1 ? 'Eintrag' : 'Einträge' }}</span>
      </footer>
    </section>
    <footer v-if="activeArea !== 'users'" class="admin-save-bar">
      <div><strong>{{ dirtyAreas[activeArea] ? 'Ungespeicherte Änderungen' : 'Alle Änderungen gespeichert' }}</strong><small>{{ saveScope }}</small><p v-if="activeSaveState.message" :class="['save-message', activeSaveState.type]" role="status">{{ activeSaveState.message }}</p></div>
      <div class="save-bar-actions"><button type="button" class="btn btn-ghost" :disabled="!dirtyAreas[activeArea]" @click="discardCurrentArea">Änderungen verwerfen</button><button type="button" class="btn btn-primary" :disabled="!dirtyAreas[activeArea]" @click="saveCurrentArea">{{ saveButtonLabel }}</button></div>
    </footer>

    <section v-if="canManageUsers" v-show="activeArea === 'users'" class="editor-shell user-editor-shell">
      <header class="editor-heading user-editor-heading">
        <div><span>Benutzerverwaltung</span><h2>Konten und Berechtigungen</h2><p>Nutzung einsehen und Rollen mit geschützten Änderungen verwalten.</p></div>
        <div class="user-summary"><span><b>{{ adminUsers.length }}</b>Nutzer</span><span><b>{{ totalUserAnalyses }}</b>Analysen</span><span><b>{{ adminCount }}</b>Admins</span></div>
      </header>

      <div class="user-controls">
        <label><span>Benutzer suchen</span><input v-model="userSearch" type="search" placeholder="Name, Benutzername oder E-Mail…" /></label>
        <label><span>Rolle</span><select v-model="userRoleFilter"><option value="all">Alle Rollen</option><option value="endnutzer">Endnutzer</option><option value="subadmin">Sub-Admin</option><option value="admin">Administrator</option></select></label>
      </div>

      <div v-if="filteredAdminUsers.length" class="user-table-wrap">
        <table class="user-table">
          <thead><tr><th>Benutzer</th><th>Registriert</th><th>Nutzung</th><th>Letzte Aktivität</th><th>Berechtigung</th></tr></thead>
          <tbody>
            <tr v-for="user in filteredAdminUsers" :key="user.id">
              <td><div class="user-identity"><span>{{ userInitials(user) }}</span><div><strong>{{ user.name }}</strong><small>@{{ user.username }} · {{ user.email }}</small></div></div></td>
              <td><strong>{{ formatAdminDate(user.createdAt) }}</strong><small>{{ user.country }} · {{ user.language.toUpperCase() }}</small></td>
              <td><strong>{{ user.analysisCount }} Analysen</strong><small>{{ user.completedAnalysisCount }} fertig · {{ user.aquariumCount }} Aquarien</small></td>
              <td><strong>{{ formatAdminDate(user.lastActivityAt) }}</strong><small v-if="user.lastAnalysisAt">Letzte Analyse {{ formatAdminDate(user.lastAnalysisAt) }}</small><small v-else>Noch keine Analyse</small></td>
              <td>
                <div class="permission-control">
                  <select v-model="pendingRoles[user.id]" :disabled="user.id === auth.user?.id" :aria-label="`Rolle von ${user.name}`"><option value="endnutzer">Endnutzer</option><option value="subadmin">Sub-Admin</option><option value="admin">Administrator</option></select>
                  <button type="button" :disabled="user.id === auth.user?.id || pendingRoles[user.id] === user.role" @click="applyRole(user)">Übernehmen</button>
                </div>
                <small v-if="user.id === auth.user?.id" class="self-role-note">Aktives eigenes Konto</small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="faq-admin-empty"><strong>Keine Benutzer gefunden</strong><p>Passen Sie Suche oder Rollenfilter an.</p></div>
      <p :class="['user-action-message', userActionState.type]" role="status">{{ userActionState.message }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ANALYSIS_PARAMETERS, DEFAULT_PARAMETER_CONTENT, loadAnalysisContent, saveAnalysisContent } from '@/services/analysisContent'
import { ANALYSIS_GROUPS, createDemoAnalysis } from '@/services/analysisCatalog'
import { createSupportFaq, loadSupportContent, saveSupportContent } from '@/services/supportContent'
import { changeAdminUserRole, getAdminUsers } from '@/services/adminUserService'
import { createRecommendationRule, evaluateRecommendationRules, loadRecommendationRules, RECOMMENDATION_SCOPES, saveRecommendationRules } from '@/services/recommendationRules'
import { DOSING_PARAMETERS, loadDosingConfig, resetDosingEntry, saveDosingConfig, recommendedProductsForKeys } from '@/services/dosingConfig'
import { buildDosingPlan } from '@/services/dosingPlan'
import { normalizeDosingEntry } from '@/services/atiDosingDefaults'
import { getAllAnalysisRecords, getAnalysis } from '@/services/analysisStore'
import { dosingEntryErrors, elementEntryError } from '@/services/adminValidation'
import { SCORE_BANDS, THRESHOLD_FIELDS, bandRange, correctionTargetFor, createScale, findScale, loadEvaluationScales, saveEvaluationScales, thresholdOrderError } from '@/services/evaluationScales'
import { loadRecommendationTemplates, resetRecommendationTemplates, saveRecommendationTemplates } from '@/services/recommendationTemplates'
import ProductSuggestions from '@/components/analyses/ProductSuggestions.vue'
import ListEditor from '@/components/admin/ListEditor.vue'
import '@/assets/styles/report-base.css'

const auth = useAuthStore()
const recommendationRulesEnabled = true
const content = reactive(loadAnalysisContent())
const dosingConfig = reactive(loadDosingConfig())
const supportContent = reactive(loadSupportContent())
const expandedFaqId = ref(supportContent.faqs[0]?.id || '')
const recommendationRules = reactive(loadRecommendationRules())
const activeArea = ref('elements')
const selectedKey = ref(ANALYSIS_PARAMETERS[0].key)
const search = ref('')
const saveState = reactive({ message: '', type: '' })
const dosingSaveState = reactive({ message: '', type: '' })
const supportSaveState = reactive({ message: '', type: '' })
const recommendationSaveState = reactive({ message: '', type: '' })
const selectedRecommendationRuleId = ref(recommendationRules[0]?.id || '')
const recommendationSearch = ref('')
const simulatorScenario = ref('medium')
const simulatorReportId = ref('')
const simulatorReports = ref(loadSimulatorReports())
const selectedDosingKey = ref(DOSING_PARAMETERS[0].key)
const dosingSearch = ref('')
const scales = reactive(loadEvaluationScales())
const selectedScaleId = ref(scales[0]?.id || '')
const scaleSearch = ref('')
const scaleGroupFilter = ref('')
const scaleDensity = ref('compact')
const hiddenScaleIds = ref([])
const scaleSaveState = reactive({ message: '', type: '' })
const templates = reactive(loadRecommendationTemplates())
const selectedTemplateKey = ref(templates[0]?.key || '')
const templateSaveState = reactive({ message: '', type: '' })
const previewVolume = ref(420)
const initialDosingTarget = Number(content[DOSING_PARAMETERS[0].key].targetMin) || 0
const initialDosingMaximum = Number(content[DOSING_PARAMETERS[0].key].targetMax) || initialDosingTarget
const previewValue = ref(Math.max(0, initialDosingTarget - Math.max(initialDosingMaximum - initialDosingTarget, Math.abs(initialDosingTarget) * .08, .01)))
const adminUsers = ref(auth.user?.role === 'admin' ? getAdminUsers() : [])
const pendingRoles = reactive(Object.fromEntries(adminUsers.value.map((user) => [user.id, user.role])))
const userSearch = ref('')
const userRoleFilter = ref('all')
const userActionState = reactive({ message: '', type: '' })
const roleLabel = computed(() => auth.user?.role === 'admin' ? 'Administrator' : 'Sub-Admin')
const canManageUsers = computed(() => auth.user?.role === 'admin')
const totalUserAnalyses = computed(() => adminUsers.value.reduce((total, user) => total + user.analysisCount, 0))
const adminCount = computed(() => adminUsers.value.filter((user) => user.role === 'admin').length)
const filteredAdminUsers = computed(() => {
  const query = userSearch.value.trim().toLocaleLowerCase('de-DE')
  return adminUsers.value.filter((user) => {
    if (userRoleFilter.value !== 'all' && user.role !== userRoleFilter.value) return false
    return !query || `${user.name} ${user.username} ${user.email}`.toLocaleLowerCase('de-DE').includes(query)
  })
})
const filteredParameters = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('de-DE')
  return query ? ANALYSIS_PARAMETERS.filter((item) => `${item.label} ${item.symbol} ${item.group}`.toLocaleLowerCase('de-DE').includes(query)) : ANALYSIS_PARAMETERS
})
const filteredRecommendationRules = computed(() => {
  const query = recommendationSearch.value.trim().toLocaleLowerCase('de-DE')
  return recommendationRules.filter((rule) => !query || `${rule.name} ${rule.title} ${scopeLabel(rule.groupKey)}`.toLocaleLowerCase('de-DE').includes(query))
})
const selectedRecommendationRule = computed(() => recommendationRules.find((rule) => rule.id === selectedRecommendationRuleId.value) || null)
const simulatorAnalysis = computed(() => simulatorReports.value.find((report) => report.id === simulatorReportId.value)
  || createDemoAnalysis(`rule-simulator-${simulatorScenario.value}`, simulatorScenario.value))
const simulatorResults = computed(() => evaluateRecommendationRules(simulatorAnalysis.value, recommendationRules))
const simulatorIssueCount = computed(() => simulatorAnalysis.value.parameters.filter((parameter) => parameter.tone !== 'good').length)
const selectedMeta = computed(() => ANALYSIS_PARAMETERS.find((item) => item.key === selectedKey.value) || ANALYSIS_PARAMETERS[0])
const selectedContent = computed(() => content[selectedKey.value])
const selectedElementError = computed(() => elementEntryError(selectedContent.value))
const selectedDosingMeta = computed(() => DOSING_PARAMETERS.find((item) => item.key === selectedDosingKey.value) || DOSING_PARAMETERS[0])
const selectedDosing = computed(() => dosingConfig[selectedDosingKey.value])
const selectedDosingSource = computed(() => normalizeDosingEntry(selectedDosing.value, selectedDosingKey.value))
const selectedDosingErrors = computed(() => dosingEntryErrors(selectedDosing.value))
const formulaErrors = computed(() => ['mlPer100Liters', 'raisesBy', 'maxDailyIncrease'].map((key) => selectedDosingErrors.value[key]).filter(Boolean))
const adminProductPreview = computed(() => selectedDosing.value.productName.trim() ? [{
  parameterKey: selectedDosingKey.value,
  productName: selectedDosing.value.productName,
  productUrl: selectedDosingErrors.value.productUrl ? '' : selectedDosing.value.productUrl ? (/^https?:\/\//i.test(selectedDosing.value.productUrl) ? selectedDosing.value.productUrl : `https://${selectedDosing.value.productUrl}`) : '',
  productImage: selectedDosingErrors.value.productImage ? '' : selectedDosing.value.productImage ? (/^https?:\/\//i.test(selectedDosing.value.productImage) ? selectedDosing.value.productImage : `https://${selectedDosing.value.productImage}`) : '',
}] : [])
const selectedDosingTarget = computed(() => Number(content[selectedDosingKey.value]?.targetMin) || 0)
const activeDosingCount = computed(() => Object.values(dosingConfig).filter((entry) => entry.enabled).length)
const verifiedDosingCount = computed(() => Object.values(dosingConfig).filter((entry) => entry.enabled && entry.verified && !Object.keys(dosingEntryErrors(entry)).length).length)
const filteredDosingParameters = computed(() => {
  const query = dosingSearch.value.trim().toLocaleLowerCase('de-DE')
  return DOSING_PARAMETERS.filter((parameter) => !query || `${parameter.label} ${parameter.symbol} ${parameter.group} ${dosingConfig[parameter.key].productName}`.toLocaleLowerCase('de-DE').includes(query))
})
const dosingFormulaExplanation = computed(() => {
  const dosing = selectedDosing.value
  if (!(Number(dosing.mlPer100Liters) > 0) || !(Number(dosing.raisesBy) > 0)) return 'Vervollständigen Sie die Werte, um die Produktwirkung eindeutig zu definieren.'
  return `${formatDosingNumber(dosing.mlPer100Liters)} ml pro 100 Liter erhöhen ${selectedDosingMeta.value.label} um ${formatDosingNumber(dosing.raisesBy)} ${selectedDosingMeta.value.unit}. Der Plan begrenzt die Korrektur auf ${formatDosingNumber(dosing.maxDailyIncrease)} ${selectedDosingMeta.value.unit} pro Tag.`
})
const dosingPreview = computed(() => {
  if (!selectedDosing.value.enabled || Object.keys(selectedDosingErrors.value).length || previewValue.value === '' || previewValue.value == null || !Number.isFinite(Number(previewValue.value)) || !(Number(previewVolume.value) > 0)) return { ready: false }
  const meta = selectedDosingMeta.value
  const item = buildDosingPlan([{
    key: meta.key, label: meta.label, groupKey: meta.groupKey, unit: content[meta.key]?.unit || meta.unit, precision: content[meta.key]?.precision ?? meta.precision,
    value: Number(previewValue.value), referenceRange: { min: selectedDosingTarget.value, max: Number(content[meta.key]?.targetMax) },
  }], Number(previewVolume.value), dosingConfig)[0]
  return item?.dose ? { ready: true, ...item.dose } : { ready: false }
})
const dosingPreviewReason = computed(() => {
  if (!selectedDosing.value.enabled) return 'Das Produkt kann empfohlen werden. Eine konkrete Dosierung ist nicht konfiguriert.'
  if (Object.keys(selectedDosingErrors.value).length) return Object.values(selectedDosingErrors.value).join(' ')
  if (!selectedDosing.value.verified) return 'Die Dosierangaben müssen einmalig geprüft werden. Danach berechnen alle passenden Analysen die Mengen automatisch.'
  if (selectedDosing.value.unit && selectedDosing.value.unit !== content[selectedDosingKey.value]?.unit) return 'Produkteinheit und Analyseeinheit stimmen nicht überein. Bitte die Messwert-Konfiguration prüfen.'
  return 'Wählen Sie ein gültiges Aquariumvolumen und einen aktuellen Wert unter dem Zielwert.'
})

const selectedScale = computed(() => findScale(scales, selectedScaleId.value) || scales[0])
const selectedTemplate = computed(() => templates.find((template) => template.key === selectedTemplateKey.value) || templates[0])
const selectedThresholds = computed(() => selectedScale.value.thresholds[selectedKey.value])
const thresholdError = computed(() => thresholdOrderError(selectedThresholds.value))
const elementScaleError = computed(() => {
  for (const scale of scales) {
    const error = thresholdOrderError(scale.thresholds[selectedKey.value])
    if (error) return `${scale.name}: ${error}`
  }
  return ''
})
const correctionTarget = computed(() => correctionTargetFor(selectedThresholds.value))
const visibleScales = computed(() => scales.filter((scale) => !hiddenScaleIds.value.includes(scale.id)))
const visibleFields = computed(() => (
  scaleDensity.value === 'compact' ? THRESHOLD_FIELDS.filter((field) => field.key === 'min' || field.key === 'max') : THRESHOLD_FIELDS
))
const filteredScaleParameters = computed(() => {
  const query = scaleSearch.value.trim().toLowerCase()
  return ANALYSIS_PARAMETERS.filter((parameter) => {
    if (scaleGroupFilter.value && parameter.groupKey !== scaleGroupFilter.value) return false
    return !query || `${parameter.label} ${parameter.symbol} ${parameter.group}`.toLowerCase().includes(query)
  })
})
const groupedScaleParameters = computed(() => ANALYSIS_GROUPS
  .map((group) => ({ ...group, parameters: filteredScaleParameters.value.filter((parameter) => parameter.groupKey === group.key) }))
  .filter((group) => group.parameters.length))
function toggleScaleVisibility(id) {
  const hidden = hiddenScaleIds.value
  hiddenScaleIds.value = hidden.includes(id) ? hidden.filter((entry) => entry !== id) : [...hidden, id]
}
const scaleTableError = computed(() => {
  for (const parameter of ANALYSIS_PARAMETERS) {
    const error = thresholdOrderError(selectedScale.value.thresholds[parameter.key])
    if (error) return `${parameter.label}: ${error}`
  }
  return ''
})
function bandRangeLabel(score) {
  const [from, to] = bandRange(score, selectedThresholds.value)
  const unit = selectedContent.value.unit
  if (from === null) return `< ${to} ${unit}`
  if (to === null) return `> ${from} ${unit}`
  return `${from} – ${to} ${unit}`
}
function addScale() {
  const scale = createScale(`Grundlage ${scales.length + 1}`, selectedScale.value)
  scales.push(scale)
  selectedScaleId.value = scale.id
}
function removeScale(id) {
  const index = scales.findIndex((scale) => scale.id === id)
  if (index < 0 || scales[index].builtIn) return
  scales.splice(index, 1)
  hiddenScaleIds.value = hiddenScaleIds.value.filter((entry) => entry !== id)
  selectedScaleId.value = scales[0]?.id || ''
}
function saveTemplates() {
  saveRecommendationTemplates(templates)
  markSaved('texts')
  templateSaveState.message = 'Empfehlungstexte gespeichert.'
  templateSaveState.type = 'success'
}
function resetTemplates() {
  templates.splice(0, templates.length, ...resetRecommendationTemplates())
  templateSaveState.message = 'Standardtexte wiederhergestellt. Zum Übernehmen speichern.'
  templateSaveState.type = ''
}
function saveScales() {
  if (scaleTableError.value) {
    scaleSaveState.message = scaleTableError.value
    scaleSaveState.type = 'error'
    return
  }
  saveEvaluationScales(scales)
  markSaved('scales')
  scaleSaveState.message = `${scales.length} Bewertungsgrundlagen gespeichert.`
  scaleSaveState.type = 'success'
}

const areaData = { elements: content, dosing: dosingConfig, recommendations: recommendationRules, support: supportContent, scales, texts: templates }
const savedSnapshots = reactive(Object.fromEntries(Object.entries(areaData).map(([key, value]) => [key, JSON.stringify(value)])))
const dirtyAreas = computed(() => Object.fromEntries(Object.entries(areaData).map(([key, value]) => [key, JSON.stringify(value) !== savedSnapshots[key]])))
const activeSaveState = computed(() => ({ elements: saveState, dosing: dosingSaveState, recommendations: recommendationSaveState, support: supportSaveState, scales: scaleSaveState, texts: templateSaveState }[activeArea.value] || {}))
const saveButtonLabel = computed(() => ({ elements: 'Alle Elementänderungen speichern', dosing: 'Alle Produktänderungen speichern', recommendations: 'Alle Regeln speichern', support: 'Alle FAQs speichern', scales: 'Alle Bewertungsgrundlagen speichern', texts: 'Alle Empfehlungstexte speichern' }[activeArea.value]))
const saveScope = computed(() => 'Speichert alle Änderungen in diesem Bereich. Andere Bereiche bleiben unverändert.')
function saveCurrentArea() { ({ elements: save, dosing: saveDosing, recommendations: saveRecommendations, support: saveSupport, scales: saveScales, texts: saveTemplates }[activeArea.value])?.() }
function markSaved(area) { savedSnapshots[area] = JSON.stringify(areaData[area]) }
function discardCurrentArea() {
  const area = activeArea.value
  const saved = JSON.parse(savedSnapshots[area])
  if (area === 'scales') {
    scales.splice(0, scales.length, ...saved)
    if (!scales.some((scale) => scale.id === selectedScaleId.value)) selectedScaleId.value = scales[0]?.id || ''
  } else if (area === 'texts') {
    templates.splice(0, templates.length, ...saved)
    if (!templates.some((template) => template.key === selectedTemplateKey.value)) selectedTemplateKey.value = templates[0]?.key || ''
  } else if (area === 'recommendations') {
    recommendationRules.splice(0, recommendationRules.length, ...saved)
    if (!recommendationRules.some((rule) => rule.id === selectedRecommendationRuleId.value)) selectedRecommendationRuleId.value = recommendationRules[0]?.id || ''
  } else {
    Object.assign(areaData[area], saved)
    if (area === 'support' && !supportContent.faqs.some((faq) => faq.id === expandedFaqId.value)) expandedFaqId.value = supportContent.faqs[0]?.id || ''
  }
  activeSaveState.value.message = 'Ungespeicherte Änderungen wurden verworfen.'
  activeSaveState.value.type = ''
}
function loadSimulatorReports() {
  return getAllAnalysisRecords().filter((record) => record.status === 'completed').map((record) => getAnalysis(record.id, record.ownerId)).filter(Boolean)
}
function simulatorProducts(result) { return recommendedProductsForKeys(result.parameterKeys, simulatorAnalysis.value.parameters || []) }
function dosingStatus(key) {
  const entry = dosingConfig[key]
  const errors = dosingEntryErrors(entry)
  if (errors.productName || errors.productUrl || errors.productImage) return 'Produktangaben prüfen'
  if (!entry.enabled) return 'Ohne ml-Dosierung'
  if (Object.keys(errors).length) return 'Formel unvollständig'
  return entry.verified ? 'Dosierung freigegeben' : 'Freigabe fehlt'
}
function restoreStandardProduct() {
  const standard = resetDosingEntry(selectedDosingKey.value)
  Object.assign(selectedDosing.value, { productOverride: false, productName: standard.productName, productUrl: standard.productUrl, productImage: standard.productImage })
}

function resetSelected() {
  Object.assign(content[selectedKey.value], DEFAULT_PARAMETER_CONTENT[selectedKey.value])
  saveState.message = 'Standardtext geladen. Speichern Sie, um ihn zu veröffentlichen.'
  saveState.type = ''
}
function save() {
  if (!['admin', 'subadmin'].includes(auth.user?.role)) {
    saveState.message = 'Keine Berechtigung zum Bearbeiten dieser Inhalte.'
    saveState.type = 'error'
    return
  }
  const invalid = ANALYSIS_PARAMETERS.find((parameter) => elementEntryError(content[parameter.key]))
  if (invalid) {
    selectedKey.value = invalid.key
    saveState.message = `${invalid.label}: ${elementEntryError(content[invalid.key])}`
    saveState.type = 'error'
    return
  }
  const saved = saveAnalysisContent(content)
  for (const parameter of ANALYSIS_PARAMETERS) Object.assign(content[parameter.key], saved[parameter.key])
  saveState.message = 'Analyse-Inhalte wurden gespeichert.'
  saveState.type = 'success'
  markSaved('elements')
  simulatorReports.value = loadSimulatorReports()
}
function selectDosingParameter(key) {
  selectedDosingKey.value = key
  const target = Number(content[key]?.targetMin) || 0
  const maximum = Number(content[key]?.targetMax) || target
  previewValue.value = Math.max(0, target - Math.max(maximum - target, Math.abs(target) * .08, .01))
  dosingSaveState.message = ''
  dosingSaveState.type = ''
}
function resetSelectedDosing() {
  Object.assign(dosingConfig[selectedDosingKey.value], resetDosingEntry(selectedDosingKey.value))
  dosingSaveState.message = 'Eintrag zurückgesetzt. Speichern Sie, um die Änderung zu veröffentlichen.'
  dosingSaveState.type = ''
}
function formatDosingNumber(value) {
  return Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 6 })
}
function saveDosing() {
  if (!['admin', 'subadmin'].includes(auth.user?.role)) {
    dosingSaveState.message = 'Keine Berechtigung zum Bearbeiten der Dosierungspläne.'
    dosingSaveState.type = 'error'
    return
  }
  const incompleteKey = DOSING_PARAMETERS.find(({ key }) => Object.keys(dosingEntryErrors(dosingConfig[key])).length)?.key
  if (incompleteKey) {
    selectDosingParameter(incompleteKey)
    dosingSaveState.message = `${selectedDosingMeta.value.label}: ${Object.values(dosingEntryErrors(dosingConfig[incompleteKey])).join(' ')}`
    dosingSaveState.type = 'error'
    return
  }
  const saved = saveDosingConfig(dosingConfig)
  for (const parameter of DOSING_PARAMETERS) Object.assign(dosingConfig[parameter.key], saved[parameter.key])
  dosingSaveState.message = 'Dosierungspläne wurden gespeichert und werden in Kundenberichten verwendet.'
  dosingSaveState.type = 'success'
  markSaved('dosing')
}
function addRecommendationRule() {
  const rule = createRecommendationRule()
  recommendationRules.push(rule)
  selectedRecommendationRuleId.value = rule.id
  recommendationSaveState.message = 'Neue Regel angelegt. Definieren Sie Auslöser und Maßnahme.'
  recommendationSaveState.type = ''
}
function removeRecommendationRule() {
  const index = recommendationRules.findIndex((rule) => rule.id === selectedRecommendationRuleId.value)
  if (index < 0) return
  recommendationRules.splice(index, 1)
  selectedRecommendationRuleId.value = recommendationRules[Math.min(index, recommendationRules.length - 1)]?.id || ''
  recommendationSaveState.message = 'Regel entfernt. Speichern Sie, um die Änderung zu veröffentlichen.'
  recommendationSaveState.type = ''
}
function updateRuleSteps(event) {
  if (!selectedRecommendationRule.value) return
  selectedRecommendationRule.value.steps = event.target.value.split('\n')
}
function setRuleTrigger(event) {
  if (!selectedRecommendationRule.value) return
  selectedRecommendationRule.value.tones = event.target.value === 'critical' ? ['critical'] : ['watch', 'critical']
}
function ruleTrigger(rule) {
  return rule.tones?.includes('watch') ? 'watch-critical' : 'critical'
}
function setRuleDirection(event) {
  if (!selectedRecommendationRule.value) return
  selectedRecommendationRule.value.directions = event.target.value === 'both' ? ['low', 'high'] : [event.target.value]
}
function ruleDirection(rule) {
  return rule.directions?.length === 1 ? rule.directions[0] : 'both'
}
function ruleDirectionLabel(rule) {
  return { low: 'nur zu niedrig', high: 'nur zu hoch', both: 'zu niedrig oder zu hoch' }[ruleDirection(rule)]
}
function scopeLabel(key) {
  return RECOMMENDATION_SCOPES.find((scope) => scope.key === key)?.label || key
}
function saveRecommendations() {
  if (!['admin', 'subadmin'].includes(auth.user?.role)) {
    recommendationSaveState.message = 'Keine Berechtigung zum Bearbeiten dieser Regeln.'
    recommendationSaveState.type = 'error'
    return
  }
  const incomplete = recommendationRules.find((rule) => !rule.name.trim() || !rule.title.trim() || !rule.summary.trim() || !rule.why.trim() || !rule.steps.some((step) => step.trim()) || !(Number(rule.minimumMatches) >= 1) || !(Number(rule.recheckDays) >= 1))
  if (incomplete) {
    selectedRecommendationRuleId.value = incomplete.id
    recommendationSaveState.message = 'Bitte alle Texte und mindestens einen Schritt ausfüllen. Trefferzahl und Kontrollintervall müssen mindestens 1 sein.'
    recommendationSaveState.type = 'error'
    return
  }
  const selectedId = selectedRecommendationRuleId.value
  const saved = saveRecommendationRules(recommendationRules)
  recommendationRules.splice(0, recommendationRules.length, ...saved)
  selectedRecommendationRuleId.value = recommendationRules.some((rule) => rule.id === selectedId) ? selectedId : recommendationRules[0]?.id || ''
  recommendationSaveState.message = 'Regeln gespeichert. Fertige Berichte verwenden sie ab sofort.'
  recommendationSaveState.type = 'success'
  markSaved('recommendations')
}
function addFaq() {
  const faq = createSupportFaq()
  supportContent.faqs.push(faq)
  expandedFaqId.value = faq.id
  supportSaveState.message = 'Neue FAQ hinzugefügt. Ergänzen Sie Frage und Antwort.'
  supportSaveState.type = ''
}
function removeFaq(index) {
  const removedId = supportContent.faqs[index].id
  supportContent.faqs.splice(index, 1)
  if (removedId === expandedFaqId.value) expandedFaqId.value = supportContent.faqs[Math.min(index, supportContent.faqs.length - 1)]?.id || ''
  supportSaveState.message = 'FAQ entfernt. Speichern Sie, um die Änderung zu veröffentlichen.'
  supportSaveState.type = ''
}
function moveFaq(index, direction) {
  const target = index + direction
  if (target < 0 || target >= supportContent.faqs.length) return
  const [faq] = supportContent.faqs.splice(index, 1)
  supportContent.faqs.splice(target, 0, faq)
  supportSaveState.message = 'Reihenfolge geändert. Speichern Sie, um sie zu veröffentlichen.'
  supportSaveState.type = ''
}
function saveSupport() {
  if (!['admin', 'subadmin'].includes(auth.user?.role)) {
    supportSaveState.message = 'Keine Berechtigung zum Bearbeiten dieser Inhalte.'
    supportSaveState.type = 'error'
    return
  }
  const incomplete = supportContent.faqs.find((faq) => !faq.category.trim() || !faq.question.trim() || !faq.answer.trim())
  if (incomplete) {
    expandedFaqId.value = incomplete.id
    supportSaveState.message = 'Bitte Kategorie, Frage und Antwort bei allen FAQs ausfüllen.'
    supportSaveState.type = 'error'
    return
  }
  const saved = saveSupportContent(supportContent)
  supportContent.faqs.splice(0, supportContent.faqs.length, ...saved.faqs)
  supportSaveState.message = 'FAQs wurden in Hilfe & Support veröffentlicht.'
  supportSaveState.type = 'success'
  markSaved('support')
}
function openUserManagement() {
  activeArea.value = 'users'
  refreshAdminUsers()
}
function refreshAdminUsers() {
  if (!canManageUsers.value) return
  adminUsers.value = getAdminUsers()
  for (const user of adminUsers.value) pendingRoles[user.id] = user.role
}
function applyRole(user) {
  userActionState.message = ''
  try {
    adminUsers.value = changeAdminUserRole(auth.user.id, user.id, pendingRoles[user.id])
    for (const item of adminUsers.value) pendingRoles[item.id] = item.role
    userActionState.message = `Berechtigung von ${user.name} wurde auf ${roleName(pendingRoles[user.id])} geändert.`
    userActionState.type = 'success'
  } catch (error) {
    pendingRoles[user.id] = user.role
    userActionState.message = error?.error || 'Berechtigung konnte nicht geändert werden.'
    userActionState.type = 'error'
  }
}
function roleName(role) {
  return { endnutzer: 'Endnutzer', subadmin: 'Sub-Admin', admin: 'Administrator' }[role] || role
}
function userInitials(user) {
  return String(user.name || user.username || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}
function formatAdminDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.admin-settings { display: grid; gap: 18px; }
.admin-hero { display: flex; justify-content: space-between; gap: 26px; padding: clamp(24px,4vw,34px); border-radius: 26px; background: #0a1b43; color: #fff; box-shadow: var(--shadow); }
.admin-hero > div:first-child > span,.admin-role > span,.editor-heading > div > span { color: var(--teal-200); font-size: 10px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }.admin-hero h1 { max-width: 720px; margin-top: 6px; font-size: clamp(34px,5vw,52px); line-height: 1; letter-spacing: -.04em; }.admin-hero p { max-width: 680px; margin-top: 10px; color: rgba(255,255,255,.68); line-height: 1.55; }
.admin-role { min-width: 220px; height: fit-content; padding: 17px; border: 1px solid rgba(255,255,255,.14); border-radius: 18px; background: rgba(255,255,255,.08); }.admin-role strong,.admin-role em { display: block; }.admin-role strong { margin-top: 5px; font-size: 20px; }.admin-role em { margin-top: 4px; color: rgba(255,255,255,.58); font-size: 11px; font-style: normal; }
.settings-tabs { display: grid; grid-template-columns: repeat(auto-fit,minmax(210px,1fr)); gap: 10px; padding: 6px; border: 1px solid var(--border); border-radius: 18px; background: #fff; box-shadow: var(--shadow); }.settings-tabs button { display: grid; gap: 2px; padding: 13px 16px; border: 0; border-radius: 13px; background: transparent; color: var(--text-muted); text-align: left; cursor: pointer; }.settings-tabs button:hover { background: #f5f9fc; }.settings-tabs button.active { background: var(--teal-50); color: var(--brand-blue); box-shadow: inset 3px 0 var(--brand-blue); }.settings-tabs span { font-size: 13px; font-weight: 900; }.settings-tabs small { font-size: 9px; font-weight: 700; opacity: .72; }
.editor-shell { padding: 22px; border: 1px solid var(--border); border-radius: 23px; background: #fff; box-shadow: var(--shadow); }.editor-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }.editor-heading > div > span { color: var(--teal-700); }.editor-heading h2 { margin-top: 3px; color: var(--text); font-size: 25px; }.editor-heading p { margin-top: 4px; color: var(--text-muted); font-size: 12px; }.editor-state { display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 10px; font-weight: 800; }.editor-state i { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }
.editor-layout { display: grid; grid-template-columns: 230px minmax(0,1fr); gap: 18px; align-items: start; }.element-browser { position: sticky; top: calc(var(--topbar-height, 68px) + 18px); display: grid; grid-template-rows: auto minmax(0,1fr); gap: 10px; max-height: calc(100vh - var(--topbar-height, 68px) - 36px); min-height: 0; }.element-browser > label { display: grid; gap: 5px; }.element-browser label span { color: var(--text-muted); font-size: 10px; font-weight: 800; }.element-browser input { width: 100%; min-height: 40px; padding: 0 11px; border: 1px solid var(--border); border-radius: 10px; outline: 0; }.element-browser input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.element-browser nav { display: grid; align-content: start; gap: 6px; min-height: 0; padding: 2px 5px 8px 2px; overflow-y: auto; overscroll-behavior: contain; scrollbar-color: var(--teal-400) transparent; scrollbar-width: thin; }.element-browser nav::-webkit-scrollbar { width: 6px; }.element-browser nav::-webkit-scrollbar-thumb { border-radius: 999px; background: var(--teal-400); }.element-browser nav button { display: grid; grid-template-columns: 38px minmax(0,1fr) auto; align-items: center; gap: 9px; padding: 9px; border: 1px solid transparent; border-radius: 12px; background: #f5f9fc; color: var(--text); text-align: left; cursor: pointer; }.element-browser nav button:hover { border-color: var(--teal-400); }.element-browser nav button.active { border-color: var(--brand-blue); background: var(--teal-50); box-shadow: inset 3px 0 var(--brand-blue); }.element-browser nav button > span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; background: #fff; color: var(--brand-blue); font-size: 10px; font-weight: 900; }.element-browser nav strong,.element-browser nav small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.element-browser nav strong { font-size: 12px; }.element-browser nav small { margin-top: 2px; color: var(--text-muted); font-size: 9px; }.element-browser nav i { color: var(--text-muted); font-style: normal; }
.content-editor { min-width: 0; display: grid; gap: 14px; padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: #f8fbfe; }.content-editor > header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-bottom: 13px; border-bottom: 1px solid var(--border); }.element-identity { display: flex; align-items: center; gap: 11px; }.element-identity > span { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--teal-50); color: var(--brand-blue); font-size: 11px; font-weight: 900; }.element-identity small { color: var(--teal-700); font-size: 9px; font-weight: 800; text-transform: uppercase; }.element-identity h3 { margin-top: 2px; color: var(--text); font-size: 22px; }.reset-button { padding: 7px 9px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--brand-blue); font-size: 10px; font-weight: 800; cursor: pointer; }.reset-button:hover { border-color: var(--brand-blue); }
.editor-section { display: grid; gap: 11px; padding: 15px; border: 1px solid var(--border); border-radius: 14px; background: #fff; }.section-label { display: flex; align-items: center; gap: 9px; }.section-label > span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: var(--brand-blue); color: #fff; font-size: 9px; font-weight: 900; }.section-label strong,.section-label small { display: block; }.section-label strong { color: var(--text); font-size: 13px; }.section-label small { margin-top: 2px; color: var(--text-muted); font-size: 9px; }.editor-section > label,.recommendation-fields label { display: grid; gap: 5px; }.editor-section label > span { color: var(--text); font-size: 11px; font-weight: 850; }.editor-section label > small { color: var(--text-muted); font-size: 9px; }.editor-section textarea { width: 100%; min-width: 0; resize: vertical; padding: 10px 11px; border: 1px solid var(--border); border-radius: 10px; background: #f8fbfe; color: var(--text); font: inherit; font-size: 12px; line-height: 1.5; outline: 0; }.editor-section textarea:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.recommendation-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.recommendation-fields label { padding: 11px; border-top: 3px solid #e85d4f; border-radius: 11px; background: #fff7f5; }.recommendation-fields label.low { border-top-color: #1686d9; background: #f4f9fd; }
.technical-fields label.wide { grid-column: span 2; }
.element-scale-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
.element-scale-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.element-scale-table th, .element-scale-table td { padding: 7px 8px; border-bottom: 1px solid var(--border); text-align: center; white-space: nowrap; }
.element-scale-table tbody tr:last-child th, .element-scale-table tbody tr:last-child td { border-bottom: 0; }
.element-scale-table thead th { position: sticky; top: 0; background: #f4f8fb; color: var(--text-muted); font-size: 9px; font-weight: 850; letter-spacing: 0.04em; text-transform: uppercase; }
.element-scale-table thead th.optimum { color: #047857; }
.element-scale-table tbody th { position: sticky; left: 0; z-index: 1; min-width: 132px; padding: 0; background: #fff; text-align: left; }
.element-scale-table tbody tr.active th, .element-scale-table tbody tr.active td { background: #f2f9ff; }
.scale-name-button { display: grid; gap: 1px; width: 100%; padding: 8px 10px; border: 0; border-left: 3px solid transparent; background: transparent; text-align: left; cursor: pointer; }
.element-scale-table tbody tr.active .scale-name-button { border-left-color: var(--brand-blue); }
.scale-name-button strong { color: var(--text); font-size: 11.5px; }
.scale-name-button small { color: var(--text-muted); font-size: 9px; }
.element-scale-table td.optimum { background: #f2fbf6; }
.element-scale-table tbody tr.active td.optimum { background: #e9f7f0; }
.element-scale-table td input { width: 84px; padding: 6px 7px; border: 1px solid var(--border); border-radius: 7px; background: #f8fbfe; font: inherit; font-size: 11px; text-align: right; color: var(--text); outline: 0; }
.element-scale-table td input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.element-scale-table td.row-action { width: 34px; padding-right: 9px; }
.element-scale-table td.row-action button { width: 24px; height: 24px; padding: 0; border: 1px solid var(--border); border-radius: 7px; background: #fff; color: var(--text-muted); font-size: 13px; line-height: 1; cursor: pointer; }
.element-scale-table td.row-action button:hover { border-color: #e85d4f; color: #e85d4f; }
.element-scale-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.scale-inline-add { padding: 8px 13px; border: 1px dashed var(--border-strong); border-radius: 9px; background: transparent; color: var(--brand-blue); font-size: 11px; font-weight: 850; cursor: pointer; }
.scale-inline-add:hover { border-color: var(--brand-blue); background: var(--teal-50); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.band-preview { display: grid; grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); gap: 6px; }
.band-chip { display: grid; justify-items: center; gap: 3px; padding: 8px 6px; border: 1px solid var(--border); border-radius: 10px; background: #fff; text-align: center; }
.band-chip > b { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #f59e0b; color: #fff; font-size: 10px; }
.band-chip.good > b { background: #10b981; }
.band-chip.critical > b { background: #e85d4f; }
.band-chip > em { color: var(--text); font-size: 9.5px; font-style: normal; font-weight: 850; }
.band-chip > small { color: var(--text-muted); font-size: 8.5px; line-height: 1.3; overflow-wrap: anywhere; }
.scale-manager { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.scale-card { display: grid; gap: 8px; padding: 13px; border: 1px solid var(--border); border-radius: 13px; background: #fff; }
.scale-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.scale-card-head > span { color: var(--teal-700); font-size: 9px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
.scale-remove { width: 24px; height: 24px; padding: 0; border: 1px solid var(--border); border-radius: 7px; background: #fff; color: var(--text-muted); font-size: 14px; line-height: 1; cursor: pointer; }
.scale-remove:hover { border-color: #e85d4f; color: #e85d4f; }
.scale-card label { display: grid; gap: 4px; }
.scale-card span { color: var(--text); font-size: 10px; font-weight: 850; }
.scale-card input { width: 100%; min-width: 0; padding: 8px 9px; border: 1px solid var(--border); border-radius: 8px; background: #f8fbfe; font: inherit; font-size: 12px; color: var(--text); outline: 0; }
.scale-card input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.scale-new { display: grid; align-content: center; justify-items: center; gap: 3px; min-height: 120px; padding: 13px; border: 1px dashed var(--border-strong); border-radius: 13px; background: transparent; color: var(--brand-blue); cursor: pointer; }
.scale-new:hover { border-color: var(--brand-blue); background: var(--teal-50); }
.scale-new > b { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: var(--brand-blue); color: #fff; font-size: 16px; }
.scale-new > span { font-size: 12px; font-weight: 850; }
.scale-new > small { color: var(--text-muted); font-size: 9px; text-align: center; }
.scale-matrix { gap: 13px; }
.matrix-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.matrix-search { position: relative; flex: 1 1 200px; min-width: 0; }
.matrix-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.matrix-search input { width: 100%; min-height: 38px; padding: 0 11px 0 32px; border: 1px solid var(--border); border-radius: 10px; background: #f8fbfe; font: inherit; font-size: 12px; color: var(--text); outline: 0; }
.matrix-toolbar select { min-height: 38px; padding: 0 11px; border: 1px solid var(--border); border-radius: 10px; background: #f8fbfe; font: inherit; font-size: 12px; color: var(--text); outline: 0; }
.matrix-search input:focus, .matrix-toolbar select:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.matrix-density { display: inline-flex; gap: 3px; padding: 3px; border-radius: 999px; background: rgba(136,193,233,0.18); }
.matrix-density button { padding: 7px 13px; border: 0; border-radius: 999px; background: transparent; color: var(--text-muted); font-size: 11.5px; font-weight: 850; cursor: pointer; }
.matrix-density button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 5px 13px rgba(10,27,67,0.08); }
.matrix-scales { display: flex; flex-wrap: wrap; gap: 6px; }
.matrix-scale-chip { padding: 7px 12px; border: 1px solid var(--brand-blue); border-radius: 999px; background: var(--teal-50); color: var(--brand-blue); font-size: 11.5px; font-weight: 850; cursor: pointer; }
.matrix-scale-chip.off { border-color: var(--border); background: #fff; color: var(--text-muted); text-decoration: line-through; }
.matrix-hint { padding: 16px; border: 1px dashed var(--border-strong); border-radius: 11px; color: var(--text-muted); font-size: 11.5px; text-align: center; }
.scale-table-wrap { overflow: auto; max-height: 62vh; border: 1px solid var(--border); border-radius: 12px; }
.scale-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; }
.scale-table th, .scale-table td { padding: 6px 8px; border-bottom: 1px solid var(--border); text-align: center; white-space: nowrap; }
.scale-table thead th { position: sticky; top: 0; z-index: 2; background: #f4f8fb; color: var(--text-muted); font-size: 9px; font-weight: 850; letter-spacing: 0.04em; text-transform: uppercase; }
.scale-table thead tr:first-child th { top: 0; }
.scale-table thead tr:nth-child(2) th { top: 29px; }
.scale-group-head { border-bottom: 2px solid var(--brand-blue); color: var(--brand-blue) !important; font-size: 10.5px !important; }
.scale-table thead th.optimum { color: #047857 !important; }
.scale-group-start { border-left: 2px solid #cfe0ec; }
.scale-table .scale-element-col { position: sticky; left: 0; z-index: 1; min-width: 150px; background: #fff; text-align: left; }
.scale-table thead .scale-element-col { z-index: 3; background: #f4f8fb; }
.scale-table tbody tr:nth-child(even) .scale-element-col { background: #fbfdff; }
.scale-table tbody tr:nth-child(even) td { background: rgba(244,248,251,0.5); }
.scale-table tbody .scale-element-col strong { display: block; color: var(--text); font-size: 11.5px; }
.scale-table tbody .scale-element-col small { display: block; margin-top: 1px; color: var(--text-muted); font-size: 9px; }
.scale-group-row th { position: sticky; left: 0; z-index: 1; padding: 7px 10px; background: #eef4f9 !important; color: var(--text-muted); font-size: 9.5px; font-weight: 850; letter-spacing: 0.06em; text-align: left; text-transform: uppercase; }
.scale-group-row th b { margin-left: 6px; color: var(--brand-blue); }
.scale-table td.optimum { background: #f2fbf6; }
.scale-table tbody tr:nth-child(even) td.optimum { background: #ecf8f2; }
.scale-table td input { width: 82px; padding: 5px 6px; border: 1px solid var(--border); border-radius: 7px; background: #fff; font: inherit; font-size: 11px; text-align: right; color: var(--text); outline: 0; }
.scale-table td input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.scale-cards { display: none; gap: 9px; }
.scale-card-row { display: grid; gap: 9px; padding: 13px; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
.scale-card-row > header strong { display: block; color: var(--text); font-size: 13px; }
.scale-card-row > header small { display: block; margin-top: 1px; color: var(--text-muted); font-size: 10px; }
.scale-card-scale { display: grid; gap: 6px; padding: 10px; border-radius: 10px; background: #f8fbfe; }
.scale-card-scale > span { color: var(--brand-blue); font-size: 10.5px; font-weight: 850; }
.scale-card-scale > div { display: grid; grid-template-columns: repeat(auto-fit, minmax(74px, 1fr)); gap: 6px; }
.scale-card-scale label { display: grid; gap: 3px; }
.scale-card-scale label.optimum small { color: #047857; }
.scale-card-scale small { color: var(--text-muted); font-size: 9px; font-weight: 850; text-transform: uppercase; }
.scale-card-scale input { width: 100%; min-width: 0; padding: 7px 8px; border: 1px solid var(--border); border-radius: 8px; background: #fff; font: inherit; font-size: 11.5px; text-align: right; color: var(--text); outline: 0; }
.scale-card-scale input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
@media (max-width: 860px) {
  .scale-table-wrap { display: none; }
  .scale-cards { display: grid; }
  .matrix-toolbar { align-items: stretch; flex-direction: column; }
  .matrix-density { justify-content: stretch; }
  .matrix-density button { flex: 1; }
}
.template-dynamic-note { display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 10px; padding: 11px 13px; border-radius: 11px; background: #eef7fd; color: #456378; font-size: 11px; line-height: 1.5; }
.template-dynamic-note > i { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--brand-blue); color: #fff; font-style: normal; font-weight: 900; }
@media (max-width: 900px) {
  .scale-switch { grid-template-columns: 1fr; }
  .threshold-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.technical-fields { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 9px; }.technical-fields label { display: grid; gap: 5px; }.technical-fields span { color: var(--text); font-size: 10px; font-weight: 850; }.technical-fields input { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: #f8fbfe; outline: 0; }.technical-fields input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.technical-note { color: var(--text-muted); font-size: 10px; }.technical-note b { color: var(--teal-700); }
.content-preview { display: grid; gap: 9px; padding: 15px; border-radius: 14px; background: #0a1b43; color: #fff; }.content-preview > div:first-child { display: flex; align-items: center; justify-content: space-between; }.content-preview span { color: var(--teal-200); font-size: 9px; font-weight: 800; text-transform: uppercase; }.content-preview > p { color: rgba(255,255,255,.7); font-size: 11px; line-height: 1.5; }.preview-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.preview-actions article { padding: 10px; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: rgba(255,255,255,.07); }.preview-actions p { margin-top: 4px; color: rgba(255,255,255,.64); font-size: 9px; line-height: 1.45; }
.content-editor > footer { display: flex; align-items: center; justify-content: flex-end; gap: 14px; }.save-message { margin-right: auto; color: var(--text-muted); font-size: 11px; }.save-message.success { color: #047857; }.save-message.error { color: #b53a2e; }
.dosing-editor-shell { display: grid; gap: 16px; }.dosing-editor-heading { align-items: center; margin-bottom: 0; }.dosing-summary { display: flex; gap: 7px; }.dosing-summary span { min-width: 86px; display: grid; gap: 1px; padding: 9px 11px; border-radius: 11px; background: #f4f9fd; color: var(--text-muted); font-size: 8px; font-weight: 800; text-transform: uppercase; }.dosing-summary b { color: var(--brand-blue); font-size: 18px; }.dosing-workspace { display: grid; grid-template-columns: 270px minmax(0,1fr); gap: 16px; align-items: start; }.dosing-browser { position: sticky; top: calc(var(--topbar-height, 68px) + 18px); display: grid; grid-template-rows: auto minmax(0,1fr); gap: 9px; max-height: calc(100vh - var(--topbar-height, 68px) - 36px); min-height: 0; }.dosing-browser > label { display: grid; gap: 5px; }.dosing-browser > label span { color: var(--text-muted); font-size: 9px; font-weight: 800; }.dosing-browser > label input { width: 100%; min-height: 39px; padding: 0 10px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); outline: 0; }.dosing-browser > label input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.dosing-browser nav { display: grid; align-content: start; gap: 6px; min-height: 0; padding-right: 4px; overflow-y: auto; overscroll-behavior: contain; }.dosing-browser nav button { display: grid; grid-template-columns: 38px minmax(0,1fr) 10px; align-items: center; gap: 9px; padding: 9px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); text-align: left; cursor: pointer; }.dosing-browser nav button:hover { border-color: var(--teal-400); }.dosing-browser nav button.active { border-color: var(--brand-blue); background: var(--teal-50); box-shadow: inset 3px 0 var(--brand-blue); }.dosing-browser nav button > span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; background: #f2f7fa; color: var(--brand-blue); font-size: 10px; font-weight: 900; }.dosing-browser nav button div,.dosing-browser nav button strong,.dosing-browser nav button small { min-width: 0; display: block; }.dosing-browser nav button strong,.dosing-browser nav button small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.dosing-browser nav button strong { font-size: 11px; }.dosing-browser nav button small { margin-top: 2px; color: var(--text-muted); font-size: 8px; }.dosing-browser nav button > i { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }.dosing-browser nav button > i.configured { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.12); }.dosing-browser nav button > i.verified { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.12); }
.dosing-form { min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 18px; background: #f8fbfe; }.dosing-form > header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 17px 18px; border-bottom: 1px solid var(--border); background: #fff; }.dosing-identity { display: flex; align-items: center; gap: 11px; }.dosing-identity > span { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 12px; background: var(--teal-50); color: var(--brand-blue); font-size: 11px; font-weight: 900; }.dosing-identity small,.dosing-identity h3 { display: block; }.dosing-identity small { color: var(--teal-700); font-size: 9px; font-weight: 800; text-transform: uppercase; }.dosing-identity h3 { margin-top: 2px; color: var(--text); font-size: 21px; }.dosing-header-actions { display: flex; align-items: center; gap: 8px; }.dosing-switch { display: flex; align-items: center; gap: 7px; min-height: 34px; padding: 0 11px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 9px; font-weight: 850; cursor: pointer; }.dosing-switch:has(input:not(:checked)) { background: #eef2f6; color: #64748b; }.dosing-switch input { accent-color: #10b981; }.dosing-form-body { display: grid; gap: 12px; padding: 16px; }.dosing-form-body.disabled > * { opacity: .56; }.dosing-form-body.disabled input,.dosing-form-body.disabled textarea { pointer-events: none; }.dosing-form-section { display: grid; gap: 12px; padding: 15px; border: 1px solid var(--border); border-radius: 14px; background: #fff; }.dosing-fields { display: grid; grid-template-columns: minmax(0,1fr) 270px; gap: 10px; }.dosing-fields label:not(.verification-field),.dosing-instructions { display: grid; gap: 5px; }.dosing-fields label > span,.dosing-instructions > span,.formula-builder label > span,.preview-inputs label > span,.preview-inputs > div > span { color: var(--text); font-size: 9px; font-weight: 850; }.dosing-fields input[type=text],.dosing-instructions textarea,.formula-builder input,.preview-inputs input { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: #f8fbfe; color: var(--text); font: inherit; font-size: 11px; outline: 0; }.dosing-fields input:focus,.dosing-instructions textarea:focus,.formula-builder input:focus,.preview-inputs input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.dosing-instructions textarea { resize: vertical; line-height: 1.5; }.verification-field { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border: 1px solid #bbf7d0; border-radius: 10px; background: #f0fdf4; cursor: pointer; }.verification-field input { accent-color: #10b981; }.verification-field span,.verification-field b,.verification-field small { display: block; }.verification-field b { color: #047857; font-size: 10px; }.verification-field small { margin-top: 2px; color: #4f806b; font-size: 8px; line-height: 1.35; }.formula-builder { display: grid; grid-template-columns: minmax(130px,1fr) auto minmax(130px,1fr) auto minmax(150px,1fr); align-items: end; gap: 9px; }.formula-builder label { display: grid; gap: 5px; }.formula-builder label > div,.preview-inputs label > div { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; overflow: hidden; border: 1px solid var(--border); border-radius: 9px; background: #f8fbfe; }.formula-builder input,.preview-inputs input { border: 0; border-radius: 0; background: transparent; }.formula-builder label > div > b,.preview-inputs label > div > b { padding-right: 9px; color: var(--text-muted); font-size: 8px; white-space: nowrap; }.formula-builder > i { align-self:center; margin-top:15px; color: var(--teal-700); font-size: 9px; font-style: normal; font-weight: 850; text-transform: uppercase; }.formula-explanation { padding: 10px 12px; border-left: 3px solid var(--brand-blue); border-radius: 8px; background: #eef7ff; color: #47627a; font-size: 10px; line-height: 1.5; }
.dosing-preview { overflow: hidden; border-radius: 15px; background: #0a1b43; color: #fff; }.dosing-preview > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.1); }.dosing-preview > header span { color: var(--teal-200); font-size: 8px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }.dosing-preview h4 { margin-top: 2px; font-size: 16px; }.dosing-preview > header > b { padding: 5px 8px; border-radius: 999px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.55); font-size: 8px; text-transform: uppercase; }.dosing-preview > header > b.ready { background: #047857; color: #fff; }.preview-inputs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 9px; padding: 14px 16px; }.preview-inputs label { display: grid; gap: 5px; }.preview-inputs label > span,.preview-inputs > div > span { color: rgba(255,255,255,.55); }.preview-inputs label > div { border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.07); }.preview-inputs input { color: #fff; }.preview-inputs label > div > b { color: rgba(255,255,255,.48); }.preview-inputs > div { display: grid; align-content: center; gap: 5px; padding: 0 12px; border-left: 1px solid rgba(255,255,255,.12); }.preview-inputs > div strong { font-size: 14px; }.preview-result { display: grid; grid-template-columns: repeat(3,1fr); margin: 0 16px 16px; overflow: hidden; border: 1px solid rgba(136,225,239,.22); border-radius: 11px; background: rgba(0,190,208,.08); }.preview-result > div { padding: 12px; border-right: 1px solid rgba(136,225,239,.18); }.preview-result > div:last-child { border: 0; }.preview-result span,.preview-result strong { display: block; }.preview-result span { color: var(--teal-200); font-size: 8px; text-transform: uppercase; }.preview-result strong { margin-top: 3px; font-size: 16px; }.dosing-preview > p { margin: 0 16px 16px; color: rgba(255,255,255,.58); font-size: 9px; }.dosing-form > footer { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding: 14px 17px; border-top: 1px solid var(--border); background: #fff; }
.support-editor-shell { display: grid; gap: 16px; }.support-editor-heading { margin-bottom: 0; }.faq-admin-list { display: grid; gap: 11px; }.faq-admin-card { overflow: hidden; border: 1px solid var(--border); border-radius: 15px; background: #f8fbfe; }.faq-admin-card > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; border-bottom: 1px solid var(--border); background: #fff; }.faq-admin-card > header > div:first-child { min-width: 0; display: flex; align-items: center; gap: 9px; }.faq-admin-card > header > div:first-child span { display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 8px; background: var(--teal-50); color: var(--brand-blue); font-size: 9px; font-weight: 900; }.faq-admin-card > header strong { overflow: hidden; color: var(--text); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.faq-card-actions { display: flex; gap: 5px; }.faq-card-actions button { min-height: 30px; padding: 0 9px; border: 1px solid var(--border); border-radius: 8px; background: #fff; color: var(--brand-blue); font-size: 10px; font-weight: 850; cursor: pointer; }.faq-card-actions button:disabled { opacity: .35; cursor: default; }.faq-card-actions .remove-faq { color: #b53a2e; }.faq-card-actions .remove-faq:hover { border-color: #e85d4f; background: #fff7f5; }.faq-fields { display: grid; grid-template-columns: 180px minmax(0,1fr); gap: 10px; padding: 13px; }.faq-fields label { display: grid; gap: 5px; }.faq-fields label > span { color: var(--text); font-size: 10px; font-weight: 850; }.faq-fields input,.faq-fields textarea { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); font: inherit; font-size: 11px; outline: 0; }.faq-fields input:focus,.faq-fields textarea:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.faq-fields textarea { resize: vertical; }.faq-fields .faq-answer { grid-column: 1 / -1; }.faq-admin-empty { min-height: 260px; display: grid; place-content: center; justify-items: center; gap: 7px; border: 1px dashed var(--border); border-radius: 15px; background: #f8fbfe; text-align: center; }.faq-admin-empty strong { color: var(--text); }.faq-admin-empty p { margin-bottom: 5px; color: var(--text-muted); font-size: 11px; }.support-editor-footer { display: flex; align-items: center; justify-content: flex-end; gap: 14px; padding-top: 14px; border-top: 1px solid var(--border); }.support-editor-footer > span { color: var(--text-muted); font-size: 10px; font-weight: 800; }
.rule-editor-shell { display: grid; gap: 18px; }.rule-editor-heading { margin-bottom: 0; }.rule-workspace { display: grid; grid-template-columns: 255px minmax(0,1fr); gap: 16px; align-items: start; }.rule-browser { position: sticky; top: calc(var(--topbar-height, 68px) + 18px); display: grid; grid-template-rows: auto minmax(0,1fr); gap: 9px; max-height: calc(100vh - var(--topbar-height, 68px) - 36px); min-height: 0; }.rule-browser > label { display: grid; gap: 5px; }.rule-browser > label span { color: var(--text-muted); font-size: 9px; font-weight: 800; }.rule-browser input { width: 100%; min-height: 38px; padding: 0 10px; border: 1px solid var(--border); border-radius: 9px; background: #f8fbfe; color: var(--text); outline: 0; }.rule-browser input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.rule-browser nav { min-height: 0; display: grid; align-content: start; gap: 6px; overflow-y: auto; overscroll-behavior: contain; padding-right: 4px; }.rule-browser nav button { width: 100%; display: grid; grid-template-columns: 8px minmax(0,1fr) auto; align-items: center; gap: 9px; padding: 11px; border: 1px solid var(--border); border-radius: 11px; background: #fff; color: var(--text); text-align: left; cursor: pointer; }.rule-browser nav button:hover { border-color: #b8ccdf; background: #f8fbfe; }.rule-browser nav button.active { border-color: var(--brand-blue); background: var(--teal-50); box-shadow: inset 3px 0 var(--brand-blue); }.rule-browser nav i { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.12); }.rule-browser nav i.off { background: #94a3b8; box-shadow: none; }.rule-browser nav span,.rule-browser nav strong,.rule-browser nav small { min-width: 0; display: block; }.rule-browser nav strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.rule-browser nav small { margin-top: 2px; color: var(--text-muted); font-size: 8px; }.rule-browser nav b { color: var(--brand-blue); }
.rule-form { overflow: hidden; border: 1px solid var(--border); border-radius: 17px; background: #f8fbfe; }.rule-form > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 15px 17px; border-bottom: 1px solid var(--border); background: #fff; }.rule-form > header small { color: var(--text-muted); font-size: 8px; font-weight: 850; text-transform: uppercase; }.rule-form > header h3 { margin-top: 2px; color: var(--text); font-size: 19px; }.rule-active { display: flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 9px; font-weight: 850; cursor: pointer; }.rule-active:has(input:not(:checked)) { background: #eef2f6; color: #64748b; }.rule-active input { accent-color: #10b981; }.rule-form-section { display: grid; gap: 12px; padding: 17px; border-bottom: 1px solid var(--border); }.rule-fields { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; }.rule-fields label { display: grid; align-content: start; gap: 5px; }.rule-fields label.wide { grid-column: 1 / -1; }.rule-fields label > span { color: var(--text); font-size: 9px; font-weight: 850; }.rule-fields input,.rule-fields select,.rule-fields textarea { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); font: inherit; font-size: 11px; outline: 0; }.rule-fields input,.rule-fields select { min-height: 38px; }.rule-fields textarea { resize: vertical; line-height: 1.5; }.rule-fields input:focus,.rule-fields select:focus,.rule-fields textarea:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.rule-explanation { padding: 10px 12px; border-left: 3px solid #1686d9; border-radius: 8px; background: #eef7ff; color: #47627a; font-size: 10px; line-height: 1.5; }.rule-explanation b { color: var(--brand-blue); }.rule-form-footer { display: flex; justify-content: flex-end; padding: 12px 17px; background: #fff; }.remove-rule { padding: 8px 10px; border: 1px solid #f1b9b2; border-radius: 8px; background: #fff7f5; color: #b53a2e; font-size: 9px; font-weight: 850; cursor: pointer; }
.rule-simulator { display: grid; gap: 13px; padding: 17px; border-radius: 18px; background: #0a1b43; color: #fff; }.rule-simulator > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }.rule-simulator > header span { color: var(--teal-200); font-size: 8px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }.rule-simulator h3 { margin-top: 2px; font-size: 20px; }.rule-simulator > header p { max-width: 620px; margin-top: 3px; color: rgba(255,255,255,.6); font-size: 10px; }.scenario-switch { display: flex; gap: 4px; padding: 4px; border: 1px solid rgba(255,255,255,.12); border-radius: 11px; background: rgba(255,255,255,.07); }.scenario-switch button { min-width: 62px; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; color: rgba(255,255,255,.62); font-size: 9px; font-weight: 850; cursor: pointer; }.scenario-switch button.active { background: #fff; color: var(--brand-blue); }.simulator-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.simulator-summary > * { padding: 6px 9px; border-radius: 999px; background: rgba(255,255,255,.08); color: rgba(255,255,255,.72); font-size: 9px; }.simulator-summary span { color: #fff; font-weight: 900; }.simulator-summary span.tone-good { background: #047857; }.simulator-summary span.tone-watch { background: #b66a06; }.simulator-summary span.tone-critical { background: #b53a2e; }.simulator-summary b { color: var(--teal-200); }.simulator-results { display: grid; grid-template-columns: repeat(auto-fit,minmax(210px,1fr)); gap: 8px; }.simulator-results article { padding: 12px; border: 1px solid rgba(255,255,255,.11); border-radius: 11px; background: rgba(255,255,255,.07); }.simulator-results article > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.simulator-results article span { padding: 3px 6px; border-radius: 5px; background: #f59e0b; color: #271700; font-size: 7px; font-weight: 900; text-transform: uppercase; }.simulator-results article small { overflow: hidden; color: var(--teal-200); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }.simulator-results h4 { margin-top: 9px; font-size: 12px; }.simulator-results p { margin-top: 5px; color: rgba(255,255,255,.58); font-size: 9px; line-height: 1.45; }.simulator-results p b { color: rgba(255,255,255,.82); }.simulator-empty { padding: 18px; border: 1px dashed rgba(255,255,255,.18); border-radius: 11px; text-align: center; }.simulator-empty strong { font-size: 12px; }.simulator-empty p { margin-top: 3px; color: rgba(255,255,255,.55); font-size: 9px; }.rule-save-footer { display: flex; align-items: center; justify-content: flex-end; gap: 13px; padding-top: 15px; border-top: 1px solid var(--border); }.rule-save-footer > span { color: var(--text-muted); font-size: 9px; font-weight: 800; }
.user-editor-shell { display: grid; gap: 16px; }.user-editor-heading { align-items: center; margin-bottom: 0; }.user-summary { display: flex; gap: 7px; }.user-summary span { min-width: 72px; display: grid; gap: 1px; padding: 9px 11px; border-radius: 11px; background: #f4f9fd; color: var(--text-muted); font-size: 8px; font-weight: 800; text-transform: uppercase; }.user-summary b { color: var(--brand-blue); font-size: 18px; }.user-controls { display: grid; grid-template-columns: minmax(260px,1fr) 220px; gap: 10px; padding: 12px; border-radius: 14px; background: #f8fbfe; }.user-controls label { display: grid; gap: 5px; }.user-controls span { color: var(--text-muted); font-size: 9px; font-weight: 800; }.user-controls input,.user-controls select { width: 100%; min-height: 39px; padding: 0 10px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); outline: 0; }.user-controls input:focus,.user-controls select:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }.user-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 15px; }.user-table { width: 100%; min-width: 940px; border-collapse: collapse; }.user-table th { padding: 10px 12px; background: #f4f9fd; color: var(--text-muted); font-size: 9px; text-align: left; text-transform: uppercase; }.user-table td { padding: 12px; border-top: 1px solid var(--border); vertical-align: middle; }.user-table td > strong,.user-table td > small { display: block; }.user-table td > strong { color: var(--text); font-size: 11px; }.user-table td > small { margin-top: 3px; color: var(--text-muted); font-size: 9px; }.user-identity { display: flex; align-items: center; gap: 9px; }.user-identity > span { display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 10px; background: var(--teal-50); color: var(--brand-blue); font-size: 10px; font-weight: 900; }.user-identity strong,.user-identity small { display: block; }.user-identity strong { color: var(--text); font-size: 12px; }.user-identity small { max-width: 210px; margin-top: 2px; overflow: hidden; color: var(--text-muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.permission-control { display: flex; gap: 6px; }.permission-control select { min-width: 125px; padding: 7px 8px; border: 1px solid var(--border); border-radius: 8px; background: #fff; color: var(--text); font-size: 10px; }.permission-control button { padding: 7px 9px; border: 1px solid var(--brand-blue); border-radius: 8px; background: var(--brand-blue); color: #fff; font-size: 9px; font-weight: 850; cursor: pointer; }.permission-control button:disabled,.permission-control select:disabled { opacity: .45; cursor: default; }.self-role-note { display: block; margin-top: 4px; color: var(--teal-700); font-size: 8px; }.user-action-message { min-height: 16px; color: var(--text-muted); font-size: 10px; }.user-action-message.success { color: #047857; }.user-action-message.error { color: #b53a2e; }
@media (max-width: 1100px) { .formula-builder { grid-template-columns: 1fr; }.formula-builder > i { margin: 0; text-align: center; }.dosing-fields { grid-template-columns: 1fr; } }
@media (max-width: 980px) { .editor-layout,.rule-workspace,.dosing-workspace { grid-template-columns: 1fr; }.element-browser,.rule-browser,.dosing-browser { position: static; max-height: min(430px, 52vh); }.element-browser nav { grid-template-columns: repeat(3,minmax(0,1fr)); }.rule-browser nav,.dosing-browser nav { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media (max-width: 700px) { .admin-hero { flex-direction: column; }.admin-role { min-width: 0; }.settings-tabs,.user-controls { grid-template-columns: 1fr; }.editor-heading,.content-editor > header,.content-editor > footer,.faq-admin-card > header,.support-editor-footer,.rule-simulator > header,.rule-save-footer,.dosing-form > header,.dosing-form > footer { align-items: stretch; flex-direction: column; }.user-summary,.dosing-summary { display: grid; grid-template-columns: repeat(3,1fr); }.dosing-header-actions { justify-content: space-between; }.element-browser nav,.rule-browser nav,.dosing-browser nav { grid-template-columns: 1fr 1fr; }.recommendation-fields,.preview-actions,.technical-fields,.faq-fields,.rule-fields,.preview-inputs,.preview-result { grid-template-columns: 1fr; }.preview-inputs > div { padding: 10px 0 0; border-top: 1px solid rgba(255,255,255,.12); border-left: 0; }.preview-result > div { border-right: 0; border-bottom: 1px solid rgba(136,225,239,.18); }.faq-fields .faq-answer,.rule-fields label.wide { grid-column: auto; }.faq-card-actions button { flex: 1; }.save-message { margin: 0; }.scenario-switch button { flex: 1; min-width: 0; } }
@media (max-width: 480px) { .rule-browser nav,.element-browser nav,.dosing-browser nav { grid-template-columns: 1fr; }.rule-form > header { align-items: flex-start; }.simulator-results { grid-template-columns: 1fr; }.dosing-header-actions { align-items: stretch; flex-direction: column; }.dosing-summary span { min-width: 0; } }
/* Match the customer screens with shared brand tokens and readable controls. */
.admin-settings { min-width: 0; gap: 20px; }
.admin-hero { border-radius: 28px; background: linear-gradient(112deg,rgba(10,27,67,.98),rgba(18,66,109,.92) 58%,rgba(0,114,206,.74)),url('/reeftech-pattern.jpg') center / cover; }
.admin-hero h1 { font-size: clamp(32px,4.2vw,46px); }.admin-hero > div:first-child > span { color: var(--brand-cyan); }
.storage-note { padding: 0 3px; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.settings-tabs { padding: 0; gap: 10px; border: 0; background: transparent; box-shadow: none; grid-template-columns: repeat(auto-fit,minmax(min(100%,160px),1fr)); }
.settings-tabs button { min-width: 0; min-height: 70px; border: 1px solid var(--panel-line); border-radius: 16px; background: #fff; box-shadow: 0 8px 24px rgba(10,27,67,.05); }.settings-tabs button.active { border-color: var(--brand-blue); }.settings-tabs small { font-size: 11px; line-height: 1.35; font-weight: 500; }
.editor-shell { min-width: 0; border-color: var(--panel-line); border-radius: 20px; padding: 24px; }.editor-heading h2 { color: var(--brand-navy); font-size: 24px; letter-spacing: -.02em; }.editor-heading p { font-size: 13px; line-height: 1.6; }
.editor-state.unsaved { background: var(--amber-bg); color: #9a5b0a; }.editor-state.unsaved i { background: var(--amber); }
.element-browser label span,.dosing-browser > label span,.rule-browser > label span { font-size: 11px; }.element-browser nav strong,.dosing-browser nav button strong,.rule-browser nav strong { font-size: 13px; }.element-browser nav small,.dosing-browser nav button small,.rule-browser nav small { font-size: 11px; }
.dosing-browser nav button { grid-template-columns: 38px minmax(0,1fr); }.dosing-browser .dosing-status { color: #93620f; font-size: 10px; white-space: normal; }.dosing-browser .dosing-status.approved { color: #047857; }
.element-identity small,.dosing-identity small,.rule-form > header small { font-size: 11px; }.section-label strong { font-size: 14px; }.section-label small { font-size: 11px; line-height: 1.4; }
.editor-section label > span,.technical-fields span,.dosing-fields label > span,.formula-builder label > span,.dosing-instructions > span,.preview-inputs label > span,.rule-fields label > span,.faq-fields label > span { font-size: 12px; font-weight: 600; }.editor-section label > small { font-size: 11px; }
.admin-settings input:not([type='checkbox']),.admin-settings select,.admin-settings textarea { min-width: 0; min-height: 44px; border-radius: 12px; font-family: inherit; font-size: 14px; color: var(--text); }.admin-settings textarea { line-height: 1.6; }
.reset-button { font-size: 11px; padding: 9px 12px; border-radius: 999px; }.technical-note,.formula-explanation { font-size: 12px; line-height: 1.55; }
.field-error { color: #b53a2e; font-size: 12px; }.formula-errors { padding-left: 18px; color: #b53a2e; font-size: 12px; line-height: 1.6; }
.product-source { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 12px 0; }.product-source > span { font-size: 11px; color: var(--text-muted); }
.formula-fields { min-width: 0; border: 0; padding: 0; margin: 12px 0 0; }.verification-field { display: flex; gap: 10px; align-items: flex-start; margin-top: 16px; font-size: 13px; }.verification-field small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 11px; }.verification-field input { margin-top: 4px; }
.content-preview { background: var(--surface-soft); color: var(--text); border: 1px solid var(--border); }.content-preview span { color: var(--teal-700); font-size: 11px; }.content-preview > p,.preview-actions p { color: var(--text-muted); font-size: 12px; }.preview-actions article { border-color: var(--border); background: #fff; }
.dosing-preview,.rule-simulator { background: var(--surface-soft); color: var(--text); border: 1px solid var(--border); border-radius: 16px; }.dosing-preview h4,.rule-simulator h3 { color: var(--brand-navy); font-size: 19px; }.dosing-preview > header span,.rule-simulator > header span { color: var(--teal-700); font-size: 11px; }.dosing-preview > p,.rule-simulator > header p { color: var(--text-muted); font-size: 12px; }
.preview-inputs label > span,.preview-inputs > div > span,.preview-result span { color: var(--text-muted); font-size: 11px; }.preview-inputs > div > strong,.preview-result strong { color: var(--brand-navy); }.preview-inputs input { background: #fff; border-color: var(--border); }.preview-inputs label > div { background: #fff; border-color: var(--border); }.preview-inputs label > div > b { color: var(--text-muted); font-size: 11px; }.preview-result { background: #fff; border-color: var(--border); }
.dosing-preview > header > b { background: #fff3d6; color: #805300; font-size: 10px; }.simulator-results p b { color: var(--brand-navy); }.simulator-summary > * { font-size: 11px; background: #fff; }.simulator-results article small { color: var(--text-muted); font-size: 11px; }
.rule-explanation { font-size: 12px; line-height: 1.6; }.rule-explanation b { color: var(--brand-blue); }
.simulator-report-picker { display: grid; gap: 6px; margin: 16px 0; }.simulator-report-picker > span { color: var(--text-muted); font-size: 12px; font-weight: 600; }.simulator-report-picker select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); background: #fff; }
.scenario-switch { width: fit-content; background: #e7eef5; }.scenario-switch button { color: var(--text-muted); font-size: 12px; }.scenario-switch button.active { background: #fff; color: var(--brand-blue); }
.simulator-summary { flex-wrap: wrap; }.simulator-summary strong { color: var(--text); }.simulator-summary b { color: var(--teal-700); }
.simulator-results { grid-template-columns: 1fr; }.simulator-results article { padding: 18px; border-color: var(--border); background: #fff; color: var(--text); }.simulator-results h4 { color: var(--brand-navy); font-size: 17px; }.simulator-results p,.simulator-results li { color: var(--text-muted); font-size: 13px; line-height: 1.6; }.simulator-results small { color: var(--text-muted); font-size: 11px; }.simulator-results ol { margin: 12px 0; padding-left: 19px; }.simulator-empty { border-color: var(--border); }.simulator-empty p { color: var(--text-muted); font-size: 12px; }
.faq-expand { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; padding: 0; border: 0; background: transparent; color: var(--text); text-align: left; cursor: pointer; }.faq-expand > span { flex: none; color: var(--brand-blue); font-size: 12px; font-weight: 700; }.faq-expand > strong { font-size: 14px; line-height: 1.4; }.faq-expand > i { margin-left: auto; color: var(--brand-blue); font-size: 20px; font-style: normal; }.faq-admin-card { padding: 16px 18px; }.faq-admin-card .faq-fields { margin-top: 16px; }
.admin-save-bar { position: sticky; bottom: 18px; z-index: 12; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 16px 20px; border: 1px solid var(--panel-line); border-radius: 18px; background: rgba(255,255,255,.97); box-shadow: 0 12px 36px rgba(10,27,67,.13); backdrop-filter: blur(18px); }.admin-save-bar > div:first-child { min-width: 0; }.admin-save-bar strong { display: block; color: var(--brand-navy); font-size: 13px; }.admin-save-bar small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 11px; }.admin-save-bar .save-message { margin-top: 6px; }.save-bar-actions { display: flex; flex: none; gap: 8px; }
@media (max-width:700px) { .admin-save-bar .save-bar-actions { display: grid; grid-template-columns: 1fr 1.4fr; gap: 6px; }.admin-save-bar .save-bar-actions .btn { min-height: 44px; padding: 8px; font-size: 11px; } }
@media (max-width:1100px) { .admin-save-bar { align-items: stretch; flex-direction: column; }.save-bar-actions { justify-content: flex-end; } }
@media (max-width:700px) { .editor-shell { padding: 18px; }.settings-tabs { display: flex; overflow-x: auto; padding-bottom: 4px; }.settings-tabs button { flex: 0 0 190px; }.admin-save-bar { bottom: 100px; padding: 14px; }.save-bar-actions { flex-direction: column; }.save-bar-actions .btn { width: 100%; white-space: normal; line-height: 1.3; }.admin-hero { padding: 24px; }.element-browser,.dosing-browser,.rule-browser { max-height: 240px; }.formula-builder label div { min-width: 0; }.faq-admin-card > header { gap: 14px; }.faq-expand { width: 100%; }.product-source { align-items: flex-start; flex-direction: column; } }
</style>
