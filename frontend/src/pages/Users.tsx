import { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, Modal, TextField, MenuItem 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface User {
  id: string;
  email: string;
  name?: string;
  department?: string;
  role: string;
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#1e1e1e',
  color: 'white',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    department: '',
    role: 'USER'
  });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('pci_token');
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('pci_token');
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to delete user', error);
    }
  };

  const handleAddUser = async () => {
    try {
      const token = localStorage.getItem('pci_token');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setOpen(false);
        setFormData({ email: '', password: '', name: '', department: '', role: 'USER' });
        fetchUsers();
      } else {
        alert('Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'white' }}>
          Users
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={() => setOpen(true)}
          sx={{ bgcolor: '#90caf9', color: '#000', '&:hover': { bgcolor: '#64b5f6' } }}
        >
          Add User
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: '#1e1e1e' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>Department</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>Role</TableCell>
              <TableCell sx={{ color: 'text.secondary', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell sx={{ color: 'white' }}>{user.email}</TableCell>
                <TableCell sx={{ color: 'white' }}>{user.name || '-'}</TableCell>
                <TableCell sx={{ color: 'white' }}>{user.department || '-'}</TableCell>
                <TableCell sx={{ color: 'white' }}>{user.role}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleDelete(user.id)} sx={{ color: 'error.main' }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal open={open} onClose={() => setOpen(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" sx={{ mb: 2 }}>Add New User</Typography>
          <TextField 
            fullWidth label="Email" variant="outlined" margin="normal"
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            sx={{ input: { color: 'white' }, label: { color: 'gray' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'gray' } } }}
          />
          <TextField 
            fullWidth label="Password" type="password" variant="outlined" margin="normal"
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
            sx={{ input: { color: 'white' }, label: { color: 'gray' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'gray' } } }}
          />
          <TextField 
            fullWidth label="Name" variant="outlined" margin="normal"
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            sx={{ input: { color: 'white' }, label: { color: 'gray' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'gray' } } }}
          />
          <TextField 
            fullWidth label="Department" variant="outlined" margin="normal"
            value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
            sx={{ input: { color: 'white' }, label: { color: 'gray' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'gray' } } }}
          />
          <TextField 
            select fullWidth label="Role" variant="outlined" margin="normal"
            value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
            sx={{ '.MuiSelect-select': { color: 'white' }, label: { color: 'gray' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'gray' } } }}
          >
            <MenuItem value="USER">USER</MenuItem>
            <MenuItem value="ADMIN">ADMIN</MenuItem>
          </TextField>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ color: 'gray' }}>Cancel</Button>
            <Button onClick={handleAddUser} variant="contained" sx={{ bgcolor: '#90caf9', color: '#000' }}>Save</Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
