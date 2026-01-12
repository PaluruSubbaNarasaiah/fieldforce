/**
 * FIELD FORCE CRM BACKEND WITH BREAK TRACKING
 */

const SHEET_ID = '1KjrShfTTtd6OXD48tOgrn27_Vl6o9yoNb4_81wT-fM4';
const ROOT_FOLDER_ID = '172IDItzd4x6B-gG6K-U5dBgKYKn6x0Op';

function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const schema = {
    'Users':      ['id', 'name', 'email', 'role', 'avatar', 'password', 'lastLat', 'lastLng', 'lastPing', 'isOnline'],
    'Tasks':      ['id', 'title', 'description', 'priority', 'status', 'assignedTo', 'dueDate', 'history'],
    'Visits':     ['id', 'customerName', 'address', 'date', 'status', 'assignedTo', 'notes'],
    'Leads':      ['id', 'company', 'contactPerson', 'email', 'phone', 'status', 'potentialValue'],
    'Orders':     ['id', 'customer', 'items', 'total', 'date', 'status'],
    'Expenses':   ['id', 'category', 'amount', 'description', 'date', 'status'],
    'Attendance': ['id', 'userId', 'date', 'inTime', 'outTime', 'breakInTime', 'breakOutTime', 'location', 'status', 'totalHours', 'breakHours'],
    'Onboarding': ['id', 'employeeName', 'task', 'status', 'dueDate'],
    'Photos':     ['id', 'executiveId', 'executiveName', 'timestamp', 'latitude', 'longitude', 'address', 'campaign', 'notes', 'photoUrl', 'driveFileId']
  };

  for (const [sheetName, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
    } else {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
      } else {
         if (sheetName === 'Users') {
            const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            if (currentHeaders.length < headers.length) {
               const missing = headers.slice(currentHeaders.length);
               sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
            }
         }
         if (sheetName === 'Attendance') {
            const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            if (currentHeaders.length < headers.length) {
               const missing = headers.slice(currentHeaders.length);
               sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
            }
         }
      }
    }

    if (sheetName === 'Users') {
      const data = sheet.getDataRange().getValues();
      if (data.length === 1) {
        sheet.appendRow([
          '1', 
          'System Admin', 
          'admin@fieldforce.com', 
          'Admin', 
          'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
          'password',
          '', '', '', 'false'
        ]);
      }
    }
  }
}

function doGet(e) {
  if (!e || !e.parameter) {
    return response({ status: 'error', message: 'No parameters provided.' });
  }

  const action = e.parameter.action;
  const sheetName = e.parameter.sheet;
  
  if (action === 'read') {
    return readData(sheetName);
  }
  
  return response({ status: 'error', message: 'Invalid action' });
}

function doPost(e) {
  let data;
  try {
    if (e.postData && e.postData.contents) {
       data = JSON.parse(e.postData.contents);
    } else {
       return response({ status: 'error', message: 'No post data' });
    }
  } catch (err) {
    console.error('JSON Parse Error:', err);
    return response({ status: 'error', message: 'Invalid JSON: ' + err.message });
  }

  try {
    const action = data.action;
    const sheetName = data.sheet;
    const payload = data.payload;

    console.log('Action:', action, 'Sheet:', sheetName);

    if (action === 'create') return createData(sheetName, payload);
    if (action === 'update') return updateData(sheetName, payload);
    if (action === 'delete') return deleteData(sheetName, payload);
    if (action === 'uploadPhoto') return uploadPhotoToDrive(payload);
    if (action === 'uploadProfile') return uploadProfileToDrive(payload);
    if (action === 'updateLocation') return updateLocation(payload);

    return response({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    console.error('doPost Error:', err);
    return response({ status: 'error', message: 'Server error: ' + err.message });
  }
}

function updateData(sheetName, payload) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return response({ status: 'error', message: 'Sheet not found: ' + sheetName });

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return response({ status: 'error', message: 'No data in sheet' });
    
    const headers = data[0].map(h => String(h).toLowerCase());
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) return response({ status: 'error', message: 'ID column not found' });
    if (!payload.id) return response({ status: 'error', message: 'No ID provided in payload' });

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(payload.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return response({ status: 'error', message: 'Record not found with ID: ' + payload.id });

    // Special handling for attendance punch out
    if (sheetName === 'Attendance' && payload.outTime) {
      const inTimeIndex = headers.indexOf('intime');
      const totalHoursIndex = headers.indexOf('totalhours');
      
      if (inTimeIndex !== -1 && totalHoursIndex !== -1) {
        const inTime = data[rowIndex - 1][inTimeIndex];
        if (inTime) {
          const totalHours = calculateTotalHours(inTime, payload.outTime);
          payload.totalHours = totalHours;
          console.log(`Calculated hours: ${inTime} to ${payload.outTime} = ${totalHours}`);
        }
      }
      
      // Update user offline status
      const userIdIndex = headers.indexOf('userid');
      if (userIdIndex !== -1) {
        const userId = data[rowIndex - 1][userIdIndex];
        updateUserOnlineStatus(userId, false);
      }
    }

    // Calculate break hours if both break times are present
    if (sheetName === 'Attendance' && payload.breakOutTime) {
      const breakInTimeIndex = headers.indexOf('breakintime');
      const breakHoursIndex = headers.indexOf('breakhours');
      
      if (breakInTimeIndex !== -1 && breakHoursIndex !== -1) {
        const breakInTime = data[rowIndex - 1][breakInTimeIndex];
        if (breakInTime) {
          const breakHours = calculateTotalHours(breakInTime, payload.breakOutTime);
          payload.breakHours = breakHours;
          console.log(`Calculated break hours: ${breakInTime} to ${payload.breakOutTime} = ${breakHours}`);
        }
      }
    }

    headers.forEach((header, colIndex) => {
      const key = Object.keys(payload).find(k => k.toLowerCase() === header);
      if (key && payload[key] !== undefined) {
        sheet.getRange(rowIndex, colIndex + 1).setValue(payload[key]);
      }
    });

    return response({ status: 'success', message: 'Updated successfully' });
  } catch (err) {
    console.error('updateData Error:', err);
    return response({ status: 'error', message: 'Update failed: ' + err.message });
  }
}

function calculateTotalHours(inTime, outTime) {
  try {
    const parseTime = (timeStr) => {
      if (!timeStr) return null;
      
      let cleanTime = timeStr.toString().trim();
      let hours, minutes;
      
      if (cleanTime.includes('AM') || cleanTime.includes('PM')) {
        const isPM = cleanTime.includes('PM');
        cleanTime = cleanTime.replace(/AM|PM/gi, '').trim();
        const [h, m] = cleanTime.split(':').map(Number);
        hours = isPM && h !== 12 ? h + 12 : (h === 12 && !isPM ? 0 : h);
        minutes = m || 0;
      } else {
        const [h, m] = cleanTime.split(':').map(Number);
        hours = h;
        minutes = m || 0;
      }
      
      return hours * 60 + minutes;
    };
    
    const inMinutes = parseTime(inTime);
    const outMinutes = parseTime(outTime);
    
    if (inMinutes === null || outMinutes === null) return '0h 0m';
    
    let diffMinutes = outMinutes - inMinutes;
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return `${hours}h ${minutes}m`;
  } catch (e) {
    console.error('Time calculation error:', e);
    return '0h 0m';
  }
}

function createData(sheetName, payload) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return response({ status: 'error', message: 'Sheet not found: ' + sheetName });

  if (sheetName === 'Attendance') {
    updateUserOnlineStatus(payload.userId, true);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
    if (header.toLowerCase() === 'id') return String(payload[header.toLowerCase()] || payload[header]);
    const key = Object.keys(payload).find(k => k.toLowerCase() === header.toLowerCase());
    return key ? payload[key] : '';
  });

  sheet.appendRow(newRow);
  return response({ status: 'success', message: 'Created', data: payload });
}

function updateUserOnlineStatus(userId, isOnline) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase());
    
    const idIndex = headers.indexOf('id');
    const onlineIndex = headers.indexOf('isonline');
    
    if (idIndex !== -1 && onlineIndex !== -1) {
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(userId)) {
          sheet.getRange(i + 1, onlineIndex + 1).setValue(isOnline ? 'true' : 'false');
          break;
        }
      }
    }
  } catch (e) {
    // Silent fail
  }
}

function uploadProfileToDrive(payload) {
  try {
    const { imageData, userId, userName } = payload;
    
    if (!imageData || !userId) {
       return response({ status: 'error', message: 'Missing image data or user ID' });
    }

    let rootFolder;
    try {
      rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    } catch(err) {
      return response({ status: 'error', message: 'Invalid Root Folder ID: ' + ROOT_FOLDER_ID });
    }

    const profileFolder = getOrCreateFolder(rootFolder, 'Profiles');
    const imageBytes = Utilities.base64Decode(imageData.split(',')[1]);
    const fileName = `profile_${userId}_${Date.now()}.jpg`;
    const blob = Utilities.newBlob(imageBytes, 'image/jpeg', fileName);
    
    const file = profileFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = `https://drive.google.com/uc?id=${file.getId()}`;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase());
    
    const idIndex = headers.indexOf('id');
    const avatarIndex = headers.indexOf('avatar');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIndex]) === String(userId)) {
        sheet.getRange(i + 1, avatarIndex + 1).setValue(fileUrl);
        break;
      }
    }

    return response({ status: 'success', message: 'Profile updated', data: { avatar: fileUrl } });

  } catch (e) {
    return response({ status: 'error', message: 'Upload Failed: ' + getErrorMessage(e) });
  }
}

function updateLocation(payload) {
  const { userId, lat, lng, timestamp } = payload;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return response({ status: 'error', message: 'Users sheet not found' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase());
  
  const idIndex = headers.indexOf('id');
  const latIndex = headers.indexOf('lastlat');
  const lngIndex = headers.indexOf('lastlng');
  const pingIndex = headers.indexOf('lastping');
  const onlineIndex = headers.indexOf('isonline');

  if (idIndex === -1 || latIndex === -1) return response({ status: 'error', message: 'Schema mismatch' });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(userId)) {
      sheet.getRange(i + 1, latIndex + 1).setValue(lat);
      sheet.getRange(i + 1, lngIndex + 1).setValue(lng);
      sheet.getRange(i + 1, pingIndex + 1).setValue(timestamp);
      if (onlineIndex !== -1) {
        sheet.getRange(i + 1, onlineIndex + 1).setValue('true');
      }
      return response({ status: 'success', message: 'Location updated' });
    }
  }

  return response({ status: 'error', message: 'User not found' });
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent.createFolder(name);
  }
}

function getErrorMessage(e) {
  try {
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    if (e && e.message) {
      return typeof e.message === 'object' ? JSON.stringify(e.message) : String(e.message);
    }
    return JSON.stringify(e);
  } catch (err) {
    return 'Unknown Error';
  }
}

function uploadPhotoToDrive(payload) {
  try {
    const { imageData, metadata } = payload;
    
    if (!metadata || !imageData) {
       return response({ status: 'error', message: 'Missing metadata or image data' });
    }

    let rootFolder;
    try {
      rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    } catch(err) {
      return response({ status: 'error', message: 'Invalid Root Folder ID: ' + ROOT_FOLDER_ID });
    }

    const dateStr = (metadata.timestamp || new Date().toISOString()).split('T')[0];
    const dateFolder = getOrCreateFolder(rootFolder, dateStr);
    const execFolder = getOrCreateFolder(dateFolder, metadata.executiveName || 'Unknown');

    const imageBytes = Utilities.base64Decode(imageData.split(',')[1]);
    const fileName = `GPS_PROOF_${(metadata.timestamp || new Date().toISOString()).replace(/[:.]/g, '-')}.jpg`;
    const blob = Utilities.newBlob(imageBytes, 'image/jpeg', fileName);
    
    const file = execFolder.createFile(blob);
    file.setDescription(JSON.stringify(metadata));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const driveId = file.getId();
    const fileUrl = `https://drive.google.com/uc?id=${driveId}`;

    const sheetPayload = {
      ...metadata,
      id: Date.now().toString(),
      photoUrl: fileUrl,
      driveFileId: driveId
    };

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName('Photos');
    if (!sheet) {
        sheet = ss.insertSheet('Photos');
        const headers = ['id', 'executiveId', 'executiveName', 'timestamp', 'latitude', 'longitude', 'address', 'campaign', 'notes', 'photoUrl', 'driveFileId'];
        sheet.appendRow(headers);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => {
      if (header.toLowerCase() === 'id') return String(sheetPayload.id);
      const key = Object.keys(sheetPayload).find(k => k.toLowerCase() === header.toLowerCase());
      return key ? sheetPayload[key] : '';
    });

    sheet.appendRow(newRow);
    return response({ status: 'success', message: 'Photo uploaded and logged', data: sheetPayload });

  } catch (e) {
    return response({ status: 'error', message: 'Upload Failed: ' + getErrorMessage(e) });
  }
}

function readData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return response([]);

  const rows = sheet.getDataRange().getValues();
  if (rows.length === 0) return response([]);

  const headers = rows.shift().map(h => String(h).toLowerCase());

  const data = rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      if (header === 'id') {
         obj[header] = String(row[index]);
      } else {
         obj[header] = row[index];
      }
    });
    return obj;
  });

  return response(data);
}

function deleteData(sheetName, payload) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return response({ status: 'error', message: 'Sheet not found' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase());
  const idIndex = headers.indexOf('id');
  
  if (idIndex === -1) return response({ status: 'error', message: 'ID column not found' });

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(payload.id)) {
      sheet.deleteRow(i + 1);
      return response({ status: 'success', message: 'Deleted' });
    }
  }

  return response({ status: 'error', message: 'Record not found' });
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}