# Klyra Recipes - Test di Scaling Porzioni

## Panoramica

Il modulo di scaling porzioni permette di ricalcolare automaticamente le quantità degli ingredienti in base al numero di porzioni desiderate, mantenendo le proporzioni originali della ricetta.

## Funzionalità Implementate

### 1. Selezione Ingredienti da Catalogo

- ✅ Gli ingredienti sono selezionati da `inventory_catalog_items`
- ✅ Unità di misura (UOM) automaticamente ereditate dal catalogo
- ✅ Snapshot del nome prodotto salvato per storicizzazione
- ✅ Supporto ingredienti opzionali
- ✅ Note personalizzate per ingrediente (es. "tritato", "a dadini")

### 2. Widget Portion Scaler

**Componente:** `PortionScaler.tsx`

- ✅ Controlli incremento/decremento porzioni
- ✅ Input manuale numero porzioni
- ✅ Pulsante "Ripristina" per tornare alle porzioni originali
- ✅ Display fattore di scaling (es. "2.5x")
- ✅ Validazione min/max porzioni (1-100)

### 3. Calcolo Automatico Quantità

**Utility:** `lib/recipes/scaling.ts`

- ✅ `calculateScaleFactor(original, target)` - Calcola fattore moltiplicativo
- ✅ `scaleIngredients(ingredients, original, target)` - Scala array ingredienti
- ✅ `formatQuantity(quantity)` - Formattazione intelligente numeri (0.5 → "0.5", 2.0 → "2")
- ✅ Arrotondamento a 2 decimali per precisione

## Esempi di Scaling

### Esempio 1: Risotto ai Funghi (4 → 8 porzioni)

**Ricetta Originale (4 porzioni):**
```
- Riso Carnaroli: 320g
- Funghi Porcini: 400g
- Brodo Vegetale: 1.2L
- Burro: 50g
- Parmigiano: 80g
- Cipolla: 0.5 pezzi
```

**Dopo Scaling a 8 porzioni (fattore 2x):**
```
- Riso Carnaroli: 640g
- Funghi Porcini: 800g
- Brodo Vegetale: 2.4L
- Burro: 100g
- Parmigiano: 160g
- Cipolla: 1 pezzo
```

### Esempio 2: Tiramisù (6 → 3 porzioni)

**Ricetta Originale (6 porzioni):**
```
- Mascarpone: 500g
- Uova: 3 pezzi
- Zucchero: 100g
- Savoiardi: 24 pezzi
- Caffè: 300ml
- Cacao in Polvere: 20g
```

**Dopo Scaling a 3 porzioni (fattore 0.5x):**
```
- Mascarpone: 250g
- Uova: 1.5 pezzi
- Zucchero: 50g
- Savoiardi: 12 pezzi
- Caffè: 150ml
- Cacao in Polvere: 10g
```

### Esempio 3: Scaling Non-Lineare

**Nota:** Per alcuni ingredienti (es. spezie, sale) lo scaling lineare potrebbe non essere ottimale. Il sistema mantiene lo scaling lineare per semplicità, ma l'utente può modificare manualmente le quantità.

## Flusso Utente

### 1. Creazione Ricetta
1. Utente clicca "Nuova Ricetta"
2. Compila info base (titolo, categoria, porzioni standard)
3. Nel tab "Ingredienti":
   - Seleziona prodotti da catalogo
   - Inserisce quantità base
   - Aggiunge note opzionali

### 2. Visualizzazione con Scaling
1. Utente apre ricetta esistente
2. Widget "Prepara per" mostra porzioni originali
3. Utente modifica numero porzioni (es. 4 → 10)
4. Tutte le quantità si aggiornano automaticamente
5. Viene mostrato il fattore di scaling (2.5x)

### 3. Modalità Readonly
- In visualizzazione ricetta pubblicata
- Mostra quantità scalate in evidenza
- Mostra quantità originali come riferimento
- Permette comunque modifica porzioni per planning

## UX Ingredienti

### Validazione
- ❌ Ingrediente senza prodotto selezionato → bordo giallo
- ❌ Quantità zero o negativa → impedisce salvataggio
- ✅ Ingrediente completo → bordo normale

### Ordinamento
- Drag & Drop handle (GripVertical icon) per riordinare
- `sort_order` salvato automaticamente
- Visualizzazione mantenuta in ordine definito

### Stati Ingrediente
- **Editing:** Form completo con select prodotti, input quantità
- **ReadOnly:** Display quantità scaled + originali
- **Optional Flag:** Badge "Opzionale" in visualizzazione

## Integrazione con Inventari

### Riuso Catalogo Prodotti
```typescript
// Query per caricamento prodotti
const { data } = await supabase
  .from('inventory_catalog_items')
  .select('id, name, category, uom')
  .eq('is_active', true)
  .order('name');
```

### Unità di Misura
- ✅ UOM ereditata da catalogo (kg, L, pz, g, ml, etc.)
- ✅ Snapshot UOM salvata in `recipe_ingredients`
- ✅ Nessuna conversione automatica (limita scelte a UOM disponibili)

### Snapshot Dati
Quando viene aggiunto un ingrediente:
```typescript
{
  catalog_item_id: "uuid",           // Riferimento vivo al catalogo
  item_name_snapshot: "Riso Carnaroli", // Snapshot nome per storico
  unit: "kg",                        // Snapshot UOM
  quantity: 0.32,                    // Quantità base
  ...
}
```

## Performance & Ottimizzazioni

### Calcoli Client-Side
- Scaling eseguito localmente per reattività immediata
- Nessuna chiamata API per ricalcolo quantità
- Utility pure functions per testing facile

### Formattazione Intelligente
```typescript
formatQuantity(320.00) → "320"
formatQuantity(0.50)   → "0.5"
formatQuantity(1.333)  → "1.33"
```

## Test Manuali

### Test 1: Scaling Up (×2)
- [ ] Creare ricetta 4 porzioni con 5 ingredienti
- [ ] Scalare a 8 porzioni
- [ ] Verificare tutte quantità raddoppiate
- [ ] Verificare fattore 2x mostrato

### Test 2: Scaling Down (×0.5)
- [ ] Aprire ricetta 6 porzioni
- [ ] Scalare a 3 porzioni
- [ ] Verificare tutte quantità dimezzate
- [ ] Verificare arrotondamenti corretti

### Test 3: Ripristino
- [ ] Scalare ricetta da 4 a 10 porzioni
- [ ] Cliccare "Ripristina"
- [ ] Verificare ritorno a 4 porzioni
- [ ] Verificare quantità originali

### Test 4: Validazione
- [ ] Tentare salvare ricetta senza prodotti selezionati → errore
- [ ] Tentare salvare con quantità 0 → errore
- [ ] Salvare con ingrediente opzionale → success
- [ ] Salvare senza ingredienti → success (bozza valida)

## Limitazioni Note

1. **Scaling Lineare:** Non tiene conto di proporzioni non-lineari (es. spezie, sale)
2. **Conversioni UOM:** Non converte automaticamente unità (es. g ↔ kg)
3. **Frazioni:** Display decimali invece di frazioni (1.5 invece di 1½)

## Prossimi Sviluppi (Out of Scope)

- [ ] Conversioni automatiche UOM
- [ ] Suggerimenti quantità smart per spezie
- [ ] Display frazioni (⅓, ½, ¼) invece di decimali
- [ ] Import ingredienti da ricetta esistente
- [ ] Costo stimato ricetta (se prezzi disponibili)

---

**Status:** ✅ Implementato e funzionante
**Last Updated:** 2025-01-09
