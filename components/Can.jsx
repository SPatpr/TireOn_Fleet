import { useEffect, useState } from 'react';
import { getProfile } from '../api/profileAPI';

const SettingsScreen = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({});

    useEffect(() => {
      fetchProfile();
    }, []);
  
    const fetchProfile = async () => {
      try {
        const data = await getProfile();
      } catch (error) {
        console.log('Hiba:', error.message);
      } finally {
        setLoading(false);
      }
    };
}
const Can = ({role, performance, children}) => {
    let userRole = data.role;

    const allowedRoles = Array.isArray(role) ? role : [role];

    if (allowedRoles.includes(userRole)) {
        return children;
    }

    return null;
}
