// =============================================
// OFFICE ATTENDANCE SYSTEM - BACKEND v1.6
// UPDATED: SERVER-SIDE SESSION AUTHENTICATION
// =============================================
// CONFIG
// =============================================

const ADMIN_EMAIL = "sarwarcsembstu@gmail.com";
const TIMEZONE    = "GMT+6";

// =============================================
// SESSION MANAGEMENT FUNCTIONS
// =============================================

function setupSessionsSheet() {
  const ss = SpreadsheetApp.getActive();
  let sessionSheet = ss.getSheetByName("sessions");
  
  if(!sessionSheet) {
    sessionSheet = ss.insertSheet("sessions");
    sessionSheet.appendRow(["sessionId", "sessionData", "createdAt", "expiresAt"]);
    Logger.log("✅ Created sessions sheet with headers");
  }
  
  // Clean up expired sessions on setup
  cleanupExpiredSessions();
}

function createSession(userId, role) {
  const sessionId = Utilities.getUuid();
  const expiry = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  const sessionData = {
    userId: userId,
    role: role,
    createdAt: new Date(),
    expiresAt: expiry
  };
  
  const sessionSheet = SpreadsheetApp.getActive().getSheetByName("sessions");
  if(!sessionSheet) {
    sessionSheet = SpreadsheetApp.getActive().insertSheet("sessions");
    sessionSheet.appendRow(["sessionId", "sessionData", "createdAt", "expiresAt"]);
  }
  
  sessionSheet.appendRow([sessionId, JSON.stringify(sessionData), sessionData.createdAt, sessionData.expiresAt]);
  return sessionId;
}

function validateSession(sessionId) {
  const sessionSheet = SpreadsheetApp.getActive().getSheetByName("sessions");
  if(!sessionSheet) {
    return {valid: false, error: "No sessions sheet found"};
  }
  
  const data = sessionSheet.getDataRange().getValues();
  const now = new Date();
  
  for(let i = 1; i < data.length; i++) {
    if(data[i][0] === sessionId) {
      const sessionData = JSON.parse(data[i][1] || "{}");
      const expiresAt = new Date(sessionData.expiresAt);
      
      if(now <= expiresAt) {
        return {
          valid: true,
          userId: sessionData.userId,
          role: sessionData.role
        };
      } else {
        // Session expired - clean it up
        sessionSheet.deleteRow(i + 1);
        return {valid: false, error: "Session expired"};
      }
    }
  }
  
  return {valid: false, error: "Invalid session"};
}

function deleteSession(sessionId) {
  const sessionSheet = SpreadsheetApp.getActive().getSheetByName("sessions");
  if(!sessionSheet) return;
  
  const data = sessionSheet.getDataRange().getValues();
  for(let i = 1; i < data.length; i++) {
    if(data[i][0] === sessionId) {
      sessionSheet.deleteRow(i + 1);
      break;
    }
  }
  
  // Clean expired sessions
  cleanupExpiredSessions();
}

function cleanupExpiredSessions() {
  const sessionSheet = SpreadsheetApp.getActive().getSheetByName("sessions");
  if(!sessionSheet) return;
  
  const data = sessionSheet.getDataRange().getValues();
  const now = new Date();
  const toDelete = [];
  
  for(let i = 1; i < data.length; i++) {
    const expiresAt = new Date(JSON.parse(data[i][1] || "{}").expiresAt);
    if(now > expiresAt) {
      toDelete.push(i + 1);
    }
  }
  
  // Delete in reverse order to maintain row numbers
  for(let i = toDelete.length - 1; i >= 0; i--) {
    sessionSheet.deleteRow(toDelete[i]);
  }
} 

// =============================================
// HELPER: READ SETTINGS FROM SHEET
// ==============================================

function getSettings(){
  const ss = SpreadsheetApp.getActive();
  const settingsSheet = ss.getSheetByName("settings");
  
  const defaults = {
    officeStartTime: "09:00",
    officeEndTime: "17:00",
    signInGraceMins: 15,
    signInWindowMins: 60,
    signOutGraceMins: 10,
    officeClosedFrom: "",
    officeClosedTo: "",
    emailsPaused: "no",
    customHolidays: "Friday,Saturday",
    officeLat: "24.8946369",
    officeLng: "89.7183403",
    officeRadius: "100"
  };
  
  if(!settingsSheet){
    return defaults;
  }
  
  const data = settingsSheet.getDataRange().getValues();
  const settings = { ...defaults };
  
  for(let i = 1; i < data.length; i++){
    const key = String(data[i][0]).trim();
    let val = data[i][1];
    
    // Convert Date objects to proper format
    if(val instanceof Date){
      // Check if it's a time (year is 1899)
      if(val.getFullYear() === 1899){
        // Time format: HH:MM
        const hours = String(val.getHours()).padStart(2, "0");
        const mins = String(val.getMinutes()).padStart(2, "0");
        val = hours + ":" + mins;
      } else {
        // Date format: YYYY-MM-DD (or M/D/YYYY)
        const year = val.getFullYear();
        const month = String(val.getMonth() + 1).padStart(2, "0");
        const day = String(val.getDate()).padStart(2, "0");
        val = year + "-" + month + "-" + day;
      }
    } else {
      // String values - just trim
      val = String(val).trim();
    }
    
    if(key) settings[key] = val;
  }
  
  return settings;
}

function isOfficeClosed(date){
  const settings = getSettings();
  const from = settings.officeClosedFrom;
  const to = settings.officeClosedTo;
  
  if(!from || !to) return false;
  
  const checkDate = new Date(date);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  return checkDate >= fromDate && checkDate <= toDate;
}

function isWeekendOrHoliday(date){
  const settings = getSettings();
  const customHolidays = settings.customHolidays || "Friday,Saturday";
  const holidayList = customHolidays.split(",").map(d => d.trim().toLowerCase());
  
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayOfWeek = new Date(date).getDay();
  const dayName = dayNames[dayOfWeek];
  
  return holidayList.includes(dayName);
}


// =============================================
// doGet - GET HISTORY, ADMIN DATA & CHECK DEVICE
// =============================================

function doGet(e){

  // Auto-setup sessions sheet on first run
  setupSessionsSheet();

  const action = e.parameter.action || "history";
  const sessionId = e.parameter.sessionId;
  
  // Validate session for all protected endpoints
  if(action !== "history" && action !== "login") {
    const sessionValidation = validateSession(sessionId);
    if(!sessionValidation.valid) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: sessionValidation.error || "Invalid session"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ========== LOGIN ==========
  if(action === "login"){
    return loginUser(e);
  }

  // ========== TEST ENDPOINT ==========
  if(action === "test"){
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Backend is deployed and working",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ========== VALIDATE SESSION ==========
  if(action === "validatesession"){
    const sessionId = e.parameter.sessionId;
    const validation = validateSession(sessionId);
    return ContentService
      .createTextOutput(JSON.stringify(validation))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ========== GET HISTORY (single user) ==========
  if(action === "history"){
    const rows = getHistoryInternal(e.parameter.id);
    return ContentService
      .createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ========== INITIALIZE DASHBOARD (consolidated & optimized) ==========
  // This endpoint handles device checks, history, and settings in one fast trip.
  if(action === "initdash"){
    const uid = e.parameter.id;
    const fp = e.parameter.fp;
    
    const deviceStatus = checkDeviceInternal(uid, fp);
    const history = getHistoryInternal(uid);
    const settings = getSettings();
    const leaveStatus = getUserLeaveStatus(uid);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        deviceStatus: deviceStatus,
        history: history,
        settings: settings,
        leaveStatus: leaveStatus
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }


  // ========== GET ALL DATA (admin dashboard) ==========
  if(action === "admindata"){

    const sheet = SpreadsheetApp.getActive().getSheetByName("attendance");
    const data  = sheet.getDataRange().getValues();
    let rows    = [];

    for(let i = 1; i < data.length; i++){
      const r = data[i];
      if(!r[1] || String(r[1]).trim() === "") continue;

      let inTime = r[4];
      if(inTime instanceof Date){
        inTime = Utilities.formatDate(inTime, TIMEZONE, "h:mm a");
      } else {
        inTime = String(inTime).replace(/^'+/, "");
      }

      let outTime = r[5];
      if(outTime instanceof Date){
        outTime = Utilities.formatDate(outTime, TIMEZONE, "h:mm a");
      } else {
        outTime = String(outTime).replace(/^'+/, "");
      }

      let date = r[3];
      if(date instanceof Date){
        date = Utilities.formatDate(date, TIMEZONE, "M/d/yyyy");
      } else {
        date = String(date).replace(/^'+/, "");
      }

      let timestamp = r[0];
      if(timestamp instanceof Date){
        timestamp = Utilities.formatDate(timestamp, TIMEZONE, "M/d/yyyy h:mm a");
      } else {
        timestamp = String(timestamp);
      }

      rows.push({
        timestamp: timestamp,
        date   : date,
        id     : String(r[1]).trim(),
        name   : String(r[2]).trim(),
        inTime : inTime,
        outTime: outTime,
        status : String(r[8]).trim()
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  }


  // ========== CHECK DEVICE ==========
  if(action === "checkdevice"){
    const res = checkDeviceInternal(e.parameter.id, e.parameter.fp);
    return ContentService
      .createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ========== GET USERS (admin only) ==========
  if(action === "getusers"){
    const userSheet = SpreadsheetApp.getActive().getSheetByName("users");
    if(!userSheet){
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    const data = userSheet.getDataRange().getValues();
    const headers = data[0] || [];
    
    const idCol = headers.indexOf("ID");
    const nameCol = headers.indexOf("Name");
    const emailCol = headers.indexOf("Email");
    const roleCol = headers.indexOf("Role");
    let statusCol = headers.indexOf("Status");
    
    // Auto-create Status column if missing
    if(statusCol === -1) {
      statusCol = headers.length;
      userSheet.getRange(1, statusCol + 1).setValue("Status");
    }
    
    let users = [];
    for(let i=1; i<data.length; i++){
      if(idCol !== -1 && !String(data[i][idCol]).trim()) continue; // skip empty rows
      let rowStatus = "Active";
      if(data[i].length > statusCol && String(data[i][statusCol]).trim() !== "") {
        rowStatus = String(data[i][statusCol]).trim();
      }
      
      users.push({
        id: idCol !== -1 ? String(data[i][idCol]).trim() : "",
        name: nameCol !== -1 ? String(data[i][nameCol]).trim() : "",
        email: emailCol !== -1 ? String(data[i][emailCol]).trim() : "",
        role: roleCol !== -1 ? String(data[i][roleCol]).trim() : "",
        status: rowStatus
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify(users)).setMimeType(ContentService.MimeType.JSON);
  }

  // ========== GET DEVICES (admin only) ==========
  if(action === "getdevices"){
    const deviceSheet = SpreadsheetApp.getActive().getSheetByName("devices");
    if(!deviceSheet){
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    const data = deviceSheet.getDataRange().getValues();
    let devices = [];
    for(let i=1; i<data.length; i++){
      if(!String(data[i][0]).trim() && !String(data[i][1]).trim()) continue; // skip blank rows
      devices.push({
        id: String(data[i][0]).trim(),
        fp: String(data[i][1]).trim()
      });
    }
    return ContentService.createTextOutput(JSON.stringify(devices)).setMimeType(ContentService.MimeType.JSON);
  }

  // ========== GET ALL LEAVES (admin only) ==========
  if(action === "getleaves"){
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName("leaves");
    const userSheet = ss.getSheetByName("users");
    if(!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    
    // Create a name map for IDs
    const userMap = {};
    if (userSheet) {
      const uData = userSheet.getDataRange().getValues();
      const uHeaders = uData[0];
      const idIdx = uHeaders.indexOf("ID");
      const nameIdx = uHeaders.indexOf("Name");
      for (let i = 1; i < uData.length; i++) {
        userMap[String(uData[i][idIdx]).trim()] = String(uData[i][nameIdx]).trim();
      }
    }

    const data = sheet.getDataRange().getValues();
    let rows = [];
    for(let i = 1; i < data.length; i++){
      const uid = String(data[i][0]).trim();
      rows.push({
        id: uid,
        name: userMap[uid] || "---",
        start: data[i][1],
        end: data[i][2],
        timestamp: data[i][3] || "---"
      });
    }
    return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
  }

    // ========== GET SETTINGS (for admin) ==========
  if(action === "getsettings"){
    const settings = getSettings();
    return ContentService
      .createTextOutput(JSON.stringify(settings))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// =============================================
// doPost - MARK ATTENDANCE
// =============================================

function doPost(e){

  // Auto-setup sessions sheet on first run
  setupSessionsSheet();

  const sessionId = e.parameter.sessionId;
  
  // Validate session for all protected operations
  if(!sessionId) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "No session provided"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const sessionValidation = validateSession(sessionId);
  if(!sessionValidation.valid) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: sessionValidation.error || "Invalid session"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const id     = e.parameter.id;
  const name   = e.parameter.name;
  const status = e.parameter.status;
  const type   = e.parameter.type;

  const sheet = SpreadsheetApp.getActive().getSheetByName("attendance");
  const now   = new Date();
  const today = Utilities.formatDate(now, TIMEZONE, "M/d/yyyy");
  const time  = Utilities.formatDate(now, TIMEZONE, "h:mm a");

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for(let i = 1; i < data.length; i++){
    let d = data[i][3];
    if(d instanceof Date){
      d = Utilities.formatDate(d, TIMEZONE, "M/d/yyyy");
    } else {
      d = String(d).replace(/^'+/, "");
    }
    const uid = String(data[i][1]);
    if(d === today && uid === id){
      rowIndex = i + 1;
      break;
    }
  }

  if(type === "in"){
    if(rowIndex === -1){
      sheet.appendRow([now, id, name, today, "'"+time, "---", "", "", status]);
    } else {
      sheet.getRange(rowIndex, 5).setValue("'"+time);
      sheet.getRange(rowIndex, 9).setValue(status);
    }
  }

  if(type === "out"){
    if(rowIndex !== -1){
      const existingStatus = String(sheet.getRange(rowIndex, 9).getValue()).trim();
      let finalStatus = "";
      if(existingStatus === "Present" && status === "Present")             finalStatus = "Present";
      else if(existingStatus === "Late Entry" && status === "Present")     finalStatus = "Late Entry";
      else if(existingStatus === "Present" && status === "Early Leave")    finalStatus = "Early Leave";
      else if(existingStatus === "Late Entry" && status === "Early Leave") finalStatus = "Late Entry | Early Leave";
      else if(existingStatus === "Very Late" && status === "Present")      finalStatus = "Very Late";
      else if(existingStatus === "Very Late" && status === "Early Leave")  finalStatus = "Very Late | Early Leave";
      else finalStatus = status;
      sheet.getRange(rowIndex, 6).setValue("'"+time);
      sheet.getRange(rowIndex, 9).setValue(finalStatus);
    }
  }

  if(type === "out-verylate"){
    const finalStatus = status === "Early Leave" ? "Very Late | Early Leave" : "Very Late";
    if(rowIndex === -1){
      sheet.appendRow([now, id, name, today, "Very Late", "'"+time, "", "", finalStatus]);
    } else {
      const existingIn = String(sheet.getRange(rowIndex, 5).getValue()).replace(/^'+/, "").trim();
      if(!existingIn || existingIn === "---" || existingIn === ""){
        sheet.getRange(rowIndex, 5).setValue("Very Late");
      }
      sheet.getRange(rowIndex, 6).setValue("'"+time);
      sheet.getRange(rowIndex, 9).setValue(finalStatus);
    }
  }

  if(type === "verylate"){
    if(rowIndex === -1){
      sheet.appendRow([now, id, name, today, "Very Late", "---", "", "", "Very Late"]);
    } else {
      const existingIn = String(sheet.getRange(rowIndex, 5).getValue()).replace(/^'+/, "").trim();
      if(!existingIn || existingIn === "---" || existingIn === ""){
        sheet.getRange(rowIndex, 5).setValue("Very Late");
        sheet.getRange(rowIndex, 9).setValue("Very Late");
      }
    }
  }
// ---------- UPDATE SETTINGS (admin only) ----------

if(type === "updatesettings"){
    const key = e.parameter.key;
    const value = e.parameter.value;
    
    const settingsSheet = SpreadsheetApp.getActive().getSheetByName("settings");
    if(!settingsSheet){
      Logger.log("❌ Settings sheet not found!");
      return ContentService
        .createTextOutput(JSON.stringify({success:false, error:"Settings sheet not found"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    Logger.log("Trying to save: " + key + " = " + value);
    
    const data = settingsSheet.getDataRange().getValues();
    let updated = false;
    
    // Log all existing keys
    Logger.log("Existing keys in sheet:");
for(let i = 1; i < data.length; i++){
  const sheetKey = String(data[i][0]).trim();
  const actualRow = i + 1;  // Convert array index to actual row number
  Logger.log("  Array index " + i + " = Sheet row " + actualRow + ": [" + sheetKey + "]");
  
  if(sheetKey === key){
    Logger.log("✅ Found key at sheet row " + actualRow + ", updating column 2...");
    settingsSheet.getRange(actualRow, 2).setValue(value);  // Use actualRow, not i
    updated = true;
    break;
  }
}
    
    if(!updated){
      Logger.log("⚠️ Key not found, appending new row");
      settingsSheet.appendRow([key, value]);
    }
    
    Logger.log("✅ Save complete for: " + key);
    return ContentService
      .createTextOutput(JSON.stringify({success:true}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ---------- CREATE USER (admin only) ----------
  if(type === "createuser"){
    const uid = e.parameter.userid;
    const uname = e.parameter.name;
    const uemail = e.parameter.email;
    const upass = e.parameter.pass;
    const urole = e.parameter.role || "user";

    const userSheet = SpreadsheetApp.getActive().getSheetByName("users");
    if(!userSheet){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"Users sheet not found"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    const userRows = userSheet.getDataRange().getValues();
    const headers = userRows[0] || [];
    
    const idCol = headers.indexOf("ID");
    if(idCol === -1){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"ID column not found in users sheet"})).setMimeType(ContentService.MimeType.JSON);
    }

    for(let i = 1; i < userRows.length; i++){
      if(String(userRows[i][idCol]).trim() === uid){
        return ContentService.createTextOutput(JSON.stringify({success:false, error:"Employee ID already exists!"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    let newRow = new Array(headers.length).fill("");
    
    const nameCol = headers.indexOf("Name");
    const emailCol = headers.indexOf("Email");
    const passCol = headers.indexOf("Password");
    const roleCol = headers.indexOf("Role");
    let statusCol = headers.indexOf("Status");
    if(statusCol === -1) statusCol = headers.length; // Handle dynamically appended header previously

    if (idCol !== -1) newRow[idCol] = uid;
    if (nameCol !== -1) newRow[nameCol] = uname;
    if (emailCol !== -1) newRow[emailCol] = uemail;
    if (passCol !== -1) newRow[passCol] = upass;
    if (roleCol !== -1) newRow[roleCol] = urole;
    newRow[statusCol] = "Active"; // Default status
    
    userSheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({success:true, message:"User created successfully"})).setMimeType(ContentService.MimeType.JSON);
  }

  // ---------- TOGGLE USER STATUS (admin only) ----------
  if(type === "toggleuserstatus"){
    const targetId = e.parameter.userid;
    const userSheet = SpreadsheetApp.getActive().getSheetByName("users");
    if(!userSheet){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"Users sheet not found"})).setMimeType(ContentService.MimeType.JSON);
    }

    const data = userSheet.getDataRange().getValues();
    const headers = data[0] || [];
    const idCol = headers.indexOf("ID");
    const statusCol = headers.indexOf("Status");
    
    if(idCol === -1 || statusCol === -1){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"ID or Status column not found. Reload page to initialize headers."})).setMimeType(ContentService.MimeType.JSON);
    }
    
    let toggled = false;
    for(let i = 1; i < data.length; i++){
      if(String(data[i][idCol]).trim() === String(targetId).trim()){
        const currentStatus = String(data[i][statusCol]).trim() || "Active";
        const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
        userSheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
        toggled = true;
        break; 
      }
    }

    if(toggled){
      return ContentService.createTextOutput(JSON.stringify({success:true, message:"User status updated"})).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"User not found"})).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ---------- DELETE USER (admin only) ----------
  if(type === "deleteuser"){
    const targetId = e.parameter.userid;
    const userSheet = SpreadsheetApp.getActive().getSheetByName("users");
    if(!userSheet){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"Users sheet not found"})).setMimeType(ContentService.MimeType.JSON);
    }

    const data = userSheet.getDataRange().getValues();
    const headers = data[0] || [];
    const idCol = headers.indexOf("ID");
    
    if(idCol === -1){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"ID column not found"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    let deleted = false;
    for(let i = data.length - 1; i >= 1; i--){
      if(String(data[i][idCol]).trim() === String(targetId).trim()){
        userSheet.deleteRow(i + 1); // array is 0-indexed, rows are 1-indexed
        deleted = true;
        break; // Assume 1 user at a time
      }
    }

    if(deleted){
      return ContentService.createTextOutput(JSON.stringify({success:true, message:"User deleted"})).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"User not found"})).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ---------- GRANT LEAVE (admin only) ----------
  if(type === "grantleave"){
    const uid = e.parameter.userid;
    const start = e.parameter.startdate; // YYYY-MM-DD
    const end = e.parameter.enddate; // YYYY-MM-DD
    
    const ss = SpreadsheetApp.getActive();
    let leaveSheet = ss.getSheetByName("leaves");
    if(!leaveSheet){
      leaveSheet = ss.insertSheet("leaves");
      leaveSheet.appendRow(["ID", "From", "To", "Timestamp"]);
    }
    
    leaveSheet.appendRow([uid, start, end, new Date()]);
    
    // Find User to send email
    const userSheet = ss.getSheetByName("users");
    if(userSheet){
      const data = userSheet.getDataRange().getValues();
      const headers = data[0] || [];
      const idCol = headers.indexOf("ID");
      const nameCol = headers.indexOf("Name");
      const emailCol = headers.indexOf("Email");
      
      if(idCol !== -1 && emailCol !== -1){
        for(let i=1; i<data.length; i++){
          if(String(data[i][idCol]).trim() === String(uid)){
            const uname = String(data[i][nameCol]).trim();
            const uemail = String(data[i][emailCol]).trim();
            if(uemail){
              const subject = `Leave Approved - ${uname}`;
              const bodyHTML = `
                <div style="font-family:Arial,sans-serif;padding:20px;">
                  <h2 style="color:#0056b3;">Leave Application Approved</h2>
                  <p>Dear ${uname},</p>
                  <p>Your leave has been successfully approved.</p>
                  <p><strong>From:</strong> ${start}<br>
                  <strong>To:</strong> ${end} (Inclusive)</p>
                  <p>Enjoy your leave. Do not worry about attendance during these days.</p>
                  <p>Regards,<br>Administrator</p>
                </div>
              `;
              try {
                GmailApp.sendEmail(uemail, subject, "", { htmlBody: bodyHTML });
              } catch(e) {
                 Logger.log("Failed to send leave approval email to " + uemail);
              }
            }
            break;
          }
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({success:true, message:"Leave granted"})).setMimeType(ContentService.MimeType.JSON);
  }

  // ---------- DELETE DEVICE (admin only) ----------
  if(type === "deletedevice"){
    const targetId = e.parameter.userid;
    const deviceSheet = SpreadsheetApp.getActive().getSheetByName("devices");
    if(!deviceSheet){
      return ContentService.createTextOutput(JSON.stringify({success:false, error:"Devices sheet not found"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = deviceSheet.getDataRange().getValues();
    let deleted = false;
    
    // Iterate backwards to safely delete multiple rows if an ID is strangely registered multiple times
    for(let i = data.length - 1; i >= 1; i--){
      const currentId = String(data[i][0]).trim();
      
      if(currentId === String(targetId).trim()){
        deviceSheet.deleteRow(i + 1); // spreadsheet rows are 1-indexed
        deleted = true;
      }
    }
    
    if(deleted){
        return ContentService.createTextOutput(JSON.stringify({success:true, message:"Device reset successfully"})).setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({success:false, error:"Device not found for this user"})).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ---------- SEND CUSTOM EMAIL (admin only) ----------
  if(type === "sendemail"){
    const recipients = e.parameter.recipients;
    const subject = e.parameter.subject;
    const message = e.parameter.message;
    
    const userSheet = SpreadsheetApp.getActive().getSheetByName("users");
    const userRows = userSheet.getDataRange().getValues();
    const userHeaders = userRows[0];
    
    const idCol = userHeaders.indexOf("ID");
    const nameCol = userHeaders.indexOf("Name");
    const emailCol = userHeaders.indexOf("Email");
    const roleCol = userHeaders.indexOf("Role");
    
    let sentCount = 0;
    
    for(let i = 1; i < userRows.length; i++){
      const u = userRows[i];
      const uid = String(u[idCol] || "").trim();
      const uemail = String(u[emailCol] || "").trim();
      const urole = String(u[roleCol] || "user").trim().toLowerCase();
      
      if(!uemail) continue;
      
      let shouldSend = false;
      
      if(recipients === "all"){
        shouldSend = true;
      } else if(recipients === "staff"){
        shouldSend = (urole !== "admin" && urole !== "superadmin");
      } else {
        const targetIds = recipients.split(",").map(s => s.trim());
        shouldSend = targetIds.includes(uid);
      }
      
      if(shouldSend){
        try{
          GmailApp.sendEmail(uemail, subject, message);
          sentCount++;
        } catch(err){
          Logger.log("Email failed to " + uemail + ": " + err);
        }
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({success:true, sent:sentCount}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({success:true}))
    .setMimeType(ContentService.MimeType.JSON);
}


// =============================================
// HELPER — No Sign Out status resolver
// =============================================

function resolveNoSignOutStatus(originalStatus){
  if(originalStatus === "Present")    return { en: "Present - No Sign Out",    bn: "উপস্থিত (Sign Out করেননি)",            color: "#e67e00" };
  if(originalStatus === "Late Entry") return { en: "Late Entry - No Sign Out", bn: "দেরিতে প্রবেশ (Sign Out করেননি)",      color: "#dc3545" };
  if(originalStatus === "Very Late")  return { en: "Very Late - No Sign Out",  bn: "অনেক দেরিতে প্রবেশ (Sign Out করেননি)", color: "#dc3545" };
  return null;
}


// =============================================
// LOGIN ENDPOINT - SERVER-SIDE AUTHENTICATION
// =============================================

function loginUser(e) {
  const id = e.parameter.id;
  const pass = e.parameter.pass;
  
  if(!id || !pass) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Missing credentials"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const userSheet = SpreadsheetApp.getActive().getSheetByName("users");
  if(!userSheet) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Users sheet not found"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = userSheet.getDataRange().getValues();
  const headers = data[0] || [];
  const idCol = headers.indexOf("ID");
  const passCol = headers.indexOf("Password");
  const roleCol = headers.indexOf("Role");
  const nameCol = headers.indexOf("Name");
  const statusCol = headers.indexOf("Status");
  
  for(let i = 1; i < data.length; i++) {
    const uID = String(data[i][idCol] || "").trim();
    const uPass = String(data[i][passCol] || "").trim();
    const uRole = String(data[i][roleCol] || "user").trim().toLowerCase();
    const uName = String(data[i][nameCol] || "").trim();
    const uStatus = String(data[i][statusCol] || "active").trim().toLowerCase();
    
    if(uID === id && uPass === pass) {
      if(uStatus === "inactive") {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: "Account is deactivated"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Create session and return
      const sessionId = createSession(uID, uRole);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sessionId: sessionId,
        user: {
          id: uID,
          name: uName,
          role: uRole
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: "Invalid ID or Password"
  })).setMimeType(ContentService.MimeType.JSON);
}

// =============================================
// SEND DAILY EMAIL - runs at 9 PM every day
// =============================================
function sendDailyEmails(){

  const now     = new Date();
  const dayOfWk = now.getDay();
  const settings = getSettings();
  
  // Check if emails are paused
  if(settings.emailsPaused === "yes"){
    Logger.log("Emails are paused by admin.");
    return;
  }
  
  // Determine if it's a working day
  const isHoliday = isWeekendOrHoliday(now);
  const isClosed  = isOfficeClosed(now);
  const isOffDay  = isHoliday || isClosed; 

  const ss        = SpreadsheetApp.getActive();
  const attSheet  = ss.getSheetByName("attendance");
  const userSheet = ss.getSheetByName("users");

  const today       = Utilities.formatDate(now, TIMEZONE, "M/d/yyyy");
  const dateDisplay = Utilities.formatDate(now, TIMEZONE, "MMMM d, yyyy");

  const userRows    = userSheet.getDataRange().getValues();
  const userHeaders = userRows[0];

  const idCol    = userHeaders.indexOf("ID");
  const nameCol  = userHeaders.indexOf("Name");
  const emailCol = userHeaders.indexOf("Email");
  const roleCol  = userHeaders.indexOf("Role");
  const statusCol= userHeaders.indexOf("Status");

  if(idCol === -1 || emailCol === -1){
    Logger.log("ERROR: 'ID' or 'Email' column not found in users sheet!");
    return;
  }

  // If it's a weekend, holiday, or office is closed, we record "Off Day" for everyone
  // but we skip the email sending logic.
  if (isOffDay) {
    Logger.log("Recording Off Day/Holiday status for all active users...");
  }

  // Pre-load Leaves
  const leaveSheet = ss.getSheetByName("leaves");
  const leaveMap = {};
  if(leaveSheet) {
    const leaveData = leaveSheet.getDataRange().getValues();
    for(let i = 1; i < leaveData.length; i++){
      const lUid = String(leaveData[i][0]).trim();
      let lStart = new Date(leaveData[i][1]);
      let lEnd = new Date(leaveData[i][2]);
      lStart.setHours(0,0,0,0);
      lEnd.setHours(23,59,59,999);
      
      const nowMidnight = new Date(now.getTime());
      nowMidnight.setHours(12,0,0,0);
      
      if(nowMidnight >= lStart && nowMidnight <= lEnd) {
        leaveMap[lUid] = true;
      }
    }
  }

const attRows = attSheet.getDataRange().getValues();
  let attMap = {};

  for(let i = 1; i < attRows.length; i++){
    const r = attRows[i];
    let d = r[3];
    if(d instanceof Date) d = Utilities.formatDate(d, TIMEZONE, "M/d/yyyy");
    else d = String(d).replace(/^'+/, "");
    if(d === today){
      const uid = String(r[1]).trim();
      let inTime  = r[4] instanceof Date ? Utilities.formatDate(r[4], TIMEZONE, "h:mm a") : String(r[4]).replace(/^'+/, "");
      let outTime = r[5] instanceof Date ? Utilities.formatDate(r[5], TIMEZONE, "h:mm a") : String(r[5]).replace(/^'+/, "");
      const status = String(r[8]).trim();

      if(!attMap[uid]){
        attMap[uid] = { inTime, outTime, status };
      } else {
        const existing = attMap[uid];
        if(inTime && inTime !== "Very Late" && inTime !== "---" && inTime !== "") existing.inTime = inTime;
        if(outTime && outTime !== "---" && outTime !== "") existing.outTime = outTime;
        if(status && status !== "") existing.status = status;
      }
    }
  }

  let adminRows    = [];
  let emailsSent   = 0;
  let emailsFailed = 0;

  for(let i = 1; i < userRows.length; i++){

    const u      = userRows[i];
    const uid    = String(u[idCol]   || "").trim();
    const uname  = String(u[nameCol] || "").trim();
    const uemail = String(u[emailCol]|| "").trim();
    const urole  = String(u[roleCol] || "user").trim().toLowerCase();
    const ustatus = statusCol !== -1 ? String(u[statusCol] || "Active").trim().toLowerCase() : "active";

    if(urole === "admin" || urole === "superadmin") continue;
    if(!uid || !uemail) continue;
    if(ustatus === "inactive") continue; // Skip inactive users altogether

    const att = attMap[uid];
    const isOnLeave = !!leaveMap[uid];
    let statusEN = "", statusBN = "", statusColor = "", noticeEN = "", noticeBN = "";

    if(!att){
      if (isOffDay) {
        // Record as Off Day if today is weekend/holiday
        attSheet.appendRow([now, uid, uname, today, "Off Day", "Off Day", "", "", "Off Day"]);
        continue; 
      } else if(isOnLeave) {
        // Mark as On Leave in Google Sheet and Skip email
        attSheet.appendRow([now, uid, uname, today, "On Leave", "On Leave", "", "", "On Leave"]);
        continue;
      } else {
        // Mark as Absent in Google Sheet and Send absent email
        attSheet.appendRow([now, uid, uname, today, "Absent", "Absent", "", "", "Absent"]);
        
        statusEN    = "Absent";
        statusBN    = "অনুপস্থিত";
        statusColor = "#dc3545";
        noticeEN    = "You were marked absent today. If this is incorrect, please contact your officer.";
        noticeBN    = "আজ আপনাকে অনুপস্থিত চিহ্নিত করা হয়েছে। এটি ভুল হলে অফিসারের সাথে যোগাযোগ করুন।";
      }
    } else {
      const outVal    = String(att.outTime).replace(/^'+/, "").trim();
      const noSignOut = (outVal === "---" || outVal === "");
      if(noSignOut){
        const resolved = resolveNoSignOutStatus(att.status);
        if(resolved){
          statusEN = resolved.en; statusBN = resolved.bn; statusColor = resolved.color;
          if(att.status === "Present"){
            noticeEN = "You did not Sign Out today. Please remember to Sign Out before leaving the office.";
            noticeBN = "আজ আপনি Sign Out করেননি। অফিস থেকে বের হওয়ার আগে Sign Out করতে ভুলবেন না।";
          } else {
            noticeEN = "You arrived late and also did not Sign Out today. Please contact your officer.";
            noticeBN = "আজ আপনি দেরিতে এসেছেন এবং Sign Out করেননি। অফিসারের সাথে যোগাযোগ করুন।";
          }
        } else {
          statusEN = att.status; statusBN = getStatusBN(att.status); statusColor = getStatusColor(att.status);
          const n = getNotices(att.status); noticeEN = n.en; noticeBN = n.bn;
        }
      } else {
        statusEN = att.status; statusBN = getStatusBN(att.status); statusColor = getStatusColor(att.status);
        const n = getNotices(att.status); noticeEN = n.en; noticeBN = n.bn;
      }
    }

    // Skip sending email if it's an off day - we just want the record
    if (isOffDay) continue;

    const inTime  = att ? att.inTime  : "---";
    const outTime = att ? att.outTime : "---";

    // ✅ notice block — emoji replaced with HTML entities
    const noticeBlock = (noticeEN || noticeBN) ? `
    <div style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:6px;padding:15px;margin:15px 0;">
      <strong>&#9888;&#65039; Notice:</strong> ${noticeEN}<br><br>
      <strong>&#9888;&#65039; নোটিশ:</strong> ${noticeBN}
    </div>` : `
    <div style="background:#d4edda;border-left:4px solid #28a745;border-radius:6px;padding:15px;margin:15px 0;">
      &#9989; Great work! You were present on time today.<br>
      &#9989; চমৎকার! আজ আপনি সময়মতো উপস্থিত ছিলেন।
    </div>`;

    const subject = "[Attendance Report] " + dateDisplay + " - " + uname;

    // ✅ Full HTML with meta charset + all emoji as HTML entities
    const body = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:25px;text-align:center;">
    <h2 style="color:white;margin:0;font-size:22px;">&#127970; Office Attendance Report</h2>
    <p style="color:#aaa;margin:8px 0 0;">Upazila ICT Office, Madarganj, Jamalpur</p>
  </div>
  <div style="padding:25px;">
    <p style="font-size:16px;margin-bottom:5px;">Dear <strong>${uname}</strong>,</p>
    <p style="color:#555;margin-bottom:20px;">
      Here is your attendance summary for <strong>${dateDisplay}</strong>.<br>
      <span style="font-size:14px;">আজকের (<strong>${dateDisplay}</strong>) আপনার উপস্থিতির সারসংক্ষেপ নিচে দেওয়া হলো।</span>
    </p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0;">
      <tr style="background:#f5f5f5;">
        <td style="padding:13px 15px;border:1px solid #e0e0e0;font-weight:bold;width:45%;">&#128197; Date / তারিখ</td>
        <td style="padding:13px 15px;border:1px solid #e0e0e0;">${dateDisplay}</td>
      </tr>
      <tr>
        <td style="padding:13px 15px;border:1px solid #e0e0e0;font-weight:bold;">&#128336; Sign In / প্রবেশের সময়</td>
        <td style="padding:13px 15px;border:1px solid #e0e0e0;">${inTime}</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:13px 15px;border:1px solid #e0e0e0;font-weight:bold;">&#128340; Sign Out / প্রস্থানের সময়</td>
        <td style="padding:13px 15px;border:1px solid #e0e0e0;">${outTime}</td>
      </tr>
      <tr>
        <td style="padding:13px 15px;border:1px solid #e0e0e0;font-weight:bold;">&#128202; Status / অবস্থা</td>
        <td style="padding:13px 15px;border:1px solid #e0e0e0;">
          <span style="background:${statusColor};color:white;padding:5px 14px;border-radius:20px;font-weight:bold;font-size:13px;">${statusEN}</span>
          <span style="color:#555;font-size:13px;margin-left:8px;">${statusBN}</span>
        </td>
      </tr>
    </table>
    ${noticeBlock}
    <p style="color:#aaa;font-size:12px;margin-top:25px;border-top:1px solid #eee;padding-top:15px;">
      This is an automated email sent at 9:00 PM. Please do not reply.<br>
      এটি রাত ৯:০০ টায় স্বয়ংক্রিয়ভাবে পাঠানো ইমেইল। উত্তর দেওয়ার প্রয়োজন নেই।
    </p>
  </div>
  <div style="background:#1a1a1a;padding:12px;text-align:center;font-size:12px;color:#aaa;">
    Upazila ICT Office, Madarganj, Jamalpur &nbsp;|&nbsp; Attendance Management System
  </div>
</div>
</body></html>`;

    try{
      GmailApp.sendEmail(uemail, subject, "", {htmlBody: body, charset: "UTF-8"});
      Logger.log("✅ Sent to: " + uname + " (" + uemail + ")");
      emailsSent++;
    } catch(err){
      Logger.log("❌ Failed: " + uname + " - " + err.toString());
      emailsFailed++;
    }

    adminRows.push({ id: uid, name: uname, inTime: inTime, outTime: outTime,
                     statusEN: statusEN, statusBN: statusBN, statusColor: statusColor });
  }

  // ---- ADMIN SUMMARY EMAIL ----
  // Skip sending admin summary if it's an off day
  if (isOffDay) {
    Logger.log("Skipping Admin Summary Email - It's an Off Day.");
    return;
  }

  const totalStaff     = adminRows.length;
  const totalPresent   = adminRows.filter(r => r.statusEN === "Present").length;
  const totalLate      = adminRows.filter(r => r.statusEN === "Late Entry").length;
  const totalEarly     = adminRows.filter(r => r.statusEN === "Early Leave").length;
  const totalBoth      = adminRows.filter(r => r.statusEN === "Late Entry | Early Leave").length;
  const totalVLate     = adminRows.filter(r => r.statusEN.includes("Very Late")).length;
  const totalAbsent    = adminRows.filter(r => r.statusEN === "Absent").length;
  const totalNoSignOut = adminRows.filter(r => r.statusEN.includes("No Sign Out")).length;

  let tableRows = "";
  adminRows.forEach((r, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f9f9f9";
    tableRows += `
      <tr style="background:${bg};">
        <td style="padding:11px 12px;border:1px solid #e0e0e0;">${r.id}</td>
        <td style="padding:11px 12px;border:1px solid #e0e0e0;font-weight:bold;">${r.name}</td>
        <td style="padding:11px 12px;border:1px solid #e0e0e0;text-align:center;">${r.inTime}</td>
        <td style="padding:11px 12px;border:1px solid #e0e0e0;text-align:center;">${r.outTime}</td>
        <td style="padding:11px 12px;border:1px solid #e0e0e0;text-align:center;">
          <span style="background:${r.statusColor};color:white;padding:4px 11px;border-radius:20px;font-weight:bold;font-size:12px;">${r.statusEN}</span><br>
          <small style="color:#666;">${r.statusBN}</small>
        </td>
      </tr>`;
  });

  const noSignOutBlock = totalNoSignOut > 0 ? `
    <div style="background:#fff3cd;border-left:4px solid #ffc107;border-radius:8px;padding:15px;margin-bottom:20px;">
      <strong>&#9888;&#65039; ${totalNoSignOut} জন কর্মী আজ Sign Out করেননি।</strong><br>
      <span style="font-size:13px;color:#555;">Please follow up with the employees listed below who did not sign out.</span>
    </div>` : "";

  const adminSubject = "[Daily Attendance Summary] " + dateDisplay;
  const adminBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<div style="font-family:Arial,sans-serif;max-width:750px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
  <div style="background:#1a1a1a;padding:25px;text-align:center;">
    <h2 style="color:white;margin:0;font-size:22px;">&#127970; Daily Attendance Summary</h2>
    <p style="color:#aaa;margin:6px 0 0;">Upazila ICT Office, Madarganj, Jamalpur</p>
    <p style="color:#fff;margin:8px 0 0;font-size:19px;font-weight:bold;">${dateDisplay}</p>
  </div>
  <div style="padding:25px;">
    ${noSignOutBlock}
    <table style="width:100%;border-collapse:separate;border-spacing:6px;margin-bottom:25px;">
      <tr>
        <td style="padding:15px;text-align:center;background:#d4edda;border-radius:8px;border:1px solid #c3e6cb;">
          <div style="font-size:30px;font-weight:bold;color:#155724;">${totalPresent}</div>
          <div style="color:#155724;font-size:13px;margin-top:4px;">Present<br>উপস্থিত</div>
        </td>
        <td style="padding:15px;text-align:center;background:#fff3cd;border-radius:8px;border:1px solid #ffeeba;">
          <div style="font-size:30px;font-weight:bold;color:#856404;">${totalLate}</div>
          <div style="color:#856404;font-size:13px;margin-top:4px;">Late Entry<br>দেরিতে প্রবেশ</div>
        </td>
        <td style="padding:15px;text-align:center;background:#fff3cd;border-radius:8px;border:1px solid #ffeeba;">
          <div style="font-size:30px;font-weight:bold;color:#856404;">${totalEarly}</div>
          <div style="color:#856404;font-size:13px;margin-top:4px;">Early Leave<br>আগে প্রস্থান</div>
        </td>
        <td style="padding:15px;text-align:center;background:#f8d7da;border-radius:8px;border:1px solid #f5c6cb;">
          <div style="font-size:30px;font-weight:bold;color:#721c24;">${totalVLate}</div>
          <div style="color:#721c24;font-size:13px;margin-top:4px;">Very Late<br>অনেক দেরি</div>
        </td>
        <td style="padding:15px;text-align:center;background:#f8d7da;border-radius:8px;border:1px solid #f5c6cb;">
          <div style="font-size:30px;font-weight:bold;color:#721c24;">${totalAbsent}</div>
          <div style="color:#721c24;font-size:13px;margin-top:4px;">Absent<br>অনুপস্থিত</div>
        </td>
        <td style="padding:15px;text-align:center;background:#fff3cd;border-radius:8px;border:1px solid #ffc107;">
          <div style="font-size:30px;font-weight:bold;color:#856404;">${totalNoSignOut}</div>
          <div style="color:#856404;font-size:13px;margin-top:4px;">No Sign Out<br>Sign Out নেই</div>
        </td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#1a1a1a;color:white;">
          <th style="padding:12px;border:1px solid #333;text-align:left;">ID</th>
          <th style="padding:12px;border:1px solid #333;text-align:left;">Name</th>
          <th style="padding:12px;border:1px solid #333;text-align:center;">Sign In</th>
          <th style="padding:12px;border:1px solid #333;text-align:center;">Sign Out</th>
          <th style="padding:12px;border:1px solid #333;text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p style="color:#aaa;font-size:12px;margin-top:20px;border-top:1px solid #eee;padding-top:15px;">
      Total: ${totalStaff} | Present: ${totalPresent} | Late: ${totalLate} | Early Leave: ${totalEarly} | Both: ${totalBoth} | Very Late: ${totalVLate} | Absent: ${totalAbsent} | No Sign Out: ${totalNoSignOut}<br>
      Automated daily report — 9:00 PM (GMT+6) | Emails sent: ${emailsSent} | Failed: ${emailsFailed}
    </p>
  </div>
  <div style="background:#1a1a1a;padding:12px;text-align:center;font-size:12px;color:#aaa;">
    Upazila ICT Office, Madarganj, Jamalpur &nbsp;|&nbsp; Attendance Management System
  </div>
</div>
</body></html>`;

  try{
    GmailApp.sendEmail(ADMIN_EMAIL, adminSubject, "", {htmlBody: adminBody, charset: "UTF-8"});
    Logger.log("✅ Admin summary sent to " + ADMIN_EMAIL);
  } catch(err){
    Logger.log("❌ Admin email failed: " + err.toString());
  }

  Logger.log("Daily email job done for " + today + " | Sent: " + emailsSent + " | Failed: " + emailsFailed);
}


// =============================================
// HELPER FUNCTIONS
// =============================================

function getStatusBN(status){
  if(status === "Present")                   return "উপস্থিত";
  if(status === "Late Entry")                return "দেরিতে প্রবেশ";
  if(status === "Early Leave")               return "আগে প্রস্থান";
  if(status === "Late Entry | Early Leave")  return "দেরিতে প্রবেশ ও আগে প্রস্থান";
  if(status === "Very Late")                 return "অনেক দেরিতে প্রবেশ";
  if(status === "Very Late | Early Leave")   return "অনেক দেরিতে প্রবেশ ও আগে প্রস্থান";
  return status;
}

function getStatusColor(status){
  if(status === "Present")                   return "#28a745";
  if(status === "Late Entry")                return "#e67e00";
  if(status === "Early Leave")               return "#e67e00";
  if(status === "Late Entry | Early Leave")  return "#dc3545";
  if(status === "Very Late")                 return "#dc3545";
  if(status === "Very Late | Early Leave")   return "#dc3545";
  return "#888";
}

function getNotices(status){
  if(status === "Late Entry")
    return { en: "You arrived late today. Please ensure punctuality in the future.",
             bn: "আজ আপনি দেরিতে অফিসে এসেছেন। ভবিষ্যতে সময়মতো আসার চেষ্টা করুন।" };
  if(status === "Early Leave")
    return { en: "You left early today. Please ensure you complete your work hours.",
             bn: "আজ আপনি নির্ধারিত সময়ের আগে চলে গেছেন। কর্মঘণ্টা পূরণ করার চেষ্টা করুন।" };
  if(status === "Late Entry | Early Leave")
    return { en: "You arrived late and also left early today. Please contact your officer.",
             bn: "আজ আপনি দেরিতে এসেছেন এবং আগে চলে গেছেন। অফিসারের সাথে যোগাযোগ করুন।" };
  if(status === "Very Late")
    return { en: "You arrived very late today (after 10:30 AM). Please contact your officer immediately.",
             bn: "আজ আপনি অনেক দেরিতে অফিসে এসেছেন (১০:৩০ AM এর পর)। অনুগ্রহ করে অফিসারের সাথে যোগাযোগ করুন।" };
  if(status === "Very Late | Early Leave")
    return { en: "You arrived very late and also left early today. Please contact your officer immediately.",
             bn: "আজ আপনি অনেক দেরিতে এসেছেন এবং আগে চলে গেছেন। অফিসারের সাথে যোগাযোগ করুন।" };
  return { en: "", bn: "" };
}


// =============================================
// HOLIDAY EVE EMAIL - runs at 10 PM
// =============================================
function sendHolidayEveEmails(){

  const now     = new Date();
  const dayOfWk = now.getDay();
  const settings = getSettings();
  
  // Check if emails are paused
  if(settings.emailsPaused === "yes"){
    Logger.log("Emails are paused by admin.");
    return;
  }

  const isTomorrowWeekend = (dayOfWk === 4);

  const tomorrow    = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = Utilities.formatDate(tomorrow, TIMEZONE, "M/d/yyyy");

  let isTomorrowHoliday = false;
  let holidayName       = "";

  const ss       = SpreadsheetApp.getActive();
  const holSheet = ss.getSheetByName("holidays");

  if(holSheet){
    const holData = holSheet.getDataRange().getValues();
    for(let i = 1; i < holData.length; i++){
      let hDate = holData[i][0];
      if(hDate instanceof Date) hDate = Utilities.formatDate(hDate, TIMEZONE, "M/d/yyyy");
      else hDate = String(hDate).replace(/^'+/, "");
      if(hDate === tomorrowStr){
        isTomorrowHoliday = true;
        holidayName       = String(holData[i][1] || "").trim();
        break;
      }
    }
  }

  if(!isTomorrowWeekend && !isTomorrowHoliday){
    Logger.log("Tomorrow is not a holiday. No holiday eve emails sent.");
    return;
  }

  const tomorrowDisplay = Utilities.formatDate(tomorrow, TIMEZONE, "EEEE, MMMM d, yyyy");
  const userSheet = ss.getSheetByName("users");
  const userRows  = userSheet.getDataRange().getValues();
  const headers   = userRows[0];

  const nameCol  = headers.indexOf("Name");
  const emailCol = headers.indexOf("Email");

  let holidayLabel = "";
  if(isTomorrowWeekend)  holidayLabel = "সাপ্তাহিক ছুটি (শুক্র ও শনিবার)";
  else if(holidayName)   holidayLabel = holidayName;
  else                   holidayLabel = "সরকারি ছুটি";

  let sentCount = 0;

  for(let i = 1; i < userRows.length; i++){
    const u      = userRows[i];
    const uname  = String(u[nameCol]  || "").trim();
    const uemail = String(u[emailCol] || "").trim();

    if(!uemail) continue;

    const subject = "আগামীকাল অফিস বন্ধ - " + tomorrowDisplay;

    // ✅ Full HTML with meta charset + all emoji as HTML entities
    const body = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:35px;text-align:center;">
    <div style="font-size:48px;margin-bottom:10px;">&#127769;</div>
    <h2 style="color:white;margin:0;font-size:24px;letter-spacing:1px;">আগামীকাল ছুটি</h2>
    <p style="color:#a0c4ff;margin:8px 0 0;font-size:15px;">${tomorrowDisplay}</p>
  </div>
  <div style="padding:30px;background:#fafafa;">
    <p style="font-size:17px;color:#333;margin-bottom:5px;">প্রিয় <strong>${uname}</strong>,</p>
    <div style="background:white;border-radius:10px;padding:22px;margin:20px 0;border-left:5px solid #0f3460;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
      <p style="color:#444;font-size:15px;line-height:1.8;margin:0;">
        আগামীকাল <strong>${holidayLabel}</strong> উপলক্ষে অফিস বন্ধ থাকবে। &#127881;
      </p>
      <p style="color:#444;font-size:15px;line-height:1.8;margin:15px 0 0;">
        কাজের ব্যস্ততায় প্রিয়জনদের সাথে সময় কাটানোর সুযোগ প্রায়ই মিলে না।
        আগামীকালের দিনটা তাদের জন্য রেখে দিন।
        ভালো থাকুন, সুস্থ থাকুন, আনন্দে থাকুন। &#128153;
      </p>
    </div>
    <div style="background:#e8f4fd;border-radius:8px;padding:15px;text-align:center;margin-top:10px;">
      <div style="font-size:30px;">&#127968;</div>
      <p style="color:#0f3460;font-weight:bold;margin:8px 0 0;font-size:15px;">পরিবারের সাথে সুন্দর সময় কাটান</p>
    </div>
    <p style="color:#aaa;font-size:12px;margin-top:25px;border-top:1px solid #eee;padding-top:15px;text-align:center;">
      This is an automated holiday reminder sent at 10:00 PM.<br>
      এটি রাত ১০:০০ টায় স্বয়ংক্রিয়ভাবে পাঠানো নোটিফিকেশন।
    </p>
  </div>
  <div style="background:#1a1a2e;padding:12px;text-align:center;font-size:12px;color:#a0c4ff;">
    Upazila ICT Office, Madarganj, Jamalpur &nbsp;|&nbsp; Attendance Management System
  </div>
</div>
</body></html>`;

    try{
      GmailApp.sendEmail(uemail, subject, "", {htmlBody: body, charset: "UTF-8"});
      sentCount++;
      Logger.log("✅ Holiday eve email sent to: " + uname + " (" + uemail + ")");
    } catch(err){
      Logger.log("❌ Failed holiday eve email: " + uname + " - " + err.toString());
    }
  }

  Logger.log("Holiday eve emails done. Sent: " + sentCount);
}


// =============================================
// TEST EMAIL - Run to verify emoji & Bengali work
// =============================================

function testEmail(){
  try{
    GmailApp.sendEmail(
      ADMIN_EMAIL,
      "Test Email - Attendance System",
      "",
      { htmlBody: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
<div style="font-family:Arial;padding:20px;">
  <h2>&#9989; Email is working!</h2>
  <p>Emoji test: &#127970; &#128197; &#127769; &#127881; &#128153; &#127968; &#9888;</p>
  <p>Bengali test: আজ আপনি সময়মতো উপস্থিত ছিলেন।</p>
  <p>Time: ${new Date().toString()}</p>
</div>
</body></html>`, charset: "UTF-8"}
    );
    Logger.log("✅ Test email sent to: " + ADMIN_EMAIL);
  } catch(err){
    Logger.log("❌ Test email FAILED: " + err.toString());
  }
}


// =============================================
// SETUP TRIGGER - Run this ONCE manually
// =============================================

function setupDailyTrigger(){
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // রাত ৯টা daily attendance email (Asia/Dhaka timezone)
  ScriptApp.newTrigger("sendDailyEmails")
    .timeBased()
    .atHour(21)
    .everyDays(1)
    .create();

  // রাত ১০টা holiday eve email (Asia/Dhaka timezone)
  ScriptApp.newTrigger("sendHolidayEveEmails")
    .timeBased()
    .atHour(22)
    .everyDays(1)
    .create();

  Logger.log("✅ Triggers set:");
  Logger.log("   → sendDailyEmails     : 9:00 PM (GMT+6)");
  Logger.log("   → sendHolidayEveEmails: 10:00 PM (GMT+6)");
}

// =============================================
// HELPER: GET HISTORY ROWS
// =============================================
function getHistoryInternal(userId){
  const sheet = SpreadsheetApp.getActive().getSheetByName("attendance");
  if(!sheet) return [];
  const data  = sheet.getDataRange().getValues();
  let rows    = [];

  for(let i = 1; i < data.length; i++){
    const r = data[i];
    const rowId = String(r[1] || "").trim();
    if(!rowId) continue;
    
    // Filter by user ID if provided
    if (userId && rowId !== String(userId).trim()) continue;

    let inTime = r[4];
    if(inTime instanceof Date){
      inTime = Utilities.formatDate(inTime, TIMEZONE, "h:mm a");
    } else {
      inTime = String(inTime).replace(/^'+/, "");
    }

    let outTime = r[5];
    if(outTime instanceof Date){
      outTime = Utilities.formatDate(outTime, TIMEZONE, "h:mm a");
    } else {
      outTime = String(outTime).replace(/^'+/, "");
    }

    let date = r[3];
    if(date instanceof Date){
      date = Utilities.formatDate(date, TIMEZONE, "M/d/yyyy");
    } else {
      date = String(date).replace(/^'+/, "");
    }

    let timestamp = r[0];
    if(timestamp instanceof Date){
      timestamp = Utilities.formatDate(timestamp, TIMEZONE, "M/d/yyyy h:mm a");
    } else {
      timestamp = String(timestamp);
    }

    rows.push({
      timestamp: timestamp,
      date   : date,
      id     : String(r[1]).trim(),
      name   : String(r[2] || "").trim(),
      inTime : inTime,
      outTime: outTime,
      status : String(r[8] || "").trim()
    });
  }
  return rows;
}

// =============================================
// HELPER: CHECK DEVICE INTERNAL
// =============================================
function checkDeviceInternal(uid, fingerprint){
  if(!uid || !fingerprint) return {status: "error", message: "Missing params"};
  
  const sheet = SpreadsheetApp.getActive().getSheetByName("devices");
  if(!sheet) return {status: "error", message: "Devices sheet missing"};
  
  const data = sheet.getDataRange().getValues();

  for(let i = 1; i < data.length; i++){
    const rowId = String(data[i][0]).trim();
    const rowFp = String(data[i][1]).trim();

    if(rowId === uid){
      if(rowFp === fingerprint){
        return {status:"allowed"};
      } else {
        return {status:"blocked"};
      }
    }
  }

  sheet.appendRow([uid, fingerprint]);
  return {status:"registered"};
}

// =============================================
// HELPER: GET USER LEAVE STATUS
// =============================================
function getUserLeaveStatus(uid) {
  const ss = SpreadsheetApp.getActive();
  const leaveSheet = ss.getSheetByName("leaves");
  if (!leaveSheet) return { active: false, allLeaves: [] };

  const data = leaveSheet.getDataRange().getValues();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  let activeLeave = null;
  let allLeaves = [];

  for (let i = 1; i < data.length; i++) {
    const lUid = String(data[i][0]).trim();
    if (lUid !== uid) continue;

    const start = new Date(data[i][1]);
    const end = new Date(data[i][2]);
    
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    // Collect all current and future leaves
    if (endDate >= today) {
      allLeaves.push({
        start: Utilities.formatDate(start, TIMEZONE, "M/d/yyyy"),
        end: Utilities.formatDate(end, TIMEZONE, "M/d/yyyy")
      });

      // Check if active today
      if (today >= startDate && today <= endDate) {
        activeLeave = {
          startDate: Utilities.formatDate(start, TIMEZONE, "M/d/yyyy"),
          endDate: Utilities.formatDate(end, TIMEZONE, "M/d/yyyy")
        };
      }
    }
  }

  return { 
    active: !!activeLeave, 
    currentLeave: activeLeave,
    allLeaves: allLeaves 
  };
}
