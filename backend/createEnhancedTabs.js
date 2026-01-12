function createAllTabs() {
  const ss = SpreadsheetApp.openById('1KjrShfTTtd6OXD48tOgrn27_Vl6o9yoNb4_81wT-fM4');
  
  // Users tab - Enhanced with profile and online status
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) usersSheet = ss.insertSheet('Users');
  usersSheet.getRange(1, 1, 1, 10).setValues([['id', 'name', 'email', 'role', 'avatar', 'password', 'lastLat', 'lastLng', 'lastPing', 'isOnline']]);
  
  // Tasks tab
  let tasksSheet = ss.getSheetByName('Tasks');
  if (!tasksSheet) tasksSheet = ss.insertSheet('Tasks');
  tasksSheet.getRange(1, 1, 1, 8).setValues([['id', 'title', 'description', 'priority', 'status', 'assignedTo', 'dueDate', 'history']]);
  
  // Visits tab
  let visitsSheet = ss.getSheetByName('Visits');
  if (!visitsSheet) visitsSheet = ss.insertSheet('Visits');
  visitsSheet.getRange(1, 1, 1, 7).setValues([['id', 'customerName', 'address', 'date', 'status', 'assignedTo', 'notes']]);
  
  // Leads tab
  let leadsSheet = ss.getSheetByName('Leads');
  if (!leadsSheet) leadsSheet = ss.insertSheet('Leads');
  leadsSheet.getRange(1, 1, 1, 7).setValues([['id', 'company', 'contactPerson', 'email', 'phone', 'status', 'potentialValue']]);
  
  // Orders tab
  let ordersSheet = ss.getSheetByName('Orders');
  if (!ordersSheet) ordersSheet = ss.insertSheet('Orders');
  ordersSheet.getRange(1, 1, 1, 6).setValues([['id', 'customer', 'items', 'total', 'date', 'status']]);
  
  // Expenses tab
  let expensesSheet = ss.getSheetByName('Expenses');
  if (!expensesSheet) expensesSheet = ss.insertSheet('Expenses');
  expensesSheet.getRange(1, 1, 1, 6).setValues([['id', 'category', 'amount', 'description', 'date', 'status']]);
  
  // Attendance tab - Enhanced with break times and hours calculation
  let attendanceSheet = ss.getSheetByName('Attendance');
  if (!attendanceSheet) attendanceSheet = ss.insertSheet('Attendance');
  attendanceSheet.getRange(1, 1, 1, 11).setValues([['id', 'userId', 'date', 'inTime', 'outTime', 'breakInTime', 'breakOutTime', 'location', 'status', 'totalHours', 'breakHours']]);
  
  // Onboarding tab
  let onboardingSheet = ss.getSheetByName('Onboarding');
  if (!onboardingSheet) onboardingSheet = ss.insertSheet('Onboarding');
  onboardingSheet.getRange(1, 1, 1, 5).setValues([['id', 'employeeName', 'task', 'status', 'dueDate']]);

  // Photos tab
  let photosSheet = ss.getSheetByName('Photos');
  if (!photosSheet) photosSheet = ss.insertSheet('Photos');
  photosSheet.getRange(1, 1, 1, 11).setValues([['id', 'executiveId', 'executiveName', 'timestamp', 'latitude', 'longitude', 'address', 'campaign', 'notes', 'photoUrl', 'driveFileId']]);
  
  console.log('All tabs created with enhanced headers including break tracking');
}