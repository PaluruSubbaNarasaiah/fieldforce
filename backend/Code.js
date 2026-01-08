/**
 * FIELD FORCE CRM BACKEND
 * 
 * --- SETUP INSTRUCTIONS ---
 * 1. Run 'setup' function once.
 * 2. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - IMPORTANT: Create a New Version when deploying!
 */

// UPDATED IDs
const SHEET_ID = '1KjrShfTTtd6OXD48tOgrn27_Vl6o9yoNb4_81wT-fM4';
const ROOT_FOLDER_ID = '172IDItzd4x6B-gG6K-U5dBgKYKn6x0Op';

/**
 * RUN THIS FUNCTION ONCE TO INITIALIZE YOUR SHEET
 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  const schema = {
    'Users':      ['id', 'name', 'email', 'role', 'avatar', 'password'],
    'Tasks':      ['id', 'title', 'description', 'priority', 'status', 'assignedTo', 'dueDate', 'history'],
    'Visits':     ['id', 'customerName', 'address', 'date', 'status', 'assignedTo', 'notes'],
    'Leads':      ['id', 'company', 'contactPerson', 'email', 'phone', 'status', 'potentialValue'],
    'Orders':     ['id', 'customer', 'items', 'total', 'date', 'status'],
    'Expenses':   ['id', 'category', 'amount', 'description', 'date', 'status'],
    'Attendance': ['id', 'userId', 'date', 'inTime', 'outTime', 'location', 'status'],
    'Onboarding': ['id', 'employeeName', 'task', 'status', 'dueDate'],
    'Photos':     ['id', 'executiveId', 'executiveName', 'timestamp', 'latitude', 'longitude', 'address', 'campaign', 'notes', 'photoUrl', 'driveFileId']
  };

  for (const [sheetName, headers] of Object.entries(schema)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
    } else {
      // Check if headers match, if not, could append new columns
      // For simplicity in this script, we assume setup runs once or user manages schema changes manually
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(headers);
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
          'password'
        ]);
      }
    }
  }
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
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
    return response({ status: 'error', message: 'Invalid JSON' });
  }

  const action = data.action;
  const sheetName = data.sheet;
  const payload = data.payload;

  if (action === 'create') return createData(sheetName, payload);
  if (action === 'update') return updateData(sheetName, payload);
  if (action === 'delete') return deleteData(sheetName, payload);
  if (action === 'uploadPhoto') return uploadPhotoToDrive(payload);

  return response({ status: 'error', message: 'Invalid action: ' + action });
}

// --- Drive Integration ---

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
    const fileUrl = "https://drive.google.com/drive/folders/172IDItzd4x6B-gG6K-U5dBgKYKn6x0Op" + driveId;

    const sheetPayload = {
      ...metadata,
      id: Date.now().toString(),
      photoUrl: fileUrl,
      driveFileId: driveId
    };

    const ss = getSpreadsheet();
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

// --- CRUD Operations ---

function readData(sheetName) {
  const ss = getSpreadsheet();
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

function createData(sheetName, payload) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return response({ status: 'error', message: 'Sheet not found: ' + sheetName });

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => {
    if (header.toLowerCase() === 'id') return String(payload[header.toLowerCase()] || payload[header]);
    const key = Object.keys(payload).find(k => k.toLowerCase() === header.toLowerCase());
    return key ? payload[key] : '';
  });

  sheet.appendRow(newRow);
  return response({ status: 'success', message: 'Created', data: payload });
}

function updateData(sheetName, payload) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return response({ status: 'error', message: 'Sheet not found' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase());
  const idIndex = headers.indexOf('id');

  if (idIndex === -1) return response({ status: 'error', message: 'ID column not found' });

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(payload.id)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return response({ status: 'error', message: 'Record not found' });

  headers.forEach((header, colIndex) => {
    const key = Object.keys(payload).find(k => k.toLowerCase() === header);
    if (key) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(payload[key]);
    }
  });

  return response({ status: 'success', message: 'Updated' });
}

function deleteData(sheetName, payload) {
  const ss = getSpreadsheet();
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