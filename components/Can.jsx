const Can = ({ role, userRole, children }) => {
  const allowedRoles = Array.isArray(role) ? role : [role];
  if (allowedRoles.includes(userRole)) {
    return children;
  }
  return null;
};

export default Can;
