import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Trash2, Key, Shield, UserX, UserPlus } from 'lucide-react';
import { api } from '../utils/api';
import { User, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const StaffPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

  // Add Form
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<Role>('WAITER');
  const [password, setPassword] = useState<string>('');
  const [roleTitle, setRoleTitle] = useState<string>('');

  // Reset Password Form
  const [newPassword, setNewPassword] = useState<string>('');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await api.get<User[]>('/staff');
      setStaffList(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch staff members.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;

    try {
      const created = await api.post<User>('/staff', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        password,
        roleTitle: roleTitle.trim() || undefined,
      });

      setStaffList((prev) => [created, ...prev]);
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRoleTitle('');
      showToast(`Staff member '${created.name}' added successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add staff member.', 'error');
    }
  };

  const handleToggleActive = async (member: User) => {
    try {
      const updated = await api.put<User>(`/staff/${member.id}`, {
        isActive: !member.isActive,
      });
      setStaffList((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
      showToast(`${member.name} is now ${updated.isActive ? 'Active' : 'Deactivated'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword) return;

    try {
      await api.post(`/staff/${selectedStaff.id}/reset-password`, {
        newPassword,
      });
      showToast(`Password reset successfully for ${selectedStaff.name}`, 'success');
      setShowPasswordModal(false);
      setSelectedStaff(null);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    }
  };

  const handleDeleteStaff = async (member: User) => {
    if (!confirm(`Are you sure you want to remove ${member.name} from staff?`)) return;

    try {
      await api.delete(`/staff/${member.id}`);
      setStaffList((prev) => prev.filter((s) => s.id !== member.id));
      showToast(`Staff member ${member.name} removed.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete staff.', 'error');
    }
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Staff & Team Access Management</h2>
          <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Assign roles and configure permissions for Managers, Kitchen Chefs, and Waiters.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <UserPlus size={16} /> Add Team Member
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading team members...</div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((member) => (
                <tr key={member.id}>
                  <td style={{ fontWeight: 600 }}>{member.name}</td>
                  <td style={{ color: '#64748b' }}>{member.email}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          member.role === 'RESTAURANT_OWNER'
                            ? '#fef3c7'
                            : member.role === 'KITCHEN_STAFF'
                            ? '#fee2e2'
                            : '#eff6ff',
                        color:
                          member.role === 'RESTAURANT_OWNER'
                            ? '#92400e'
                            : member.role === 'KITCHEN_STAFF'
                            ? '#991b1b'
                            : '#1e40af',
                      }}
                    >
                      {member.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>{member.phone || '-'}</td>
                  <td>
                    <span className={`badge ${member.isActive ? 'badge-ready' : 'badge-cancelled'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => {
                          setSelectedStaff(member);
                          setShowPasswordModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        title="Reset Password"
                      >
                        <Key size={14} />
                      </button>
                      {member.id !== currentUser?.id && (
                        <>
                          <button
                            onClick={() => handleToggleActive(member)}
                            className="btn btn-secondary btn-sm"
                            title={member.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <UserX size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member)}
                            className="btn btn-danger btn-sm"
                            title="Remove Staff"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Add New Staff Member</h3>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Chef Sanjay Kapoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Login Email Address *</label>
                <input
                  type="email"
                  placeholder="chef@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Role Assignment *</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    <option value="WAITER">Floor Waiter</option>
                    <option value="KITCHEN_STAFF">Kitchen Staff / Chef</option>
                    <option value="RESTAURANT_MANAGER">Restaurant Manager</option>
                  </select>
                </div>
                <div>
                  <label>Initial Password *</label>
                  <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label>Contact Phone (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Reset Password</h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
              Reset login credentials for <strong>{selectedStaff.name}</strong> ({selectedStaff.email})
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>New Password *</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
