# Backend Deployment Verification Checklist

## ✅ Required Functions in Google Apps Script

Check that these functions exist in your deployed script:

### Core Functions:
- [ ] `createSession(userId, role)`
- [ ] `validateSession(sessionId)`
- [ ] `deleteSession(sessionId)`
- [ ] `cleanupExpiredSessions()`
- [ ] `loginUser(e)` - NEW LOGIN ENDPOINT
- [ ] `validateSession(e)` - NEW VALIDATION ENDPOINT
- [ ] `doGet(e)` - UPDATED WITH SESSION VALIDATION
- [ ] `doPost(e)` - UPDATED WITH SESSION VALIDATION

### Existing Functions (should still work):
- [ ] `getSettings()`
- [ ] `isOfficeClosed(date)`
- [ ] `isWeekendOrHoliday(date)`
- [ ] `sendDailyEmails()`

## 🔍 Testing Steps

### 1. Create Sessions Sheet
1. Open your Google Sheet
2. Click "+" to add new sheet
3. Name it exactly: `sessions`
4. Add headers in row 1: `sessionId | sessionData | createdAt | expiresAt`

### 2. Test Login Endpoint
Open this URL in browser:
```
https://script.google.com/macros/s/AKfycbz8aGa9gSSEDx4zTtbb8fhx9iW-wmx9bE7yf5FUBygZ69lG-1EgSgLJ-LBnomV_wNTY/exec?action=login&id=YOUR_ID&pass=YOUR_PASSWORD
```

Expected response:
```json
{
  "success": true,
  "sessionId": "random-string-here",
  "user": {
    "id": "your-id",
    "name": "Your Name",
    "role": "user/admin/superadmin"
  }
}
```

### 3. Test Session Validation
After successful login, test:
```
https://script.google.com/macros/s/AKfycbz8aGa9gSSEDx4zTtbb8fhx9iW-wmx9bE7yf5FUBygZ69lG-1EgSgLJ-LBnomV_wNTY/exec?action=validatesession&sessionId=SESSION_ID_FROM_LOGIN
```

Expected response:
```json
{
  "valid": true,
  "userId": "your-id", 
  "role": "user/admin/superadmin"
}
```

### 4. Test Frontend Integration
1. Open `index.html` in browser
2. Try logging in with valid credentials
3. Check browser console for errors
4. Verify only `sessionId` is stored in localStorage
5. Check that dashboard/admin loads correctly

## 🚨 Common Issues & Solutions

### Issue: "Action not found"
**Solution**: Make sure `loginUser` function is saved and deployed

### Issue: "No sessions sheet found"
**Solution**: Create the `sessions` sheet with correct headers

### Issue: "Invalid session"
**Solution**: Check that sessionId is being passed correctly in API calls

### Issue: CORS/Network errors
**Solution**: Make sure backend is deployed as web app

## 📱 Quick Test Commands

### Test Login (replace with actual credentials):
```javascript
fetch('https://script.google.com/macros/s/AKfycbz8aGa9gSSEDx4zTtbb8fhx9iW-wmx9bE7yf5FUBygZ69lG-1EgSgLJ-LBnomV_wNTY/exec?action=login&id=test&pass=test')
  .then(r => r.json())
  .then(console.log)
```

### Test Session Validation:
```javascript
fetch('https://script.google.com/macros/s/AKfycbz8aGa9gSSEDx4zTtbb8fhx9iW-wmx9bE7yf5FUBygZ69lG-1EgSgLJ-LBnomV_wNTY/exec?action=validatesession&sessionId=test')
  .then(r => r.json())
  .then(console.log)
```

## ✅ Success Indicators

- Login returns sessionId ✅
- Session validation works ✅
- Dashboard loads with server-validated data ✅
- Admin panel loads with server-validated data ✅
- localStorage contains only sessionId ✅
- No localStorage role/userId manipulation possible ✅

## 🎯 Final Verification

Once all tests pass, your server-side authentication is fully implemented and secure!

---

*Check this file as you complete each step*
