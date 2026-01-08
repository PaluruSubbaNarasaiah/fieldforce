import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  Plus, 
  Search, 
  Shield, 
  User as UserIcon, 
  Briefcase, 
  Pencil, 
  Trash2, 
  X,
  Loader2,
  Lock,
  Camera,
  Upload
} from 'lucide-react';
import { api } from '../services/api';

interface UserManagementProps {
  currentUser: User;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'hr' | 'admin'>('employees');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    role: UserRole.EMPLOYEE,
    password: '',
    avatar: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await api.fetch('Users');
    setUsers(data);
    setLoading(false);
  };

  // --- Image Handling ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError("File size too large. Please select an image under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256; // Limit size for Google Sheets storage
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Compress to JPEG 0.7 quality to save space
            const base64 = canvas.toDataURL('image/jpeg', 0.7);
            setFormData(prev => ({ ...prev, avatar: base64 }));
        }
      };
    };
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
    setImageError(null);
  };

  // --- Permission Logic ---

  // Check if current user can manage (edit/delete) the target role
  const canManageRole = (targetRole: UserRole): boolean => {
    // Admin can manage everyone
    if (currentUser.role === UserRole.ADMIN) return true;
    
    // HR can only manage Employees
    if (currentUser.role === UserRole.HR && targetRole === UserRole.EMPLOYEE) return true;
    
    // Others (Employee) cannot manage anyone
    return false;
  };

  // Check what roles the current user can assign when creating/editing
  const getAssignableRoles = (): UserRole[] => {
    if (currentUser.role === UserRole.ADMIN) {
      return [UserRole.EMPLOYEE, UserRole.HR, UserRole.ADMIN];
    }
    if (currentUser.role === UserRole.HR) {
      // HR can only create/assign Employees
      return [UserRole.EMPLOYEE];
    }
    return [];
  };

  const isRoleAssignable = (role: UserRole) => {
    return getAssignableRoles().includes(role);
  };

  // --- Handlers ---

  const handleOpenAdd = () => {
    setEditingId(null);
    setImageError(null);
    // Default to Employee for safety, and 'password' as default password
    setFormData({ name: '', email: '', role: UserRole.EMPLOYEE, password: 'password', avatar: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    if (!canManageRole(user.role)) return;
    setEditingId(user.id);
    setImageError(null);
    setFormData({ 
      name: user.name, 
      email: user.email, 
      role: user.role,
      password: user.password || '',
      avatar: user.avatar || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string, targetRole: UserRole) => {
    if (!canManageRole(targetRole)) {
        alert("You do not have permission to delete this user.");
        return;
    }
    
    if (window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      // Optimistic update
      setUsers(users.filter(u => u.id !== userId));
      await api.delete('Users', userId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict Permission Validation
    // If editing self, role change is ignored/prevented in UI, but safe to check
    if (editingId === currentUser.id && formData.role !== currentUser.role) {
        alert("You cannot change your own role.");
        return;
    }

    const assignableRoles = getAssignableRoles();
    // If not editing self, enforce role assignment rules
    if (editingId !== currentUser.id && !assignableRoles.includes(formData.role)) {
        alert(`You are not authorized to assign the role: ${formData.role}`);
        return;
    }
    
    const avatarToUse = formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`;

    if (editingId) {
      // Edit Mode
      // Check again if we are allowed to edit this specific user (in case ID was tampered)
      const userToEdit = users.find(u => u.id === editingId);
      if (userToEdit && !canManageRole(userToEdit.role)) {
          alert("Unauthorized action.");
          return;
      }

      const updatedUser = { ...formData, avatar: avatarToUse };
      setUsers(users.map(u => u.id === editingId ? { ...u, ...updatedUser } : u));
      await api.update('Users', { id: editingId, ...updatedUser });
    } else {
      // Create Mode
      const id = Date.now().toString();
      const newUser = { 
        ...formData, 
        id, 
        avatar: avatarToUse
      };
      setUsers([...users, newUser]);
      await api.create('Users', newUser);
    }
    setShowModal(false);
    loadUsers();
  };

  // --- Filtering ---

  const getFilteredUsers = () => {
    if (activeTab === 'admin') return users.filter(u => u.role === UserRole.ADMIN);
    if (activeTab === 'hr') return users.filter(u => u.role === UserRole.HR);
    return users.filter(u => u.role === UserRole.EMPLOYEE);
  };

  const assignableRoles = getAssignableRoles();
  const allRoles = Object.values(UserRole);
  const isEditingSelf = editingId === currentUser.id;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Management</h2>
          <p className="text-slate-500">Manage user access and roles.</p>
        </div>
        
        {assignableRoles.length > 0 && (
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'employees' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Employees
        </button>
        {/* Only show HR/Admin tabs if the user is allowed to see them (Admins see all) */}
        {currentUser.role === UserRole.ADMIN && (
          <>
            <button 
              onClick={() => setActiveTab('hr')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'hr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              HR Managers
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Admins
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              />
            </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center py-10">
                 <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
             </div>
          ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {getFilteredUsers().length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">No users found in this category.</td></tr>
              ) : (
                getFilteredUsers().map(user => {
                  const canEdit = canManageRole(user.role);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-100" />
                        <span className="font-medium text-slate-900">{user.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                          ${user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                            user.role === UserRole.HR ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            'bg-slate-50 text-slate-700 border-slate-100'}`}>
                          {user.role === UserRole.ADMIN ? <Shield className="w-3 h-3"/> : user.role === UserRole.HR ? <Briefcase className="w-3 h-3"/> : <UserIcon className="w-3 h-3"/>}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        <span className="text-sm text-slate-600">Active</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {canEdit ? (
                            <>
                              <button 
                                onClick={() => handleOpenEdit(user)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Edit User"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {user.id !== currentUser.id && (
                                <button 
                                  onClick={() => handleDelete(user.id, user.role)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                             <div title="Restricted">
                               <Lock className="w-4 h-4 text-slate-300" />
                             </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in relative">
             <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
             >
                <X className="w-5 h-5" />
             </button>
             
             <h3 className="text-xl font-bold text-slate-900 mb-4">
                {editingId ? 'Edit Team Member' : 'Add New Member'}
             </h3>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                {/* Avatar Upload */}
                <div className="flex justify-center mb-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner">
                           {formData.avatar ? (
                             <img src={formData.avatar} alt="Preview" className="w-full h-full object-cover" />
                           ) : (
                             <div className="flex flex-col items-center text-slate-300">
                                <UserIcon className="w-10 h-10" />
                             </div>
                           )}
                        </div>
                        
                        <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md transition-colors border-2 border-white" title="Upload Photo">
                          <Camera className="w-4 h-4" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload}
                          />
                        </label>
                    </div>
                    
                    {/* Explicit Button for clarity */}
                    <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-md transition-colors flex items-center gap-2">
                        <Upload className="w-3 h-3" />
                        <span>Upload Image</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload}
                        />
                    </label>

                    {imageError && (
                        <p className="text-xs text-red-500 font-medium">{imageError}</p>
                    )}

                    {formData.avatar && formData.avatar.startsWith('data:') && (
                        <button 
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                            <Trash2 className="w-3 h-3" /> Remove Photo
                        </button>
                    )}
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                   <input 
                     type="text" 
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     value={formData.name}
                     onChange={e => setFormData({...formData, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                   <input 
                     type="email" 
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     value={formData.email}
                     onChange={e => setFormData({...formData, email: e.target.value})}
                   />
                </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                   <input 
                     type="text" 
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     value={formData.password}
                     onChange={e => setFormData({...formData, password: e.target.value})}
                     placeholder="Set user password"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                   <div className="relative">
                     <select 
                       className={`w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none ${isEditingSelf ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                       value={formData.role}
                       onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                       disabled={isEditingSelf}
                     >
                       {allRoles.map(role => (
                         <option 
                            key={role} 
                            value={role}
                            disabled={!isRoleAssignable(role) && !isEditingSelf}
                         >
                            {role} {!isRoleAssignable(role) && !isEditingSelf ? '(Restricted)' : ''}
                         </option>
                       ))}
                     </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                       <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                     </div>
                   </div>
                   {isEditingSelf && (
                       <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                           <Lock className="w-3 h-3" /> You cannot change your own role.
                       </p>
                   )}
                   {!isEditingSelf && !isRoleAssignable(formData.role) && (
                       <p className="text-xs text-red-500 mt-1">
                           You are not authorized to assign this role.
                       </p>
                   )}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isEditingSelf && !isRoleAssignable(formData.role)}
                  >
                    {editingId ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;