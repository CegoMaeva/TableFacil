# Delivery System - Test Cases & Expected Outcomes

## Test Environment Setup

### Prerequisites
```powershell
# Check Python version
python --version  # 3.8+

# Check Node version
node --version    # 16+

# Start Backend
cd Backend
python run.py     # Should start on http://127.0.0.1:5000

# Start Frontend (new terminal)
cd FontEnd
npm run dev       # Should start on http://localhost:5173
```

### Test Data (Livreur Credentials)
```
Username: driver1 (or check TEST_EMPLOYEE_CREDENTIALS.md)
Role: livreur
Expected: Auto-redirect to /delivery on login
```

---

## Test Case 1: Driver Login & Dashboard Load

### Steps
1. Open http://localhost:5173
2. Navigate to Login
3. Enter livreur credentials
4. Click Submit

### Expected Results
✅ Redirected to `/delivery` route  
✅ DeliveryDashboard component renders  
✅ See "Tableau Livreur" header  
✅ Statistics cards display (count, delivered, avg time)  
✅ Deliveries list loads (5-second polling)  
✅ User name displays in header  

### Error Handling
- Invalid credentials → Stay on login, error message
- Missing token → Redirect to login
- Network error → Console error, empty list shown

---

## Test Case 2: Load Deliveries List

### Steps
1. Login as livreur (from Test Case 1)
2. Wait for dashboard to load
3. Observe deliveries list (left panel)

### Expected Results
✅ List shows today's delivery-type orders  
✅ Each item shows:
  - Customer name ("Client" if missing)
  - Delivery address
  - Item summary (first 3 items)
  - Current status badge
  - Action buttons (View, Accept, Refuse)  
✅ Statistics update:
  - Total count of deliveries
  - Count of delivered items
  - Average time calculation  
✅ List refreshes every 5 seconds  

### Test Data Needed
- Create test orders with:
  - `type: "delivery"`
  - `createdAt: "2024-01-15T..."`  (today's date)
  - `status: "pending"`
  - `userName`, `address`, `items`, `phone`

### Verification
```bash
# Check API response
curl -H "Authorization: Bearer TOKEN" http://127.0.0.1:5000/api/orders | grep delivery
```

---

## Test Case 3: Select & View Delivery Details

### Steps
1. From deliveries list (Test Case 2)
2. Click "Voir" button on any delivery
3. Observe details panel (right side)

### Expected Results
✅ Details panel populates with:
  - Customer name
  - Delivery address
  - Phone (clickable tel: link)
  - Delivery notes
  - Map routing button
  - GPS toggle button
  - Action buttons (En route, Livré)  
✅ Page scrolls to top smoothly  
✅ Selecting different delivery updates panel

### Error Handling
- Missing address → Show as empty/placeholder
- Missing phone → Show as disabled
- Missing notes → Show "-"

---

## Test Case 4: Open Route in Maps

### Steps
1. Select a delivery (from Test Case 3)
2. Click "Itinéraire" (Route) button
3. Verify new tab opens

### Expected Results
✅ New browser tab opens  
✅ Google Maps opens with directions  
✅ Destination set to delivery address  
✅ No address → Error toast: "Adresse manquante"  

### Manual Verification
- Copy address from delivery details
- Paste in Google Maps
- Verify it matches opened map

---

## Test Case 5: Accept Delivery

### Steps
1. Select a delivery with status "pending"
2. Click "Accepter" button in delivery list
3. Verify status change

### Expected Results
✅ Status changes from "pending" to "accepted"  
✅ Toast notification: "Statut mis à jour"  
✅ Details panel updates
✅ PATCH request sent: `/api/orders/ID/status` with `{"status": "accepted"}`  

### Verification
```bash
# Check backend logs for PATCH request
# or monitor Network tab in browser DevTools
```

---

## Test Case 6: Refuse Delivery

### Steps
1. Select a delivery with status "pending"
2. Click "Refuser" button in delivery list
3. Verify status change

### Expected Results
✅ Status changes from "pending" to "refused"  
✅ Toast notification: "Statut mis à jour"  
✅ Details panel updates
✅ PATCH request sent: `/api/orders/ID/status` with `{"status": "refused"}`  

### Verification
```bash
# Check deliveries list for updated status
```

---

## Test Case 7: Photo Upload

### Steps
1. Select a delivery (accepted status preferred)
2. In details panel, find "Preuve photo" section
3. Click file input
4. Select an image from computer
5. Wait for upload

### Expected Results
✅ File dialog opens  
✅ Image preview displays below input  
✅ Toast: "Preuve enregistrée"  
✅ POST request sent: `/api/deliveries/ID/proofs`  
✅ Request body contains:
  ```json
  {
    "type": "photo",
    "data": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```
✅ Backend response includes proof ID and timestamp  

### Verification
```bash
# Check deliveries.json
cat Backend/data/deliveries.json | grep -A 5 "photo"
```

### Error Handling
- Large file (>10MB) → May timeout, recommend compression
- Invalid format → FileReader still converts (validation on backend)
- Network error → Toast error message shown

---

## Test Case 8: Signature Capture

### Steps
1. Select a delivery
2. Find "Signature client" section
3. Click "Signer" button
4. Draw a signature on canvas with mouse
5. Click "Enregistrer" to save

### Expected Results
✅ "Signer" button hidden, canvas appears  
✅ Canvas shows white strokes on black background  
✅ Mouse tracking works (real-time drawing)  
✅ "Enregistrer" button saves as PNG image  
✅ Toast: "Preuve enregistrée"  
✅ Image preview displays
✅ POST request sent: `/api/deliveries/ID/proofs`  
✅ Request body contains:
  ```json
  {
    "type": "signature",
    "data": "data:image/png;base64,iVBORw0KGgo..."
  }
  ```

### Test Actions
- Draw simple line
- Draw complex pattern
- Use "Effacer" (Clear) button to reset
- Use "Annuler" (Cancel) to exit without saving

### Expected Canvas Behavior
- Clear button: Canvas resets (white strokes disappear)
- Cancel button: Panel closes, no upload
- Save button: PNG created, signature persists

---

## Test Case 9: QR Code Scanner

### Steps
1. Select a delivery
2. Find "QR/Barcode" section
3. Click "Scanner QR" button
4. Browser requests camera permission
5. Allow camera access
6. Either:
   - Scan a QR code, OR
   - Type code manually in text input
7. Press Enter to validate

### Expected Results
✅ Camera permission dialog appears  
✅ Video stream opens (shows webcam feed)  
✅ Text input field available for manual entry  
✅ "Fermer" (Close) button visible  
✅ Entering text and pressing Enter:
  - Code validates
  - Toast: "Preuve enregistrée"
  - POST request sent: `/api/deliveries/ID/proofs`
  ```json
  {
    "type": "qrcode",
    "data": "CODE-VALUE-HERE"
  }
  ```
✅ Scan result displays: "Code: CODE-VALUE-HERE"  
✅ Video stream stops when closed  

### Camera Access Issues
- Permission denied → Toast: "Accès caméra refusé"
- No camera → getUserMedia error shown
- Mobile: May prompt for camera differently

### Test QR Codes
- Use any valid QR code (or test string like "TEST-123-ABC")
- Manual entry simulates scanning

---

## Test Case 10: GPS Tracking

### Steps
1. Select a delivery
2. Find GPS button (currently shows "📍 GPS OFF")
3. Click GPS OFF button
4. Browser requests location permission
5. Allow location access
6. Wait 10 seconds for update
7. Click GPS ON to disable

### Expected Results
✅ Location permission dialog appears  
✅ Button changes to "📍 GPS ON" (green background)  
✅ Location displays: "Position: 48.8566, 2.3522"  
✅ Coordinates update every 10 seconds  
✅ POST request sent every 10 seconds: `/api/deliveries/ID/location`
✅ Request body contains:
  ```json
  {
    "latitude": 48.8566,
    "longitude": 2.3522
  }
  ```
✅ Button toggle changes to "📍 GPS OFF"  
✅ Location updates stop after toggle  

### Location Testing (Desktop)
- **Chrome DevTools**: Simulate location via Sensors
  - Press F12 → Sensors → Location
  - Set custom coordinates
  - Toggle for testing
- **Manual**: Use actual device location if available

### Verification
```bash
# Check deliveries.json for location entries
cat Backend/data/deliveries.json | grep -A 3 "latitude"
```

### Error Handling
- Permission denied → Error logged, button stays OFF
- GPS unavailable → Error logged, button stays OFF
- Network error → Silent (location stored locally)

---

## Test Case 11: Status Updates (En Route / Delivered)

### Steps
1. Select a delivery
2. In details panel, bottom section
3. Click "En route" button
4. Verify status changes
5. Click "Livré" button
6. Verify final status

### Expected Results
✅ "En route" button updates status to "en_route"  
✅ Toast: "Statut mis à jour"  
✅ "Livré" button updates status to "delivered"  
✅ Toast: "Statut mis à jour"  
✅ Delivery list updates in real-time  
✅ PATCH requests sent to `/api/orders/ID/status`  

### Verification Flow
```
pending → (Accept) → accepted
       → (Accept) → accepted (En route) → en_route
       → (En route) → en_route (Livré) → delivered
```

---

## Test Case 12: Complete Delivery Workflow

### Steps
1. Login as driver
2. Accept a delivery
3. Upload photo
4. Capture signature
5. Scan/enter QR code
6. Enable GPS, wait 2-3 updates
7. Click "En route"
8. Wait another GPS update
9. Click "Livré"
10. Select another delivery

### Expected Results
✅ All steps complete without errors  
✅ Proofs persist throughout workflow  
✅ GPS updates continue until toggled off  
✅ Final status = "delivered"  
✅ Delivery can be deselected
✅ New delivery loads in details panel  

### Backend Verification
```bash
# Check deliveries.json contains:
# - Multiple deliveries
# - Multiple proofs per delivery
# - Multiple locations per delivery
cat Backend/data/deliveries.json | python -m json.tool
```

---

## Test Case 13: Error Scenarios

### Test 13a: Invalid Token
**Steps**:
1. Login
2. Clear localStorage auth_token
3. Try to load deliveries

**Expected**:
✅ 401 Unauthorized error  
✅ Redirect to login  

### Test 13b: Network Offline
**Steps**:
1. Start dashboard
2. Disable network (DevTools → Offline)
3. Try actions

**Expected**:
✅ "Erreur" toast messages  
✅ Console shows network errors  
✅ UI remains responsive (not frozen)

### Test 13c: Invalid GPS Coordinates
**Steps**:
1. Manually POST with invalid coordinates:
```bash
curl -X POST http://127.0.0.1:5000/api/deliveries/ID/location \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 200, "longitude": 400}'
```

**Expected**:
✅ 400 Bad Request  
✅ Error message about coordinate range  

### Test 13d: Missing Required Fields
**Steps**:
1. POST proof without type:
```bash
curl -X POST http://127.0.0.1:5000/api/deliveries/ID/proofs \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "some-data"}'
```

**Expected**:
✅ 400 Bad Request  
✅ Error: "Type et data requis"  

---

## Test Case 14: Manager View All Deliveries

### Steps
1. Login as manager (gérant role)
2. Call API directly or build manager dashboard:
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://127.0.0.1:5000/api/deliveries
```

### Expected Results
✅ 200 OK response  
✅ Response contains array of all deliveries  
✅ Each delivery includes:
  - id, userName, address, status
  - lastLocation (most recent)
  - proofs array (all proofs collected)
  - timestamps  
✅ Non-manager gets 403 Forbidden  

### Response Example
```json
{
  "deliveries": [
    {
      "id": "order-123",
      "userName": "John Doe",
      "address": "123 Rue Paris",
      "status": "delivered",
      "lastLocation": {
        "latitude": 48.8566,
        "longitude": 2.3522,
        "timestamp": "2024-01-15T10:35:00"
      },
      "proofs": [
        {
          "id": "PROOF-ABC123",
          "type": "photo",
          "timestamp": "2024-01-15T10:30:00"
        },
        {
          "id": "PROOF-DEF456",
          "type": "signature",
          "timestamp": "2024-01-15T10:31:00"
        }
      ]
    }
  ]
}
```

---

## Test Case 15: Proof Retrieval

### Steps
1. Upload photo, signature, and QR code
2. Verify all in deliveries.json

### Expected Results
✅ deliveries.json contains delivery object  
✅ proofs array has 3 entries  
✅ Each proof has:
  - id (generated UUID)
  - type (photo/signature/qrcode)
  - data (base64 or text)
  - timestamp (ISO format)  

### Manual Verification
```bash
# Read file
cat Backend/data/deliveries.json | python -m json.tool

# Should show structure like:
# {
#   "id": "order-123",
#   "proofs": [
#     {
#       "id": "PROOF-ABC123DE",
#       "type": "photo",
#       "data": "data:image/png;base64,...",
#       "timestamp": "2024-01-15T10:30:00"
#     }
#   ]
# }
```

---

## Performance Test Cases

### Test Case 16: Multiple Deliveries Load
**Steps**:
1. Create 50+ delivery orders for today
2. Load dashboard
3. Measure time

**Expected**:
✅ Initial load: < 2 seconds  
✅ Polling every 5 sec: < 500ms  
✅ No UI freeze or lag  

### Test Case 17: GPS Continuous Update
**Steps**:
1. Enable GPS
2. Let run for 5 minutes
3. Check locations array size
4. Monitor memory usage

**Expected**:
✅ Locations = 30-60 entries (one per 10 sec)  
✅ No memory leak  
✅ CPU usage normal (~5%)  
✅ Network traffic: 1-2 requests/10 sec  

### Test Case 18: Large Photo Upload
**Steps**:
1. Take high-res photo (5MB+)
2. Upload via dashboard
3. Monitor network

**Expected**:
✅ Upload completes (may take 5-10 seconds)  
✅ Toast shows success  
✅ Base64 stored in JSON  
⚠️ Consider compression for production  

---

## Browser Compatibility Tests

### Test Case 19: Chrome/Edge
- [x] All features work
- [x] Geolocation works
- [x] Camera works
- [x] Canvas works

### Test Case 20: Firefox
- [x] All features work
- [x] Geolocation works
- [x] Camera works
- [x] Canvas works

### Test Case 21: Safari (Desktop)
- [x] Features work
- ⚠️ May require HTTPS

### Test Case 22: Mobile Safari (iOS)
- [x] Interface responsive
- ⚠️ Requires HTTPS for geolocation
- [x] Camera works
- [x] Touch input works

---

## Regression Tests

After any code changes, run:

### Critical Path
1. [x] Login and reach /delivery
2. [x] Load deliveries
3. [x] Accept delivery
4. [x] Upload photo
5. [x] Mark delivered

### All Features
1. [x] Refuse delivery
2. [x] Capture signature
3. [x] Scan QR code
4. [x] Enable GPS
5. [x] View manager endpoint

---

## Test Summary Table

| Test Case | Feature | Status | Priority |
|-----------|---------|--------|----------|
| 1 | Login & Dashboard | Must Pass | Critical |
| 2 | Load Deliveries | Must Pass | Critical |
| 3 | View Details | Must Pass | Critical |
| 4 | Route Button | Must Pass | High |
| 5 | Accept Delivery | Must Pass | Critical |
| 6 | Refuse Delivery | Must Pass | Critical |
| 7 | Photo Upload | Must Pass | Critical |
| 8 | Signature Capture | Must Pass | Critical |
| 9 | QR Code Scan | Must Pass | Critical |
| 10 | GPS Tracking | Must Pass | Critical |
| 11 | Status Updates | Must Pass | Critical |
| 12 | Complete Workflow | Must Pass | Critical |
| 13 | Error Handling | Must Pass | High |
| 14 | Manager View | Must Pass | High |
| 15 | Proof Retrieval | Must Pass | High |
| 16 | Performance | Should Pass | Medium |
| 17 | GPS Stability | Should Pass | Medium |
| 18 | Large Files | Should Pass | Low |
| 19-22 | Browser Compat | Should Pass | Medium |

---

**All 22 test cases ready for execution.**  
**Estimated testing time: 2-3 hours for full coverage.**  
**Critical path (tests 1-12): 30-45 minutes.**
